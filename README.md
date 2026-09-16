# Corner Grocery POS

A complete point-of-sale system for a small grocery store: a backend API, a web app for checkout and store management, and a mobile app for the owner/manager to check reports and stock alerts from anywhere.

Built as one system with three parts, not three separate projects — see `docs/ARCHITECTURE.md` for how they fit together and why.

## What's here

**Backend** (`/backend` — Node.js, Express, PostgreSQL via Prisma)
- JWT auth with rotating refresh tokens; role-based access control (Admin / Manager / Cashier)
- Full product catalog: categories, suppliers, barcodes, stock levels, soft-deletable products
- Checkout as a single database transaction — pricing computed server-side, stock decremented, an audit-trail row written for every stock change
- Reports: revenue summary, daily trend, top products, by category, by cashier, and a sales-velocity-aware "what to reorder" report
- Timezone-correct "today / yesterday / this week / last week" ranges (see `docs/ARCHITECTURE.md`)
- 35 automated unit tests on the core business logic (`backend/tests`), runnable with no installed dependencies beyond Node itself

**Web app** (`/frontend` — React, Vite, Tailwind, Recharts)
- The checkout terminal: barcode/search product lookup, cart, cash or card tender, receipt
- Inventory & catalog management, supplier/category admin, user management (Admin), store settings
- The full reports dashboard with charts

**Mobile app** (`/mobile` — Expo / React Native)
- The owner/manager's pocket dashboard — **not** a second checkout terminal (checkout stays on the web app)
- Today / yesterday / this week / last week at a glance, a 30-day revenue trend, top products, by category, by cashier
- Low-stock / reorder alerts, with a suggested order quantity
- Secure on-device session storage (iOS Keychain / Android Keystore via `expo-secure-store`)

## Project structure

```
grocery-pos/
  backend/     Express API + Prisma schema + tests + seed data
  frontend/    React web app (checkout + admin + reports)
  mobile/      Expo/React Native app (owner dashboard)
  docs/        ARCHITECTURE.md, DATABASE.md, API.md, SECURITY.md
  docker-compose.yml   Local PostgreSQL for development
```

## Prerequisites

- **Node.js 20+** and npm — check with `node -v`
- **Docker Desktop** (easiest way to get PostgreSQL — see below), *or* a PostgreSQL 16 server you already have
- **For the mobile app**: the free **Expo Go** app on your phone (search "Expo Go" on the App Store / Play Store) — this is the fastest way to run it with no Android Studio / Xcode setup at all
- A code editor — these steps assume **VS Code**

---

## 1. Get the database running

From the project root (the folder containing `docker-compose.yml`):

```bash
docker compose up -d
```

This starts PostgreSQL 16 in the background, with a database named `grocery_pos`, user `grocery`, password `grocery`, on the default port `5432` — matching the connection string already in `backend/.env.example`. Data persists in a Docker volume across restarts (`docker compose down` stops it without deleting data; add `-v` to also delete the volume).

Already have Postgres running some other way? Skip this step and just point `DATABASE_URL` (next section) at your own instance.

## 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run seed
npm run dev
```

What each step does:
- `cp .env.example .env` — your local config. The defaults already match the `docker compose` database from step 1, so you shouldn't need to edit anything to get started.
- `npm install` — installs Express, Prisma, and everything else in `backend/package.json`.
- `npx prisma migrate dev --name init` — creates every table from `backend/prisma/schema.prisma`. You never write this SQL by hand.
- `npm run seed` — loads a realistic demo dataset: 4 staff accounts, ~40 products across 10 categories, and 45 days of simulated sales history (today is left empty, so your first live checkout has an obvious effect). Safe to run once; it skips itself if the database already has products.
- `npm run dev` — starts the API on **http://localhost:4000**, auto-restarting on file changes.

Leave this running in its own terminal. Verify it's up: open http://localhost:4000/api/health — you should see `{"status":"ok", ...}`.

**Run the test suite** any time (in a separate terminal, `backend/` folder): `npm test` — 35 tests covering the checkout math, timezone-aware date ranges, and the reorder-suggestion logic, with no database required.

## 3. Web app

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. Sign in with one of the accounts below. The dev server proxies to `http://localhost:4000/api` by default (see `frontend/.env.example` if your backend runs somewhere else).

