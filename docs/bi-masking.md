# BI Masking & PII Tagging (Starter Guide)

Goal: let analysts query safely while protecting PII. Applies to dbt/BI layers when a warehouse is added.

## PII column tags (suggested)
- Users: `email`, `phone`, `emailOrPhone`, `mfaSecret`, `mfaRecoveryCodes`
- Pay sessions: `ip`, `userAgent`
- Pay transactions: `rawCallback` (contains phone/provider refs)
- Messages: message body text (treat as sensitive)
- Audit logs: `ip`, `userAgent`, `requestId`, `correlationId`

Tag these in dbt model YAML (example):
```yaml
models:
  - name: dim_user
    columns:
      - name: email
        tags: [pii, pii_email]
      - name: phone
        tags: [pii, pii_phone]
```

## Masked views (analyst-safe)
Create role-based masked views; expose only hashed/partial fields.
```sql
create or replace view analytics.dim_user_masked as
select
  user_id,
  sha256(email) as email_hash,
  regexp_replace(phone, '.{4}$', 'XXXX') as phone_masked,
  role,
  status,
  created_at
from raw.dim_user;
```

For messages, exclude body by default; provide secure view with truncated text for limited roles.

## Row-level access (optional)
- Limit pay transactions to finance/ops roles in BI.
- For audit logs, strip `ip`/`userAgent` unless the role is `seceng`.

## Pipelines
- Keep exports/backups PII-safe by default; prefer hashed IDs and masked contact fields.
- Document the allowlist of columns per role (analyst, finance, seceng) and enforce in BI/warehouse policies.
