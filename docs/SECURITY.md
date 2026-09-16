# Security & Backups

## Authentication

- **Access token**: a JWT signed with `JWT_ACCESS_SECRET`, valid for `JWT_ACCESS_EXPIRES_IN` (default 15 minutes). Carries `{ sub: userId, role, name, email }`. Verified locally on every request (`middleware/auth.js`) with **no database hit** — that's the point of a short-lived token: cheap, stateless verification on the hot path, with the database only consulted when a session is refreshed or revoked.
- **Refresh token**: a 48-byte random value (`crypto.randomBytes(48).toString('hex')`), not a JWT. The server stores only its **SHA-256 hash** (`refresh_tokens.token_hash`) — a stolen database dump doesn't hand out usable sessions, the same principle as password hashing, just with a cheaper hash since the token itself is already high-entropy (no dictionary/brute-force risk to defend against, unlike a human-chosen password).
- **Rotation on every refresh**: `POST /api/auth/refresh` revokes the presented token and issues a brand-new access+refresh pair. A refresh token is therefore single-use. If a **revoked** token is ever presented again, that's a strong signal it was copied and replayed by someone else — a production system would treat that as a compromise signal and revoke every other active session for that user too (the current implementation revokes just the one token; extending it to revoke the whole "family" on reuse is a natural next hardening step, noted here rather than silently assumed).
- **Passwords**: hashed with bcrypt (cost factor 10, via `bcryptjs`). Login always runs `bcrypt.compare` — even against a dummy hash when the email doesn't exist — so the response time doesn't leak which case failed, and the error message is identical either way ("Invalid email or password").
- **Login rate limiting**: 20 attempts per 15 minutes per IP (`express-rate-limit` on `POST /api/auth/login`), to slow down credential-stuffing / brute force without punishing normal typos.

## Authorization (RBAC)

Three roles, a strict hierarchy: `ADMIN` > `MANAGER` > `CASHIER`. `middleware/requireRole.js` ranks them numerically but every route still names its allowed roles explicitly (e.g. `requireRole('ADMIN', 'MANAGER')`) so each route's policy is readable on its own line rather than hidden behind a "minimum level 2" number. Full per-route matrix: `docs/API.md`.

A few authorization decisions are **too fine-grained for route-level middleware** and are enforced inside the service instead:
- **Discounting a sale** requires MANAGER+, checked inside `sale.service.js` — because `POST /api/sales` itself is open to any role (a cashier has to be able to ring up a sale), but only a manager can apply a discount within that same request.
- **The mobile app** additionally refuses a `CASHIER` login client-side (`mobile/src/context/AuthContext.js`) with a clear message, since every endpoint it calls is MANAGER+ anyway — this is a UX courtesy, not a security boundary; the server-side role checks are what actually protect the data.

## Secrets

- `backend/.env` (copied from `.env.example`) holds `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and the database credentials. **Never commit `.env`** — it's already in `.gitignore`. The app refuses to start if `DATABASE_URL`, `JWT_ACCESS_SECRET`, or `JWT_REFRESH_SECRET` are missing (`config/env.js`), rather than silently running with an undefined secret.
- Generate real secrets before deploying anywhere beyond your own machine:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```
  Run it twice, once for each of `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.
- The seed script's admin account (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`) is a **development convenience**. Change that password (or the account) before this is ever anything but a local/demo database — see "Going to production," below.

## Transport & headers

- `helmet()` is applied to every response (sensible default security headers — `X-Content-Type-Options`, a conservative `Content-Security-Policy`, etc.).
- CORS is locked to an explicit allowlist (`CORS_ORIGIN` in `.env`, comma-separated), not `*`. Add your deployed frontend's origin there when you host it somewhere other than `localhost:5173`.
- This project runs over plain HTTP locally, which is fine for local development. **A real deployment must run behind HTTPS** (a reverse proxy like Caddy/nginx, or your host's built-in TLS termination) — plain HTTP would send the access token and login credentials in cleartext.

## Client-side token storage — a documented trade-off

- **Web app**: the refresh token is stored in `localStorage` (see the comment in `frontend/src/api/tokenStore.js`). `localStorage` is readable by any script running on the page, which is an acceptable trade-off for local development but not ideal facing the open internet — a hardened deployment would move the refresh token into an `httpOnly` cookie instead, which JavaScript can't read at all. That needs the API and frontend on related origins (or a proxy in front of both), which is out of scope for this project's default setup — called out here so the trade-off is explicit rather than silent.
- **Mobile app**: the refresh token is stored in `expo-secure-store`, backed by the iOS Keychain / Android Keystore — meaningfully stronger than `localStorage`, and the reason the mobile token store's API is async where the web one is sync (see `mobile/src/api/tokenStore.js`).
- **Both apps**: the access token itself lives only in memory (a plain JS variable), never persisted. It's gone the moment the tab/app restarts, which is exactly why both apps have a "restore session" step on startup that exchanges the stored refresh token for a new access token.

## Data integrity

- **Server-authoritative pricing**: a checkout request carries only `productId` + `quantity`; every price and total is computed server-side from the live `products` row inside a single Prisma transaction (`sale.service.js`). A client cannot submit its own price.
- **Audit trail, not just a counter**: every stock change writes an immutable `stock_movements` row alongside updating the running total (see `docs/DATABASE.md`). Nothing about inventory is "just trust the current number."
- **Soft deletes**: users and products with sale history are deactivated, never hard-deleted, so historical receipts and reports never point at a row that no longer exists.

## Backups & restore (PostgreSQL)

For a database started via the provided `docker-compose.yml`:

**Back up:**
```bash
docker exec grocery-pos-db pg_dump -U grocery -d grocery_pos -F c -f /tmp/grocery_pos.dump
docker cp grocery-pos-db:/tmp/grocery_pos.dump ./grocery_pos_$(date +%Y%m%d).dump
```

**Restore** into a fresh/empty database (this does not merge — it's meant for disaster recovery or standing up a copy):
```bash
docker cp ./grocery_pos_20260101.dump grocery-pos-db:/tmp/restore.dump
docker exec grocery-pos-db pg_restore -U grocery -d grocery_pos --clean --if-exists /tmp/restore.dump
```

For a real store, automate the backup command on a schedule (a daily cron job or your hosting provider's managed-Postgres backup feature) and periodically **test the restore**, not just the backup — a backup you've never restored from is unverified. Keep at least one copy off the same machine/disk as the live database.

## Going to production — a checklist

This project is built to a real standard (RBAC, audit trails, transactional checkout, tested date/money logic), but a few things are intentionally left as local-development defaults and should be revisited before this runs an actual store:

- [ ] Replace every default secret and password (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, database password, and the seeded admin password).
- [ ] Serve both the API and the web app over HTTPS.
- [ ] Set `CORS_ORIGIN` to your real deployed frontend origin(s) only.
- [ ] Set `NODE_ENV=production` (enables Express's production logging mode and disables some development conveniences).
- [ ] Point `EXPO_PUBLIC_API_URL` (mobile) and `VITE_API_URL` (web) at your real deployed API URL, not `localhost`.
- [ ] Set up automated, tested database backups (above).
- [ ] Consider moving the web app's refresh token from `localStorage` to an `httpOnly` cookie (see above).
- [ ] Consider extending refresh-token-reuse detection to revoke the whole session family, not just the reused token (see "Rotation on every refresh," above).
