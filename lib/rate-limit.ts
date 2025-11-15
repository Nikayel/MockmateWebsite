/**
 * Rate limiting utilities for API endpoints
 * Prevents abuse by limiting requests per IP/user
 */

import { NextRequest, NextResponse } from "next/server"

interface RateLimitConfig {
  interval: number // Time window in milliseconds
  uniqueTokenPerInterval: number // Max number of unique tokens (IPs/users) to track
  maxRequests: number // Max requests per interval
}

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store for rate limiting
// In production, consider using Redis for distributed rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup old entries every 10 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}, 10 * 60 * 1000)

/**
 * Get client identifier (IP address or user ID)
 */
function getClientIdentifier(request: NextRequest): string {
  // Try to get IP from headers (works with proxies/load balancers)
  const forwarded = request.headers.get("x-forwarded-for")
  const realIp = request.headers.get("x-real-ip")

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
  return async (request: NextRequest): Promise<NextResponse | null> => {
    const identifier = getClientIdentifier(request)
    const now = Date.now()

    const key = `${identifier}`
    const entry = rateLimitStore.get(key)

    if (!entry || entry.resetTime < now) {
      // No entry or expired entry - create new one
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + config.interval
      })
      return null // Allow request
    }

    if (entry.count >= config.maxRequests) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000)

      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
          retryAfter
        },
        {
          status: 429,
          headers: {
            "Retry-After": retryAfter.toString(),
            "X-RateLimit-Limit": config.maxRequests.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": entry.resetTime.toString()
          }
        }
      )
    }

    // Increment count
    entry.count++

    return null // Allow request
  }
}

/**
 * Pre-configured rate limiters for different endpoints
 */

// Strict rate limit for code execution (5 requests per minute)
export const executeRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
  maxRequests: 10
})

// Moderate rate limit for chat API (20 requests per minute)
export const chatRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
  maxRequests: 20
})

// Lenient rate limit for other API endpoints (30 requests per minute)
export const apiRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
  maxRequests: 30
})

// Very strict for feedback generation (3 requests per minute)
export const feedbackRateLimit = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
  maxRequests: 5
})
