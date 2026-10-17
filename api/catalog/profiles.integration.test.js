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
  const files = new Map();
  app.locals.storage = {
    async save({buffer,contentType}) { const key=crypto.randomUUID();files.set(key,buffer);return {key,contentType}; },
    async read(key) { return files.get(key); },
    async remove(key) { files.delete(key); },
  };
  server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  base = 'http://127.0.0.1:' + server.address().port + '/api';
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  if (db) await db.$disconnect();
  await admin.$executeRawUnsafe('DROP SCHEMA IF EXISTS "' + schema + '" CASCADE');
  await admin.$disconnect();
});

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aR1sAAAAASUVORK5CYII=', 'base64');
async function upload(moduleId, auth, buffer = png, type = 'image/png') {
  const response = await fetch(base + '/admin/modules/' + moduleId + '/screenshots', {method:'POST',headers:{'Content-Type':type,...(auth?{Authorization:'Bearer '+auth}:{})},body:buffer});
  return {status:response.status,data:await response.json()};
}
test('fotos en borrador: publicación atómica, permisos, límites e idempotencia', async () => {
  const modules=(await request('GET','/admin/modules',token)).data.modules;
  const module=modules.find(m=>m.code==='sorteos');
  const other=modules.find(m=>m.code==='mi-cita');
  const path='/admin/modules/'+module.id+'/profile';
  for(const method of ['GET','PUT']) {
    assert.equal((await request(method,path,null,method==='PUT'?{}:undefined)).status,401);
    assert.equal((await request(method,path,userToken,method==='PUT'?{}:undefined)).status,403);
  }
  assert.equal((await upload(module.id,null)).status,401);
  assert.equal((await upload(module.id,userToken)).status,403);
  assert.equal((await upload(module.id,token,Buffer.from('<svg/>'))).status,415);
  assert.equal((await upload(module.id,token,Buffer.alloc(5*1024*1024+1))).status,413);
  const first=await upload(module.id,token);assert.equal(first.status,201);
  const firstId=first.data.profile.screenshots[0].id;
  const draftUrl=first.data.profile.screenshots[0].url;
  assert.equal((await request('GET','/catalog/sorteos')).data.profile.screenshots.length,0);
  assert.equal((await fetch(base.replace(/\/api$/,'')+draftUrl)).status,404);
  const secondId=crypto.randomUUID();
  for(let i=0;i<2;i++) {
    const response=await fetch(base+'/admin/modules/'+module.id+'/screenshots',{method:'POST',headers:{'Content-Type':'image/png',Authorization:'Bearer '+token,'X-Upload-Id':secondId},body:png});
    assert.equal(response.status,201);
  }
  assert.equal((await request('GET',path,token)).data.profile.screenshots.length,2);
  const body={description:'Sortea con tu lista',details:'Agrega participantes y elige tu ganador.',features:['Selección aleatoria'],screenshots:[{id:secondId,caption:'Resultados'},{id:firstId,caption:'Participantes'}]};
  assert.equal((await request('PUT',path,token,{...body,description:'x'.repeat(301)})).status,400);
  assert.equal((await request('PUT',path,token,{...body,screenshots:[null]})).status,400);
  assert.equal((await request('PUT',path,token,{...body,screenshots:[{id:crypto.randomUUID(),caption:'Otro'}]})).status,409);
  assert.equal((await request('PUT',path,token,{...body,screenshots:[{id:firstId,caption:''}]})).status,400);
  assert.equal((await request('GET','/catalog/sorteos')).data.profile.screenshots.length,0);
  assert.equal((await request('PUT',path,token,body)).status,200);
  const detail=(await request('GET','/catalog/sorteos')).data.profile;
  assert.equal(detail.description,body.description);
  assert.deepEqual(detail.screenshots.map(i=>i.id),[secondId,firstId]);
  assert.equal(detail.screenshots[0].storageKey,undefined);
  const img=await fetch(base.replace(/\/api$/,'')+detail.screenshots[0].url);
  assert.equal(img.status,200);assert.deepEqual(Buffer.from(await img.arrayBuffer()),png);
  assert.equal((await request('DELETE','/admin/modules/'+other.id+'/screenshots/'+firstId,token)).status,404);
  assert.equal((await request('DELETE','/admin/modules/'+module.id+'/screenshots/'+firstId,userToken)).status,403);
  assert.equal((await request('DELETE','/admin/modules/'+module.id+'/screenshots/'+firstId,token)).status,409);
  const draftIds=[];
  for(let i=0;i<8;i++) {
    const previous=(await request('GET',path,token)).data.profile.screenshots.map(image=>image.id);
    const added=await upload(module.id,token);assert.equal(added.status,201);
    draftIds.push(added.data.profile.screenshots.find(image=>!previous.includes(image.id)).id);
  }
  assert.equal((await upload(module.id,token)).status,409);
  assert.equal((await request('GET','/catalog/sorteos')).data.profile.screenshots.length,2);
  assert.equal((await request('DELETE','/admin/modules/'+module.id+'/screenshots/'+draftIds[0],token)).status,200);
  assert.equal((await request('PUT',path,token,{...body,description:'Descripción nueva',screenshots:[{id:secondId,caption:'Solo resultados'}]})).status,200);
  const final=(await request('GET','/catalog/sorteos')).data.profile;
  assert.equal(final.description,'Descripción nueva');assert.equal(final.screenshots.length,1);assert.equal(final.screenshots[0].caption,'Solo resultados');
  assert.equal((await fetch(base.replace(/\/api$/,'')+draftUrl)).status,404);
  assert.equal((await request('GET',path,token)).data.profile.screenshots.length,1);
});

