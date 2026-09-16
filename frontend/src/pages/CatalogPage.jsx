import { useEffect, useState } from 'react';
import api, { getErrorMessage } from '../api/client';

export default function CatalogPage() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <CategoriesPanel />
      <SuppliersPanel />
    </div>
  );
}

function CategoriesPanel() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  function load() {
    api.get('/categories').then(({ data }) => setCategories(data));
  }
  useEffect(load, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    if (!name.trim()) return;
    try {
      await api.post('/categories', { name: name.trim() });
      setName('');
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleDelete(category) {
    if (!confirm(`Delete category "${category.name}"? Its products will become uncategorized.`)) return;
    try {
      await api.delete(`/categories/${category.id}`);
      load();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-lg font-semibold text-gray-900">Categories</h2>
      <form onSubmit={handleAdd} className="mb-4 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New category name"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
          Add
        </button>
      </form>
      {error && <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <ul className="divide-y divide-gray-100">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center justify-between py-2 text-sm">
            <span>
              {c.name} <span className="text-xs text-gray-400">({c._count?.products ?? 0} products)</span>
            </span>
            <button type="button" onClick={() => handleDelete(c)} className="text-xs text-red-600 hover:underline">
              Delete
            </button>
          </li>
        ))}
        {categories.length === 0 && <li className="py-4 text-center text-sm text-gray-400">No categories yet.</li>}
      </ul>
    </div>
  );
}

function SuppliersPanel() {
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState({ name: '', contactName: '', phone: '', email: '', address: '' });
  const [error, setError] = useState('');

  function load() {
    api.get('/suppliers').then(({ data }) => setSuppliers(data));
  }
  useEffect(load, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) return;
    try {
      await api.post('/suppliers', form);
      setForm({ name: '', contactName: '', phone: '', email: '', address: '' });
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleDelete(supplier) {
    if (!confirm(`Delete supplier "${supplier.name}"? Its products will keep no supplier set.`)) return;
    try {
      await api.delete(`/suppliers/${supplier.id}`);
      load();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-lg font-semibold text-gray-900">Suppliers</h2>
      <form onSubmit={handleAdd} className="mb-4 grid grid-cols-2 gap-2">
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Supplier name"
          className="col-span-2 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          value={form.contactName}
          onChange={(e) => setForm({ ...form, contactName: e.target.value })}
          placeholder="Contact name"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="Phone"
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="Email"
          className="col-span-2 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="col-span-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Add supplier
        </button>
      </form>
      {error && <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <ul className="divide-y divide-gray-100">
        {suppliers.map((s) => (
          <li key={s.id} className="flex items-center justify-between py-2 text-sm">
            <span>
              {s.name}{' '}
              <span className="text-xs text-gray-400">
                ({s._count?.products ?? 0} products{s.phone ? ` · ${s.phone}` : ''})
              </span>
            </span>
            <button type="button" onClick={() => handleDelete(s)} className="text-xs text-red-600 hover:underline">
              Delete
            </button>
          </li>
        ))}
        {suppliers.length === 0 && <li className="py-4 text-center text-sm text-gray-400">No suppliers yet.</li>}
      </ul>
    </div>
  );
}
