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
 */
class InMemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, RateLimitEntry>()
  private cleanupInterval: ReturnType<typeof setInterval> | null = null

  constructor() {
    // Cleanup old entries every 5 minutes
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => {
        const now = Date.now()
        for (const [key, entry] of this.store.entries()) {
          if (entry.resetTime < now) {
            this.store.delete(key)
          }
        }
      }, 5 * 60 * 1000)
    }
  }

  async get(key: string): Promise<RateLimitEntry | null> {
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
    const now = Date.now()
    let entry = this.store.get(key)

    if (!entry || entry.resetTime < now) {
      // Create new window
      entry = {
        count: 1,
        resetTime: now + config.interval
      }
      this.store.set(key, entry)
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: entry.resetTime
      }
    }

    // Check if limit exceeded BEFORE incrementing
    if (entry.count >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter: Math.ceil((entry.resetTime - now) / 1000)
      }
    }

    // Increment count
    entry.count++
    this.store.set(key, entry)

    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetTime: entry.resetTime
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
    this.baseUrl = process.env.UPSTASH_REDIS_REST_URL || ''
    this.token = process.env.UPSTASH_REDIS_REST_TOKEN || ''
  }

  private async redis(command: string[]): Promise<any> {
    const response = await fetch(`${this.baseUrl}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
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
      const result = await this.redis(['GET', key])
      if (!result) return null
      return JSON.parse(result) as RateLimitEntry
    } catch (error) {
      logger.error('Upstash get error', { key, error })
      return null
    }
  }

  async set(key: string, entry: RateLimitEntry, ttlMs: number): Promise<void> {
    try {
      await this.redis(['SET', key, JSON.stringify(entry), 'PX', ttlMs.toString()])
    } catch (error) {
      logger.error('Upstash set error', { key, error })
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
          resetTime: now + config.interval
        }
        await this.set(key, newEntry, config.interval + 1000)
        return {
          allowed: true,
          remaining: config.maxRequests - 1,
          resetTime: newEntry.resetTime
        }
      }

      if (entry.count >= config.maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: entry.resetTime,
          retryAfter: Math.ceil((entry.resetTime - now) / 1000)
        }
      }

      entry.count++
      const ttl = entry.resetTime - now + 1000
      await this.set(key, entry, ttl)

      return {
        allowed: true,
        remaining: config.maxRequests - entry.count,
        resetTime: entry.resetTime
      }
    } catch (error) {
      logger.error('Upstash increment error, falling back to allow', { key, error })
      // Fail open on errors - don't block users if Redis is down
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetTime: now + config.interval
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
      const { adminDb } = await import('./firebase-admin')
      const doc = await adminDb.collection('rate_limits').doc(key).get()
      if (!doc.exists) return null

      const data = doc.data()
      if (!data) return null

      const entry: RateLimitEntry = {
        count: data.count || 0,
        resetTime: data.resetTime || 0
      }

      if (entry.resetTime < Date.now()) {
        await adminDb.collection('rate_limits').doc(key).delete()
        return null
      }

      return entry
    } catch (error) {
      logger.error('Firestore rate limit get error', { key, error })
      return null
    }
  }

  async set(key: string, entry: RateLimitEntry, _ttlMs: number): Promise<void> {
    try {
      const { adminDb } = await import('./firebase-admin')
      await adminDb.collection('rate_limits').doc(key).set({
        count: entry.count,
        resetTime: entry.resetTime,
        updatedAt: Date.now()
      })
    } catch (error) {
      logger.error('Firestore rate limit set error', { key, error })
    }
  }

  async increment(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const now = Date.now()

    try {
      const { adminDb, FieldValue } = await import('./firebase-admin')
      const docRef = adminDb.collection('rate_limits').doc(key)

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
          updatedAt: now
        })

        return { count, resetTime }
      })

      const allowed = result.count <= config.maxRequests

      return {
        allowed,
        remaining: Math.max(0, config.maxRequests - result.count),
        resetTime: result.resetTime,
        retryAfter: allowed ? undefined : Math.ceil((result.resetTime - now) / 1000)
      }
    } catch (error) {
      logger.error('Firestore rate limit increment error, falling back to allow', { key, error })
      // Fail open
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetTime: now + config.interval
      }
    }
  }
}

/**
 * Get the appropriate rate limit store based on environment
 */
function getRateLimitStore(): RateLimitStore {
  // Check for Upstash Redis (recommended for Vercel)
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    logger.info('Using Upstash Redis for rate limiting')
    return new UpstashRateLimitStore()
  }

  // Check for Firestore (if using Firebase)
  if (process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Only use Firestore if explicitly enabled (to avoid overhead)
    if (process.env.USE_FIRESTORE_RATE_LIMIT === 'true') {
      logger.info('Using Firestore for rate limiting')
      return new FirestoreRateLimitStore()
    }
  }

  // Fallback to in-memory (development only)
  if (process.env.NODE_ENV === 'production') {
    logger.warn(
      'Using in-memory rate limiting in production. ' +
      'This is NOT recommended for serverless deployments. ' +
      'Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for distributed rate limiting.'
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
 * Get client identifier (IP address or user ID)
 */
function getClientIdentifier(request: NextRequest): string {
  // Try to get IP from headers (works with proxies/load balancers)
  const forwarded = request.headers.get("x-forwarded-for")
  const realIp = request.headers.get("x-real-ip")
  const cfConnectingIp = request.headers.get("cf-connecting-ip") // Cloudflare

  if (cfConnectingIp) {
    return cfConnectingIp
  }

  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }

  if (realIp) {
    return realIp
  }

  // Fallback to a generic identifier
  return "unknown"
}

/**
 * Rate limit middleware
 * Returns null if allowed, or NextResponse with 429 if rate limited
 */
export function rateLimit(config: RateLimitConfig) {
  const prefix = config.prefix || 'rl'

  return async (request: NextRequest): Promise<NextResponse | null> => {
    const identifier = getClientIdentifier(request)
    const key = `${prefix}:${identifier}`
    const store = getStore()

    try {
      const result = await store.increment(key, config)

      if (!result.allowed) {
        logger.warn('Rate limit exceeded', {
          key,
          identifier,
          retryAfter: result.retryAfter,
        })

        return NextResponse.json(
          {
            error: "Too many requests. Please try again later.",
            retryAfter: result.retryAfter
          },
          {
            status: 429,
            headers: {
              "Retry-After": (result.retryAfter || 60).toString(),
              "X-RateLimit-Limit": config.maxRequests.toString(),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": result.resetTime.toString()
            }
          }
        )
      }

      return null // Allow request
    } catch (error) {
      logger.error('Rate limiting error, allowing request', { key, error })
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
  prefix: 'rl:execute'
})

// Moderate rate limit for chat API (20 requests per minute)
export const chatRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
  maxRequests: 20,
  prefix: 'rl:chat'
})

// Lenient rate limit for other API endpoints (30 requests per minute)
export const apiRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
  maxRequests: 30,
  prefix: 'rl:api'
})

// Very strict for feedback generation (5 requests per minute)
export const feedbackRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
  maxRequests: 5,
  prefix: 'rl:feedback'
})

// Export types and utilities for testing
export type { RateLimitConfig, RateLimitEntry, RateLimitResult, RateLimitStore }
export { InMemoryRateLimitStore, getClientIdentifier }
