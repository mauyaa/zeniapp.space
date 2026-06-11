# API Health and Availability Contract

## Endpoints

`GET /health` is the liveness endpoint. It must always return JSON while the server process can
serve HTTP:

```json
{
  "status": "ok",
  "service": "zeni-api",
  "timestamp": "2026-05-27T00:00:00.000Z"
}
```

`GET /ready` is the dependency-readiness endpoint. A ready server returns HTTP 200 and JSON:

```json
{
  "status": "ready",
  "service": "zeni-api",
  "dbState": 1,
  "timestamp": "2026-05-27T00:00:00.000Z"
}
```

When the database is unavailable it returns HTTP 503 with `"status": "degraded"`. The
`/health/ready` path is retained as a compatibility alias and should not be used for new probes.

## Probe and Proxy Rules

- Platform liveness probe: `/health`.
- Platform readiness or traffic-admission probe: `/ready`.
- The HTTP listener must bind before database connection completes so liveness remains available
  while readiness reports degraded and database reconnect continues in the background.
- Responses on these endpoints must be `application/json`, never provider wake-up HTML.
- API responses routed through the frontend proxy must not be treated as successful when an
  upstream returns HTML. The browser client classifies this as upstream unavailable and displays
  a retryable service-unavailable state.
- Safe read requests may retry transient gateway/unavailable failures. Mutating requests must not
  be automatically replayed.
- Frontend API requests use bounded timeouts; an outage must not look like working live inventory.

## Operational Validation

After each staging or production deployment:

1. Capture `/health` and `/ready` status, response headers, and JSON body.
2. Confirm the frontend proxy returns JSON API errors while the backend is degraded.
3. Simulate or observe an upstream unavailability window and verify search/detail pages display a
   clear unavailable/retry state without fallback listings in production.
4. Alert if readiness is not HTTP 200 for the SLO window described in `availability-slo.md`.
