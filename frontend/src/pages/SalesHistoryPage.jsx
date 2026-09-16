import { useCallback, useEffect, useState } from 'react';
import api, { getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatMoney, formatDateTime } from '../utils/format';
import Modal from '../components/Modal';

const STATUS_STYLES = {
  COMPLETED: 'bg-brand-100 text-brand-700',
  VOIDED: 'bg-gray-200 text-gray-600',
  REFUNDED: 'bg-amber-100 text-amber-700',
};

export default function SalesHistoryPage() {
  const { hasRole } = useAuth();
  const canVoid = hasRole('ADMIN', 'MANAGER');

  const [sales, setSales] = useState([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { pageSize: 50 };
      if (from) params.from = new Date(`${from}T00:00:00`).toISOString();
      if (to) params.to = new Date(`${to}T23:59:59`).toISOString();
      const { data } = await api.get('/sales', { params });
      setSales(data.items);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-gray-900">Sales history</h1>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="text-sm text-gray-600">
          From
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 block rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </label>
        <label className="text-sm text-gray-600">
          To
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 block rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </label>
        {(from || to) && (
          <button
            type="button"
            onClick={() => {
              setFrom('');
              setTo('');
            }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Clear
          </button>
        )}
      </div>

      {error && <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Receipt #</th>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Cashier</th>
              <th className="px-4 py-2">Payment</th>
              <th className="px-4 py-2 text-right">Total</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && sales.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                  No sales in this range.
                </td>
              </tr>
            )}
            {sales.map((sale) => (
              <tr key={sale.id}>
                <td className="px-4 py-2 font-medium text-gray-900">#{sale.saleNumber}</td>
                <td className="px-4 py-2 text-gray-600">{formatDateTime(sale.createdAt)}</td>
                <td className="px-4 py-2 text-gray-600">{sale.cashier?.name}</td>
                <td className="px-4 py-2 text-gray-600">{sale.paymentMethod}</td>
                <td className="px-4 py-2 text-right font-medium text-gray-900">{formatMoney(sale.total)}</td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[sale.status]}`}>
                    {sale.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => setSelectedSale(sale)}
                    className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedSale && (
        <SaleDetailModal
          saleId={selectedSale.id}
          canVoid={canVoid}
          onClose={() => setSelectedSale(null)}
          onVoided={() => {
            setSelectedSale(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function SaleDetailModal({ saleId, canVoid, onClose, onVoided }) {
  const [sale, setSale] = useState(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [voiding, setVoiding] = useState(false);

  useEffect(() => {
    api.get(`/sales/${saleId}`).then(({ data }) => setSale(data));
  }, [saleId]);

  async function handleVoid() {
    if (!reason.trim()) {
      setError('A reason is required to void a sale.');
      return;
    }
    setVoiding(true);
    setError('');
    try {
      await api.post(`/sales/${saleId}/void`, { reason: reason.trim() });
      onVoided();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setVoiding(false);
    }
  }

  return (
    <Modal title={sale ? `Receipt #${sale.saleNumber}` : 'Loading…'} onClose={onClose}>
      {!sale && <div className="text-gray-400">Loading…</div>}
      {sale && (
        <div className="space-y-3 text-sm">
          <div className="text-gray-500">
            {formatDateTime(sale.createdAt)} · {sale.cashier?.name} · {sale.paymentMethod}
          </div>
          <ul className="divide-y divide-gray-100 rounded-md border border-gray-200">
            {sale.items.map((item) => (
              <li key={item.id} className="flex justify-between px-3 py-2">
                <span>
                  {item.productName} × {item.quantity}
                </span>
                <span>{formatMoney(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between font-semibold text-gray-900">
            <span>Total</span>
            <span>{formatMoney(sale.total)}</span>
          </div>

          {sale.status === 'VOIDED' && (
            <div className="rounded-md bg-gray-100 px-3 py-2 text-gray-600">Voided: {sale.voidReason}</div>
          )}

          {canVoid && sale.status === 'COMPLETED' && (
            <div className="border-t border-gray-200 pt-3">
              <label className="block text-sm text-gray-700">
                Void reason
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="e.g. entered by mistake"
                />
              </label>
              {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
              <button
                type="button"
                onClick={handleVoid}
                disabled={voiding}
                className="mt-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {voiding ? 'Voiding…' : 'Void this sale'}
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
