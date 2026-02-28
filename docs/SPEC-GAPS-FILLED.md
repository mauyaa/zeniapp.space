# Zeni Specification — Gaps Filled (Best Practice)

This document fills the identified gaps across roles/auth, listings, viewings, messaging, payments, admin/audit, reliability, product experience, and legal/compliance. It is aligned with the current codebase and intended as the single source of truth for design decisions.

---

## 1) Roles, identity, and access control

### Role model clarity

- **One account = one role.** An account is either `user`, `agent`, `admin`, or `finance`. There is no dual User+Agent account.
- **No role switching.** A user who wants to act as both buyer and agent must register a separate account (different email/phone). This keeps RBAC simple, audit trails clear, and avoids confusion in messaging/viewings (e.g. “conversation with listing owner” is unambiguous).
- **Enforcement:** Registration accepts optional `role`; only `user` and `agent` are self-serve. `admin`/`finance` require `ALLOW_PRIVILEGED_SIGNUP=true` and email in `ADMIN_DOMAIN`. Agent login is blocked until `agentVerification === 'verified'`.

### RBAC / ABAC — step-up for sensitive actions

Step-up (MFA or `ADMIN_STEP_UP_CODE`) is required for the following. Session-level step-up expires after **10 minutes**; re-step-up required after that.

| Action | Route / scope | Notes |
|--------|----------------|-------|
| Ban/suspend user | `PATCH /api/admin/users/:id/status` | Step-up required |
| Delete user | `DELETE /api/admin/users/:id` | Step-up required |
| Approve/reject agent verification | `PATCH /api/admin/verification/agents/:id` | Step-up required |
| Approve/reject listing verification | `PATCH /api/admin/verification/listings/:id` | Step-up required |
| Export reports | `GET /api/admin/reports/export` | Step-up required |
| Export agents | `GET /api/admin/agents/export` | Step-up required |
| Export listings | `GET /api/admin/listings/export` | Step-up required |
| Change pay account status | `PATCH /api/admin/pay/accounts/:userId/status` | Step-up required (M-Pesa/payout impact) |

**To add (recommended):**

- **Refund** — Already requires second approver for amounts ≥ `PAY_DUAL_CONTROL_AMOUNT`; consider also requiring Pay portal step-up for any refund initiation by admin/finance.
- **Bulk export / data export** — Any admin export of PII (e.g. full user export) should be behind step-up; add to `adminStepUpProtected` when implemented.
- **Payout / M-Pesa settings** — Changing payout configuration or M-Pesa credentials (if ever exposed in admin UI) should require step-up.

### Session strategy

- **Access token:** JWT, short-lived (e.g. 7d in code; consider 15–60 min in production), signed with `JWT_SECRET`, payload: `sub`, `role`, `sid` (session id).
- **Refresh token:** Opaque, stored hashed in `AuthSession`, 14-day TTL; `path: '/api/auth'`, `httpOnly`, `secure` in production, `sameSite: 'lax'`.
- **Rotation:** Each refresh issues a new refresh token and invalidates the previous one (rotation on use).
- **Password reset:** All sessions for that user are revoked (`revokeAllSessionsForUser`) on successful reset; reset token is single-use and time-limited (1 hour).
- **“Logout all devices”:** `POST /api/auth/sessions/revoke-all` revokes all sessions for the current user and clears the refresh cookie.
- **Device list:** `GET /api/auth/sessions` returns sessions with `userAgent`, `ip`, `createdAt`, `lastUsedAt`, `stepUpVerifiedAt`, `expiresAt`. User can revoke individual session via `DELETE /api/auth/sessions/:id`.
- **Token theft:** If a refresh token is reused after rotation, treat as suspicious: revoke that session and optionally revoke all sessions for the user and require re-login (current code rotates only; consider adding detection and full revoke in production).

### Google Auth edge cases

