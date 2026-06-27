# CodeSparring Backend

Server-side architecture for the CodeSparring platform (also branded Mockmate in the repo). The backend is implemented as **Next.js App Router Route Handlers** (`app/api/**/route.ts`) on **Vercel**, with **no separate monolithic API service**—the web app and API share one deployable unit (a BFF-style layout).

---

## 1. Role of the backend

| Responsibility | Where it lives |
|----------------|----------------|
| HTTP API for the SPA and server components | `app/api/` |
| Auth token verification | `lib/auth-server.ts`, `lib/firebase-admin.ts` |
| Business rules (interview, learning, billing) | `lib/` (domain modules) |
| Persistence | Firebase **Firestore** via Admin SDK / client rules |
| AI orchestration | `lib/ai-providers*.ts`, `lib/interview/`, `lib/rag/` |
| Rate limits & quotas | `lib/rate-limiter.ts`, `lib/quota-enforcement.ts` |
| Webhooks & cron | `app/api/webhook/`, `app/api/cron/` |

**Related docs:** [ARCHITECTURE.md](./ARCHITECTURE.md) (system view), [API.md](./API.md) (endpoint contracts), [FIREBASE_STRUCTURE.md](./FIREBASE_STRUCTURE.md) (data model).

---

## 2. Runtime & deployment

- **Runtime:** Node.js (Vercel serverless/Edge where applicable per route).
- **Hosting:** Vercel; same project serves marketing pages, app UI, and `/api/*`.
- **Secrets:** Environment variables on Vercel (see `.env.example`); never commit secrets.

---

## 3. Request lifecycle (typical authenticated route)

```
Client
  → HTTPS (JSON)
  → Route Handler (app/api/.../route.ts)
      → Rate limit / quota (lib/rate-limiter, lib/quota-enforcement)
      → Firebase ID token verify → uid (lib/auth-server)
      → Zod validation (inline or lib/validations)
      → Domain logic (lib/*)
      → Firestore / external APIs (Stripe, Gemini, Pinecone, Piston, Deepgram, Brevo)
  → JSON / stream response
```

**Guest flows:** Some interview-adjacent routes support limited unauthenticated use with stricter limits; migration paths exist (e.g. guest session APIs).

---

## 4. API surface (by domain)

Routes are grouped under `app/api/`. The following mirrors the product domains; exact HTTP methods and bodies are specified in [API.md](./API.md).

### Interview & AI

| Area | Example routes | Core libraries |
|------|----------------|----------------|
| Chat / interviewer | `chat/` | `lib/ai-providers.ts`, `lib/interview/`, `lib/rag/` |
| Code execution | `execute/`, `execute/ast/` | `lib/piston.ts`, validators |
| Feedback | `generate-feedback/`, `feedback/*` | `lib/feedback/` |
| Hints & agents | `agents/hints/`, `agents/recommendations/` | `lib/agents/` |
| RAG | `rag/`, `rag/v2/`, `rag/health/` | `lib/rag/` |
| Complexity | `analyze-complexity/` | `lib/interview/` |

### Learning

| Area | Example routes | Core libraries |
|------|----------------|----------------|
| Spaced repetition | `spaced-repetition/*` | `lib/spaced-repetition/` |
| Roadmap | `roadmap/`, `roadmap/progress/` | `lib/roadmap/` |

### User & account

| Area | Example routes | Notes |
|------|----------------|--------|
| Profile & subscription | `user/profile`, `user/subscription-status`, `user/metrics`, `user/usage`, … | Firestore `profiles`, usage aggregates |
| Notifications | `notifications/`, `user/notification-preferences` | Preferences + delivery |
| Account lifecycle | `delete-account/` | GDPR-style deletion path |
| Guest | `guest-session/`, `guest-session/migrate/` | Anonymous → registered |

### Monetization & growth

| Area | Example routes | Notes |
|------|----------------|--------|
| Stripe | `create-checkout/`, `customer-portal/`, `webhook/stripe/` | Checkout, portal, webhook-driven entitlement sync |
| Referrals & promo | `referral/`, `promo-code/` | Growth mechanics |
| NPS | `nps/` | Product feedback |

### Platform & voice

