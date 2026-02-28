# Smoke test checklist (post-deploy or before release)

Run through these steps after deploying or before a release to confirm critical paths work.

---

## Prerequisites

- Backend running (e.g. `npm run dev:server` or production API URL).
- Frontend running (e.g. `npm run dev` or production app URL).
- Database seeded (`npm run seed` in `server/`). Use `SEED_PASSWORD` (default `ChangeMe123!`) for all seeded users.

---

## 1. Auth & roles

- [ ] **Login (user)** – Log in as a seeded user (e.g. basic user). Redirects to app (e.g. `/app/home`).
- [ ] **Login (agent)** – Log in as Zeni Agent (or seeded agent). Redirects to agent dashboard (`/agent/dashboard`).
- [ ] **Login (admin)** – Log in as admin (e.g. `ADMIN_EMAIL` from seed). Redirects to admin Moderation Queue (`/admin/verification`).
- [ ] **Wrong role** – Try opening `/agent/dashboard` as user (or `/admin/verification` as user). Should see forbidden or redirect.

---

## 2. User flow

- [ ] **Explore** – Open Explore, see listings (map or list). Apply a filter (e.g. rent, price). Open a listing detail.
- [ ] **Message from listing** – From listing detail, click “Message agent”. Start a conversation. Open Messages and see the thread with the listing card.
- [ ] **Profile & KYC** – Open Profile → Verify my identity. Upload an image (JPEG/PNG under 5MB). Submit. Status shows “pending” (or success if backend returns it). After admin approves (see Admin), refresh Profile and see “verified” (or check notifications).

---

## 3. Agent flow

- [ ] **Dashboard** – Agent dashboard shows stats and “My Portfolio” (or empty state). “Boost your reach” CTA opens Boost page.
- [ ] **Boost** – Open Boost, select an active listing (if any), click “Start campaign”. Toast and redirect to dashboard.
- [ ] **Listings** – Listings page shows Active/Drafts/Sold tabs. Create a new listing (draft), then submit for review. Listing appears in admin Moderation Queue as “New Listing”.
- [ ] **Verification** – Agent Verification: EARB number save works. Upload evidence (agent verify) and/or business docs (business verify). Submissions appear in admin Moderation Queue.

---

## 4. Admin flow

- [ ] **Moderation Queue** – Admin Verification page shows one table. Rows can include: Agent Verify, New Listing, KYC Verify, Business Verify. Expand a row to see details (EARB, evidence, etc.).
- [ ] **Resolve actions** – For one item: click Approve or Reject (step-up may be required). Queue refreshes; item disappears or status updates. User/agent receives in-app notification (check Notification bell).
- [ ] **Listings** – Admin Listings: pending listings appear. Approve or reject one. Agent sees notification.

---

## 5. Pay portal (if enabled)

- [ ] **Pay login** – Open Pay portal, log in with same user. Dashboard loads.
- [ ] **Initiate payment** – Start a payment (e.g. viewing fee or property). Choose M-Pesa or card. For M-Pesa (mock), confirm flow; for card, Stripe form appears if configured. Error message shows clearly on failure with “try again” hint.
- [ ] **Already bought** – If a listing was paid (property/rent), Pay dashboard “Already bought / let” section shows it; listing no longer appears in Explore for that user.

---

## 6. Quick API checks (optional)

- [ ] `GET /api/health` – Returns 200.
- [ ] `GET /api/admin/moderation/queue` with admin token – Returns 200 and array.
- [ ] `GET /api/user/kyc` with user token – Returns 200 and `{ status, evidence }`.

---

## Sign-off

- **Date:** _______________
- **Environment:** _______________
- **Notes:** _______________

For full flow description, see **`docs/PROTOTYPE_FLOWS.md`**. For deployment env and DB, see **`docs/DEPLOY.md`** and **`docs/DEPLOYMENT_CHECKLIST.md`**.
