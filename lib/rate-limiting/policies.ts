import type { RateLimitPolicy } from "./types"
import { RATE_LIMITS } from "@/lib/pricing"

const ONE_MINUTE = "1 m" as const
const ONE_HOUR = "1 h" as const

function envLimit(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback
  const parsed = Number(raw)
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 1_000 ? parsed : fallback
}

/**
 * The single source of truth for HTTP request-rate policy. Route files select a
 * domain name from this registry; they never construct algorithms or Redis keys.
 */
export const RATE_LIMIT_POLICIES = {
  api: {
    algorithm: {
      kind: "token-bucket",
      refillRate: 60,
      refillInterval: ONE_MINUTE,
      capacity: 120,
    },
    failureMode: "allow",
    prefix: "api",
  },
  execute: {
    algorithm: { kind: "sliding-window", limit: 10, window: ONE_MINUTE },
    failureMode: "deny",
    prefix: "execute",
  },
  feedback: {
    algorithm: { kind: "sliding-window", limit: 5, window: ONE_MINUTE },
    failureMode: "deny",
    prefix: "feedback",
  },
  chatFree: {
    algorithm: {
      kind: "token-bucket",
      refillRate: RATE_LIMITS.free.requestsPerMinute,
      refillInterval: ONE_MINUTE,
      capacity: RATE_LIMITS.free.requestsPerMinute,
    },
    failureMode: "deny",
    prefix: "chat:free",
  },
  chatPro: {
    algorithm: {
      kind: "token-bucket",
      refillRate: RATE_LIMITS.pro.requestsPerMinute,
      refillInterval: ONE_MINUTE,
      capacity: RATE_LIMITS.pro.requestsPerMinute,
    },
    failureMode: "deny",
    prefix: "chat:pro",
  },
  chatEnterprise: {
    algorithm: {
      kind: "token-bucket",
      refillRate: RATE_LIMITS.enterprise.requestsPerMinute,
      refillInterval: ONE_MINUTE,
      capacity: RATE_LIMITS.enterprise.requestsPerMinute,
    },
    failureMode: "deny",
    prefix: "chat:enterprise",
  },
  checkout: {
    algorithm: { kind: "sliding-window", limit: 10, window: ONE_HOUR },
    failureMode: "allow",
    prefix: "checkout",
  },
  customerPortal: {
    algorithm: { kind: "sliding-window", limit: 10, window: ONE_HOUR },
    failureMode: "allow",
    prefix: "customer-portal",
  },
  accountDeletion: {
    algorithm: { kind: "sliding-window", limit: 2, window: ONE_HOUR },
    failureMode: "deny",
    prefix: "account-deletion",
  },
  guestSession: {
    algorithm: {
      kind: "sliding-window",
      limit: envLimit(process.env.GUEST_SESSION_LIMIT_PER_HOUR, 3),
      window: ONE_HOUR,
    },
    failureMode: "deny",
    prefix: "guest-session",
  },
  guestWrite: {
    algorithm: {
      kind: "token-bucket",
      refillRate: envLimit(process.env.GUEST_API_LIMIT_PER_MINUTE, 15),
      refillInterval: ONE_MINUTE,
      capacity: envLimit(process.env.GUEST_API_LIMIT_PER_MINUTE, 15),
    },
    failureMode: "deny",
    prefix: "guest-write",
  },
  promoCode: {
    algorithm: { kind: "sliding-window", limit: 5, window: ONE_HOUR },
    failureMode: "allow",
    prefix: "promo-code",
  },
  hint: {
    algorithm: { kind: "sliding-window", limit: 15, window: ONE_MINUTE },
    failureMode: "deny",
    prefix: "hint",
  },
  rag: {
    algorithm: { kind: "token-bucket", refillRate: 30, refillInterval: ONE_MINUTE, capacity: 40 },
    failureMode: "allow",
    prefix: "rag",
  },
  ragStorage: {
    algorithm: { kind: "token-bucket", refillRate: 50, refillInterval: ONE_MINUTE, capacity: 60 },
    failureMode: "allow",
    prefix: "rag-storage",
  },
  ragV2: {
    algorithm: { kind: "token-bucket", refillRate: 30, refillInterval: ONE_MINUTE, capacity: 40 },
    failureMode: "allow",
    prefix: "rag-v2",
  },
  ragEmbedding: {
    algorithm: { kind: "sliding-window", limit: 20, window: ONE_MINUTE },
    failureMode: "deny",
    prefix: "rag-embedding",
  },
  adminDeletion: {
    algorithm: { kind: "sliding-window", limit: 5, window: ONE_MINUTE },
    failureMode: "deny",
    prefix: "admin-deletion",
  },
  adminRagJob: {
    algorithm: { kind: "sliding-window", limit: 3, window: "5 m" },
    failureMode: "deny",
    prefix: "admin-rag-job",
  },
  productFeedback: {
    algorithm: { kind: "sliding-window", limit: 10, window: ONE_HOUR },
    failureMode: "allow",
    prefix: "product-feedback",
  },
  feedbackStreamBurst: {
    algorithm: { kind: "sliding-window", limit: 3, window: ONE_MINUTE },
    failureMode: "deny",
    prefix: "feedback-stream:burst",
  },
  feedbackStreamSustained: {
    algorithm: { kind: "sliding-window", limit: 20, window: ONE_HOUR },
    failureMode: "deny",
    prefix: "feedback-stream:sustained",
  },
} as const satisfies Record<string, RateLimitPolicy>

export type RateLimitPolicyName = keyof typeof RATE_LIMIT_POLICIES

export function parseGuestSessionLimit(raw: string | undefined): number {
  return envLimit(raw, 3)
}

export function parseGuestApiLimit(raw: string | undefined): number {
  return envLimit(raw, 15)
}
