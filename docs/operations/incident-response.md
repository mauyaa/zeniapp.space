# Incident Response Runbook

## Scope and Severity

This runbook covers backend/API outage, authentication compromise, privileged-access misuse,
identity-document exposure, and payment/webhook integrity events.

| Severity | Examples | Initial response target |
| --- | --- | --- |
| SEV-1 | Public verification document exposure, fraudulent admin access, incorrect successful payment/refund, total API outage | Acknowledge in 15 minutes; contain immediately |
| SEV-2 | Sustained degraded readiness, webhook processing failures, excessive private document access attempts | Acknowledge in 30 minutes |
| SEV-3 | Non-critical errors without sensitive-data or financial impact | Triage next business day |

## Response Steps

1. Assign incident commander, technical lead, communications owner, and privacy/payment lead if
   relevant. Record times, deployment SHAs, and affected environments.
2. Contain: disable payments using `PAYMENTS_ENABLED=false` for payment uncertainty; revoke
   privileged accounts/sessions for identity risk; suspend verification processing and revoke
   exposed media for document risk; rollback a defective release for availability regression.
3. Preserve audit records, provider webhook payload identifiers, access logs, deployment logs, and
   affected object IDs without copying sensitive documents into tickets or chat.
4. Diagnose using `/health`, `/ready`, structured redacted logs, Sentry, metrics, database health,
   and provider status. Do not silently supply fallback production data during an API outage.
5. Recover from a reviewed commit and validate the staging/production smoke checks relevant to the
   event before reopening sensitive operations.
6. Notify required internal/privacy/legal stakeholders after assessing data categories, subjects,
   exposure window, and jurisdictional obligations.
7. Publish a post-incident record with root cause, containment, correction, validation evidence,
   and prevention owners.

## Immediate Playbooks

### Backend unavailable

- Confirm JSON `/health` and `/ready`; distinguish process failure from database/dependency
  degradation.
- Keep user-facing unavailable/retry behavior enabled; do not seed or display fallback live
  inventory.
- Roll back the last release if correlated; escalate platform/backend outage if independent.

### Verification evidence exposure

- Stop new document review if confidentiality cannot be assured.
- Inventory affected URLs/document IDs without logging the underlying evidence.
- Revoke public provider access, restrict application endpoints, and follow the documented
  migration procedure.
- Review `VerificationDocumentAccessLog`, application audit logs, and provider access records for
  anomaly scope.

### Payment integrity event

- Set `PAYMENTS_ENABLED=false` while maintaining read-only reconciliation access.
- Reconcile provider transactions, webhooks, idempotency keys, receipts, and refunds.
- Do not manually mark success without two-person review and recorded provider evidence.

## Required Alert Owners

Before promotion, assign monitored alert routes for readiness failure, high HTTP 5xx rates,
payment webhook failures or repeated signatures, payment/receipt reconciliation gaps, privileged
grant/revoke events, and anomalous verification-document content access.
