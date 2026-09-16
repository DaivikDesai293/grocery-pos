import { useState } from 'react';
import Modal from '../Modal';
import api, { getErrorMessage } from '../../api/client';

const TYPES = [
  { value: 'RECEIVE', label: 'Receive stock (delivery arrived)' },
  { value: 'WASTE', label: 'Waste / spoilage / damage' },
  { value: 'RETURN', label: 'Customer return' },
  { value: 'ADJUSTMENT', label: 'Manual correction (stocktake)' },
];

export default function StockAdjustmentModal({ product, onClose, onSaved }) {
  const [type, setType] = useState('RECEIVE');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const isAdjustment = type === 'ADJUSTMENT';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const qty = Number(quantity);
    if (!qty) {
      setError('Enter a non-zero quantity.');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/products/${product.id}/stock-adjustment`, { type, quantity: qty, note: note.trim() || undefined });
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Adjust stock — ${product.name}`} onClose={onClose}>
      <p className="mb-3 text-sm text-gray-500">
        Currently on hand: <span className="font-semibold text-gray-900">{product.quantityOnHand}</span> {product.unit}
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm text-gray-700">
          Reason
          <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-gray-700">
          {isAdjustment ? 'Quantity change (use a negative number to subtract)' : 'Quantity'}
          <input
            type="number"
            step="0.001"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className={inputCls}
            placeholder={isAdjustment ? 'e.g. -3 or 5' : 'e.g. 20'}
          />
        </label>
        <label className="block text-sm text-gray-700">
          Note (optional)
          <input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
        </label>

        {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Apply'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

const inputCls =
  'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500';
