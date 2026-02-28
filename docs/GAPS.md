# Zeni — Gaps and “Not Yet” Checklist

Use this doc to track what’s still missing or to finish before calling the prototype “done”.

---

## 1. Prototype completion (from PROTOTYPE_FLOWS.md §8)

- [ ] **One full pass** — Log in as user → explore → message from a listing → open Messages; then as agent reply; then as admin check Verification + Listings. Fix anything that breaks or feels wrong.
- [ ] **Env for Kenya** — Set `ADMIN_EMAIL`, `ZENI_AGENT_EMAIL`, `ZENI_SUPPORT_EMAIL` (and optional `SEED_PASSWORD`) in `server/.env`; run `npm run seed` so DB matches.
- [ ] **Clear “done” criteria** — Define what “prototype done” means (e.g. “all three roles can do their main flow without errors,” or “demo-ready by date Y”) and tick those off.
- [ ] **Anything you’re unhappy with** — Note specific screens, flows, or copy that still feel off so they can be fixed next.

---

## 2. Code / product gaps (fixed)

| Gap | Where | Status |
|-----|--------|--------|
| **Pay Profile — email/phone** | `src/pay/pages/PayProfile.tsx` | Fixed: shows user name/role; note that email/phone are in main app. |
| **Pay Profile — Password tab** | `src/pay/pages/PayProfile.tsx` | Fixed: note that password is changed in main app. |
| **Message attachments** | Thread + backend | Fixed: `POST /upload/chat-image`; Thread attach button; type `attachment` with `{ url, name }`; MessageBubble/Thread render images and links. |
| **Social login (Facebook / Twitter)** | `src/pages/auth/AuthPage.tsx` | Fixed: placeholder buttons removed; only Google sign-in shown when configured. |

---

## 3. Testing and release (from test-plan.md)

- [ ] **Exit criteria** — 0 open P0/P1; critical e2e journeys pass; security checks pass (step-up, dual-control, rate limits, audit); performance targets met or waived.
- [ ] **E2E coverage** — User: register → browse → save listing → message agent; Agent: submit listing; Admin: approve listing/suspend user/export; Pay: initiate → receipt; Pay admin: dual-control resolve/refund.
- [ ] **Security gate** — Step-up enforced, dual-control (initiator ≠ approver), suspended users blocked, rate limits and audit logging verified.

---

## 4. Done criteria (prototype “done” when all are ticked)

- [ ] All three roles (user, agent, admin) can complete their main flow without errors.
- [ ] One full pass: user explore → message from listing → agent reply → admin Verification + Listings.
- [ ] Kenya env set and seed run; demo accounts work.
- [ ] 0 open P0/P1; security gates (step-up, dual-control, audit) pass.
- [ ] E2E smoke test(s) pass (see `docs/test-plan.md`).

## 5. Optional / later

- Redis (or similar) for listing search cache.
- Full S3/Cloudinary production setup if not already in use.
- Facebook/Twitter OAuth when required.
- Chat: non-image attachments (e.g. PDF) if needed.

---

When you close a gap, tick the checkbox or update the table and add a short “Fixed: …” note and date so the doc stays useful.