test('editor de ficha y home: guardar textos, capturas, orden y detalle público en móvil y escritorio', async () => {
  const {chromium,expect}=require('../../web/node_modules/@playwright/test');
  const {spawn}=require('node:child_process');
  const fs=require('node:fs');
  const children=[]; let browser;
  const output=path.join(__dirname,'../../web/test-results/profiles');fs.mkdirSync(output,{recursive:true});
  async function vite(folder,port){
    const cwd=path.join(__dirname,'../..',folder);
    const child=spawn(process.execPath,[path.join(cwd,'node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd,stdio:'ignore',windowsHide:true});children.push(child);
    for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:'+port)).ok)return;}catch{}await new Promise(r=>setTimeout(r,100));}
    throw Error('No inició Vite');
  }
  try{
    await vite('superadmin',5191);await vite('web',5192);
    browser=await chromium.launch({channel:'msedge',headless:true});
    const modules=(await request('GET','/admin/modules',token)).data.modules;
    const cita=modules.find(m=>m.code==='mi-cita');
    for(const width of [390,1440]){
      const context=await browser.newContext({viewport:{width,height:1000}});
      await context.addInitScript(value=>localStorage.setItem('mi0_superadmin_token',value),token);
      await context.route('**/api/**',async route=>{
        const response=await route.fetch({url:base+new URL(route.request().url()).pathname.replace(/^\/api/,'')});
        await route.fulfill({response});
      });
      const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.goto('http://127.0.0.1:5191');
      const nav=page.getByRole('navigation',{name:width<1024?'Navegación principal':'Administración',exact:true});
      await nav.getByRole('button',{name:'Microapps',exact:true}).click();
      await page.getByRole('button',{name:'Gestionar Mi Cita',exact:true}).click();
      await page.getByRole('tab',{name:'Ficha pública',exact:true}).click();
      await page.getByLabel('Descripción breve',{exact:true}).fill('Organiza las citas de tu consultorio.');
      await page.getByLabel('Descripción completa',{exact:true}).fill('Recibe solicitudes desde tu QR.\nOrganiza a tu equipo y confirma cada cita.');
      await page.getByLabel('Funciones principales',{exact:true}).fill('Agenda por profesional\nReservas con QR');
      const image=fs.readFileSync(path.join(__dirname,'../../web/public/microapps/mi-cita.png'));
      for(let i=0;i<2;i++){
        await page.getByLabel('Subir captura',{exact:true}).setInputFiles({name:'cita.png',mimeType:'image/png',buffer:image});
        await expect(page.locator('.profile-image')).toHaveCount(i+1);
        await page.getByLabel('Descripción de captura '+(i+1),{exact:true}).fill(i===0?'Agenda de ejemplo':'Reservas de ejemplo');
      }
      await expect(page.getByRole('button',{name:'Guardar ficha pública',exact:true})).toBeEnabled();
      assert.equal((await request('GET','/catalog/mi-cita')).data.profile.screenshots.length,0);
      await page.getByRole('button',{name:'Mover captura 2 antes',exact:true}).click();
      await page.getByRole('button',{name:'Guardar ficha pública',exact:true}).click();
      await expect(page.getByRole('status')).toHaveText('Ficha pública guardada.');
      await page.getByRole('button',{name:'Vista previa',exact:true}).click();
      await expect(page.locator('.profile-preview')).toContainText('Reservas con QR');
      await expect(page.locator('.profile-preview img')).toHaveCount(2);
      await page.getByRole('button',{name:'Editar ficha',exact:true}).click();
      await expect(page.getByLabel('Descripción de captura 1',{exact:true})).toHaveValue('Reservas de ejemplo');
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await page.screenshot({path:path.join(output,'editor-'+width+'.png'),fullPage:true});
      const home=await context.newPage();home.on('pageerror',e=>errors.push(e.message));
      await home.goto('http://127.0.0.1:5192');
      const card=home.locator('.tool-card').filter({has:home.getByRole('heading',{name:'Mi Cita',exact:true})});
      await expect(card.getByRole('button',{name:'Usar microapp'})).toBeVisible();
      await card.getByRole('link',{name:'Ver detalles',exact:true}).click();
      await expect(home).toHaveURL(/\/microapps\/mi-cita$/);
      await expect(home.getByRole('heading',{name:'Mi Cita',exact:true})).toBeVisible();
      await expect(home.locator('.detail-features li').filter({hasText:'Agenda por profesional'})).toBeVisible();
      await expect(home.locator('.detail-gallery figcaption').first()).toHaveText('Reservas de ejemplo');
      await home.getByRole('button',{name:'Ampliar: Reservas de ejemplo',exact:true}).click();
      await expect(home.getByRole('dialog')).toBeVisible();
      await home.keyboard.press('Escape');await expect(home.getByRole('dialog')).not.toBeVisible();
      await home.reload();await expect(home.getByRole('heading',{name:'Mi Cita',exact:true})).toBeVisible();
      assert(await home.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await home.screenshot({path:path.join(output,'detail-'+width+'.png'),fullPage:true});
      await home.getByRole('button',{name:'Usar microapp',exact:false}).filter({visible:true}).click();
      await expect(home.locator('.microapp-detail-main')).toHaveCount(0);
      page.on('dialog',dialog=>dialog.accept());
      for(let i=0;i<2;i++){
        await page.getByRole('button',{name:'Eliminar captura 1',exact:true}).click();
        await expect(page.locator('.profile-image')).toHaveCount(1-i);
      }
      assert.equal((await request('GET','/catalog/mi-cita')).data.profile.screenshots.length,2);
      await page.getByRole('button',{name:'Guardar ficha pública',exact:true}).click();
      await expect(page.getByRole('status')).toHaveText('Ficha pública guardada.');
      const saved=(await request('GET','/admin/modules/'+cita.id+'/profile',token)).data.profile;
      assert.equal(saved.screenshots.length,0);assert.equal(saved.features.length,2);assert.deepEqual(errors,[]);
      await context.close();
    }
  } finally{if(browser)await browser.close();for(const child of children)child.kill();}
});
