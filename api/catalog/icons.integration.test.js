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


const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aR1sAAAAASUVORK5CYII=','base64');
async function iconRequest(moduleId,auth,buffer=png,type='image/png') {
  const response=await fetch(base+'/admin/modules/'+moduleId+'/icon',{method:'PUT',headers:{'Content-Type':type,...(auth?{Authorization:'Bearer '+auth}:{})},body:buffer});
  return {status:response.status,data:await response.json()};
}
test('iconos: permisos, validación, persistencia, reemplazo y eliminación',async()=>{
  const module=(await request('GET','/admin/modules',token)).data.modules.find(item=>item.code==='sorteos');
  const route='/admin/modules/'+module.id+'/icon';
  assert.equal((await iconRequest(module.id,null)).status,401);
  assert.equal((await iconRequest(module.id,userToken)).status,403);
  assert.equal((await iconRequest(module.id,token,Buffer.from('<svg/>'))).status,415);
  assert.equal((await iconRequest(module.id,token,Buffer.alloc(2*1024*1024+1))).status,413);
  const rectangle=Buffer.from(png);rectangle.writeUInt32BE(2,16);
  assert.equal((await iconRequest(module.id,token,rectangle)).status,400);
  const saved=await iconRequest(module.id,token);assert.equal(saved.status,200);assert(saved.data.module.iconUrl);assert.equal(saved.data.module.iconKey,undefined);
  let catalog=(await request('GET','/catalog')).data.modules.find(item=>item.code==='sorteos');
  assert.equal(catalog.iconUrl,saved.data.module.iconUrl);assert.equal(catalog.iconKey,undefined);
  const detail=(await request('GET','/catalog/sorteos')).data.profile;
  assert.equal(detail.iconUrl,catalog.iconUrl);
  const image=await fetch(base.replace(/\/api$/,'')+catalog.iconUrl);assert.equal(image.status,200);assert.equal(image.headers.get('content-type'),'image/png');assert.deepEqual(Buffer.from(await image.arrayBuffer()),png);
  const replacement=await iconRequest(module.id,token);assert.equal(replacement.status,200);assert.notEqual(replacement.data.module.iconUrl,saved.data.module.iconUrl);
  const disabled=await request('PATCH','/admin/modules/'+module.id+'/status',token,{active:false});assert(disabled.data.module.iconUrl);
  assert.equal((await fetch(base.replace(/\/api$/,'')+catalog.iconUrl)).status,404);
  assert.equal((await fetch(base+route,{headers:{Authorization:'Bearer '+token}})).status,200);
  assert.equal((await request('DELETE',route,userToken)).status,403);
  assert.equal((await request('DELETE',route,token)).status,200);
  assert.equal((await fetch(base+route,{headers:{Authorization:'Bearer '+token}})).status,404);
  await request('PATCH','/admin/modules/'+module.id+'/status',token,{active:true});
  catalog=(await request('GET','/catalog')).data.modules.find(item=>item.code==='sorteos');assert.equal(catalog.iconUrl,null);
});
test('Configuración: preparar PNG y WebP, guardar y quitar el icono',async()=>{
  const {chromium,expect}=require('../../web/node_modules/@playwright/test');
  const {spawn}=require('node:child_process');
  const cwd=path.join(__dirname,'../../superadmin');
  const child=spawn(process.execPath,[path.join(cwd,'node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','5195','--strictPort'],{cwd,stdio:'ignore',windowsHide:true});
  let browser;
  try {
    let ready=false;
    for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:5195')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}
    assert(ready);
    browser=await chromium.launch({channel:'msedge',headless:true});
    const context=await browser.newContext({viewport:{width:360,height:900}});
    await context.addInitScript(value=>localStorage.setItem('mi0_superadmin_token',value),token);
    await context.route('**/api/**',async route=>{const response=await route.fetch({url:base+new URL(route.request().url()).pathname.replace(/^\/api/,'')});await route.fulfill({response});});
    const page=await context.newPage();await page.goto('http://127.0.0.1:5195');
    await page.locator('.mobile-nav').getByRole('button',{name:'Microapps',exact:true}).click();
    await page.getByRole('button',{name:'Gestionar Sorteos',exact:true}).click();
    await page.getByRole('tab',{name:'Configuración',exact:true}).click();
    const region=page.getByRole('region',{name:'Icono de la microapp',exact:true});
    for(const type of ['image/png','image/webp']){
      const url=await page.evaluate(type=>{const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;const ctx=canvas.getContext('2d');ctx.fillStyle='#6c5ce7';ctx.fillRect(0,0,64,64);return canvas.toDataURL(type);},type);
      const choosing=page.waitForEvent('filechooser');
      await region.getByRole('button',{name:'Elegir imagen',exact:true}).click();
      await (await choosing).setFiles({name:'icon.'+(type==='image/png'?'png':'webp'),mimeType:type,buffer:Buffer.from(url.split(',')[1],'base64')});
      await region.getByRole('button',{name:'Guardar icono',exact:true}).click();
      await expect(region.getByRole('status')).toHaveText('Icono guardado.');
      const catalog=(await request('GET','/catalog')).data.modules.find(item=>item.code==='sorteos');
      const response=await fetch(base.replace(/\/api$/,'')+catalog.iconUrl);
      const buffer=Buffer.from(await response.arrayBuffer());assert.equal(buffer.readUInt32BE(16),512);assert.equal(buffer.readUInt32BE(20),512);
      await region.getByRole('button',{name:'Quitar icono',exact:true}).click();
      await expect(region.getByRole('status')).toContainText('Se usará el icono predeterminado.');
      assert.equal((await request('GET','/catalog')).data.modules.find(item=>item.code==='sorteos').iconUrl,null);
    }
  } finally {if(browser)await browser.close();child.kill();}
});
