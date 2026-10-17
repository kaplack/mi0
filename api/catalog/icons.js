const prisma = require('../prisma');
const fail = (status, message) => Object.assign(new Error(message), { status });
function publicIcon(module) {
  return module.iconKey ? `/api/catalog/${module.code}/icon?v=${encodeURIComponent(module.iconKey.split('/').pop())}` : null;
}
function moduleView(module) {
  const { iconKey, ...rest } = module;
  return { ...rest, iconUrl: publicIcon(module) };
}
async function get(id) {
  if (typeof id !== 'string' || !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id)) throw fail(400, 'Identificador inválido');
  const module = await prisma.module.findUnique({ where: { id } });
  if (!module) throw fail(404, 'Microapp no encontrada');
  return module;
}
async function set(id, buffer, storage) {
  await get(id);
  if (!Buffer.isBuffer(buffer) || buffer.length < 33 || !buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) || buffer.toString('ascii',12,16) !== 'IHDR') throw fail(415, 'Selecciona un icono válido');
  const width = buffer.readUInt32BE(16), height = buffer.readUInt32BE(20);
  if (!width || width !== height || width > 4096) throw fail(400, 'El icono debe ser cuadrado y de hasta 4096 píxeles');
  const file = await storage.save({ buffer, extension: 'png', contentType: 'image/png', visibility: 'private' });
  let result;
  try {
    result = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM modules WHERE id = ${id}::uuid FOR UPDATE`;
      const previous = await tx.module.findUnique({ where: { id } });
      const module = await tx.module.update({ where: { id }, data: { iconKey: file.key } });
      return { previous: previous.iconKey, module };
    });
  } catch (error) { await storage.remove(file.key).catch(() => {}); throw error; }
  if (result.previous) await storage.remove(result.previous).catch(error => console.error('Icon cleanup failed:', error.code || error.name));
  return moduleView(result.module);
}
async function remove(id, storage) {
  await get(id);
  const previous = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM modules WHERE id = ${id}::uuid FOR UPDATE`;
    const module = await tx.module.findUnique({ where: { id } });
    await tx.module.update({ where: { id }, data: { iconKey: null } });
    return module.iconKey;
  });
  if (previous) await storage.remove(previous).catch(error => console.error('Icon cleanup failed:', error.code || error.name));
}
module.exports = { get, set, remove, publicIcon, moduleView };
