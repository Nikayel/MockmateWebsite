# CodeSparring Testing Guide: From A to Z

> A comprehensive guide to understanding and implementing tests in the CodeSparring codebase. Written for developers new to testing.

## Table of Contents

1. [What is Testing and Why Do We Need It?](#1-what-is-testing-and-why-do-we-need-it)
2. [Types of Tests](#2-types-of-tests)
3. [Our Testing Stack](#3-our-testing-stack)
4. [Understanding Our Current Tests](#4-understanding-our-current-tests)
5. [How to Run Tests](#5-how-to-run-tests)
6. [Writing Your First Test](#6-writing-your-first-test)
7. [Testing Patterns and Best Practices](#7-testing-patterns-and-best-practices)
8. [Mocking Dependencies](#8-mocking-dependencies)
9. [Testing API Routes](#9-testing-api-routes)
10. [Testing React Components](#10-testing-react-components)
11. [Test Coverage](#11-test-coverage)
12. [Common Testing Mistakes](#12-common-testing-mistakes)
13. [Testing Checklist](#13-testing-checklist)

---

## 1. What is Testing and Why Do We Need It?

### What is Testing?

Testing is the process of verifying that your code works as expected. Instead of manually clicking through your application to check if everything works, you write code that automatically checks your code.

### Why Do We Need Tests?

1. **Catch Bugs Early**: Tests find bugs before your users do
2. **Confidence to Refactor**: Change code without fear of breaking things
3. **Documentation**: Tests show how code is supposed to work
4. **Faster Development**: Spend less time manually testing
5. **Prevent Regressions**: Old bugs don't come back

### Real Example from Our Codebase

Without tests, imagine you change the scoring algorithm:

```typescript
// Before: calculateScore returns 0-100
function calculateScore(metrics) {
  return metrics.codeQuality * 0.4 + metrics.problemSolving * 0.6;
}

// After: You "improve" it but accidentally break it
function calculateScore(metrics) {
  return metrics.codeQuality * 0.4 + metrics.problemSolving * 0.6 * 100; // BUG!
}
```

With tests, this bug is caught immediately:

```typescript
test('calculateScore returns value between 0 and 100', () => {
  const result = calculateScore({ codeQuality: 80, problemSolving: 70 });
  expect(result).toBeLessThanOrEqual(100);
  expect(result).toBeGreaterThanOrEqual(0);
});
// ❌ Test fails: Expected <= 100, received 4232
```

---

## 2. Types of Tests

### Unit Tests

Test individual functions or components in isolation.

```typescript
// Testing a single function
test('isValidEmail returns true for valid email', () => {
  expect(isValidEmail('user@example.com')).toBe(true);
});
```

**When to use**: Testing pure functions, utilities, algorithms

### Integration Tests

Test how multiple parts work together.

```typescript
// Testing that authentication and profile creation work together
test('user signup creates profile in database', async () => {
  const user = await signUp('test@example.com', 'password');
  const profile = await getProfile(user.id);
  expect(profile).toBeDefined();
  expect(profile.email).toBe('test@example.com');
});
```

**When to use**: Testing API routes, database operations, service interactions

### End-to-End (E2E) Tests

Test the entire application from the user's perspective.

```typescript
// Using Playwright or Cypress
test('user can complete interview session', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.click('button[type="submit"]');
  await page.goto('/interview');
  // ... complete flow
});
```

**When to use**: Critical user flows, checkout, authentication

### The Testing Pyramid

```
        /\
       /  \
      / E2E \        <- Few, slow, expensive
     /________\
    /          \
   / Integration \    <- Some, moderate speed
  /______________\
 /                \
/    Unit Tests    \  <- Many, fast, cheap
/____________________\
```

---

## 3. Our Testing Stack

### Vitest

We use [Vitest](https://vitest.dev/) as our testing framework. It's:
- Fast (uses Vite's transform pipeline)
- Compatible with Jest API (easy to learn)
- Built-in TypeScript support
- Great for Next.js projects

### RAG Retrieval Evaluation

RAG quality uses labeled retrieval fixtures, not arbitrary production queries. Run:

```bash
npx tsx scripts/eval-rag.ts
```

The script reports:

- `Precision@K`: how many of the top K retrieved documents are labeled relevant.
- `Recall@K`: how many labeled relevant documents appear in the top K.
- `MRR`: how early the first relevant document appears.

Operational retrieval telemetry, such as latency, strategy, candidate counts, overlap, and empty
result rate, is visible in the admin RAG dashboard. Precision and recall are only computed for
labeled eval cases because live user queries do not have ground-truth relevant IDs.

### Configuration

**File**: `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',           // Use Node.js environment
    globals: true,                 // Use global test functions
    include: ['**/*.test.ts', '**/*.test.tsx'],
    coverage: {
      provider: 'v8',              // Fast coverage
      reporter: ['text', 'json', 'html'],
      include: ['lib/**/*.ts', 'app/api/**/*.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
```

### Setup File

**File**: `vitest.setup.ts`

This file runs before all tests and sets up mocks:

```typescript
import { vi } from 'vitest'

// Mock Firebase (we don't want real database calls in tests)
vi.mock('@/lib/firebase', () => ({
  db: {},
  auth: {},
}))

// Mock Firebase Admin
vi.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn(),
        set: vi.fn(),
      })),
    })),
  },
}))

// Set test environment variables
process.env.NODE_ENV = 'test'
```

---

## 4. Understanding Our Current Tests

### Test File Locations

```
lib/
  __tests__/
    scoring.test.ts        # 290 lines - Interview scoring
    rate-limit.test.ts     # 275 lines - Rate limiting
    quota-enforcement.test.ts # 201 lines - User quotas
```

### Example: Scoring Test (`lib/__tests__/scoring.test.ts`)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { calculateUserScore, getPerformanceFeedback } from '../scoring'

describe('calculateUserScore', () => {
  it('calculates perfect score correctly', () => {
    const metrics = {
      codeQuality: 100,
      problemSolving: 100,
      understanding: 100,
      communication: 100,
    }

    const result = calculateUserScore(metrics)

    expect(result.overall).toBe(100)
    expect(result.breakdown.codeQuality).toBe(100)
  })

  it('handles zero scores', () => {
    const metrics = {
      codeQuality: 0,
      problemSolving: 0,
      understanding: 0,
      communication: 0,
    }

    const result = calculateUserScore(metrics)

    expect(result.overall).toBe(0)
  })

  it('does not penalize for not using AI hints', () => {
    const withHints = calculateUserScore({ ...defaultMetrics, hintsUsed: 3 })
    const withoutHints = calculateUserScore({ ...defaultMetrics, hintsUsed: 0 })

    // Score should be the same or better without hints
    expect(withoutHints.overall).toBeGreaterThanOrEqual(withHints.overall)
  })
})
```

### Example: Rate Limit Test (`lib/__tests__/rate-limit.test.ts`)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { rateLimit, executeRateLimit } from '../rate-limit'

describe('rateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows requests under the limit', async () => {
    const limiter = rateLimit({
      interval: 60000,    // 1 minute
      maxRequests: 10,
      prefix: 'test',
    })

    const request = new Request('http://localhost/api/test', {
      headers: { 'x-forwarded-for': '127.0.0.1' }
    })

    const result = await limiter.check(request)

    expect(result.success).toBe(true)
    expect(result.remaining).toBe(9)
  })

  it('blocks requests over the limit', async () => {
    const limiter = rateLimit({
      interval: 60000,
      maxRequests: 2,
      prefix: 'test',
    })

    const request = new Request('http://localhost/api/test')

    await limiter.check(request) // 1
    await limiter.check(request) // 2
    const result = await limiter.check(request) // 3 - should fail

    expect(result.success).toBe(false)
    expect(result.remaining).toBe(0)
  })
})
```

---

## 5. How to Run Tests

### Basic Commands

```bash
# Run all tests once
pnpm test

# Run tests in watch mode (re-runs on file changes)
pnpm test:watch

# Run tests with coverage report
pnpm test:coverage

# Run a specific test file
pnpm test lib/__tests__/scoring.test.ts

# Run tests matching a pattern
pnpm test -t "calculateUserScore"
```

### Understanding Test Output

```
 ✓ lib/__tests__/scoring.test.ts (15 tests) 234ms
   ✓ calculateUserScore
     ✓ calculates perfect score correctly
     ✓ handles zero scores
     ✓ does not penalize for not using AI hints
   ✓ getPerformanceFeedback
     ✓ returns excellent feedback for scores above 90
     ✓ returns good feedback for scores between 70-90

 Test Files  1 passed (1)
 Tests       15 passed (15)
 Duration    456ms
```

### Coverage Report

```
--------------------|---------|----------|---------|---------|
File                | % Stmts | % Branch | % Funcs | % Lines |
--------------------|---------|----------|---------|---------|
All files           |   45.23 |    38.12 |   52.14 |   44.89 |
 lib/scoring.ts     |   92.31 |    88.46 |   100.0 |   91.67 |
 lib/rate-limit.ts  |   78.45 |    65.22 |    85.0 |   77.14 |
--------------------|---------|----------|---------|---------|
```

- **% Stmts**: Percentage of code statements executed
- **% Branch**: Percentage of if/else branches covered
- **% Funcs**: Percentage of functions called
- **% Lines**: Percentage of lines executed

---

## 6. Writing Your First Test

### Step 1: Create Test File

Create a file next to your code with `.test.ts` extension:

```
lib/
  my-utility.ts
  __tests__/
    my-utility.test.ts
```

### Step 2: Write the Test

```typescript
// lib/__tests__/my-utility.test.ts
import { describe, it, expect } from 'vitest'
import { formatCurrency } from '../my-utility'

describe('formatCurrency', () => {
  it('formats USD correctly', () => {
    expect(formatCurrency(1000, 'USD')).toBe('$1,000.00')
  })

  it('formats negative amounts', () => {
    expect(formatCurrency(-500, 'USD')).toBe('-$500.00')
  })

  it('handles zero', () => {
    expect(formatCurrency(0, 'USD')).toBe('$0.00')
  })
})
```

### Step 3: Run and Verify

```bash
pnpm test lib/__tests__/my-utility.test.ts
```

### Anatomy of a Test

```typescript
describe('GroupName', () => {           // Group related tests

  beforeEach(() => {                    // Runs before EACH test
    // Setup code
  })

  afterEach(() => {                     // Runs after EACH test
    // Cleanup code
  })

  it('should do something', () => {     // Individual test
    // Arrange: Set up test data
    const input = 'test'

    // Act: Call the function
    const result = myFunction(input)

    // Assert: Check the result
    expect(result).toBe('expected')
  })
})
```

---

## 7. Testing Patterns and Best Practices

### AAA Pattern (Arrange-Act-Assert)

```typescript
it('calculates interview score', () => {
  // Arrange - Set up test data
  const metrics = {
    codeQuality: 80,
    problemSolving: 90,
  }

  // Act - Execute the code
  const score = calculateScore(metrics)

  // Assert - Verify the result
  expect(score).toBe(86) // 80*0.4 + 90*0.6
})
```

### Given-When-Then Pattern

```typescript
describe('user authentication', () => {
  it('given valid credentials, when login is called, then returns user', async () => {
    // Given
    const credentials = { email: 'test@example.com', password: 'valid' }

    // When
    const result = await login(credentials)

    // Then
    expect(result.user).toBeDefined()
    expect(result.user.email).toBe('test@example.com')
  })
})
```

### Test Edge Cases

```typescript
describe('divideNumbers', () => {
  it('divides positive numbers', () => {
    expect(divideNumbers(10, 2)).toBe(5)
  })

  it('handles division by zero', () => {
    expect(() => divideNumbers(10, 0)).toThrow('Cannot divide by zero')
  })

  it('handles negative numbers', () => {
    expect(divideNumbers(-10, 2)).toBe(-5)
  })

  it('handles decimal results', () => {
    expect(divideNumbers(10, 3)).toBeCloseTo(3.333, 2)
  })
})
```

### Test Async Code

```typescript
describe('fetchUserProfile', () => {
  it('returns user profile', async () => {
    const profile = await fetchUserProfile('user-123')

    expect(profile).toMatchObject({
      id: 'user-123',
      email: expect.any(String),
    })
  })

  it('throws on invalid user', async () => {
    await expect(fetchUserProfile('invalid')).rejects.toThrow('User not found')
  })
})
```

---

## 8. Mocking Dependencies

### Why Mock?

Mocking replaces real dependencies with fake ones so you can:
- Test in isolation
- Avoid hitting real databases/APIs
- Control test conditions
- Speed up tests

### Mocking Functions

```typescript
import { vi, describe, it, expect } from 'vitest'

// Mock a module
vi.mock('@/lib/firebase', () => ({
  db: {},
}))

describe('userService', () => {
  it('creates user in database', async () => {
    // Create a mock function
    const mockSet = vi.fn().mockResolvedValue(true)

    // Replace the real function
    vi.mocked(db.collection).mockReturnValue({
      doc: () => ({ set: mockSet })
    })

    // Test your code
    await createUser({ email: 'test@example.com' })

    // Verify the mock was called correctly
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'test@example.com' })
    )
  })
})
```

### Mocking External APIs

```typescript
import { vi, beforeEach } from 'vitest'

// Mock fetch globally
global.fetch = vi.fn()

describe('AI Provider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls Gemini API correctly', async () => {
    // Setup mock response
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'AI response' }] } }]
      })
    })

    const result = await callGemini('What is 2+2?')

    expect(result).toBe('AI response')
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('generativelanguage.googleapis.com'),
      expect.any(Object)
    )
  })

  it('handles API errors', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests'
    })

    await expect(callGemini('test')).rejects.toThrow('Rate limited')
  })
})
```

### Mocking Time

```typescript
import { vi, beforeEach, afterEach } from 'vitest'

describe('session timeout', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('expires session after 30 minutes', () => {
    const session = createSession()

    expect(session.isValid()).toBe(true)

    // Fast-forward 31 minutes
    vi.advanceTimersByTime(31 * 60 * 1000)

    expect(session.isValid()).toBe(false)
  })
})
```

---

## 9. Testing API Routes

### Testing Next.js API Routes

```typescript
// lib/__tests__/api/user-profile.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from '@/app/api/user/profile/route'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({ id: 'user-1', email: 'test@example.com' })
        })
      }))
    }))
  }
}))

vi.mock('@/lib/auth-server', () => ({
  verifyAuth: vi.fn().mockResolvedValue({
    authenticated: true,
    userId: 'user-1'
  })
}))

describe('GET /api/user/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns user profile for authenticated user', async () => {
    const request = new NextRequest('http://localhost/api/user/profile', {
      headers: {
        'Authorization': 'Bearer valid-token'
      }
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.profile).toMatchObject({
      id: 'user-1',
      email: 'test@example.com'
    })
  })

  it('returns 401 for unauthenticated request', async () => {
    vi.mocked(verifyAuth).mockResolvedValueOnce({
      authenticated: false
    })

    const request = new NextRequest('http://localhost/api/user/profile')
    const response = await GET(request)

    expect(response.status).toBe(401)
  })
})

describe('POST /api/user/profile', () => {
  it('updates user profile', async () => {
    const request = new NextRequest('http://localhost/api/user/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer valid-token'
      },
      body: JSON.stringify({
        displayName: 'John Doe',
        role: 'senior'
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('validates request body', async () => {
    const request = new NextRequest('http://localhost/api/user/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer valid-token'
      },
      body: JSON.stringify({
        role: 'invalid-role' // Invalid value
      })
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
  })
})
```

---

## 10. Testing React Components

### Setup for React Testing

```typescript
// vitest.config.ts (for React)
export default defineConfig({
  test: {
    environment: 'jsdom', // Use browser-like environment
    setupFiles: ['./vitest.setup.ts'],
  },
})
```

### Testing a Simple Component

```typescript
// components/__tests__/Button.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '../ui/button'

describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>)

    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)

    fireEvent.click(screen.getByText('Click me'))

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('is disabled when loading', () => {
    render(<Button loading>Submit</Button>)

    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('shows loading spinner when loading', () => {
    render(<Button loading>Submit</Button>)

    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true')
  })
})
```

### Testing Hooks

```typescript
// lib/__tests__/hooks/useInterviewSession.test.ts
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useInterviewSession } from '@/lib/hooks/useInterviewSession'

describe('useInterviewSession', () => {
  it('starts with no session', () => {
    const { result } = renderHook(() => useInterviewSession())

    expect(result.current.session).toBeNull()
    expect(result.current.isActive).toBe(false)
  })

  it('starts a session', async () => {
    const { result } = renderHook(() => useInterviewSession())

    await act(async () => {
      await result.current.startSession('scenario-1')
    })

    expect(result.current.session).toBeDefined()
    expect(result.current.isActive).toBe(true)
  })

  it('ends a session', async () => {
    const { result } = renderHook(() => useInterviewSession())

    await act(async () => {
      await result.current.startSession('scenario-1')
      await result.current.endSession()
    })

    expect(result.current.isActive).toBe(false)
  })
})
```

---

## 11. Test Coverage

### What is Coverage?

Coverage measures how much of your code is executed by tests:

- **Line Coverage**: Which lines of code were run
- **Branch Coverage**: Which if/else paths were taken
- **Function Coverage**: Which functions were called
- **Statement Coverage**: Which statements were executed

### Running Coverage

```bash
pnpm test:coverage
```

### Reading the Report

```
---------------------------|---------|----------|---------|---------|
File                       | % Stmts | % Branch | % Funcs | % Lines |
---------------------------|---------|----------|---------|---------|
All files                  |   45.23 |    38.12 |   52.14 |   44.89 |
 lib/scoring.ts            |   92.31 |    88.46 |   100.0 |   91.67 | <- Good!
 lib/rate-limit.ts         |   78.45 |    65.22 |    85.0 |   77.14 | <- OK
 lib/ai-providers.ts       |   12.34 |     8.90 |    15.0 |   11.23 | <- Needs work
---------------------------|---------|----------|---------|---------|
```

### Coverage Goals

| Type | Minimum | Ideal |
|------|---------|-------|
| Overall | 50% | 80%+ |
| Critical paths | 80% | 95%+ |
| New code | 80% | 90%+ |

### What to Prioritize

1. **Critical business logic**: Payment processing, scoring, authentication
2. **Error-prone areas**: Complex algorithms, data transformations
3. **Frequently changed code**: Higher risk of regression

---

## 12. Common Testing Mistakes

### Mistake 1: Testing Implementation, Not Behavior

```typescript
// ❌ Bad: Testing internal implementation
it('calls map on array', () => {
  const spy = vi.spyOn(Array.prototype, 'map')
  getActiveUsers(users)
  expect(spy).toHaveBeenCalled()
})

// ✅ Good: Testing behavior/output
it('returns only active users', () => {
  const users = [
    { id: 1, active: true },
    { id: 2, active: false },
  ]

  const result = getActiveUsers(users)

  expect(result).toHaveLength(1)
  expect(result[0].id).toBe(1)
})
```

### Mistake 2: Not Testing Edge Cases

```typescript
// ❌ Bad: Only testing happy path
it('calculates score', () => {
  expect(calculateScore({ correct: 8, total: 10 })).toBe(80)
})

// ✅ Good: Testing edge cases too
describe('calculateScore', () => {
  it('calculates normal score', () => {
    expect(calculateScore({ correct: 8, total: 10 })).toBe(80)
  })

  it('handles zero total', () => {
    expect(calculateScore({ correct: 0, total: 0 })).toBe(0)
  })

  it('handles perfect score', () => {
    expect(calculateScore({ correct: 10, total: 10 })).toBe(100)
  })

  it('handles more correct than total', () => {
    expect(() => calculateScore({ correct: 15, total: 10 }))
      .toThrow('Invalid score')
  })
})
```

### Mistake 3: Flaky Tests

```typescript
// ❌ Bad: Depends on timing/random values
it('generates unique ID', () => {
  const id = generateId()
  expect(id).toBe('abc123') // Will fail randomly!
})

// ✅ Good: Test the structure, not exact value
it('generates unique ID', () => {
  const id = generateId()
  expect(id).toMatch(/^[a-z0-9]{6,}$/)
  expect(id).not.toBe(generateId()) // Actually unique
})
```

### Mistake 4: Too Much Mocking

```typescript
// ❌ Bad: Mocking so much the test is meaningless
it('saves user', async () => {
  vi.mock('./database', () => ({ save: vi.fn() }))
  vi.mock('./validation', () => ({ validate: vi.fn(() => true) }))
  vi.mock('./encryption', () => ({ hash: vi.fn(() => 'xxx') }))

  await saveUser(user)

  expect(save).toHaveBeenCalled() // What are we even testing?
})

// ✅ Good: Test integration where it makes sense
it('saves user with encrypted password', async () => {
  const user = { email: 'test@example.com', password: 'secret' }

  await saveUser(user)

  const saved = await getUser(user.email)
  expect(saved.password).not.toBe('secret') // Password encrypted
  expect(await verifyPassword('secret', saved.password)).toBe(true)
})
```

---

## 13. Testing Checklist

### Before Writing Code

- [ ] Understand the requirements
- [ ] Identify edge cases
- [ ] Plan test cases

### Writing Tests

- [ ] Test the happy path
- [ ] Test error cases
- [ ] Test edge cases (null, empty, boundaries)
- [ ] Test async behavior
- [ ] Use descriptive test names

### Test Quality

- [ ] Tests are independent (can run in any order)
- [ ] Tests are deterministic (same result every time)
- [ ] Tests are fast (< 100ms for unit tests)
- [ ] Tests are readable (like documentation)

### Coverage

- [ ] Critical paths have 80%+ coverage
- [ ] All new code has tests
- [ ] No obvious gaps in coverage

### Maintenance

- [ ] Remove obsolete tests
- [ ] Update tests when requirements change
- [ ] Fix flaky tests immediately

---

## Quick Reference

### Common Assertions

```typescript
// Equality
expect(value).toBe(expected)           // Exact equality (===)
expect(value).toEqual(expected)        // Deep equality
expect(value).toBeNull()               // Is null
expect(value).toBeDefined()            // Not undefined
expect(value).toBeTruthy()             // Truthy value
expect(value).toBeFalsy()              // Falsy value

// Numbers
expect(value).toBeGreaterThan(3)
expect(value).toBeLessThanOrEqual(10)
expect(value).toBeCloseTo(3.14, 2)     // For floating point

// Strings
expect(value).toMatch(/pattern/)
expect(value).toContain('substring')

// Arrays
expect(array).toHaveLength(3)
expect(array).toContain(item)
expect(array).toContainEqual({ id: 1 })

// Objects
expect(obj).toMatchObject({ key: 'value' })
expect(obj).toHaveProperty('key')
expect(obj).toHaveProperty('key', 'value')

// Exceptions
expect(() => fn()).toThrow()
expect(() => fn()).toThrow('error message')
expect(() => fn()).toThrow(CustomError)

// Async
await expect(asyncFn()).resolves.toBe(value)
await expect(asyncFn()).rejects.toThrow()
```

### Running Specific Tests

```bash
# Run a specific file
pnpm test path/to/file.test.ts

# Run tests matching a pattern
pnpm test -t "pattern"

# Run tests in a specific directory
pnpm test lib/__tests__/

# Run only failed tests
pnpm test --changed

# Update snapshots
pnpm test -u
```

---

## Next Steps

1. **Run existing tests**: `pnpm test` - See what passes
2. **Check coverage**: `pnpm test:coverage` - See gaps
3. **Write one test**: Pick an untested function and test it
4. **Gradually increase coverage**: Add tests as you work on code

Remember: **Some tests are better than no tests!**

---

*Last updated: December 2025*
*Questions? Check [Vitest documentation](https://vitest.dev/)*
