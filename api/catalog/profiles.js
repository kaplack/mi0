const prisma = require('../prisma');
const fail = (status, message) => Object.assign(new Error(message), { status });
const validId = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
const include = { categories: { select: { id: true, name: true } }, screenshots: { orderBy: [{ position: 'asc' }, { id: 'asc' }] } };
function view(module) {
  return { iconUrl: require('./icons').publicIcon(module), id: module.id, code: module.code, name: module.name, description: module.description || '', details: module.details, features: module.features, free: module.free, active: module.active, categories: module.categories,
    screenshots: module.screenshots.map(image => ({ id: image.id, published: image.published, caption: image.caption, url: `/api/catalog/${module.code}/images/${image.id}` })) };
}
async function getById(id) {
  if (!validId(id)) throw fail(400, 'Identificador inválido');
  const module = await prisma.module.findUnique({ where: { id }, include });
  if (!module) throw fail(404, 'Microapp no encontrada');
  return view(module);
}
async function publicDetail(code) {
  const module = await prisma.module.findFirst({ where: { code, active: true }, include: { ...include, screenshots: { ...include.screenshots, where: { published: true } } } });
  if (!module) throw fail(404, 'Microapp no disponible');
  const { id, active, ...detail } = view(module);
  return detail;
}
async function save(id, body, storage) {
  if (!validId(id)) throw fail(400, 'Identificador inválido');
  const text = (value, max, label) => {
    if (typeof value !== 'string' || value.trim().length > max) throw fail(400, `Revisa ${label}`);
    return value.trim();
  };
  const description = text(body?.description, 300, 'la descripción breve (máximo 300 caracteres)');
  const details = text(body?.details, 12000, 'la descripción completa (máximo 12000 caracteres)');
  if (!description) throw fail(400, 'Ingresa una descripción breve');
  if (!Array.isArray(body.features) || body.features.length > 20) throw fail(400, 'Agrega hasta 20 funciones');
  const features = body.features.map(feature => text(feature, 200, 'las funciones (máximo 200 caracteres cada una)')).filter(Boolean);
  if (!Array.isArray(body.screenshots) || body.screenshots.length > 8 || !body.screenshots.every(image => image && validId(image.id) && typeof image.caption === 'string') || new Set(body.screenshots.map(image => image?.id)).size !== body.screenshots.length) throw fail(400, 'Revisa las capturas');
  const removed = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM modules WHERE id = ${id}::uuid FOR UPDATE`;
    const module = await tx.module.findUnique({ where: { id }, include: { screenshots: true } });
    if (!module) throw fail(404, 'Microapp no encontrada');
    if (body.screenshots.some(image => !module.screenshots.some(existing => existing.id === image.id))) throw fail(409, 'Las capturas cambiaron. Recarga la ficha antes de guardar');
    await tx.module.update({ where: { id }, data: { description, details, features } });
    for (const [position, image] of body.screenshots.entries()) {
      const caption = text(image.caption, 180, 'las descripciones de las capturas');
      if (!caption) throw fail(400, 'Describe cada captura');
      await tx.moduleScreenshot.update({ where: { id: image.id }, data: { caption, position, published: true } });
    }
    const removed = module.screenshots.filter(image => !body.screenshots.some(selected => selected.id === image.id));
    await tx.moduleScreenshot.deleteMany({ where: { id: { in: removed.map(image => image.id) } } });
    return removed;
  });
  if (storage) await Promise.all(removed.map(image => storage.remove(image.storageKey).catch(error => console.error('Image cleanup failed:', error.code || error.name))));
  return getById(id);
}
function imageType(buffer) {
  if (!Buffer.isBuffer(buffer)) throw fail(415, 'Selecciona una imagen PNG, JPEG o WebP');
  if (buffer.length > 5 * 1024 * 1024 || !buffer.length) throw fail(400, 'La imagen debe pesar hasta 5 MB');
  if (buffer.length >= 24 && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && buffer.toString('ascii',12,16) === 'IHDR') return { extension: 'png', contentType: 'image/png' };
  if (buffer.length >= 4 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255 && buffer[buffer.length-2] === 255 && buffer[buffer.length-1] === 217) return { extension: 'jpg', contentType: 'image/jpeg' };
  if (buffer.length >= 16 && buffer.toString('ascii',0,4) === 'RIFF' && buffer.toString('ascii',8,12) === 'WEBP') return { extension: 'webp', contentType: 'image/webp' };
  throw fail(415, 'El archivo no es una imagen PNG, JPEG o WebP válida');
}
async function upload(id, buffer, storage, imageId) {
  await getById(id);
  if (imageId && !validId(imageId)) throw fail(400, 'Identificador de captura inválido');
  if (imageId) {
    const existing = await prisma.moduleScreenshot.findUnique({ where: { id: imageId } });
    if (existing) { if (existing.moduleId !== id) throw fail(409, 'Identificador de captura no disponible'); return getById(id); }
  }
  const type = imageType(buffer);
  const file = await storage.save({ buffer, ...type, visibility: 'private' });
  try {
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM modules WHERE id = ${id}::uuid FOR UPDATE`;
      const images = await tx.moduleScreenshot.findMany({ where: { moduleId: id } });
      if (images.filter(image => !image.published).length >= 8) throw fail(409, 'Puedes subir hasta 8 capturas por microapp');
      const module = await tx.module.findUnique({ where: { id } });
      await tx.moduleScreenshot.create({ data: { ...(imageId ? { id: imageId } : {}), published: false, moduleId: id, storageKey: file.key, contentType: type.contentType, caption: `Captura de ${module.name}`, position: Math.max(-1, ...images.map(image => image.position)) + 1 } });
    });
  } catch (error) {
    await storage.remove(file.key).catch(() => {});
    if (error.code === 'P2002' && imageId && await prisma.moduleScreenshot.findFirst({ where: { id: imageId, moduleId: id } })) return getById(id);
    throw error;
  }
  return getById(id);
}
async function remove(id, imageId, storage) {
  await getById(id);
  if (!validId(imageId)) throw fail(400, 'Identificador inválido');
  const image = await prisma.moduleScreenshot.findFirst({ where: { id: imageId, moduleId: id } });
  if (!image) throw fail(404, 'Captura no encontrada');
  if (image.published) throw fail(409, 'Guarda la ficha para retirar una captura publicada');
  await prisma.moduleScreenshot.delete({ where: { id: imageId } });
  await storage.remove(image.storageKey).catch(error => console.error('Image cleanup failed:', error.code || error.name));
  return getById(id);
}
async function readImage(code, imageId, admin = false) {
  if (!validId(imageId)) throw fail(404, 'Captura no encontrada');
  const image = await prisma.moduleScreenshot.findFirst({ where: { id: imageId, ...(admin ? {} : { published: true }), module: { code, ...(admin ? {} : { active: true }) } } });
  if (!image) throw fail(404, 'Captura no encontrada');
  return image;
}
module.exports = { imageType, getById, publicDetail, save, upload, remove, readImage };
