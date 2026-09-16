import { View, Text, StyleSheet } from 'react-native';
import { SEQUENTIAL_BLUE, INK } from '../utils/chartColors';
import { formatMoney } from '../utils/format';

// Mirrors the web app's components/reports/RankedBarChart.jsx. Ranking N
// things by one measure (revenue) is a magnitude comparison, not an
// identity story, so it's a single sequential hue — not one categorical
// color per row (dataviz: "categorical is for when the series ARE the
// subject"). Built as label-above/bar-below progress rows instead of an SVG
// chart, since there's no charting library in this project.
export default function BarRanking({ title, data, nameKey, valueKey, formatValue = formatMoney }) {
  if (!data || data.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.empty}>No data for this range.</Text>
      </View>
    );
  }

  const max = Math.max(...data.map((d) => Number(d[valueKey])), 0);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {data.map((row, i) => {
        const value = Number(row[valueKey]);
        const width = max > 0 ? Math.max((value / max) * 100, 3) : 0;
        return (
          <View key={`${row[nameKey]}-${i}`} style={styles.row}>
            <Text style={styles.name} numberOfLines={1}>
              {row[nameKey]}
            </Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${width}%` }]} />
            </View>
            <Text style={styles.value}>{formatValue(value)}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', padding: 14 },
  title: { fontSize: 13, fontWeight: '700', color: INK.secondary, marginBottom: 12 },
  row: { marginBottom: 10 },
  name: { fontSize: 12, color: '#111827', marginBottom: 3 },
  track: { height: 8, backgroundColor: '#f0f0ec', borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: SEQUENTIAL_BLUE, borderRadius: 4 },
  value: { fontSize: 11, color: INK.muted, marginTop: 3, textAlign: 'right' },
  empty: { fontSize: 13, color: INK.muted, textAlign: 'center', paddingVertical: 16 },
});
