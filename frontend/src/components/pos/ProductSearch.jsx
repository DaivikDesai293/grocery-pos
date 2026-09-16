import { useEffect, useRef, useState } from 'react';
import api from '../../api/client';
import { formatMoney } from '../../utils/format';

/**
 * The checkout search/scan box. A USB or Bluetooth barcode scanner behaves
 * like a very fast keyboard: it "types" the barcode digits then an Enter
 * key. So on Enter we try an exact barcode lookup first (the scanner path);
 * if that 404s, we fall back to adding a single unambiguous text-search
 * match, which covers a cashier typing a SKU or code by hand.
 */
export default function ProductSearch({ onAdd }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/products', { params: { search: query.trim(), pageSize: 8 } });
        setResults(data.items);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  function selectProduct(product) {
    setError('');
    if (!product.active) {
      setError(`${product.name} is inactive and can't be sold.`);
      return;
    }
    if (Number(product.quantityOnHand) <= 0) {
      setError(`${product.name} is out of stock.`);
      return;
    }
    onAdd(product);
    setQuery('');
    setResults([]);
    setOpen(false);
    inputRef.current?.focus();
  }

  async function handleKeyDown(e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const code = query.trim();
    if (!code) return;
    setError('');
    try {
      const { data } = await api.get(`/products/barcode/${encodeURIComponent(code)}`);
      selectProduct(data);
      return;
    } catch {
      // Not an exact barcode match — fall through to the text-search results.
    }
    if (results.length === 1) {
      selectProduct(results[0]);
    } else if (results.length > 1) {
      setOpen(true);
    } else {
      setError(`No product found for "${code}".`);
    }
  }

  return (
    <div className="relative">
      <label htmlFor="pos-search" className="sr-only">
        Scan barcode or search products
      </label>
      <input
        id="pos-search"
        ref={inputRef}
        type="text"
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Scan a barcode, or search by name / SKU…"
        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
      />

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}

      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-80 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {results.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                onClick={() => selectProduct(product)}
                className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm hover:bg-brand-50"
              >
                <span>
                  <span className="font-medium text-gray-900">{product.name}</span>
                  <span className="ml-2 text-xs text-gray-500">{product.sku}</span>
                  {Number(product.quantityOnHand) <= 0 && (
                    <span className="ml-2 text-xs font-semibold text-red-600">OUT OF STOCK</span>
                  )}
                </span>
                <span className="whitespace-nowrap text-gray-700">{formatMoney(product.sellPrice)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {loading && <div className="absolute right-3 top-3 text-xs text-gray-400">Searching…</div>}
    </div>
  );
}
