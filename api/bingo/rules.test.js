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
