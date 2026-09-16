import { useState } from 'react';
import Modal from '../Modal';
import api, { getErrorMessage } from '../../api/client';

const UNITS = ['each', 'kg', 'lb', 'litre'];

/** Shared create/edit form. Stock quantity is only set here on create — editing stock
 * afterward goes through the dedicated stock-adjustment flow so every change is audited. */
export default function ProductFormModal({ product, categories, suppliers, onClose, onSaved }) {
  const isEdit = Boolean(product);
  const [form, setForm] = useState({
    sku: product?.sku || '',
    barcode: product?.barcode || '',
    name: product?.name || '',
    description: product?.description || '',
    unit: product?.unit || 'each',
    costPrice: product?.costPrice ?? '',
    sellPrice: product?.sellPrice ?? '',
    taxRatePercent: product ? Number(product.taxRate) * 100 : 0,
    quantityOnHand: product?.quantityOnHand ?? 0,
    reorderThreshold: product?.reorderThreshold ?? 0,
    reorderQuantity: product?.reorderQuantity ?? 0,
    categoryId: product?.categoryId || '',
    supplierId: product?.supplierId || '',
    active: product?.active ?? true,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    const payload = {
      sku: form.sku.trim(),
      barcode: form.barcode.trim() || null,
      name: form.name.trim(),
      description: form.description.trim() || null,
      unit: form.unit,
      costPrice: Number(form.costPrice),
      sellPrice: Number(form.sellPrice),
      taxRate: Number(form.taxRatePercent) / 100,
      reorderThreshold: Number(form.reorderThreshold),
      reorderQuantity: Number(form.reorderQuantity),
      categoryId: form.categoryId || null,
      supplierId: form.supplierId || null,
    };
    if (!isEdit) payload.quantityOnHand = Number(form.quantityOnHand);
    if (isEdit) payload.active = form.active;

    try {
      if (isEdit) {
        await api.patch(`/products/${product.id}`, payload);
      } else {
        await api.post('/products', payload);
      }
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? `Edit ${product.name}` : 'Add product'} onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="SKU">
          <input required value={form.sku} onChange={(e) => set('sku', e.target.value)} className={inputCls} />
        </Field>
        <Field label="Barcode (optional)">
          <input value={form.barcode} onChange={(e) => set('barcode', e.target.value)} className={inputCls} />
        </Field>
        <Field label="Name" full>
          <input required value={form.name} onChange={(e) => set('name', e.target.value)} className={inputCls} />
        </Field>
        <Field label="Description (optional)" full>
          <input value={form.description} onChange={(e) => set('description', e.target.value)} className={inputCls} />
        </Field>
        <Field label="Unit">
          <select value={form.unit} onChange={(e) => set('unit', e.target.value)} className={inputCls}>
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tax rate (%)">
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.taxRatePercent}
            onChange={(e) => set('taxRatePercent', e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Cost price ($)">
          <input
            required
            type="number"
            step="0.01"
            min="0"
            value={form.costPrice}
            onChange={(e) => set('costPrice', e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Sell price ($)">
          <input
            required
            type="number"
            step="0.01"
            min="0"
            value={form.sellPrice}
            onChange={(e) => set('sellPrice', e.target.value)}
            className={inputCls}
          />
        </Field>
        {!isEdit && (
          <Field label="Starting quantity on hand">
            <input
              type="number"
              step="0.001"
              min="0"
              value={form.quantityOnHand}
              onChange={(e) => set('quantityOnHand', e.target.value)}
              className={inputCls}
            />
          </Field>
        )}
        <Field label="Reorder threshold">
          <input
            type="number"
            step="0.001"
            min="0"
            value={form.reorderThreshold}
            onChange={(e) => set('reorderThreshold', e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Reorder quantity">
          <input
            type="number"
            step="0.001"
            min="0"
            value={form.reorderQuantity}
            onChange={(e) => set('reorderQuantity', e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Category">
          <select value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)} className={inputCls}>
            <option value="">— none —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Supplier">
          <select value={form.supplierId} onChange={(e) => set('supplierId', e.target.value)} className={inputCls}>
            <option value="">— none —</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>

        {isEdit && (
          <label className="flex items-center gap-2 text-sm text-gray-700 sm:col-span-2">
            <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} />
            Active (visible for sale)
          </label>
        )}

        {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">{error}</div>}

        <div className="flex justify-end gap-2 sm:col-span-2">
          <button type="button" onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save product'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

const inputCls =
  'mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500';

function Field({ label, children, full }) {
  return (
    <label className={`block text-sm text-gray-700 ${full ? 'sm:col-span-2' : ''}`}>
      {label}
      {children}
    </label>
  );
}
