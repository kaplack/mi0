const { test } = require('node:test');
const assert = require('node:assert/strict');
const r = require('./rules');
test('cartones válidos con centro libre y números por columna', () => {
  const cards = new Set();
  for (let i = 0; i < 300; i++) {
    const card = r.card(); assert.equal(card.length, 25); assert.equal(card[12], 0);
    assert.equal(new Set(card).size, 25);
    card.forEach((n, index) => { if (index !== 12) assert.ok(n >= (index % 5) * 15 + 1 && n <= (index % 5 + 1) * 15) });
    cards.add(card.join(','));
  }
  assert.equal(cards.size, 300);
});
test('75 bolillas sin repeticiones y rechazo al agotar', () => {
  const balls = []; for (let i = 0; i < 75; i++) balls.push(r.draw(balls));
  assert.equal(new Set(balls).size, 75); assert.throws(() => r.draw(balls));
});
test('patrones horizontales, centro libre y rechazo de bingo inválido', () => {
  const card = r.card();
  assert.equal(r.wins(card, [], 'ONE'), false);
  assert.equal(r.wins(card, card.slice(0, 5), 'ONE'), true);
  assert.equal(r.wins(card, card.slice(0, 5), 'TWO'), false);
  assert.equal(r.wins(card, card.slice(0, 10), 'TWO'), true);
  assert.equal(r.wins(card, card.filter(Boolean), 'FULL'), true);
  assert.equal(r.wins(card, card.slice(10, 15).filter(Boolean), 'ONE'), true);
  assert.equal(r.wins(card, card.slice(0, 24).filter(Boolean), 'FULL'), false);
});
test('patrones de letra: X, L, T, H, O con centro libre automático', () => {
  // Cartón fijo para resultados predecibles: 25 valores distintos por columna.
  // Usamos r.card() real, pero manipulamos qué bolas se "sortean".
  const card = r.card();
  // Helpers para extraer los valores en los índices del patrón.
  const ballsFor = indices => indices.map(i => card[i]).filter(Boolean); // filter(Boolean) excluye el 0 (centro)

  // --- Letra X: diagonales cruzadas ---
  const xIdx = [0, 4, 6, 8, 12, 16, 18, 20, 24];
  assert.equal(r.wins(card, ballsFor(xIdx), 'LETTER_X'), true,  'X: todos los índices → gana');
  assert.equal(r.wins(card, ballsFor(xIdx.slice(0, -1)), 'LETTER_X'), false, 'X: falta un índice → no gana');
  assert.equal(r.wins(card, ballsFor(xIdx), 'LETTER_L'), false, 'X balls no satisfacen L');

  // --- Letra L: columna izquierda + fila inferior ---
  const lIdx = [0, 5, 10, 15, 20, 21, 22, 23, 24];
  assert.equal(r.wins(card, ballsFor(lIdx), 'LETTER_L'), true,  'L: todos los índices → gana');
  assert.equal(r.wins(card, ballsFor(lIdx.slice(1)), 'LETTER_L'), false, 'L: falta índice 0 → no gana');

  // --- Letra T: fila superior + columna central ---
  const tIdx = [0, 1, 2, 3, 4, 7, 12, 17, 22];
  assert.equal(r.wins(card, ballsFor(tIdx), 'LETTER_T'), true,  'T: todos los índices → gana');
  assert.equal(r.wins(card, ballsFor(tIdx.filter(i => i !== 7)), 'LETTER_T'), false, 'T: falta índice 7 → no gana');

  // --- Letra H: columnas extremas + fila central ---
  const hIdx = [0, 4, 5, 9, 10, 11, 12, 13, 14, 15, 19, 20, 24];
  assert.equal(r.wins(card, ballsFor(hIdx), 'LETTER_H'), true,  'H: todos los índices → gana');
  assert.equal(r.wins(card, ballsFor(hIdx.slice(0, -1)), 'LETTER_H'), false, 'H: falta último índice → no gana');

  // --- Letra O: borde completo ---
  const oIdx = [0, 1, 2, 3, 4, 5, 9, 10, 14, 15, 19, 20, 21, 22, 23, 24];
  assert.equal(r.wins(card, ballsFor(oIdx), 'LETTER_O'), true,  'O: todos los índices → gana');
  assert.equal(r.wins(card, ballsFor(oIdx.slice(0, -1)), 'LETTER_O'), false, 'O: falta un borde → no gana');

  // --- Patrón inválido no da ganador ---
  assert.equal(r.wins(card, Array.from({ length: 75 }, (_, i) => i + 1), 'DIAGONAL'), false, 'Patrón desconocido → false');

  // --- Centro libre siempre cuenta (no necesita bola sorteada) ---
  // Para X: el índice 12 (centro, valor 0) forma parte del patrón. Sacamos las bolas SIN el 0.
  const xSinCentro = ballsFor(xIdx); // filter(Boolean) ya excluye el 0
  assert.equal(r.wins(card, xSinCentro, 'LETTER_X'), true, 'X: centro libre cuenta sin sortearse');
});
test('multi-cartón: verificación si cualquiera de los cartones gana', () => {
  const card1 = r.card();
  const card2 = r.card();
  const card3 = r.card();
  const cards = [card1, card2, card3];
  assert.equal(cards.some(c => r.wins(c, [], 'ONE')), false);
  const winningBalls = card2.slice(0, 5);
  assert.equal(cards.some(c => r.wins(c, winningBalls, 'ONE')), true);
  assert.equal(r.wins(card2, winningBalls, 'ONE'), true);
});
