# TEST PLAN — ZENI Property (MERN Online Real Estate Management System)

**System**: ZENI Property — MERN Online Real Estate Management System  
**Front-end**: Vite / React / TypeScript  
**Back-end**: Node.js / Express / MongoDB  
**Pay Portal**: `/pay/*` UI + `/api/pay/*` routes, dual-control admin flows  
**Version**: v1.0  
**Audience**: QA, Dev, DevOps, Product, Stakeholders  

## 1.0 Introduction
Defines the testing plan and procedures for the ZENI Property platform.

### 1.1 Goals and objectives
- Verify functional correctness of core user, agent, admin, and pay-portal workflows.  
- Prevent regressions in security controls (MFA/step-up, dual-control, rate limiting, audit logging).  
- Validate non-functional qualities: performance (page/API latency), reliability (error handling/retries), basic accessibility.  
- Provide traceable evidence (logs, reports, coverage) for release readiness.

### 1.2 Statement of scope
**In scope (representative)**  
- Auth: user/agent/admin auth, admin MFA/step-up, pay portal auth.  
- Listings: browse/search/filter, details, save/favorite, alerts, agent submissions, admin verification.  
- Messaging: conversations list, read/unread, send/receive.  
- Admin console: user management, listing verification, exports, insights/rate metrics.  
- Pay portal: login, initiate payment, callback handling (mocked), receipts, dual-control resolve/refund, insights.  
- Security controls: rate limiting, IP allowlist, step-up enforcement, audit logging, canary endpoint audit, CSP report handling (`/csp-report`).  

**Out of scope**  
- Live MPesa gateway (mocked only), external email/SMS delivery quality.  
- Pixel-perfect UI across all browsers beyond major latest releases; mobile native apps (web only).

### 1.3 Major constraints
- MongoDB test data seeded via `server/scripts/seed.ts`; payment callbacks mocked.  
- Test env mirrors prod config but without external MPesa/bank connections; TLS termination may be offloaded.  
- TypeScript 5.9.x exceeds eslint-plugin tested range; lint warnings accepted.

## 2.0 Test Plan

### 2.1 Software to be tested
- Front-end: Vite React app (`src/**/*`)  
- Back-end: Express API (`server/src/**/*`)  
- Pay Portal: `/pay/*` UI + `/api/pay/*` routes  
- Exclusions: legacy/non-used scripts, downloaded sample assets.

### 2.2 Test levels and strategy

#### 2.2.1 Unit testing
**Target**: pure functions and isolated logic (password/auth helpers, pay portal helpers, TOTP utils, recommendation helpers, metrics helpers).  
**Tooling**: Jest + ts-jest (back-end); minimal component unit tests for logic-heavy UI.  
**Success criteria**: correct outputs across valid/invalid inputs; no unhandled exceptions.

#### 2.2.2 Integration testing
**Target**: API endpoints with `mongodb-memory-server` + `supertest`.  
Emphasis: auth + step-up, pay flows (initiate/callbacks/resolve/refund with dual-control), listings verification/admin actions, rate-limit behavior & metrics, audit logging hooks.  
**Order**: auth → user/admin core → pay portal/dual-control → listings/messaging.

#### 2.2.3 Validation testing
**API contract**: supertest + Zod schema assertions.  
**UI smoke & regression** (Playwright/Cypress): register/login; browse + save listing; message agent; agent submit listing; admin approve listing; pay initiate + receipt; dual-control resolve/refund.  
**Accessibility**: quick axe/Lighthouse a11y smoke on key pages.  
**Browser matrix**: Chrome latest, Firefox latest (desktop); responsive viewport checks.

#### 2.2.4 System / high-order testing
- **Recovery**: restart API/DB during in-flight requests; verify idempotency on pay initiate (Idempotency-Key).  
- **Security**: step-up/MFA enforcement, dual-control approvals, canary endpoint audit, CSP report-only logging, IP allowlist, rate limits.  
- **Stress**: burst traffic on `/api/pay/transactions/initiate` and `/api/auth/login`.  
- **Performance targets**: API p95 < 500ms for core CRUD (seeded data); pay dashboard load < 2s; under stress p95 < 1s without duplicates/data loss.  
- **UAT**: guided scenarios with admin/agent/user on staging; sign-off checklist.

