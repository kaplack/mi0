const prisma = require('../prisma');
const fail = (status, message) => Object.assign(new Error(message), { status });
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
function id(value) { if (!uuid(value)) throw fail(400, 'Identificador inválido'); return value; }
function categoryName(body) {
  if (typeof body?.name !== 'string') throw fail(400, 'Ingresa un nombre de categoría');
  const name = body.name.trim().replace(/\s+/g, ' ');
  if (!name || name.length > 80 || ['todas', 'gratis'].includes(name.toLocaleLowerCase())) throw fail(400, 'Usa un nombre de 1 a 80 caracteres distinto de Todas y Gratis');
  return name;
}
async function writeCategory(categoryId, body) {
  const name = categoryName(body);
  if (categoryId) id(categoryId);
  const duplicate = await prisma.category.findFirst({ where: { name: { equals: name, mode: 'insensitive' }, ...(categoryId ? { id: { not: categoryId } } : {}) } });
  if (duplicate) throw fail(409, 'Ya existe esa categoría');
  try { return categoryId ? await prisma.category.update({ where: { id: categoryId }, data: { name } }) : await prisma.category.create({ data: { name } }); }
  catch (error) { if (error.code === 'P2025') throw fail(404, 'Categoría no encontrada'); throw error; }
}
async function deleteCategory(categoryId) {
  id(categoryId);
  try {
    await prisma.$transaction(async tx => {
      const category = await tx.category.findUnique({ where: { id: categoryId }, include: { _count: { select: { modules: true } } } });
      if (!category) throw fail(404, 'Categoría no encontrada');
      if (category._count.modules) throw fail(409, 'Reasigna las microapps antes de eliminar esta categoría');
      await tx.category.delete({ where: { id: categoryId } });
    }, { isolationLevel: 'Serializable' });
  }
  catch (error) {
    if (['P2003', 'P2034'].includes(error.code)) throw fail(409, 'Reasigna las microapps antes de eliminar esta categoría');
    if (error.code === 'P2025') throw fail(404, 'Categoría no encontrada');
    throw error;
  }
}
async function updateModule(moduleId, body) {
  id(moduleId);
  if (!Array.isArray(body?.categoryIds) || body.categoryIds.length > 50 || !body.categoryIds.every(uuid) || typeof body.free !== 'boolean') throw fail(400, 'Selecciona categorías válidas e indica si es totalmente gratis');
  const ids = [...new Set(body.categoryIds)];
  if (await prisma.category.count({ where: { id: { in: ids } } }) !== ids.length) throw fail(400, 'Una categoría ya no existe');
  try { return await prisma.module.update({ where: { id: moduleId }, data: { free: body.free, categories: { set: ids.map(id => ({ id })) } }, include: { categories: true } }).then(require('./icons').moduleView); }
  catch (error) { if (error.code === 'P2025') throw fail(404, 'Microapp o categoría no encontrada'); throw error; }
}
async function setModuleActive(moduleId, body) {
  id(moduleId);
  if (typeof body?.active !== 'boolean') throw fail(400, 'Indica un estado válido');
  try { return await prisma.module.update({ where: { id: moduleId }, data: { active: body.active }, include: { categories: true } }).then(require('./icons').moduleView); }
  catch (error) { if (error.code === 'P2025') throw fail(404, 'Microapp no encontrada'); throw error; }
}
// Existing installations keep working when a microapp leaves the public catalog.
async function requireAvailable(db, code, workspaceId, configured = false) {
  const module = await db.module.findUnique({ where: { code } });
  const installed = module && await db.workspaceModule.findUnique({ where: { workspaceId_moduleId: { workspaceId, moduleId: module.id } } });
  if (!module || (!module.active && !installed?.active && !configured)) throw fail(409, 'Esta microapp no admite nuevas activaciones');
  return module;
}
module.exports = {
  listCategories: () => prisma.category.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { modules: true } } } }),
  publicCatalog: async () => ({ categories: await prisma.category.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }), modules: (await prisma.module.findMany({ where: { active: true }, select: { code: true, name: true, description: true, free: true, iconKey: true, categories: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } })).map(require('./icons').moduleView) }),
  writeCategory, deleteCategory, updateModule, setModuleActive, requireAvailable,
};
