/**
 * Rate Limiter
 *
 * Per-user rate limiting with multiple strategies:
 * - Request rate limiting (requests per minute)
 * - Token rate limiting (tokens per minute)
 * - Budget limiting (cost per billing cycle)
 *
 * Uses sliding window algorithm for smooth rate limiting.
 *
 * IMPORTANT: Production should use Upstash Redis for distributed rate limiting.
 * If Redis is unavailable, this module fails open to in-memory tracking and
 * logs loudly rather than creating Firestore transaction hot spots.
 */

import { adminDb } from "./firebase-admin"
import { getUserUsageSummary } from "./usage-tracking"
import { logger } from "./logger"
import { AI_BUDGET_CAPS } from "./pricing"

// Rate limit configuration by tier. budgetPerCycle comes from the canonical
// AI_BUDGET_CAPS table in lib/pricing.ts rather than repeating the dollar values,
// which previously appeared in four files under four different names.
//
// tokensPerMinute is sized so a normal interview never reaches it. It used to be 5,000 on
// the free tier, and a single measured mid-interview turn is about 4,600: the system prompt
// is ~10.5k characters before the RAG block, and every turn re-sends the whole transcript,
// the candidate's code and the workspace files. So the first message was allowed, the second
// was refused, and the interviewer went dead mid-conversation for a minute.
//
// These are burst guards, not the cost control. Spend is bounded by budgetPerCycle above and
// by the global daily ceiling; call rate is bounded by requestsPerMinute. Each tier is now
// requestsPerMinute x ~6,000 tokens, which makes the request cap the binding constraint and
// leaves this to catch only genuinely abnormal payloads.
export const RATE_LIMITS = {
  free: {
    requestsPerMinute: 10,
    tokensPerMinute: 60000,
    maxConcurrentRequests: 2,
    budgetPerCycle: AI_BUDGET_CAPS.free,
  },
  pro: {
    requestsPerMinute: 30,
    tokensPerMinute: 180000,
    maxConcurrentRequests: 5,
    budgetPerCycle: AI_BUDGET_CAPS.pro,
  },
  enterprise: {
    requestsPerMinute: 100,
    tokensPerMinute: 600000,
    maxConcurrentRequests: 20,
    budgetPerCycle: AI_BUDGET_CAPS.enterprise,
  },
} as const

export type RateLimitTier = keyof typeof RATE_LIMITS

export interface RateLimitResult {
  allowed: boolean
  reason?: "rate_limit" | "budget_exceeded" | "concurrent_limit" | "session_limit"
  retryAfterMs?: number
  retryAfterSeconds?: number
  currentUsage?: {
    requestsThisMinute: number
    tokensThisMinute: number
    concurrentRequests: number
    budgetUsedPercent: number
  }
  limit?: {
    requestsPerMinute: number
    tokensPerMinute: number
    maxConcurrent: number
  }
  tier?: RateLimitTier
  message?: string
  code?: string // Machine-readable error code for frontend
}

// In-memory sliding window for fast rate limiting (fallback for development)
interface WindowEntry {
  timestamp: number
  tokens: number
}

// In-memory stores (used as fallback in development)
const requestWindows = new Map<string, WindowEntry[]>()
const concurrentRequests = new Map<string, number>()

const WINDOW_SIZE_MS = 60 * 1000 // 1 minute

const isProduction = process.env.NODE_ENV === "production"

// Firestore distributed rate limiting is intentionally disabled in production.
const useDistributedRateLimiting =
  !isProduction && process.env.USE_DISTRIBUTED_RATE_LIMIT === "true"

// Redis configuration for distributed rate limiting
const redisUrl = process.env.UPSTASH_REDIS_REST_URL || ""
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || ""
const hasRedis = !!(redisUrl && redisToken)

if (typeof window === "undefined" && hasRedis) {
  logger.info("[Rate Limiter] Using Upstash Redis for distributed rate limiting")
}

if (typeof window === "undefined" && isProduction && !hasRedis) {
  logger.error(
    "[Rate Limiter] Production Redis is not configured; failing open with in-memory tracking"
  )
}

function getInMemoryRateLimitState(userId: string): {
  requestCount: number
  tokenCount: number
  concurrent: number
  oldestTimestamp: number | null
} {
  return {
    requestCount: getRequestCount(userId),
    tokenCount: getTokenCount(userId),
    concurrent: concurrentRequests.get(userId) || 0,
    oldestTimestamp: getOldestRequestTime(userId),
  }
}

