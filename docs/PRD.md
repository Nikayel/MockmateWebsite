# CodeSparring — Product Requirements Document (PRD)

**Product:** AI-powered coding interview practice (public brand: CodeSparring; repository: MockmateWebsite)  
**Document type:** PRD — aligns product intent with the current codebase and roadmap-friendly requirements  
**Last updated:** April 2026

---

## 1. Vision & mission

**Vision:** Give every software engineer a realistic, repeatable way to practice technical interviews—with an AI that behaves like a strong interviewer and feedback that improves with use.

**Mission:** Combine a browser-based interview environment (chat + editor + tests), evidence-based learning (spaced repetition), and personalization (roadmaps, company-oriented prep) in one coherent product.

---

## 2. Problem statement

- Live mock interviews are expensive, hard to schedule, and inconsistent in quality.
- Static problem banks lack dialogue, hints at the right time, and nuanced feedback.
- Candidates need to retain patterns over weeks, not cram once.

**CodeSparring addresses this** by simulating interviews with an AI interviewer, running code against tests, and reinforcing memory through scheduling algorithms and dashboards.

---

## 3. Target users & personas

| Persona | Needs | Success looks like |
|---------|--------|-------------------|
| **Job-seeking SWE** | Realistic practice, company-targeted prep, progress clarity | Higher confidence and measurable improvement before onsite/loop |
| **Career switcher** | Guided difficulty, explanations, repetition | Solid fundamentals without being overwhelmed |
| **Working SWE (maintenance mode)** | Efficient refresh, spaced reviews | Fewer forgotten patterns, low time overhead |

---

## 4. Goals & non-goals

### 4.1 Goals (product)

1. Deliver an **end-to-end interview session**: problem context, multi-turn dialogue, coding, execution, and post-session feedback.
2. Support **learning over time** via spaced repetition, roadmaps, and recommendations.
3. Provide **fair access controls**: free tier with limits; paid tiers for heavier usage and premium features.
4. Maintain **trust**: clear data handling, account deletion, and admin auditability for operations.

### 4.2 Non-goals (explicit)

- Replacing human mentors for every scenario (AI augments; humans remain valuable for high-stakes mock loops).
- A full online judge competitive programming platform (scope is interview practice, not contests).
- Self-hosted enterprise deployment as a default offering (unless separately specified).

---

## 5. User journeys (summary)

1. **Discover → Sign up:** Marketing site, OAuth (e.g. GitHub/Google), profile creation.
2. **Practice session:** Pick scenario → chat with AI interviewer → write code → run tests → receive hints/feedback as designed.
3. **Retain:** Due reviews from spaced repetition; roadmap progress for longer-term plans.
4. **Upgrade:** Stripe checkout → subscription status reflected in app → customer portal for billing self-service.
5. **Admin / ops:** Internal dashboards for health, usage, costs, and support actions (role-gated).

---

## 6. Functional requirements

Requirements are grouped by domain. **Must** = core to the product promise; **Should** = important but can be phased; **Could** = valuable enhancements.

### 6.1 Interview core

| ID | Requirement | Priority |
|----|-------------|--------|
| IC-1 | User can conduct a multi-turn conversation with an AI interviewer while viewing problem context | Must |
| IC-2 | User can write code in supported languages in the browser editor | Must |
| IC-3 | User can execute code and see test results against scenario tests | Must |
| IC-4 | System retrieves relevant knowledge (RAG) to improve interviewer hints and answers | Must |
| IC-5 | Optional voice mode: user can use speech input where enabled | Should |
| IC-6 | Feedback pipeline: post-session or streaming feedback generation where implemented | Must |

### 6.2 Learning & progression

| ID | Requirement | Priority |
|----|-------------|--------|
| LR-1 | Spaced repetition: schedule reviews; user can complete/defer/skip per product rules | Must |
| LR-2 | Dashboard metrics: progress signals (sessions, mastery, due items) | Must |
| LR-3 | Roadmap: personalized or guided paths with progress tracking | Should |
| LR-4 | Recommendations based on user behavior / agent outputs | Should |

