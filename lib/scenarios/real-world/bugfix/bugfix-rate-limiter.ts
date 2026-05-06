import type { BugFixScenario } from "../../types"

export const bugfixRateLimiterScenario: BugFixScenario = {
  id: "bugfix-rate-limiter",
  title: "API Rate Limiter Race Condition",
  type: "bugfix",
  difficulty: "hard",
  companies: ["Meta", "Google", "Netflix", "Amazon"],
  description: "Fix a race condition in the distributed rate limiter causing request leaks",
  tags: ["concurrency", "race-condition", "distributed-systems", "redis"],
  estimatedTime: 50,
  problemStatement: `Your company's API rate limiter is occasionally allowing more requests than the limit. In high-traffic scenarios, some requests slip through even when the limit should be exceeded.

**Your task:**
1. Analyze the rate limiter implementation
2. Identify the race condition causing request leaks
3. Fix the bug to ensure accurate rate limiting
4. Explain the concurrency issue and your fix

**Context:** This rate limiter protects critical API endpoints from abuse. The bug is causing billing issues and potential service degradation.`,
  buggyCode: {
    javascript: `// rate-limiter.js
// BUG: Race condition allows more requests than limit

class RateLimiter {
  constructor(redisClient, options = {}) {
    this.redis = redisClient;
    this.limit = options.limit || 100;
    this.windowMs = options.windowMs || 60000; // 1 minute
  }

  async isAllowed(clientId) {
    const key = \`ratelimit:\${clientId}\`;
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get current request count
    const currentCount = await this.redis.zcount(key, windowStart, now);

    if (currentCount >= this.limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: await this.getResetTime(key)
      };
    }

    // Add current request
    await this.redis.zadd(key, now, \`\${now}-\${Math.random()}\`);

    // Remove old entries
    await this.redis.zremrangebyscore(key, 0, windowStart);

    // Set expiry
    await this.redis.expire(key, Math.ceil(this.windowMs / 1000));

    return {
      allowed: true,
      remaining: this.limit - currentCount - 1,
      resetAt: now + this.windowMs
    };
  }

  async getResetTime(key) {
    const ttl = await this.redis.ttl(key);
    return Date.now() + (ttl * 1000);
  }

  async getRemainingRequests(clientId) {
    const key = \`ratelimit:\${clientId}\`;
    const now = Date.now();
    const windowStart = now - this.windowMs;

    const count = await this.redis.zcount(key, windowStart, now);
    return Math.max(0, this.limit - count);
  }
}

module.exports = { RateLimiter };`,
    python: `# rate_limiter.py
# BUG: Race condition allows more requests than limit

import time
import random

class RateLimiter:
    def __init__(self, redis_client, limit=100, window_ms=60000):
        self.redis = redis_client
        self.limit = limit
        self.window_ms = window_ms  # 1 minute

    async def is_allowed(self, client_id):
        key = f"ratelimit:{client_id}"
        now = int(time.time() * 1000)
        window_start = now - self.window_ms

        # Get current request count
        current_count = await self.redis.zcount(key, window_start, now)

        if current_count >= self.limit:
            return {
                'allowed': False,
                'remaining': 0,
                'reset_at': await self.get_reset_time(key)
            }

        # Add current request
        await self.redis.zadd(key, {f"{now}-{random.random()}": now})

        # Remove old entries
        await self.redis.zremrangebyscore(key, 0, window_start)

        # Set expiry
        await self.redis.expire(key, self.window_ms // 1000)

        return {
            'allowed': True,
            'remaining': self.limit - current_count - 1,
            'reset_at': now + self.window_ms
        }

    async def get_reset_time(self, key):
        ttl = await self.redis.ttl(key)
        return int(time.time() * 1000) + (ttl * 1000)

    async def get_remaining_requests(self, client_id):
        key = f"ratelimit:{client_id}"
        now = int(time.time() * 1000)
        window_start = now - self.window_ms

        count = await self.redis.zcount(key, window_start, now)
        return max(0, self.limit - count)`,
  },
  codebaseFiles: {
    javascript: [
      {
        fileName: "rate-limiter-middleware.js",
        content: `// rate-limiter-middleware.js
// Express middleware using RateLimiter

const { RateLimiter } = require('./rate-limiter');

function createRateLimitMiddleware(redisClient, options) {
  const limiter = new RateLimiter(redisClient, options);

  return async (req, res, next) => {
    const clientId = req.ip || req.headers['x-forwarded-for'] || 'unknown';

    try {
      const result = await limiter.isAllowed(clientId);

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': options.limit || 100,
        'X-RateLimit-Remaining': result.remaining,
        'X-RateLimit-Reset': result.resetAt
      });

      if (!result.allowed) {
        return res.status(429).json({
          error: 'Too Many Requests',
          retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000)
        });
      }

      next();
    } catch (error) {
      console.error('Rate limiter error:', error);
      // Fail open - allow request if rate limiter fails
      next();
    }
  };
}

module.exports = { createRateLimitMiddleware };`,
        description: "Express middleware that uses the RateLimiter",
      },
      {
        fileName: "rate-limiter.test.js",
        content: `// rate-limiter.test.js
// Tests for RateLimiter - including concurrency tests

const { RateLimiter } = require('./rate-limiter');

describe('RateLimiter', () => {
  let limiter;
  let mockRedis;

  beforeEach(() => {
    mockRedis = {
      zcount: jest.fn().mockResolvedValue(0),
      zadd: jest.fn().mockResolvedValue(1),
      zremrangebyscore: jest.fn().mockResolvedValue(0),
      expire: jest.fn().mockResolvedValue(1),
      ttl: jest.fn().mockResolvedValue(60)
    };
    limiter = new RateLimiter(mockRedis, { limit: 5, windowMs: 60000 });
  });

  test('should allow requests under limit', async () => {
    const result = await limiter.isAllowed('client1');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  test('should block requests over limit', async () => {
    mockRedis.zcount.mockResolvedValue(5);

    const result = await limiter.isAllowed('client1');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  test('should handle concurrent requests correctly', async () => {
    // Simulate 10 concurrent requests with limit of 5
    // BUG: This test may fail due to race condition
    const limit = 5;
    limiter = new RateLimiter(mockRedis, { limit, windowMs: 60000 });

    let count = 0;
    mockRedis.zcount.mockImplementation(() => Promise.resolve(count));
    mockRedis.zadd.mockImplementation(() => {
      count++;
      return Promise.resolve(1);
    });

    // Fire 10 concurrent requests
    const requests = Array(10).fill().map(() =>
      limiter.isAllowed('client1')
    );

    const results = await Promise.all(requests);
    const allowedCount = results.filter(r => r.allowed).length;

    // Should only allow 5 requests
    expect(allowedCount).toBeLessThanOrEqual(limit);
  });
});`,
        description: "Tests for RateLimiter including concurrency test that may fail",
      },
    ],
    python: [],
  },
  expectedBehavior:
    "Rate limiter should accurately limit requests even under high concurrency. No more than the limit should be allowed within any window.",
  bugDescription:
    "There is a race condition between checking the count and adding the request. Multiple concurrent requests can all pass the check before any are added, leading to more requests than the limit being allowed.",
  hints: [
    "Think about what happens when two requests arrive at the exact same time",
    "The check-then-act pattern is not atomic",
    "Consider using Redis transactions or Lua scripts for atomicity",
    'Look up "MULTI/EXEC" or Lua scripting in Redis for atomic operations',
  ],
  testCases: [
    {
      input: { clientId: "client1", requests: 1, limit: 5 },
      expected: { allowed: true, remaining: 4 },
      description: "Single request under limit should be allowed",
    },
    {
      input: { clientId: "client1", requests: 6, limit: 5 },
      expected: { allowed: false },
      description: "Request over limit should be blocked",
    },
    {
      input: { clientId: "client1", concurrentRequests: 10, limit: 5 },
      expected: { allowedCount: 5 },
      description: "Concurrent requests should respect limit exactly",
    },
  ],
}
