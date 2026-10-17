const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
const { PrismaClient } = require(process.env.CATALOG_TEST_CLIENT || '@prisma/client');
const { hashPassword } = require('../auth/password');
const { hashSessionToken } = require('../auth/session');
const url = new URL(process.env.DATABASE_URL);
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Solo PostgreSQL local');
const schema = 'mi0_catalog_test_' + crypto.randomBytes(8).toString('hex');
const admin = new PrismaClient({ datasources: { db: { url: url.toString() } } });
url.searchParams.set('schema', schema);
process.env.DATABASE_URL = url.toString();
let db, server, base, token, userToken;
async function actor(role) {
  const user = await db.user.create({ data: { name: role, lastName: 'Test', email: role + '@test.invalid', role, passwordHash: hashPassword('test-password-1234') } });
  const token = crypto.randomBytes(32).toString('hex');
  await db.session.create({ data: { userId: user.id, tokenHash: hashSessionToken(token), expiresAt: new Date(Date.now() + 3600000) } });
  return token;
}
async function request(method, route, auth, body) {
  const response = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: 'Bearer ' + auth } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { status: response.status, data: await response.json() };
}
before(async () => {
  await admin.$executeRawUnsafe('CREATE SCHEMA "' + schema + '"');
  const result = spawnSync(process.execPath, [path.join(__dirname, '../node_modules/prisma/build/index.js'), 'migrate', 'deploy'], { cwd: path.join(__dirname, '..'), env: process.env, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  db = new PrismaClient(); globalThis.__mi0Prisma = db;
  token = await actor('SUPERADMIN'); userToken = await actor('USER');
  const app = require('../app');
  server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  base = 'http://127.0.0.1:' + server.address().port + '/api';
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  if (db) await db.$disconnect();
  await admin.$executeRawUnsafe('DROP SCHEMA IF EXISTS "' + schema + '" CASCADE');
  await admin.$disconnect();
});
test('categorías: permisos, CRUD, asignación múltiple y catálogo público', async () => {
  for (const [method, route, body] of [['GET','/admin/categories'],['POST','/admin/categories',{name:'Test'}],['PUT','/admin/categories/'+crypto.randomUUID(),{name:'Test'}],['DELETE','/admin/categories/'+crypto.randomUUID()],['PATCH','/admin/modules/'+crypto.randomUUID()+'/catalog',{categoryIds:[],free:true}]]) {
    assert.equal((await request(method,route,null,body)).status,401);
    assert.equal((await request(method,route,userToken,body)).status,403);
  }
  for (const name of ['', ' ', 'Gratis', 'Todas', 'x'.repeat(81)]) assert.equal((await request('POST','/admin/categories',token,{name})).status,400);
  const created = await request('POST','/admin/categories',token,{name:'Productividad'});
  assert.equal(created.status,201); const id=created.data.category.id;
  assert.equal((await request('POST','/admin/categories',token,{name:' productividad '})).status,409);
  assert.equal((await request('PUT','/admin/categories/'+id,token,{name:'Personal'})).status,200);
  const categories = (await request('GET','/admin/categories',token)).data.categories;
  const utility = categories.find(c=>c.name==='Utilidades');
  const modules = (await request('GET','/admin/modules',token)).data.modules;
  const raffle = modules.find(m=>m.code==='sorteos');
  assert.equal(raffle.free,true); assert.equal(raffle.categories[0].name,'Utilidades');
  assert.equal((await request('PATCH','/admin/modules/'+raffle.id+'/catalog',token,{categoryIds:[id,utility.id],free:true})).status,200);
  let catalog = await request('GET','/catalog');
  assert.equal(catalog.status,200);
  const publicRaffle=catalog.data.modules.find(m=>m.code==='sorteos');
  assert.equal(publicRaffle.categories.length,2); assert.equal(publicRaffle.free,true);
  assert.equal(publicRaffle.id,undefined); assert.equal(publicRaffle.workspaces,undefined);
  assert.equal((await request('DELETE','/admin/categories/'+id,token)).status,409);
  assert.equal((await request('PATCH','/admin/modules/'+raffle.id+'/catalog',token,{categoryIds:[crypto.randomUUID()],free:true})).status,400);
  assert.equal((await request('PATCH','/admin/modules/'+raffle.id+'/catalog',token,{categoryIds:[],free:'yes'})).status,400);
  assert.equal((await request('PATCH','/admin/modules/'+raffle.id+'/catalog',token,{categoryIds:[utility.id],free:false})).status,200);
  assert.equal((await request('DELETE','/admin/categories/'+id,token)).status,200);
  assert.equal((await request('DELETE','/admin/categories/'+id,token)).status,404);
  await db.module.update({where:{id:raffle.id},data:{active:false}});
  catalog=await request('GET','/catalog'); assert(!catalog.data.modules.some(m=>m.code==='sorteos'));
});

test('Superadmin y portada: crear, asignar dos categorías, filtrar y eliminar en escritorio y móvil', async () => {
  const { chromium } = require('../../web/node_modules/@playwright/test');
  const { spawn } = require('node:child_process');
  const processes = [];
  const output = path.join(__dirname, '../../web/test-results/catalog');
  require('node:fs').mkdirSync(output, { recursive: true });
  let browser;
  async function vite(folder, port) {
    const cwd = path.join(__dirname, '../..', folder);
    const child = spawn(process.execPath, [path.join(cwd, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { cwd, stdio: 'ignore', windowsHide: true });
    processes.push(child);
    for (let i=0;i<100;i++) {
      try { if ((await fetch('http://127.0.0.1:'+port)).ok) return; } catch {}
      await new Promise(resolve=>setTimeout(resolve,100));
    }
    throw new Error('Vite no inició');
  }
  try {
    await db.module.update({where:{code:'sorteos'},data:{active:true,free:true}});
    await vite('superadmin',5187); await vite('web',5188);
    browser=await chromium.launch({channel:'chrome',headless:true});
    for (const width of [1280,390]) {
      const context=await browser.newContext({viewport:{width,height:900}});
      await context.route('**/api/**',async route=> {
        const target=base+new URL(route.request().url()).pathname.replace(/^\/api/,'');
        const response=await route.fetch({url:target}); await route.fulfill({response});
      });
      await context.addInitScript(value=>localStorage.setItem('mi0_superadmin_token',value),token);
      const page=await context.newPage();
      await page.goto('http://127.0.0.1:5187');
      const {expect}=require('../../web/node_modules/@playwright/test');
      if (width < 1024) await page.getByRole('button',{name:'Más',exact:true}).click();
      await page.getByRole('navigation',{name:width < 1024 ? 'Todas las secciones' : 'Administración',exact:true}).getByRole('button',{name:'Categorías',exact:true}).click();
      await expect(page.getByRole('heading',{name:'Catálogo y categorías'})).toBeVisible();
      await page.getByLabel('Nombre de categoría').fill('Personal '+width);
      await page.getByRole('button',{name:'Crear categoría',exact:true}).click();
      await expect(page.getByRole('status')).toHaveText('Categoría guardada.');
      await page.getByLabel('Microapp',{exact:true}).selectOption({label:'Sorteos'});
      const form=page.locator('form').filter({has:page.locator('legend').filter({hasText:/^Sorteos$/})});
      await form.getByLabel('Personal '+width,{exact:true}).check();
      await form.getByLabel('Utilidades',{exact:true}).check();
      await form.getByLabel('Totalmente gratis').check();
      await form.getByRole('button',{name:'Guardar clasificación de Sorteos',exact:true}).click();
      await expect(page.getByRole('status')).toContainText('Clasificación de Sorteos guardada.');
      await page.reload();
      if (width < 1024) await page.getByRole('button',{name:'Más',exact:true}).click();
      await page.getByRole('navigation',{name:width < 1024 ? 'Todas las secciones' : 'Administración',exact:true}).getByRole('button',{name:'Categorías',exact:true}).click();
      await page.getByLabel('Microapp',{exact:true}).selectOption({label:'Sorteos'});
      const fresh=page.locator('form').filter({has:page.locator('legend').filter({hasText:/^Sorteos$/})});
      await expect(fresh.getByLabel('Personal '+width,{exact:true})).toBeChecked();
      await expect(fresh.getByLabel('Utilidades',{exact:true})).toBeChecked();
      await expect(page.getByRole('button',{name:'Eliminar Personal '+width,exact:true})).toBeDisabled();
      await page.screenshot({path:path.join(output,'admin-'+width+'.png'),fullPage:true});
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      const home=await context.newPage(); await home.goto('http://127.0.0.1:5188');
      await home.getByRole('button',{name:'Personal '+width,exact:true}).click();
      await expect(home.locator('.tool-card')).toHaveCount(1);
      await expect(home.locator('.tool-card h3')).toHaveText('Sorteos');
      await home.getByRole('button',{name:'Gratis',exact:true}).click();
      await expect(home.locator('.tool-card')).toHaveCount(1);
      await home.screenshot({path:path.join(output,'home-'+width+'.png'),fullPage:true});
      await fresh.getByLabel('Personal '+width,{exact:true}).uncheck();
      await fresh.getByRole('button',{name:'Guardar clasificación de Sorteos',exact:true}).click();
      await expect(page.getByRole('status')).toContainText('Clasificación de Sorteos guardada.');
      page.once('dialog',dialog=>dialog.accept());
      await page.getByRole('button',{name:'Eliminar Personal '+width,exact:true}).click();
      await expect(page.getByRole('status')).toHaveText('Categoría eliminada.');
      await context.close();
    }
  } finally { if(browser) await browser.close(); for(const p of processes) p.kill(); }
});