- **Linking Google to existing email/password account:** Not supported. `findOrCreateUserFromGoogle` only finds by email or creates a new user with a random password. To support “link Google to existing account,” add a flow: user logged in with email/password → “Link Google” → verify id token email matches `user.email` → set `user.googleId` and allow future Google sign-in for that account.
- **Duplicate emails:** Enforced. One email = one account. If Google returns an email that already exists (email/password or another Google), that existing user is used for login (no second account). No duplicate emails across providers.
- **Unverified Google email:** Google’s `verifyIdToken` does not guarantee email_verified. If you need to enforce verified email, check `payload.email_verified === true` and reject with `EMAIL_NOT_VERIFIED` otherwise. Currently the code does not check this; add if required by policy.

---

## 2) Listings + data model completeness

### Geo & map

- **Coordinate storage:** Listings use GeoJSON `Point`: `location: { type: 'Point', coordinates: [lng, lat], address?, city?, area? }`. Order is **[longitude, latitude]** (GeoJSON standard).
- **Geospatial index:** `ListingSchema.index({ location: '2dsphere' })` is present; use for radius and geometry queries.
- **Radius search:** Supported via `$geoWithin` and `$centerSphere`. Example: `radiusKm` from query, `distance = radiusKm/6378.1` (Earth radius in km). Query params: `lat`, `lng`, `radiusKm`.
- **Bounding box:** Not in code yet. To add: accept `minLng`, `minLat`, `maxLng`, `maxLat` and use `$geoWithin: { $box: [[minLng, minLat], [maxLng, maxLat]] }` (or `$geometry` with Polygon). Ensure 2dsphere index supports the chosen operator.
- **Clustering:** Not implemented. For map clustering, options: (1) server-side aggregate by grid (e.g. geohash or tile) and return counts + representative points; (2) client-side clustering (e.g. Supercluster) from a bounded payload of points. Prefer server-side for large datasets and pagination.
- **Pagination:** Listings search uses `buildPagination(query)` (page/limit/skip). Geo queries should use the same; cap `limit` (e.g. 50) and return `total` via `countDocuments` with the same filter (consider cached count for performance).

### Listing lifecycle

- **Statuses:** `draft` → `pending_review` → `live` | `rejected` | `archived`.
  - **draft:** Agent-only; not visible in search.
  - **pending_review:** Submitted for admin review; not visible in public search.
  - **live:** Admin-approved; visible in explore/search.
  - **rejected:** Admin rejected; store `rejectionReason` and optional `rejectionCode` (e.g. `photo_quality`, `missing_docs`, `policy_violation`).
  - **archived:** Agent or system; no longer visible; can be restored to draft.
- **Transitions:** Only admin can set `pending_review` → `live` or `rejected`. Agent can submit draft → `pending_review`, and can archive live/draft. Define allowed transitions in a small state machine and enforce in controller.
- **Reason codes:** Add `rejectionReason?: string` and `rejectionCode?: string` to Listing model; admin sets these on reject. Resubmission: agent edits listing and resubmits (e.g. back to `pending_review` from `rejected`).

### Availability & inventory

- **“Available” while viewings pending:** Yes. A listing is considered available for discovery and viewing requests while it is `live`. Viewing requests do not change listing availability by default.
- **Under offer / sold / let:** Not in current model. Add optional `availabilityStatus?: 'available' | 'under_offer' | 'sold' | 'let'` to Listing. When set to anything other than `available`, keep listing visible but show badge and optionally exclude from “available only” filters. Only agent (or admin) can set this; consider step-up or audit for `sold`/`let` if it triggers financial flows.

### Media rules

- **Image/video limits:** Define in constants, e.g. max 15 images, 2 videos (or 1); max size per file (e.g. 10 MB image, 50 MB video). Enforce in upload API and in listing update (count/length).
- **Ordering:** `images[]` has `isPrimary`; one primary. Order of array = display order. Support reorder via `PATCH` (replace array or send `imageOrder: [id1, id2, ...]`).
- **Moderation:** Optional: run uploads through a moderation API (e.g. Cloudinary mod or third-party); store `moderationStatus` and block publish until passed.
- **Cloudinary:** Use Cloudinary transforms for thumbnails and responsive sizes (e.g. `w_400,c_fill`). Store public_id or stable URL so transforms can be applied consistently.
- **Broken references on delete:** On Cloudinary delete (or listing delete), remove references from Listing documents and from any caches. If listing is deleted, remove or reassign media references so no orphan URLs are shown.

