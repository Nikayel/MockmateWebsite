# MockMate System Architecture

This document provides a comprehensive overview of the MockMate platform architecture, technical decisions, and system design.

## Table of Contents

- [System Overview](#system-overview)
- [High-Level Architecture](#high-level-architecture)
- [Technology Stack](#technology-stack)
- [Core Components](#core-components)
- [Data Flow](#data-flow)
- [Database Schema](#database-schema)
- [Security Architecture](#security-architecture)
- [Scalability Considerations](#scalability-considerations)
- [Third-Party Integrations](#third-party-integrations)
- [Decision Records](#decision-records)

---

## System Overview

MockMate is a full-stack web application built to provide technical interview practice with AI-powered feedback. The platform consists of:

- **Frontend:** Next.js 15 React application
- **Backend:** Next.js API routes (serverless functions)
- **Database:** Firebase Firestore (NoSQL)
- **Authentication:** Firebase Auth with OAuth
- **AI:** Google Gemini 2.5 Flash
- **Payments:** Stripe
- **Hosting:** Vercel (frontend + API routes)

### Architecture Principles

1. **Serverless-First:** No server management, infinite scalability
2. **Security by Default:** Authentication, rate limiting, input validation on all endpoints
3. **Performance:** Edge deployment, caching strategies, optimized bundles
4. **Developer Experience:** TypeScript, hot reload, comprehensive tooling
5. **Cost-Effective:** Pay-per-use model, efficient AI token usage

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User's Browser                           │
│  ┌────────────────┐  ┌──────────────────┐  ┌─────────────────┐ │
│  │  React UI      │  │  Monaco Editor   │  │  State          │ │
│  │  (Next.js)     │  │  (Code Editor)   │  │  Management     │ │
│  └────────────────┘  └──────────────────┘  └─────────────────┘ │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTPS
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Vercel Edge Network                           │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │                    Next.js Application                       ││
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐││
│  │  │  Static Pages  │  │  SSR Pages     │  │  API Routes    │││
│  │  │  (Landing,     │  │  (Dashboard,   │  │  (Serverless)  │││
│  │  │   Pricing)     │  │   Interview)   │  │                │││
│  │  └────────────────┘  └────────────────┘  └───────┬────────┘││
│  └────────────────────────────────────────────────────┼─────────┘│
└───────────────────────────────────────────────────────┼──────────┘
                                                        │
                    ┌───────────────────────────────────┼──────────┐
                    │                                   │          │
                    ▼                                   ▼          ▼
      ┌─────────────────────────┐        ┌──────────────────────────────┐
      │   Firebase Platform     │        │   External APIs              │
      │  ┌──────────────────┐   │        │  ┌────────────────────────┐ │
      │  │  Authentication  │   │        │  │  Google Gemini AI      │ │
      │  │  (OAuth 2.0)     │   │        │  │  (Chat & Feedback)     │ │
      │  └──────────────────┘   │        │  └────────────────────────┘ │
      │  ┌──────────────────┐   │        │  ┌────────────────────────┐ │
      │  │  Firestore       │   │        │  │  Stripe                │ │
      │  │  (Database)      │   │        │  │  (Payments)            │ │
      │  └──────────────────┘   │        │  └────────────────────────┘ │
      │  ┌──────────────────┐   │        └──────────────────────────────┘
      │  │  Analytics       │   │
      │  └──────────────────┘   │
      └─────────────────────────┘
```

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 15.2.4 | React framework, SSR, routing |
| React | 19.x | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.1.9 | Styling |
| Radix UI | Latest | Accessible components |
| Monaco Editor | 4.7.0 | Code editor |
| Framer Motion | 12.x | Animations |
| Three.js | Latest | 3D graphics |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js API Routes | 15.2.4 | Serverless functions |
| Node.js | 18+ | Runtime environment |
| Firebase Admin SDK | 13.6.0 | Server-side Firebase operations |
| Google Generative AI | 0.24.1 | Gemini API client |
| Stripe (Server) | 19.3.1 | Payment processing |

### Database & Auth

| Technology | Version | Purpose |
|------------|---------|---------|
| Firebase Auth | 12.6.0 | User authentication |
| Firestore | 12.6.0 | NoSQL database |
| Firebase Analytics | 12.6.0 | User analytics |

### DevOps & Tooling

| Technology | Purpose |
|------------|---------|
| Vercel | Hosting, CI/CD |
| pnpm | Package management |
| ESLint | Code linting |
| Prettier | Code formatting |
| Git | Version control |

---

## Core Components

### 1. Interview Engine (`/app/interview/page.tsx`)

**Purpose:** Main interview interface with AI-powered chat and code execution

**Key Features:**
- Real-time AI chat (Interviewer + Partner modes)
- Monaco code editor with syntax highlighting
- Live code execution and testing
- Workspace file management
- Session state persistence

**Component Tree:**
```
InterviewPage
├── ChatPanel
│   ├── MessageList
│   ├── RoleToggle (Interviewer ↔ Partner)
│   └── ChatInput
├── CodeEditor
│   ├── MonacoEditor
│   ├── FileExplorer
│   └── TestRunner
└── ControlPanel
    ├── TimerDisplay
    ├── TestStatus
    └── SubmitButton
```

**State Management:**
```typescript
interface InterviewState {
  scenario: Scenario
  conversationHistory: Message[]
  workspace: {
    files: File[]
    activeFile: string
  }
  testResults: TestResults
  sessionMetrics: {
    startTime: Date
    duration: number
    hintsUsed: number
  }
}
```

### 2. Chat System (`/app/api/chat/route.ts`)

**Purpose:** AI-powered conversational interviewer using Google Gemini

**Architecture:**
```
User Input → API Route → Gemini API → Response Processing → User
                ↓
          Rate Limiting
                ↓
          Context Building
                ↓
          Prompt Engineering
```

**Prompt Engineering:**
- **Interviewer Mode:** 147 lines of system instructions to simulate realistic technical interviewer
- **Partner Mode:** 40 lines to simulate helpful coding assistant
- Dynamic context injection (code, test results, conversation history)

**Retry Logic:**
```typescript
const retry = async (fn, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === maxRetries - 1 || !isRetryable(error)) throw error
      await sleep(Math.pow(2, i) * 1000) // Exponential backoff
    }
  }
}
```

### 3. Code Execution Engine (`/app/api/execute/route.ts`)

**Purpose:** Safely execute user-submitted code in sandboxed environments

**Architecture:**

#### JavaScript Execution
```
User Code → Validation → VM Sandbox → Test Runner → Results
                ↓
          Timeout Protection
                ↓
          Resource Limits
```

**Implementation:**
```typescript
import vm from 'vm'

const sandbox = {
  console: { log: () => {} },
  // Disabled dangerous globals
  setTimeout: undefined,
  setInterval: undefined,
  require: undefined,
  process: undefined,
  // ... more restrictions
}

vm.runInNewContext(userCode, sandbox, {
  timeout: 5000,
  displayErrors: false
})
```

#### Python Execution
```
User Code → Validation → Subprocess → Test Runner → Results
                ↓
          Import Restrictions
                ↓
          Resource Limits
```

**Security Measures:**
- Timeout protection (5s for JS, 10s for Python)
- Memory limits (256MB)
- No file system access
- No network access
- Blocked dangerous imports (os, subprocess, sys, etc.)

### 4. Feedback Generation (`/app/api/generate-feedback/route.ts`)

**Purpose:** Generate comprehensive post-interview performance analysis

**Input Data:**
```typescript
interface FeedbackInput {
  code: string              // User's solution
  testResults: TestResults  // Test pass/fail data
  conversation: Message[]   // Chat history
  metrics: {
    duration: number
    hintsUsed: number
    collaboration: number
  }
}
```

**AI Prompt Structure:**
```
You are an expert technical interviewer conducting a debrief...

## Session Data
- Problem: ${scenarioTitle}
- Language: ${language}
- Duration: ${duration}
- Tests Passed: ${passed}/${total}

## Code Submitted
${userCode}

## Conversation Analysis
${conversationHistory}

## Output Format (Strict)
1. Executive Summary (2-3 sentences)
2. Technical Analysis
   - Code Quality: [0-100]
   - Algorithmic Thinking: [0-100]
   - Testing Approach: [0-100]
3. Communication Skills
4. Strengths (bullet points)
5. Areas for Improvement (bullet points)
6. Action Plan (numbered steps)

OVERALL SCORE: X/100
```

**Score Extraction:**
```typescript
const scoreMatch = feedback.match(/OVERALL SCORE:\s*(\d+)\/100/)
const score = scoreMatch ? parseInt(scoreMatch[1]) : 0
```

### 5. Payment System

**Architecture:**
```
User → Checkout UI → /api/create-checkout → Stripe Checkout
                                                    ↓
                                            Payment Success
                                                    ↓
                                           Webhook Triggered
                                                    ↓
                                        /api/webhook/stripe
                                                    ↓
                                          Update Firestore
                                                    ↓
                                          User Profile Updated
```

**Webhook Security:**
```typescript
const sig = request.headers.get('stripe-signature')
const event = stripe.webhooks.constructEvent(
  rawBody,
  sig,
  process.env.STRIPE_WEBHOOK_SECRET
)
// Prevents replay attacks and verifies source
```

---

## Data Flow

### Interview Session Flow

```
1. User Login
   ↓
2. Select Interview Question (from 200+ scenarios)
   ↓
3. Initialize Session
   ├─→ Create Firestore session document
   ├─→ Load scenario data
   └─→ Initialize workspace
   ↓
4. Coding Phase
   ├─→ User writes code in Monaco editor
   ├─→ User chats with AI (Gemini API calls)
   ├─→ User runs tests (/api/execute)
   └─→ Session state saved to Firestore every 30s
   ↓
5. Submit Solution
   ↓
6. Generate Feedback
   ├─→ /api/generate-feedback (Gemini API)
   ├─→ Calculate scores
   └─→ Save feedback to Firestore
   ↓
7. Review Session
   └─→ View feedback, download PDF, review code
```

### Authentication Flow

```
1. User clicks "Login with GitHub"
   ↓
2. Redirect to Firebase OAuth
   ↓
3. GitHub OAuth consent screen
   ↓
4. GitHub redirects to Firebase with code
   ↓
5. Firebase exchanges code for token
   ↓
6. Firebase creates/updates user
   ↓
7. Check Firestore for user profile
   ├─→ If exists: Load profile
   └─→ If not: Create new profile
   ↓
8. Return to app with Firebase token
   ↓
9. Store token in client (memory + sessionStorage)
   ↓
10. All API calls include token in Authorization header
```

---

## Database Schema

### Firestore Collections

#### `profiles` Collection
```typescript
interface UserProfile {
  userId: string              // Document ID
  email: string
  displayName: string | null
  photoURL: string | null
  tier: 'free' | 'pro'
  stripeCustomerId?: string
  subscriptionEnd?: Timestamp
  createdAt: Timestamp
  lastLogin: Timestamp
  stats: {
    totalSessions: number
    completedSessions: number
    averageScore: number
  }
}
```

**Security Rules:**
```javascript
match /profiles/{userId} {
  allow read, write: if request.auth.uid == userId;
}
```

#### `sessions` Collection
```typescript
interface Session {
  sessionId: string           // Document ID
  userId: string
  scenarioId: string
  scenarioTitle: string
  language: string
  status: 'in_progress' | 'completed' | 'abandoned'
  startTime: Timestamp
  endTime?: Timestamp
  duration?: number           // seconds
  workspace: {
    files: File[]
    activeFile: string
  }
  conversationHistory: Message[]
  testResults?: TestResults
  feedback?: {
    score: number
    breakdown: Scores
    text: string
    generatedAt: Timestamp
  }
  metrics: {
    hintsUsed: number
    messagesExchanged: number
    testRunsExecuted: number
  }
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

**Security Rules:**
```javascript
match /sessions/{sessionId} {
  allow read: if request.auth.uid == resource.data.userId;
  allow create: if request.auth.uid == request.resource.data.userId;
  allow update: if request.auth.uid == resource.data.userId;
}
```

#### `promo_code_usage` Collection
```typescript
interface PromoCodeUsage {
  documentId: string          // `${userId}_${code}`
  userId: string
  code: string
  usedAt: Timestamp
  discount: {
    type: 'percentage' | 'free_trial'
    value: number
  }
}
```

**Security Rules:**
```javascript
match /promo_code_usage/{docId} {
  allow read: if request.auth.uid == resource.data.userId;
  allow create: if request.auth.uid == request.resource.data.userId
                   && docId.startsWith(request.auth.uid + '_');
}
```

### Data Indexing Strategy

**Composite Indexes:**
```
profiles: [tier, createdAt] - for tier-based queries
sessions: [userId, status, startTime] - for user's active sessions
sessions: [userId, createdAt] - for session history
```

**Query Performance:**
- All user-scoped queries use `userId` as first filter
- Timestamps indexed for sorting
- Limited use of array-contains (only for tags if needed)

---

## Security Architecture

### Defense in Depth

**Layer 1: Network**
- HTTPS/TLS 1.3 only
- Vercel DDoS protection
- Edge caching with security headers

**Layer 2: Application**
- CORS configuration
- Rate limiting (IP-based)
- CSRF protection
- Input validation (Zod schemas)

**Layer 3: Authentication**
- Firebase Auth (OAuth 2.0)
- JWT token validation
- Automatic token expiration
- Session management

**Layer 4: Authorization**
- User-scoped data access
- Firestore security rules
- Server-side permission checks

**Layer 5: Data**
- Encryption at rest (Firestore)
- Encryption in transit (TLS)
- No sensitive data logging
- PII handling compliance

### Security Headers

```typescript
// next.config.mjs
headers: [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; ..."
  }
]
```

---

## Scalability Considerations

### Current Scale

- **Users:** Designed for 1K-10K concurrent users
- **API Calls:** Rate limited to prevent abuse
- **Database:** Firestore auto-scales
- **Functions:** Serverless, infinite scale (Vercel limits apply)

### Bottlenecks & Solutions

**1. AI API Costs**
- **Problem:** Every chat message costs money
- **Solution:** Implement prompt caching, response caching for common questions

**2. Code Execution**
- **Problem:** CPU-intensive operations
- **Solution:** Timeout limits, queue system for high load, consider dedicated execution service

**3. Rate Limiting**
- **Problem:** In-memory limits don't work across serverless instances
- **Solution:** Migrate to Redis-based distributed rate limiting

**4. Database Queries**
- **Problem:** Firestore reads cost money
- **Solution:** Implement client-side caching, use pagination, limit query ranges

### Scaling Roadmap

**Phase 1 (Current):** Single region, serverless
**Phase 2 (1K-10K users):** Multi-region deployment, CDN optimization
**Phase 3 (10K-100K users):** Dedicated execution service, Redis cache, query optimization
**Phase 4 (100K+ users):** Microservices architecture, load balancing, database sharding

---

## Third-Party Integrations

### Google Gemini AI

**Model:** `gemini-2.5-flash`
**Pricing:** ~$0.075 per 1M input tokens, ~$0.30 per 1M output tokens

**Usage Patterns:**
- Chat: ~500 tokens input, ~200 tokens output per message
- Feedback: ~2000 tokens input, ~1000 tokens output per session

**Cost Estimate:**
- 1000 chat messages/month = ~$0.50
- 100 feedback generations/month = ~$0.30
- Total: ~$0.80/month per active user

**Optimization Opportunities:**
- Implement prompt caching (reduce input tokens by 80%)
- Cache common responses
- Use shorter system prompts

### Stripe

**Products:**
- Pro subscription: $X/month recurring
- Webhook events for subscription management

**Security:**
- Webhook signature verification
- idempotency keys for duplicate prevention
- Test mode for development

### Firebase

**Services Used:**
- Authentication: OAuth 2.0
- Firestore: NoSQL database
- Analytics: User tracking

**Cost Estimate:**
- Auth: Free (< 50K MAU)
- Firestore: ~$0.06 per 100K reads
- Analytics: Free

---

## Decision Records

### ADR-001: Why Next.js?

**Decision:** Use Next.js 15 with App Router

**Rationale:**
- Server-side rendering for SEO
- API routes eliminate separate backend
- Vercel deployment is seamless
- Great developer experience

**Alternatives Considered:**
- Create React App: No SSR, no backend
- Remix: Less mature ecosystem
- Nuxt: Would require Vue migration

### ADR-002: Why Firebase over PostgreSQL?

**Decision:** Use Firebase Firestore

**Rationale:**
- NoSQL fits document-based data model
- Built-in authentication integration
- Auto-scaling
- Real-time capabilities (future use)
- Generous free tier

**Tradeoffs:**
- Vendor lock-in
- Less flexible querying
- Eventual consistency

### ADR-003: Why Gemini over OpenAI?

**Decision:** Use Google Gemini 2.5 Flash

**Rationale:**
- 10x cheaper than GPT-4
- Excellent code understanding
- Prompt caching support
- Good context window (1M tokens)

**Tradeoffs:**
- Slightly lower quality than GPT-4
- Less mature ecosystem

### ADR-004: Why Vercel?

**Decision:** Deploy on Vercel

**Rationale:**
- Zero-config Next.js deployment
- Edge network (global CDN)
- Preview deployments for PRs
- Generous free tier

**Tradeoffs:**
- Vendor lock-in
- Function timeout limits (10s on hobby)
- Higher cost at scale vs. self-hosting

---

**Document Version:** 1.0.0
**Last Updated:** 2025-01-20
**Author:** MockMate Engineering Team