| Area | Example routes | Notes |
|------|----------------|--------|
| Voice | `voice/token/`, `usage/voice/` | Deepgram (or related) token/usage |
| Health | `health/` | Liveness for ops |
| Announcements | `announcements/` | In-app messaging |

### Admin & operations

| Area | Example routes | Notes |
|------|----------------|--------|
| Users, analytics, revenue | `admin/users`, `admin/analytics`, `admin/revenue`, … | RBAC-protected |
| RAG & AI ops | `admin/rag-health`, `admin/feedback`, `admin/usage`, … | Cost/quality monitoring |
| Feature flags & audit | `admin/feature-flags`, `admin/audit` | Controlled rollouts & compliance |
| Maintenance | `admin/cleanup-orphans`, `vectorize-*`, `seed-vectors` | Data hygiene / indexing |

### Scheduled jobs

| Route prefix | Purpose | Schedule |
|--------------|---------|----------|
| `cron/subscription-expiry/` | Subscription lifecycle | daily |
| `cron/email-notifications/` | Spaced repetition / engagement email | every 3h |
| `cron/aggregate-usage/` | Pre-compute hourly cost averages into `config/cost_averages` so request-time anomaly checks read 1 doc instead of scanning up to 10k `usage_events` | **hourly** |

Cron routes are invoked by an external scheduler (cron-job.org — the Vercel Hobby plan only allows daily Vercel Crons); protect with `CRON_SECRET` or equivalent pattern used in the codebase.

> **Operational note — `cron/aggregate-usage`:** the route is implemented and tested, but the cost-anomaly fallback only stays fresh if this runs on schedule. `getAverageHourlyCost()` treats the cached doc as stale after 2h and returns `0` (fail-safe) rather than re-running the expensive query. Add a cron-job.org job that `POST`s to `/api/cron/aggregate-usage` **every hour** with header `Authorization: Bearer ${CRON_SECRET}`. Without it the averages go stale and anomaly detection degrades to a no-op.

---

## 5. External services

| Service | Purpose |
|---------|---------|
| **Firebase Auth** | Identity; ID tokens for API auth |
| **Firestore** | Primary application data |
| **Google Gemini** | LLM chat, analysis, embeddings (per `package.json` / `lib/ai-*`) |
| **Pinecone** | Vector search for RAG (with Firestore-related fallbacks documented in architecture) |
| **Stripe** | Subscriptions and customer portal |
| **Piston** | Sandboxed code execution |
| **Deepgram** | Speech-to-text for voice mode |
| **Brevo** | Transactional email |
| **Google Analytics Data API** | Admin/analytics where integrated |

---

## 6. Data access pattern

- **Server-only:** Firebase Admin SDK (`lib/firebase-admin.ts`) for trusted server operations and token verification.
- **Client:** Firebase client SDK for signed-in UI; Firestore security rules enforce row-level access.
- **Consistency:** Profile document ID must match Auth UID (see [FIREBASE_STRUCTURE.md](./FIREBASE_STRUCTURE.md)).

---

## 7. Security controls

- **Authentication:** `Authorization: Bearer <Firebase ID token>` on protected routes; verification via Admin SDK.
- **Authorization:** Subscription tier checks, admin RBAC (`lib/admin/`), Firestore rules for direct client reads/writes.
- **Abuse prevention:** Sliding-window rate limits, per-tier quotas, input validation (Zod).
- **Webhooks:** Stripe signature verification on `webhook/stripe`.
- **Headers / CSP:** See [ARCHITECTURE.md](./ARCHITECTURE.md) security section and `next.config`.*

---

## 8. Observability

- Structured logging via `lib/logger.ts` (PII-aware patterns as implemented).
- Usage and cost tracking: `usage_events`, aggregates (`usage_summaries`), admin dashboards for anomalies and query performance.

---

## 9. Scaling notes

Current design favors simplicity: many limits are enforced in-process; at higher scale, rate limiting and caches may move to Redis (e.g. Upstash) as noted in [ARCHITECTURE.md](./ARCHITECTURE.md). Vector workloads may lean more on Pinecone for retrieval-heavy traffic.

---

**Last updated:** April 2026
