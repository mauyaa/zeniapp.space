# Data Pipeline Plan (Items 1–5)

Scope: minimal, shippable starter for warehouse feed, quality gates, events, metrics, and risk scoring.

## 1) Warehouse feed
- Source: MongoDB (`users`, `listings`, `messages`, `paytransactions`, `auditlogs`).
- Ingest: start with nightly batch via Airbyte (Mongo -> Postgres or BigQuery) into `raw_*` tables.
- dbt models:
  - `stg_listings`, `stg_messages`, `stg_pay_tx`, `stg_audit_logs`
  - `dim_user`, `dim_agent`, `dim_listing`
  - `fct_pay_transactions` (status transitions, idempotency key, approvals, risk flags)
- Partition by `created_at` and cluster by `user_id` / `status` to control cost.

## 2) Data quality gates
- Tests (dbt or Great Expectations):
  - Non-null: primary keys, `user_id`, `amount`, `currency`, `status`
  - Accepted values: `status IN (pending, paid, failed, reversed)`, `method IN (mpesa_stk, card, bank_transfer)`
  - Uniqueness: `idempotency_key` unique per day
  - Freshness: `raw_*` updated < 25h; alert if stale
- CI: run `dbt test` on a small fixture database; block merge on P0 failures.

## 3) Event pipeline
- Domain events emitted by API: `pay_initiated`, `pay_status_updated`, `pay_resolved`, `pay_refund`, `pay_initiated_replay`.
- Transport: HTTP webhook via `EVENT_WEBHOOK_URL` (fire-and-forget, see `server/src/services/domainEvents.ts`). Upgrade to Kafka/Kinesis later.
- Envelope fields: `eventType`, `occurredAt`, `actorId`, `actorRole`, `entityType`, `entityId`, `correlationId`, `requestId`, `payload`.

## 4) Metrics layer
- Prometheus endpoint: `GET /api/metrics`.
- New counters:
  - `pay_risk_flags_total{level}` – increments when a transaction is flagged (see `utils/risk.ts`).
  - `audit_forward_failures_total` – existing; alert if >0 over 5m.
- Suggested dashboards:
  - Pay conversion (initiated → paid)
  - Dual-control completion rate
  - Rate-limit hits per route
  - Risk flags over time by level

## 5) Anomaly / risk scoring (operational)
- Rule-based scorer in `server/src/utils/risk.ts`:
  - Factors: amount thresholds, method, hourly velocity, daily total, new-user age
  - Outputs: `riskScore`, `riskLevel (low|medium|high)`, `riskFlags[]`
- Stored on transactions; surfaced in admin UI (reconcile list, transaction drawer).
- Metric emitted: `pay_risk_flags_total`.
- Planned follow-ups: stream `pay_anomaly_flagged` events, add admin “requires dual control” badge, and feed to dashboards.

## 6) Data governance & PII handling
- Redaction: `server/src/utils/pii.ts` masks common PII fields (email/phone/tokens) before sending audit/events externally (`logForwarder`, `domainEvents`).
- PII tagging (recommended): maintain a field allowlist per table in dbt and tag sensitive columns; enforce row-level masking in BI.
- Retention: set retention on audit/event sinks; for analytics exports use hashed user IDs.

## 7) Self-serve dashboards (seed set)
- Product/ops: pay conversion, dual-control completion, rate-limit hits, risk flags by level.
- Finance: collected vs pending, refunds volume, top risk flags, missing receipts count.
- Engineering/SEC: audit_forward_failures_total, error rate p95, pay_risk_flags_total, CSP reports accepted/rejected.

## 8) Cost & performance hygiene
- Partition `fct_pay_transactions` by `created_date`, cluster by `status` and `user_id`.
- Incremental dbt models keyed by `_id`/`updatedAt`.
- Limit high-cardinality fields in events; keep payload lean and redacted.

## 9) Backfill/reset pipeline
- Reuse `server/scripts/seed.ts` for canonical fixtures; add a “synthetic analytics export” mode (TODO) that drops PII and writes CSV/Parquet.
- Keep backfill jobs idempotent: use upsert on `_id` and stable `idempotencyKey`.

## 10) Data observability
- Metrics: `pay_risk_flags_total`, `audit_forward_failures_total`, dbt source freshness alerts.
- Suggested alerts: stale `raw_*` >25h; any audit forward failures in 5m; spike in high-risk flags.
- Drift checks (future): watch distribution of amount/method/hour via Great Expectations or Metabase alerts.

## Optional (now implemented)
- High-risk events: when `riskLevel === high`, emit `pay_anomaly_flagged` domain event and audit entry.
- UI surfacing: admin transactions list shows risk badges; risk column in transaction table.

## Optional (configuration)
- PII column tagging for BI/dbt: mark email/phone/tokens fields and create masked views (hash or null) for analyst roles.
- Set sink URLs to forward events/audits off-box:
  - `EVENT_WEBHOOK_URL` (domain events stream/bridge)
  - `AUDIT_WEBHOOK_URL` (SIEM/webhook)
