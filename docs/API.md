# API Reference

Base URL: `http://localhost:4000/api` (the backend mounts every route below under `/api`; see `backend/src/app.js`).

Every request/response body is JSON. An authenticated request sends `Authorization: Bearer <accessToken>`. An error response always has the shape:

```json
{ "error": { "message": "Human-readable message", "details": [ /* zod validation details, if any */ ] } }
```

**Roles**, from least to most privileged: `CASHIER` < `MANAGER` < `ADMIN`. "Any role" below means any logged-in user; endpoints marked `MANAGER+` or `ADMIN` reject a lower role with `403`.

## Auth — `/api/auth`

| Method & path | Auth | Body | Notes |
|---|---|---|---|
| `POST /login` | none | `{ email, password }` | Rate-limited (20 attempts / 15 min / IP). Returns `{ accessToken, refreshToken, user }`. Same error for a wrong email or wrong password, so a client can't tell which one was wrong. |
| `POST /refresh` | none | `{ refreshToken }` | Returns a **new** `{ accessToken, refreshToken, user }` pair and revokes the old refresh token (rotation). |
| `POST /logout` | none | `{ refreshToken }` | Revokes that refresh token. Always `204`, even if the token was already invalid. |
| `GET /me` | any | — | Returns the current user from the access token. |

`user` in every response above is `{ id, name, email, role }` — the password hash is never sent to a client.

## Users — `/api/users` (ADMIN only, every route)

| Method & path | Body | Notes |
|---|---|---|
| `GET /` | — | List all users. |
| `POST /` | `{ name, email, password (min 8 chars), role }` | Creates a user. |
| `PATCH /:id` | any of `{ name, role, active, password }` | Partial update. |
| `DELETE /:id` | — | **Soft delete**: sets `active = false`. Users are never hard-deleted (see `docs/DATABASE.md`). |

## Categories — `/api/categories`

| Method & path | Auth | Body |
|---|---|---|
| `GET /` | any role | — |
| `POST /` | MANAGER+ | `{ name }` |
| `PATCH /:id` | MANAGER+ | `{ name }` |
| `DELETE /:id` | MANAGER+ | — |

## Suppliers — `/api/suppliers`

| Method & path | Auth | Body |
|---|---|---|
| `GET /` | any role | — |
| `POST /` | MANAGER+ | `{ name, contactName?, phone?, email?, address? }` |
| `PATCH /:id` | MANAGER+ | any subset of the same fields |
| `DELETE /:id` | MANAGER+ | — |

## Products — `/api/products`

| Method & path | Auth | Notes |
|---|---|---|
| `GET /` | any role | Query: `search`, `categoryId`, `supplierId`, `includeInactive`, `page`, `pageSize` (max 100). Any logged-in role can read — cashiers need this to ring up a sale. |
| `GET /barcode/:barcode` | any role | Exact barcode lookup, for a scanner. |
| `GET /:id` | any role | — |
| `GET /:id/stock-history` | MANAGER+ | The `stock_movements` audit trail for one product. |
| `POST /` | MANAGER+ | Create. See `createProductSchema` in `backend/src/validation/product.schemas.js` for every field. |
| `PATCH /:id` | MANAGER+ | Partial update; any subset of the create fields plus `active`. |
| `DELETE /:id` | MANAGER+ | **Soft delete** (`active = false`) if the product has sale history. |
| `POST /:id/stock-adjustment` | MANAGER+ | `{ type: 'RECEIVE'\|'ADJUSTMENT'\|'WASTE'\|'RETURN', quantity, note? }`. `RECEIVE`/`RETURN` add stock, `WASTE` removes it (send a positive quantity either way — the server applies the sign), `ADJUSTMENT` applies the signed quantity exactly as sent. Writes a `stock_movements` row. |

`GET /api/reports/reorder` (below) is the "what's low on stock" endpoint — deliberately separate from `GET /api/products`, because "on hand ≤ threshold" compares two columns, which needs a raw SQL predicate rather than a simple filter.

## Sales / checkout — `/api/sales`

| Method & path | Auth | Notes |
|---|---|---|
| `POST /` | any role | The checkout endpoint. Body: `{ items: [{ productId, quantity }], paymentMethod: 'CASH'\|'CARD'\|'OTHER', amountTendered? (required if CASH), customerId?, discountCents? }`. **No prices in the request** — every price/tax/total is computed server-side from the current product record. Duplicate `productId` lines are merged. A `discountCents > 0` requires the caller to be MANAGER+ (checked in `sale.service.js`, not just by role middleware, since anyone can create a sale but not everyone can discount one). Runs as one Prisma transaction: creates the sale + line items, decrements stock, and writes `SALE` stock movements — all or nothing. |
| `GET /` | any role | Query: `from`, `to` (ISO datetimes), `cashierId`, `status`, `page`, `pageSize`. |
| `GET /:id` | any role | Full sale detail, including items. |
| `POST /:id/void` | MANAGER+ | `{ reason }`. Sets `status = VOIDED`, records the reason, reverses the stock movements. Does not delete the sale. |

## Reports — `/api/reports` (MANAGER+, every route)

All range-based endpoints accept **either** `?preset=` **or** `?from=YYYY-MM-DD&to=YYYY-MM-DD`. Valid presets: `today`, `yesterday`, `this_week`, `last_week`, `this_month`, `last_30_days` — resolved in the store's local timezone (`STORE_TIMEZONE` in `backend/.env`), not UTC. See `docs/ARCHITECTURE.md` for why that distinction matters.

| Method & path | Notes |
|---|---|
| `GET /summary` | `{ from, to, saleCount, revenue, subtotal, tax, discount, averageBasket }` for the range. |
| `GET /trend` | `{ from, to, days: [{ date, revenue, saleCount }, ...] }` — one bucket per calendar day in the range. |
| `GET /top-products` | Query adds `limit` (default 10, max 50). Array of `{ productId, productName, quantitySold, revenue }`, ranked by revenue. |
| `GET /by-category` | Array of `{ categoryId, name, revenue, quantitySold }`. |
| `GET /by-cashier` | Array of `{ cashierId, cashierName, revenue, saleCount }`. |
| `GET /reorder` | No range params — always "right now." Array of `{ productId, sku, barcode, name, unit, quantityOnHand, reorderThreshold, avgDailySales, isLowStock, suggestedQuantity, reason }` for every active product at or under its threshold. `suggestedQuantity` is sized from actual sales velocity over the last 30 days where available (enough to cover ~14 days at the recent pace), falling back to the product's configured `reorderQuantity` when there's no recent sales history yet. See `utils/reorder.js`. |

## Dashboard — `/api/dashboard` (MANAGER+)

| Method & path | Notes |
|---|---|
| `GET /` | One combined payload for a home screen: `{ today, yesterday, thisWeek, lastWeek, trend, lowStockCount, reorderPreview }`, where the four period fields are the same shape as `/reports/summary` and `trend` is the last 30 days. This exists so the mobile dashboard and the web report page's top section are one round trip instead of five or six — it matters more on a phone connection than on the web admin console. |

## Settings — `/api/settings`

| Method & path | Auth | Body |
|---|---|---|
| `GET /` | any role | Returns the single `store_settings` row (receipt printing needs this for any role). |
| `PATCH /` | ADMIN | `{ storeName?, address?, phone?, currency?, defaultTaxRate?, receiptFooter? }` |

## Health check

| Method & path | Auth |
|---|---|
| `GET /api/health` | none — returns `{ status: 'ok', time }` |
