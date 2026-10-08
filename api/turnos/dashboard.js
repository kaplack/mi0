const prisma = require('../prisma');
const { access, fail, lock } = require('./operators');
const { publicationConfig } = require('../raffles/config');
const plans = [{ code: 'MONTHLY', label: 'Mensual', amountCents: 1000 }, { code: 'ANNUAL', label: 'Anual', amountCents: 7900 }];
function previewEnabled() {
  if (process.env.NODE_ENV === 'production' || process.env.TURN_DASHBOARD_PREVIEW !== 'true') return false;
  try { return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(process.env.DATABASE_URL).hostname); } catch { return false; }
}
const paymentSelect = { id: true, plan: true, amountCents: true, reference: true, status: true, requestedAt: true, rejectionReason: true, validUntil: true };
async function queueFor(userId, workspaceId) {
  await access(prisma, userId, workspaceId, true);
  const queue = await prisma.turnQueue.findUnique({ where: { workspaceId } });
  if (!queue) throw fail(404, 'Configura el negocio primero');
  return queue;
}
async function subscription(userId, workspaceId) {
  const queue = await queueFor(userId, workspaceId);
  const payment = await prisma.turnDashboardPayment.findFirst({ where: { queueId: queue.id }, orderBy: { requestedAt: 'desc' }, select: paymentSelect });
  const config = publicationConfig();
  return { preview: previewEnabled(), active: previewEnabled() || Boolean(queue.dashboardUntil && queue.dashboardUntil > new Date()), validUntil: queue.dashboardUntil,
    plans, payment, paymentInstructions: { enabled: config.enabled, phone: config.yapePhone, name: config.yapeName } };
}
async function requestPayment(userId, workspaceId, body) {
  const queue = await queueFor(userId, workspaceId);
  if (!publicationConfig().enabled) throw fail(503, 'Los pagos por Yape aún no están habilitados');
  const plan = plans.find(item => item.code === body?.plan);
  const reference = typeof body?.reference === 'string' ? body.reference.trim().toUpperCase() : '';
  if (!plan || !/^[A-Z0-9-]{4,80}$/.test(reference)) throw fail(400, 'Selecciona el plan e ingresa una referencia de pago válida');
  return prisma.$transaction(async tx => {
    await lock(tx, queue.id);
    const pending = await tx.turnDashboardPayment.findFirst({ where: { queueId: queue.id, status: 'PENDING' }, select: paymentSelect });
    if (pending) {
      if (pending.reference === reference && pending.plan === plan.code) return pending;
      throw fail(409, 'Ya tienes un pago pendiente de verificación');
    }
    const used = await tx.rafflePublication.findUnique({ where: { reference } });
    if (used) throw fail(409, 'Esta referencia de pago ya está registrada');
    return tx.turnDashboardPayment.create({ data: { queueId: queue.id, requestedById: userId, plan: plan.code, amountCents: plan.amountCents, reference }, select: paymentSelect });
  });
}
function addMonths(date, months) {
  // Renew by calendar months in Lima, preserving the local time.
  const offset = 5 * 3600000;
  const result = new Date(date.getTime() - offset);
  const day = result.getUTCDate();
  result.setUTCDate(1); result.setUTCMonth(result.getUTCMonth() + months);
  const last = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, last));
  return new Date(result.getTime() + offset);
}
async function reviewPayment(userId, id, action, reason) {
  if (!['approve', 'reject'].includes(action)) throw fail(400, 'Selecciona una acción válida');
  const rejectionReason = typeof reason === 'string' ? reason.trim() : '';
  if (action === 'reject' && (!rejectionReason || rejectionReason.length > 300)) throw fail(400, 'Indica el motivo de rechazo');
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw fail(400, 'Solicitud inválida');
  const record = await prisma.turnDashboardPayment.findUnique({ where: { id } });
  if (!record) throw fail(404, 'Solicitud no encontrada');
  return prisma.$transaction(async tx => {
    await lock(tx, record.queueId);
    const payment = await tx.turnDashboardPayment.findUnique({ where: { id }, include: { queue: { include: { workspace: true } } } });
    if (payment.status !== 'PENDING') throw fail(409, 'Esta solicitud ya fue revisada');
    if (payment.queue.workspace.status !== 'ACTIVE') throw fail(409, 'El negocio está inactivo');
    const now = new Date();
    const data = { reviewedById: userId, reviewedAt: now, status: action === 'approve' ? 'APPROVED' : 'REJECTED', rejectionReason: action === 'reject' ? rejectionReason : null };
    if (action === 'approve') {
      data.validFrom = payment.queue.dashboardUntil > now ? payment.queue.dashboardUntil : now;
      data.validUntil = addMonths(data.validFrom, payment.plan === 'ANNUAL' ? 12 : 1);
      await tx.turnQueue.update({ where: { id: payment.queueId }, data: { dashboardUntil: data.validUntil } });
    }
    return tx.turnDashboardPayment.update({ where: { id }, data, select: paymentSelect });
  });
}
function period(query) {
  function parse(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw fail(400, 'Selecciona un rango de fechas válido');
    const date = new Date(value + 'T00:00:00-05:00');
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw fail(400, 'Fecha inválida');
    return date;
  }
  const start = parse(query.from); const end = parse(query.to); end.setUTCDate(end.getUTCDate() + 1);
  if (end <= start || end - start > 366 * 86400000) throw fail(400, 'Selecciona hasta 366 días, en orden cronológico');
  return { start, end };
}
async function metrics(userId, workspaceId, query) {
  const queue = await queueFor(userId, workspaceId);
  if (!previewEnabled() && (!queue.dashboardUntil || queue.dashboardUntil <= new Date())) throw fail(402, 'Contrata el Dashboard para acceder a las estadísticas');
  const { start, end } = period(query);
  const rows = await prisma.$queryRaw`
    SELECT "counter", COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE "status" = 'SERVED')::int AS served,
      COUNT(*) FILTER (WHERE "status" = 'ABSENT')::int AS absent,
      COUNT(*) FILTER (WHERE "status" = 'EXPIRED')::int AS expired,
      COUNT(*) FILTER (WHERE "status" IN ('WAITING', 'CALLED'))::int AS active,
      COUNT(*) FILTER (WHERE "calledAt" >= "createdAt")::int AS "waitSamples",
      COALESCE(SUM(EXTRACT(EPOCH FROM ("calledAt" - "createdAt"))) FILTER (WHERE "calledAt" >= "createdAt"), 0)::float8 AS "waitSeconds",
      COUNT(*) FILTER (WHERE "status" = 'SERVED' AND "servedAt" >= "calledAt")::int AS "serviceSamples",
      COALESCE(SUM(EXTRACT(EPOCH FROM ("servedAt" - "calledAt"))) FILTER (WHERE "status" = 'SERVED' AND "servedAt" >= "calledAt"), 0)::float8 AS "serviceSeconds"
    FROM "TurnTicket" WHERE "queueId" = ${queue.id}::uuid AND "createdAt" >= (${start}::timestamptz AT TIME ZONE 'UTC') AND "createdAt" < (${end}::timestamptz AT TIME ZONE 'UTC') GROUP BY "counter"`;
  const hours = await prisma.$queryRaw`SELECT EXTRACT(HOUR FROM "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Lima')::int AS hour, COUNT(*)::int AS count FROM "TurnTicket" WHERE "queueId" = ${queue.id}::uuid AND "createdAt" >= (${start}::timestamptz AT TIME ZONE 'UTC') AND "createdAt" < (${end}::timestamptz AT TIME ZONE 'UTC') GROUP BY hour ORDER BY hour`;
  const sums = rows.reduce((all, row) => { for (const key of Object.keys(all)) all[key] += row[key]; return all; }, { total: 0, served: 0, absent: 0, expired: 0, active: 0, waitSamples: 0, waitSeconds: 0, serviceSamples: 0, serviceSeconds: 0 });
  const view = row => ({ ...row, waitAverageSeconds: row.waitSamples ? row.waitSeconds / row.waitSamples : null, serviceAverageSeconds: row.serviceSamples ? row.serviceSeconds / row.serviceSamples : null });
  return { from: query.from, to: query.to, timezone: 'America/Lima', summary: view(sums), counters: rows.filter(row => row.counter !== null).sort((a,b) => a.counter - b.counter).map(row => ({ ...view(row), name: queue.counterNames[row.counter - 1] || 'Ventanilla ' + row.counter })), hours: Array.from({ length: 24 }, (_, hour) => ({ hour, count: hours.find(row => row.hour === hour)?.count || 0 })) };
}
module.exports = { subscription, requestPayment, reviewPayment, metrics, addMonths };
