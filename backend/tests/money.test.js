const test = require('node:test');
const assert = require('node:assert/strict');
const { toCents, fromCents, priceLine, priceSale, computeChange } = require('../src/utils/money');

test('toCents/fromCents round-trip common prices without float drift', () => {
  assert.equal(toCents(2.99), 299);
  assert.equal(toCents(0.1), 10);
  assert.equal(toCents(19.999), 2000); // rounds, doesn't truncate
  assert.equal(fromCents(299), 2.99);
  assert.equal(fromCents(10), 0.1);
});

test('priceLine: whole-unit item with no tax', () => {
  const line = priceLine(299, 1, 0);
  assert.deepEqual(line, { subtotalCents: 299, taxCents: 0, totalCents: 299 });
});

test('priceLine: fractional quantity (weighed produce) rounds to the nearest cent', () => {
  // 2.99 * 1.5 = 4.485 -> rounds to 449 (i.e. $4.49), not truncated to 448
  const line = priceLine(299, 1.5, 0);
  assert.equal(line.subtotalCents, 449);
});

test('priceLine: applies tax rate to the line subtotal', () => {
  // $10.00 at 8.25% tax = 82.5 cents tax -> rounds to 83
  const line = priceLine(1000, 1, 0.0825);
  assert.equal(line.subtotalCents, 1000);
  assert.equal(line.taxCents, 83);
  assert.equal(line.totalCents, 1083);
});

test('priceSale: sums multiple lines and applies a discount', () => {
  const apple = priceLine(299, 2, 0); // 598
  const milk = priceLine(249, 1, 0); // 249
  const sale = priceSale([apple, milk], 50); // 50 cent discount
  assert.equal(sale.subtotalCents, 847);
  assert.equal(sale.taxCents, 0);
  assert.equal(sale.discountCents, 50);
  assert.equal(sale.totalCents, 797);
});

test('priceSale: a discount can never push the total below zero', () => {
  const single = priceLine(100, 1, 0);
  const sale = priceSale([single], 500); // way more discount than the sale is worth
  assert.equal(sale.totalCents, 0);
});

test('computeChange: exact payment yields zero change', () => {
  assert.equal(computeChange(797, 797), 0);
});

test('computeChange: overpayment yields the correct change', () => {
  assert.equal(computeChange(847, 1000), 153);
});

test('computeChange: insufficient cash returns null instead of a negative number', () => {
  assert.equal(computeChange(1000, 500), null);
});

test('classic float-drift case: three 0.1 lines sum to exactly 30 cents, not 29.999...', () => {
  const line = priceLine(10, 1, 0);
  const sale = priceSale([line, line, line]);
  assert.equal(sale.subtotalCents, 30);
  assert.equal(Number.isInteger(sale.subtotalCents), true);
});