## 4. Mobile app

In a new terminal:

```bash
cd mobile
npm install
npx expo install --fix
npx expo start
```

`npx expo install --fix` re-aligns every `expo-*`/React Native package version to exactly what your resolved Expo SDK expects — always run it once right after `npm install` on a fresh clone. It's harmless to run again later, too, if you ever see a version-mismatch warning.

`npx expo start` prints a QR code in the terminal. Scan it with your phone's camera (iOS) or the Expo Go app (Android) — your phone and computer need to be on the **same Wi-Fi network**.

**If the app can't reach the backend from a physical phone**, that's expected out of the box — "localhost" on your phone means *the phone*, not your computer. Fix it once:
1. Find your computer's LAN IP: `ipconfig getifaddr en0` (Mac Wi-Fi), `ipconfig` (Windows — look for "IPv4 Address"), or `hostname -I` (Linux).
2. `cd mobile && cp .env.example .env`, then set `EXPO_PUBLIC_API_URL=http://<that-ip>:4000/api`.
3. Stop and restart `npx expo start`.

Running in an **Android emulator** or **iOS simulator** instead of a physical phone works with no `.env` at all — the app already guesses the right address for each (see `mobile/src/api/config.js`).

## Test accounts

Created by the backend's seed script. The mobile app only accepts Admin/Manager (it's the owner dashboard, not a checkout terminal — a Cashier login is rejected there with an explanatory message, since a cashier's role couldn't see any report anyway).

| Role | Email | Password | Works on |
|---|---|---|---|
| Admin | `admin@store.test` | `ChangeMe123!` (or your `SEED_ADMIN_PASSWORD` if you changed it in `backend/.env`) | Web + Mobile |
| Manager | `manager@store.test` | `Demo1234!` | Web + Mobile |
| Cashier | `cathy@store.test` | `Demo1234!` | Web only |
| Cashier | `sam@store.test` | `Demo1234!` | Web only |

## Everyday commands, once everything's set up

| | Command | Where |
|---|---|---|
| Start the API | `npm run dev` | `backend/` |
| Run backend tests | `npm test` | `backend/` |
| Start the web app | `npm run dev` | `frontend/` |
| Start the mobile app | `npx expo start` | `mobile/` |
| Browse the database visually | `npx prisma studio` | `backend/` |
| Stop the database | `docker compose down` | project root |

## Troubleshooting

- **`npm install` in `mobile/` pulls slightly different versions than expected** — normal; run `npx expo install --fix` afterward (see step 4) and it corrects itself to match your installed Expo SDK.
- **Backend won't start: "Missing required environment variable(s)"** — you skipped `cp .env.example .env` in `backend/`, or a value in it is blank.
- **Port already in use** (`4000` or `5173`) — something else on your machine is using it. Either stop that process, or change `PORT` in `backend/.env` (and `VITE_API_URL` in `frontend/.env` to match) / Vite's `server.port` in `frontend/vite.config.js`.
- **Web app loads but every request fails / a CORS error in the browser console** — the backend isn't running, or `CORS_ORIGIN` in `backend/.env` doesn't include `http://localhost:5173`.
- **`prisma migrate dev` can't reach the database** — make sure `docker compose up -d` (step 1) actually succeeded (`docker compose ps` should show it "healthy"), and that `DATABASE_URL` in `backend/.env` matches.
- **Mobile app: "Network Error" / can't reach the server** — see the physical-phone LAN-IP note in step 4. This is the single most common mobile setup snag and it's always a networking address issue, not a code bug.
- **Want a clean slate?** `docker compose down -v` deletes the database volume entirely; repeat steps 1–2 (including `prisma migrate dev` and `npm run seed`) to start fresh.

## Documentation

- **`docs/ARCHITECTURE.md`** — how the three apps and the backend fit together, and the reasoning behind the bigger design decisions (server-authoritative pricing, the audit-trail pattern, timezone-safe reporting, etc.)
- **`docs/DATABASE.md`** — every table, an ER diagram, and why each foreign key's delete behavior is what it is
- **`docs/API.md`** — every endpoint, required role, and response shape
- **`docs/SECURITY.md`** — the auth/RBAC model in detail, secrets handling, and database backup/restore commands
