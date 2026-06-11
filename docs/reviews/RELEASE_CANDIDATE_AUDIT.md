# Zeni P0 Release Candidate Audit

Date: 2026-06-11 (Africa/Nairobi)
Decision: **NO-GO** for production, payments, or identity-sensitive use
Local-source candidate readiness: **95/100**
Overall production readiness: **88/100**

The dirty local PC workspace has been preserved and triaged. The clean local-source candidate keeps
only reviewed P0 release-hardening changes from the local checkpoint and rejects unsafe local
regressions documented in `LOCAL_SOURCE_CHANGE_CLASSIFICATION.md`. Zeni remains **NO-GO** until
the final local SHA is pushed, CI passes, the exact SHA is deployed to staging, staging
certification is completed, legacy KYC exposure is migrated/revoked with evidence, monitoring
alert routing is proven, CSP is validated, and payment readiness is verified.

## Branch and Workspace Status

| Item | Finding | Release impact |
| --- | --- | --- |
| Release branch | `codex/local-pc-release-certification` | Current local-source branch. |
| Reviewed P0 checkpoint | `357b3f8aabab54acb422c40fae1c4d2c99dcd652` | Used as the safe baseline after local triage. |
| Original dirty workspace backup | `.release-backups/local-pc-source-20260604-115514` | Preserved before cleanup; do not delete. |
| Pre-clean backup | `.release-backups/clean-rc-prep-20260604-122245` | Captures the dirty tree immediately before reset/clean. |
| Local classification | `docs/reviews/LOCAL_SOURCE_CHANGE_CLASSIFICATION.md` | Records kept, rejected, generated/runtime, and unrelated local changes. |
| Pull request / CI | Not run for this local-source candidate SHA yet | No certifiable artifact exists until pushed CI passes. |

## 2026-06-11 Local-Source Candidate Progress

The dirty PC workspace was reduced to a reviewed P0 candidate tree plus release documentation
changes. `git diff --check` passes, no tracked generated/runtime artifacts remain, and the complete
required validation suite passes under Node `v20.19.5`.

Final Node 20.19.5 local validation evidence:

| Command | Result |
| --- | --- |
| `npm ci` | Passed; npm reports development-tooling advisories and warns that `@capacitor/cli@8.1.0` requires Node `>=22`. |
| `npm --prefix server ci` | Passed under Node `v20.19.5`; npm reported 2 moderate advisories. |
| `npm run format:check` | Passed under Node `v20.19.5`. |
| `npm run lint` | Passed under Node `v20.19.5`. |
| `npx tsc --noEmit --pretty false` | Passed under Node `v20.19.5`. |
| `npm run test` | Passed: 14 files, 79 tests. |
| `npm run build` | Passed. |
| `npm --prefix server run lint` | Passed. |
| `npm --prefix server run build` | Passed. |
| `npm --prefix server test` | Passed: 19 suites, 106 tests. |
| `npx playwright test` | Passed: 13 tests. |
| Root production dependency audit | Passed the high/critical gate; 1 moderate `uuid` advisory remains and requires a breaking upgrade. |
| Backend production dependency audit | Passed the high/critical gate; 2 moderate `uuid`/`node-cron` advisories remain and require breaking upgrades. |

The local candidate is certifiable for CI and staging evaluation. It is not certified for
production until the external release gates below are completed with evidence.

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

Unrelated feature experiments, UI redesign work, ad hoc recovery scripts, map/branding
experiments, and Paystack expansion were excluded from this candidate.

## Runtime and Generated Artifact Hygiene

The following tracked runtime artifacts are removed from the candidate index:

- `playwright-report/index.html`
- `test-results/.last-run.json`
- Eight files previously tracked under `server/uploads/`

`.gitignore` now excludes:

- `.release-backups/`
- `ZENI-RC/`
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

No unrelated source files are intentionally present in the candidate commit. Any newly discovered
feature experiment, UI redesign, AI/Web3 work, new payment-provider capability, or ad hoc recovery
script must remain in backup or move to a follow-up branch rather than enter this release.

The following local regressions were explicitly rejected:

- removal or weakening of verification document purpose/type allowlists;
- weakened denied document-access logging;
- removal of retention/legal-hold handling;
- weakened generic upload rejection for verification document types;
- Paystack webhook/provider expansion;
- wildcard `ADMIN_DOMAIN=*` production permissiveness.

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

| Command | Current evidence |
| --- | --- |
| `npm ci` | Passed under Node `v20.19.5`; lockfile is reproducible. |
| `npm --prefix server ci` | Passed under Node `v20.19.5`; lockfile is reproducible. |
| `npm run format:check` | Passed. |
| `npm run lint` | Passed. |
| `npx tsc --noEmit --pretty false` | Passed. |
| `npm run test` | Passed: 14 files, 79 tests. |
| `npm run build` | Passed. |
| `npm --prefix server run lint` | Passed. |
| `npm --prefix server run build` | Passed. |
| `npm --prefix server test` | Passed: 19 suites, 106 tests. |
| `npx playwright test` | Passed: 13 tests. |
| `npm audit --omit=dev --audit-level=high` | Passed high/critical gate; 1 moderate production advisory remains. |
| `npm --prefix server audit --omit=dev --audit-level=high` | Passed high/critical gate; 2 moderate production advisories remain. |
| `git diff --check` | Passed after final documentation edit and artifact cleanup. |
| Generated artifact tracking check | Passed: no tracked report, upload, coverage, build-output, log, or TypeScript build-metadata paths remain. |

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
4. Plain `npm ci` reports development-tooling advisories; the production dependency audits have no
   high or critical findings, but the remaining moderate `uuid`/`node-cron` findings require
   planned breaking upgrades rather than a forced rescue-sprint upgrade.
5. `@capacitor/cli@8.1.0` requires Node `>=22`, while the required release validation runtime is
   Node 20. The web/frontend/backend validation suite passes on Node 20, but mobile tooling runtime
   compatibility remains a follow-up dependency-governance decision.

## Exact Clean Release Procedure

The local-source preservation and branch preparation steps have been completed:

```powershell
# Preserved local source-of-truth backups:
# .release-backups/local-pc-source-20260604-115514
# .release-backups/clean-rc-prep-20260604-122245
git switch codex/local-pc-release-certification
# Unsafe/regressive, generated/runtime, and unrelated changes were excluded after classification.
```

Remaining external release procedure:

```powershell
git push -u origin codex/local-pc-release-certification
# Require green CI on the exact pushed SHA.
# Deploy that exact SHA to staging.
# Execute STAGING_CERTIFICATION_PLAN.md and attach evidence.
```

Open a reviewable pull request only after the branch is clean. Production promotion remains
blocked until green CI, exact-SHA staging certification, legacy KYC migration sign-off, CSP
validation, payment readiness verification, and rollback confirmation are attached to the release.
