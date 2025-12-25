/**
 * Rate Limiter
 *
 * Per-user rate limiting with multiple strategies:
 * - Request rate limiting (requests per minute)
 * - Token rate limiting (tokens per minute)
 * - Budget limiting (cost per billing cycle)
 *
 * Uses sliding window algorithm for smooth rate limiting.
 */

import { adminDb } from './firebase-admin'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { BUDGET_CAPS, getUserUsageSummary } from './usage-tracking'

// Rate limit configuration by tier
export const RATE_LIMITS = {
  free: {
    requestsPerMinute: 10,
    tokensPerMinute: 5000,
    maxConcurrentRequests: 2,
    budgetPerCycle: 0.50, // $0.50
  },
  pro: {
    requestsPerMinute: 30,
    tokensPerMinute: 20000,
    maxConcurrentRequests: 5,
    budgetPerCycle: 25.00, // $25
  },
  enterprise: {
    requestsPerMinute: 100,
    tokensPerMinute: 100000,
    maxConcurrentRequests: 20,
    budgetPerCycle: 100.00, // $100
  },
} as const

export type RateLimitTier = keyof typeof RATE_LIMITS

export interface RateLimitResult {
  allowed: boolean
  reason?: 'rate_limit' | 'budget_exceeded' | 'concurrent_limit'
  retryAfterMs?: number
  currentUsage?: {
    requestsThisMinute: number
    tokensThisMinute: number
    concurrentRequests: number
    budgetUsedPercent: number
  }
  message?: string
}

// In-memory sliding window for fast rate limiting
interface WindowEntry {
  timestamp: number
  tokens: number
}

const requestWindows = new Map<string, WindowEntry[]>()
const concurrentRequests = new Map<string, number>()

const WINDOW_SIZE_MS = 60 * 1000 // 1 minute

/**
 * Check if a request is allowed under rate limits
 */
export async function checkRateLimit(
  userId: string,
  tier: RateLimitTier = 'free',
  estimatedTokens: number = 500
): Promise<RateLimitResult> {
  // Perform lazy cleanup to prevent memory buildup
  lazyCleanup()

  const limits = RATE_LIMITS[tier] || RATE_LIMITS.free
  const now = Date.now()

  // 1. Check concurrent requests
  const concurrent = concurrentRequests.get(userId) || 0
  if (concurrent >= limits.maxConcurrentRequests) {
    return {
      allowed: false,
      reason: 'concurrent_limit',
      message: `Too many concurrent requests. Max ${limits.maxConcurrentRequests} for ${tier} tier.`,
      currentUsage: {
        requestsThisMinute: getRequestCount(userId),
        tokensThisMinute: getTokenCount(userId),
        concurrentRequests: concurrent,
        budgetUsedPercent: 0,
      },
    }
  }

  // 2. Check request rate
  const requestCount = getRequestCount(userId)
  if (requestCount >= limits.requestsPerMinute) {
    const oldestRequest = getOldestRequestTime(userId)
    const retryAfterMs = oldestRequest ? (oldestRequest + WINDOW_SIZE_MS - now) : 1000

    return {
      allowed: false,
      reason: 'rate_limit',
      retryAfterMs: Math.max(0, retryAfterMs),
      message: `Rate limit exceeded. ${limits.requestsPerMinute} requests/minute for ${tier} tier.`,
      currentUsage: {
        requestsThisMinute: requestCount,
        tokensThisMinute: getTokenCount(userId),
        concurrentRequests: concurrent,
        budgetUsedPercent: 0,
      },
    }
  }

  // 3. Check token rate
  const tokenCount = getTokenCount(userId)
  if (tokenCount + estimatedTokens > limits.tokensPerMinute) {
    const oldestRequest = getOldestRequestTime(userId)
    const retryAfterMs = oldestRequest ? (oldestRequest + WINDOW_SIZE_MS - now) : 1000

    return {
      allowed: false,
      reason: 'rate_limit',
      retryAfterMs: Math.max(0, retryAfterMs),
      message: `Token limit exceeded. ${limits.tokensPerMinute} tokens/minute for ${tier} tier.`,
      currentUsage: {
        requestsThisMinute: requestCount,
        tokensThisMinute: tokenCount,
        concurrentRequests: concurrent,
        budgetUsedPercent: 0,
      },
    }
  }

  // 4. Check budget (async - only for budget check)
  const usageSummary = await getUserUsageSummary(userId)
  if (usageSummary && usageSummary.budgetRemaining <= 0) {
    return {
      allowed: false,
      reason: 'budget_exceeded',
      message: `Monthly budget of $${usageSummary.budgetCap.toFixed(2)} exceeded. Upgrade your plan or wait until next billing cycle.`,
      currentUsage: {
        requestsThisMinute: requestCount,
        tokensThisMinute: tokenCount,
        concurrentRequests: concurrent,
        budgetUsedPercent: 100,
      },
    }
  }

  return {
    allowed: true,
    currentUsage: {
      requestsThisMinute: requestCount,
      tokensThisMinute: tokenCount,
      concurrentRequests: concurrent,
      budgetUsedPercent: usageSummary?.budgetUsedPercent || 0,
    },
  }
}

