# FitFuel Kitchen Production Stack

Production-shaped FitFuel Kitchen web application, now evolving toward an AI-powered nutrition operating system.

## Current stack

- Frontend: React + Vite + TypeScript
- Backend: Express
- Database: SQLite via `better-sqlite3`
- State: Zustand + React Query
- Validation: `zod`
- Security: `helmet`, compression, request throttling
- Payments: Razorpay with optional Stripe foundation
- AI integration foundation: OpenAI, LangChain, Pinecone, Mixpanel, Twilio, WebSockets

## What this build includes

- premium storefront UX with custom illustrations
- searchable menu and size-aware cart
- AI meal planner with macro targeting
- guest-session user system
- persistent profile and dashboard
- personalized catalog sections
- secure checkout flow
- persistent order storage in SQLite
- admin-protected order listing endpoint
- production client build served by the Express app
- integration-ready AI and automation endpoints

## Key docs

- [DEPLOYMENT.md](C:/Users/LENOVO/Documents/Codex/2026-04-26/develop-a-fully-functional-webapp-on/DEPLOYMENT.md)
- [AI_PLATFORM_SETUP.md](C:/Users/LENOVO/Documents/Codex/2026-04-26/develop-a-fully-functional-webapp-on/AI_PLATFORM_SETUP.md)
- [ARCHITECTURE_AI_OS.md](C:/Users/LENOVO/Documents/Codex/2026-04-26/develop-a-fully-functional-webapp-on/ARCHITECTURE_AI_OS.md)

## Environment

Copy `.env.example` to `.env` and fill in the values you actually want to use.

Current groups:

- app and database
- Razorpay
- Stripe
- OpenAI
- Pinecone
- Mixpanel
- Twilio WhatsApp
- Firebase
- n8n
- AWS

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

Run the local smoke test against a running server:

```powershell
cmd /c npm.cmd run smoke
```

## API surface

Core:

- `GET /api/health`
- `GET /api/menu`
- `GET /api/menu/personalized`
- `POST /api/auth/guest-session`
- `GET /api/me/profile`
- `PUT /api/me/profile`
- `PUT /api/me/account`
- `GET /api/me/dashboard`
- `POST /api/ai/recommend`
- `POST /api/cart/quote`
- `POST /api/checkout/create-order`
- `POST /api/payments/verify`
- `POST /api/payments/webhook`
- `GET /api/orders`

AI and integration foundation:

- `GET /api/integrations/status`
- `POST /api/ai/coach/chat`
- `POST /api/ai/food-analyzer`
- `POST /api/analytics/track`
- `POST /api/payments/stripe/create-session`
- `POST /api/automation/whatsapp/send`
- `WS /ws`

## Production notes

- Live Razorpay collections require valid Razorpay keys in `.env`
- Stripe session creation requires `STRIPE_SECRET_KEY`
- OpenAI-backed AI features require `OPENAI_API_KEY`
- Pinecone-backed memory requires Pinecone credentials
- Twilio-backed WhatsApp automation requires Twilio credentials
- Orders are stored in `data/fitfuel.db`
- Menu, plans, and offers are seeded from `data/menu.js`

## Verified locally

- production client bundle compiles successfully
- guest session flow works
- profile and account APIs work
- personalized catalog endpoint works
- COD order creation persists an order
- dashboard history responds
- smoke-test tooling is included for repeatable local verification

## GitHub Actions

A CI workflow is included at `.github/workflows/ci.yml`.

It automatically:

- installs dependencies
- validates required environment variables
- builds the production frontend
- starts the Express server
- runs the smoke test against the local app
