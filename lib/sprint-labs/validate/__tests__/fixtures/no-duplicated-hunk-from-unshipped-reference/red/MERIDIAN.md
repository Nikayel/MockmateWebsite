# Meridian Architecture

Every claim intake request is validated before it reaches a handler.
Money is stored as integer cents, never a float.
Tenant isolation is enforced by Postgres row-level security policies.