### 2.3 Entry and exit criteria
**Entry**: build deploys to test/staging; seed script succeeds; mock MPesa callback available; env vars set (rate limits, audit/CSP/IP allowlist).  
**Exit**: 0 open P0/P1; critical e2e journeys pass; security checks pass (step-up/dual-control/rate limits/audit); performance targets met or waived; test reports/logs attached to release.

### 2.4 Risks and mitigations
- Mocked payments diverge from prod edge cases → broaden simulator + idempotency tests.  
- Flaky e2e from async UI/events → stable selectors, explicit waits, limited retries.  
- Rate limits hit by CI → separate buckets or bypass keys for CI.  
- Audit log growth → capped collections/rotation for long runs.

### 2.5 Testing resources and staffing
- QA: e2e/regression/reporting.  
- Backend dev: API unit/integration, contracts.  
- Frontend dev: UI stability, selectors.  
- DevOps: staging/CI/monitoring.  
- Ops on-call: during stress/recovery.

### 2.6 Test work products
- Test cases (Playwright/Cypress, Jest/ts-jest).  
- Seeded datasets (users/listings/pay txs).  
- Execution reports (junit/xml), coverage, defect logs.  
- Perf/stress artifacts (k6/Artillery if used), p95 dashboards, logs.  
- UAT sign-off.

### 2.7 Test record keeping
- CI artifacts per run (junit/xml, coverage, logs).  
- Manual log: tester, date, scenario, result, build ID, defects.  
- Audit logs retained in Mongo and forwarded when configured.

### 2.8 Test metrics
- Coverage (line/branch) unit/integration.  
- Pass/fail counts.  
- Endpoint p95 latency (normal + stress).  
- Defect density, MTTR.  
- Rate-limit hits (`rate_limit_hits_total`).  
- Pay status gauges during tests (initiated/confirmed/failed).

### 2.9 Tools and environments
- Tools: Jest/ts-jest, supertest, mongodb-memory-server, Playwright/Cypress, eslint, Docker; Prometheus/Grafana optional; k6/Artillery if perf runs.  
- Runtime: Node 20, Mongo 6+.  
- Envs: local dev (ts-node-dev), CI, staging (prod-like with mocks).

### 2.10 Test schedule (indicative)
- Week 1: Unit/integration baseline, seed data, smoke e2e.  
- Week 2: Full e2e across roles; security (MFA/step-up, dual-control).  
- Week 3: Stress/perf + recovery; fix/verify; UAT sign-off.

## 3.0 Test Procedure

### 3.1 Software to be tested
As in 2.1; exclusions unchanged.

### 3.2 Testing procedure

#### 3.2.1 Unit tests
Components: TOTP utils, payPortal helpers, recommendation service, rate metrics, log forwarder.  
Mocks: Mongo models, socket emitter, HTTPS in logForwarder.  
Expected: correct outputs, guarded side-effects, no unhandled exceptions.

#### 3.2.2 Integration testing
Procedure: start in-memory Mongo; run supertest suites per route group; validate DB state + audit logs.  
Mocks: MPesa initiate/callback; email/SMS.  
Core cases: auth login/refresh/logout; admin step-up + IP allowlist; pay initiate/idempotency/rate limits; dual-control resolve/refund; listings submit/verify; audit creation.  
Expected: correct status codes, consistent DB state, audit entries created.

#### 3.2.3 Validation testing (UI)
Procedure: Playwright/Cypress role flows on staging.  
Cases: user signup/login → browse → save listing → message agent; agent submit listing; admin approve listing/suspend user/export; pay user initiate → receipt; pay admin dual-control resolve/refund.  
Pass: steps complete, data persists, no console errors, expected toasts/messages, a11y smoke passes.

#### 3.2.4 System testing (high-order)
- Recovery: restart API during pending initiate; expect idempotent re-issue or safe failure.  
- Security: privileged actions without step-up → 403 + prompt; audit + canary logs present.  
- Stress: 2–3× normal RPS on auth/pay initiate; p95 < 1s; no duplicates/data loss.  
- Performance: measure page/API; dashboards meet thresholds.  
- UAT: checklist executed; critical defects resolved.  
- Exit: no P0/P1 open.

