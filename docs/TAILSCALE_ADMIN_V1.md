# Admin Network Controls (v1)

This note captures the v1 security hardening added for privileged routes.

## What was added

- Backend middleware now protects privileged routes with network checks:
  - Admin API: `/api/admin/*`
  - Pay admin APIs: `/api/pay/admin/*` (covers both classic pay routes and pay-portal admin routes)
- Checks include:
  - `ADMIN_IP_ALLOWLIST` (supports exact IPs and CIDR entries)
  - Optional Tailnet requirement toggles per surface:
    - `ADMIN_REQUIRE_TAILNET`
    - `PAY_ADMIN_REQUIRE_TAILNET`
  - Tailnet ranges from `TAILNET_EXPECTED_CIDRS` (defaults to Tailscale ranges)
- Every network decision is audited:
  - `action`: `network_access_allowed` or `network_access_denied`
  - `entityType`: `network_access`
  - Includes reason, path, method, and source IP details.

## Admin portal additions

- New read-only page: `/admin/network-access`
- Shows:
  - Enforcement status (admin/pay admin)
  - Current request network evaluation
  - Recent allow/deny network access decisions

## Key env vars

- `ADMIN_IP_ALLOWLIST`
- `ADMIN_REQUIRE_TAILNET`
- `PAY_ADMIN_REQUIRE_TAILNET`
- `TAILNET_EXPECTED_CIDRS`

Example:

```env
ADMIN_IP_ALLOWLIST=127.0.0.1,::1,100.64.0.0/10,fd7a:115c:a1e0::/48
ADMIN_REQUIRE_TAILNET=true
PAY_ADMIN_REQUIRE_TAILNET=true
TAILNET_EXPECTED_CIDRS=100.64.0.0/10,fd7a:115c:a1e0::/48
```

## Notes

- In tests, network enforcement is bypassed by default.
- To enforce it during tests, set `ENFORCE_NETWORK_ACCESS_IN_TEST=true`.
