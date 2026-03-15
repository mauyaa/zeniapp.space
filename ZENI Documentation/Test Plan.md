# Test Plan



---

## Table of Contents
1. [Introduction](#10-introduction)
2. [Test Plan](#20-test-plan)
3. [Test Procedure](#30-test-procedure)
4. [Addendum — Traceability, Severity, Test Data, Security Gate, Measurable Targets](#40-addendum--traceability-severity-test-data-security-gate-measurable-targets)
5. [Entry and Exit Criteria](#50-entry-and-exit-criteria)
6. [Risks and Mitigations](#60-risks-and-mitigations)

---

## 1.0 Introduction
This document describes the test plan and test procedure for the ZENI Real Estate platform. It defines the testing scope, strategy, resources, environments, schedules, measurable targets, security release gates, traceability, and execution procedures.

### 1.1 Goals and objectives
*   Verify end-to-end workflows for Users, Agents, Admins, and Pay Portal roles.
*   Prevent regressions in critical security controls: MFA/step-up, dual-control, rate limiting, IP allowlist, audit logging, CSP reporting, and canary auditing.
*   Validate performance, reliability, and basic accessibility.
*   Produce test evidence for release readiness (reports, coverage, logs, audit samples, performance artifacts).

### 1.2 Statement of scope
**In scope:**
*   **Authentication:** user/agent/admin login, token refresh/logout, admin MFA/step-up, pay portal authentication.
*   **Listings:** browse/search/filter, listing details, save/favorite, alerts, agent listing submission, admin verification/publish.
*   **Messaging:** conversations list, read/unread states, send/receive messages.
*   **Admin console:** user management (suspend/roles), listing verification, exports, insights/metrics.
*   **Pay portal:** login, initiate payment, mocked callback handling, receipts, dual-control resolve/refund, pay insights.
*   **Security controls:** rate limiting, IP allowlist, step-up enforcement, audit logging, canary endpoint audit, CSP report endpoint (`/csp-report`).

**Out of scope:**
*   Live M-Pesa gateway behavior (mocked only) and external bank links.
*   External email/SMS delivery quality (only trigger/mock verification).
*   Pixel-perfect cross-browser UI beyond major latest releases.
*   Mobile native applications (web only).

### 1.3 Major constraints
*   Test data is seeded using `server/scripts/seed.ts`; payment callbacks are mocked/simulated.
*   Staging environment mirrors production logic but may differ in TLS termination/offloading.
*   TypeScript 5.9.x may exceed some `eslint-plugin` tested ranges; lint warnings are acceptable provided tests pass.

---

## 2.0 Test Plan
This section defines the overall testing strategy and the management approach required to execute effective tests.

### 2.1 Software (SCIs) to be tested
*   **Front-end:** Vite React app (`src/**/*`)
*   **Back-end:** Express API (`server/src/**/*`)
*   **Pay Portal:** `/pay/*` UI + `/api/pay/*` routes
*   **Exclusions:** legacy/non-used scripts; downloaded sample assets not included in the build.

### 2.2 Testing strategy

#### 2.2.1 Unit testing
**Strategy:** Validate pure logic and isolated components quickly and deterministically.
**Selection criteria (unit-tested areas):**
*   Auth helpers, token utilities, request validators
*   Pay helpers and transaction state transitions
*   TOTP/MFA utilities
*   Recommendation/search helpers
*   Metrics and audit event formatting utilities
**Tools:** Jest + `ts-jest` (back-end); minimal UI logic unit tests (Vitest/Jest where used).
**Unit exit condition:** All unit tests pass; no unhandled exceptions/rejections.

#### 2.2.2 Integration testing
**Strategy:** Validate API routes, middleware, DB interactions, and observability behavior.
**Tools:** `mongodb-memory-server`, `supertest`, and Zod assertions (where applicable).
**Integration order by function:**
1.  Authentication/session
2.  Security middleware (step-up, allowlist, rate limits)
3.  Pay portal endpoints (initiate/callback/receipt/dual-control)
4.  Listings workflows (submit/verify/publish/visibility)
5.  Messaging workflows (send/receive/unread/access control)
**Integration exit condition:** Correct status codes; consistent DB state; required audit entries exist.

#### 2.2.3 Validation testing
**Strategy:** Validate role-based workflows using UI automation on staging and basic accessibility smoke tests.
**Tools:** Playwright or Cypress; Lighthouse/axe for accessibility smoke checks.
**Validation order by function:**
1.  Authentication and navigation
2.  Listings browse/search/detail/save
3.  Messaging flows
4.  Agent listing submission
5.  Admin verify listing, suspend user, exports
6.  Pay initiate and receipt
7.  Pay-admin dual-control resolve/refund
**Validation exit condition:** Critical journeys pass; no critical console errors; data persists correctly.

#### 2.2.4 High-order testing (System testing)
**Strategy:** Validate reliability, security enforcement, performance under load, and recovery behavior.
**High-order test types:**
*   Recovery testing (API/DB restart during in-flight pay initiate)
*   Security testing (step-up/MFA, dual-control, allowlist, CSP, canary)
*   Stress/performance testing (login and pay initiate bursts)
*   UAT (guided stakeholder sign-off on staging)
*   **Alpha/Beta note:**
    *   Alpha: internal staging UAT (conducted)
    *   Beta: optional limited external preview (not conducted unless scheduled)
**High-order exit condition:** Security gate passes; targets met; no duplicates/data loss; 0 open P0/P1 defects.

### 2.3 Testing resources and staffing
*   **QA:** e2e execution, regression, defect reporting, evidence pack compilation.
*   **Backend development:** unit/integration tests, contract checks, audit/metrics verification.
*   **Frontend development:** UI stability, selector strategy, console/network error reduction.
*   **DevOps:** CI/staging management, artifact storage, monitoring integration (optional).
*   **Ops/on-call:** supports stress/recovery runs and rollback coordination if required.

### 2.4 Test work products
*   Unit, integration, and e2e test suites
*   Seed scripts and seeded datasets (users/listings/pay transactions)
*   Execution reports (junit/xml), coverage, defect logs
*   Performance/stress artifacts (k6/Artillery if used), latency summaries
*   UAT checklist and sign-off record
*   Audit log samples (exported JSON snippets)

### 2.5 Test record keeping
*   CI stores artifacts per run: junit/xml, coverage, logs, screenshots/videos, perf outputs.
*   Manual log (where required): tester, date/time, environment/build ID, scenario ID, outcome, defects, evidence links.
*   Audit logs retained in MongoDB and forwarded when configured.

### 2.6 Test metrics
*   Coverage (line/branch) for unit/integration suites
*   Pass/fail counts per suite
*   Endpoint latency p50/p95/p99 (normal + stress)
*   Defect density and mean time to resolution (MTTR)
*   Rate-limit hits metric (`rate_limit_hits_total` or equivalent)
*   Pay status counts during tests (initiated/confirmed/failed/refunded)

### 2.7 Testing tools and environment
*   **Tools:** Jest/`ts-jest`, supertest, `mongodb-memory-server`, Playwright/Cypress, axe-core/Lighthouse, Docker; k6/Artillery (optional).
*   **Runtime:** Node 20; MongoDB 6+.
*   **Environments:** Local dev, CI, staging (prod-like with mocks).

### 2.8 Test schedule (indicative)
*   **Week 1:** unit/integration baseline; seed stabilization; smoke e2e
*   **Week 2:** full e2e across roles; security gate hardening (step-up + dual-control)
*   **Week 3:** stress/perf + recovery; fixes; re-runs; UAT sign-off

---

## 3.0 Test Procedure
This section specifies the detailed procedures, stubs/drivers, test inventory, expected results, and pass/fail criteria.

### 3.1 Software (SCIs) to be tested
Same as Section 2.1. Exclusions unchanged.

### 3.2 Testing procedure

#### 3.2.1 Unit test cases
**3.2.1.1 Procedure**
1.  Run unit suites per module/service.
2.  Confirm no unhandled promise rejections and junit output is generated in CI.
3.  Fail the build if any unit test fails.

**3.2.1.2 Stubs and/or drivers for component i**
*   Mock MongoDB models/repositories for isolated logic tests.
*   Mock socket emitter for messaging events (where applicable).
*   Stub outbound HTTP/HTTPS in log forwarding utilities (where applicable).
*   Stub time-dependent logic (TOTP windows, token expiry).

**3.2.1.3 Test cases component i (examples)**
*   **UNIT-AUTH-01** token creation/verification helpers
*   **UNIT-MFA-01** TOTP verification boundary windows
*   **UNIT-PAY-01** transaction state transition helper (valid/invalid)
*   **UNIT-MET-01** metrics formatting and counter increments
*   **UNIT-AUD-01** audit event serialization and redaction rules

**3.2.1.4 Purpose**
*   Confirm correctness for critical logic (security, payments, audit/metrics).
*   Ensure stable behavior for edge cases (invalid states, time windows, retries).

**3.2.1.5 Expected results**
*   Correct outputs for valid inputs.
*   Safe failures for invalid inputs (no crashes).
*   Deterministic behavior with no unhandled exceptions.

#### 3.2.2 Integration testing
**3.2.2.1 Testing procedure for integration**
1.  Start `mongodb-memory-server` with a clean state.
2.  Execute suites in order: Auth → Security → Pay → Listings → Messaging → Observability.
3.  For each test: verify HTTP status, response schema, DB state, and audit events.
4.  Store junit output and logs as artifacts.

**3.2.2.2 Stubs and drivers required**
*   M-Pesa callback simulator to post mocked callbacks to `/api/pay/*callback*`.
*   Email/SMS mocks to capture outbound requests without sending.
*   Webhook replay driver to resend the same callback payload (idempotency validation).
*   IP allowlist driver to simulate client IP/header used by allowlist logic.
*   Rate-limit driver to burst requests and verify 429 behavior + metrics increments.
*   Socket mock (if messaging emits events) in integration environment.

**3.2.2.3 Test cases and purpose (integration inventory)**
*   **Auth**
    *   **INT-AUTH-01** Register/login (user/agent/admin) — baseline authentication
    *   **INT-AUTH-02** Refresh rotation; old refresh invalid — prevents token reuse
    *   **INT-AUTH-03** Logout invalidates refresh/access per policy — session termination
*   **Security**
    *   **INT-SEC-03** Rate limit `/api/auth/login` ⇒ 429 + metric increment — brute-force mitigation
    *   **INT-SEC-04** Suspended user blocked with valid token — enforcement check
    *   **INT-SEC-05** Admin privileged action requires step-up — step-up gate
    *   **INT-SEC-06** IP allowlist blocks `/api/pay/admin/*` — network restriction
    *   **INT-SEC-09** `/csp-report` valid accepted; invalid rejected; audit recorded — CSP handling
    *   **INT-SEC-10** Canary endpoint logs audit; no sensitive response — detection/safety
*   **Pay**
    *   **INT-PAY-07** Idempotency-Key prevents duplicate tx — retry safety
    *   **INT-PAY-08** Initiate → mocked callback → receipt available — core flow
    *   **INT-PAY-09** Callback replay safe — replay protection
    *   **INT-PAY-10** Dual-control initiator cannot approve own resolve/refund — separation of duties
    *   **INT-PAY-11** Approver approves; status and audit correct — integrity check
    *   **INT-PAY-12** Refund/resolve invalid state rejected — state enforcement
*   **Listings**
    *   **INT-LIST-01** Agent submits listing → pending — submission pipeline
    *   **INT-LIST-02** Admin verifies listing → published/verified — verification control
    *   **INT-LIST-03** Unverified listing visibility rule enforced — product rule validation
*   **Messaging**
    *   **INT-MSG-01** Send/receive; unread updates — messaging correctness
    *   **INT-MSG-02** Access control on conversations — privacy/security
*   **Observability**
    *   **INT-OBS-01** Audit record exists for critical actions — evidence and compliance

**3.2.2.4 Expected results**
*   Correct HTTP status codes and consistent response payload shapes.
*   Consistent DB state (no partial writes, no duplicates).
*   Audit entries created for critical actions (auth, step-up, pay lifecycle, listing verification, role changes).
*   Rate-limited endpoints return 429 under burst conditions and increment relevant metrics.
*   Dual-control rules enforced strictly.

#### 3.2.3 Validation testing (UI)
**3.2.3.1 Testing procedure for validation**
1.  Deploy build to staging (prod-like configuration with mocks).
2.  Run seed script to create canonical users/listings/pay fixtures.
3.  Execute e2e suite by role: User → Agent → Admin → Pay user → Pay-admin dual-control.
4.  Capture evidence: screenshots/videos, console logs, network failures.

**3.2.3.3 Expected results**
*   Core journeys complete without blocking errors.
*   UI states and notifications match expected behavior.
*   Data persists across refresh and navigation.
*   Pay receipt displays correct details after mocked callback.

**3.2.3.4 Pass/fail criterion for all validation tests**
**PASS if:**
*   All critical e2e flows pass.
*   No P0/P1 defects remain open.
*   No critical console errors are observed.
*   Accessibility smoke checks pass on key pages (or waivers documented).
**FAIL if:**
*   Any critical journey fails or results in data inconsistency.
*   Step-up, dual-control, or security gate requirements fail.

**E2E inventory**
*   **E2E-USER-01** Signup → login → browse/filter → save/favorite
*   **E2E-USER-02** Message agent → reply → unread clears
*   **E2E-AGENT-01** Submit listing → appears pending
*   **E2E-ADM-01** Step-up → approve listing → visible publicly
*   **E2E-ADM-02** Suspend user → user blocked on next request
*   **E2E-PAY-01** Pay login → initiate payment → receipt view
*   **E2E-PAY-02** Dual-control refund: initiator requests → different approver approves

#### 3.2.4 High-order testing (System testing)
**3.2.4.1 Recovery testing**
*   **Procedure:** restart API during pay initiate; retry using the same Idempotency-Key; validate no duplicates.
*   **Test case:** **SYS-PAY-01** Restart during initiate; idempotency prevents duplicates
*   **Expected:** recovery without duplicates; consistent final transaction state.

**3.2.4.2 Security testing**
*   **Procedure:** attempt privileged actions without step-up; attempt dual-control approval by same user; test non-allowlisted access; reuse suspended tokens; submit valid/invalid CSP reports.
*   **Test cases:** **SYS-SEC-01**, **SYS-SEC-02**, **SYS-SEC-03**, **SYS-SEC-04**
*   **Expected:** enforced controls; audit evidence present; no sensitive leakage.

**3.2.4.3 Stress testing**
*   **Procedure:** burst `/api/auth/login` and `/api/pay/transactions/initiate` at 2–3× expected RPS; measure p95 and error rate.
*   **Expected:** p95 < 1s; error rate < 1%; no duplicates.

**3.2.4.4 Performance testing**
*   **Procedure:** measure API latency under seeded normal load; measure pay dashboard TTI warm/cold on staging.
*   **Expected:** API p95 < 500ms; pay dashboard TTI < 2s warm and < 3s cold.

**3.2.4.5 Alpha/Beta testing**
*   **Alpha:** internal staging UAT (guided scenarios; sign-off recorded).
*   **Beta:** not conducted unless planned (limited external stakeholders if scheduled).

**3.2.4.6 Pass/fail criterion for all high-order tests**
**PASS if:**
*   Security gate passes.
*   Performance targets met or formally waived.
*   Idempotency proof shows 0 duplicate payments across retries/restarts/callback replay.
*   No P0/P1 defects open.
**FAIL if:**
*   Any security gate item fails.
*   Duplicate payments/data loss occurs.
*   Targets are missed without an approved waiver.

### 3.3 Testing resources and staffing
Same as Section 2.3. Ops/on-call participate for stress/recovery runs.

### 3.4 Test work products
Same as Section 2.4 plus system test run summaries, UAT sign-off, and exported audit samples.

### 3.5 Test record keeping and test log
CI artifacts stored per run. Manual test log entries must include: tester, time/date, env/build ID, scenario ID, expected vs actual, result, severity, evidence link, defect link.

---

## 4.0 Addendum — Traceability, Severity, Test Data, Security Gate, Measurable Targets

**A) Requirements ↔ Tests Traceability Matrix (RTM)**

| Requirement ID | Description | Linked Tests |
| :--- | :--- | :--- |
| **SEC-01** | Admin step-up required for privileged actions | INT-SEC-05, E2E-ADM-01 |
| **PAY-DC-01** | Dual-control: resolver ≠ approver | INT-PAY-10, E2E-PAY-02 |
| **PAY-ID-01** | Idempotency-Key prevents duplicate charges | INT-PAY-07, SYS-PAY-01 |
| **CSP-01** | `/csp-report` accepts valid reports and records audit | INT-SEC-09, SYS-SEC-04 |
| **RL-01** | Rate limits enforced on `/api/auth/login` | INT-SEC-03, SYS-SEC-01 |

**B) Severity definitions**
*   **P0:** auth bypass, privilege escalation, payment double-spend, audit loss, data corruption, system unusable
*   **P1:** core role journey broken; step-up not enforced; incorrect refund/resolve; major crash
*   **P2:** partial workflow impairment; incorrect UI state; missing mock behavior
*   **P3:** cosmetic/copy/non-blocking layout issues

**C) Test data strategy (seed profiles)**
Seed canonical roles: `user_basic_01`, `user_suspended_01`, `agent_pending_01`, `agent_verified_01`, `admin_standard_01`, `pay_admin_initiator_01`, `pay_admin_approver_01`, `attacker_01`.

**D) Security “must-pass” gate (release blockers)**
*   Step-up enforced for privileged admin/pay actions (no step-up ⇒ 403 + prompt)
*   Dual-control enforced (initiator cannot approve same resolve/refund)
*   Suspended/banned users blocked with old tokens
*   Rate limits effective on login and pay initiate (429 + metrics proof)
*   Audit logs created for critical actions (auth, step-up, pay lifecycle, listing approval, role changes)
*   IP allowlist blocks pay-admin outside allowlist
*   `/csp-report` accepts valid reports; invalid rejected; audit recorded
*   Canary endpoint produces audit entry; no data leakage

**E) Measurable targets and evidence requirements**
*   API p95 evidence (normal + stress) for `/api/auth/login`, `/api/listings`, `/api/messages`, `/api/pay/transactions/initiate`
*   Front-end: pay dashboard TTI < 2s warm; < 3s cold on staging
*   Reliability: idempotency proof (no duplicates across retries/restarts/replay)
*   Artifacts: junit/xml, coverage %, perf results, screenshots/videos for critical e2e, sampled audit records

**F) Test case ID convention**
`UNIT-*`, `INT-*`, `E2E-*`, `SYS-*`, `SEC-*`

**G) Open product clarifications**
*   Unverified listing visibility rule (hidden vs warning)
*   Payment state transitions (allowed statuses and invalid transitions)
*   Exact actions covered by step-up (list explicitly in implementation + tests)

---

## 5.0 Entry and Exit Criteria
*   **Entry:** staging deployed; seed succeeds; mocked callback available; required env variables configured (rate limits, audit, CSP, allowlist).
*   **Exit:** 0 open P0/P1 defects; critical e2e passes; security gate passes; targets met/waived; evidence pack stored.

---

## 6.0 Risks and mitigations
*   **Payment mocks miss production edges** → broaden simulator + strict idempotency/state tests
*   **Flaky e2e** → stable selectors, explicit waits, limited retries, isolated data
*   **CI rate-limit collisions** → separate buckets or CI bypass keys
*   **Audit log growth** → capped collections/rotation; forwarding enabled where configured
