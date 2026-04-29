# FitFuel Kitchen Production Stack

Production-shaped full-stack rebuild for FitFuel Kitchen.

## Stack

- Frontend: React + Vite
- Backend: Express
- Database: SQLite via `better-sqlite3`
- Validation: `zod`
- Security: `helmet`, compression, request throttling
- Payments: Razorpay order creation, client checkout, signature verification, webhook verification

## What this build includes

- premium storefront UX with custom illustrations
- searchable menu and size-aware cart
- AI meal planner with macro targeting
- secure checkout flow
- persistent order storage in SQLite
- admin-protected order listing endpoint
- production client build served by the Express app

## Environment

Copy `.env.example` to `.env` and fill in the payment values:

- `PORT`
- `APP_BASE_URL`
- `FRONTEND_URL`
- `DB_PATH`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `ADMIN_API_KEY`

## Run locally

Start the API server:

```powershell
.\node.exe .\server\index.js
```

Run the frontend in dev mode:

```powershell
cmd /c npm.cmd run dev
```

Build the frontend bundle:

```powershell
cmd /c npm.cmd run build
```

After building, the Express server serves the production app from `dist`.

Check environment readiness:

```powershell
cmd /c npm.cmd run check:env
```

Run a free local smoke test against a running server:

```powershell
cmd /c npm.cmd run smoke
```

## API surface

- `GET /api/health`
- `GET /api/menu`
- `POST /api/ai/recommend`
- `POST /api/cart/quote`
- `POST /api/checkout/create-order`
- `POST /api/payments/verify`
- `POST /api/payments/webhook`
- `GET /api/orders` with `x-admin-key`

## Production notes

- Live card and UPI collections require valid Razorpay keys in `.env`
- Without Razorpay keys, COD still works and Razorpay routes return a configuration-required payload
- Orders are stored in `data/fitfuel.db`
- Menu, plans, and offers are seeded from `data/menu.js`
- Real-domain deployment artifacts are in `deploy/` and [DEPLOYMENT.md](C:/Users/LENOVO/Documents/Codex/2026-04-26/develop-a-fully-functional-webapp-on/DEPLOYMENT.md)

## Verified during build

- production client bundle compiles successfully
- `GET /api/health` responds
- `GET /api/menu` responds
- `POST /api/checkout/create-order` persists an order successfully
- local smoke-test tooling is included for repeatable free verification

## GitHub Actions

A CI workflow is included at `.github/workflows/ci.yml`.

It automatically:

- installs dependencies
- validates required environment variables
- builds the production frontend
- starts the Express server
- runs the smoke test against the live local app
