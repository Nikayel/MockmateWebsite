/**
 * Rate limiting utilities for API endpoints
 * Prevents abuse by limiting requests per IP/user
 *
 * IMPORTANT: This implementation supports both in-memory (development)
 * and distributed (production) rate limiting stores.
 *
 * For production with serverless (Vercel, Cloudflare Workers, etc.):
 * - Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars
 * - Or implement a custom RateLimitStore using Firestore/Redis
 */

import { NextRequest, NextResponse } from "next/server"
import { logger } from "./logger"

interface RateLimitConfig {
  interval: number // Time window in milliseconds
  uniqueTokenPerInterval: number // Max number of unique tokens (IPs/users) to track
  maxRequests: number // Max requests per interval
  prefix?: string // Prefix for rate limit keys (helps identify endpoint)
}

interface RateLimitEntry {
  count: number
  resetTime: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
  retryAfter?: number
}

/**
 * Rate Limit Store Interface
 * Implement this for different backends (Redis, Firestore, etc.)
 */
interface RateLimitStore {
  get(key: string): Promise<RateLimitEntry | null>
  set(key: string, entry: RateLimitEntry, ttlMs: number): Promise<void>
  increment(key: string, config: RateLimitConfig): Promise<RateLimitResult>
}

/**
 * In-Memory Rate Limit Store
 * WARNING: Only suitable for single-instance deployments or development
 * Each serverless instance will have its own store, allowing bypass
 *
 * NOTE: Uses lazy cleanup instead of setInterval to avoid memory leaks
 * in serverless environments where global intervals never get cleared
 */
class InMemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, RateLimitEntry>()
  private lastCleanupTime = Date.now()
  private readonly CLEANUP_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

  /**
   * Perform lazy cleanup of expired entries
   * Called before each operation to prevent memory buildup
   */
  private lazyCleanup(): void {
    const now = Date.now()
    if (now - this.lastCleanupTime > this.CLEANUP_INTERVAL_MS) {
      for (const [key, entry] of this.store.entries()) {
        if (entry.resetTime < now) {
          this.store.delete(key)
        }
      }
      this.lastCleanupTime = now
    }
  }

  async get(key: string): Promise<RateLimitEntry | null> {
    // Perform lazy cleanup on each access
    this.lazyCleanup()

    const entry = this.store.get(key)
    if (!entry) return null
    if (entry.resetTime < Date.now()) {
      this.store.delete(key)
      return null
    }
    return entry
  }

  async set(key: string, entry: RateLimitEntry, _ttlMs: number): Promise<void> {
    this.store.set(key, entry)
  }

  async increment(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    // Perform lazy cleanup on each access
    this.lazyCleanup()

    const now = Date.now()
    let entry = this.store.get(key)

    if (!entry || entry.resetTime < now) {
      // Create new window
      entry = {
        count: 1,
        resetTime: now + config.interval,
      }
      this.store.set(key, entry)
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: entry.resetTime,
      }
    }

    // Check if limit exceeded BEFORE incrementing
    if (entry.count >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter: Math.ceil((entry.resetTime - now) / 1000),
      }
    }

    // Increment count
    entry.count++
    this.store.set(key, entry)

    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetTime: entry.resetTime,
    }
  }

  // For testing: clear the store
  clear(): void {
    this.store.clear()
  }

  // For testing: get store size
  size(): number {
    return this.store.size
  }
}

/**
 * Upstash Redis Rate Limit Store
 * Production-ready distributed rate limiting using Upstash Redis
 * Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars
 */
class UpstashRateLimitStore implements RateLimitStore {
  private baseUrl: string
  private token: string

  constructor() {
    this.baseUrl = process.env.UPSTASH_REDIS_REST_URL || ""
    this.token = process.env.UPSTASH_REDIS_REST_TOKEN || ""
  }

