// Kept identical to frontend/src/utils/format.js so numbers read the same
// way on the phone as they do on the web admin console.

export function formatMoney(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(amount) || 0);
}

export function formatDate(dateInput) {
  return new Date(dateInput).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(dateInput) {
  return new Date(dateInput).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatQuantity(qty, unit) {
  const n = Number(qty);
  const isFractionalUnit = unit === 'kg' || unit === 'lb';
  return isFractionalUnit ? n.toFixed(n % 1 === 0 ? 0 : 2) : String(Math.round(n));
}
