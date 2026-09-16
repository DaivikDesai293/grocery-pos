import { useCallback, useEffect, useState } from 'react';
import api, { getErrorMessage } from '../api/client';
import { formatMoney } from '../utils/format';
import StatTile from '../components/reports/StatTile';
import DateRangePicker from '../components/reports/DateRangePicker';
import TrendChart from '../components/reports/TrendChart';
import RankedBarChart from '../components/reports/RankedBarChart';
import ReorderTable from '../components/reports/ReorderTable';

export default function ReportsPage() {
  const [overview, setOverview] = useState(null);
  const [rangePreset, setRangePreset] = useState('this_week');
  const [rangeData, setRangeData] = useState({ trend: [], topProducts: [], byCategory: [] });
  const [reorderItems, setReorderItems] = useState([]);
  const [error, setError] = useState('');
  const [loadingRange, setLoadingRange] = useState(true);

  useEffect(() => {
    api
      .get('/dashboard')
      .then(({ data }) => setOverview(data))
      .catch((err) => setError(getErrorMessage(err)));
    api
      .get('/reports/reorder')
      .then(({ data }) => setReorderItems(data))
      .catch(() => {});
  }, []);

  const loadRange = useCallback(async (preset) => {
    setLoadingRange(true);
    try {
      const [trendRes, topRes, categoryRes] = await Promise.all([
        api.get('/reports/trend', { params: { preset } }),
        api.get('/reports/top-products', { params: { preset, limit: 8 } }),
        api.get('/reports/by-category', { params: { preset } }),
      ]);
      setRangeData({ trend: trendRes.data.days, topProducts: topRes.data, byCategory: categoryRes.data });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingRange(false);
    }
  }, []);

  useEffect(() => {
    loadRange(rangePreset);
  }, [rangePreset, loadRange]);

  if (error) {
    return <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>;
  }
  if (!overview) {
    return <div className="text-gray-400">Loading…</div>;
  }

  const weekDelta =
    Number(overview.lastWeek.revenue) > 0
      ? ((Number(overview.thisWeek.revenue) - Number(overview.lastWeek.revenue)) / Number(overview.lastWeek.revenue)) * 100
      : null;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Reports</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Today" value={formatMoney(overview.today.revenue)} sublabel={`${overview.today.saleCount} sales`} />
        <StatTile
          label="Yesterday"
          value={formatMoney(overview.yesterday.revenue)}
          sublabel={`${overview.yesterday.saleCount} sales`}
        />
        <StatTile
          label="This week"
          value={formatMoney(overview.thisWeek.revenue)}
          sublabel={`${overview.thisWeek.saleCount} sales`}
          delta={weekDelta}
        />
        <StatTile
          label="Last week"
          value={formatMoney(overview.lastWeek.revenue)}
          sublabel={`${overview.lastWeek.saleCount} sales`}
        />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Sales detail</h2>
          <DateRangePicker value={rangePreset} onChange={setRangePreset} />
        </div>
        <div className={`space-y-4 transition-opacity ${loadingRange ? 'opacity-50' : 'opacity-100'}`}>
          <TrendChart data={rangeData.trend} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RankedBarChart title="Top products by revenue" data={rangeData.topProducts} nameKey="productName" valueKey="revenue" />
            <RankedBarChart title="Revenue by category" data={rangeData.byCategory} nameKey="name" valueKey="revenue" />
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
          What to order ({reorderItems.length})
        </h2>
        <ReorderTable items={reorderItems} />
      </div>
    </div>
  );
}