function shouldFallbackToFirestore(): boolean {
  return useDistributedRateLimiting
}

/**
 * Get rate limit state from Redis (distributed)
 * Uses Sorted Set (ZSET) to store sliding window timestamps + token weight
 * pipeline structure avoids round-trips
 */
async function getRedisRateLimitState(userId: string): Promise<{
  requestCount: number
  tokenCount: number
  concurrent: number
  oldestTimestamp: number | null
}> {
  const now = Date.now()
  const windowStart = now - WINDOW_SIZE_MS
  const zsetKey = `rate_limiter:zset:${userId}`
  const concurrentKey = `rate_limiter:concurrent:${userId}`

  try {
    const response = await fetch(`${redisUrl}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redisToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["ZREMRANGEBYSCORE", zsetKey, "-inf", `(${windowStart}`],
        ["ZRANGEBYSCORE", zsetKey, windowStart.toString(), "+inf", "WITHSCORES"],
        ["GET", concurrentKey],
      ]),
    })

    if (!response.ok) {
      throw new Error(`Upstash Redis pipeline error: ${response.statusText}`)
    }

    const data = await response.json()
    const zrangeResult = (data[1]?.result || []) as (string | number)[]
    const concurrentVal = parseInt(data[2]?.result || "0", 10)

    let requestCount = 0
    let tokenCount = 0
    let oldestTimestamp: number | null = null

    for (let i = 0; i < zrangeResult.length; i += 2) {
      const member = zrangeResult[i] as string
      const score = zrangeResult[i + 1] as number

      if (oldestTimestamp === null) {
        oldestTimestamp = score
      }

      requestCount++
      const parts = member.split(":")
      const tokens = parts.length > 1 ? parseInt(parts[1], 10) : 500
      tokenCount += tokens
    }

    return {
      requestCount,
      tokenCount,
      concurrent: Math.max(0, concurrentVal),
      oldestTimestamp,
    }
  } catch (error) {
    logger.error("Failed to get Redis rate limit state, falling back", {
      userId,
      error,
      fallback: shouldFallbackToFirestore() ? "firestore" : "memory",
    })
    if (shouldFallbackToFirestore()) {
      return getDistributedRateLimitState(userId)
    }
    return getInMemoryRateLimitState(userId)
  }
}

/**
 * Record request start in Redis
 */
async function recordRedisRequestStart(userId: string, estimatedTokens: number): Promise<void> {
  const now = Date.now()
  const zsetKey = `rate_limiter:zset:${userId}`
  const concurrentKey = `rate_limiter:concurrent:${userId}`
  const member = `${now}:${estimatedTokens}`

  try {
    const response = await fetch(`${redisUrl}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redisToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["ZADD", zsetKey, now.toString(), member],
        ["EXPIRE", zsetKey, (WINDOW_SIZE_MS / 1000 + 10).toFixed(0)],
        ["INCR", concurrentKey],
        ["EXPIRE", concurrentKey, (WINDOW_SIZE_MS / 1000 + 10).toFixed(0)],
      ]),
    })
    if (!response.ok) {
      throw new Error(`Upstash Redis pipeline error: ${response.statusText}`)
    }
  } catch (error) {
    logger.error("Failed to record Redis request start, falling back", { userId, error })
    if (shouldFallbackToFirestore()) {
      await recordDistributedRequestStart(userId, estimatedTokens)
    } else {
      recordRequestStart(userId, estimatedTokens)
    }
  }
}

/**
 * Record request end in Redis
 */
