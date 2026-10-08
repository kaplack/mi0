const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { isolatedDatabase, actor } = require('./test-helpers');
const { parts, nextDay, instants, availableSlots, dayBounds } = require('./availability');

let isolated, db, server, base, owner, adminActor, member, outsider;
async function request(method, path, actor, body) {
  const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(actor ? { Authorization: 'Bearer ' + actor.token } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { status: response.status, data: await response.json() };
}
async function fixture(config = {}) {
  const w = await db.workspace.create({ data: { name: 'Consultorio de prueba', memberships: { create: [{ userId: owner.id, role: 'OWNER' }, { userId: adminActor.id, role: 'ADMIN' }, { userId: member.id, role: 'MEMBER' }] } } });
  const root = '/workspace/' + w.id;
  const settings = { name: 'Mi Consultorio', timezone: 'America/Lima', requireDni: false, expirationHours: null, ...config };
  const setup = await request('PUT', root + '/settings', owner, settings);
  assert.equal(setup.status, 200, JSON.stringify(setup.data));
  const day = nextDay(parts(new Date(), settings.timezone).date);
  const professionalBody = { name: 'Dra. Ana', specialty: 'Podología', active: true, durationMinutes: 30, schedules: [{ weekday: new Date(day + 'T12:00:00Z').getUTCDay(), startMinute: 540, endMinute: 720 }] };
  const p = await request('POST', root + '/professionals', owner, professionalBody);
  assert.equal(p.status, 201, JSON.stringify(p.data));
  const availability = await request('GET', '/public/' + setup.data.clinic.code + '/availability?professionalId=' + p.data.professional.id + '&date=' + day);
  assert.equal(availability.status, 200, JSON.stringify(availability.data));
  return { w, root, settings, clinic: setup.data.clinic, professional: p.data.professional, professionalBody, day, slots: availability.data.slots };
}
const patient = (f, slot = 0, extra = {}) => ({ professionalId: f.professional.id, startsAt: f.slots[slot].startsAt, requestKey: crypto.randomUUID(), patientName: 'Paciente Privado', phone: '+51 987 654 321', ...extra });
const book = (f, body) => request('POST', '/public/' + f.clinic.code + '/appointments', null, body || patient(f));
before(async () => {
  isolated = await isolatedDatabase(); db = isolated.db;
  owner = await actor(db, 'owner'); adminActor = await actor(db, 'admin'); member = await actor(db, 'member'); outsider = await actor(db, 'outsider');
  server = await new Promise(resolve => { const s = require('../app').listen(0, '127.0.0.1', () => resolve(s)); });
  base = 'http://127.0.0.1:' + server.address().port + '/api/citas';
});
after(async () => { if (server) await new Promise(resolve => server.close(resolve)); if (isolated) await isolated.cleanup(); });
test('workspace permissions, admin/member roles, scoped professionals and inactive workspace', async () => {
  const f = await fixture();
  assert.equal((await request('GET', f.root)).status, 401);
  assert.equal((await request('GET', f.root, outsider)).status, 403);
  assert.equal((await request('GET', f.root, member)).data.role, 'MEMBER');
  assert.equal((await request('PUT', f.root + '/settings', member, f.settings)).status, 403);
  assert.equal((await request('PUT', f.root + '/settings', adminActor, f.settings)).status, 200);
  assert.equal((await request('POST', f.root + '/professionals', member, f.professionalBody)).status, 403);
  const other = await fixture();
  assert.equal((await request('PUT', f.root + '/professionals/' + other.professional.id, owner, f.professionalBody)).status, 404);
  const created = await book(f);
  const a = await db.citaAppointment.findFirst({ where: { clinicId: f.clinic.id } });
  assert.equal(created.status, 201);
  assert.equal((await request('PATCH', other.root + '/appointments/' + a.id, member, { status: 'CONFIRMED' })).status, 404);
  assert.equal((await request('GET', f.root + '/appointments?date=' + f.day, outsider)).status, 403);
  await db.workspace.update({ where: { id: f.w.id }, data: { status: 'INACTIVE' } });
  assert.equal((await request('GET', f.root, owner)).status, 403);
  assert.equal((await request('GET', '/public/' + f.clinic.code)).status, 404);
});
test('DNI policy, validation, private patient data and module activation', async () => {
  const f = await fixture({ requireDni: true });
  assert.equal((await book(f)).status, 400);
  assert.equal((await book(f, patient(f, 0, { dni: '123' }))).status, 400);
  assert.equal((await book(f, patient(f, 0, { dni: '12345678', patientName: ' ' }))).status, 400);
  const body = patient(f, 0, { dni: '12345678' });
  const created = await book(f, body); assert.equal(created.status, 201);
  const info = await request('GET', '/public/' + f.clinic.code);
  const slots = await request('GET', '/public/' + f.clinic.code + '/availability?professionalId=' + f.professional.id + '&date=' + f.day);
  const receipt = await request('POST', '/public/' + f.clinic.code + '/receipt', null, { requestKey: body.requestKey });
  for (const data of [created.data, info.data, slots.data, receipt.data]) {
    for (const privateValue of ['12345678', 'Paciente Privado', '987654321', 'patientName', 'phone', 'dni']) assert.ok(!JSON.stringify(data).includes(privateValue), privateValue);
  }
  const agenda = await request('GET', f.root + '/appointments?date=' + f.day, member);
  assert.equal(agenda.data.appointments[0].dni, '12345678');
  assert.equal(agenda.data.appointments[0].requestKey, undefined);
  assert.ok(await db.workspaceModule.findFirst({ where: { workspaceId: f.w.id, module: { code: 'mi-cita' } } }));
  await request('PUT', f.root + '/settings', owner, { ...f.settings, requireDni: false });
  const noDni = await book(f, patient(f, 1, { dni: '87654321' })); assert.equal(noDni.status, 201);
  const stored = await db.citaAppointment.findFirst({ where: { clinicId: f.clinic.id, startsAt: new Date(f.slots[1].startsAt) } });
  assert.equal(stored.dni, null);
  assert.equal((await db.citaAppointment.findFirst({ where: { requestKey: body.requestKey } })).dni, '12345678');
});
test('simultaneous reservations block exactly one slot, retry is idempotent, independent professionals can book', async () => {
  const f = await fixture();
  const bodies = [patient(f), patient(f)];
  const results = await Promise.all(bodies.map(body => book(f, body)));
  assert.deepEqual(results.map(r => r.status).sort(), [201, 409]);
  const winning = bodies[results.findIndex(r => r.status === 201)];
  assert.equal((await book(f, winning)).status, 201);
  assert.equal(await db.citaAppointment.count({ where: { clinicId: f.clinic.id } }), 1);
  const p2 = await request('POST', f.root + '/professionals', owner, { ...f.professionalBody, name: 'Dr. Luis' });
  assert.equal((await book(f, patient(f, 0, { professionalId: p2.data.professional.id }))).status, 201);
  const overlapping = { ...winning, startsAt: new Date(new Date(winning.startsAt).getTime() + 15 * 60000).toISOString(), requestKey: crypto.randomUUID() };
  assert.equal((await book(f, overlapping)).status, 409);
  const original = await db.citaAppointment.findFirst({ where: { requestKey: winning.requestKey } });
  await assert.rejects(db.citaAppointment.create({ data: { clinicId: f.clinic.id, professionalId: f.professional.id, requestKey: crypto.randomUUID(), patientName: 'Otro', phone: '+51911111111', startsAt: new Date(original.startsAt.getTime() + 60000), endsAt: original.endsAt, expiresAt: original.expiresAt } }), /exclusion|constraint|23P01/i);
});
test('confirmation, cancellation, expiration release and terminal states', async () => {
  const f = await fixture({ expirationHours: 2 });
  const body = patient(f); const created = await book(f, body); assert.equal(created.status, 201);
  const original = await db.citaAppointment.findFirst({ where: { requestKey: body.requestKey } });
  assert.ok(original.expiresAt.getTime() - original.createdAt.getTime() <= 2 * 3600000 + 2000);
  const route = f.root + '/appointments/' + original.id;
  assert.equal((await request('PATCH', route, member, { status: 'CONFIRMED' })).status, 200);
  assert.ok((await db.citaAppointment.findUnique({ where: { id: original.id } })).confirmedAt);
  assert.equal((await request('PATCH', route, member, { status: 'CANCELLED' })).status, 200);
  assert.ok((await db.citaAppointment.findUnique({ where: { id: original.id } })).cancelledAt);
  assert.equal((await request('PATCH', route, member, { status: 'CONFIRMED' })).status, 409);
  const replacement = patient(f); assert.equal((await book(f, replacement)).status, 201);
  const a = await db.citaAppointment.findFirst({ where: { requestKey: replacement.requestKey } });
  await db.citaAppointment.update({ where: { id: a.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
  // A conflict must still commit the expiration, without a page or availability request.
  assert.equal((await request('PATCH', f.root + '/appointments/' + a.id, member, { status: 'CONFIRMED' })).status, 409);
  const expired = await db.citaAppointment.findUnique({ where: { id: a.id } });
  assert.equal(expired.status, 'EXPIRED'); assert.ok(expired.expiredAt);
  assert.equal((await book(f, patient(f))).status, 201);
  const manual = await fixture(); const manualBody = patient(manual); await book(manual, manualBody);
  const m = await db.citaAppointment.findFirst({ where: { requestKey: manualBody.requestKey } });
  assert.equal(m.expiresAt.getTime(), m.startsAt.getTime());
  await require('./service').expirePending(db, manual.clinic.id, new Date(m.startsAt.getTime() + 1));
  assert.equal((await db.citaAppointment.findUnique({ where: { id: m.id } })).status, 'EXPIRED');
});
test('professional edits preserve appointments and validation rejects past/invalid schedules', async () => {
  const f = await fixture(); const body = patient(f); await book(f, body);
  const edited = await request('PUT', f.root + '/professionals/' + f.professional.id, owner, { ...f.professionalBody, active: false, schedules: [] });
  assert.equal(edited.status, 200); assert.equal(edited.data.futureAppointments, 1);
  assert.equal(await db.citaAppointment.count({ where: { clinicId: f.clinic.id } }), 1);
  assert.equal((await request('GET', '/public/' + f.clinic.code)).data.professionals.length, 0);
  const g = await fixture();
  assert.equal((await request('POST', g.root + '/professionals', owner, { ...g.professionalBody, schedules: [...g.professionalBody.schedules, ...g.professionalBody.schedules] })).status, 400);
  assert.equal((await request('PUT', g.root + '/settings', owner, { ...g.settings, expirationHours: 3 })).status, 400);
  assert.equal((await request('PUT', g.root + '/settings', owner, { ...g.settings, timezone: 'wrong' })).status, 400);
  assert.equal((await request('GET', '/public/' + g.clinic.code + '/availability?professionalId=' + g.professional.id + '&date=2026-02-30')).status, 400);
  const past = new Date(Date.now() - 86400000); past.setUTCSeconds(0, 0);
  assert.equal((await book(g, patient(g, 0, { startsAt: past.toISOString() }))).status, 400);
  assert.equal((await book(g, patient(g, 0, { website: 'spam.invalid' }))).status, 400);
});
test('Lima and DST conversions preserve dates, skip missing times and cover midnight appointments', () => {
  assert.equal(instants('2026-10-09', 540, 'America/Lima')[0].toISOString(), '2026-10-09T14:00:00.000Z');
  assert.equal(instants('2026-03-08', 150, 'America/New_York').length, 0);
  assert.equal(instants('2026-11-01', 90, 'America/New_York').length, 2);
  const bounds = dayBounds('2026-09-06', 'America/Santiago');
  assert.equal(parts(bounds.first, 'America/Santiago').date, '2026-09-06');
  assert.ok(bounds.last > bounds.first);
  const p = { durationMinutes: 30, schedules: [{ weekday: 5, startMinute: 1410, endMinute: 1440 }] };
  assert.equal(availableSlots(p, '2026-10-09', 'America/Lima', [], new Date('2026-10-08T00:00:00Z')).length, 1);
});

test('public booking abuse limits are enforced per consultorio and IP', async () => {
  const f = await fixture();
  for (let i = 0; i < 10; i++) assert.equal((await book(f, patient(f, 0, { patientName: '' }))).status, 400);
  assert.equal((await book(f)).status, 429);
  const another = await fixture(); assert.equal((await book(another)).status, 201);
});
test('expiration sweep runs without an open browser and retries retain their original DNI policy', async () => {
  const f = await fixture(); const body = patient(f); assert.equal((await book(f, body)).status, 201);
  await request('PUT', f.root + '/settings', owner, { ...f.settings, requireDni: true });
  assert.equal((await book(f, body)).status, 201);
  const a = await db.citaAppointment.findFirst({ where: { requestKey: body.requestKey } });
  await db.citaAppointment.update({ where: { id: a.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
  const stop = require('./maintenance').startExpirationSweep({ intervalMs: 20 });
  try {
    let state;
    for (let i = 0; i < 20; i++) {
      state = await db.citaAppointment.findUnique({ where: { id: a.id } });
      if (state.status === 'EXPIRED') break;
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    assert.equal(state.status, 'EXPIRED'); assert.ok(state.expiredAt);
  } finally { stop(); }
});

test('day summary counts all active appointments by clinic date and scopes access and ranges', async () => {
  const f = await fixture();
  const today = parts(new Date(), f.settings.timezone).date;
  const offset = n => { let day = today; while (n--) day = nextDay(day); return day; };
  const seed = (day, minute, status = 'CONFIRMED', professionalId = f.professional.id) => {
    const startsAt = instants(day, minute, f.settings.timezone)[0];
    return { clinicId: f.clinic.id, professionalId, requestKey: crypto.randomUUID(), patientName: 'Privado', phone: '+51987654321', dni: '12345678', startsAt, endsAt: new Date(startsAt.getTime() + 600000), expiresAt: status === 'EXPIRED' ? new Date(Date.now() - 1000) : startsAt, status };
  };
  const p2 = await request('POST', f.root + '/professionals', owner, { ...f.professionalBody, name: 'Otro' });
  await db.citaAppointment.createMany({ data: [
    ...Array.from({length: 105}, (_, i) => seed(f.day, i * 10)),
    seed(f.day, 1410, 'PENDING'), seed(f.day, 1120, 'CANCELLED'), seed(f.day, 1140, 'EXPIRED'),
    { ...seed(f.day, 1160, 'PENDING'), expiresAt: new Date(Date.now() - 1000) },
    seed(f.day, 0, 'CONFIRMED', p2.data.professional.id),
    seed(offset(6), 540), seed(offset(7), 540), seed(offset(29), 540), seed(offset(30), 540)
  ] });
  for (const user of [owner, adminActor, member]) {
    const result = await request('GET', f.root + '/day-summary', user);
    assert.equal(result.status, 200, JSON.stringify(result.data));
    assert.equal(result.data.days.length, 7);
    assert.equal(result.data.days[0].date, today);
    assert.equal(result.data.days[6].date, offset(6));
    assert.deepEqual(result.data.days[1], {date: f.day, confirmed:106, pending:1, total:107});
    assert.equal(result.data.days[0].total, 0);
    assert.ok(!JSON.stringify(result.data).includes('phone'));
    assert.ok(!JSON.stringify(result.data).includes('12345678'));
  }
  const thirty = await request('GET', f.root + '/day-summary?days=30&professionalId=' + f.professional.id, member);
  assert.equal(thirty.data.days.length, 30);
  assert.equal(thirty.data.days[1].total, 106);
  assert.equal(thirty.data.days[7].total, 1);
  assert.equal(thirty.data.days[29].total, 1);
  assert.equal(thirty.data.days.reduce((n,d) => n+d.total,0), 109);
  assert.equal((await request('GET', f.root + '/day-summary?days=14', owner)).status, 400);
  assert.equal((await request('GET', f.root + '/day-summary')).status, 401);
  assert.equal((await request('GET', f.root + '/day-summary', outsider)).status, 403);
  const other = await fixture();
  assert.equal((await request('GET', f.root + '/day-summary?professionalId=' + other.professional.id, owner)).status, 404);
  await db.workspace.update({where:{id:f.w.id},data:{status:'INACTIVE'}});
  assert.equal((await request('GET', f.root + '/day-summary', owner)).status, 403);
});
