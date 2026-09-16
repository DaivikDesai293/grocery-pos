import { formatMoney, formatDateTime, formatQuantity } from '../../utils/format';

/**
 * A receipt-shaped view. On screen it's a normal card; the `print-area` /
 * `no-print` classes (see index.css) hide everything else when the cashier
 * hits Print, so what comes out of the printer is just this, sized for
 * 80mm thermal paper.
 */
export default function Receipt({ sale, storeSettings, onNewSale }) {
  return (
    <div>
      <div className="print-area mx-auto max-w-sm rounded-lg border border-gray-200 bg-white p-6 font-mono text-sm">
        <div className="text-center">
          <div className="text-base font-bold">{storeSettings?.storeName || 'Corner Grocery'}</div>
          {storeSettings?.address && <div className="text-xs">{storeSettings.address}</div>}
          {storeSettings?.phone && <div className="text-xs">{storeSettings.phone}</div>}
        </div>
        <div className="my-3 border-t border-dashed border-gray-400" />
        <div className="flex justify-between text-xs">
          <span>Receipt #{sale.saleNumber}</span>
          <span>{formatDateTime(sale.createdAt)}</span>
        </div>
        <div className="text-xs">Cashier: {sale.cashier?.name || '—'}</div>
        <div className="my-3 border-t border-dashed border-gray-400" />

        <div className="space-y-1">
          {sale.items.map((item) => (
            <div key={item.id} className="flex justify-between gap-2">
              <span className="flex-1">
                {item.productName}
                <br />
                <span className="text-xs text-gray-500">
                  {formatQuantity(item.quantity, item.quantity % 1 !== 0 ? 'kg' : 'each')} ×{' '}
                  {formatMoney(item.unitPrice)}
                </span>
              </span>
              <span>{formatMoney(item.lineTotal)}</span>
            </div>
          ))}
        </div>

        <div className="my-3 border-t border-dashed border-gray-400" />
        <div className="space-y-1">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatMoney(sale.subtotal)}</span>
          </div>
          {Number(sale.discountTotal) > 0 && (
            <div className="flex justify-between">
              <span>Discount</span>
              <span>-{formatMoney(sale.discountTotal)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Tax</span>
            <span>{formatMoney(sale.taxTotal)}</span>
          </div>
          <div className="flex justify-between text-base font-bold">
            <span>Total</span>
            <span>{formatMoney(sale.total)}</span>
          </div>
          <div className="my-2 border-t border-dashed border-gray-400" />
          <div className="flex justify-between">
            <span>{sale.paymentMethod}</span>
            <span />
          </div>
          {sale.paymentMethod === 'CASH' && (
            <>
              <div className="flex justify-between">
                <span>Tendered</span>
                <span>{formatMoney(sale.amountTendered)}</span>
              </div>
              <div className="flex justify-between">
                <span>Change</span>
                <span>{formatMoney(sale.changeDue)}</span>
              </div>
            </>
          )}
        </div>

        <div className="my-3 border-t border-dashed border-gray-400" />
        <p className="text-center text-xs">{storeSettings?.receiptFooter || 'Thank you for shopping with us!'}</p>
      </div>

      <div className="no-print mx-auto mt-4 flex max-w-sm gap-3">
        <button
          type="button"
          onClick={() => window.print()}
          className="flex-1 rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
        >
          Print receipt
        </button>
        <button
          type="button"
          onClick={onNewSale}
          className="flex-1 rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          New sale
        </button>
      </div>
    </div>
  );
}