### 6.3 Account & monetization

| ID | Requirement | Priority |
|----|-------------|--------|
| AM-1 | OAuth sign-in; session established for API calls | Must |
| AM-2 | Subscription tiers (e.g. free/pro/enterprise) with distinct limits | Must |
| AM-3 | Stripe checkout and webhooks keep entitlements in sync | Must |
| AM-4 | Customer billing portal link | Should |
| AM-5 | Referral / promo flows as implemented | Could |

### 6.4 Trust & compliance

| ID | Requirement | Priority |
|----|-------------|--------|
| TC-1 | Account deletion request handled server-side | Must |
| TC-2 | Rate limits and usage quotas to control cost and abuse | Must |
| TC-3 | Admin audit logging for sensitive actions | Should |

### 6.5 Platform & administration

| ID | Requirement | Priority |
|----|-------------|--------|
| AD-1 | Admin-only APIs and UI for user support, analytics, and configuration | Must |
| AD-2 | Feature flags for controlled rollout | Should |
| AD-3 | Operational health endpoints and internal diagnostics | Should |
| AD-4 | Email notifications (e.g. reminders) via scheduled jobs | Should |

---

## 7. Non-functional requirements

| Area | Requirement |
|------|-------------|
| **Performance** | Interactive UI; API responses within acceptable latency for chat and execute paths under normal load |
| **Security** | Verify Firebase tokens on protected APIs; validate inputs; protect webhooks; enforce RBAC for admin |
| **Reliability** | Graceful degradation when third parties (AI, execution, email) fail; user-visible errors should be actionable |
| **Privacy** | Minimize sensitive data in logs; document retention where applicable (see `docs/data-retention-strategy.md` if maintained) |
| **Accessibility** | UI should meet reasonable WCAG-oriented targets for core flows (exact level per org policy) |
| **Observability** | Structured logging; usage/cost tracking for AI and infrastructure |

---

## 8. Success metrics (KPIs)

| Metric | Intent |
|--------|--------|
| Activation | Users completing first meaningful session (e.g. first run + chat) |
| Retention | Weekly active users; spaced repetition completion rates |
| Conversion | Free → paid upgrade rate; churn |
| Quality | Session completion rate; NPS; feedback usefulness signals |
| Unit economics | AI cost per active user; support burden per thousand users |

---

## 9. Dependencies & integrations

- **Firebase** (Auth, Firestore)
- **Google Gemini** (LLM / embeddings)
- **Stripe** (billing)
- **Pinecone** (vectors for RAG)
- **Piston** (code execution)
- **Deepgram** (voice)
- **Brevo** (email)
- **Vercel** (hosting, cron)

---

## 10. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| AI cost spikes | Quotas, rate limits, caching, model selection, admin cost dashboards |
| Execution abuse | Sandboxed runner, limits, monitoring |
| Third-party outage | Clear error states; retries where safe; status communication |
| Data model drift | Document Firestore layout; integration tests for critical paths |

---

## 11. Out of scope / future (candidates)

- Mobile native apps (unless product commits separately)
- Team/organization workspaces with shared billing
- Full LMS content authoring beyond interview scenarios

---

## 12. Engineering traceability

| PRD area | Primary implementation |
|----------|-------------------------|
| Interview & RAG | `app/interview/`, `app/api/chat`, `lib/rag/`, `lib/interview/` |
| Execution | `app/api/execute`, `lib/piston.ts` |
| Learning | `app/api/spaced-repetition/*`, `lib/spaced-repetition/` |
| Billing | `app/api/create-checkout`, `app/api/webhook/stripe`, `lib/stripe-helpers.ts` |
| Admin | `app/admin/`, `app/api/admin/*` |

**Architecture:** [ARCHITECTURE.md](./ARCHITECTURE.md)  
**Backend:** [BACKEND.md](./BACKEND.md)  
**API contracts:** [API.md](./API.md)
