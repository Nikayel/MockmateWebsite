export type RateLimitDuration = `${number} ${"s" | "m" | "h" | "d"}`

export type RateLimitAlgorithm =
  | { kind: "sliding-window"; limit: number; window: RateLimitDuration }
  | {
      kind: "token-bucket"
      refillRate: number
      refillInterval: RateLimitDuration
      capacity: number
    }

export type RateLimitFailureMode = "allow" | "deny"

export interface RateLimitPolicy {
  algorithm: RateLimitAlgorithm
  failureMode: RateLimitFailureMode
  prefix: string
}

export interface RateLimitDecision {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: number
  reason: "allowed" | "limited" | "store-unavailable"
}
