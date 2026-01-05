# CodeSparring API Reference

Complete API documentation for the CodeSparring platform. All endpoints are serverless functions deployed on Vercel.

## Base URL

```
Production: https://codesparring.com/api
Development: http://localhost:3000/api
```

## Authentication

Most endpoints require Firebase Authentication. Include the ID token in the Authorization header:

```http
Authorization: Bearer <firebase_id_token>
```

### Getting a Token (Client-Side)

```typescript
import { auth } from '@/lib/firebase-client'

const token = await auth.currentUser?.getIdToken()
```

---

## Quick Reference

| Category | Endpoints | Auth Required |
|----------|-----------|---------------|
| [Interview](#interview-apis) | `/chat`, `/execute`, `/generate-feedback` | Optional (rate-limited) |
| [User](#user-apis) | `/user/profile`, `/user/metrics`, `/user/usage` | Yes |
| [Spaced Repetition](#spaced-repetition-apis) | `/spaced-repetition/*` | Yes |
| [Payments](#payment-apis) | `/create-checkout`, `/customer-portal` | Yes |
| [Admin](#admin-apis) | `/admin/*` | Yes (Admin only) |

---

## Rate Limits

All endpoints implement rate limiting:

| Tier | Requests/min | Tokens/min | Concurrent |
|------|--------------|------------|------------|
| Free | 10 | 5,000 | 2 |
| Pro | 30 | 20,000 | 5 |
| Enterprise | 100 | 100,000 | 20 |

**Response Headers:**
```http
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 25
X-RateLimit-Reset: 1705795200
```

**429 Response:**
```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 45
}
```

---

## Interview APIs

### POST /api/chat

AI-powered interview chat with Google Gemini.

**Rate Limit:** 20 requests/min (free), 60 requests/min (pro)

#### Request

```typescript
interface ChatRequest {
  message: string                    // User message (max 10KB)
  code: string                       // Current code in editor
  scenarioTitle: string              // Problem title
  scenarioDescription: string        // Problem description
  language: string                   // Programming language
  roleType: 'interviewer' | 'partner'
  conversationHistory?: Message[]    // Previous messages
  testResults?: TestResults          // Latest test results
  workspaceContext?: WorkspaceFile[] // Open files (max 5)
}
```

#### Response

```typescript
interface ChatResponse {
  message: string           // AI response
  usage?: {
    inputTokens: number
    outputTokens: number
  }
  provider?: string         // AI provider used
}
```

#### Example

```typescript
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    message: "How should I approach this problem?",
    code: "function twoSum(nums, target) { }",
    scenarioTitle: "Two Sum",
    scenarioDescription: "Given an array of integers...",
    language: "javascript",
    roleType: "interviewer"
  })
})

const data = await response.json()
// { message: "Let's think about this step by step...", usage: { inputTokens: 150, outputTokens: 200 } }
```

#### AI Roles

| Role | Behavior |
|------|----------|
| `interviewer` | Asks clarifying questions, gives hints strategically, evaluates approach |
| `partner` | Helps with syntax, suggests debugging approaches, more supportive |

---

### POST /api/execute

Execute code in a sandboxed environment with test validation.

**Rate Limit:** 10 requests/min
**Timeout:** 60 seconds

#### Request

```typescript
interface ExecuteRequest {
  code: string                    // Code to execute (max 50KB)
  language: 'javascript' | 'typescript' | 'python' | 'java' | 'cpp' | 'go' | 'rust'
  scenarioId: string              // Problem ID for test cases
  supportingFiles?: SupportingFile[]  // Additional files
}
```

#### Response

```typescript
interface ExecuteResponse {
  success: boolean
  results: TestResult[]
  summary: {
    total: number
    passed: number
    failed: number
    executionTime: number    // milliseconds
  }
  consoleLogs?: string[]     // stdout/stderr
  error?: string
}

interface TestResult {
  passed: boolean
  input: any
  expected: any
  actual: any
  executionTime: number
  error?: string
}
```

#### Example

```typescript
const response = await fetch('/api/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    code: `function twoSum(nums, target) {
      const map = new Map();
      for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (map.has(complement)) return [map.get(complement), i];
        map.set(nums[i], i);
      }
      return [];
    }`,
    language: 'javascript',
    scenarioId: 'two-sum'
  })
})

const data = await response.json()
// { success: true, summary: { total: 5, passed: 5, failed: 0 }, results: [...] }
```

#### Supported Languages

| Language | Runtime | Timeout |
|----------|---------|---------|
| JavaScript | Node.js 18 | 5s |
| TypeScript | ts-node | 10s |
| Python | Python 3.11 | 10s |
| Java | OpenJDK 17 | 15s |
| C++ | g++ 12 | 10s |
| Go | Go 1.21 | 10s |
| Rust | rustc 1.75 | 15s |

---

### POST /api/generate-feedback

Generate comprehensive post-interview feedback using AI.

**Rate Limit:** 5 requests/min

#### Request

```typescript
interface FeedbackRequest {
  sessionData: {
    scenarioTitle: string
    scenarioDescription: string
    language: string
    userCode: string
    conversationHistory: Message[]
    testResults: TestResults
    sessionDuration: number       // seconds
    hintsUsed: number
    collaborationMetrics: {
      messagesExchanged: number
      questionsAsked: number
    }
  }
}
```

#### Response

```typescript
interface FeedbackResponse {
  feedback: string              // Detailed markdown feedback
  score: number                 // 0-100 overall score
  breakdown: {
    codeQuality: number         // 0-100
    problemSolving: number      // 0-100
    communication: number       // 0-100
    efficiency: number          // 0-100
  }
  strengths: string[]
  improvements: string[]
  nextSteps: string[]
}
```

---

## User APIs

### GET /api/user/profile

Get authenticated user's profile.

```typescript
// Response
{
  profile: {
    id: string
    email: string
    full_name: string
    avatar_url: string
    subscription_tier: 'free' | 'pro' | 'enterprise'
    subscription_status: 'active' | 'past_due' | 'canceled' | null
    created_at: string
  }
}
```

### POST /api/user/profile

Update user profile.

```typescript
// Request
{
  displayName?: string
  targetCompanies?: string[]
  experienceLevel?: 'student' | 'junior' | 'mid' | 'senior'
  targetRole?: string
}
```

### GET /api/user/metrics

Get user's interview performance metrics.

```typescript
// Response
{
  totalSessions: number
  completedSessions: number
  averageScore: number
  scoresByCategory: {
    codeQuality: number
    problemSolving: number
    communication: number
  }
  sessionsByDifficulty: {
    easy: number
    medium: number
    hard: number
  }
  streakDays: number
  lastSessionAt: string
}
```

### GET /api/user/usage

Get user's AI usage for current billing period.

```typescript
// Response
{
  currentPeriod: {
    start: string
    end: string
  }
  usage: {
    sessionsUsed: number
    sessionsLimit: number
    budgetUsed: number        // USD
    budgetLimit: number       // USD
    tokensUsed: number
  }
  tier: 'free' | 'pro' | 'enterprise'
}
```

---

## Spaced Repetition APIs

### GET /api/spaced-repetition/due

Get problems due for review.

```typescript
// Query params: ?limit=10

// Response
{
  problems: Array<{
    id: string
    title: string
    difficulty: 'easy' | 'medium' | 'hard'
    pattern: string
    dueDate: string
    masteryScore: number      // 0-100
    reviewCount: number
    lastReviewedAt: string
  }>
  totalDue: number
}
```

### POST /api/spaced-repetition/complete

Record a review and update scheduling.

```typescript
// Request
{
  problemId: string
  quality: 0 | 1 | 2 | 3 | 4 | 5   // 0=forgot, 5=perfect
  timeSpent: number                 // seconds
  hintsUsed: number
  testsPassed: number
  testsTotal: number
}

// Response
{
  nextReviewDate: string
  masteryScore: number
  intervalDays: number
}
```

### GET /api/spaced-repetition/stats

Get learning statistics.

```typescript
// Response
{
  totalProblems: number
  masteredProblems: number        // masteryScore >= 80
  reviewsDueToday: number
  currentStreak: number
  longestStreak: number
  patternProgress: {
    [pattern: string]: {
      total: number
      mastered: number
      averageMastery: number
    }
  }
}
```

---

## Payment APIs

### POST /api/create-checkout

Create Stripe checkout session.

```typescript
// Request
{
  priceId: string              // Stripe price ID
  successUrl?: string
  cancelUrl?: string
}

// Response
{
  sessionId: string            // Stripe session ID
  url: string                  // Checkout URL
}
```

### POST /api/customer-portal

Get Stripe customer portal URL.

```typescript
// Request
{
  returnUrl?: string
}

// Response
{
  url: string                  // Portal URL
}
```

### POST /api/sync-subscription

Force sync subscription status with Stripe.

```typescript
// Response
{
  status: 'free' | 'pro' | 'enterprise'
  subscriptionEnd?: string
  synced: boolean
}
```

---

## Admin APIs

> **Note:** All admin endpoints require admin role verification.

### GET /api/admin/analytics

Get platform analytics overview.

```typescript
// Query: ?range=7d|30d|90d

// Response
{
  users: {
    total: number
    new: number
    active: number
    churn: number
  }
  sessions: {
    total: number
    completed: number
    averageDuration: number
  }
  revenue: {
    mrr: number
    arr: number
    growth: number
  }
  timeSeries: Array<{
    date: string
    signups: number
    sessions: number
    revenue: number
  }>
}
```

### GET /api/admin/users

List and search users.

```typescript
// Query: ?page=1&limit=50&search=email&tier=pro&sort=created_at

// Response
{
  users: Array<UserProfile>
  pagination: {
    total: number
    page: number
    pages: number
  }
}
```

### GET /api/admin/revenue

Get revenue breakdown.

```typescript
// Response
{
  current: {
    mrr: number
    arr: number
    subscribers: number
  }
  byTier: {
    pro: { count: number, revenue: number }
    enterprise: { count: number, revenue: number }
  }
  trends: Array<{ month: string, mrr: number }>
}
```

---

## Webhook

### POST /api/webhook/stripe

Handles Stripe webhook events. Verified by Stripe signature.

**Events Handled:**
- `checkout.session.completed` - New subscription
- `customer.subscription.updated` - Plan change
- `customer.subscription.deleted` - Cancellation
- `invoice.paid` - Successful payment
- `invoice.payment_failed` - Failed payment

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid auth token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request body |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `QUOTA_EXCEEDED` | 429 | Session/budget limit reached |
| `AI_SERVICE_ERROR` | 503 | AI provider unavailable |
| `EXECUTION_TIMEOUT` | 408 | Code execution timeout |

---

## SDK Example

```typescript
class CodeSparringAPI {
  private token?: string

  setToken(token: string) {
    this.token = token
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`/api${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
        ...options?.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'API request failed')
    }

    return response.json()
  }

  // Interview
  chat(data: ChatRequest) {
    return this.request<ChatResponse>('/chat', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  execute(data: ExecuteRequest) {
    return this.request<ExecuteResponse>('/execute', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // User
  getProfile() {
    return this.request<{ profile: UserProfile }>('/user/profile')
  }

  getMetrics() {
    return this.request<UserMetrics>('/user/metrics')
  }

  // Spaced Repetition
  getDueProblems(limit = 10) {
    return this.request<DueProblemsResponse>(`/spaced-repetition/due?limit=${limit}`)
  }

  completeReview(data: CompleteReviewRequest) {
    return this.request<CompleteReviewResponse>('/spaced-repetition/complete', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }
}

// Usage
const api = new CodeSparringAPI()
api.setToken(await auth.currentUser?.getIdToken())

const profile = await api.getProfile()
const dueProblems = await api.getDueProblems(5)
```

---

**Last Updated:** January 2026
