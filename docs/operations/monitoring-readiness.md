# Monitoring Readiness

Date: 2026-05-27
Current status: foundation present in code; alert configuration and staged evidence incomplete

## Present Controls

- Server health and readiness JSON endpoints are defined for platform and external probing.
- Server startup emits health contract and payment-readiness configuration state without exposing
  credentials.
- Structured request logging redacts common token, credential, signature, secret, and code query
  parameters.
- Sentry dependencies/configuration exist in application source and must be validated with staging
  error capture.
- Private verification document access has database-backed access logs and application audit events.

## Readiness Checks Before Promotion

| Area | Required check | Status |
| --- | --- | --- |
| Server errors | Generate a controlled staging exception and verify Sentry event, environment, release SHA, and redaction | TODO |
| Frontend errors | Generate a controlled UI/API failure and verify error boundary/Sentry capture without sensitive payload | TODO |
| Metrics | Scrape or query availability/error metrics and dashboard `/health`/`/ready` indicators | TODO |
| Logs | Verify tokens, reset links, document content/URLs, payment signatures, and secrets are redacted | TODO |
| Documents | Alert on unusual content-access volume, repeated denials, and expired-content retrieval attempts | TODO |
| Payments | Alert on invalid/repeated webhook signatures, webhook failures, reconciliation gaps, and failed receipt generation | TODO |
| Backend outage | Alert on readiness failure, frontend upstream-invalid-response rates, and elevated timeouts | TODO |

## Required Alert Definitions

- Backend down/degraded: `/ready` non-200 for five minutes or API 5xx threshold breach.
- Payment webhook failure: invalid signature bursts, processing exceptions, or unhandled duplicate
  behavior.
- Payment reconciliation: paid transaction without receipt or unresolved refund anomaly.
- Verification document anomaly: denied retrieval bursts, unusual admin access count, or
  access after expiry/deletion.
- Privileged identity change: every administrator/finance grant or revoke requires an audit event
  and notification to the security owner.

No release can be called production-ready until each TODO has an owner, configured destination,
test evidence, and escalation path.
