/**
 * All checkout math happens in integer cents. JS floating point (0.1 + 0.2
 * !== 0.3) is exactly the kind of bug you cannot afford in a till — so
 * dollars are converted to integer cents once, at the boundary, and every
 * calculation after that is integer arithmetic.
 */

function toCents(amount) {
  return Math.round(Number(amount) * 100);
}

function fromCents(cents) {
  return Math.round(cents) / 100;
}

/**
 * Prices one cart line. `unitPriceCents` and `taxRate` must come from the
 * product record looked up server-side — never trust a client-supplied
 * price. `quantity` may be fractional (e.g. 1.5 kg of produce); the line
 * subtotal rounds to the nearest cent, matching what prints on a receipt.
 */
function priceLine(unitPriceCents, quantity, taxRate) {
  const subtotalCents = Math.round(unitPriceCents * quantity);
  const taxCents = Math.round(subtotalCents * taxRate);
  return { subtotalCents, taxCents, totalCents: subtotalCents + taxCents };
}

/** Sums priced lines and applies a whole-sale discount (in cents, >= 0) to reach the final total. */
function priceSale(lines, discountCents = 0) {
  const subtotalCents = lines.reduce((sum, l) => sum + l.subtotalCents, 0);
  const taxCents = lines.reduce((sum, l) => sum + l.taxCents, 0);
  const totalCents = Math.max(0, subtotalCents + taxCents - discountCents);
  return { subtotalCents, taxCents, discountCents, totalCents };
}

/** Returns null (rather than throwing) when the customer hasn't tendered enough — the caller decides how to react. */
function computeChange(totalCents, tenderedCents) {
  const changeCents = tenderedCents - totalCents;
  return changeCents >= 0 ? changeCents : null;
}

module.exports = { toCents, fromCents, priceLine, priceSale, computeChange };
