const prisma = require('../prisma');
const crypto = require('node:crypto');
const v = require('./validation');
const imageType = require('../catalog/profiles').imageType;
const transact = fn => prisma.$transaction(fn, { maxWait:15000, timeout:15000 });
const include = { images: { orderBy: [{ position:'asc' },{ id:'asc' }] } };

async function access(db, auth, workspaceId) {
  v.id(workspaceId);
  const userId = typeof auth === 'string' ? auth : auth?.userId;
  const adminToken = typeof auth === 'object' ? auth?.adminToken : null;
  if (userId) {
    const member = await db.membership.findUnique({ where:{ userId_workspaceId:{ userId, workspaceId } }, include:{ workspace:true } });
    if (!member || member.workspace.status !== 'ACTIVE') throw v.fail(403,'No tienes acceso a este espacio activo');
    if (!['OWNER','ADMIN'].includes(member.role)) throw v.fail(403,'Solo propietarios y administradores pueden gestionar el catálogo');
    return { ...member.workspace, membershipRole:member.role, isGuest:false };
  }
  if (adminToken) {
    const adminHash = crypto.createHash('sha256').update(adminToken).digest('hex');
    const guest = await db.catalogGuest.findUnique({ where:{ workspaceId }, include:{ workspace:true } });
    if (!guest || guest.adminHash !== adminHash || guest.workspace.status !== 'ACTIVE') {
      throw v.fail(403,'Acceso de administración inválido o revocado');
    }
    return { ...guest.workspace, membershipRole:'OWNER', isGuest:true };
  }
  throw v.fail(401,'Se requiere autenticación o llave de administración');
}

