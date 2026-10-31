const crypto = require('node:crypto');
const fail = (status, message) => Object.assign(new Error(message), { status });
function card() {
  const columns = Array.from({ length: 5 }, (_, c) => {
    const pool = Array.from({ length: 15 }, (_, n) => c * 15 + n + 1);
    return Array.from({ length: 5 }, () => pool.splice(crypto.randomInt(pool.length), 1)[0]);
  });
  return Array.from({ length: 25 }, (_, i) => i === 12 ? 0 : columns[i % 5][Math.floor(i / 5)]);
}
// Índices requeridos para cada patrón de letra sobre el cartón 5×5 (orden fila-columna).
// El centro (índice 12) siempre vale 0 y está incluido en `drawn`, por lo que se marca automáticamente.
const LETTER_MASKS = {
  LETTER_X: [0, 4, 6, 8, 12, 16, 18, 20, 24],
  LETTER_L: [0, 5, 10, 15, 20, 21, 22, 23, 24],
  LETTER_T: [0, 1, 2, 3, 4, 7, 12, 17, 22],
  LETTER_H: [0, 4, 5, 9, 10, 11, 12, 13, 14, 15, 19, 20, 24],
  LETTER_O: [0, 1, 2, 3, 4, 5, 9, 10, 14, 15, 19, 20, 21, 22, 23, 24],
};
function wins(card, balls, pattern) {
  const drawn = new Set([0, ...balls]);
  if (pattern === 'FULL') return card.every(n => drawn.has(n));
  if (pattern === 'ONE' || pattern === 'TWO') {
    const lines = Array.from({ length: 5 }, (_, r) => card.slice(r * 5, r * 5 + 5).every(n => drawn.has(n))).filter(Boolean).length;
    return lines >= (pattern === 'TWO' ? 2 : 1);
  }
  const mask = LETTER_MASKS[pattern];
  return Boolean(mask) && mask.every(i => drawn.has(card[i]));
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
