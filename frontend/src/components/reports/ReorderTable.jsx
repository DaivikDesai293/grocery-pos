import { STATUS } from '../../utils/chartColors';

// Status color is never the only signal — every row pairs the dot with a
// text label ("Out of stock" / "Low stock"), per the dataviz status-palette rule.
export default function ReorderTable({ items }) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
        Nothing needs reordering right now — every product is above its threshold. 🎉
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500">
          <tr>
            <th className="px-4 py-2">Product</th>
            <th className="px-4 py-2 text-right">On hand</th>
            <th className="px-4 py-2 text-right">Threshold</th>
            <th className="px-4 py-2 text-right">Suggested order</th>
            <th className="px-4 py-2">Why</th>
            <th className="px-4 py-2">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item) => {
            const isOut = Number(item.quantityOnHand) <= 0;
            const color = isOut ? STATUS.critical : STATUS.warning;
            return (
              <tr key={item.productId}>
                <td className="px-4 py-2">
                  <div className="font-medium text-gray-900">{item.name}</div>
                  <div className="text-xs text-gray-500">{item.sku}</div>
                </td>
                <td className="px-4 py-2 text-right">
                  {item.quantityOnHand} {item.unit}
                </td>
                <td className="px-4 py-2 text-right text-gray-500">{item.reorderThreshold}</td>
                <td className="px-4 py-2 text-right font-semibold text-gray-900">
                  {item.suggestedQuantity} {item.unit}
                </td>
                <td className="px-4 py-2 text-xs text-gray-500">{item.reason}</td>
                <td className="px-4 py-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color }}>
                    <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                    {isOut ? 'Out of stock' : 'Low stock'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