### Duplicate / fraud controls

- **Same agent:** Before creating or going live, check for very similar listings (same agent): e.g. same title + same location coordinates (or within small radius). Flag or block duplicate and surface “Possible duplicate” in admin.
- **Across agents:** Same approach with no agent filter: e.g. same normalized title + same city/area + same price band. Store a lightweight hash (e.g. title + city + price bucket) and query for duplicates; flag for admin review rather than auto-block.

---

## 3) Viewings workflow (high-impact)

### Scheduling semantics

- **Time zone:** All times stored in UTC; display in EAT (UTC+3) in the UI. Store `date` as Date (or ISO string) and optionally `timezone: 'Africa/Nairobi'` for the slot.
- **Lead time:** Minimum lead time (e.g. 24 hours) between “now” and requested slot. Reject requests that are too soon with a clear message.
- **Reschedule/cancel:** User can cancel before a cutoff (e.g. 12 hours). Agent can reschedule (same or new slot) or decline with reason. Define cutoffs in config; after cutoff, cancellation may still be allowed but marked “late cancel” for analytics.
- **No-show:** After slot end, if status is still `confirmed`, agent can mark “no-show”. Add status `no_show` and optionally allow agent to set it via `PATCH`; use for agent analytics and possible future penalties or reminders.

### Conflict handling

- **Agent calendar:** No built-in calendar yet. Recommend: an `AgentAvailability` or slot model (recurring or one-off blocks) and validate that requested `date` falls in an available slot; otherwise return “Agent not available at this time.”
- **Max daily viewings:** Configurable cap per agent per day (e.g. 8). When confirming, check count of confirmed viewings for that agent for that day; reject if at cap.
- **Overbooking:** Uniqueness is per (agent, date, timeSlot). If you use discrete slots (e.g. 30 min), add a unique index or check so the same slot cannot be confirmed twice.

### Status model

- **Current:** `requested` | `confirmed` | `declined`.
- **Recommended full lifecycle:** `requested` → `accepted` (agent tentatively accepted) → `confirmed` (user or system confirmed) → `completed` | `canceled` | `no_show`. Or keep simpler: `requested` → `confirmed` | `declined`; add `completed`, `canceled`, `no_show` for post-slot state.
- **Who can transition:** User: cancel (→ `canceled`). Agent: accept/confirm (→ `confirmed`), decline (→ `declined`), mark no-show (→ `no_show`). System: auto-complete after slot end (→ `completed`). Enforce in controller by role and current status.

### Notifications

- **Channels:** Email and in-app (Socket.IO) are in use. SMS/WhatsApp/push are optional; design a **pluggable notification layer** (e.g. `NotificationService.send({ channel: 'email'|'sms'|'push', template, to, data })`) so new channels can be added without changing viewings logic.
- **Events:** Viewing requested, viewing confirmed/declined, viewing reminder (e.g. 24h before), viewing canceled, no-show. Each event triggers one or more notifications based on user/agent preferences.

---

## 4) Messaging: scope + safety + retention

### Conversation rules

- **Who can initiate:** User (role `user` or `admin`) can start a conversation with an agent. For property-specific chat, `listingId` is required and the agent must be the listing owner (or assigned agent). For general support, `listingId` is null and agent can be Zeni Agent / Zeni Support (seeded system agents).
- **Can users message any agent?** Only in context: (1) from a listing (listing’s agent), or (2) Zeni Agent / Zeni Support (no listing). No open “message any agent” directory to avoid spam. Agents can message back; admins can have support conversations.
- **Unique constraint:** `(listingId, userId, agentId)` unique so one conversation per (user, agent, listing) or (user, agent) for support.