### 3.3 Resources and staffing
As in 2.5; ops on-call for stress/recovery.

### 3.4 Work products
Updated test cases, execution logs, coverage reports, perf/stress results, UAT sign-off.

### 3.5 Test log format (recommended)
Each entry: tester, date/time, env/build ID, scenario ID, steps summary, expected, actual, result (pass/fail/blocker), severity/priority, evidence link, defect link(s).

### Appendix A: Requirements ↔ Tests Traceability (sample)
| Requirement ID | Description | Linked Tests |
| --- | --- | --- |
| SEC-01 | Admin step-up required for privileged actions | INT-SEC-05, E2E-ADM-01 |
| PAY-DC-01 | Dual-control: initiator ≠ approver | INT-PAY-10, E2E-PAY-02 |
| PAY-ID-01 | Idempotency-Key prevents duplicate charges | INT-PAY-07, SYS-PAY-01 |
| CSP-01 | `/csp-report` accepts valid reports & records audit | INT-SEC-09, SYS-OBS-02 |
| RL-01 | Rate limits enforced on `/api/auth/login` | INT-SEC-03, SYS-SEC-01 |
| RL-02 | Rate limits enforced on `/api/pay/transactions/initiate` | INT-PAY-07B, SYS-SEC-02 |
| SEC-02 | IP allowlist enforced for pay-admin routes | INT-SEC-06, SYS-SEC-03 |
| SEC-03 | Suspended users blocked even with old tokens | INT-SEC-04, E2E-ADM-04 |
| OBS-01 | Audit logs exist for critical actions | INT-OBS-01, SYS-OBS-01 |
| LIST-01 | Agent listing submission → pending | INT-LIST-01, E2E-AGENT-01 |
| LIST-02 | Admin verifies/publishes listing | INT-LIST-02, E2E-ADM-01 |
| MSG-01 | Messaging unread/read state consistent | INT-MSG-01, E2E-USER-02 |

### Appendix B: Severity rubric
- **P0 (Release Blocker):** auth/step-up bypass, privilege escalation, payment double-spend, audit loss, data corruption, app unusable.  
- **P1 (Critical):** core role journey broken; step-up inconsistent; major crash; persistent 500s; severe perf regression preventing use.  
- **P2 (Major):** partial workflow impairment; incorrect UI state; non-critical API mismatch; missing mocked notifications.  
- **P3 (Minor):** cosmetic/copy/layout; low-impact logging gaps.

### Appendix C: Seeded test data (canonical)
- `admin@zeni.test` (admin), `pay-init@zeni.test` (finance initiator), `pay-approver@zeni.test` (finance approver)  
- `agent@zeni.test` (verified agent), `agent-pending@zeni.test` (pending agent)  
- `user-basic@zeni.test` (active user), `user-suspended@zeni.test` (suspended user)  
- Listings: one live (verified), one pending review; messaging thread between user-basic ↔ agent.  
- Pay collections reset on seed; daily limits taken from env.

### Appendix D: Security must-pass gate
- Step-up enforced for all privileged admin/pay actions (missing → 403 + prompt).  
- Dual-control enforced: initiator cannot approve same resolve/refund.  
- Suspended/banned accounts blocked even with old tokens.  
- Rate limits effective on login + pay initiate (429 + metrics).  
- Audit logs created for login, step-up, pay initiate/callback/resolve/refund, listing approval, role changes, suspensions.  
- IP allowlist blocks pay-admin when outside allowlist (enabled in non-test envs).  
- `/csp-report` accepts valid reports; rejects invalid; audit recorded.  
- Canary endpoint produces audit entry; no sensitive leakage.

### Appendix E: Non-functional evidence
- API p95 < 500ms (normal load) for `/api/auth/login`, `/api/listings`, `/api/messages`, `/api/pay/transactions/initiate`; stress p95 < 1s @ 2–3× RPS, error <1%, no duplicates.  
- Pay dashboard TTI < 2s warm, < 3s cold on staging.  
- Reliability: idempotency prevents duplicates across retries/restarts/callback replay.  
- Evidence pack: junit/xml, coverage, perf/stress summaries, e2e screenshots/videos, sampled audit records.  
