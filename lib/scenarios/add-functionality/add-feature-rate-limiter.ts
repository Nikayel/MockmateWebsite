import type { AddFunctionalityScenario } from "../types"

export const rateLimiterScenario: AddFunctionalityScenario = {
  id: "add-feature-rate-limiter",
  title: "Add Sliding Window Rate Limiter",
  type: "add-functionality",
  difficulty: "medium",
  companies: ["Amazon", "Google", "Stripe", "Cloudflare"],
  description: "Implement a sliding window rate limiter for API requests",
  tags: ["rate-limiting", "algorithms", "api"],
  estimatedTime: 30,
  problemStatement: `You're building an API rate limiter. The existing implementation uses a fixed window, which allows request bursts at window boundaries.

**Your task:**
1. Implement a sliding window rate limiter
2. The limiter should allow N requests per window (e.g., 100 requests per minute)
3. Use sliding window algorithm to avoid burst issues
4. Return remaining quota and reset time with each check

**Context:** This rate limiter protects backend services from abuse. Accurate limiting is critical.`,
  featureRequirements: [
    "isAllowed(clientId) - check if request is allowed",
    "Sliding window algorithm (not fixed window)",
    "Return { allowed, remaining, resetTime } from check",
    "Support configurable limits per client",
    "Efficient cleanup of old entries",
  ],
  existingCode: {
    javascript: `// rate-limiter.js - Implement sliding window rate limiter

class RateLimiter {
  /**
   * @param {number} maxRequests - Maximum requests per window
   * @param {number} windowMs - Window size in milliseconds
   */
  constructor(maxRequests = 100, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.clients = new Map(); // clientId -> request timestamps
  }

  /**
   * Check if a request is allowed for this client
   * @param {string} clientId - Unique client identifier
   * @returns {Object} { allowed: boolean, remaining: number, resetTime: number }
   */
  isAllowed(clientId) {
    const now = Date.now();

    // TODO: Implement sliding window rate limiting
    // 1. Get or create client's request history
    // 2. Remove requests outside the current window
    // 3. Check if under limit
    // 4. If allowed, add current timestamp
    // 5. Return result with remaining count and reset time

    return {
      allowed: true,
      remaining: this.maxRequests,
      resetTime: now + this.windowMs,
    };
  }

  /**
   * Get current request count for client in window
   * @param {string} clientId
   * @returns {number}
   */
  getRequestCount(clientId) {
    // TODO: Return count of requests in current window
    return 0;
  }

  /**
   * Clean up old entries to prevent memory leaks
   * Should be called periodically
   */
  cleanup() {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // TODO: Remove timestamps older than windowStart for all clients
    // Also remove clients with no recent requests
  }

  /**
   * Reset rate limit for a client (e.g., after payment or manual override)
   * @param {string} clientId
   */
  reset(clientId) {
    this.clients.delete(clientId);
  }
}

// Test helper function - DO NOT MODIFY
function testRateLimiter(operations) {
  const limiter = new RateLimiter(5, 1000); // 5 requests per second for testing
  const results = [];

  for (const op of operations) {
    switch (op.type) {
      case 'check':
        const result = limiter.isAllowed(op.clientId);
        results.push({
          type: 'check',
          clientId: op.clientId,
          allowed: result.allowed,
          remaining: result.remaining,
        });
        break;
      case 'count':
        results.push({
          type: 'count',
          clientId: op.clientId,
          count: limiter.getRequestCount(op.clientId),
        });
        break;
      case 'reset':
        limiter.reset(op.clientId);
        results.push({ type: 'reset', clientId: op.clientId });
        break;
      case 'cleanup':
        limiter.cleanup();
        results.push({ type: 'cleanup' });
        break;
    }
  }

  return results;
}`,
    python: `# rate_limiter.py - Implement sliding window rate limiter

import time

class RateLimiter:
    def __init__(self, max_requests=100, window_ms=60000):
        """
        Args:
            max_requests: Maximum requests per window
            window_ms: Window size in milliseconds
        """
        self.max_requests = max_requests
        self.window_ms = window_ms
        self.clients = {}  # client_id -> list of request timestamps

    def is_allowed(self, client_id):
        """
        Check if a request is allowed for this client
        Args:
            client_id: Unique client identifier
        Returns: { 'allowed': bool, 'remaining': int, 'reset_time': int }
        """
        now = int(time.time() * 1000)

        # TODO: Implement sliding window rate limiting
        # 1. Get or create client's request history
        # 2. Remove requests outside the current window
        # 3. Check if under limit
        # 4. If allowed, add current timestamp
        # 5. Return result with remaining count and reset time

        return {
            'allowed': True,
            'remaining': self.max_requests,
            'reset_time': now + self.window_ms,
        }

    def get_request_count(self, client_id):
        """Return count of requests in current window"""
        # TODO: Return count of requests in current window
        return 0

    def cleanup(self):
        """Clean up old entries to prevent memory leaks"""
        now = int(time.time() * 1000)
        window_start = now - self.window_ms

        # TODO: Remove timestamps older than window_start for all clients
        # Also remove clients with no recent requests

    def reset(self, client_id):
        """Reset rate limit for a client"""
        if client_id in self.clients:
            del self.clients[client_id]


# Test helper function - DO NOT MODIFY
def test_rate_limiter(operations):
    limiter = RateLimiter(5, 1000)  # 5 requests per second for testing
    results = []

    for op in operations:
        if op['type'] == 'check':
            result = limiter.is_allowed(op['clientId'])
            results.append({
                'type': 'check',
                'clientId': op['clientId'],
                'allowed': result['allowed'],
                'remaining': result['remaining'],
            })
        elif op['type'] == 'count':
            results.append({
                'type': 'count',
                'clientId': op['clientId'],
                'count': limiter.get_request_count(op['clientId']),
            })
        elif op['type'] == 'reset':
            limiter.reset(op['clientId'])
            results.append({'type': 'reset', 'clientId': op['clientId']})
        elif op['type'] == 'cleanup':
            limiter.cleanup()
            results.append({'type': 'cleanup'})

    return results`,
  },
  codebaseFiles: {
    javascript: [
      {
        fileName: "utils/timeWindow.js",
        content: `// Time window utilities for rate limiting

/**
 * Filter timestamps to only those within a time window
 * @param {number[]} timestamps - Array of timestamps
 * @param {number} windowMs - Window size in milliseconds
 * @param {number} now - Current time (optional, defaults to Date.now())
 * @returns {number[]} Filtered timestamps
 */
function filterToWindow(timestamps, windowMs, now = Date.now()) {
  const windowStart = now - windowMs;
  return timestamps.filter(ts => ts > windowStart);
}

/**
 * Calculate reset time (when oldest request exits the window)
 * @param {number[]} timestamps - Array of timestamps in window
 * @param {number} windowMs - Window size
 * @returns {number} Reset timestamp
 */
function calculateResetTime(timestamps, windowMs) {
  if (timestamps.length === 0) return Date.now();
  const oldest = Math.min(...timestamps);
  return oldest + windowMs;
}

module.exports = { filterToWindow, calculateResetTime };`,
        description: "Time window utilities for rate limiting calculations",
      },
    ],
    python: [
      {
        fileName: "utils/time_window.py",
        content: `# Time window utilities for rate limiting
import time

def filter_to_window(timestamps, window_ms, now=None):
    """
    Filter timestamps to only those within a time window
    Args:
        timestamps: List of timestamps
        window_ms: Window size in milliseconds
        now: Current time (optional)
    Returns: Filtered timestamps
    """
    if now is None:
        now = int(time.time() * 1000)
    window_start = now - window_ms
    return [ts for ts in timestamps if ts > window_start]

def calculate_reset_time(timestamps, window_ms):
    """
    Calculate reset time (when oldest request exits the window)
    """
    if not timestamps:
        return int(time.time() * 1000)
    oldest = min(timestamps)
    return oldest + window_ms`,
        description: "Time window utilities for rate limiting calculations",
      },
    ],
  },
  hints: [
    "Store timestamps as array for each client: clients.set(clientId, [])",
    "At start of isAllowed(), filter out timestamps older than windowStart",
    "Check length after filtering: if < maxRequests, allow and add timestamp",
    "remaining = maxRequests - timestamps.length",
    "resetTime = oldest timestamp in window + windowMs",
  ],
  testCases: [
    {
      input: {
        operations: [
          { type: "check", clientId: "user1" },
          { type: "check", clientId: "user1" },
          { type: "count", clientId: "user1" },
        ],
      },
      expected: [
        { type: "check", clientId: "user1", allowed: true, remaining: 4 },
        { type: "check", clientId: "user1", allowed: true, remaining: 3 },
        { type: "count", clientId: "user1", count: 2 },
      ],
      description: "Basic rate limiting counts requests",
    },
    {
      input: {
        operations: [
          { type: "check", clientId: "user2" },
          { type: "check", clientId: "user2" },
          { type: "check", clientId: "user2" },
          { type: "check", clientId: "user2" },
          { type: "check", clientId: "user2" },
          { type: "check", clientId: "user2" },
        ],
      },
      expected: [
        { type: "check", clientId: "user2", allowed: true, remaining: 4 },
        { type: "check", clientId: "user2", allowed: true, remaining: 3 },
        { type: "check", clientId: "user2", allowed: true, remaining: 2 },
        { type: "check", clientId: "user2", allowed: true, remaining: 1 },
        { type: "check", clientId: "user2", allowed: true, remaining: 0 },
        { type: "check", clientId: "user2", allowed: false, remaining: 0 },
      ],
      description: "Blocks requests after limit reached",
    },
    {
      input: {
        operations: [
          { type: "check", clientId: "user3" },
          { type: "check", clientId: "user3" },
          { type: "reset", clientId: "user3" },
          { type: "count", clientId: "user3" },
        ],
      },
      expected: [
        { type: "check", clientId: "user3", allowed: true, remaining: 4 },
        { type: "check", clientId: "user3", allowed: true, remaining: 3 },
        { type: "reset", clientId: "user3" },
        { type: "count", clientId: "user3", count: 0 },
      ],
      description: "Reset clears request history",
    },
  ],
  acceptanceCriteria: [
    "Requests under limit are allowed",
    "Requests over limit are blocked",
    "Remaining count decreases correctly",
    "Reset clears the history",
    "Different clients have separate limits",
  ],
}
