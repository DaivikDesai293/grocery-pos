const PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This week' },
  { value: 'last_week', label: 'Last week' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_30_days', label: 'Last 30 days' },
];

// A row of preset buttons above the charts it scopes — every chart on the
// page re-renders against the same slice, so the numbers always agree.
export default function DateRangePicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg border border-gray-200 bg-white p-1">
      {PRESETS.map((p) => (
        <button
          key={p.value}
          type="button"
          onClick={() => onChange(p.value)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            value === p.value ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
