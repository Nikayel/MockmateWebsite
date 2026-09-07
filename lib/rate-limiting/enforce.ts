import { NextResponse } from "next/server"
import { logger } from "@/lib/logger"
import { RATE_LIMIT_POLICIES, type RateLimitPolicyName } from "./policies"
import type { RateLimitDecision } from "./types"
import { getUpstashRateLimiter } from "./upstash"

function unavailableDecision(policyName: RateLimitPolicyName): RateLimitDecision {
  const policy = RATE_LIMIT_POLICIES[policyName]
  return {
    allowed: policy.failureMode === "allow",
    limit: 0,
    remaining: 0,
    resetAt: Date.now() + 5_000,
    reason: "store-unavailable",
  }
}

export async function checkRateLimitPolicy(
  policyName: RateLimitPolicyName,
  identifier: string
): Promise<RateLimitDecision> {
  const limiter = getUpstashRateLimiter(policyName)
  if (!limiter) {
    if (process.env.NODE_ENV === "production") {
      logger.error("Rate-limit store is not configured", { policyName })
      return unavailableDecision(policyName)
    }
    return { allowed: true, limit: 0, remaining: 0, resetAt: 0, reason: "allowed" }
  }

  try {
    const result = await limiter.limit(identifier)
    if (result.reason === "timeout") {
      logger.error("Rate-limit store timed out", { policyName })
      return unavailableDecision(policyName)
    }
    return {
      allowed: result.success,
      limit: result.limit,
      remaining: result.remaining,
      resetAt: result.reset,
      reason: result.success ? "allowed" : "limited",
    }
  } catch (error) {
    logger.error("Rate-limit check failed", { policyName, error })
    return unavailableDecision(policyName)
  }
}

export async function enforceRateLimitPolicy(
  policyName: RateLimitPolicyName,
  identifier: string
): Promise<NextResponse | null> {
  const decision = await checkRateLimitPolicy(policyName, identifier)
  if (decision.allowed) return null

  const unavailable = decision.reason === "store-unavailable"
  const retryAfter = unavailable
    ? 5
    : Math.max(1, Math.ceil((decision.resetAt - Date.now()) / 1000))
  return NextResponse.json(
    {
      error: unavailable
        ? "Request protection is temporarily unavailable. Please retry shortly."
        : "Too many requests. Please try again later.",
      code: unavailable ? "RATE_LIMIT_UNAVAILABLE" : "RATE_LIMIT_EXCEEDED",
      retryAfter,
    },
    {
      status: unavailable ? 503 : 429,
      headers: {
        "Retry-After": String(retryAfter),
        "RateLimit-Limit": String(decision.limit),
        "RateLimit-Remaining": String(decision.remaining),
        "RateLimit-Reset": String(decision.resetAt),
        "X-RateLimit-Limit": String(decision.limit),
        "X-RateLimit-Remaining": String(decision.remaining),
        "X-RateLimit-Reset": String(decision.resetAt),
      },
    }
  )
}