/**
 * Record a request starting (increment concurrent, add to window)
 */
export function recordRequestStart(userId: string, estimatedTokens: number = 500): void {
  const now = Date.now()

  // Increment concurrent requests
  const current = concurrentRequests.get(userId) || 0
  concurrentRequests.set(userId, current + 1)

  // Add to sliding window
  let window = requestWindows.get(userId) || []
  window.push({ timestamp: now, tokens: estimatedTokens })

  // Clean old entries
  window = window.filter((entry) => now - entry.timestamp < WINDOW_SIZE_MS)
  requestWindows.set(userId, window)
}

/**
 * Record a request completing (decrement concurrent)
 */
export function recordRequestEnd(userId: string): void {
  const current = concurrentRequests.get(userId) || 0
  concurrentRequests.set(userId, Math.max(0, current - 1))
}

/**
 * Update the actual token count after request completes
 */
export function updateTokenCount(userId: string, actualTokens: number): void {
  const window = requestWindows.get(userId)
  if (window && window.length > 0) {
    // Update the last entry with actual tokens
    window[window.length - 1].tokens = actualTokens
  }
}

/**
 * Get request count in current window
 */
function getRequestCount(userId: string): number {
  const window = requestWindows.get(userId) || []
  const now = Date.now()
  return window.filter((entry) => now - entry.timestamp < WINDOW_SIZE_MS).length
}

/**
 * Get token count in current window
 */
function getTokenCount(userId: string): number {
  const window = requestWindows.get(userId) || []
  const now = Date.now()
  return window
    .filter((entry) => now - entry.timestamp < WINDOW_SIZE_MS)
    .reduce((sum, entry) => sum + entry.tokens, 0)
}

/**
 * Get oldest request time in current window
 */
function getOldestRequestTime(userId: string): number | null {
  const window = requestWindows.get(userId) || []
  const now = Date.now()
  const validEntries = window.filter((entry) => now - entry.timestamp < WINDOW_SIZE_MS)
  return validEntries.length > 0 ? validEntries[0].timestamp : null
}

/**
 * Clean up old entries from all windows
 * Called lazily during request processing to avoid memory leaks from global setInterval
 * in serverless environments where each instance has its own memory
 */
export function cleanupWindows(): void {
  const now = Date.now()

  for (const [userId, window] of requestWindows.entries()) {
    const filtered = window.filter((entry) => now - entry.timestamp < WINDOW_SIZE_MS)
    if (filtered.length === 0) {
      requestWindows.delete(userId)
    } else {
      requestWindows.set(userId, filtered)
    }
  }
}

// Track last cleanup time for lazy cleanup
let lastCleanupTime = Date.now()
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Perform lazy cleanup if enough time has passed
 * This avoids memory leaks from global setInterval in serverless environments
 */
function lazyCleanup(): void {
  const now = Date.now()
  if (now - lastCleanupTime > CLEANUP_INTERVAL_MS) {
    cleanupWindows()
    lastCleanupTime = now
  }
}

/**
 * Rate limit decorator for API routes
 */
export async function withRateLimit<T>(
  userId: string,
  tier: RateLimitTier,
  fn: () => Promise<T>,
  options?: {
    estimatedTokens?: number
    skipRateLimit?: boolean
  }
): Promise<{ result: T; rateLimited: false } | { rateLimited: true; error: RateLimitResult }> {
  if (options?.skipRateLimit) {
    const result = await fn()
    return { result, rateLimited: false }
  }

  const estimatedTokens = options?.estimatedTokens || 500
  const rateCheck = await checkRateLimit(userId, tier, estimatedTokens)

  if (!rateCheck.allowed) {
    return { rateLimited: true, error: rateCheck }
  }

  recordRequestStart(userId, estimatedTokens)

  try {
    const result = await fn()
    return { result, rateLimited: false }
  } finally {
    recordRequestEnd(userId)
  }
}
