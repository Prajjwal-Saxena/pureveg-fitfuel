# Deployment Guide

This app is ready to deploy behind a real domain with HTTPS.

## Recommended topology

- App container: React build served by Express on port `3000`
- Reverse proxy: Caddy for automatic TLS and clean domain routing
- Domain: `fitfuelkitchen.com` and `www.fitfuelkitchen.com`

## Free tasks already completed in this repo

- Docker deployment files are prepared
- HTTPS reverse-proxy config is prepared
- environment template is prepared
- smoke-test script is prepared
- env validation script is prepared

These are all zero-cost setup tasks you can use before paying for infrastructure.

## 1. Prepare the server

Use an Ubuntu VPS with Docker and Docker Compose installed.

Suggested minimum:

- 2 vCPU
- 2 GB RAM
- 20 GB SSD

## 2. Point the domain

In your DNS provider:

- `A` record: `fitfuelkitchen.com` -> your server IPv4
- `A` record: `www.fitfuelkitchen.com` -> your server IPv4

Wait until both resolve publicly before starting Caddy.

## 3. Set environment variables

Copy `.env.example` to `.env` and set:

- `APP_BASE_URL=https://fitfuelkitchen.com`
- `FRONTEND_URL=https://fitfuelkitchen.com`
- `PORT=3000`
- `DB_PATH=./data/fitfuel.db`
- `RAZORPAY_KEY_ID=...`
- `RAZORPAY_KEY_SECRET=...`
- `RAZORPAY_WEBHOOK_SECRET=...`
- `ADMIN_API_KEY=...`

## 4. Build and run with Docker

From the project root:

```bash
docker compose -f deploy/docker-compose.yml up -d --build
```

This starts:

- `fitfuel-app`
- `fitfuel-caddy`

Caddy automatically provisions and renews HTTPS certificates once DNS is live.

## 5. Configure Razorpay

In Razorpay Dashboard:

- Website URL: `https://fitfuelkitchen.com`
- Webhook URL: `https://fitfuelkitchen.com/api/payments/webhook`
- Secret: must match `RAZORPAY_WEBHOOK_SECRET`

Use live keys only after your full checkout test passes on the domain.

## 6. Verify production

Check:

- `https://fitfuelkitchen.com/api/health`
- homepage loads over HTTPS
- checkout opens Razorpay
- successful payment returns to the app
- webhook updates paid orders

## 7. View orders

Call:

`GET /api/orders`

with header:

`x-admin-key: <ADMIN_API_KEY>`

## Alternative deployment

If you prefer a non-Docker Linux deployment:

- copy the repo to `/opt/fitfuel-kitchen`
- run `npm ci`
- run `npm run build`
- use the included `deploy/fitfuel.service`
- place Nginx or Caddy in front of `localhost:3000`

## Notes

- SQLite is fine for early production traffic, but PostgreSQL is the next upgrade once order volume grows
- Keep the `data` directory persisted across deploys
- Do not expose port `3000` publicly without the reverse proxy
