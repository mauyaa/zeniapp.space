# Zeni Real Estate Platform — Critical Implementation Checklist

This document maps the **critical success elements** for the Zeni platform to the codebase and confirms implementation status for 2026 deployment.

---

## 1. Security & Auth

| Requirement | Implementation | Location |
|-------------|----------------|----------|
| **JWT for API auth** | JWT verified on every protected route; `sub` = user id. | `server/src/middlewares/auth.ts` |
| **OAuth 2.0 / Google** | Google OAuth sign-in; JWT issued after `findOrCreateUserFromGoogle`. | `server/src/controllers/auth.controller.ts` (POST `/auth/google`), frontend `GoogleSignInButton` |
| **Password hashing (bcrypt)** | Passwords hashed with bcrypt (10 rounds) on save; `comparePassword` for login. | `server/src/models/User.ts` |
| **RBAC (user / agent / admin)** | `requireRole(roles)` middleware; routes gated by role. | `server/src/middlewares/rbac.ts`, used in listing, admin, pay, upload routes |

**Testing gates**: Auth integration tests in `server/tests/`; step-up and role checks in `admin.test.ts`, `idor.test.ts`.

---

## 2. Role-Based Access Control (RBAC)

| Role | Capabilities | Enforced In |
|------|--------------|-------------|
| **User** | Browse listings, save/favorites, message agents, pay (own). | Listing search (public + auth for save); chat; pay portal. |
| **Agent** | CRUD own listings only; upload images; messages. | `listing.service.ts`: `updateListing(agentId, id, data)`, `getAgentListing(agentId, id)` — filter by `agentId`. |
| **Admin** | Users, verification, listings moderation, reports, audit, exports, pay accounts. | `admin.routes.ts`: `requireRole(['admin'])`; sensitive actions use `requireAdminStepUp()`. |

---

## 3. Trust & Safety

| Feature | Implementation | Location |
|---------|----------------|----------|
| **Admin-verified agent badges** | `User.agentVerification` (pending/approved/rejected); only verified agents can list. | `server/src/models/User.ts`; auth blocks unverified agents; `AdminVerificationPage` |
| **Listing verification** | `Listing.verified`; admin approves via verification queue. | `server/src/models/Listing.ts`; `admin.service.ts` — `verifyListing`; Explore filter `verifiedOnly` |
| **Listing moderation queue** | Pending listings and agents; admin approve/reject. | `GET /admin/verification/listings`, `GET /admin/verification/agents`; `AdminVerificationPage` |
| **Audit log** | All sensitive actions write to `AuditLog`; optional webhook forward. | `server/src/utils/audit.ts`; `AuditLogModel`; `GET /admin/audit`; `AUDIT_WEBHOOK_URL` |

---

## 4. Listing Management

| Requirement | Implementation | Location |
|-------------|----------------|----------|
| **Full CRUD for agents** | Create, read, update, delete (soft delete to archived) for own listings only. | `server/src/services/listing.service.ts` — all take `agentId` and filter by it. |
| **Agents modify only own listings** | Every mutation uses `{ _id, agentId }` filter. | `updateListing`, `deleteListing`, `getAgentListing`, `listAgentListings` |

---

## 5. Media Handling

| Requirement | Implementation | Location |
|-------------|----------------|----------|
| **Store only URLs in MongoDB** | Listings store `images: [{ url, isPrimary }]` — no binary in DB. | `server/src/models/Listing.ts` |
| **External cloud (Cloudinary/S3)** | Optional Cloudinary upload when `CLOUDINARY_CLOUD_NAME` is set; otherwise local `/uploads/`. | `server/src/routes/upload.routes.ts`; `server/src/services/cloudinary.service.ts` (optional) |

For production: set Cloudinary (or S3) env vars so uploads go to cloud and saved URLs are public CDN URLs.

---

## 6. Search & Performance

| Requirement | Implementation | Location |
|-------------|----------------|----------|
| **MongoDB geospatial** | `location: '2dsphere'` index; queries use `$geoWithin` with `$centerSphere`. | `server/src/models/Listing.ts`; `listing.service.ts` — `searchListings` |
| **Pagination** | `page`, `limit`, `skip` on all list endpoints; max limit capped. | `server/src/utils/paginate.ts`; `buildPagination` in listing, chat, admin |
| **Filtered queries** | Price (min/max), location (city, area), property type, beds, baths, `verifiedOnly`, text `q`. | `server/src/services/listing.service.ts` — `ListingSearchQuery` |
| **Lightweight responses** | Projection in search to limit fields; lean() for read-only. | `listing.service.ts` — projection object |
| **Caching (optional)** | Short TTL in-memory cache for listing search to smooth mobile experience. | `server/src/services/listingCache.ts` (optional layer) |

