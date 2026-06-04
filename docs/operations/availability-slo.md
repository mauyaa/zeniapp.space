# Backend Availability SLO Draft

Status: draft for staging measurement and production approval

## Service Indicators

| Indicator | Measurement |
| --- | --- |
| Liveness | HTTP success and valid JSON from `GET /health` |
| Readiness | HTTP 200 and valid JSON `"status": "ready"` from `GET /ready` |
| API success | Non-5xx response rate for authenticated and public API requests, excluding invalid client requests |
| User outage behavior | Search/detail surfaces display retryable unavailable state within bounded client timeout when API is not usable |

## Proposed Objectives

- Production API readiness: 99.9 percent per rolling 30 days, measured from external probes.
- Liveness: 99.95 percent per rolling 30 days.
- User-visible API error budget: fewer than 0.1 percent of valid API requests result in backend
  5xx/unavailable responses per rolling 30 days.
- Alert threshold: readiness failures for 5 consecutive minutes or error rate above 2 percent for
  5 minutes triggers SEV-2 triage; broad outage or sensitive workflow impact raises SEV-1.

These are proposed objectives. They require monitoring data, deployment architecture validation,
and operational ownership before becoming contractual.

## Dependency and Deployment Requirements

- Configure platform health checks against `/health` and traffic admission against `/ready`.
- Eliminate or manage cold-start behavior that causes proxied HTML in place of JSON APIs.
- Run staging outage exercises for backend sleep, database failure, and gateway error response.
- Keep user messaging honest: no production mock inventory or masked errors.
- Track SLO burn rate and deploy rollback decision evidence per release.
