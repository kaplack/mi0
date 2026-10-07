function fail(status, message) { const error = new Error(message); error.status = status; throw error; }
function uuid(value) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) fail(400, 'Identificador inválido');
  return value;
}
function names(value, label, max) {
  if (!Array.isArray(value) || !value.length || value.length > max) fail(400, label + ': cantidad inválida (máximo ' + max + ')');
  return value.map((name) => {
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 120) fail(400, label + ': cada nombre debe tener entre 1 y 120 caracteres');
    return name.trim().normalize('NFC');
  });
}
function draft(body) {
  if (!body || typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 120) fail(400, 'El nombre del sorteo debe tener entre 1 y 120 caracteres');
  const participants = names(body.participants, 'Participantes', 1000);
  const prizes = names(body.prizes, 'Premios', 50);
  if (participants.length < 2 || participants.length < prizes.length) fail(400, 'Agrega al menos dos participantes y uno por cada premio');
  const unique = new Set(participants.map(name => name.toLocaleLowerCase('es')));
  if (unique.size !== participants.length) fail(400, 'Hay nombres repetidos. Distingue a cada participante con un apellido o identificador');
  return { name: body.name.trim(), participants, prizes };
}
function paymentReference(value) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9-]{4,40}$/.test(value.trim())) fail(400, 'La referencia debe tener entre 4 y 40 letras, números o guiones');
  return value.trim().toUpperCase();
}
module.exports = { fail, uuid, draft, paymentReference };