  private async redis(command: string[]): Promise<any> {
    const response = await fetch(`${this.baseUrl}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
    })

    if (!response.ok) {
      throw new Error(`Upstash Redis error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.result
  }

  async get(key: string): Promise<RateLimitEntry | null> {
    try {
      const result = await this.redis(["GET", key])
      if (!result) return null
      return JSON.parse(result) as RateLimitEntry
    } catch (error) {
      logger.error("Upstash get error", { key, error })
      return null
    }
  }

  async set(key: string, entry: RateLimitEntry, ttlMs: number): Promise<void> {
    try {
      await this.redis(["SET", key, JSON.stringify(entry), "PX", ttlMs.toString()])
    } catch (error) {
      logger.error("Upstash set error", { key, error })
    }
  }

  async increment(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const now = Date.now()

    try {
      // Use Lua script for atomic increment operation
      // This ensures consistency in distributed environments
      const luaScript = `
        local key = KEYS[1]
        local now = tonumber(ARGV[1])
        local interval = tonumber(ARGV[2])
        local maxRequests = tonumber(ARGV[3])

        local data = redis.call('GET', key)
        local count = 1
        local resetTime = now + interval

        if data then
          local parsed = cjson.decode(data)
          if parsed.resetTime > now then
            count = parsed.count + 1
            resetTime = parsed.resetTime
          end
        end

        local entry = cjson.encode({count = count, resetTime = resetTime})
        local ttl = math.ceil((resetTime - now) / 1000) + 1
        redis.call('SET', key, entry, 'EX', ttl)

        return cjson.encode({count = count, resetTime = resetTime, maxRequests = maxRequests})
      `

      // For simplicity, we'll use a simpler approach with GET + SET
      // A production implementation should use EVAL with Lua script above
      const entry = await this.get(key)

      if (!entry || entry.resetTime < now) {
        const newEntry = {
          count: 1,
          resetTime: now + config.interval,
        }
        await this.set(key, newEntry, config.interval + 1000)
        return {
          allowed: true,
          remaining: config.maxRequests - 1,
          resetTime: newEntry.resetTime,
        }
      }

      if (entry.count >= config.maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: entry.resetTime,
          retryAfter: Math.ceil((entry.resetTime - now) / 1000),
        }
      }

      entry.count++
      const ttl = entry.resetTime - now + 1000
      await this.set(key, entry, ttl)

      return {
        allowed: true,
        remaining: config.maxRequests - entry.count,
        resetTime: entry.resetTime,
      }
    } catch (error) {
      logger.error("Upstash increment error, falling back to allow", { key, error })
      // Fail open on errors - don't block users if Redis is down
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetTime: now + config.interval,
      }
    }
  }
}

/**
 * Firestore Rate Limit Store
 * Uses Firebase Firestore for distributed rate limiting
 * Good option if you're already using Firebase
 */
class FirestoreRateLimitStore implements RateLimitStore {
  async get(key: string): Promise<RateLimitEntry | null> {
    try {
      const { adminDb } = await import("./firebase-admin")
      const doc = await adminDb.collection("rate_limits").doc(key).get()
      if (!doc.exists) return null

      const data = doc.data()
      if (!data) return null

      const entry: RateLimitEntry = {
        count: data.count || 0,
        resetTime: data.resetTime || 0,
      }

      if (entry.resetTime < Date.now()) {
        await adminDb.collection("rate_limits").doc(key).delete()
        return null
      }

      return entry
    } catch (error) {
      logger.error("Firestore rate limit get error", { key, error })
      return null
    }
  }

  async set(key: string, entry: RateLimitEntry, _ttlMs: number): Promise<void> {
    try {
      const { adminDb } = await import("./firebase-admin")
      await adminDb.collection("rate_limits").doc(key).set({
        count: entry.count,
        resetTime: entry.resetTime,
        updatedAt: Date.now(),
      })
    } catch (error) {
      logger.error("Firestore rate limit set error", { key, error })
    }
  }

  async increment(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const now = Date.now()

    try {
      const { adminDb, FieldValue } = await import("./firebase-admin")
      const docRef = adminDb.collection("rate_limits").doc(key)

      // Use transaction for atomic increment
      const result = await adminDb.runTransaction(async (transaction) => {
        const doc = await transaction.get(docRef)
        let count = 1
        let resetTime = now + config.interval

        if (doc.exists) {
          const data = doc.data()
          if (data && data.resetTime > now) {
            count = (data.count || 0) + 1
            resetTime = data.resetTime
          }
        }

        transaction.set(docRef, {
          count,
          resetTime,
          updatedAt: now,
        })

        return { count, resetTime }
      })

      const allowed = result.count <= config.maxRequests

      return {
        allowed,
        remaining: Math.max(0, config.maxRequests - result.count),
        resetTime: result.resetTime,
        retryAfter: allowed ? undefined : Math.ceil((result.resetTime - now) / 1000),
      }
    } catch (error) {
      logger.error("Firestore rate limit increment error, falling back to allow", { key, error })
      // Fail open
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetTime: now + config.interval,
      }
    }
  }
}

