# Meridian Architecture

Every claim intake request is validated before it reaches a handler.
Money is stored as integer cents, never a float.
Tenant isolation is enforced by Postgres row-level security policies.

Retry configuration:

```ts
export const MAX_RETRY_ATTEMPTS = 5
export const RETRY_BASE_DELAY_MS = 100
export const RETRY_JITTER_MS = 50
```
