# Zeni P0 Release Candidate Audit

Date: 2026-06-04 (Africa/Nairobi)
Decision: **NO-GO** for production, payments, or identity-sensitive use
Release readiness score: **82/100**

The P0 rescue implementation is now isolated on a dedicated release-candidate branch, but it is
not a certifiable release artifact yet. Local reliability, privacy, authentication, privileged
identity, CSP, and payment guardrail changes are materially stronger than `origin/main`. The
remaining gap is external release evidence: the candidate still requires a pushed/reviewed commit,
green CI, an exact SHA deployment to staging, staging certification, and production legacy KYC URL
migration and provider revocation.

## Branch and Workspace Status

| Item                     | Finding                                                        | Release impact                                                     |
| ------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------ |
| Release branch           | `codex/p0-production-rescue`                                   | Correct dedicated branch exists.                                   |
| Base commit              | `origin/main` at `07465c0f9a0bd5c14770994fdb651465ce7f656f`    | Candidate started from the reviewed remote baseline.               |
| Original dirty workspace | Preserved under `.release-backups/` in the original workspace  | Recovery source exists without contaminating this branch.          |
| RC worktree              | `C:\Users\USER\Downloads\ZENI\ZENI-RC`                         | Moved into the writable workspace for final validation.            |
| Pull request / CI        | Draft PR #2 opened; GitHub Actions CI failed before job steps   | No certifiable artifact exists until account billing is unlocked and CI passes. |

## Difference From `origin/main`

The selected branch scope is limited to P0/P1 release blockers and their tests:

- JSON liveness/readiness behavior, database reconnect handling, bounded API client timeouts,
  invalid HTML response rejection, and honest inventory outage states.
- Private encrypted verification-document upload, review, audit, retention, and legacy local URL
  denial.
- Authentication session, refresh, reset, MFA recovery, admin step-up, and role-change hardening.
- Explicit privileged role grant/revoke, consumer-domain signup denial, and session revocation.
- Environment-specific CSP and browser/server security headers.
- Payment enablement, provider readiness, KYC gate, webhook/idempotency, receipt, and refund
  guardrails.
- Monitoring, incident, availability, payment-readiness, private-document, audit, and staging
  certification documentation.
- Focused frontend, backend, and Playwright coverage for the above behavior.

Unrelated feature experiments, UI redesign work, ad hoc recovery scripts, and map/branding
experiments were excluded from this candidate.

## Runtime and Generated Artifact Hygiene

The following tracked runtime artifacts are removed from the candidate index:

- `playwright-report/index.html`
- `test-results/.last-run.json`
- Eight files previously tracked under `server/uploads/`

`.gitignore` now excludes:

- `playwright-report/`
- `test-results/`
- `coverage/`
- build output and TypeScript build metadata
- `server/uploads/`
- local database files and runtime logs

`git ls-files playwright-report test-results server/uploads coverage dist "*.tsbuildinfo" "*.log"`
must return no output before commit.

## Files That Must Be Committed

The reviewed release commit must include:

- Root release configuration: `.gitignore`, `package.json`, `package-lock.json`,
  `playwright.config.ts`, `render.yaml`, `vercel.json`, and `index.html`.
- Backend P0 source, configuration, models, routes, services, tests, and lockfiles under
  `server/`.
- Frontend API, authentication, messaging reliability, outage handling, verification review,
  security header tests, and related types under `src/`.
- Rescue E2E specifications under `e2e/`.
- Operations, security, and review evidence under `docs/operations/`, `docs/security/`, and
  `docs/reviews/`.
- Staged deletions of generated reports and runtime uploads.

## Files That Must Be Ignored or Removed

Do not add generated reports, test output, coverage, runtime uploads, local databases, logs,
screenshots, or build output. Do not restore the deleted tracked artifacts listed above.

## Files That Must Be Separated

No unrelated source files are intentionally present in the RC worktree. Any newly discovered
feature experiment, UI redesign, AI/Web3 work, new payment-provider capability, or ad hoc recovery
script must be moved to a follow-up branch rather than added to this release.

## Local-Only Fixes Pending Certification

The following controls exist only in this candidate until the exact reviewed SHA is deployed:

- `/health` and `/ready` return JSON-only contracts; unavailable API dependencies return JSON 503.
- The frontend rejects HTML upstream responses, maps bounded timeouts to safe messages, and does
  not display production mock listings during outages.
- KYC, agent identity, and business verification evidence use a private encrypted document
  boundary with MIME signature checks, purpose/type allowlists, filename sanitization, scanning
  adapter, audited stepped-up admin streaming, and retention expiry execution.
