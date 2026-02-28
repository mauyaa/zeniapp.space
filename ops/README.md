# Ops Runbook (Zeni)

## Services
- **API**: `server/` (Express, MongoDB)
- **Web**: `/` (Vite React static build)
- **Database**: MongoDB

## Health & Monitoring
- Liveness: `GET /health`
- Readiness: `GET /health/ready` (503 if DB is not connected)
- Metrics (Prometheus): `GET /api/metrics` (admin auth required)
- Logs: structured JSON with `requestId` in API console output.
- Error tracing: set `SENTRY_DSN` to enable Sentry; adjust `SENTRY_TRACES_SAMPLE_RATE`.
- Metrics paths are normalized to reduce cardinality (IDs collapsed to `:id`).
- Alerting hints:
  - `audit_forward_failures_total` - increments when forwarding audit events to an external sink fails. Alert if >0 over 5m (possible SIEM/webhook outage).
  - Suggested PromQL: `sum(increase(audit_forward_failures_total[5m])) > 0`
  - Dashboard: graph `audit_forward_failures_total` (rate) plus sample `requestId`/`correlationId` fields from logs for investigation.
  - `pay_anomaly_flagged_total` - increments on high-risk payment scores. Alert if >0 over 10m, or if rate spikes above baseline.
  - `pay_risk_flags_total{level}` - watch for increase in `level="high"`; useful for fraud/risk visibility.
  - Ready-to-use Prometheus rules: `ops/alerts/prometheus-rules.yml`

## Local Development
```bash
npm install
npm run dev           # frontend

cd server
npm install
npm run dev           # backend (uses .env)
npm run seed          # create admin/agent + sample listing
```

## Tests & Lint
```bash
npm run lint          # frontend
cd server && npm run lint && npm test -- --runInBand
```

## Docker (full stack)
```bash
docker-compose -f docker-compose.full.yml up --build
```

## Production (API)
```bash
cd server
npm run build
pm2 start ecosystem.config.cjs
```

## Backups
- Ad-hoc dump: `cd server && npm run backup` (uses `MONGO_URI_BACKUP` or `MONGO_URI`, writes to `server/backups/`)  
- Manual: `mongodump --uri "mongodb://localhost:27017/zeni" --out ./backups/$(date +%Y%m%d)`  
- Restore: `mongorestore --uri "mongodb://localhost:27017/zeni" ./backups/<folder>`

## Environment
- Frontend build-time: `VITE_API_BASE_URL`
- Backend runtime: `MONGO_URI`, `PORT`, `JWT_SECRET`, `ADMIN_*`, `AGENT_*`, `PAY_*`, `RATE_LIMIT_MAX`, `AUDIT_WEBHOOK_URL`, `EVENT_WEBHOOK_URL`
