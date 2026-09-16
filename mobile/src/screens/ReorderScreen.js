import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api, { getErrorMessage } from '../api/client';
import { STATUS, INK } from '../utils/chartColors';

export default function ReorderScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/reports/reorder');
      setItems(data);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <View style={[styles.flex, { paddingTop: insets.top + 12 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>What to order</Text>
        <Text style={styles.subtitle}>
          {items.length === 0
            ? 'Nothing needed right now'
            : `${items.length} product${items.length === 1 ? '' : 's'} at or below threshold`}
        </Text>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <Text style={styles.loading}>Loading…</Text>
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🎉</Text>
          <Text style={styles.emptyText}>Every product is above its reorder threshold.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.productId}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
          renderItem={({ item }) => <ReorderCard item={item} />}
        />
      )}
    </View>
  );
}

// Status color is never the only signal — every card pairs the dot with a
// text label ("Out of stock" / "Low stock"), same rule the web ReorderTable
// follows.
function ReorderCard({ item }) {
  const isOut = Number(item.quantityOnHand) <= 0;
  const color = isOut ? STATUS.critical : STATUS.warning;
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardTitleWrap}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardSku}>{item.sku}</Text>
        </View>
        <View style={styles.statusWrap}>
          <View style={[styles.statusDot, { backgroundColor: color }]} />
          <Text style={[styles.statusText, { color }]}>{isOut ? 'Out of stock' : 'Low stock'}</Text>
        </View>
      </View>
      <View style={styles.cardStats}>
        <Stat label="On hand" value={`${item.quantityOnHand} ${item.unit}`} />
        <Stat label="Threshold" value={String(item.reorderThreshold)} />
        <Stat label="Suggested order" value={`${item.suggestedQuantity} ${item.unit}`} emphasize />
      </View>
      <Text style={styles.reason}>{item.reason}</Text>
    </View>
  );
}

function Stat({ label, value, emphasize }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, emphasize && styles.statValueEmphasis]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f9fafb' },
  header: { paddingHorizontal: 16, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 13, color: INK.muted, marginTop: 2 },
  loading: { color: INK.muted, fontSize: 14, marginTop: 24, textAlign: 'center' },
  errorBox: { backgroundColor: '#fef2f2', borderRadius: 8, padding: 12, marginHorizontal: 16, marginBottom: 12 },
  errorText: { color: '#b91c1c', fontSize: 13 },
  empty: { alignItems: 'center', marginTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyText: { color: INK.muted, fontSize: 14, textAlign: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 14 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitleWrap: { flex: 1, paddingRight: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  cardSku: { fontSize: 11, color: INK.muted, marginTop: 1 },
  statusWrap: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardStats: { flexDirection: 'row', marginTop: 12, gap: 16 },
  stat: {},
  statLabel: { fontSize: 10, color: INK.muted, textTransform: 'uppercase', letterSpacing: 0.3 },
  statValue: { fontSize: 13, fontWeight: '600', color: '#111827', marginTop: 2 },
  statValueEmphasis: { color: '#16a34a', fontWeight: '700' },
  reason: { fontSize: 11, color: INK.muted, marginTop: 10, fontStyle: 'italic' },
});