- Public registration cannot self-assign privileged roles; explicit admin/finance grant and revoke
  operations are audited and revoke sessions.
- Production CSP uses explicit secure origins without wildcard `connect-src`.
- Payments fail closed when disabled, KYC is incomplete, a supported provider is not ready, or an
  unsupported configured provider has no transaction adapter.

These controls are not evidence that the live site is fixed.

## CI, Build, and E2E State

The repository CI workflow includes frontend, backend, and Playwright jobs. Local validation
passed from the moved RC worktree. GitHub Actions CI did not execute code: attempts 1 and 2 failed
before any job steps were scheduled because GitHub reported, "The job was not started because your
account is locked due to a billing issue."

| Command                                                    | Current evidence                                                                                                          |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `npm ci`                                                   | Passed from the RC lockfile. Full dependency tree reports 5 moderate and 1 critical advisory, including dev tooling.      |
| `npm --prefix server ci`                                   | Passed from the RC lockfile. Local Node 22.20.0 warns because backend declares Node 20.x.                                 |
| `npm run format:check`                                     | Passed.                                                                                                                   |
| `npm run lint`                                             | Passed.                                                                                                                   |
| `npx tsc --noEmit --pretty false`                          | Passed.                                                                                                                   |
| `npm run test`                                             | Passed: 14 files, 79 tests.                                                                                               |
| `npm run build`                                            | Passed.                                                                                                                   |
| `npm --prefix server run lint`                             | Passed.                                                                                                                   |
| `npm --prefix server run build`                            | Passed.                                                                                                                   |
| `npm --prefix server test -- --runInBand`                  | Passed: 19 suites, 106 tests.                                                                                             |
| `npm --prefix server test -- --runInBand --detectOpenHandles` | Passed: 19 suites, 106 tests; no open-handle source reported.                                                           |
| `npm run test:e2e`                                         | Passed: 13 Playwright tests.                                                                                              |
| `npm audit --omit=dev --audit-level=high`                  | Passed high/critical gate; 3 moderate production advisories remain.                                                       |
| `npm --prefix server audit --omit=dev --audit-level=high`  | Passed high/critical gate; 2 moderate production advisories remain.                                                       |
| `git diff --check`                                         | Passed after final documentation edit and artifact cleanup.                                                               |
| Generated artifact tracking check                          | Passed after cleanup: no tracked report, upload, coverage, build-output, log, or TypeScript build-metadata paths remain.  |

Local passes do not replace CI or staging certification.

## Release Blockers

### P0

1. GitHub Actions CI is blocked by account billing lockout and has not certified the pushed
   commit.
2. The exact reviewed commit has not been deployed to staging or executed against
   `STAGING_CERTIFICATION_PLAN.md`.
3. Existing public KYC/verification URLs have not been inventoried in production, migrated to
   private storage, and revoked or deleted at their providers. See
   `LEGACY_KYC_EXPOSURE_AUDIT.md`.

### P1

1. Monitoring alerts, destinations, on-call ownership, and staged Sentry/metrics evidence are not
   configured.
2. Production CSP origins require validation against the deployed frontend, API, sockets, media,
   auth, and payment provider behavior.
3. Payment provider credentials, webhook delivery, reconciliation ownership, and deliberate
   enablement remain staging/operations gates.
4. The local frontend dependency tree reports a critical development-only advisory during plain
   `npm ci`; production dependency audit is below the high/critical threshold, but the tooling
   dependency must be reviewed without a forced upgrade.
5. Backend local validation uses Node 22 while the backend declares Node 20.x; CI and deployment
   must use Node 20.

## Exact Clean Release Procedure

The branch/worktree creation steps have been completed:

```powershell
git fetch origin
git diff --binary > .release-backups/zeni-working-tree-backup-20260531.patch
git worktree add ..\ZENI-RC -b codex/p0-production-rescue origin/main
Set-Location ..\ZENI-RC
```

Remaining release procedure:

```powershell
npm ci
npm --prefix server ci
npm run format:check
npm run lint
npx tsc --noEmit --pretty false
npm run test
npm run build
npm --prefix server run lint
npm --prefix server run build
npm --prefix server test -- --runInBand
npm run test:e2e
git diff --check
git status --short
git add .gitignore docs e2e index.html package.json package-lock.json playwright.config.ts render.yaml server src vercel.json
git commit -m "Harden P0 production readiness boundaries"
git push -u origin codex/p0-production-rescue
```

Open a reviewable pull request only after the branch is clean. Production promotion remains
blocked until green CI, exact-SHA staging certification, legacy KYC migration sign-off, CSP
validation, payment readiness verification, and rollback confirmation are attached to the release.