async function lock(db, auth, workspaceId) {
  await db.$queryRaw`SELECT id FROM workspaces WHERE id = ${v.id(workspaceId)}::uuid FOR UPDATE`;
  return access(db, auth, workspaceId);
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

async function get(auth, workspaceId) {
  const workspace = await access(prisma, auth, workspaceId);
  const catalog = await prisma.qrCatalog.findUnique({ where:{workspaceId}, include:{workspace:{select:{publicSlug:true,name:true}}} });
  if (!catalog) return { catalog:null, isGuest:Boolean(workspace.isGuest), workspace:{ id:workspace.id,name:workspace.name,canRename:workspace.membershipRole==='OWNER',publicSlug:workspace.publicSlug,suggestedSlug:v.suggestSlug(workspace.name) },categories:[],products:[] };
  return { isGuest:Boolean(workspace.isGuest), linkRequest:await prisma.catalogLinkRequest.findFirst({where:{workspaceId},orderBy:{createdAt:'desc'},select:{status:true,requestedSlug:true,reason:true}}), workspace:{ id:workspace.id,name:workspace.name,canRename:workspace.membershipRole==='OWNER',publicSlug:workspace.publicSlug,suggestedSlug:v.suggestSlug(workspace.name) }, catalog:viewCatalog(catalog,true),
    categories:await prisma.catalogCategory.findMany({where:{workspaceId},orderBy:[{position:'asc'},{id:'asc'}],select:{id:true,name:true,position:true}}),
    products:(await prisma.catalogProduct.findMany({where:{workspaceId},include,orderBy:[{position:'asc'},{id:'asc'}]})).map(p=>viewProduct(p,catalog.code)) };
}

async function saveSettings(auth, workspaceId, body) {
  const data=v.settings(body);
  await transact(async db=>{
    const workspace=await lock(db, auth, workspaceId);
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
  return get(auth, workspaceId);
}

async function catalogIn(db,workspaceId) {
  const catalog=await db.qrCatalog.findUnique({where:{workspaceId}});
  if (!catalog) throw v.fail(409,'Primero guarda los datos de tu negocio');
  return catalog;
}

async function saveCategory(auth, workspaceId, body, categoryId) {
  if(categoryId) v.id(categoryId);
  const data={name:v.text(body?.name,80,'el nombre de categoría',true),position:v.position(body.position)};
  await transact(async db=>{
    await lock(db, auth, workspaceId); await catalogIn(db,workspaceId);
    if(categoryId && !await db.catalogCategory.findFirst({where:{id:categoryId,workspaceId}})) throw v.fail(404,'Categoría no encontrada');
    if(await db.catalogCategory.findFirst({where:{workspaceId,name:{equals:data.name,mode:'insensitive'},...(categoryId?{id:{not:categoryId}}:{})}})) throw v.fail(409,'Ya existe esa categoría');
    if(categoryId) await db.catalogCategory.update({where:{id:categoryId},data});
    else { if(await db.catalogCategory.count({where:{workspaceId}})>=100) throw v.fail(409,'Puedes crear hasta 100 categorías'); await db.catalogCategory.create({data:{...data,workspaceId}}); }
  });
  return get(auth, workspaceId);
}

async function deleteCategory(auth, workspaceId, categoryId) {
  v.id(categoryId);
  await transact(async db=>{
    await lock(db, auth, workspaceId);
    if(!await db.catalogCategory.findFirst({where:{id:categoryId,workspaceId}})) throw v.fail(404,'Categoría no encontrada');
    await db.catalogProduct.updateMany({where:{workspaceId,categoryId},data:{categoryId:null}});
    await db.catalogCategory.delete({where:{id:categoryId}});
  });
  return get(auth, workspaceId);
}

async function saveProduct(auth, workspaceId, body, productId) {
  if(productId) v.id(productId);
  const data=v.product(body);
  await transact(async db=>{
    await lock(db, auth, workspaceId); await catalogIn(db,workspaceId);
    if(productId && !await db.catalogProduct.findFirst({where:{id:productId,workspaceId}})) throw v.fail(404,'Producto no encontrado');
    if(data.categoryId && !await db.catalogCategory.findFirst({where:{id:data.categoryId,workspaceId}})) throw v.fail(400,'Selecciona una categoría de este negocio');
    if(!productId && await db.catalogProduct.count({where:{workspaceId}})>=30) throw v.fail(409,'Tu catálogo admite hasta 30 productos');
    if(productId) await db.catalogProduct.update({where:{id:productId},data});
    else await db.catalogProduct.create({data:{...data,workspaceId}});
  });
  return get(auth, workspaceId);
}

async function deleteProduct(auth, workspaceId, productId, storage) {
  v.id(productId);
  const images=await transact(async db=>{
    await lock(db, auth, workspaceId);
    const product=await db.catalogProduct.findFirst({where:{id:productId,workspaceId},include});
    if(!product) throw v.fail(404,'Producto no encontrado');
    await db.catalogProduct.delete({where:{id:productId}}); return product.images;
  });
  await Promise.all(images.map(i=>storage.remove(i.storageKey).catch(()=>{})));
  return get(auth, workspaceId);
}

async function upload(auth, workspaceId, productId, buffer, storage, asset='logo') {
  await access(prisma, auth, workspaceId); if(productId) v.id(productId);
  const type=imageType(buffer);
  const file=await storage.save({buffer,...type,visibility:'private'});
  let previous;
  try { previous=await transact(async db=>{
    await lock(db, auth, workspaceId); const catalog=await catalogIn(db,workspaceId);
    if(!productId) { const key=asset==='banner'?'bannerKey':'logoKey', contentType=asset==='banner'?'bannerType':'logoType'; await db.qrCatalog.update({where:{workspaceId},data:{[key]:file.key,[contentType]:type.contentType}}); return catalog[key]; }
    const product=await db.catalogProduct.findFirst({where:{id:productId,workspaceId},include});
    if(!product) throw v.fail(404,'Producto no encontrado');
    if(product.images.length >= (catalog.plan==='PRO'?5:1)) throw v.fail(409,catalog.plan==='PRO'?'Puedes subir hasta 5 fotos':'El plan gratis permite una foto por producto. Retira la actual para reemplazarla.');
    await db.catalogProductImage.create({data:{productId,storageKey:file.key,contentType:type.contentType,position:product.images.length}});
  }); } catch(error) { await storage.remove(file.key).catch(()=>{}); throw error; }
  if(previous) await storage.remove(previous).catch(()=>{});
  return get(auth, workspaceId);
}

async function removeImage(auth, workspaceId, imageId, storage) {
  v.id(imageId);
  const key=await transact(async db=>{
    await lock(db, auth, workspaceId);
    const image=await db.catalogProductImage.findFirst({where:{id:imageId,product:{workspaceId}}});
    if(!image) throw v.fail(404,'Foto no encontrada');
    await db.catalogProductImage.delete({where:{id:imageId}}); return image.storageKey;
  });
  await storage.remove(key).catch(()=>{}); return get(auth, workspaceId);
}

async function removeLogo(auth, workspaceId, storage, asset='logo') {
  const field=asset==='banner'?'bannerKey':'logoKey',typeField=asset==='banner'?'bannerType':'logoType';
  const key=await transact(async db=>{await lock(db, auth, workspaceId); const c=await catalogIn(db,workspaceId);await db.qrCatalog.update({where:{workspaceId},data:{[field]:null,[typeField]:null}});return c[field];});
  if(key) await storage.remove(key).catch(()=>{}); return get(auth, workspaceId);
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

async function readImage(code,imageId,auth) {
  const catalog=await prisma.qrCatalog.findUnique({where:{code},include:{workspace:{select:{status:true}}}});
  if(!catalog || catalog.workspace.status!=='ACTIVE') throw v.fail(404,'Imagen no disponible');
  let manager=false;
  if(auth) { try {await access(prisma, auth, catalog.workspaceId);manager=true;} catch {} }
  if(!manager && !catalog.published) throw v.fail(404,'Imagen no disponible');
  if(imageId==='banner') {if(!catalog.bannerKey)throw v.fail(404,'Portada no disponible');return {key:catalog.bannerKey,type:catalog.bannerType};}
  if(imageId==='logo') {if(!catalog.logoKey) throw v.fail(404,'Logo no disponible');return {key:catalog.logoKey,type:catalog.logoType};}
  v.id(imageId);
  const image=await prisma.catalogProductImage.findFirst({where:{id:imageId,product:{workspaceId:catalog.workspaceId,...(manager?{}:{status:{not:'HIDDEN'}})}}});
  if(!image) throw v.fail(404,'Imagen no disponible');
  return {key:image.storageKey,type:image.contentType};
}

async function guestCreate(body) {
  const name = v.text(body?.name || 'Mi Tienda', 120, 'el nombre de tu negocio', true);
  const currency = ['PEN','USD','EUR'].includes(body?.currency) ? body.currency : 'PEN';
  let whatsapp = typeof body?.whatsapp === 'string' ? body.whatsapp.replace(/[^\d+]/g, '').slice(0, 15) : '';
  if (whatsapp.startsWith('+')) whatsapp = whatsapp.slice(1);
  if (whatsapp.length === 9 && whatsapp.startsWith('9')) whatsapp = '51' + whatsapp;
  const description = typeof body?.description === 'string' ? body.description.trim().slice(0, 500) : '';
  let cleanSocials = [];
  if (Array.isArray(body?.socialLinks)) {
    try {
      cleanSocials = body.socialLinks
        .filter(s => s && (s.value?.trim() || s.url?.trim()))
        .map(require('./socials').normalize);
    } catch {
      cleanSocials = [];
    }
  }
  const adminToken = crypto.randomBytes(32).toString('hex');
  const adminHash = crypto.createHash('sha256').update(adminToken).digest('hex');

  const created = await transact(async db => {
    const workspace = await db.workspace.create({
      data: {
        name,
        type: 'PERSONAL',
        status: 'ACTIVE',
      }
    });

    await db.catalogGuest.create({
      data: {
        workspaceId: workspace.id,
        adminHash,
      }
    });

    let slug = body?.slug && typeof body.slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.slug.trim())
      ? body.slug.trim().toLowerCase()
      : (v.suggestSlug(name) || 'tienda');
    let address = await db.workspacePublicAddress.findUnique({ where: { slug } });
    if (address) {
      throw v.fail(409, `El enlace "${slug}" ya está en uso. Por favor elige otro enlace.`);
    }
    await db.workspacePublicAddress.create({ data: { slug, workspaceId: workspace.id } });
    await db.workspace.update({ where: { id: workspace.id }, data: { publicSlug: slug } });

    const module = await require('../catalog/service').requireAvailable(db, 'catalogo-qr', workspace.id, false);
    await db.workspaceModule.create({ data: { workspaceId: workspace.id, moduleId: module.id } });

    const code = crypto.randomBytes(12).toString('hex');
    await db.qrCatalog.create({
      data: {
        workspaceId: workspace.id,
        code,
        name,
        currency,
        whatsapp,
        description,
        socialLinks: cleanSocials,
        published: true,
        linkLocked: true,
        presentation: body?.presentation === 'MENU' ? 'MENU' : 'CATALOG',
      }
    });

    if (body?.productName && typeof body.productName === 'string' && body.productName.trim()) {
      const priceCents = Number.isInteger(body?.priceCents) ? body.priceCents : 0;
      await db.catalogProduct.create({
        data: {
          workspaceId: workspace.id,
          name: v.text(body.productName, 120, 'el nombre del producto', true),
          priceCents: Math.max(0, priceCents),
          status: 'AVAILABLE',
          position: 0,
        }
      });
    }

    return { workspaceId: workspace.id, slug };
  });

  return {
    adminToken,
    workspaceId: created.workspaceId,
    publicSlug: created.slug,
    data: await get({ adminToken }, created.workspaceId)
  };
}

async function checkSlug(rawSlug, currentWorkspaceId) {
  if (!rawSlug || typeof rawSlug !== 'string') {
    return { available: false, slug: '', reason: 'empty' };
  }
  const cleanSlug = rawSlug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '').replace(/^-+|-+$/g, '').slice(0, 60);
  const reserved = new Set([
    'api','admin','uploads','catalogo','catalogo-qr','microapps','mi-cita',
    'mi-turno','auth','login','registro','s','turno','cita','mi-tienda','carta'
  ]);

  if (cleanSlug.length < 3) {
    return { available: false, slug: cleanSlug, reason: 'too_short' };
  }
  if (reserved.has(cleanSlug)) {
    return {
      available: false,
      slug: cleanSlug,
      reason: 'reserved',
      suggestions: [`${cleanSlug}-tienda`, `${cleanSlug}-oficial`, `${cleanSlug}-peru`]
    };
  }

  const existing = await prisma.workspacePublicAddress.findUnique({
    where: { slug: cleanSlug }
  });

  if (!existing || (currentWorkspaceId && existing.workspaceId === currentWorkspaceId)) {
    return { available: true, slug: cleanSlug };
  }

  const candidates = [
    `${cleanSlug}-peru`,
    `${cleanSlug}-oficial`,
    `${cleanSlug}-tienda`,
    `${cleanSlug}-pe`,
    `${cleanSlug}-lima`
  ];

  const takenCandidates = await prisma.workspacePublicAddress.findMany({
    where: { slug: { in: candidates } },
    select: { slug: true }
  });
  const takenSet = new Set(takenCandidates.map(t => t.slug));
  const suggestions = candidates.filter(c => !takenSet.has(c)).slice(0, 3);

  return { available: false, slug: cleanSlug, suggestions };
}

async function attach(userId, workspaceId, body) {
  v.id(workspaceId);
  const adminToken = body?.adminToken;
  if (!adminToken) throw v.fail(400, 'Se requiere la llave de la tienda');
  const adminHash = crypto.createHash('sha256').update(adminToken).digest('hex');

  return transact(async db => {
    await db.$queryRaw`SELECT id FROM workspaces WHERE id = ${workspaceId}::uuid FOR UPDATE`;
    const guest = await db.catalogGuest.findUnique({ where: { workspaceId } });
    if (!guest || guest.adminHash !== adminHash) {
      throw v.fail(403, 'La llave de administración no es válida');
    }

    await db.membership.upsert({
      where: { userId_workspaceId: { userId, workspaceId } },
      create: { userId, workspaceId, role: 'OWNER' },
      update: { role: 'OWNER' }
    });

    await db.catalogGuest.delete({ where: { workspaceId } });

    return get(userId, workspaceId);
  });
}

module.exports = {
  get,
  saveSettings,
  saveCategory,
  deleteCategory,
  saveProduct,
  deleteProduct,
  upload,
  removeImage,
  removeLogo,
  publicCatalog,
  publicBySlug,
  readImage,
  guestCreate,
  attach,
  checkSlug
};