/**
 * Get the appropriate rate limit store based on environment
 *
 * Priority:
 * 1. Upstash Redis (fastest, recommended for Vercel)
 * 2. Firestore (good if already using Firebase, default for production)
 * 3. In-memory (development only)
 */
function getRateLimitStore(): RateLimitStore {
  // Check for Upstash Redis (recommended for Vercel - fastest option)
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    logger.info("Using Upstash Redis for rate limiting")
    return new UpstashRateLimitStore()
  }

  // In production, default to Firestore if Firebase is configured
  // This ensures distributed rate limiting works across serverless instances
  const isProduction = process.env.NODE_ENV === "production"
  const hasFirebaseConfig =
    process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS

  if (hasFirebaseConfig) {
    // Use Firestore in production by default, or if explicitly enabled
    if (isProduction || process.env.USE_FIRESTORE_RATE_LIMIT === "true") {
      logger.info("Using Firestore for distributed rate limiting")
      return new FirestoreRateLimitStore()
    }
  }

  // Fallback to in-memory (development only)
  if (isProduction) {
    // SECURITY: In production, require distributed rate limiting to prevent bypass
    // Each serverless instance has its own in-memory store, allowing attackers
    // to bypass limits by distributing requests across instances
    const errorMessage =
      "SECURITY ERROR: No distributed rate limiting configured in production. " +
      "Configure UPSTASH_REDIS_REST_URL/TOKEN or ensure Firebase Admin is properly configured. " +
      "Set ALLOW_INSECURE_RATE_LIMIT=true to override (NOT RECOMMENDED)."

    if (process.env.ALLOW_INSECURE_RATE_LIMIT !== "true") {
      logger.error(errorMessage)
      throw new Error(errorMessage)
    }

    logger.warn(
      "Using in-memory rate limiting in production - this may allow rate limit bypass. " +
        "Configure UPSTASH_REDIS_REST_URL/TOKEN or ensure Firebase Admin is properly configured."
    )
  }
  return new InMemoryRateLimitStore()
}

// Singleton store instance
let rateLimitStore: RateLimitStore | null = null

function getStore(): RateLimitStore {
  if (!rateLimitStore) {
    rateLimitStore = getRateLimitStore()
  }
  return rateLimitStore
}

/**
 * Get client identifier (trusted client IP) for rate limiting.
 *
 * SECURITY: We must derive the IP from a source the client cannot forge,
 * otherwise an attacker can rotate the spoofed value to mint unlimited
 * rate-limit buckets. On Vercel, `x-vercel-forwarded-for` and `x-real-ip`
 * are written by the platform edge and overwrite any client-supplied value,
 * so they are trustworthy. The plain `x-forwarded-for` header is a
 * client-controlled, comma-separated chain whose LEFTMOST entries are
 * attacker-supplied — so we only ever trust its RIGHTMOST (nearest-proxy)
 * entry as a self-hosted fallback, never the leftmost.
 *
 * We deliberately do NOT trust `cf-connecting-ip` here: this app runs on
 * Vercel (not behind Cloudflare), so that header is fully attacker-controlled.
 *
 * Exported (at the bottom of this file) for unit testing.
 */
function getClientIdentifier(request: NextRequest): string {
  // 1. Vercel-trusted client IP (cannot be spoofed by the client).
  const vercelForwarded = request.headers.get("x-vercel-forwarded-for")
  if (vercelForwarded) {
    const ip = vercelForwarded.split(",")[0]?.trim()
    if (ip) return ip
  }

  // 2. x-real-ip is also set by the Vercel edge to the real client IP.
  const realIp = request.headers.get("x-real-ip")?.trim()
  if (realIp) {
    return realIp
  }

  // 3. Self-hosted/proxy fallback: trust ONLY the rightmost x-forwarded-for
  // entry (appended by the nearest trusted proxy). Leftmost entries are
  // client-spoofable and must never be used as the identifier.
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    const parts = forwarded
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
    if (parts.length > 0) {
      return parts[parts.length - 1]
    }
  }

  // Fallback to a generic identifier (shared bucket — fails toward stricter
  // limiting rather than minting a fresh bucket per request).
  return "unknown"
}

