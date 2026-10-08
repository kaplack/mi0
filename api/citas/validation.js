const fail = (status, message) => Object.assign(new Error(message), { status });
const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
function id(value) { if (!uuid(value)) throw fail(400, 'Identificador inválido'); return value; }
function text(value, label, max = 120) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw fail(400, 'Ingresa ' + label);
  return value.trim();
}
function settings(body) {
  const name = text(body?.name, 'el nombre del consultorio');
  const timezone = body?.timezone ?? 'America/Lima';
  if (typeof timezone !== 'string' || timezone.length > 64) throw fail(400, 'Selecciona una zona horaria válida');
  try { new Intl.DateTimeFormat('en', { timeZone: timezone }).format(); } catch { throw fail(400, 'Selecciona una zona horaria válida'); }
  const requireDni = body?.requireDni ?? false;
  const expirationHours = body?.expirationHours ?? null;
  if (typeof requireDni !== 'boolean') throw fail(400, 'Selecciona si necesitas DNI');
  if (expirationHours !== null && ![2, 6, 12, 24].includes(expirationHours)) throw fail(400, 'Elige confirmación manual o un plazo de 2, 6, 12 o 24 horas');
  return { name, timezone, requireDni, expirationHours };
}
function professional(body) {
  const name = text(body?.name, 'el nombre del profesional');
  const specialty = text(body?.specialty, 'la especialidad');
  const durationMinutes = body?.durationMinutes;
  if (!Number.isInteger(durationMinutes) || durationMinutes < 10 || durationMinutes > 240) throw fail(400, 'La duración debe ser de 10 a 240 minutos');
  const active = body?.active ?? true;
  if (typeof active !== 'boolean') throw fail(400, 'Estado del profesional inválido');
  const schedules = body?.schedules;
  if (!Array.isArray(schedules) || schedules.length > 28) throw fail(400, 'Configura hasta 28 bloques semanales de atención');
  const clean = schedules.map(row => {
    const { weekday, startMinute, endMinute } = row || {};
    if (![weekday, startMinute, endMinute].every(Number.isInteger) || weekday < 0 || weekday > 6 || startMinute < 0 || endMinute > 1440 || endMinute - startMinute < durationMinutes) {
      throw fail(400, 'Revisa los días y horarios: cada bloque debe permitir al menos una cita');
    }
    return { weekday, startMinute, endMinute };
  }).sort((a, b) => a.weekday - b.weekday || a.startMinute - b.startMinute);
  if (clean.some((row, i) => i && row.weekday === clean[i - 1].weekday && row.startMinute < clean[i - 1].endMinute)) throw fail(400, 'Los bloques de atención no deben solaparse');
  return { name, specialty, durationMinutes, active, schedules: clean };
}
function patient(body, requireDni) {
  const patientName = text(body?.patientName, 'tu nombre completo');
  const rawPhone = text(body?.phone, 'tu teléfono con código de país', 30);
  if (!/^\+?[\d\s()-]+$/.test(rawPhone)) throw fail(400, 'Ingresa un teléfono válido con código de país');
  let digits = rawPhone.replace(/\D/g, '');
  if (/^9\d{8}$/.test(digits)) digits = '51' + digits;
  if (!/^[1-9]\d{7,14}$/.test(digits)) throw fail(400, 'Ingresa un teléfono válido con código de país');
  const dni = requireDni ? body?.dni : null;
  if (requireDni && (typeof dni !== 'string' || !/^\d{8}$/.test(dni))) throw fail(400, 'El DNI debe tener ocho dígitos');
  return { patientName, phone: '+' + digits, dni };
}
function date(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw fail(400, 'Selecciona una fecha válida');
  const parsed = new Date(value + 'T12:00:00Z');
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw fail(400, 'Selecciona una fecha válida');
  return value;
}
function start(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00(?:\.000)?Z$/.test(value)) throw fail(400, 'Selecciona un horario válido');
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) throw fail(400, 'Selecciona un horario válido');
  return parsed;
}
module.exports = { fail, uuid, id, settings, professional, patient, date, start };
