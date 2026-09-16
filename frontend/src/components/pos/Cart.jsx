import { formatMoney } from '../../utils/format';
import { previewLine } from '../../utils/pricingPreview';

export default function Cart({ lines, onQuantityChange, onRemove }) {
  if (lines.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-gray-300 text-gray-400">
        Cart is empty — scan or search for a product to begin
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
      {lines.map(({ product, quantity }) => {
        const { total } = previewLine(product.sellPrice, quantity, product.taxRate);
        const isWeighed = product.unit === 'kg' || product.unit === 'lb';
        const step = isWeighed ? 0.1 : 1;

        return (
          <div key={product.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium text-gray-900">{product.name}</div>
              <div className="text-xs text-gray-500">
                {formatMoney(product.sellPrice)} / {product.unit}
                {Number(quantity) > Number(product.quantityOnHand) && (
                  <span className="ml-2 font-semibold text-amber-600">
                    only {product.quantityOnHand} in stock
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onQuantityChange(product.id, Math.max(step, roundQty(quantity - step)))}
                className="h-7 w-7 rounded border border-gray-300 text-gray-600 hover:bg-gray-100"
                aria-label={`Decrease quantity of ${product.name}`}
              >
                −
              </button>
              <input
                type="number"
                step={step}
                min={step}
                value={quantity}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (!Number.isNaN(v) && v > 0) onQuantityChange(product.id, v);
                }}
                className="w-16 rounded border border-gray-300 px-2 py-1 text-center text-sm"
              />
              <button
                type="button"
                onClick={() => onQuantityChange(product.id, roundQty(quantity + step))}
                className="h-7 w-7 rounded border border-gray-300 text-gray-600 hover:bg-gray-100"
                aria-label={`Increase quantity of ${product.name}`}
              >
                +
              </button>
            </div>
            <div className="w-20 text-right font-medium text-gray-900">{formatMoney(total)}</div>
            <button
              type="button"
              onClick={() => onRemove(product.id)}
              className="text-gray-400 hover:text-red-600"
              aria-label={`Remove ${product.name} from cart`}
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}

function roundQty(n) {
  return Math.round(n * 1000) / 1000;
}
