import { useEffect, useState } from 'react';
import api, { getErrorMessage } from '../api/client';

export default function SettingsPage() {
  const [form, setForm] = useState(null);
  const [taxPercent, setTaxPercent] = useState(0);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/settings').then(({ data }) => {
      setForm(data);
      setTaxPercent(Number(data.defaultTaxRate) * 100);
    });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaved(false);
    setSaving(true);
    try {
      const { data } = await api.patch('/settings', {
        storeName: form.storeName,
        address: form.address || null,
        phone: form.phone || null,
        currency: form.currency,
        defaultTaxRate: Number(taxPercent) / 100,
        receiptFooter: form.receiptFooter || null,
      });
      setForm(data);
      setSaved(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (!form) return <div className="text-gray-400">Loading…</div>;

  return (
    <div className="max-w-lg">
      <h1 className="mb-4 text-xl font-bold text-gray-900">Store settings</h1>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
        <label className="block text-sm text-gray-700">
          Store name
          <input
            value={form.storeName}
            onChange={(e) => setForm({ ...form, storeName: e.target.value })}
            className={inputCls}
          />
        </label>
        <label className="block text-sm text-gray-700">
          Address
          <input value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputCls} />
        </label>
        <label className="block text-sm text-gray-700">
          Phone
          <input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="block text-sm text-gray-700">
            Currency code
            <input
              value={form.currency}
              maxLength={3}
              onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
              className={inputCls}
            />
          </label>
          <label className="block text-sm text-gray-700">
            Default tax rate (%)
            <input
              type="number"
              step="0.01"
              min="0"
              value={taxPercent}
              onChange={(e) => setTaxPercent(e.target.value)}
              className={inputCls}
            />
          </label>
        </div>
        <p className="text-xs text-gray-400">
          The default tax rate is a starting point for new products only — each product's own tax rate is what's
          actually charged at checkout.
        </p>
        <label className="block text-sm text-gray-700">
          Receipt footer message
          <input
            value={form.receiptFooter || ''}
            onChange={(e) => setForm({ ...form, receiptFooter: e.target.value })}
            className={inputCls}
          />
        </label>

        {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        {saved && <div className="rounded-md bg-brand-50 px-3 py-2 text-sm text-brand-700">Settings saved.</div>}

        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </form>
    </div>
  );
}

const inputCls =
  'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500';
