# Zeni Staging Certification Plan

Date: 2026-06-04 (Africa/Nairobi)
Target branch: `codex/local-pc-release-certification`
Target commit SHA: record the exact clean local-source candidate commit after commit/push
Promotion rule: **No production promotion until every P0 row has evidence and sign-off.**

## Stage 0: Candidate Integrity

- Deploy only the exact reviewed pull-request commit SHA to staging.
- Record the frontend deployment ID, backend deployment ID, commit SHA, environment name, operator,
  reviewer, and test time.
- Confirm the deployed source contains no tracked uploads, Playwright reports, test results,
  coverage, logs, screenshots, local databases, or unreviewed recovery scripts.
- Confirm `npm ci` and `npm --prefix server ci` use the committed lockfiles under Node 20.
- Confirm staging secrets are provisioned through the deployment secret store:
  `MONGO_URI`, `JWT_SECRET`, `VERIFICATION_DOCUMENT_ENCRYPTION_KEY`, strict admin/pay step-up
  configuration, API/socket/CSP allowlists, provider webhook secrets, and deliberate
  `PAYMENTS_ENABLED` state.
- Confirm staging admin step-up is strict. No development/test loose-code behavior is allowed.

## Stage 1: Automated Gates

| Check            | Required evidence                                                            | P0/P1 |
| ---------------- | ---------------------------------------------------------------------------- | ----- |
| Frontend CI      | `npm run format:check`, lint, TypeScript validation, tests, production build | P0    |
| Backend CI       | lint, build, tests against isolated MongoDB                                  | P0    |
| Playwright E2E   | report attached to the reviewed SHA, no skipped critical flows               | P0    |
| Release hygiene  | clean Git status, generated artifact exclusion, `git diff --check`           | P0    |
| Dependency audit | production high/critical audit results and reviewed tooling advisory         | P1    |
| Header/CSP tests | automated assertions and captured staging response headers                   | P0    |

## Stage 2: Functional Certification

Use non-production test identities and provider sandboxes only. Capture evidence for every row.

| Flow                            | Acceptance criteria                                                                                                                                                    |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registration and login          | Ordinary user registration works; privilege cannot be requested; login creates the expected session.                                                                   |
| Refresh, logout, expiry         | Refresh rotates; old-token reuse fails closed; logout clears state; expired/revoked sessions fail safely.                                                              |
| Password reset                  | Single-use reset completes and prior sessions are revoked.                                                                                                             |
| MFA and admin step-up           | Enrollment and recovery work; recovery values are not stored raw; protected admin actions fail without step-up.                                                        |
| Browse, search, detail          | API-backed listings display; backend outage shows honest retry state; no production mock inventory appears.                                                            |
| Neighborhood and map            | Rent/buy routes query the correct purpose; outage is not presented as empty live inventory.                                                                            |
| Listing creation and moderation | Authorized agent submits; moderator decision is audited; unauthorized users cannot publish.                                                                            |
| Viewing scheduling              | Create/update/view authorization is correct and notifications do not expose private data.                                                                              |
| Messaging                       | Participant authorization, thread loading, send deduplication, and outage behavior are verified.                                                                       |
| KYC upload and private review   | Allowed file uploads return no public URL; invalid MIME/type/size fail; owner raw retrieval fails; stepped-up admin review creates an access log.                      |
| Agent verification              | Agent identity and business evidence remain private; safe status and moderation paths work.                                                                            |
| Privileged identities           | Consumer email domains cannot provision admin; explicit grant/revoke is audited; revoked sessions lose access.                                                         |
| Payments disabled               | `PAYMENTS_ENABLED=false` rejects initiation safely.                                                                                                                    |
| Payments enabled                | Supported sandbox provider only: KYC gate, valid/invalid signature, duplicate webhook, deterministic receipt, duplicate refund, and failed-payment state are verified. |

## Stage 3: Reliability and Security Exercises

- Invoke `GET /health`; require HTTP 200 and JSON-only liveness response.
- Invoke `GET /ready` with the database available and unavailable; require JSON `ready` or
  `degraded` response and the correct status code.
- Simulate backend sleep/unavailability, timeout, and upstream HTML; require a safe API client
  error, bounded user feedback, actionable retry, and no displayed fake live inventory.
- Inspect production-mode `Content-Security-Policy`: no wildcard `connect-src`, no broad `http:` or
  `https:` connectivity, and only approved frontend/API/socket/media/auth/payment origins.
- Verify `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, framing policy, and HSTS
  where applicable.
- Attempt public access to new verification content and known legacy local sensitive paths; require
  denial.
- Verify tokens, reset links, verification URLs/content, payment signatures, and secrets are not
  logged.
- Generate controlled frontend and backend exceptions; verify Sentry capture, environment, release
  SHA, and redaction.
- Verify metrics access and readiness/5xx alert routing.

## Stage 4: Legacy KYC Migration Gate

- Execute `LEGACY_KYC_EXPOSURE_AUDIT.md` from an access-controlled production operations
  environment.
- Inventory all existing public verification/KYC URLs.
- Migrate retained evidence to private storage.
- Revoke or delete public provider assets.
- Independently retest every former public URL.
- Attach privacy reviewer and release owner sign-off.

Any unresolved exposed document keeps the decision **NO-GO**.

## Rollback Plan

1. Record the prior approved frontend and backend deployment identifiers before staging promotion.
2. Keep `PAYMENTS_ENABLED=false` unless the payment certification row is explicitly being tested.
3. If a P0 regression is found, stop payment and identity-sensitive testing and restore the prior
   approved deployments.
4. If document exposure is found, revoke affected media immediately, suspend new KYC processing,
   preserve restricted audit evidence, and follow the incident-response runbook.
5. Record the cause, affected data, rollback time, operator, and corrective action before another
   candidate is accepted.

## Production Promotion Checklist

- Clean reviewed commit and green CI/E2E evidence attached.
- Exact reviewed SHA deployed and certified in staging.
- Staging topology matches intended production origins, API proxy, sockets, and provider behavior.
- New private verification-document boundary verified.
- Legacy public verification URL inventory migrated/revoked and independently signed off.
- Authentication, admin step-up, privileged role revoke, and CSP/security headers signed off.
- Payment configuration deliberately enabled or disabled; supported provider readiness and
  reconciliation ownership verified.
- Monitoring alerts, on-call owner, incident contact, rollback owner, and SLO measurement assigned.
- Security/privacy reviewer and release owner approve a documented GO decision.
