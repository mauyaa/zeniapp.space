# Pay Portal (Zeni)

This doc explains how the standalone pay portal works (frontend at `/pay/*`, backend routes under `/api/pay/*`) and how to test it locally.

**For payment method setup (Stripe, M-Pesa, bank transfer) and local testing (Stripe CLI, ngrok, mock callbacks), see [PAYMENTS.md](./PAYMENTS.md).**

## Overview
- Audience: tenants and finance/admin users managing property payments.
- Frontend: Vite React, routes live in `src/pay/*`, auth handled by `PayAuthContext`.
- Backend: Express controllers in `server/src/controllers/pay*.ts`, routes in `server/src/routes/pay.portal.routes.ts`.
- Auth scope: dedicated JWT with `aud: "pay"` plus refresh token; stored in `localStorage` under `pay_*` keys.

## Key endpoints
All prefixed with `/api/pay`.
- Auth: `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/logout-all`, `GET /auth/me`, `POST /auth/step-up`, `GET /auth/sessions`.
- Account defaults: `GET /account`, `PATCH /account` (default currency/method).
- Transactions: `POST /transactions/initiate` (requires `Idempotency-Key`), `GET /transactions`, `GET /transactions/:id`.
- Receipts: `GET /receipts/:id`.
- Admin/finance: `GET /admin/reconcile`, `POST /admin/resolve/:id`, `POST /admin/refund/:id` (guarded by role + step-up).

## Auth and storage
- Access token key: `pay_access_token`
- Refresh token key: `pay_refresh_token`
- User payload key: `pay_user`
- `PayAuthContext` reads these at boot and refreshes when a 401 is returned (see `payApi.request`).
- `payApi.stepUp` must be called before admin actions; code is controlled by `PAY_STEP_UP_CODE` in `.env` (blank disables).

## Payment flow (happy path)
1) Tenant signs in via `/pay/login` using the pay credentials provisioned by the main app (`auth.service` auto-creates pay accounts on signup).
2) On the dashboard they trigger **Secure Pay** which routes to `/pay/payments`.
3) `payApi.initiatePayment` POSTs `amount`, `currency`, `method`, optional `phone` (required for `mpesa_stk`). An `Idempotency-Key` header is required and provided by the UI.
4) For M-Pesa STK the backend calls `initiateStk`; for other methods the transaction is recorded and awaits callback/manual update.
5) Callback (or manual reconcile) marks the transaction `paid` and issues a receipt; socket events emit `pay:transaction` to the user.
6) Receipts are fetched with `GET /receipts/:id` and rendered at `/pay/receipts/:id`.

## Reconciliation and refunds
- `/pay/admin/reconcile` returns `pending` (awaiting callback) and `failed` transactions.
- Admin/finance users must perform step-up (`/auth/step-up`) before calling `resolve` or `refund`.
- UI hook: `PayAdminReconcile` pops a modal to collect the step-up code, then calls `/admin/resolve/:id` or `/admin/refund/:id`.

## Local dev checklist
1) Backend: `cd server && npm install && npm run dev` (needs Mongo + `.env` with `PAY_*`, `MONGO_URI`, `JWT_SECRET`, `ADMIN_*`, `AGENT_*`).
2) Frontend: `npm install && npm run dev` (requires `VITE_API_BASE_URL` pointing at the backend, default is proxy to same origin).
3) Seed data: `cd server && npm run seed` to create admin/agent/user and ensure pay accounts exist.
4) Visit `http://localhost:5173/pay/login` and sign in with the seeded user or admin to exercise both roles.

## Manual test scripts
- Tenant pay flow: login -> dashboard -> Secure Pay -> enter KES amount + STK phone -> expect "Payment initiated" and a new row in transactions.
- Receipt view: from Transactions, click a row with `receiptId` -> should open `/pay/receipts/:id` and `Download PDF` should trigger `window.print`.
- Admin reconcile: login as admin/finance -> `/pay/admin/reconcile` -> choose pending tx -> enter step-up code -> status updates and list refreshes.
- Session security: open `/pay/profile` -> "Sign out of all sessions" should clear sessions and force re-login on next API call.

## Operational notes
- Rate limits: see `server/src/middlewares/rateLimit.ts` (`payLoginLimiter`, `payRefreshLimiter`, `payInitiateLimiter`).
- Metrics: exposed via `GET /api/metrics` (admin auth); pay endpoints emit normalized paths for lower cardinality.
- Backups: `cd server && npm run backup` writes to `server/backups/` (uses `MONGO_URI_BACKUP` fallback to `MONGO_URI`).

## Troubleshooting
- 401 on portal calls: ensure refresh token is present; network panel should show a retry after refresh; clear `pay_*` keys if stuck.
- Step-up failures: confirm `PAY_STEP_UP_CODE` matches the code you type in the modal; empty env disables the requirement.
- STK callbacks not arriving: see [PAYMENTS.md](./PAYMENTS.md) (ngrok, callback URL, mock vs real credentials). Check `MPESA_CALLBACK_URL` and backend logs.
- Card payment stays pending: ensure Stripe webhook is configured and `STRIPE_WEBHOOK_SECRET` is set; locally use Stripe CLI to forward events (see [PAYMENTS.md](./PAYMENTS.md)).
