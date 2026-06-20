import type { BugFixScenario } from "../../types"

export const bugfixRateLimiterScenario: BugFixScenario = {
  id: "bugfix-rate-limiter",
  title: "API Rate Limiter Race Condition",
  type: "bugfix",
  difficulty: "hard",
  companies: ["Cloudflare", "Stripe", "Amazon", "Meta"],
  description: "Fix a race condition in a Redis-style API rate limiter",
  tags: ["concurrency", "race-condition", "distributed-systems", "redis", "api-infrastructure"],
  estimatedTime: 50,
  problemStatement: `Your team owns a rate limiter that protects paid API endpoints. During traffic spikes, customers are occasionally getting more requests than their plan allows. Logs show several requests checking the same counter value before any of them records usage.

**Your task:**
1. Read the rate limiter and supporting codebase files
2. Identify the check-then-write race condition
3. Fix the limiter so burst/concurrent requests cannot exceed the limit
4. Explain why the original implementation was unsafe in production

**Context:** In production this would be Redis-backed. This exercise uses a small in-memory Redis-style store so you can focus on the rate-limiting logic and the concurrency failure mode.`,
  buggyCode: {
    javascript: `// rate-limiter.js
// BUG: checkLimit and recordRequest are separate steps, so concurrent requests
// can all pass the check before any request is recorded.

class RateLimiter {
  constructor(store, options = {}) {
    this.store = store;
    this.limit = options.limit || 100;
    this.windowMs = options.windowMs || 60000;
  }

  checkLimit(clientId, now = Date.now()) {
    const key = this.keyFor(clientId);
    const windowStart = now - this.windowMs;
    this.store.removeBefore(key, windowStart);

    return this.store.count(key) < this.limit;
  }

  recordRequest(clientId, now = Date.now()) {
    const key = this.keyFor(clientId);
    this.store.add(key, now);
    this.store.expire(key, this.windowMs);
  }

  isAllowed(clientId, now = Date.now()) {
    if (!this.checkLimit(clientId, now)) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: now + this.windowMs,
      };
    }

    this.recordRequest(clientId, now);

    return {
      allowed: true,
      remaining: Math.max(0, this.limit - this.store.count(this.keyFor(clientId))),
      resetAt: now + this.windowMs,
    };
  }

  keyFor(clientId) {
    return \`ratelimit:\${clientId}\`;
  }
}

function simulateRateLimitBurst(clientId, concurrentRequests, limit) {
  const store = new RedisSortedSetStore();
  const limiter = new RateLimiter(store, { limit, windowMs: 60000 });
  const now = 1700000000000;

  // Simulates a burst where all workers check before any worker records.
  const decisions = [];
  for (let i = 0; i < concurrentRequests; i++) {
    decisions.push(limiter.checkLimit(clientId, now));
  }

  let allowedCount = 0;
  for (const allowed of decisions) {
    if (allowed) {
      allowedCount++;
      limiter.recordRequest(clientId, now);
    }
  }

  return {
    allowedCount,
    storedCount: store.count(limiter.keyFor(clientId)),
  };
}`,
  },
  codebaseFiles: {
    javascript: [
      {
        fileName: "redis-sorted-set-store.js",
        content: `// redis-sorted-set-store.js
// Tiny in-memory stand-in for the Redis sorted set commands used by the limiter.

class RedisSortedSetStore {
  constructor() {
    this.records = new Map();
    this.expirations = new Map();
  }

  add(key, score) {
    const existing = this.records.get(key) || [];
    existing.push(score);
    this.records.set(key, existing);
  }

  count(key) {
    return (this.records.get(key) || []).length;
  }

  removeBefore(key, minScore) {
    const existing = this.records.get(key) || [];
    this.records.set(
      key,
      existing.filter((score) => score >= minScore)
    );
  }

  expire(key, windowMs) {
    this.expirations.set(key, windowMs);
  }
}`,
        description: "In-memory Redis-style sorted set used by the rate limiter tests",
      },
      {
        fileName: "rate-limit-middleware.js",
        content: `// rate-limit-middleware.js
// Express middleware shape used in production.
//
// The real app calls limiter.isAllowed(clientId) for each request and returns
// HTTP 429 when allowed is false. The middleware is context only for this task;
// the bug lives in rate-limiter.js.`,
        description: "Production middleware context for how the limiter is called",
      },
      {
        fileName: "rate-limiter.test.js",
        content: `// rate-limiter.test.js
// Important behavior:
//
// simulateRateLimitBurst("client-1", 1, 5)
//   -> { allowedCount: 1, storedCount: 1 }
//
// simulateRateLimitBurst("client-1", 10, 5)
//   -> { allowedCount: 5, storedCount: 5 }
//
// The second case fails when check and record are not atomic.`,
        description: "Readable tests showing the burst/concurrency failure mode",
      },
    ],
  },
  expectedBehavior:
    "No more than the configured limit should be allowed in a window, even when many requests arrive at the same time.",
  expectedTouchedFiles: ["solution"],
  bugDescription:
    "The limiter performs a check-then-write sequence. In a concurrent burst, multiple workers can observe capacity before any worker records usage, so all of them proceed.",
  hints: [
    "Focus on the gap between checkLimit and recordRequest.",
    "A production Redis fix would make the check and increment happen in one atomic operation.",
    "In this exercise, the burst simulation should not be able to collect more allowed decisions than the limit.",
    "Think about moving the write/reservation into the same step as the decision.",
  ],
  testCases: [
    {
      input: { clientId: "client-1", concurrentRequests: 1, limit: 5 },
      expected: { allowedCount: 1, storedCount: 1 },
      description: "Single request under limit should be allowed and recorded",
    },
    {
      input: { clientId: "client-1", concurrentRequests: 5, limit: 5 },
      expected: { allowedCount: 5, storedCount: 5 },
      description: "Exactly limit requests should be allowed",
    },
    {
      input: { clientId: "client-1", concurrentRequests: 10, limit: 5 },
      expected: { allowedCount: 5, storedCount: 5 },
      description: "Burst above the limit should cap allowed requests",
    },
  ],
}
