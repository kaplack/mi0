const crypto = require('node:crypto');
const fail = (status, message) => Object.assign(new Error(message), { status });
function card() {
  const columns = Array.from({ length: 5 }, (_, c) => {
    const pool = Array.from({ length: 15 }, (_, n) => c * 15 + n + 1);
    return Array.from({ length: 5 }, () => pool.splice(crypto.randomInt(pool.length), 1)[0]);
  });
  return Array.from({ length: 25 }, (_, i) => i === 12 ? 0 : columns[i % 5][Math.floor(i / 5)]);
}
function wins(card, balls, pattern) {
  const drawn = new Set([0, ...balls]);
  const lines = Array.from({ length: 5 }, (_, r) => card.slice(r * 5, r * 5 + 5).every(n => drawn.has(n))).filter(Boolean).length;
  return pattern === 'FULL' ? card.every(n => drawn.has(n)) : lines >= (pattern === 'TWO' ? 2 : 1);
}
function draw(balls) {
  const remaining = Array.from({ length: 75 }, (_, i) => i + 1).filter(n => !balls.includes(n));
  if (!remaining.length) throw fail(409, 'Ya salieron las 75 bolillas');
  return remaining[crypto.randomInt(remaining.length)];
}
function text(value, max) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw fail(400, 'Ingresa un texto válido de hasta ' + max + ' caracteres');
  return value.trim();
}
const hash = token => crypto.createHash('sha256').update(token).digest('hex');
function token(value) { if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) throw fail(401, 'Identidad de jugador inválida'); return value; }
function id(value) { if (typeof value !== 'string' || !/^[a-f0-9-]{36}$/i.test(value)) throw fail(400, 'Identificador inválido'); return value; }
module.exports = { card, wins, draw, fail, text, hash, token, id };
