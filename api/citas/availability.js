const { fail, date } = require('./validation');
function parts(instant, timezone) {
  const values = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(instant).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
  return { date: `${values.year}-${values.month}-${values.day}`, minute: Number(values.hour) * 60 + Number(values.minute), second: Number(values.second) };
}
// Round-trip wall-clock values: DST gaps yield no instant, repeated hours yield both.
function instants(day, minute, timezone) {
  const wall = Date.parse(day + 'T00:00:00Z') + minute * 60000;
  const offsets = new Set([-36, 0, 36].map(hours => {
    const probe = new Date(wall + hours * 3600000);
    const local = parts(probe, timezone);
    return Date.parse(local.date + 'T00:00:00Z') + local.minute * 60000 + local.second * 1000 - probe.getTime();
  }));
  const target = new Date(wall);
  const targetDay = target.toISOString().slice(0, 10);
  const targetMinute = target.getUTCHours() * 60 + target.getUTCMinutes();
  return [...offsets].map(offset => new Date(wall - offset))
    .filter(value => { const local = parts(value, timezone); return local.date === targetDay && local.minute === targetMinute; })
    .sort((a, b) => a - b);
}
function nextDay(day) { return new Date(Date.parse(day + 'T12:00:00Z') + 86400000).toISOString().slice(0, 10); }
function dayStart(day, timezone) {
  // Some zones skip local midnight; the day starts at its first existing minute.
  for (let minute = 0; minute <= 180; minute++) {
    const first = instants(day, minute, timezone)[0];
    if (first) return first;
  }
  return null;
}
function dayBounds(day, timezone) {
  date(day);
  const first = dayStart(day, timezone);
  const last = dayStart(nextDay(day), timezone);
  if (!first || !last) throw fail(400, 'Esta fecha no está disponible en la zona horaria del consultorio');
  return { first, last };
}
function bookableDate(day, timezone, now) {
  date(day);
  const today = parts(now, timezone).date;
  const horizon = new Date(Date.parse(today + 'T12:00:00Z') + 180 * 86400000).toISOString().slice(0, 10);
  if (day < today || day > horizon) throw fail(400, 'Selecciona una fecha desde hoy y dentro de los próximos 180 días');
}
function availableSlots(professional, day, timezone, occupied, now) {
  const weekday = new Date(day + 'T12:00:00Z').getUTCDay();
  const slots = [];
  const duration = professional.durationMinutes * 60000;
  for (const schedule of professional.schedules.filter(row => row.weekday === weekday)) {
    for (let minute = schedule.startMinute; minute + professional.durationMinutes <= schedule.endMinute; minute += professional.durationMinutes) {
      for (const startsAt of instants(day, minute, timezone)) {
        const endsAt = new Date(startsAt.getTime() + duration);
        const end = parts(endsAt, timezone);
        const outside = end.date !== day && !(schedule.endMinute === 1440 && end.date === nextDay(day) && end.minute === 0);
        if (outside || (end.date === day && end.minute > schedule.endMinute) || startsAt <= now) continue;
        const blocked = occupied.some(a => a.startsAt < endsAt && a.endsAt > startsAt && (a.status === 'CONFIRMED' || (a.status === 'PENDING' && a.expiresAt > now)));
        if (!blocked) slots.push({ startsAt, endsAt, label: String(Math.floor(minute / 60)).padStart(2, '0') + ':' + String(minute % 60).padStart(2, '0') });
      }
    }
  }
  return slots.sort((a, b) => a.startsAt - b.startsAt);
}
module.exports = { parts, instants, dayBounds, bookableDate, availableSlots, nextDay };
