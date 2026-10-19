const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const path=require('node:path');
const {spawnSync,spawn}=require('node:child_process');
const fs=require('node:fs');
require('dotenv').config({path:path.join(__dirname,'../.env'),quiet:true});
const {PrismaClient}=require('@prisma/client');
const {hashPassword}=require('../auth/password');
const {hashSessionToken}=require('../auth/session');
const url=new URL(process.env.DATABASE_URL);
assert(['localhost','127.0.0.1','[::1]'].includes(url.hostname),'Solo PostgreSQL local');
const admin=new PrismaClient({datasources:{db:{url:url.toString()}}});
const schema='mi0_qr_test_'+crypto.randomBytes(8).toString('hex');
url.searchParams.set('schema',schema);process.env.DATABASE_URL=url.toString();
process.env.LOCAL_UPLOAD_DIR=path.join('node_modules','.tmp',schema);
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
let db,server,base,owner,other,member,workspaceId,secondId,code;
async function actor(email){const user=await db.user.create({data:{name:'Prueba',lastName:'QR',email,passwordHash:hashPassword('password-test-1234')}});const token=crypto.randomBytes(32).toString('hex');await db.session.create({data:{userId:user.id,tokenHash:hashSessionToken(token),expiresAt:new Date(Date.now()+3600000)}});return{id:user.id,token};}
async function space(user){return db.workspace.create({data:{name:'Dulce Taller',memberships:{create:{userId:user.id,role:'OWNER'}}}});}
async function req(method,route,actor,body,raw=false){const response=await fetch(base+'/api/qr-catalog'+route,{method,headers:{'Content-Type':raw?'image/png':'application/json',...(actor?{Authorization:'Bearer '+actor.token}:{})},...(body===undefined?{}:{body:raw?body:JSON.stringify(body)})});return{status:response.status,data:await response.json()};}
const settings={name:'Dulce Taller',description:'Postres hechos con cariño',currency:'PEN',whatsapp:'51987654321',socialLinks:[{label:'Instagram',url:'https://instagram.com/dulcetaller'}],published:false};
const product={name:'Brownie',description:'Chocolate intenso',priceCents:850,status:'AVAILABLE',categoryId:null,position:0};
before(async()=>{
 await admin.$executeRawUnsafe('CREATE SCHEMA "'+schema+'"');
 const migrated=spawnSync(process.execPath,[path.join(__dirname,'../node_modules/prisma/build/index.js'),'migrate','deploy'],{cwd:path.join(__dirname,'..'),env:process.env,encoding:'utf8'});assert.equal(migrated.status,0,migrated.stderr||migrated.stdout);
 db=new PrismaClient();globalThis.__mi0Prisma=db;owner=await actor('owner@test.invalid');other=await actor('other@test.invalid');member=await actor('member@test.invalid');workspaceId=(await space(owner)).id;secondId=(await space(other)).id;
 await db.membership.create({data:{workspaceId,userId:member.id,role:'MEMBER'}});
 server=await new Promise(resolve=>{const s=require('../app').listen(0,'127.0.0.1',()=>resolve(s));});base='http://127.0.0.1:'+server.address().port;
});
after(async()=>{if(server)await new Promise(resolve=>server.close(resolve));if(db)await db.$disconnect();await admin.$executeRawUnsafe('DROP SCHEMA IF EXISTS "'+schema+'" CASCADE');await admin.$disconnect();const target=path.resolve(__dirname,'..',process.env.LOCAL_UPLOAD_DIR);assert(target.startsWith(path.resolve(__dirname,'../node_modules/.tmp')+path.sep));fs.rmSync(target,{recursive:true,force:true});});
test('Catálogo QR: permisos, privacidad, CRUD, imágenes, planes y límites concurrentes',async()=>{
 assert.equal((await req('GET','/'+workspaceId)).status,401);
 for(const actor of [other,member])assert.equal((await req('PUT','/'+workspaceId,actor,settings)).status,403);
 assert.equal((await req('PUT','/'+workspaceId,owner,{...settings,socialLinks:[{label:'X',url:'javascript:alert(1)'}]})).status,400);
 let r=await req('PUT','/'+workspaceId,owner,{...settings,plan:'PRO',publicSlug:'cosanostra'});assert.equal(r.status,200);code=r.data.catalog.code;assert.equal(r.data.catalog.plan,'FREE');assert.equal(r.data.catalog.publicPath,'/cosanostra/catalogo');
 assert.equal((await req('GET','/by-space/cosanostra')).status,404);
 assert.equal((await req('PUT','/'+secondId,other,{...settings,publicSlug:'cosanostra'})).status,409);
 assert.equal((await req('PUT','/'+secondId,other,{...settings,publicSlug:'admin'})).status,400);
 assert.equal((await req('PUT','/'+workspaceId,owner,{...settings,publicSlug:'otra-direccion'})).status,200);
 assert.equal((await req('PUT','/'+workspaceId,owner,{...settings,publicSlug:'cosanostra'})).status,200);
 assert.equal((await req('PUT','/'+secondId,other,{...settings,publicSlug:'otra-direccion'})).status,409);
 assert.equal((await req('GET','/public/'+code)).status,404);
 r=await req('POST','/'+workspaceId+'/categories',owner,{name:'Postres',position:0});assert.equal(r.status,200);const categoryId=r.data.categories[0].id;
 await req('PUT','/'+secondId,other,settings);
 const foreign=(await req('POST','/'+secondId+'/categories',other,{name:'Ajena',position:0})).data.categories[0].id;
 assert.equal((await req('POST','/'+workspaceId+'/products',owner,{...product,categoryId:foreign})).status,400);
 assert.equal((await req('POST','/'+workspaceId+'/products',owner,{...product,priceCents:-1})).status,400);
 r=await req('POST','/'+workspaceId+'/products',owner,{...product,categoryId});assert.equal(r.status,200);const id=r.data.products[0].id;
 assert.equal((await req('PUT','/'+secondId+'/products/'+id,other,product)).status,404);
 assert.equal((await req('POST','/'+workspaceId+'/products/'+id+'/images',owner,Buffer.from('fake'),true)).status,415);
 r=await req('POST','/'+workspaceId+'/products/'+id+'/images',owner,png,true);assert.equal(r.status,200);const image=r.data.products[0].images[0];
 assert.equal((await fetch(base+image.url)).status,404);
 assert.equal((await fetch(base+image.url.replace('/public/','/preview/'),{headers:{Authorization:'Bearer '+owner.token}})).status,200);
 assert.equal((await fetch(base+image.url.replace('/public/','/preview/'),{headers:{Authorization:'Bearer '+other.token}})).status,404);
 assert.equal((await req('POST','/'+workspaceId+'/products/'+id+'/images',owner,png,true)).status,409);
 r=await req('POST','/'+workspaceId+'/logo',owner,png,true);assert.equal(r.status,200);
 assert.equal((await req('PUT','/'+workspaceId,owner,{...settings,presentation:'INVALID'})).status,400);
 await req('PUT','/'+workspaceId,owner,{...settings,published:true});
 r=await req('GET','/public/'+code);assert.equal(r.status,200);const branded=await req('GET','/by-space/cosanostra');assert.equal(branded.status,200);assert.equal((await req('GET','/by-space/otra-direccion')).data.catalog.code,code);assert.equal(branded.data.catalog.code,code);assert.equal(branded.data.catalog.publicPath,'/cosanostra/catalogo');assert.equal(r.data.catalog.code,code);assert.equal(r.data.catalog.plan,undefined);assert.equal(r.data.products[0].workspaceId,undefined);assert.equal(r.data.products[0].images[0].storageKey,undefined);
 assert.equal((await fetch(base+image.url)).status,200);
 assert.equal((await fetch(base+r.data.catalog.logoUrl)).status,200);
 await req('PUT','/'+workspaceId+'/products/'+id,owner,{...product,status:'HIDDEN',categoryId});
 assert.equal((await req('GET','/public/'+code)).data.products.length,0);assert.equal((await fetch(base+image.url)).status,404);
 await req('PUT','/'+workspaceId+'/products/'+id,owner,{...product,status:'SOLD_OUT',categoryId});assert.equal((await req('GET','/public/'+code)).data.products[0].status,'SOLD_OUT');
 await db.qrCatalog.update({where:{workspaceId},data:{plan:'PRO'}});
 for(let i=0;i<4;i++)assert.equal((await req('POST','/'+workspaceId+'/products/'+id+'/images',owner,png,true)).status,200);
 assert.equal((await req('POST','/'+workspaceId+'/products/'+id+'/images',owner,png,true)).status,409);
 await req('DELETE','/'+workspaceId+'/images/'+image.id,owner);assert.equal((await fetch(base+image.url)).status,404);
 await req('DELETE','/'+workspaceId+'/categories/'+categoryId,owner);assert.equal((await req('GET','/'+workspaceId,owner)).data.products[0].categoryId,null);
 const results=await Promise.all(Array.from({length:31},(_,i)=>req('POST','/'+workspaceId+'/products',owner,{...product,name:'Producto '+i})));
 assert.equal(results.filter(r=>r.status===200).length,29);assert.equal(results.filter(r=>r.status===409).length,2);assert.equal(await db.catalogProduct.count({where:{workspaceId}}),30);
 assert.equal((await req('PUT','/'+workspaceId+'/products/'+id,owner,{...product,name:'Brownie actualizado'})).status,200);
 assert.equal((await req('PUT','/'+workspaceId,owner,{...settings,published:false})).data.catalog.code,code);
 assert.equal((await req('GET','/public/'+code)).status,404);
 const changed=await req('PUT','/'+workspaceId,owner,{...settings,name:'Cosa Nostra',presentation:'MENU',published:true});assert.equal(changed.data.workspace.name,'Dulce Taller');assert.equal(changed.data.catalog.publicPath,'/cosanostra/carta');assert.equal((await req('GET','/public/'+code)).data.catalog.name,'Cosa Nostra');
 await db.membership.update({where:{userId_workspaceId:{userId:member.id,workspaceId}},data:{role:'ADMIN'}});assert.equal((await req('PUT','/'+workspaceId,member,{...settings,name:'Otro negocio',presentation:'MENU'})).status,200);assert.equal((await req('PUT','/'+workspaceId,member,{...settings,name:'Cosa Nostra',publicSlug:'no-autorizado'})).status,403);assert.equal((await req('PUT','/'+workspaceId,member,{...settings,name:'Cosa Nostra',presentation:'CATALOG',published:true})).status,200);
 await req('DELETE','/'+workspaceId+'/products/'+id,owner);assert.equal(await db.catalogProductImage.count({where:{productId:id}}),0);
});
async function wr(method,route,actor,body){const r=await fetch(base+'/api/workspaces'+route,{method,headers:{'Content-Type':'application/json',...(actor?{Authorization:'Bearer '+actor.token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});return{status:r.status,data:await r.json()};}
test('Espacios: propiedad, CRUD seguro y nombre independiente',async()=>{
 assert.equal((await wr('POST','',null,{name:'Alan'})).status,401);assert.equal((await wr('POST','',owner,{name:' '})).status,400);
 const r=await wr('POST','',owner,{name:'Mi espacio'});assert.equal(r.status,201);const id=r.data.workspace.id;
 assert.equal((await db.membership.findUnique({where:{userId_workspaceId:{userId:owner.id,workspaceId:id}}})).role,'OWNER');
 assert.equal((await wr('PATCH','/'+id,other,{name:'Intruso'})).status,403);assert.equal((await wr('DELETE','/'+id,other)).status,403);
 assert.equal((await wr('PATCH','/'+id,owner,{name:'Alan'})).status,200);assert.equal((await wr('GET','',owner)).data.workspaces.find(w=>w.id===id).name,'Alan');
 await db.membership.create({data:{workspaceId:id,userId:other.id,role:'ADMIN'}});assert.equal((await wr('PATCH','/'+id,other,{name:'Admin'})).status,403);assert.equal((await wr('DELETE','/'+id,owner)).status,409);await db.membership.delete({where:{userId_workspaceId:{userId:other.id,workspaceId:id}}});
 const module=await db.module.findUnique({where:{code:'sorteos'}});await db.workspaceModule.create({data:{workspaceId:id,moduleId:module.id,active:false}});assert.equal((await wr('DELETE','/'+id,owner)).status,409);await db.workspaceModule.deleteMany({where:{workspaceId:id}});
 assert.equal((await wr('DELETE','/'+workspaceId,owner)).status,409);const before=await req('GET','/'+workspaceId,owner);await wr('PATCH','/'+workspaceId,owner,{name:'Mi espacio personal'});const after=await req('GET','/'+workspaceId,owner);assert.equal(after.data.workspace.name,'Mi espacio personal');assert.equal(after.data.catalog.name,before.data.catalog.name);assert.equal(after.data.catalog.publicPath,before.data.catalog.publicPath);
 assert.equal((await wr('DELETE','/'+id,owner)).status,200);assert.equal(await db.workspace.findUnique({where:{id}}),null);
});
test('Recorrido real escritorio/móvil: negocio, categoría, producto, foto, publicación, QR y catálogo',async()=>{
 const {chromium,expect}=require('../../web/node_modules/@playwright/test');
 const uiSpace=await space(owner);let browser,child,lastPage;
 const output=path.join(__dirname,'../../web/test-results/qr-catalog');fs.mkdirSync(output,{recursive:true});
 try{
 child=spawn(process.execPath,[path.join(__dirname,'../../web/node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','5192','--strictPort'],{cwd:path.join(__dirname,'../../web'),env:process.env,stdio:'ignore',windowsHide:true});
 for(let i=0;i<80;i++){try{if((await fetch('http://127.0.0.1:5192')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({channel:'chrome',headless:true});
 for(const width of [1280,390]){
 const context=await browser.newContext({viewport:{width,height:950}});
 await context.route('**/api/**',async route=>{const response=await route.fetch({url:base+new URL(route.request().url()).pathname+new URL(route.request().url()).search});await route.fulfill({response});});
 await context.addInitScript(token=>localStorage.setItem('mi0_user_token',token),owner.token);
 const page=await context.newPage();lastPage=page;page.on('response',async r=>{if(r.status()>=400 && r.url().includes('/api/qr-catalog'))console.log('HTTP error',r.status(),await r.text());});page.setDefaultTimeout(12000);const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('Browser error:',e.message);});
 await page.goto('http://127.0.0.1:5192/catalogo-qr/'+uiSpace.id);
 if(width===1280){
 await page.getByLabel('Enlace de tu negocio',{exact:true}).fill('dulce-taller-ui');await page.getByLabel('Nombre del negocio',{exact:true}).fill('Dulce Taller');await page.getByLabel('Descripción breve').fill('Postres artesanales para compartir.');await page.getByLabel('WhatsApp',{exact:true}).fill('51987654321');
 await page.getByRole('button',{name:'Agregar red social'}).click();await page.getByLabel('Red social',{exact:true}).fill('Instagram');await page.getByLabel('Enlace',{exact:true}).fill('https://instagram.com/dulcetaller');
 await page.getByRole('button',{name:'Guardar negocio',exact:true}).click();await expect(page.getByRole('heading',{name:'Productos',exact:true})).toBeVisible();
 await page.getByText('Administrar categorías').click();await page.getByLabel('Nueva categoría').fill('Postres');await page.getByRole('button',{name:'Crear categoría',exact:true}).click();await expect(page.getByText('Categoría guardada.',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Nuevo producto'}).click();const dialog=page.getByRole('dialog');await dialog.getByLabel('Nombre del producto').fill('Brownie artesanal');await dialog.getByLabel('Descripción',{exact:true}).fill('Chocolate intenso y nueces.');await dialog.getByLabel('Precio (PEN)',{exact:true}).fill('8.50');await dialog.getByLabel('Categoría',{exact:true}).selectOption({label:'Postres'});await dialog.getByRole('button',{name:'Guardar producto',exact:true}).click();await expect(dialog.getByLabel('Agregar foto')).toBeVisible();await dialog.getByLabel('Agregar foto').setInputFiles({name:'brownie.png',mimeType:'image/png',buffer:png});await expect(dialog.getByRole('img',{name:'Foto 1 de Brownie artesanal'})).toBeVisible();await dialog.getByRole('button',{name:'Cerrar producto'}).click();
 }else{await expect(page.getByText('Brownie artesanal',{exact:true})).toBeVisible();}
 console.log('Editor verificado a '+width+'px');await page.screenshot({path:path.join(output,'manager-'+width+'.png'),fullPage:true});
 await page.getByRole('button',{name:'Mi negocio',exact:true}).click();await page.getByLabel('Enlace de tu negocio',{exact:true}).fill(width===1280?'dulce-taller-nuevo':'dulce-taller-ui');await page.getByLabel('Mostrar como',{exact:true}).selectOption(width===1280?'MENU':'CATALOG');await page.getByLabel('Publicar catálogo',{exact:false}).check();await page.getByRole('button',{name:'Guardar negocio',exact:true}).click();await expect(page.getByRole('status')).toContainText('Datos del negocio guardados.');
 const menu=width===1280;await page.getByRole('button',{name:'Compartir',exact:true}).click();await expect(page.getByRole('img',{name:menu?'QR de la carta de Dulce Taller':'QR del catálogo de Dulce Taller'})).toBeVisible();const download=page.waitForEvent('download');await page.getByRole('link',{name:'Descargar QR'}).click();assert((await download).suggestedFilename().endsWith('.png'));
 const publicUrl=await page.getByLabel(menu?'Enlace de tu carta':'Enlace de tu catálogo').inputValue();assert(publicUrl.endsWith('/' + (menu?'dulce-taller-nuevo':'dulce-taller-ui') + '/'+(menu?'carta':'catalogo')));
 await expect(page.getByRole('link',{name:menu?'Abrir carta':'Abrir catálogo'})).toHaveAttribute('href',publicUrl);
 const publicContext=await browser.newContext({viewport:{width,height:950}});await publicContext.route('**/api/**',async route=>{const response=await route.fetch({url:base+new URL(route.request().url()).pathname});await route.fulfill({response});});
 const publicPage=await publicContext.newPage();await publicPage.goto(publicUrl);await expect(publicPage.getByRole('heading',{name:'Dulce Taller',exact:true})).toBeVisible();await expect(publicPage.getByRole('button',{name:'Ver Brownie artesanal',exact:true})).toBeVisible();await publicPage.getByRole('button',{name:'Postres',exact:true}).click();await publicPage.screenshot({path:path.join(output,'public-'+width+'.png'),fullPage:true});await publicPage.getByRole('button',{name:'Ver Brownie artesanal',exact:true}).click();await expect(publicPage.getByRole('dialog').getByRole('link',{name:'Consultar por WhatsApp'})).toHaveAttribute('href',/wa\.me\/51987654321/);await publicPage.getByRole('button',{name:'Cerrar detalle'}).click();await publicPage.getByLabel(menu?'Buscar en la carta':'Buscar en el catálogo').fill('no existe');await expect(publicPage.getByRole('heading',{name:'No encontramos productos'})).toBeVisible();assert(await publicPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);await publicPage.goto(publicUrl.replace(/\/(carta|catalogo)$/,menu?'/catalogo':'/carta'));await expect(publicPage.getByRole('heading',{name:'Dulce Taller',exact:true})).toBeVisible();await publicPage.goto('http://127.0.0.1:5192/dulce-taller-ui/catalogo');await expect(publicPage.getByRole('heading',{name:'Dulce Taller',exact:true})).toBeVisible();await publicContext.close();
 await page.goto('http://127.0.0.1:5192/');await page.getByRole('button',{name:'Crear espacio',exact:true}).click();const cd=page.getByRole('dialog');await cd.getByLabel('Nombre del espacio').fill('Temporal '+width);await cd.getByRole('button',{name:'Crear espacio',exact:true}).click();await expect(page.getByRole('article',{name:'Temporal '+width,exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Renombrar Temporal '+width,exact:true}).click();await page.getByLabel('Nombre del espacio',{exact:true}).press('Escape');await page.getByRole('button',{name:'Renombrar Temporal '+width,exact:true}).click();await page.getByLabel('Nombre del espacio',{exact:true}).fill('Alan '+width);await page.getByLabel('Nombre del espacio',{exact:true}).press('Enter');await expect(page.getByRole('article',{name:'Alan '+width,exact:true})).toBeVisible();await page.screenshot({path:path.join(output,'spaces-'+width+'.png'),fullPage:true});page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Eliminar Alan '+width,exact:true}).click();await expect(page.getByRole('article',{name:'Alan '+width,exact:true})).toHaveCount(0);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await context.close();
 }
 }catch(e){if(lastPage){await lastPage.screenshot({path:path.join(output,'failure.png'),fullPage:true});console.log((await lastPage.locator('body').innerText()).slice(-6000));}throw e;}finally{if(browser)await browser.close();if(child)child.kill();}
});
