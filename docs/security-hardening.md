# Security Hardening (phase 1–3)

This file tracks the first wave of controls requested (items 1–3: zero trust access, runtime hardening, transaction integrity). All changes are implemented in-code where possible and gated by environment variables.

## Zero Trust & Initial Access
- Pay portal step-up remains enforced on admin actions (`requireStepUp` middleware).
- New velocity limits on pay portal initiation:
  - `PAY_TX_MAX_PER_HOUR` (default 10) caps transactions per user per rolling hour.
  - `PAY_TX_MAX_AMOUNT_DAY` (default 250000) caps per-user daily KES volume.
- Audit trail on pay initiation (`pay_initiate`) writes to `AuditLog`.

## Runtime Hardening
- Containers run non-root:
  - Frontend `Dockerfile` now switches to user `app`.
  - Backend `server/Dockerfile` switches to user `app` and exposes 4000.
- Read-only root FS + seccomp/AppArmor should be set at deploy time (compose/k8s), see TODOs.

## Transaction Integrity
- Dual control (four-eyes) for high-value admin actions in pay portal:
  - Threshold: `PAY_DUAL_CONTROL_AMOUNT` (default 50,000).
  - First approver records intent; second distinct approver finalizes `resolve` or `refund`.
  - UI now shows “waiting for a second approver” when applicable.
- Stale pending auto-fail:
  - Cron (`*/10 * * * *`) marks pay portal transactions pending longer than `PAY_STALE_MINUTES` (default 30) as `failed` and logs `pay_stale_fail`.
- Reconciliation screen still lists pending/failed; admins can resolve/refund after dual control.

## Network & API Security (phase 4)
- Admin & pay-admin IP allowlist enforced when `ADMIN_IP_ALLOWLIST` is set (except `*`):
  - Middleware `requireAdminIp` guards `/admin/*` and `/api/pay/admin/*`.
- Admin rate limit: `adminLimiter` now wraps all `/admin/*` routes.
- Next steps (deploy-time): terminate TLS with mTLS at the edge / gateway; add WAF/RASP in front of `/api`.
- Admin step-up: `POST /api/auth/step-up` verifies `ADMIN_STEP_UP_CODE` and stamps the auth session (`stepUpVerifiedAt`). High-risk admin routes now require fresh step-up via middleware `requireAdminStepUp`.
- Admin MFA (TOTP): `/api/auth/mfa/setup|enable|disable` for admins; login and step-up accept TOTP or recovery codes when enabled.
- Canary endpoint: `/api/canary/transaction` logs an audit event (`canary_hit`) for any caller (auth required) to detect probing/abuse.
- Audit forwarding: set `AUDIT_WEBHOOK_URL` to mirror audit events to an external sink (e.g., SIEM, WORM storage).

## Monitoring & Detection (phase 5)
- Integrity canary: cron (`*/15 * * * *`) flags any `paid` pay portal transactions without a `receiptId`, logs `pay_receipt_missing` to `AuditLog`.
- Stale pending cron (above) also doubles as drift detector.
- Suggested (not yet implemented): ship audit logs to external WORM/SIEM; add UEBA/process anomaly alerts via EDR.
- FIM: Place file integrity monitors on `/server/dist`, `/server/.env*`, `/server/uploads`, `/logs`; alert on modifications outside deploy windows. Keep EDR enabled on hosts and alert on new child processes (`node` spawning shell, `.jar` execution).

## Ops checklist
- Set these in `.env` (copied from `.env.example`):
  - `ADMIN_STEP_UP_CODE`, `PAY_STEP_UP_CODE`, `PAY_TX_MAX_PER_HOUR`, `PAY_TX_MAX_AMOUNT_DAY`, `PAY_DUAL_CONTROL_AMOUNT`, `PAY_STALE_MINUTES`.
- When deploying:
  - Add `read_only: true`, `no-new-privileges: true`, and seccomp/AppArmor profiles to your runtime spec.
  - Keep EDR enabled on hosts; alert on new `.jar`/`.class` or unexpected `node` children.

## Open TODOs
- Main app admin MFA/step-up (non-pay) endpoints.
- mTLS + WAF/RASP at the edge.
- Immutable external log sink (S3/WORM, SIEM).
- Real-time ledger-to-gateway reconciliation with provider callbacks.