### Moderation & abuse

- **Reporting:** Reports exist (`Report` model); use for messages/conversations (e.g. `entityType: 'message'`, `entityId`, category). Admin can review and take action (warn, suspend, delete message).
- **Blocking:** Add “block user” for agents (and optionally users): store blocked pairs and hide conversations / prevent new messages from blocked user.
- **Rate limits:** Apply `sendLimiter` (or a dedicated chat limiter) to `POST /api/chat/conversations/:id/messages` (e.g. 30/min per user). Stricter for unverified users if needed.
- **Spam protection:** Rate limit + optional content checks (e.g. duplicate message detection, link ratio). No attachments in current Message model; if added, restrict types (e.g. images only) and size, and scan for malware.

### Retention policy

- **How long:** Define retention (e.g. 24 months after last message). After that, conversations/messages can be anonymized or deleted for GDPR-style minimization.
- **Admin access:** Admins can view conversations for support/abuse; access should be audited (who viewed which conversation).
- **GDPR deletion:** On “delete my account” or “delete my data,” delete or anonymize user’s messages and conversations (and remove PII from other sides). Retention policy should be stated in privacy policy.

### Delivery guarantees

- **Offline / reconnection:** Socket.IO reconnects; client should refetch recent messages on reconnect and show “connecting” state. Messages sent while offline can be queued and sent when back online; dedupe by client-generated `tempId` or server `id`.
- **Dedupe:** Idempotency key or `tempId` on send; server returns existing message if same idempotency key.
- **Ordering:** Messages ordered by `createdAt`; use cursor-based pagination for consistency.
- **“Seen” semantics:** Message has `status: 'sending'|'sent'|'delivered'|'read'`. “Read” can be per-device (store last read timestamp per user per conversation and derive “read” for messages before that time) or global; document which you use.

---

## 5) Payments: the biggest “missing contract” area

### What is being paid for?

- **Invoice model** already has `purpose`: `booking_fee` | `deposit` | `subscription` | `boost` | `rent` | `service_fee`. Use these to drive accounting and reporting.
- **PayTransaction** is generic (amount, method, status); link to business context via `metadata` or a separate `Invoice` / `Order` reference. Recommended: add `invoiceId` or `purpose` + `referenceId` (e.g. listingId, viewingId) to PayTransaction so each payment is tied to a purpose. Then:
  - **Booking fee** — viewing or reservation.
  - **Deposit** — rental deposit.
  - **Subscription** — agent subscription.
  - **Boost / featured listing** — listing boost.
  - **Rent** — rent payment.
  - **Service fee** — platform fee.
- Each purpose may have different accounting (e.g. boost → revenue; rent → pass-through). Define mapping in pay service and reporting.

### Idempotency

- **Initiation:** `Idempotency-Key` header required; key is unique per user/operation. Same key returns existing transaction (201 with same body); no duplicate charge.
- **Callbacks:** M-Pesa callback may be retried. Today transition `pending` → `paid`/`failed` is guarded by `assertTransition` (so second callback with same status would throw). Make idempotency explicit: e.g. store `processedCallbacks: { providerRef }` or ensure “already paid” for same `providerRef` returns 200 without re-applying. Never apply success twice (no double credit).

### Reconciliation

- **Admin tools:** `reconcileAdmin` returns pending (stale) and recent failed transactions. Add: list M-Pesa transactions (from provider or your log) and match by `ref` / `providerRef` to PayTransaction. UI: side-by-side “internal vs provider” and “Match / Resolve / Flag.”
- **Partial / failed / timeout:** Resolve via admin resolve (mark `paid` or `failed`). For timeout, run `expireStalePortalTransactions`; for “paid on provider but not in DB,” use reconciliation to match and then resolve as paid (and create receipt if needed).

### Refunds & reversals