async function recordRedisRequestEnd(userId: string): Promise<void> {
  const concurrentKey = `rate_limiter:concurrent:${userId}`
  try {
    const response = await fetch(`${redisUrl}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redisToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([["DECR", concurrentKey]]),
    })
    if (!response.ok) {
      throw new Error(`Upstash Redis pipeline error: ${response.statusText}`)
    }
  } catch (error) {
    logger.error("Failed to record Redis request end, falling back", { userId, error })
    if (shouldFallbackToFirestore()) {
      await recordDistributedRequestEnd(userId)
    } else {
      recordRequestEnd(userId)
    }
  }
}

/**
 * Get rate limit state from Firestore (distributed)
 */
async function getDistributedRateLimitState(userId: string): Promise<{
  requestCount: number
  tokenCount: number
  concurrent: number
  oldestTimestamp: number | null
}> {
  const now = Date.now()
  const windowStart = now - WINDOW_SIZE_MS
  const docRef = adminDb.collection("user_rate_limits").doc(userId)

  try {
    const doc = await docRef.get()
    if (!doc.exists) {
      return { requestCount: 0, tokenCount: 0, concurrent: 0, oldestTimestamp: null }
    }

    const data = doc.data()!
    const entries: WindowEntry[] = data.entries || []

    // Filter to only entries within the window
    const validEntries = entries.filter((e) => e.timestamp > windowStart)

    return {
      requestCount: validEntries.length,
      tokenCount: validEntries.reduce((sum, e) => sum + e.tokens, 0),
      concurrent: data.concurrent || 0,
      oldestTimestamp: validEntries.length > 0 ? validEntries[0].timestamp : null,
    }
  } catch (error) {
    logger.error("Failed to get distributed rate limit state", { userId, error })
    // Fall back to in-memory
    return {
      requestCount: getRequestCount(userId),
      tokenCount: getTokenCount(userId),
      concurrent: concurrentRequests.get(userId) || 0,
      oldestTimestamp: getOldestRequestTime(userId),
    }
  }
}

/**
 * Record request start in Firestore (distributed)
 */
async function recordDistributedRequestStart(
  userId: string,
  estimatedTokens: number
): Promise<void> {
  const now = Date.now()
  const windowStart = now - WINDOW_SIZE_MS
  const docRef = adminDb.collection("user_rate_limits").doc(userId)

  try {
    await adminDb.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef)
      const data = doc.exists ? doc.data()! : { entries: [], concurrent: 0 }

      // Filter old entries and add new one
      const entries: WindowEntry[] = (data.entries || []).filter(
        (e: WindowEntry) => e.timestamp > windowStart
      )
      entries.push({ timestamp: now, tokens: estimatedTokens })

      transaction.set(
        docRef,
        {
          entries,
          concurrent: (data.concurrent || 0) + 1,
          updatedAt: now,
        },
        { merge: true }
      )
    })
  } catch (error) {
    logger.error("Failed to record distributed request start", { userId, error })
    // Fall back to in-memory
    recordRequestStart(userId, estimatedTokens)
  }
}

/**
 * Record request end in Firestore (distributed)
 */
async function recordDistributedRequestEnd(userId: string): Promise<void> {
  const docRef = adminDb.collection("user_rate_limits").doc(userId)

  try {
    await adminDb.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef)
      if (!doc.exists) return

      const data = doc.data()!
      transaction.update(docRef, {
        concurrent: Math.max(0, (data.concurrent || 1) - 1),
        updatedAt: Date.now(),
      })
    })
  } catch (error) {
    logger.error("Failed to record distributed request end", { userId, error })
    // Fall back to in-memory
    recordRequestEnd(userId)
  }
}

/**
 * Check if a request is allowed under rate limits
 * Uses Redis in production when configured. Firestore distributed mode is limited
 * to non-production explicit testing because it uses per-user transactions.
 */
export async function checkRateLimit(
  userId: string,
  tier: RateLimitTier = "free",
  estimatedTokens: number = 500
): Promise<RateLimitResult> {
  // Perform lazy cleanup to prevent memory buildup
  lazyCleanup()

  const limits = RATE_LIMITS[tier] || RATE_LIMITS.free
  const now = Date.now()

  // Get rate limit state (Redis, Firestore distributed, or in-memory)
  if (isProduction && !hasRedis) {
    logger.error("[Rate Limiter] Production Redis unavailable; using in-memory fail-open state", {
      userId,
    })
  }

  const state = hasRedis
    ? await getRedisRateLimitState(userId)
    : useDistributedRateLimiting
      ? await getDistributedRateLimitState(userId)
      : getInMemoryRateLimitState(userId)

  const buildUsage = (budgetPercent: number = 0) => ({
    requestsThisMinute: state.requestCount,
    tokensThisMinute: state.tokenCount,
    concurrentRequests: state.concurrent,
    budgetUsedPercent: budgetPercent,
  })

  const buildLimit = () => ({
    requestsPerMinute: limits.requestsPerMinute,
    tokensPerMinute: limits.tokensPerMinute,
    maxConcurrent: limits.maxConcurrentRequests,
  })

  // 1. Check concurrent requests
  if (state.concurrent >= limits.maxConcurrentRequests) {
    return {
      allowed: false,
      reason: "concurrent_limit",
      code: "CONCURRENT_LIMIT_EXCEEDED",
      message: `Too many concurrent requests. Max ${limits.maxConcurrentRequests} for ${tier} tier.`,
      tier,
      limit: buildLimit(),
      currentUsage: buildUsage(),
    }
  }

  // 2. Check request rate
  if (state.requestCount >= limits.requestsPerMinute) {
    const retryAfterMs = state.oldestTimestamp
      ? Math.max(0, state.oldestTimestamp + WINDOW_SIZE_MS - now)
      : 1000

    return {
      allowed: false,
      reason: "rate_limit",
      code: "REQUEST_RATE_LIMIT_EXCEEDED",
      retryAfterMs,
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
      message: `Rate limit exceeded. ${limits.requestsPerMinute} requests/minute for ${tier} tier.`,
      tier,
      limit: buildLimit(),
      currentUsage: buildUsage(),
    }
  }

  // 3. Check token rate
  if (state.tokenCount + estimatedTokens > limits.tokensPerMinute) {
    const retryAfterMs = state.oldestTimestamp
      ? Math.max(0, state.oldestTimestamp + WINDOW_SIZE_MS - now)
      : 1000

    return {
      allowed: false,
      reason: "rate_limit",
      code: "TOKEN_RATE_LIMIT_EXCEEDED",
      retryAfterMs,
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
      message: `Token limit exceeded. ${limits.tokensPerMinute.toLocaleString()} tokens/minute for ${tier} tier.`,
      tier,
      limit: buildLimit(),
      currentUsage: buildUsage(),
    }
  }

  // 4. Check budget (async - only for budget check)
  const usageSummary = await getUserUsageSummary(userId)
  if (usageSummary && usageSummary.budgetRemaining <= 0) {
    return {
      allowed: false,
      reason: "budget_exceeded",
      code: "MONTHLY_BUDGET_EXCEEDED",
      message: `Monthly budget of $${usageSummary.budgetCap.toFixed(2)} exceeded. Upgrade your plan or wait until next billing cycle.`,
      tier,
      limit: buildLimit(),
      currentUsage: buildUsage(100),
    }
  }

  return {
    allowed: true,
    tier,
    limit: buildLimit(),
    currentUsage: buildUsage(usageSummary?.budgetUsedPercent || 0),
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

  // Use distributed (Redis/Firestore) or in-memory based on environment
  if (hasRedis) {
    await recordRedisRequestStart(userId, estimatedTokens)
  } else if (useDistributedRateLimiting) {
    await recordDistributedRequestStart(userId, estimatedTokens)
  } else {
    recordRequestStart(userId, estimatedTokens)
  }

  try {
    const result = await fn()
    return { result, rateLimited: false }
  } finally {
    if (hasRedis) {
      await recordRedisRequestEnd(userId)
    } else if (useDistributedRateLimiting) {
      await recordDistributedRequestEnd(userId)
    } else {
      recordRequestEnd(userId)
    }
  }
}

/**
 * Helper to start tracking a request (exported for direct use in API routes)
 */
export async function startRequestTracking(
  userId: string,
  estimatedTokens: number = 500
): Promise<void> {
  if (hasRedis) {
    await recordRedisRequestStart(userId, estimatedTokens)
  } else if (useDistributedRateLimiting) {
    await recordDistributedRequestStart(userId, estimatedTokens)
  } else {
    recordRequestStart(userId, estimatedTokens)
  }
}

/**
 * Helper to end tracking a request (exported for direct use in API routes)
 */
export async function endRequestTracking(userId: string): Promise<void> {
  if (hasRedis) {
    await recordRedisRequestEnd(userId)
  } else if (useDistributedRateLimiting) {
    await recordDistributedRequestEnd(userId)
  } else {
    recordRequestEnd(userId)
  }
}

/**
 * Build a rate limit error response with detailed info for frontend
 */
export function buildRateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error: result.message,
      code: result.code || "RATE_LIMIT_EXCEEDED",
      type: result.reason,
      tier: result.tier,
      retryAfter: result.retryAfterSeconds,
      currentUsage: result.currentUsage,
      limit: result.limit,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(result.retryAfterSeconds || 60),
        "X-RateLimit-Limit": String(result.limit?.requestsPerMinute || 10),
        "X-RateLimit-Remaining": String(
          Math.max(
            0,
            (result.limit?.requestsPerMinute || 10) - (result.currentUsage?.requestsThisMinute || 0)
          )
        ),
        "X-RateLimit-Reset": String(
          Math.ceil(Date.now() / 1000) + (result.retryAfterSeconds || 60)
        ),
      },
    }
  )
}
