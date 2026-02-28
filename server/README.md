# ZENI Property Backend

## Quick start
```bash
cd server
npm install
copy .env.example .env
npm run dev
```

API: `http://localhost:4000`

## Required env
Copy `.env.example` to `.env` and configure:
- `PORT`, `MONGO_URI`, `JWT_SECRET`, `CORS_ORIGIN`
- `ADMIN_STEP_UP_CODE`, `PAY_STEP_UP_CODE`
- `MPESA_*` values as needed
- `TRUST_PROXY` when running behind a reverse proxy/load balancer

In `NODE_ENV=production`, the server now fails fast if critical env values are weak/missing.

## Seed data
```bash
npm run seed
```

Creates/updates demo users:
- `admin@zeni.test`
- `pay-init@zeni.test`
- `pay-approver@zeni.test`
- `agent@zeni.test`
- `agent-pending@zeni.test`
- `user-basic@zeni.test`
- `user-suspended@zeni.test`

Password for all seeded users: `SEED_PASSWORD` env value, else `ChangeMe123!`.

## Testing and build
```bash
npm run lint
npm test -- --runInBand
npm run build
```

## Docker
```bash
docker-compose up --build
```

## Mpesa mock (dev)
Initiate STK: `POST /api/pay/mpesa/stk/initiate` with `{ invoiceId, phone }`.

Mark callback result:
```bash
curl -X POST http://localhost:4000/api/pay/mpesa/callback \
  -H "Content-Type: application/json" \
  -d '{"providerRef":"<ref>","success":true,"receipt":"ABC123"}'
```

## Frontend integration routes
- Auth: `/api/auth/login`, `/api/auth/register`, `/api/auth/me`
- Refresh/logout: `/api/auth/refresh`, `/api/auth/logout`
- Password reset: `/api/auth/password/forgot`, `/api/auth/password/reset`
- Listings: `/api/listings/search`, `/api/listings/:id`, `/api/listings/:id/save`
- Agent listings: `/api/agent/listings`, `/api/agent/listings/:id`, `/api/agent/listings/:id/submit`
- Admin: `/api/admin/verification/*`, `/api/admin/analytics/overview`, `/api/admin/audit`
- Chat: `/api/conversations`, `/api/conversations/:id/messages`, `/api/conversations/:id/read`
- Reports: `/api/reports`, `/api/admin/reports`, `/api/admin/reports/:id/resolve`
- Payments: `/api/pay/invoices`, `/api/pay/mpesa/stk/initiate`, `/api/pay/mpesa/callback`, `/api/pay/admin/reconciliation`
