import { useEffect, useState } from 'react';
import api, { getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import ProductSearch from '../components/pos/ProductSearch';
import Cart from '../components/pos/Cart';
import Receipt from '../components/pos/Receipt';
import { formatMoney } from '../utils/format';
import { previewLine, previewCartTotals } from '../utils/pricingPreview';

export default function POSPage() {
  const { hasRole } = useAuth();
  const canDiscount = hasRole('ADMIN', 'MANAGER');

  const [cartLines, setCartLines] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [amountTendered, setAmountTendered] = useState('');
  const [discountInput, setDiscountInput] = useState('0');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);
  const [storeSettings, setStoreSettings] = useState(null);

  useEffect(() => {
    api
      .get('/settings')
      .then(({ data }) => setStoreSettings(data))
      .catch(() => {});
  }, []);

  function addToCart(product) {
    setError('');
    setCartLines((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        const step = product.unit === 'kg' || product.unit === 'lb' ? 0.1 : 1;
        return prev.map((l) =>
          l.product.id === product.id ? { ...l, quantity: round(l.quantity + step) } : l
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  function updateQuantity(productId, quantity) {
    setCartLines((prev) => prev.map((l) => (l.product.id === productId ? { ...l, quantity: round(quantity) } : l)));
  }

  function removeFromCart(productId) {
    setCartLines((prev) => prev.filter((l) => l.product.id !== productId));
  }

  const previewedLines = cartLines.map((l) => ({
    ...l,
    ...previewLine(l.product.sellPrice, l.quantity, l.product.taxRate),
  }));
  const discountAmount = canDiscount ? Number(discountInput) || 0 : 0;
  const totals = previewCartTotals(previewedLines, discountAmount);
  const tenderedNumber = Number(amountTendered) || 0;
  const changeDue = paymentMethod === 'CASH' ? tenderedNumber - totals.total : 0;

  function resetForNewSale() {
    setCartLines([]);
    setAmountTendered('');
    setDiscountInput('0');
    setPaymentMethod('CASH');
    setCompletedSale(null);
    setError('');
  }

  async function handleCompleteSale() {
    setError('');
    if (cartLines.length === 0) {
      setError('Add at least one item before completing the sale.');
      return;
    }
    if (paymentMethod === 'CASH' && tenderedNumber < totals.total) {
      setError('Amount tendered is less than the total due.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        items: cartLines.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
        paymentMethod,
        discountCents: Math.round(discountAmount * 100),
        ...(paymentMethod === 'CASH' ? { amountTendered: tenderedNumber } : {}),
      };
      const { data } = await api.post('/sales', payload);
      setCompletedSale(data);
    } catch (err) {
      const details = err?.response?.data?.error?.details;
      if (details?.insufficientStock) {
        const names = details.insufficientStock.map((i) => `${i.name} (have ${i.available}, need ${i.requested})`);
        setError(`Not enough stock: ${names.join(', ')}`);
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (completedSale) {
    return <Receipt sale={completedSale} storeSettings={storeSettings} onNewSale={resetForNewSale} />;
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <ProductSearch onAdd={addToCart} />
        <div className="mt-4">
          <Cart lines={cartLines} onQuantityChange={updateQuantity} onRemove={removeFromCart} />
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Payment</h2>

        <div className="space-y-1 text-sm">
          <Row label="Subtotal" value={formatMoney(totals.subtotal)} />
          <Row label="Tax" value={formatMoney(totals.tax)} />
          {canDiscount && (
            <div className="flex items-center justify-between gap-2 py-1">
              <label htmlFor="discount" className="text-gray-600">
                Discount ($)
              </label>
              <input
                id="discount"
                type="number"
                min="0"
                step="0.01"
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                className="w-24 rounded border border-gray-300 px-2 py-1 text-right text-sm"
              />
            </div>
          )}
          <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-bold text-gray-900">
            <span>Total</span>
            <span>{formatMoney(totals.total)}</span>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex gap-2">
            {['CASH', 'CARD'].map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setPaymentMethod(method)}
                className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium ${
                  paymentMethod === method
                    ? 'border-brand-600 bg-brand-50 text-brand-700'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {method === 'CASH' ? '💵 Cash' : '💳 Card'}
              </button>
            ))}
          </div>

          {paymentMethod === 'CASH' && (
            <div className="mt-3">
              <label htmlFor="tendered" className="block text-sm text-gray-600">
                Amount tendered
              </label>
              <input
                id="tendered"
                type="number"
                min="0"
                step="0.01"
                value={amountTendered}
                onChange={(e) => setAmountTendered(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-lg"
                placeholder="0.00"
              />
              <div className={`mt-1 text-sm ${changeDue < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                Change due: {formatMoney(Math.max(changeDue, 0))}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleCompleteSale}
          disabled={submitting || cartLines.length === 0}
          className="mt-4 w-full rounded-md bg-brand-600 px-4 py-3 text-base font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Processing…' : `Complete Sale — ${formatMoney(totals.total)}`}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between py-1 text-gray-600">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function round(n) {
  return Math.round(n * 1000) / 1000;
}
