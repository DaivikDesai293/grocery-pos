import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api, { getErrorMessage } from '../api/client';
import { formatMoney } from '../utils/format';
import { INK } from '../utils/chartColors';
import StatCard from '../components/StatCard';
import TrendBars from '../components/TrendBars';
import { useAuth } from '../context/AuthContext';

export default function DashboardScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // /dashboard is one combined payload (today/yesterday/this week/last week/
  // 30-day trend/reorder preview) — a single round trip instead of six,
  // which matters more on a phone's network than on the web admin console.
  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/dashboard');
      setOverview(data);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const weekDelta =
    overview && Number(overview.lastWeek.revenue) > 0
      ? ((Number(overview.thisWeek.revenue) - Number(overview.lastWeek.revenue)) / Number(overview.lastWeek.revenue)) * 100
      : null;

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
    >
      <Text style={styles.greeting}>Hi {user?.name?.split(' ')[0] || 'there'} 👋</Text>
      <Text style={styles.title}>Today at a glance</Text>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {!overview ? (
        <Text style={styles.loading}>Loading…</Text>
      ) : (
        <>
          <View style={styles.grid}>
            <StatCard label="Today" value={formatMoney(overview.today.revenue)} sublabel={`${overview.today.saleCount} sales`} />
            <StatCard
              label="Yesterday"
              value={formatMoney(overview.yesterday.revenue)}
              sublabel={`${overview.yesterday.saleCount} sales`}
            />
            <StatCard
              label="This week"
              value={formatMoney(overview.thisWeek.revenue)}
              sublabel={`${overview.thisWeek.saleCount} sales`}
              delta={weekDelta}
            />
            <StatCard
              label="Last week"
              value={formatMoney(overview.lastWeek.revenue)}
              sublabel={`${overview.lastWeek.saleCount} sales`}
            />
          </View>

          <Text style={styles.sectionTitle}>Last 30 days</Text>
          <TrendBars data={overview.trend} />

          <Pressable style={styles.alertCard} onPress={() => navigation.navigate('Reorder')}>
            <View style={styles.alertIconWrap}>
              <Text style={styles.alertIcon}>{overview.lowStockCount > 0 ? '⚠️' : '✅'}</Text>
            </View>
            <View style={styles.alertBody}>
              <Text style={styles.alertTitle}>
                {overview.lowStockCount > 0
                  ? `${overview.lowStockCount} product${overview.lowStockCount === 1 ? '' : 's'} need${
                      overview.lowStockCount === 1 ? 's' : ''
                    } reordering`
                  : 'Everything is well stocked'}
              </Text>
              <Text style={styles.alertSubtitle}>
                {overview.lowStockCount > 0 ? 'Tap to see what to order →' : 'No action needed right now'}
              </Text>
            </View>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 32 },
  greeting: { fontSize: 14, color: INK.muted },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginTop: 2, marginBottom: 16 },
  loading: { color: INK.muted, fontSize: 14, marginTop: 24, textAlign: 'center' },
  errorBox: { backgroundColor: '#fef2f2', borderRadius: 8, padding: 12, marginBottom: 16 },
  errorText: { color: '#b91c1c', fontSize: 13 },
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
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    marginTop: 20,
    gap: 12,
  },
  alertIconWrap: { width: 36, alignItems: 'center' },
  alertIcon: { fontSize: 22 },
  alertBody: { flex: 1 },
  alertTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  alertSubtitle: { fontSize: 12, color: INK.muted, marginTop: 2 },
});