- **Who can trigger:** Admin or finance only; step-up recommended for refund.
- **Rules:** Only `paid` transactions can be refunded. Refund = status → `reversed`; optionally call M-Pesa reversal API and store result.
- **Dual control:** For amount ≥ `PAY_DUAL_CONTROL_AMOUNT`, two distinct approvers required (initiator cannot approve); already implemented.
- **Audit:** Every refund and resolve is audited (`pay_refund`, `pay_resolve`).
- **Limits:** Optional: max refund amount per day per user; or require step-up for refunds above X.

### Webhook verification

- **Signature:** Validate M-Pesa callback with `MPESA_CALLBACK_SECRET` (or provider’s signature scheme). Reject unsigned or invalid.
- **IP allowlist:** If provider publishes IPs, allow only those for callback URL.
- **Replay protection:** Store processed `providerRef` (or callback id) and reject duplicates.

### Ledger model

- **Current:** PayTransaction is append-only (status updates but no direct “balance” field). Good.
- **Recommended:** Keep transactions as immutable events; derive balances (e.g. per user or per pay account) from sum of transactions. Do not “update balance” in place; always derive from ledger. If you introduce wallets, implement as ledger + balance view.

---

## 6) Admin / audit / security hardening

### Audit log schema

- **Fields:** `actorId`, `actorRole`, `action`, `entityType`, `entityId`, `before`, `after`, `requestId`, `correlationId`, `ip`, `userAgent`, `createdAt`. Already in use.
- **Optional:** Add `deviceId` or fingerprint if available; keep PII out of `before`/`after` (redact with `redactPII` when forwarding).

### Rate limiting strategy

- **Global:** 300 (prod) or 5000 (dev) per 15 min per IP; skip `/health`.
- **Per route:** Auth login/register/forgot 35/15min; refresh 120/15min; send 30/min; pay STK 10/5min; pay login 10/15min; admin 40/min; reports 15/15min. Apply per identity where possible (e.g. login by email + IP) to limit brute force.
- **Chat:** Use send limiter or dedicated limit on message send.
- **Reset password:** Include in auth limiter; consider stricter per-email limit (e.g. 3/15min per email).

### File upload security

- **Content-type:** Validate `Content-Type` and magic bytes for images (e.g. JPEG/PNG/WebP). Reject executables and scripts.
- **Malware:** Optional virus scan (e.g. ClamAV or cloud scan) before persisting.
- **Signed upload URLs:** For direct-to-Cloudinary, use signed uploads (server generates signed URL with expiry); client uploads to Cloudinary, then sends public_id to API. Reduces server load and keeps API keys server-side.

### CSP & security headers

