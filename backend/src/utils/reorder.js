/**
 * Turns "on hand" + "recent sales velocity" into a plain suggested reorder
 * quantity. Pure function, no I/O, so it's trivially unit-testable — the
 * report service just feeds it numbers pulled from the database.
 */

/**
 * @param {object} p
 * @param {number} p.quantityOnHand
 * @param {number} p.reorderThreshold   below/at this, the product is "low stock"
 * @param {number} p.reorderQuantity    the static fallback order size set on the product
 * @param {number} [p.avgDailySales]    recent average units sold per day, if we have sales history
 * @param {number} [p.targetDaysOfStock=14] how many days of runway a suggested order should cover
 * @returns {{ isLowStock: boolean, suggestedQuantity: number, reason: string }}
 */
function suggestReorder({
  quantityOnHand,
  reorderThreshold,
  reorderQuantity,
  avgDailySales = 0,
  targetDaysOfStock = 14,
}) {
  const isLowStock = quantityOnHand <= reorderThreshold;

  if (!isLowStock) {
    return { isLowStock: false, suggestedQuantity: 0, reason: 'Stock is above the reorder threshold' };
  }

  if (avgDailySales > 0) {
    // Enough stock to cover `targetDaysOfStock` days at the recent sales pace, minus what's on hand.
    const target = avgDailySales * targetDaysOfStock;
    const suggestedQuantity = Math.max(Math.ceil(target - quantityOnHand), Math.ceil(reorderQuantity));
    return {
      isLowStock: true,
      suggestedQuantity,
      reason: `Selling ~${round2(avgDailySales)}/day — order enough for ${targetDaysOfStock} days`,
    };
  }

  // No recent sales history to go on — fall back to whatever the product record specifies.
  return {
    isLowStock: true,
    suggestedQuantity: Math.max(reorderQuantity, 0),
    reason: 'No recent sales history — using the product\'s default reorder quantity',
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

module.exports = { suggestReorder };
