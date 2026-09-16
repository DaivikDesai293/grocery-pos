import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { SEQUENTIAL_BLUE, SEQUENTIAL_BLUE_FILL, INK } from '../../utils/chartColors';
import { formatMoney } from '../../utils/format';

// A single series (revenue over time) -> sequential, one hue, no legend
// needed (the title already names what's plotted).
export default function TrendChart({ data }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">Revenue trend</h3>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={INK.grid} vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: INK.muted }}
            tickFormatter={(d) => new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            axisLine={{ stroke: INK.axis }}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            tick={{ fontSize: 12, fill: INK.muted }}
            tickFormatter={(v) => `$${v}`}
            axisLine={false}
            tickLine={false}
            width={56}
          />
          <Tooltip
            formatter={(value) => [formatMoney(value), 'Revenue']}
            labelFormatter={(d) =>
              new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
            }
            contentStyle={{ borderRadius: 8, border: '1px solid #e1e0d9', fontSize: 13 }}
          />
          <Area type="monotone" dataKey="revenue" stroke={SEQUENTIAL_BLUE} strokeWidth={2} fill={SEQUENTIAL_BLUE_FILL} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
