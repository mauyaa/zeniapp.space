# Payments setup and testing

This guide covers **local development** and **production setup** for M-Pesa, Stripe (card), and bank transfer. For pay portal architecture and endpoints, see [pay-portal.md](./pay-portal.md).

---

## 1. Bank transfer details

Bank details shown after the user confirms a bank transfer are **configurable via env** so you never hardcode real account numbers.

**Frontend (`.env`):**

```env
VITE_PAY_BANK_NAME=Your Bank Name
VITE_PAY_BANK_ACCOUNT=KES 1234567890
```

If unset, the UI falls back to placeholders (“Zeni Payments”, “KES 1234567890”). Set these to your real bank name and account number (or payment collection account) before going live.

---

## 2. Stripe (card) – local development

Stripe confirms card payments via **webhooks**. In production your server has a public URL, so Stripe can POST `payment_intent.succeeded` to it. Locally, Stripe cannot reach `localhost`, so you need to **forward webhooks** to your machine.

**Option A: Stripe CLI (recommended)**

1. Install: [Stripe CLI](https://stripe.com/docs/stripe-cli#install).
2. Log in: `stripe login`.
3. Forward webhooks to your API:

   ```bash
   stripe listen --forward-to http://localhost:4000/api/pay/stripe/webhook
   ```

4. The CLI prints a **webhook signing secret** (e.g. `whsec_...`). Put it in **server** `.env`:

   ```env
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

5. Restart the server. Use Stripe **test cards** (e.g. `4242 4242 4242 4242`) and complete a payment; the CLI forwards the event to localhost and your transaction is marked paid.

**Option B: Production**

- In [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks), add endpoint:
  - URL: `https://your-api-domain.com/api/pay/stripe/webhook`
  - Event: `payment_intent.succeeded`
- Copy the **Signing secret** into `STRIPE_WEBHOOK_SECRET` on the server.

---

## 3. M-Pesa – local development

Safaricom sends the STK result to your **callback URL**. That URL must be **publicly reachable**. On your laptop, Safaricom cannot call `http://localhost:4000/...`, so you need a tunnel.

**Option A: ngrok**

1. Install [ngrok](https://ngrok.com/download).
2. Start your API (e.g. `cd server && npm run dev`).
3. In another terminal:

   ```bash
   ngrok http 4000
   ```

4. Copy the HTTPS URL (e.g. `https://abc123.ngrok.io`) and set **server** `.env`:

   ```env
   MPESA_CALLBACK_URL=https://abc123.ngrok.io/api/pay/mpesa/callback
   ```

5. Restart the server. Use **real** M-Pesa sandbox credentials (from [Safaricom Developer](https://developer.safaricom.co.ke)); when the user completes the STK push on their phone, Safaricom will POST to your ngrok URL and your callback will mark the transaction paid.

**Option B: Mock M-Pesa (no tunnel)**

If you leave M-Pesa credentials as `dev` or empty, the backend uses a **mock**: no real STK is sent, and the transaction gets a ref like `MOCK-1234567890`. Safaricom never calls you, so the transaction stays **pending**. You can:

- **Mark it paid manually** via Admin (see section 4), or  
- **Simulate a callback** (section 5).

---

## 4. Marking pending payments as paid (admin)

When using **mock M-Pesa** or **bank transfer**, transactions stay **pending** until something marks them paid. Admin/finance users can do that from the pay portal.

1. Log in to the **pay portal** as admin or finance (`/pay/login`).
2. Go to **Admin → Reconcile** (or the reconcile UI linked from the pay dashboard).
3. You’ll see a list of **pending** (and failed) transactions.
4. For a pending transaction, choose **Resolve** and set status to **paid** (you may need to complete **step-up** if `PAY_STEP_UP_CODE` is set).
5. The transaction is updated to `paid`, a receipt is created, and the same logic runs as for a real callback (e.g. viewing fee held, listing marked sold/let). The user sees the update via socket if they have the dashboard open.

**API (for scripts or support):**

- `POST /api/pay/admin/resolve/:id` with body `{ "status": "paid" }`. Requires pay JWT, role admin/finance, step-up if configured, and (if enabled) privileged network access.

---

## 5. Simulating an M-Pesa callback (dev only)

For **mock** M-Pesa refs (`MOCK-...`), you can simulate a success callback so the transaction is marked paid without using the admin UI.

**Request:**

```bash
curl -X POST http://localhost:4000/api/pay/mpesa/callback \
  -H "Content-Type: application/json" \
  -H "x-callback-secret: YOUR_MPESA_CALLBACK_SECRET" \
  -d '{"providerRef":"MOCK-1234567890123","success":true,"receipt":"TEST-RCPT-001"}'
```

- Replace `MOCK-1234567890123` with the **actual** `ref` of the pending transaction (e.g. from the database or from the Pay dashboard / transactions list).
- Use the same `x-callback-secret` value as `MPESA_CALLBACK_SECRET` in server `.env`. If `MPESA_CALLBACK_SECRET` is empty, the server accepts any request (dev only; **set a secret in production**).

After a successful call, that transaction is marked **paid**, a receipt is created, and side effects (viewing fee, listing sold/let) run as normal.

---

## 6. Quick checklist

| Item | Action |
|------|--------|
| **Bank details** | Set `VITE_PAY_BANK_NAME` and `VITE_PAY_BANK_ACCOUNT` in frontend `.env` (or leave placeholder for dev). |
| **Stripe local** | Run `stripe listen --forward-to http://localhost:4000/api/pay/stripe/webhook` and set `STRIPE_WEBHOOK_SECRET` in server `.env`. |
| **Stripe production** | Add webhook in Dashboard, set `STRIPE_WEBHOOK_SECRET` and `STRIPE_SECRET_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`. |
| **M-Pesa local (real)** | Use ngrok (or similar), set `MPESA_CALLBACK_URL` to the public URL; use sandbox credentials. |
| **M-Pesa mock** | Leave credentials as `dev`/empty; use Admin Reconcile/Resolve or simulated callback (section 5) to mark pending as paid. |
| **Production** | Set `MPESA_CALLBACK_SECRET` and use a real, public `MPESA_CALLBACK_URL`; never leave callback secret empty in production. |
