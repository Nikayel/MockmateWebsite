import { describe, expect, it } from "vitest"
import { RATE_LIMITS } from "@/lib/pricing"
import { RATE_LIMIT_POLICIES, parseGuestApiLimit, parseGuestSessionLimit } from "../policies"

function expectTokenBucket(policyName: "chatFree" | "chatPro" | "chatEnterprise") {
  const algorithm = RATE_LIMIT_POLICIES[policyName].algorithm
  expect(algorithm.kind).toBe("token-bucket")
  if (algorithm.kind !== "token-bucket") throw new Error(`${policyName} must use a token bucket`)
  return algorithm
}

describe("rate-limit policies", () => {
  it("uses token buckets for user chat", () => {
    expectTokenBucket("chatFree")
    expectTokenBucket("chatPro")
    expectTokenBucket("chatEnterprise")
  })

  it("gives Pro exactly ten times Free chat throughput", () => {
    const free = expectTokenBucket("chatFree")
    const pro = expectTokenBucket("chatPro")

    expect(pro.refillRate).toBe(free.refillRate * 10)
    expect(pro.capacity).toBe(free.capacity * 10)
    expect(RATE_LIMITS.pro.tokensPerMinute).toBe(RATE_LIMITS.free.tokensPerMinute * 10)
  })

  it("keeps policy prefixes unique so unrelated actions never share a bucket", () => {
    const prefixes = Object.values(RATE_LIMIT_POLICIES).map((policy) => policy.prefix)
    expect(new Set(prefixes).size).toBe(prefixes.length)
  })

  it("keeps expensive AI paths fail-closed", () => {
    expect(RATE_LIMIT_POLICIES.chatFree.failureMode).toBe("deny")
    expect(RATE_LIMIT_POLICIES.feedback.failureMode).toBe("deny")
    expect(RATE_LIMIT_POLICIES.ragEmbedding.failureMode).toBe("deny")
  })

  it("validates guest event overrides", () => {
    expect(parseGuestSessionLimit(undefined)).toBe(3)
    expect(parseGuestSessionLimit("50")).toBe(50)
    expect(parseGuestSessionLimit("0")).toBe(3)
    expect(parseGuestApiLimit(undefined)).toBe(15)
    expect(parseGuestApiLimit("120")).toBe(120)
    expect(parseGuestApiLimit("5000")).toBe(15)
  })
})
