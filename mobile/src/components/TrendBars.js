import { View, Text, StyleSheet } from 'react-native';
import { SEQUENTIAL_BLUE, INK } from '../utils/chartColors';
import { formatMoney } from '../utils/format';

const CHART_HEIGHT = 120;

// Hand-built daily-revenue bar sparkline (no charting library). Single
// series -> one sequential hue, no legend needed (dataviz: "a single series
// needs no legend box — the title names it"). Only the peak day gets a
// direct label, per "selective direct labels, never a number on every
// point" — everything else is read from bar height alone.
export default function TrendBars({ data }) {
  if (!data || data.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No sales yet in this range.</Text>
      </View>
    );
  }

  const max = Math.max(...data.map((d) => Number(d.revenue)), 0);
  const peakIndex = data.reduce((best, d, i) => (Number(d.revenue) > Number(data[best].revenue) ? i : best), 0);

  return (
    <View style={styles.card}>
      <View style={styles.chart}>
        {data.map((d, i) => {
          const height = max > 0 ? Math.max((Number(d.revenue) / max) * CHART_HEIGHT, Number(d.revenue) > 0 ? 3 : 1) : 1;
          const isPeak = i === peakIndex && max > 0;
          return (
            <View key={d.date} style={styles.barColumn}>
              {isPeak && (
                <Text style={styles.peakLabel} numberOfLines={1}>
                  {formatMoney(d.revenue)}
                </Text>
              )}
              <View style={[styles.bar, { height, backgroundColor: isPeak ? SEQUENTIAL_BLUE : `${SEQUENTIAL_BLUE}80` }]} />
            </View>
          );
        })}
      </View>
      <View style={styles.axisRow}>
        <Text style={styles.axisLabel}>{shortDate(data[0].date)}</Text>
        <Text style={styles.axisLabel}>{shortDate(data[data.length - 1].date)}</Text>
      </View>
    </View>
  );
}

function shortDate(ymd) {
  const d = new Date(`${ymd}T00:00:00`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 14 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: CHART_HEIGHT + 20, gap: 2 },
  barColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  bar: { width: '100%', borderRadius: 2, minHeight: 1 },
  peakLabel: { fontSize: 9, color: INK.secondary, marginBottom: 2 },
  axisRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  axisLabel: { fontSize: 11, color: INK.muted },
  empty: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 24, alignItems: 'center' },
  emptyText: { color: INK.muted, fontSize: 13 },
});