---

## 7. Trust Indicators on Listings

| Requirement | Implementation | Location |
|-------------|----------------|----------|
| **Verification status visible** | `verified` on listing; Explore/Home/PropertyDetails show "Verified" badge; filter "Verified only". | Frontend: `Explore.tsx`, `ListingDrawer.tsx`, `PropertyDetails.tsx`, `VerifiedBadge.tsx` |

---

## 8. Messaging & Engagement

| Feature | Implementation | Location |
|---------|----------------|----------|
| **One-to-one messaging** | Conversations per listing+agent+user; threads with messages; admin can participate. | `server/src/services/chat.service.ts`; frontend `Thread.tsx`, `Inbox.tsx`; ZENI Agent / ZENI labels |
| **Favorites (saved listings)** | Toggle save; list saved; used in recommendations. | `SavedListing` model; `toggleSaveListing`; `/app/saved`, Explore/Home heart toggle |

---

## 9. Mobile-First UI

| Requirement | Implementation | Location |
|-------------|----------------|----------|
| **React + Tailwind** | Vite + React + TypeScript; Tailwind for layout and responsive design. | `src/**/*.tsx`; `tailwind.config.*` |
| **Responsive / mobile** | Breakpoints, touch-friendly controls, mobile nav. | Layouts and pages use Tailwind responsive classes; viewport meta. |

---

## 10. Payments & Financial Controls

| Requirement | Implementation | Location |
|-------------|----------------|----------|
| **Idempotency keys** | `Idempotency-Key` header required on payment initiation; duplicate key returns existing tx. | `server/src/controllers/payPortal.controller.ts`; `payPortal.service.ts` — `initiatePortalPayment` |
| **Dual-control for resolve/refund** | Above threshold (`PAY_DUAL_CONTROL_AMOUNT`): two distinct admins must approve; initiator cannot approve. | `resolveAdmin`, `refundAdmin` in `payPortal.controller.ts` |
| **Step-up for pay admin** | Pay portal admin resolve/refund require step-up verification. | `requireStepUp()` on `POST /admin/resolve/:id`, `POST /admin/refund/:id` in `pay.portal.routes.ts` |
| **Audit for payments** | Every initiate, resolve, refund, callback writes to `AuditLog`. | `payPortal.service.ts`, `payPortal.controller.ts` |

---

## 11. Admin Step-Up & Testing Gates

| Requirement | Implementation | Location |
|-------------|----------------|----------|
| **Step-up for sensitive admin actions** | Status change, delete user, verify agent/listing, exports, pay account status. | `server/src/middlewares/adminStepUp.ts`; `adminStepUpProtected` list; applied in `admin.routes.ts` |
| **Must-pass security gates** | Step-up enforced (403 + STEP_UP_REQUIRED); dual-control and idempotency covered by tests. | `docs/test-plan.md`; `server/tests/admin.test.ts`, `payPortal.test.ts` |

**Pre-2026 deployment**: Run full test suite; ensure step-up and pay dual-control tests pass; no P0/P1 open; audit logging and rate limits configured.

### Must-pass testing gates (from `docs/test-plan.md`)

- **Auth**: Login/refresh/logout; admin step-up required for sensitive routes (403 + `STEP_UP_REQUIRED` when missing).
- **Pay**: Idempotency-Key required on initiate; duplicate key returns existing transaction; dual-control resolve/refund (second approver required above threshold).
- **Listings**: Agent can only modify own listings; verification queue and audit entries created.
- **Audit**: Sensitive actions create audit log entries; optional forward to `AUDIT_WEBHOOK_URL`.
- **Rate limits**: Configured and enforced (login, pay, admin, reports).

---

## 12. Quick Reference — Env & Routes

- **Auth**: `JWT_SECRET`, `GOOGLE_CLIENT_ID` (for OAuth).
- **Admin**: `ADMIN_STEP_UP_CODE`, `ADMIN_IP_ALLOWLIST`, `ADMIN_DOMAIN`.
- **Pay**: `PAY_DUAL_CONTROL_AMOUNT`, `PAY_STEP_UP_CODE`, `PAY_TX_MAX_PER_HOUR`, `PAY_TX_MAX_AMOUNT_DAY`.
- **Audit**: `AUDIT_WEBHOOK_URL`, `AUDIT_TTL_DAYS`.
- **Media**: `CLOUDINARY_CLOUD_NAME` (+ API key/secret) for cloud uploads; else local uploads.

All items in this checklist are implemented in the codebase; optional enhancements (e.g. Redis for search cache, full S3/Cloudinary integration) are noted where applicable.