- **Baseline (current):** Helmet with CSP (default-src 'self'; script-src 'self'; style-src 'self' https: 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' + CORS origins + https:); report-uri `/csp-report`; HSTS in production; referrer no-referrer; frame-ancestors 'none'.
- **Report handling:** POST `/csp-report` accepts CSP report payload, validates structure, records audit `action: 'csp_report'`, returns 204. Do not expose report content to client; use for monitoring and tuning CSP.

### Secrets & config

- **Rotation:** JWT_SECRET: rotate by generating new secret, dual-running old+new (accept both) until all refresh tokens are re-issued, then drop old. M-Pesa keys: rotate in provider dashboard and update env; use new keys for new requests. SMTP: same as M-Pesa.
- **Environments:** Separate envs (dev, staging, prod); different JWT secrets, M-Pesa sandbox vs prod, and admin domains. Never use prod secrets in dev/staging.

---

## 7) Reliability / operations (deployable “for Kenya”)

### Observability

- **Structured logs:** Use request logger with `requestId`; log JSON with level, timestamp, requestId, correlationId, and minimal PII.
- **Metrics:** Prometheus registry; gauges/counters for pay, rate limits, etc.; expose `/metrics`.
- **Tracing:** Optional: OpenTelemetry or similar; propagate trace id in headers.
- **Error reporting:** Sentry for backend and frontend (SENTRY_DSN, VITE_SENTRY_DSN); tag by env and role where safe.
- **Uptime:** Health checks `/health` and `/health/ready` (e.g. DB + Redis if used); use for load balancer and monitoring.

### Background jobs

- **Queue:** Use BullMQ (or Bull) with Redis for: email sending, image processing (resize/optimize), payment reconciliation runs, notification dispatch. Prefer queue over inline to avoid timeouts and to retry.
- **Jobs:** Welcome email, viewing reminders, listing alert emails (from SavedSearch), pay receipt email, audit/log forwarding. Run cron or scheduler to enqueue these.

### Backups & restore drills

- **Mongo:** Automated daily backups (e.g. mongodump or provider backup); retain 30 days. Document restore steps; run restore drill quarterly to a staging DB.
- **Retention:** Align with data retention policy (e.g. 24 months for transactional data).

### Scaling Socket.IO

- **Sticky sessions:** Use sticky sessions (e.g. Nginx `ip_hash` or cookie-based) so same client hits same server when using in-memory adapter.
- **Redis adapter:** For multiple server instances, use `@socket.io/redis-adapter` so rooms and broadcasts work across nodes. No sticky required if using Redis adapter.

---

## 8) Product experience gaps

- **Saved searches + alerts:** SavedSearch model has `alertsEnabled` and `snoozeUntil`. Implement job: periodically (e.g. daily) run saved searches with `alertsEnabled` true and not snoozed; send email/push “New listings match your search” with link to search results.
- **Compare listings:** Add “Compare” (e.g. up to 4 listings); store in localStorage or user preferences; compare page shows side-by-side fields (price, beds, location, etc.). Optional but high value.
- **Affordability calculator:** Simple: monthly rent ≤ X% of income; input income + % (e.g. 30%), show max rent and list listings in range. Optional.
- **SEO (listing pages):** Vite SPA: listing pages are client-routed; for Google indexing use SSR (e.g. Vite SSR or migrate listing detail to a server-rendered route) or pre-render. Add OG tags (title, description, image) and sitemap (list of listing URLs). At minimum: meta tags and sitemap for homepage and key routes.
- **Accessibility:** Keyboard nav on map (focus markers, arrow keys), chat (focus message list, send with Enter). Color contrast WCAG AA; focus visible on interactive elements. Test with screen reader.
- **Localization:** Currency KES with locale formatting (e.g. `toLocaleString('en-KE')`); phone format for Kenya (e.g. +254…); addresses support county/sub-county in filters and listing form. Add `county`/`subCounty` to Listing location if needed.

---

## 9) Legal / compliance-lite

- **Terms & privacy:** Terms of service and privacy policy required; consent for messaging (stored content), stored IDs, and payment receipts. Record consent timestamp and version in user profile or consent table.
- **KYC / verified agent:** “Verified agent” = `agentVerification === 'verified'` after admin review of evidence. Define required docs (ID, license, or business reg); store in UserDocument or secure store with access control (only admin + that agent). Retention and deletion per policy.
- **Data deletion / export:** User export: provide “Download my data” (listings, messages, viewings, payments in machine-readable form). Delete account: anonymize or delete user, sessions, messages, and related PII; retain only what is legally required (e.g. transaction records for tax). Admin constraints: only designated roles can run export/delete; audit every export and delete.

---

## Summary table: step-up protected actions

| Action | Route | Implemented |
|--------|--------|-------------|
| User status (ban/suspend) | PATCH /api/admin/users/:id/status | Yes |
| User delete | DELETE /api/admin/users/:id | Yes |
| Agent verification | PATCH /api/admin/verification/agents/:id | Yes |
| Listing verification | PATCH /api/admin/verification/listings/:id | Yes |
| Export reports/agents/listings | GET .../export | Yes |
| Pay account status | PATCH /api/admin/pay/accounts/:userId/status | Yes |
| Refund (recommended) | Pay refund flow | Step-up recommended |
| Payout/M-Pesa settings | If added | Step-up required |

This document should be updated when new sensitive actions or payment purposes are added.
