# Security

## Authentication

- **JWT**: Main app and Pay portal use separate token storage and refresh flows. Pay tokens are isolated for defense-in-depth.
- **Session timeout**: Frontend warns after 30 minutes of inactivity and offers "Stay logged in" or "Sign out". Backend should enforce token expiry and refresh limits.
- **Role separation**: Users cannot access agent or admin portals with buyer/tenant credentials. Agent and admin login pages reject wrong-role accounts with a clear message.

## HTTPS & cookies

- In **production**, serve the app and API over HTTPS only.
- If the server sets cookies (e.g. session or refresh), use:
  - `Secure` so they are sent only over HTTPS.
  - `SameSite=Strict` or `Lax` to reduce CSRF risk.
  - `HttpOnly` where appropriate so client JS cannot read them.

## Rate limiting & lockout

- **Backend**: Use `RATE_LIMIT_MAX` and auth-specific limits (e.g. failed login attempts per IP or per account) to prevent brute force. Consider temporary lockout after N failures.
- **Frontend**: Shows a generic "Login failed" or "Too many attempts" message; do not reveal whether the account exists.

## CSRF

- For state-changing operations (login, register, pay, etc.), the API should validate:
  - Same-origin or allowed CORS origin.
  - CSRF token in header or body if using cookie-based sessions.
- Frontend can send a token from a meta tag or a dedicated endpoint if the backend requires it.

## Sensitive data

- Do not log or send passwords, PINs, or full card numbers. Frontend only sends credentials over HTTPS to the API.
- Payment flows (M-Pesa, card) use backend-initiated requests and callbacks; frontend never handles full payment credentials.

## Reporting

- Set `VITE_SENTRY_DSN` in production to capture frontend errors. Backend can use `SENTRY_DSN` for server-side errors.
- Audit logs (admin) should record sensitive actions (verification, user changes, pay operations).
