import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { RATE_LIMIT_POLICIES, type RateLimitPolicyName } from "./policies"
import type { RateLimitAlgorithm } from "./types"

function buildAlgorithm(algorithm: RateLimitAlgorithm) {
  switch (algorithm.kind) {
    case "sliding-window":
      return Ratelimit.slidingWindow(algorithm.limit, algorithm.window)
    case "token-bucket":
      return Ratelimit.tokenBucket(
        algorithm.refillRate,
        algorithm.refillInterval,
        algorithm.capacity
      )
  }
}

const limiters = new Map<RateLimitPolicyName, Ratelimit>()

function createRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  return url && token ? new Redis({ url, token }) : null
}

const redis = createRedis()

export function getUpstashRateLimiter(policyName: RateLimitPolicyName): Ratelimit | null {
  if (!redis) return null

  const existing = limiters.get(policyName)
  if (existing) return existing

  const policy = RATE_LIMIT_POLICIES[policyName]
  const limiter = new Ratelimit({
    redis,
    limiter: buildAlgorithm(policy.algorithm),
    prefix: `codesparring:rate-limit:${policy.prefix}`,
    ephemeralCache: new Map(),
    timeout: 1_000,
    analytics: process.env.UPSTASH_RATE_LIMIT_ANALYTICS === "true",
  })
  limiters.set(policyName, limiter)
  return limiter
}
