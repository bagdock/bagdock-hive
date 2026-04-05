# Changelog

## 0.1.0 (2026-04-04)

### Features

- Initial public release extracted from the Bagdock monorepo.
- Typed HTTP client with retries, timeouts, and structured error handling.
- **Embed tokens** — create, validate, revoke, and list.
- **Chat** — start sessions, send messages, get history.
- **Units** — list available units, get pricing.
- **Access** — generate gate codes (PIN, QR, NFC).
- Pluggable auth adapters: Stytch, Clerk, Auth0, and custom JWT.
- `forOperator()` for scoping all requests to a specific operator.
