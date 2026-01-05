# CodeSparring Architecture

Technical architecture overview for the CodeSparring platform.

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CODESPARRING                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────┐  │
│  │   Frontend   │    │   Backend    │    │      External Services   │  │
│  │  (Next.js)   │───▶│  (API Routes)│───▶│                          │  │
│  └──────────────┘    └──────────────┘    │  • Google Gemini (AI)    │  │
│         │                   │             │  • Firebase (Auth + DB)  │  │
│         │                   │             │  • Stripe (Payments)     │  │
│         ▼                   ▼             │  • Piston (Code Exec)    │  │
│  ┌──────────────┐    ┌──────────────┐    │  • Deepgram (Voice)      │  │
│  │    Vercel    │    │   Firestore  │    │  • Pinecone (Vectors)    │  │
│  │   (Hosting)  │    │  (Database)  │    │  • Brevo (Email)         │  │
│  └──────────────┘    └──────────────┘    └──────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Framework** | Next.js | 16 | Full-stack React framework |
| **Language** | TypeScript | 5.x | Type-safe development |
| **UI** | React | 19 | Component library |
| **Styling** | Tailwind CSS | 4.x | Utility-first CSS |
| **Components** | shadcn/ui + Radix | Latest | Accessible UI components |
| **State** | Zustand | 5.x | Client state management |
| **Database** | Firebase Firestore | - | NoSQL document database |
| **Auth** | Firebase Auth | - | OAuth 2.0 authentication |
| **AI** | Google Gemini | 2.5 Flash | Chat & embeddings |
| **Vectors** | Pinecone / Firestore | - | RAG vector storage |
| **Payments** | Stripe | - | Subscription billing |
| **Code Exec** | Piston | - | Sandboxed execution |
| **Voice** | Deepgram | - | Speech-to-text |
| **Email** | Brevo | - | Transactional email |
| **Hosting** | Vercel | - | Edge deployment |

---

## Directory Structure

```
MockmateWebsite/
├── app/                      # Next.js App Router
│   ├── api/                  # API routes (50+ endpoints)
│   │   ├── chat/             # AI interview chat
│   │   ├── execute/          # Code execution
│   │   ├── admin/            # Admin endpoints
│   │   ├── spaced-repetition/# Learning system
│   │   ├── rag/              # RAG endpoints
│   │   ├── user/             # User management
│   │   ├── webhook/          # Stripe webhooks
│   │   └── cron/             # Scheduled jobs
│   ├── (pages)/              # App pages
│   │   ├── dashboard/        # User dashboard
│   │   ├── interview/        # Interview interface
│   │   ├── practice/         # Practice mode
│   │   ├── roadmap/          # Study roadmap
│   │   └── admin/            # Admin panel
│   └── layout.tsx            # Root layout
│
├── components/               # React components
│   ├── ui/                   # shadcn/ui primitives
│   ├── interview/            # Interview components
│   ├── dashboard/            # Dashboard components
│   ├── practice/             # Practice components
│   ├── roadmap/              # Roadmap components
│   ├── admin/                # Admin components
│   └── providers/            # Context providers
│
├── lib/                      # Core logic & utilities
│   ├── rag/                  # RAG system
│   │   ├── embeddings/       # Embedding providers
│   │   ├── retrieval/        # Search & ranking
│   │   ├── vectordb/         # Vector storage
│   │   └── knowledge-base/   # Domain knowledge
│   ├── spaced-repetition/    # Learning algorithms
│   │   ├── fsrs-algorithm.ts # FSRS scheduler
│   │   ├── sm2-algorithm.ts  # SM-2 scheduler
│   │   └── mastery-calculator.ts
│   ├── agents/               # AI agents
│   ├── admin/                # Admin utilities
│   │   ├── rbac.ts           # Role-based access
│   │   ├── middleware.ts     # Admin auth
│   │   └── cache.ts          # Response caching
│   ├── services/             # Business logic
│   ├── hooks/                # React hooks
│   ├── stores/               # Zustand stores
│   ├── types.ts              # TypeScript types
│   └── validations/          # Zod schemas
│
├── docs/                     # Documentation
├── public/                   # Static assets
└── content/                  # MDX blog content
```

---

## Core Systems

### 1. Interview Engine

The core interview experience combining AI chat, code execution, and real-time feedback.

