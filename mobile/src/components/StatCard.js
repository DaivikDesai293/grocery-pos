import { View, Text, StyleSheet } from 'react-native';
import { STATUS, INK } from '../utils/chartColors';

// Mirrors the web app's components/reports/StatTile.jsx: label + value (+
// optional signed delta vs. a named comparison period). Revenue up is
// always good here, so positive delta = green, negative = red.
export default function StatCard({ label, value, sublabel, delta }) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      <View style={styles.row}>
        {sublabel ? <Text style={styles.sublabel}>{sublabel}</Text> : null}
        {delta != null && (
          <Text style={[styles.delta, { color: delta >= 0 ? STATUS.good : STATUS.critical }]}>
            {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
  },
  label: { fontSize: 12, color: INK.muted },
  value: { fontSize: 20, fontWeight: '700', color: '#111827', marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  sublabel: { fontSize: 11, color: INK.muted },
  delta: { fontSize: 11, fontWeight: '700' },
});
