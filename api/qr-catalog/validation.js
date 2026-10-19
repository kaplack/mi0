const fail = (status, message) => Object.assign(new Error(message), { status });
function id(value) { if (typeof value !== 'string' || !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value)) throw fail(400, 'Identificador inválido'); return value; }
function text(value, max, label, required = false) {
  if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) throw fail(400, `Revisa ${label}`);
  return value.trim();
}
function position(value) { if (!Number.isInteger(value) || value < 0 || value > 100000) throw fail(400, 'Orden inválido'); return value; }
function settings(body) {
  if (!body || !['PEN','USD','EUR'].includes(body.currency) || typeof body.published !== 'boolean') throw fail(400, 'Revisa la moneda y publicación');
  if (body.presentation !== undefined && !['CATALOG','MENU'].includes(body.presentation)) throw fail(400,'Selecciona Carta o Catálogo');
  const whatsapp = text(body.whatsapp, 15, 'WhatsApp');
  if (whatsapp && !/^[1-9]\d{6,14}$/.test(whatsapp)) throw fail(400, 'Ingresa WhatsApp con código de país, solo números (ej. 51987654321)');
  if (!Array.isArray(body.socialLinks) || body.socialLinks.length > 8) throw fail(400, 'Agrega hasta 8 redes sociales');
  const socialLinks = body.socialLinks.map(require('./socials').normalize);
  return { ...(body.presentation ? {presentation:body.presentation} : {}), name: text(body.name,120,'el nombre del negocio',true), description: text(body.description,500,'la descripción'), currency:body.currency, whatsapp, published:body.published, socialLinks };
}
function product(body) {
  if (!body || !Number.isSafeInteger(body.priceCents) || body.priceCents < 0 || body.priceCents > 99999999 || !['AVAILABLE','SOLD_OUT','HIDDEN'].includes(body.status)) throw fail(400, 'Revisa el precio y estado del producto');
  return { name:text(body.name,120,'el nombre del producto',true), description:text(body.description,1000,'la descripción'), priceCents:body.priceCents, categoryId:body.categoryId ? id(body.categoryId) : null, status:body.status, position:position(body.position) };
}
module.exports = { fail, id, text, position, settings, product };

const reserved = new Set(['api','admin','uploads','catalogo','catalogo-qr','microapps','mi-cita','mi-turno','auth','login','registro','s','turno','cita']);
function slug(value) {
  if (typeof value !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) || value.length < 3 || value.length > 60 || reserved.has(value)) throw fail(400, 'Usa una dirección de 3 a 60 letras minúsculas, números o guiones, como cosanostra');
  return value;
}
function suggestSlug(name) {
  const result=name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,50).replace(/-$/,'');
  return result.length >= 3 && !reserved.has(result) ? result : 'mi-negocio';
}
module.exports.slug = slug;
module.exports.suggestSlug = suggestSlug;
