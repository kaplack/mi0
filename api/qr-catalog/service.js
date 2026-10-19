const prisma = require('../prisma');
const crypto = require('node:crypto');
const v = require('./validation');
const imageType = require('../catalog/profiles').imageType;
const transact = fn => prisma.$transaction(fn, { maxWait:15000, timeout:15000 });
const include = { images: { orderBy: [{ position:'asc' },{ id:'asc' }] } };
async function access(db, userId, workspaceId) {
  v.id(workspaceId);
  const member = await db.membership.findUnique({ where:{ userId_workspaceId:{ userId, workspaceId } }, include:{ workspace:true } });
  if (!member || member.workspace.status !== 'ACTIVE') throw v.fail(403,'No tienes acceso a este espacio activo');
  if (!['OWNER','ADMIN'].includes(member.role)) throw v.fail(403,'Solo propietarios y administradores pueden gestionar el catálogo');
  return { ...member.workspace, membershipRole:member.role };
}
async function lock(db,userId,workspaceId) {
  await db.$queryRaw`SELECT id FROM workspaces WHERE id = ${v.id(workspaceId)}::uuid FOR UPDATE`;
  return access(db,userId,workspaceId);
}
function imageUrl(code,id) { return `/api/qr-catalog/public/${code}/images/${id}`; }
function viewProduct(product,code) {
  const { workspaceId, images, ...rest } = product;
  return { ...rest, images:images.map(image=>({ id:image.id, url:imageUrl(code,image.id) })) };
}
function viewCatalog(catalog,manager=false) {
  return { publicPath: catalog.workspace?.publicSlug ? `/${catalog.workspace.publicSlug}/${catalog.presentation==='MENU'?'carta':'catalogo'}` : `/catalogo/${catalog.code}`, publicSlug:catalog.workspace?.publicSlug || null, presentation:catalog.presentation, name:catalog.name,description:catalog.description,currency:catalog.currency,whatsapp:catalog.whatsapp,socialLinks:catalog.socialLinks,code:catalog.code,
    bannerUrl:catalog.bannerKey ? `/api/qr-catalog/public/${catalog.code}/banner?v=${encodeURIComponent(catalog.bannerKey.split('/').pop())}` : null,
    logoUrl:catalog.logoKey ? `/api/qr-catalog/public/${catalog.code}/logo?v=${encodeURIComponent(catalog.logoKey.split('/').pop())}` : null,
    ...(manager ? { linkLocked:catalog.linkLocked,published:catalog.published,plan:catalog.plan,productLimit:30,imageLimit:catalog.plan==='PRO'?5:1 } : {}) };
}
async function get(userId,workspaceId) {
  const workspace = await access(prisma,userId,workspaceId);
  const catalog = await prisma.qrCatalog.findUnique({ where:{workspaceId}, include:{workspace:{select:{publicSlug:true,name:true}}} });
  if (!catalog) return { catalog:null,workspace:{ id:workspace.id,name:workspace.name,canRename:workspace.membershipRole==='OWNER',publicSlug:workspace.publicSlug,suggestedSlug:v.suggestSlug(workspace.name) },categories:[],products:[] };
  return { linkRequest:await prisma.catalogLinkRequest.findFirst({where:{workspaceId},orderBy:{createdAt:'desc'},select:{status:true,requestedSlug:true,reason:true}}), workspace:{ id:workspace.id,name:workspace.name,canRename:workspace.membershipRole==='OWNER',publicSlug:workspace.publicSlug,suggestedSlug:v.suggestSlug(workspace.name) }, catalog:viewCatalog(catalog,true),
    categories:await prisma.catalogCategory.findMany({where:{workspaceId},orderBy:[{position:'asc'},{id:'asc'}],select:{id:true,name:true,position:true}}),
    products:(await prisma.catalogProduct.findMany({where:{workspaceId},include,orderBy:[{position:'asc'},{id:'asc'}]})).map(p=>viewProduct(p,catalog.code)) };
}
async function saveSettings(userId,workspaceId,body) {
  const data=v.settings(body);
  await transact(async db=>{
    const workspace=await lock(db,userId,workspaceId);
    const existing=await db.qrCatalog.findUnique({where:{workspaceId}});
    const requestedSlug = body.publicSlug === undefined ? workspace.publicSlug : v.slug(body.publicSlug);
    if (requestedSlug !== workspace.publicSlug && workspace.membershipRole !== 'OWNER') throw v.fail(403,'Solo el propietario puede cambiar el enlace del negocio');
    if(existing?.linkLocked && requestedSlug !== workspace.publicSlug) throw v.fail(409,'El enlace se confirmó al publicar. Solicita su cambio al administrador');
    let slug = requestedSlug || v.suggestSlug(data.name);
    let address = await db.workspacePublicAddress.findUnique({where:{slug}});
    if (!requestedSlug && address && address.workspaceId !== workspaceId) {
      slug += '-' + workspaceId.slice(0,8);
      address = await db.workspacePublicAddress.findUnique({where:{slug}});
    }
    if (address && address.workspaceId !== workspaceId) throw v.fail(409,'Ese enlace ya está reservado por otro negocio. Elige otro');
    if (!address) await db.workspacePublicAddress.create({data:{slug,workspaceId}});
    await db.workspace.update({where:{id:workspaceId},data:{publicSlug:slug}});
    const module=await require('../catalog/service').requireAvailable(db,'catalogo-qr',workspaceId,Boolean(existing));
    await db.qrCatalog.upsert({where:{workspaceId},update:{...data,linkLocked:Boolean(existing?.linkLocked || data.published)},create:{...data,linkLocked:data.published,workspaceId,code:crypto.randomBytes(12).toString('hex')}});
    await db.workspaceModule.upsert({where:{workspaceId_moduleId:{workspaceId,moduleId:module.id}},update:{active:true},create:{workspaceId,moduleId:module.id}});
  }).catch(error => { if(error.code === 'P2002') throw v.fail(409,'Esa dirección ya está en uso. Elige otra para tu espacio'); throw error; });
  return get(userId,workspaceId);
}
async function catalogIn(db,workspaceId) {
  const catalog=await db.qrCatalog.findUnique({where:{workspaceId}});
  if (!catalog) throw v.fail(409,'Primero guarda los datos de tu negocio');
  return catalog;
}
async function saveCategory(userId,workspaceId,body,categoryId) {
  if(categoryId) v.id(categoryId);
  const data={name:v.text(body?.name,80,'el nombre de categoría',true),position:v.position(body.position)};
  await transact(async db=>{
    await lock(db,userId,workspaceId); await catalogIn(db,workspaceId);
    if(categoryId && !await db.catalogCategory.findFirst({where:{id:categoryId,workspaceId}})) throw v.fail(404,'Categoría no encontrada');
    if(await db.catalogCategory.findFirst({where:{workspaceId,name:{equals:data.name,mode:'insensitive'},...(categoryId?{id:{not:categoryId}}:{})}})) throw v.fail(409,'Ya existe esa categoría');
    if(categoryId) await db.catalogCategory.update({where:{id:categoryId},data});
    else { if(await db.catalogCategory.count({where:{workspaceId}})>=100) throw v.fail(409,'Puedes crear hasta 100 categorías'); await db.catalogCategory.create({data:{...data,workspaceId}}); }
  });
  return get(userId,workspaceId);
}
async function deleteCategory(userId,workspaceId,categoryId) {
  v.id(categoryId);
  await transact(async db=>{
    await lock(db,userId,workspaceId);
    if(!await db.catalogCategory.findFirst({where:{id:categoryId,workspaceId}})) throw v.fail(404,'Categoría no encontrada');
    await db.catalogProduct.updateMany({where:{workspaceId,categoryId},data:{categoryId:null}});
    await db.catalogCategory.delete({where:{id:categoryId}});
  });
  return get(userId,workspaceId);
}
async function saveProduct(userId,workspaceId,body,productId) {
  if(productId) v.id(productId);
  const data=v.product(body);
  await transact(async db=>{
    await lock(db,userId,workspaceId); await catalogIn(db,workspaceId);
    if(productId && !await db.catalogProduct.findFirst({where:{id:productId,workspaceId}})) throw v.fail(404,'Producto no encontrado');
    if(data.categoryId && !await db.catalogCategory.findFirst({where:{id:data.categoryId,workspaceId}})) throw v.fail(400,'Selecciona una categoría de este negocio');
    // The paid product allowance is not commercially defined yet. Both plans retain 30 for now.
    if(!productId && await db.catalogProduct.count({where:{workspaceId}})>=30) throw v.fail(409,'Tu catálogo admite hasta 30 productos');
    if(productId) await db.catalogProduct.update({where:{id:productId},data});
    else await db.catalogProduct.create({data:{...data,workspaceId}});
  });
  return get(userId,workspaceId);
}
async function deleteProduct(userId,workspaceId,productId,storage) {
  v.id(productId);
  const images=await transact(async db=>{
    await lock(db,userId,workspaceId);
    const product=await db.catalogProduct.findFirst({where:{id:productId,workspaceId},include});
    if(!product) throw v.fail(404,'Producto no encontrado');
    await db.catalogProduct.delete({where:{id:productId}}); return product.images;
  });
  await Promise.all(images.map(i=>storage.remove(i.storageKey).catch(()=>{})));
  return get(userId,workspaceId);
}
async function upload(userId,workspaceId,productId,buffer,storage,asset='logo') {
  await access(prisma,userId,workspaceId); if(productId) v.id(productId);
  const type=imageType(buffer);
  const file=await storage.save({buffer,...type,visibility:'private'});
  let previous;
  try { previous=await transact(async db=>{
    await lock(db,userId,workspaceId); const catalog=await catalogIn(db,workspaceId);
    if(!productId) { const key=asset==='banner'?'bannerKey':'logoKey', contentType=asset==='banner'?'bannerType':'logoType'; await db.qrCatalog.update({where:{workspaceId},data:{[key]:file.key,[contentType]:type.contentType}}); return catalog[key]; }
    const product=await db.catalogProduct.findFirst({where:{id:productId,workspaceId},include});
    if(!product) throw v.fail(404,'Producto no encontrado');
    if(product.images.length >= (catalog.plan==='PRO'?5:1)) throw v.fail(409,catalog.plan==='PRO'?'Puedes subir hasta 5 fotos':'El plan gratis permite una foto por producto. Retira la actual para reemplazarla.');
    await db.catalogProductImage.create({data:{productId,storageKey:file.key,contentType:type.contentType,position:product.images.length}});
  }); } catch(error) { await storage.remove(file.key).catch(()=>{}); throw error; }
  if(previous) await storage.remove(previous).catch(()=>{});
  return get(userId,workspaceId);
}
async function removeImage(userId,workspaceId,imageId,storage) {
  v.id(imageId);
  const key=await transact(async db=>{
    await lock(db,userId,workspaceId);
    const image=await db.catalogProductImage.findFirst({where:{id:imageId,product:{workspaceId}}});
    if(!image) throw v.fail(404,'Foto no encontrada');
    await db.catalogProductImage.delete({where:{id:imageId}}); return image.storageKey;
  });
  await storage.remove(key).catch(()=>{}); return get(userId,workspaceId);
}
async function removeLogo(userId,workspaceId,storage,asset='logo') {
  const field=asset==='banner'?'bannerKey':'logoKey',typeField=asset==='banner'?'bannerType':'logoType';
  const key=await transact(async db=>{await lock(db,userId,workspaceId); const c=await catalogIn(db,workspaceId);await db.qrCatalog.update({where:{workspaceId},data:{[field]:null,[typeField]:null}});return c[field];});
  if(key) await storage.remove(key).catch(()=>{}); return get(userId,workspaceId);
}
async function publicCatalog(code) {
  const catalog=await prisma.qrCatalog.findFirst({where:{code,published:true,workspace:{status:'ACTIVE'}},include:{workspace:{select:{publicSlug:true,name:true}}}});
  if(!catalog) throw v.fail(404,'Este catálogo no está disponible');
  const categories=await prisma.catalogCategory.findMany({where:{workspaceId:catalog.workspaceId},select:{id:true,name:true,position:true},orderBy:[{position:'asc'},{id:'asc'}]});
  const products=await prisma.catalogProduct.findMany({where:{workspaceId:catalog.workspaceId,status:{not:'HIDDEN'}},include,orderBy:[{position:'asc'},{id:'asc'}]});
  return {catalog:viewCatalog(catalog),categories,products:products.map(p=>viewProduct(p,code))};
}
async function publicBySlug(slug) {
  const address=await prisma.workspacePublicAddress.findUnique({where:{slug},select:{workspace:{select:{qrCatalog:{select:{code:true}}}}}});
  const workspace=address?.workspace;
  if(!workspace?.qrCatalog) throw v.fail(404,'Este catálogo no está disponible');
  return publicCatalog(workspace.qrCatalog.code);
}
async function readImage(code,imageId,userId) {
  const catalog=await prisma.qrCatalog.findUnique({where:{code},include:{workspace:{select:{status:true}}}});
  if(!catalog || catalog.workspace.status!=='ACTIVE') throw v.fail(404,'Imagen no disponible');
  let manager=false;
  if(userId) { try {await access(prisma,userId,catalog.workspaceId);manager=true;} catch {} }
  if(!manager && !catalog.published) throw v.fail(404,'Imagen no disponible');
  if(imageId==='banner') {if(!catalog.bannerKey)throw v.fail(404,'Portada no disponible');return {key:catalog.bannerKey,type:catalog.bannerType};}
  if(imageId==='logo') {if(!catalog.logoKey) throw v.fail(404,'Logo no disponible');return {key:catalog.logoKey,type:catalog.logoType};}
  v.id(imageId);
  const image=await prisma.catalogProductImage.findFirst({where:{id:imageId,product:{workspaceId:catalog.workspaceId,...(manager?{}:{status:{not:'HIDDEN'}})}}});
  if(!image) throw v.fail(404,'Imagen no disponible');
  return {key:image.storageKey,type:image.contentType};
}
module.exports={get,saveSettings,saveCategory,deleteCategory,saveProduct,deleteProduct,upload,removeImage,removeLogo,publicCatalog,publicBySlug,readImage};
