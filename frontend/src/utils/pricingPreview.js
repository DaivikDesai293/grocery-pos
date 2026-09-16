// Client-side price preview ONLY — purely for a responsive cart UI. The
// backend recomputes every total from the product catalog at checkout time
// (see backend/src/utils/money.js) and that server-side number is always
// the one actually charged; this just avoids a network round trip on every
// keystroke while the cashier is building the cart.

export function previewLine(unitPrice, quantity, taxRate) {
  const subtotal = Number(unitPrice) * Number(quantity);
  const tax = subtotal * Number(taxRate);
  return { subtotal, tax, total: subtotal + tax };
}

export function previewCartTotals(lines, discount = 0) {
  const subtotal = lines.reduce((sum, l) => sum + l.subtotal, 0);
  const tax = lines.reduce((sum, l) => sum + l.tax, 0);
  const total = Math.max(0, subtotal + tax - Number(discount || 0));
  return { subtotal, tax, discount: Number(discount || 0), total };
}
