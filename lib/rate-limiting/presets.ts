import type { NextRequest } from "next/server"
import type { RateLimitTier } from "@/lib/pricing"
import { enforceRateLimitPolicy } from "./enforce"
import { getClientIdentifier, resolveVerifiedIdentifier } from "./identity"
import type { RateLimitPolicyName } from "./policies"

function byIp(policyName: RateLimitPolicyName) {
  return (request: NextRequest) =>
    enforceRateLimitPolicy(policyName, `ip:${getClientIdentifier(request)}`)
}

export const apiRateLimit = byIp("api")
export const executeRateLimit = byIp("execute")
export const guestSessionRateLimit = byIp("guestSession")
export const guestApiRateLimit = byIp("guestWrite")
export const promoCodeRateLimit = byIp("promoCode")
export const hintRateLimit = byIp("hint")
export const ragRateLimit = byIp("rag")
export const ragStorageRateLimit = byIp("ragStorage")
export const ragV2RateLimit = byIp("ragV2")
export const embeddingRateLimit = byIp("ragEmbedding")
export const adminDeletionRateLimit = byIp("adminDeletion")
export const adminRagJobRateLimit = byIp("adminRagJob")
export const productFeedbackRateLimit = byIp("productFeedback")

const CHAT_POLICIES = {
  free: "chatFree",
  pro: "chatPro",
  enterprise: "chatEnterprise",
} as const satisfies Record<RateLimitTier, RateLimitPolicyName>

const SENSITIVE_POLICIES: ReadonlyArray<{ path: string; policy: RateLimitPolicyName }> = [
  { path: "/api/create-checkout", policy: "checkout" },
  { path: "/api/customer-portal", policy: "customerPortal" },
]

export function sensitivePolicyForPath(pathname: string): RateLimitPolicyName {
  return (
    SENSITIVE_POLICIES.find(({ path }) => pathname.startsWith(path))?.policy ?? "accountDeletion"
  )
}

export async function sensitiveOperationRateLimit(request: NextRequest) {
  const pathname = new URL(request.url).pathname
  return enforceRateLimitPolicy(
    sensitivePolicyForPath(pathname),
    await resolveVerifiedIdentifier(request)
  )
}

export function enforceChatRateLimit(userId: string, tier: RateLimitTier) {
  return enforceRateLimitPolicy(CHAT_POLICIES[tier], `user:${userId}`)
}

export function enforceExecuteRateLimit(userId: string) {
  return enforceRateLimitPolicy("execute", `user:${userId}`)
}

export function enforceAiFeedbackRateLimit(userId: string) {
  return enforceRateLimitPolicy("feedback", `user:${userId}`)
}

export async function enforceFeedbackStreamRateLimit(userId: string) {
  const identifier = `user:${userId}`
  return (
    (await enforceRateLimitPolicy("feedbackStreamBurst", identifier)) ??
    enforceRateLimitPolicy("feedbackStreamSustained", identifier)
  )
}