/**
 * Rate limit middleware
 * Returns null if allowed, or NextResponse with 429 if rate limited
 */
export function rateLimit(config: RateLimitConfig) {
  const prefix = config.prefix || "rl"

  return async (request: NextRequest): Promise<NextResponse | null> => {
    const identifier = getClientIdentifier(request)
    const key = `${prefix}:${identifier}`
    const store = getStore()

    try {
      const result = await store.increment(key, config)

      if (!result.allowed) {
        logger.warn("Rate limit exceeded", {
          key,
          identifier,
          retryAfter: result.retryAfter,
        })

        return NextResponse.json(
          {
            error: "Too many requests. Please try again later.",
            retryAfter: result.retryAfter,
          },
          {
            status: 429,
            headers: {
              "Retry-After": (result.retryAfter || 60).toString(),
              "X-RateLimit-Limit": config.maxRequests.toString(),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": result.resetTime.toString(),
            },
          }
        )
      }

      return null // Allow request
    } catch (error) {
      logger.error("Rate limiting error, allowing request", { key, error })
      // Fail open - don't block users if rate limiting fails
      return null
    }
  }
}

/**
 * Pre-configured rate limiters for different endpoints
 */

// Strict rate limit for code execution (10 requests per minute)
export const executeRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
  maxRequests: 10,
  prefix: "rl:execute",
})

// Moderate rate limit for chat API (20 requests per minute)
export const chatRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
  maxRequests: 20,
  prefix: "rl:chat",
})

// Lenient rate limit for other API endpoints (30 requests per minute)
export const apiRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
  maxRequests: 30,
  prefix: "rl:api",
})

// Very strict for feedback generation (5 requests per minute)
export const feedbackRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
  maxRequests: 5,
  prefix: "rl:feedback",
})

// Extremely strict for sensitive operations like account deletion
// 2 requests per hour to prevent abuse
export const sensitiveOperationRateLimit = rateLimit({
  interval: 60 * 60 * 1000, // 1 hour
  uniqueTokenPerInterval: 100,
  maxRequests: 2,
  prefix: "rl:sensitive",
})

/**
 * Guest session creations per hour per IP. Default 3 — strict, because guest
 * sessions carry real AI cost. GUEST_SESSION_LIMIT_PER_HOUR exists for event
 * windows (career-fair tables, lecture-hall demos) where a whole room shares one
 * NAT'd IP and the default would kill the funnel after three people: set it
 * (e.g. 50) in the deployment env for the event, unset it after. Read once at
 * boot; invalid or out-of-range values fall back to the default.
 */
export function parseGuestSessionLimit(raw: string | undefined): number {
  const DEFAULT_LIMIT = 3
  const MAX_LIMIT = 1000
  if (!raw) return DEFAULT_LIMIT
  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_LIMIT) return DEFAULT_LIMIT
  return parsed
}

// Guest session rate limit - strict to prevent abuse
export const guestSessionRateLimit = rateLimit({
  interval: 60 * 60 * 1000, // 1 hour
  uniqueTokenPerInterval: 500,
  maxRequests: parseGuestSessionLimit(process.env.GUEST_SESSION_LIMIT_PER_HOUR),
  prefix: "rl:guest",
})

// Guest API rate limit - for chat/execute during guest sessions
// More lenient than session creation but still limited
export const guestApiRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
  maxRequests: 15, // Slightly lower than authenticated users
  prefix: "rl:guest-api",
})

// Promo code rate limit - strict to prevent brute-force attacks
// 5 attempts per hour per IP to prevent code guessing
export const promoCodeRateLimit = rateLimit({
  interval: 60 * 60 * 1000, // 1 hour
  uniqueTokenPerInterval: 500,
  maxRequests: 5,
  prefix: "rl:promo",
})

// Export types and utilities for testing
export type { RateLimitConfig, RateLimitEntry, RateLimitResult, RateLimitStore }
export { InMemoryRateLimitStore, getClientIdentifier }