```
┌─────────────────────────────────────────────────────────┐
│                    Interview Page                        │
├───────────────────┬─────────────────┬───────────────────┤
│                   │                 │                   │
│   Chat Panel      │   Code Editor   │   Test Results    │
│                   │                 │                   │
│ ┌───────────────┐ │ ┌─────────────┐ │ ┌───────────────┐ │
│ │  Interviewer  │ │ │  CodeMirror │ │ │  Test Cases   │ │
│ │      or       │ │ │             │ │ │    Pass/Fail  │ │
│ │   Partner     │ │ │  Multi-lang │ │ │               │ │
│ │    Mode       │ │ │   Support   │ │ │  Console      │ │
│ └───────────────┘ │ └─────────────┘ │ └───────────────┘ │
│                   │                 │                   │
└───────────────────┴─────────────────┴───────────────────┘
```

**Data Flow:**
1. User writes code → Sent to `/api/execute`
2. User sends message → Sent to `/api/chat` with context
3. AI responds with hints/feedback
4. Test results update in real-time
5. Session metrics tracked continuously

### 2. RAG System (Retrieval-Augmented Generation)

Enhances AI responses with contextual knowledge.

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Question   │────▶│  Embeddings  │────▶│   Vector DB  │
│   Context    │     │   (Gemini)   │     │  (Pinecone)  │
└──────────────┘     └──────────────┘     └──────────────┘
                                                  │
                                                  ▼
                                          ┌──────────────┐
┌──────────────┐     ┌──────────────┐     │   Relevant   │
│  AI Response │◀────│    Gemini    │◀────│   Context    │
│              │     │   + Context  │     └──────────────┘
└──────────────┘     └──────────────┘
```

**Knowledge Sources:**
- DSA patterns & explanations
- Company-specific interview styles
- Common misconceptions & corrections
- Hint progressions (level 1-4)

### 3. Spaced Repetition System

Science-backed learning retention using FSRS algorithm.

```
Problem Attempted
       │
       ▼
┌──────────────┐
│ Rate Quality │  0=forgot, 5=perfect
│   (0-5)      │
└──────────────┘
       │
       ▼
┌──────────────┐
│ FSRS/SM-2    │  Calculates next review date
│  Algorithm   │
└──────────────┘
       │
       ▼
┌──────────────┐
│ Schedule     │  Stored in Firestore
│ Next Review  │
└──────────────┘
```

**Mastery Calculation:**
- Correctness (40%)
- Time efficiency (20%)
- Code quality (20%)
- Communication (20%)

### 4. Authentication & Authorization

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    Client    │────▶│   Firebase   │────▶│   OAuth      │
│   (Login)    │     │    Auth      │     │  (GitHub)    │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │
       │                    ▼
       │             ┌──────────────┐
       │             │  ID Token    │
       │             └──────────────┘
       │                    │
       ▼                    ▼
┌──────────────┐     ┌──────────────┐
│   Store in   │     │   API Route  │
│   Cookie     │     │   Verify     │
└──────────────┘     └──────────────┘
```

**RBAC Roles:**
| Role | Permissions |
|------|-------------|
| `super_admin` | Full access + manage admins |
| `admin` | Analytics, user management |
| `analyst` | Read-only analytics |
| `support` | User management only |

### 5. Payment System

```
User clicks "Upgrade"
       │
       ▼
┌──────────────┐     ┌──────────────┐
│   Create     │────▶│   Stripe     │
│   Checkout   │     │   Checkout   │
└──────────────┘     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │   Payment    │
                     │   Success    │
                     └──────────────┘
                            │
                            ▼
┌──────────────┐     ┌──────────────┐
│   Update     │◀────│   Webhook    │
│  Firestore   │     │   Event      │
└──────────────┘     └──────────────┘
```

---

## Data Models

### User Profile (`profiles/{userId}`)

```typescript
interface Profile {
  id: string                    // Firebase Auth UID
  email: string
  full_name: string
  avatar_url?: string
  subscription_tier: 'free' | 'pro' | 'enterprise'
  subscription_status: 'active' | 'past_due' | 'canceled' | null
  stripe_customer_id?: string
  notification_preferences: {
    email_enabled: boolean
    spaced_repetition_reminders: boolean
  }
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}
```

### Session (`interview_sessions/{sessionId}`)

