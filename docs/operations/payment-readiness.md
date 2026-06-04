# Payment Readiness and Reconciliation

Scope: hardening of existing payment paths only. This document does not authorize a new provider
or new payment product.

## Enablement Rule

- Keep `PAYMENTS_ENABLED=false` in production until provider credentials, webhook security,
  reconciliation ownership, and staging evidence are approved.
- Initiation fails closed if payments are disabled or the selected configured provider is
  incomplete.
- Production bank transfer initiation is disabled in this release candidate because no supported
  bank-transfer provider adapter is implemented.
- A configured Paystack secret is not treated as provider readiness and does not enable card or
  bank-transfer initiation.
- Non-privileged users must have verified KYC before initiating payment.
- Provider webhook signatures must be validated before any state transition.
- Idempotency must prevent duplicate initiation, webhook transition, or refund processing.

## Provider Checklist

- Secrets are stored in deployment secret management and never in source or log output.
- Callback/webhook URLs point to the intended reviewed deployment and use HTTPS.
- Stripe/M-Pesa credentials and webhook secrets are validated for only the supported provider
  actually enabled for release.
- Do not enable Paystack until a separately reviewed provider adapter, webhook contract, and
  reconciliation procedure exist; this rescue sprint does not authorize that capability.
- Invalid signature, duplicated webhook, timeout, failed provider response, and disabled-provider
  tests pass in staging.
- Receipt creation is deterministic/idempotent and paid-without-receipt alerting is active.
- Refund operation requires authorized stepped-up review and duplicate-refund protection.

## Reconciliation Procedure

1. Export provider-side transactions for the reconciliation interval using authorized finance
   access.
2. Compare provider reference, internal transaction ID, amount/currency, status, idempotency key,
   receipt, and refund state.
3. Quarantine mismatches: do not manually set paid/refunded state without second-person approval
   and recorded provider evidence.
4. Investigate missing receipts, duplicated callbacks, failed webhooks, and status transitions;
   retain audit identifiers, not sensitive credentials or full payloads in ordinary tickets.
5. Record corrections through audited administrative workflows and re-run reconciliation.
6. Escalate any customer-impacting mismatch or unauthorized payment/refund as an incident.
