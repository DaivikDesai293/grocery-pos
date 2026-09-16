import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api, { getErrorMessage } from '../api/client';
import { formatMoney } from '../utils/format';
import { INK } from '../utils/chartColors';
import RangePicker from '../components/RangePicker';
import StatCard from '../components/StatCard';
import TrendBars from '../components/TrendBars';
import BarRanking from '../components/BarRanking';

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const [preset, setPreset] = useState('this_week');
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [byCategory, setByCategory] = useState([]);
  const [byCashier, setByCashier] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (p) => {
    try {
      const [summaryRes, trendRes, topRes, categoryRes, cashierRes] = await Promise.all([
        api.get('/reports/summary', { params: { preset: p } }),
        api.get('/reports/trend', { params: { preset: p } }),
        api.get('/reports/top-products', { params: { preset: p, limit: 6 } }),
        api.get('/reports/by-category', { params: { preset: p } }),
        api.get('/reports/by-cashier', { params: { preset: p } }),
      ]);
      setSummary(summaryRes.data);
      setTrend(trendRes.data.days);
      setTopProducts(topRes.data);
      setByCategory(categoryRes.data);
      setByCashier(cashierRes.data);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load(preset).finally(() => setLoading(false));
  }, [preset, load]);

  async function onRefresh() {
    setRefreshing(true);
    await load(preset);
    setRefreshing(false);
  }

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
    >
      <Text style={styles.title}>Reports</Text>
      <RangePicker value={preset} onChange={setPreset} />

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {loading || !summary ? (
        <Text style={styles.loading}>Loading…</Text>
      ) : (
        <View style={styles.body}>
          <View style={styles.grid}>
            <StatCard label="Revenue" value={formatMoney(summary.revenue)} sublabel={`${summary.saleCount} sales`} />
            <StatCard label="Avg basket" value={formatMoney(summary.averageBasket)} />
            <StatCard label="Discounts" value={formatMoney(summary.discount)} />
            <StatCard label="Tax collected" value={formatMoney(summary.tax)} />
          </View>

          <Text style={styles.sectionTitle}>Revenue trend</Text>
          <TrendBars data={trend} />

          <Text style={styles.sectionTitle}>Top products</Text>
          <BarRanking title="By revenue" data={topProducts} nameKey="productName" valueKey="revenue" />

          <Text style={styles.sectionTitle}>By category</Text>
          <BarRanking title="Revenue by category" data={byCategory} nameKey="name" valueKey="revenue" />

          <Text style={styles.sectionTitle}>By cashier</Text>
          <BarRanking title="Revenue by cashier" data={byCashier} nameKey="cashierName" valueKey="revenue" />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 12 },
  loading: { color: INK.muted, fontSize: 14, marginTop: 24, textAlign: 'center' },
  errorBox: { backgroundColor: '#fef2f2', borderRadius: 8, padding: 12, marginTop: 12 },
  errorText: { color: '#b91c1c', fontSize: 13 },
  body: { marginTop: 16, gap: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: INK.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 20,
    marginBottom: 10,
  },
});
