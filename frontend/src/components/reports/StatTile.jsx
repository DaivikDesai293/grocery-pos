import { STATUS } from '../../utils/chartColors';

/**
 * label + value (+ optional signed delta vs a named comparison period).
 * Per the dataviz stat-tile contract: value in semibold proportional
 * figures, delta colored by direction × whether up is good (revenue up is
 * always good here, so positive = green, negative = red).
 */
export default function StatTile({ label, value, sublabel, delta }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-gray-900">{value}</div>
      <div className="mt-1 flex items-center gap-2 text-xs">
        {sublabel && <span className="text-gray-400">{sublabel}</span>}
        {delta != null && (
          <span className="font-medium" style={{ color: delta >= 0 ? STATUS.good : STATUS.critical }}>
            {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}% vs last week
          </span>
        )}
      </div>
    </div>
  );
}