```typescript
interface InterviewSession {
  id: string
  user_id: string
  scenario_id: string
  type: 'dsa' | 'system_design' | 'behavioral' | 'bug_fix'
  difficulty: 'easy' | 'medium' | 'hard'
  language: string
  session_state: 'in_progress' | 'completed' | 'abandoned'
  started_at: string
  completed_at?: string
  final_code?: string
  conversation_history: Message[]
  test_results?: TestResults
  performance_score?: number
  feedback?: Feedback
}
```

### Spaced Repetition (`spaced_repetition/{userId}/{problemId}`)

```typescript
interface SpacedRepetitionRecord {
  problem_id: string
  user_id: string
  mastery_score: number          // 0-100
  review_count: number
  last_reviewed_at: string
  next_review_date: string
  difficulty_rating: number      // FSRS difficulty
  stability: number              // FSRS stability
  interval_days: number
}
```

---

## API Layer

### Request Flow

```
Request
   │
   ▼
┌──────────────┐
│  Middleware  │  Admin route protection
└──────────────┘
   │
   ▼
┌──────────────┐
│ Rate Limiter │  Per-user, per-tier limits
└──────────────┘
   │
   ▼
┌──────────────┐
│    Auth      │  Firebase token verification
│  Verify      │
└──────────────┘
   │
   ▼
┌──────────────┐
│   Quota      │  Session/budget enforcement
│   Check      │
└──────────────┘
   │
   ▼
┌──────────────┐
│   Zod        │  Request body validation
│  Validate    │
└──────────────┘
   │
   ▼
┌──────────────┐
│  Business    │  Core logic
│   Logic      │
└──────────────┘
   │
   ▼
Response
```

### Rate Limiting Strategy

```typescript
// Sliding window algorithm
interface RateLimitConfig {
  free: { requestsPerMin: 10, tokensPerMin: 5000, concurrent: 2 }
  pro: { requestsPerMin: 30, tokensPerMin: 20000, concurrent: 5 }
  enterprise: { requestsPerMin: 100, tokensPerMin: 100000, concurrent: 20 }
}
```

### Quota Enforcement

```typescript
interface QuotaLimits {
  free: { sessionsPerMonth: 2, budgetUSD: 0.50 }
  pro: { sessionsPerMonth: 35, budgetUSD: 25.00 }
  enterprise: { sessionsPerMonth: Infinity, budgetUSD: 100.00 }
}
```

---

## Security

### Authentication

- Firebase Auth with OAuth (GitHub/Google)
- JWT tokens verified on every API request
- 50-minute token refresh intervals
- Cookie-based session indicator for SSR

### Authorization

- Row-level security via Firestore rules
- RBAC for admin features
- Audit logging for admin actions

### API Security

- Rate limiting (sliding window)
- Quota enforcement (sessions + budget)
- Input validation (Zod schemas)
- CORS configuration
- Webhook signature verification

### Headers

```typescript
// next.config.mjs
{
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': '...',
  'Permissions-Policy': 'microphone=self'
}
```

---

## Deployment

### Infrastructure

- **Hosting:** Vercel (Edge Network)
- **Database:** Firebase Firestore (multi-region)
- **Functions:** Vercel Serverless (Node.js 18)
- **Domains:** codesparring.com

### Environment Variables

See `.env.example` for required configuration.

### Cron Jobs

| Job | Schedule | Purpose |
|-----|----------|---------|
| Subscription Expiry | Daily 9 AM | Check expiring subscriptions |
| Email Notifications | Daily 10 AM | Send spaced repetition reminders |

---

## Performance

### Optimizations

- Turbopack bundler (10x faster builds)
- Image optimization (AVIF/WebP)
- Dynamic imports for code splitting
- Response caching (admin endpoints)
- Embedding cache (RAG system)

### Monitoring

- Vercel Analytics (Web Vitals)
- Sentry (Error tracking) - planned
- Custom logger with PII redaction

---

## Scalability Considerations

| Concern | Current | Future |
|---------|---------|--------|
| Rate Limiting | In-memory | Redis (Upstash) |
| Vector Search | Firestore | Pinecone (scaled) |
| Code Execution | Piston API | Dedicated service |
| AI Caching | Per-request | Prompt caching |

---

**Last Updated:** January 2026
