# Deployment checklist (Moderation, KYC, Payments)

Use this with `docs/DEPLOY.md` when deploying staging or production.

---

## Database

- **No migration required** for User KYC and Business Verify. New User fields (`kycStatus`, `kycEvidence`, `businessVerifyStatus`, `businessVerifyEvidence`) have defaults; existing users get `kycStatus: 'none'` and `businessVerifyStatus: 'none'`.
- Ensure MongoDB is running and `MONGO_URI` is set before starting the API and before running `npm run seed`.

---

## Environment

- **Payments:** For card (Stripe) and M-Pesa, set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and M-Pesa vars in `server/.env` (see `server/.env.example` and `docs/PAYMENTS.md`).
- **Admin step-up:** In production set strong `ADMIN_STEP_UP_CODE` and `PAY_STEP_UP_CODE`; step-up is required for resolving Moderation Queue items (Agent/KYC/Business/Listing) and sensitive admin actions.
- **Uploads:** KYC and Business Verify use `/upload/image` (max 10MB server-side; frontend suggests 5MB). Allowed types: JPEG, PNG, WebP, GIF. Optional: Cloudinary for production storage.

---

## Before go-live

- [ ] `JWT_SECRET` is strong and unique; `NODE_ENV=production`.
- [ ] `CORS_ORIGIN` matches the frontend URL exactly.
- [ ] Seed run at least once (`npm run seed` in `server/`) so admin and Zeni Agent exist.
- [ ] Stripe webhook URL registered and `STRIPE_WEBHOOK_SECRET` set if using card payments.
- [ ] M-Pesa callback URL is publicly reachable and env set if using M-Pesa (see `docs/PAYMENTS.md`).
- [ ] Optional: run tests `cd server && npm test` (use a test DB or `SKIP_DB_TESTS=1` if no DB).
