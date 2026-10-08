const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { isolatedDatabase, actor } = require('./test-helpers');
const { parts, nextDay, instants } = require('./availability');
const fixturePath = path.join(__dirname, '../../web/.cita-fixture.json');
let isolated, server, stopSweep;
async function main() {
  isolated = await isolatedDatabase('mi0_citas_ui_');
  const db = isolated.db;
  const owner = await actor(db, 'owner-ui'); const member = await actor(db, 'member-ui');
  const workspace = await db.workspace.create({ data: { name: 'Consultorio Vida', memberships: { create: [{ userId: owner.id, role: 'OWNER' }, { userId: member.id, role: 'MEMBER' }] } } });
  const personal = await db.workspace.create({ data: { name: 'Mi espacio', type: 'PERSONAL', memberships: { create: { userId: owner.id, role: 'OWNER' } } } });
  const clinic = await db.citaClinic.create({ data: { workspaceId: workspace.id, name: 'Consultorio Vida', code: crypto.randomBytes(12).toString('hex') } });
  const tomorrow = nextDay(parts(new Date(), 'America/Lima').date);
  const weekday = new Date(tomorrow + 'T12:00:00Z').getUTCDay();
  const professionals = [];
  for (const [name, specialty] of [['Dra. Ana López', 'Podología'], ['Dr. Luis García', 'Odontología']]) {
    professionals.push(await db.citaProfessional.create({ data: { clinicId: clinic.id, name, specialty, durationMinutes: 30, schedules: { create: [{ weekday, startMinute: 540, endMinute: 1080 }] } } }));
  }
  const startsAt = instants(tomorrow, 540, 'America/Lima')[0];
  await db.citaAppointment.create({ data: { clinicId: clinic.id, professionalId: professionals[0].id, requestKey: crypto.randomUUID(), patientName: 'Paciente de Prueba', phone: '+51911111111', startsAt, endsAt: new Date(startsAt.getTime() + 1800000), expiresAt: startsAt } });
  process.env.CORS_ORIGIN = 'http://localhost:5175';
  const app = require('../app');
  // Test-only lifecycle route: stop periodic work before the runner drops its schema.
  app.post('/__cita-test/stop', (req, res) => {
    if (req.get('Authorization') !== 'Bearer ' + owner.token) return res.sendStatus(403);
    if (stopSweep) stopSweep();
    res.json({ stopped: true });
  });
  server = app.listen(3002, '127.0.0.1');
  stopSweep = require('./maintenance').startExpirationSweep({ intervalMs: 1000 });
  fs.writeFileSync(fixturePath, JSON.stringify({ schema: isolated.schema, personalId: personal.id, ownerToken: owner.token, memberToken: member.token, workspaceId: workspace.id, code: clinic.code, tomorrow, professionals: professionals.map(p => ({ id: p.id, name: p.name })) }));
  console.log('Mi Cita UI API ready on port 3002 (isolated PostgreSQL schema)');
}
let stopping = false;
async function cleanup() {
  if (stopping) return; stopping = true;
  if (stopSweep) stopSweep();
  if (server) await new Promise(resolve => server.close(resolve));
  if (isolated) await isolated.cleanup();
  if (fs.existsSync(fixturePath)) fs.unlinkSync(fixturePath);
}
process.on('SIGTERM', () => cleanup().then(() => process.exit(0)));
process.on('SIGINT', () => cleanup().then(() => process.exit(0)));
main().catch(async error => { console.error(error.message); await cleanup(); process.exit(1); });
