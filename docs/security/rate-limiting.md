# Rate Limiting

CodeSparring separates two concerns that fail differently:

1. **Universal edge protection** absorbs broad anonymous traffic before it reaches Vercel.
2. **Application policies** protect costly operations and provide fair per-user product limits.

Application rate limiting is centralized under `lib/rate-limiting/`. Routes select a named policy;
they do not construct Redis keys or implement timing algorithms. The official `@upstash/ratelimit`
SDK owns the distributed algorithm and atomic Redis operations.

## Universal Cloudflare rule

Create one Cloudflare rate-limiting rule for the production hostname:

- Match: URI path starts with `/api/`
- Characteristic: source IP
- Limit: 600 requests per minute
- Mitigation timeout: 60 seconds
- Action: block initially; move suspicious traffic to Managed Challenge only if false positives show
- Response: `429 Too Many Requests`

This high ceiling is an outer safety net, not a product entitlement. It should not interrupt normal
interviews, including users behind a shared home or office address. Cloudflare's managed DDoS
protection and WAF remain responsible for volumetric and protocol attacks; Redis cannot stop traffic
that has already reached the application.

The edge rule is infrastructure configuration and is not activated by this repository. Verify it in
Cloudflare before treating `/api/*` as universally protected.

## Application policies

| Policy | Identity | Algorithm | Limit | Store failure |
| --- | --- | --- | --- | --- |
| Chat Free | verified user | token bucket | 20/minute, capacity 20 | deny |
| Chat Pro | verified user | token bucket | 200/minute, capacity 200 | deny |
| Chat Enterprise | verified user | token bucket | 600/minute, capacity 600 | deny |
| Execute | verified user or route IP | sliding window | 10/minute | deny |
| Feedback generation | verified user | sliding window | 5/minute | deny |
| Guest session | IP | sliding window | 3/hour | deny |
| Guest write | IP | token bucket | 15/minute, capacity 15 | deny |
| Checkout / portal | verified user, then IP fallback | sliding window | 10/hour | allow |
| Account deletion | verified user, then IP fallback | sliding window | 2/hour | deny |

Other RAG, admin, and feedback-stream policies are declared in the same registry. Read
`lib/rate-limiting/policies.ts` for the executable source of truth.

Token buckets fit chat because ordinary conversation is uneven: tokens refill continuously and a
short burst is allowed without granting unlimited traffic. Sliding windows fit destructive or costly
operations where any rolling interval must stay under a strict count. The outer Cloudflare rule uses
a fixed one-minute window because it is a coarse, high-ceiling safety net; application policies avoid
the boundary spike that fixed windows permit.

## Failure behavior

Each policy explicitly chooses `allow` or `deny` when Redis is unavailable. Destructive, anonymous,
and paid-AI operations fail closed. Lower-risk telemetry and navigational operations fail open so a
Redis incident does not become a full product outage. Development without Upstash credentials is
allowed to keep local tests and onboarding usable; production logs missing credentials as an error.

All denials use one response shape and emit `Retry-After`, `RateLimit-*`, and compatibility
`X-RateLimit-*` headers.

## Configuration

Required in production:

```dotenv
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

Optional:

```dotenv
UPSTASH_RATE_LIMIT_ANALYTICS=true
GUEST_SESSION_LIMIT_PER_HOUR=3
GUEST_API_LIMIT_PER_MINUTE=15
```

Enabling Upstash analytics adds Redis operations, so leave it off unless the dashboard data is used.

## Adding or changing a limit

1. Add or edit one named policy in `lib/rate-limiting/policies.ts`.
2. Expose a domain-named preset in `lib/rate-limiting/presets.ts`.
3. Call that preset after authentication when a verified user identity is available.
4. Add a policy test and a route regression test.

Do not add local counters, hand-written Redis rate-limit scripts, or route-specific algorithm setup.
