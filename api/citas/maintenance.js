const crypto = require('node:crypto');
// Bounded per-process protection plus persistent phone limits in the booking transaction.
function rateLimit({ limit, windowMs }) {
  const buckets = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = crypto.createHash('sha256').update((req.ip || req.socket.remoteAddress || 'unknown') + ':' + (req.params.code || 'public')).digest('hex');
    if (buckets.size >= 10000) for (const [id, value] of buckets) if (value.until <= now) buckets.delete(id);
    let bucket = buckets.get(key);
    if (!bucket || bucket.until <= now) {
      if (!bucket && buckets.size >= 10000) return res.status(429).json({ message: 'Demasiadas solicitudes. Intenta más tarde' });
      bucket = { count: 0, until: now + windowMs }; buckets.set(key, bucket);
    }
    if (++bucket.count > limit) {
      res.set('Retry-After', String(Math.ceil((bucket.until - now) / 1000)));
      return res.status(429).json({ message: 'Demasiadas solicitudes. Espera unos minutos e intenta nuevamente' });
    }
    next();
  };
}
function startExpirationSweep({ intervalMs = 60000 } = {}) {
  const { expirePending } = require('./service');
  let running = false;
  async function sweep() {
    if (running) return;
    running = true;
    try { await expirePending(); } catch (error) { console.error('Mi Cita expiration:', error.code || error.name); } finally { running = false; }
  }
  const timer = setInterval(sweep, intervalMs); timer.unref();
  sweep();
  return () => clearInterval(timer);
}
module.exports = { rateLimit, startExpirationSweep };
