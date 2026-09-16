import { useCallback, useEffect, useState } from 'react';
import api, { getErrorMessage } from '../api/client';
import { formatMoney } from '../utils/format';
import ProductFormModal from '../components/products/ProductFormModal';
import StockAdjustmentModal from '../components/products/StockAdjustmentModal';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingProduct, setEditingProduct] = useState(undefined); // undefined = closed, null = create, object = edit
  const [adjustingProduct, setAdjustingProduct] = useState(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/products', {
        params: { search: search || undefined, categoryId: categoryId || undefined, includeInactive, pageSize: 100 },
      });
      setProducts(data.items);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search, categoryId, includeInactive]);

  useEffect(() => {
    const timeout = setTimeout(loadProducts, 200);
    return () => clearTimeout(timeout);
  }, [loadProducts]);

  useEffect(() => {
    api.get('/categories').then(({ data }) => setCategories(data));
    api.get('/suppliers').then(({ data }) => setSuppliers(data));
  }, []);

  function handleSaved() {
    setEditingProduct(undefined);
    setAdjustingProduct(null);
    loadProducts();
  }

  async function handleDelete(product) {
    if (!confirm(`Delete "${product.name}"? This only works if it has no sales history yet.`)) return;
    try {
      await api.delete(`/products/${product.id}`);
      loadProducts();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900">Products</h1>
        <button
          type="button"
          onClick={() => setEditingProduct(null)}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          + Add product
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, SKU, or barcode…"
          className="w-64 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} />
          Show inactive
        </label>
      </div>

      {error && <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2 text-right">Price</th>
              <th className="px-4 py-2 text-right">On hand</th>
              <th className="px-4 py-2 text-right">Threshold</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && products.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  No products found.
                </td>
              </tr>
            )}
            {products.map((product) => {
              const isLow = Number(product.quantityOnHand) <= Number(product.reorderThreshold);
              return (
                <tr key={product.id} className={!product.active ? 'opacity-50' : ''}>
                  <td className="px-4 py-2">
                    <div className="font-medium text-gray-900">{product.name}</div>
                    <div className="text-xs text-gray-500">
                      {product.sku} {product.barcode ? `· ${product.barcode}` : ''}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-gray-600">{product.category?.name || '—'}</td>
                  <td className="px-4 py-2 text-right">{formatMoney(product.sellPrice)}</td>
                  <td className={`px-4 py-2 text-right font-medium ${isLow ? 'text-amber-600' : 'text-gray-900'}`}>
                    {product.quantityOnHand} {product.unit}
                    {isLow && ' ⚠'}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-500">{product.reorderThreshold}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setAdjustingProduct(product)}
                        className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
                      >
                        Adjust stock
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingProduct(product)}
                        className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(product)}
                        className="rounded border border-gray-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editingProduct !== undefined && (
        <ProductFormModal
          product={editingProduct}
          categories={categories}
          suppliers={suppliers}
          onClose={() => setEditingProduct(undefined)}
          onSaved={handleSaved}
        />
      )}
      {adjustingProduct && (
        <StockAdjustmentModal product={adjustingProduct} onClose={() => setAdjustingProduct(null)} onSaved={handleSaved} />
      )}
    </div>
  );
}
