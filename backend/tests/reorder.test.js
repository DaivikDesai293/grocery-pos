const test = require('node:test');
const assert = require('node:assert/strict');
const { suggestReorder } = require('../src/utils/reorder');

test('above threshold: not low stock, nothing suggested', () => {
  const r = suggestReorder({ quantityOnHand: 20, reorderThreshold: 5, reorderQuantity: 10 });
  assert.equal(r.isLowStock, false);
  assert.equal(r.suggestedQuantity, 0);
});

test('exactly at threshold counts as low stock (boundary is inclusive)', () => {
  const r = suggestReorder({ quantityOnHand: 5, reorderThreshold: 5, reorderQuantity: 10 });
  assert.equal(r.isLowStock, true);
});

test('low stock with no sales history falls back to the static reorderQuantity', () => {
  const r = suggestReorder({ quantityOnHand: 1, reorderThreshold: 5, reorderQuantity: 12 });
  assert.equal(r.isLowStock, true);
  assert.equal(r.suggestedQuantity, 12);
});

test('low stock with sales velocity sizes the order to cover the target days of stock', () => {
  // Selling 3/day, want 14 days of runway, 2 on hand -> need ceil(3*14 - 2) = 40
  const r = suggestReorder({
    quantityOnHand: 2,
    reorderThreshold: 5,
    reorderQuantity: 10,
    avgDailySales: 3,
    targetDaysOfStock: 14,
  });
  assert.equal(r.suggestedQuantity, 40);
});

test('velocity-based suggestion never undercuts the product\'s own minimum reorderQuantity', () => {
  // Barely selling (0.1/day) but the manager configured a sensible floor of 24.
  const r = suggestReorder({
    quantityOnHand: 1,
    reorderThreshold: 5,
    reorderQuantity: 24,
    avgDailySales: 0.1,
    targetDaysOfStock: 14,
  });
  assert.equal(r.suggestedQuantity, 24);
});

test('negative on-hand (data correction pending) is still treated as low stock', () => {
  const r = suggestReorder({ quantityOnHand: -3, reorderThreshold: 0, reorderQuantity: 10 });
  assert.equal(r.isLowStock, true);
});
