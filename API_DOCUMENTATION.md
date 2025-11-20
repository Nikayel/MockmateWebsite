# MockMate API Documentation

Complete API reference for the MockMate platform. All endpoints are serverless functions deployed on Vercel.

## Table of Contents

- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Endpoints](#endpoints)
  - [Chat API](#chat-api)
  - [Code Execution API](#code-execution-api)
  - [Feedback Generation API](#feedback-generation-api)
  - [Payment APIs](#payment-apis)
  - [Promo Code API](#promo-code-api)
- [Webhooks](#webhooks)
- [SDK Examples](#sdk-examples)

---

## Authentication

Most endpoints require Firebase Authentication. Include the Firebase ID token in the Authorization header:

```http
Authorization: Bearer <firebase_id_token>
```

### Getting a Token

```typescript
import { auth } from '@/lib/firebase-client'

const token = await auth.currentUser?.getIdToken()
```

### Unauthenticated Endpoints

Some endpoints don't require authentication:
- `/api/chat` (rate limited by IP)
- `/api/execute` (rate limited by IP)
- `/api/webhook/stripe` (verified by Stripe signature)

---

## Rate Limiting

All endpoints implement rate limiting to prevent abuse:

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/chat` | 20 requests | 60 seconds |
| `/api/execute` | 10 requests | 60 seconds |
| `/api/generate-feedback` | 5 requests | 60 seconds |
| `/api/promo-code` | 5 requests | 60 seconds |
| Payment endpoints | 10 requests | 60 seconds |

**Rate Limit Headers:**
```http
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 15
X-RateLimit-Reset: 1705795200
```

**429 Response:**
```json
{
  "error": "Rate limit exceeded. Please try again later.",
  "retryAfter": 45
}
```

---

## Error Handling

### Standard Error Response

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { }
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |
| 503 | Service Unavailable - AI service temporarily down |

### Common Error Codes

- `INVALID_INPUT` - Request validation failed
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `AI_SERVICE_ERROR` - Gemini API error
- `EXECUTION_TIMEOUT` - Code execution timeout
- `AUTHENTICATION_REQUIRED` - Missing or invalid token
- `PAYMENT_REQUIRED` - Pro subscription needed

---

## Endpoints

### Chat API

Real-time AI interview conversation endpoint using Google Gemini.

**Endpoint:** `POST /api/chat`

**Authentication:** Optional (rate limited by IP if unauthenticated)

**Rate Limit:** 20 requests per minute

#### Request Body

```typescript
interface ChatRequest {
  message: string              // User's message (max 5000 chars)
  conversationHistory: Array<{
    role: 'user' | 'model'
    parts: Array<{ text: string }>
  }>
  scenarioTitle: string        // Interview question title
  scenarioDescription: string  // Full question description
  language: string            // Programming language
  roleType: 'interviewer' | 'partner'
  workspace?: {               // Code context
    files: Array<{
      name: string
      content: string
      language: string
    }>
    activeFile?: string
  }
  testResults?: {             // Test execution results
    passed: number
    failed: number
    total: number
    details: string
  }
}
```

#### Response

```typescript
interface ChatResponse {
  response: string            // AI's response
  error?: string             // Error message if failed
}
```

#### Example

```typescript
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: "How should I approach this problem?",
    conversationHistory: [],
    scenarioTitle: "Two Sum",
    scenarioDescription: "Given an array of integers...",
    language: "javascript",
    roleType: "interviewer",
    workspace: {
      files: [{
        name: "solution.js",
        content: "function twoSum(nums, target) { }",
        language: "javascript"
      }]
    }
  })
})

const data = await response.json()
console.log(data.response)
```

#### AI Roles

**Interviewer (Sable):**
- Asks clarifying questions
- Provides hints strategically
- Evaluates approach
- Simulates realistic interview pressure

**Partner (Coding Assistant):**
- Helps with syntax
- Suggests debugging approaches
- Provides code examples
- More helpful and supportive

#### Retry Logic

The endpoint implements automatic retry with exponential backoff:
- Max retries: 3
- Base delay: 1 second
- Retryable errors: 503, 429, 500

---

### Code Execution API

Execute JavaScript or Python code in a sandboxed environment.

**Endpoint:** `POST /api/execute`

**Authentication:** Optional (rate limited by IP)

**Rate Limit:** 10 requests per minute

#### Request Body

```typescript
interface ExecuteRequest {
  code: string              // Code to execute
  language: 'javascript' | 'python'
  tests: Array<{
    input: any
    expected: any
    description?: string
  }>
  functionName: string      // Name of function to test
  timeout?: number         // Max execution time (ms, default 5000)
}
```

#### Response

```typescript
interface ExecuteResponse {
  results: Array<{
    passed: boolean
    input: any
    expected: any
    actual: any
    error?: string
    executionTime: number   // milliseconds
  }>
  summary: {
    total: number
    passed: number
    failed: number
    executionTime: number
  }
  error?: string
}
```

#### Example - JavaScript

```typescript
const response = await fetch('/api/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    code: `
      function twoSum(nums, target) {
        const map = new Map()
        for (let i = 0; i < nums.length; i++) {
          const complement = target - nums[i]
          if (map.has(complement)) {
            return [map.get(complement), i]
          }
          map.set(nums[i], i)
        }
        return []
      }
    `,
    language: 'javascript',
    functionName: 'twoSum',
    tests: [
      {
        input: [[2, 7, 11, 15], 9],
        expected: [0, 1],
        description: "Basic test case"
      },
      {
        input: [[3, 2, 4], 6],
        expected: [1, 2],
        description: "Different indices"
      }
    ]
  })
})

const data = await response.json()
console.log(`Passed: ${data.summary.passed}/${data.summary.total}`)
```

#### Example - Python

```typescript
const response = await fetch('/api/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    code: `
def two_sum(nums, target):
    num_map = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in num_map:
            return [num_map[complement], i]
        num_map[num] = i
    return []
    `,
    language: 'python',
    functionName: 'two_sum',
    tests: [
      {
        input: [[2, 7, 11, 15], 9],
        expected: [0, 1]
      }
    ]
  })
})
```

#### Security & Sandboxing

**JavaScript:**
- Runs in Node.js VM with disabled dangerous globals
- No file system access
- No network access
- 5-second timeout
- Memory limited to 256MB

**Python:**
- Executes via subprocess with restricted environment
- No import of dangerous modules (os, subprocess, etc.)
- 10-second timeout
- Isolated process

**Limitations:**
- Cannot access external APIs
- Cannot install packages
- Cannot write to file system
- Limited CPU and memory

---

### Feedback Generation API

Generate post-interview performance feedback using AI.

**Endpoint:** `POST /api/generate-feedback`

**Authentication:** Optional

**Rate Limit:** 5 requests per minute

#### Request Body

```typescript
interface FeedbackRequest {
  scenarioTitle: string
  scenarioDescription: string
  language: string
  userCode: string
  conversationHistory: Array<{
    role: string
    content: string
    timestamp: string
  }>
  testResults: {
    passed: number
    total: number
    executionTime: number
    testCases: Array<{
      passed: boolean
      description: string
    }>
  }
  sessionDuration: number      // seconds
  hintsUsed: number
  collaborationMetrics: {
    messagesExchanged: number
    questionsAsked: number
    clarificationsRequested: number
  }
}
```

#### Response

```typescript
interface FeedbackResponse {
  feedback: string            // Detailed feedback report
  score: number              // 0-100 overall score
  breakdown: {
    codeQuality: number      // 0-100
    problemSolving: number   // 0-100
    communication: number    // 0-100
    timeManagement: number   // 0-100
  }
  strengths: string[]
  improvements: string[]
  nextSteps: string[]
  error?: string
}
```

#### Example

```typescript
const response = await fetch('/api/generate-feedback', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    scenarioTitle: "Two Sum",
    scenarioDescription: "Find two numbers that add up to target",
    language: "javascript",
    userCode: "function twoSum(nums, target) { ... }",
    conversationHistory: [
      {
        role: "interviewer",
        content: "Can you explain your approach?",
        timestamp: "2025-01-20T10:00:00Z"
      },
      {
        role: "user",
        content: "I'll use a hash map to store complements",
        timestamp: "2025-01-20T10:01:00Z"
      }
    ],
    testResults: {
      passed: 8,
      total: 10,
      executionTime: 45,
      testCases: [
        { passed: true, description: "Basic case" },
        { passed: false, description: "Edge case: duplicates" }
      ]
    },
    sessionDuration: 1800,
    hintsUsed: 2,
    collaborationMetrics: {
      messagesExchanged: 15,
      questionsAsked: 5,
      clarificationsRequested: 3
    }
  })
})

const data = await response.json()
console.log(`Overall Score: ${data.score}/100`)
console.log(data.feedback)
```

#### Feedback Format

The AI generates a comprehensive "Brutal Debrief" including:

1. **Executive Summary:** High-level performance overview
2. **Technical Analysis:** Code quality, algorithms, complexity
3. **Communication Assessment:** How well you explained your thinking
4. **Problem-Solving Approach:** Strategy and methodology
5. **Time Management:** Pacing and efficiency
6. **Strengths:** What you did well
7. **Areas for Improvement:** Specific weaknesses
8. **Action Plan:** Concrete next steps

---

### Payment APIs

#### Create Checkout Session

Create a Stripe checkout session for Pro subscription.

**Endpoint:** `POST /api/create-checkout`

**Authentication:** Required

**Request Body:**

```typescript
interface CheckoutRequest {
  priceId: string           // Stripe price ID
  userId: string
  tier: 'website' | 'vscode'
  successUrl?: string
  cancelUrl?: string
}
```

**Response:**

```typescript
interface CheckoutResponse {
  sessionId: string         // Stripe checkout session ID
  url: string              // Redirect URL for checkout
}
```

#### Customer Portal

Access Stripe customer portal for subscription management.

**Endpoint:** `POST /api/customer-portal`

**Authentication:** Required

**Request Body:**

```typescript
interface PortalRequest {
  userId: string
  returnUrl?: string
}
```

**Response:**

```typescript
interface PortalResponse {
  url: string              // Customer portal URL
}
```

#### Sync Subscription

Manually sync subscription status with Firestore.

**Endpoint:** `POST /api/sync-subscription`

**Authentication:** Required

**Request Body:**

```typescript
interface SyncRequest {
  userId: string
}
```

**Response:**

```typescript
interface SyncResponse {
  status: 'free' | 'pro'
  synced: boolean
  subscriptionEnd?: string  // ISO date string
}
```

---

### Promo Code API

Validate and apply promotional codes.

**Endpoint:** `POST /api/promo-code`

**Authentication:** Required

**Rate Limit:** 5 requests per minute

#### Request Body

```typescript
interface PromoCodeRequest {
  code: string             // Promo code to validate
  userId: string
}
```

#### Response

```typescript
interface PromoCodeResponse {
  valid: boolean
  message: string
  discount?: {
    type: 'percentage' | 'fixed' | 'free_trial'
    value: number
    duration?: number      // days
  }
  applied: boolean
  error?: string
}
```

#### Example

```typescript
const response = await fetch('/api/promo-code', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    code: 'MOCKMATE2025',
    userId: 'user_123'
  })
})

const data = await response.json()
if (data.valid) {
  console.log(`Applied: ${data.discount.value}% off`)
}
```

---

## Webhooks

### Stripe Webhook

Handles Stripe events for subscription management.

**Endpoint:** `POST /api/webhook/stripe`

**Authentication:** Stripe signature verification

**Events Handled:**

- `checkout.session.completed` - New subscription created
- `customer.subscription.updated` - Subscription changed
- `customer.subscription.deleted` - Subscription cancelled
- `invoice.payment_failed` - Payment failure

**Webhook Setup:**

1. Add endpoint in Stripe Dashboard: `https://yourdomain.com/api/webhook/stripe`
2. Select events to listen for
3. Copy webhook secret to `STRIPE_WEBHOOK_SECRET` env variable

**Security:**

Webhook requests are verified using Stripe signature:

```typescript
const sig = request.headers.get('stripe-signature')
const event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
```

---

## SDK Examples

### TypeScript/JavaScript Client

```typescript
class MockMateAPI {
  private baseUrl: string
  private token?: string

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl
  }

  setAuthToken(token: string) {
    this.token = token
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { 'Authorization': `Bearer ${this.token}` })
      },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Chat request failed')
    }

    return response.json()
  }

  async executeCode(request: ExecuteRequest): Promise<ExecuteResponse> {
    const response = await fetch(`${this.baseUrl}/api/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      throw new Error('Code execution failed')
    }

    return response.json()
  }

  async generateFeedback(request: FeedbackRequest): Promise<FeedbackResponse> {
    const response = await fetch(`${this.baseUrl}/api/generate-feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    })

    return response.json()
  }
}

// Usage
const api = new MockMateAPI()
api.setAuthToken(await auth.currentUser?.getIdToken())

const result = await api.executeCode({
  code: 'function add(a, b) { return a + b }',
  language: 'javascript',
  functionName: 'add',
  tests: [{ input: [1, 2], expected: 3 }]
})
```

### React Hook

```typescript
import { useState } from 'react'

export function useChat() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = async (request: ChatRequest) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      return data.response
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { sendMessage, loading, error }
}
```

---

## Best Practices

### 1. Error Handling

Always handle errors gracefully:

```typescript
try {
  const result = await fetch('/api/execute', { ... })
  const data = await result.json()

  if (data.error) {
    // Handle API error
    console.error('API Error:', data.error)
  }
} catch (error) {
  // Handle network error
  console.error('Network Error:', error)
}
```

### 2. Rate Limit Handling

Implement exponential backoff for rate limits:

```typescript
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options)

    if (response.status !== 429) {
      return response
    }

    const retryAfter = response.headers.get('Retry-After')
    const delay = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, i) * 1000

    await new Promise(resolve => setTimeout(resolve, delay))
  }

  throw new Error('Max retries exceeded')
}
```

### 3. Input Validation

Validate inputs before sending:

```typescript
import { z } from 'zod'

const chatRequestSchema = z.object({
  message: z.string().min(1).max(5000),
  scenarioTitle: z.string().max(200),
  language: z.enum(['javascript', 'typescript', 'python']),
  roleType: z.enum(['interviewer', 'partner'])
})

// Validate before sending
const validated = chatRequestSchema.parse(userInput)
await fetch('/api/chat', { body: JSON.stringify(validated) })
```

### 4. TypeScript Types

Use provided types for type safety:

```typescript
import type { ChatRequest, ChatResponse } from '@/types/api'

const request: ChatRequest = {
  message: "Hello",
  // TypeScript will enforce correct structure
}
```

---

## Support

For API questions or issues:

- **Email:** api-support@mockmate.dev
- **Documentation:** https://mockmate.dev/docs/api
- **Status Page:** https://status.mockmate.dev
- **GitHub Issues:** https://github.com/Nikayel/MockmateWebsite/issues

---

**API Version:** 1.0.0
**Last Updated:** 2025-01-20
