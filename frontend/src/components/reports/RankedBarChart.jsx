import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { SEQUENTIAL_BLUE, INK } from '../../utils/chartColors';
import { formatMoney } from '../../utils/format';

/**
 * Ranking N things by one measure (revenue) is a magnitude comparison, not
 * an identity story — so it gets the sequential single hue, not a rainbow
 * of categorical colors per bar (see dataviz skill: "categorical is for
 * when the series ARE the subject").
 */
export default function RankedBarChart({ title, data, nameKey, valueKey, formatValue = formatMoney }) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">{title}</h3>
        <p className="py-8 text-center text-sm text-gray-400">No data for this range.</p>
      </div>
    );
  }

  const height = Math.max(140, data.length * 36 + 24);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 48, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={INK.grid} horizontal={false} />
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey={nameKey}
            width={140}
            tick={{ fontSize: 12, fill: INK.secondary }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value) => [formatValue(value), title]}
            contentStyle={{ borderRadius: 8, border: '1px solid #e1e0d9', fontSize: 13 }}
            cursor={{ fill: 'rgba(11,11,11,0.03)' }}
          />
          <Bar dataKey={valueKey} fill={SEQUENTIAL_BLUE} radius={[0, 4, 4, 0]} maxBarSize={22}>
            <LabelList
              dataKey={valueKey}
              position="right"
              formatter={formatValue}
              style={{ fill: INK.secondary, fontSize: 12 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
