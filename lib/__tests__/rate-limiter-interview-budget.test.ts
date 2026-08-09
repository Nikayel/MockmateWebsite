import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * The free tier's tokensPerMinute used to be 5,000, and one measured mid-interview turn is
 * about 4,600: the interviewer system prompt alone is ~10.5k characters, and every turn
 * re-sends the whole transcript, the candidate's code and their workspace files.
 *
 * So the first message was allowed, its measured usage went into the window, and the second
 * was refused with "Token limit exceeded. 5,000 tokens/minute for free tier." The interview
 * went dead mid-conversation. A candidate saw that string appear in the transcript as though
 * the interviewer had said it.
 *
 * These tests hold the budget above a realistic conversation. They are about the shape of
 * the limit, not its exact value: raising the constant is fine, lowering it back under a
 * normal interview is what must fail.
 */

async function importRateLimiter() {
  vi.resetModules()
  vi.stubEnv("NODE_ENV", "test")

  vi.doMock("../firebase-admin", () => ({ adminDb: {} }))
  vi.doMock("../usage-tracking", () => ({ getUserUsageSummary: vi.fn().mockResolvedValue(null) }))
  vi.doMock("../logger", () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  }))

  return import("../rate-limiter")
}

/**
 * Measured against the real prompt builders for a conservative mid-interview turn: 12
 * history messages, a 44-line solution, 2 workspace files, 6 test results, 8 console lines.
 * Later turns are larger, because the transcript only grows.
 */
const MEASURED_INTERVIEW_TURN_TOKENS = 4600

describe("free tier can hold an interview", () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  it("budgets more than one turn per minute", async () => {
    const { RATE_LIMITS } = await importRateLimiter()

    // The bug in one line: one turn used to be 92% of the whole minute.
    expect(RATE_LIMITS.free.tokensPerMinute).toBeGreaterThan(MEASURED_INTERVIEW_TURN_TOKENS * 2)
  })

  it("lets the request cap bind before the token cap on every tier", async () => {
    const { RATE_LIMITS } = await importRateLimiter()

    // tokensPerMinute is a burst guard. Spend is bounded by budgetPerCycle and the global
    // daily ceiling; call rate is bounded by requestsPerMinute. If a tier's token budget
    // cannot cover its own permitted request count, the token cap silently becomes the real
    // limit and starts refusing ordinary conversations.
    for (const [tier, limits] of Object.entries(RATE_LIMITS)) {
      expect(
        limits.tokensPerMinute,
        `${tier} allows ${limits.requestsPerMinute} requests/minute but only budgets ` +
          `${limits.tokensPerMinute} tokens, which is under ${limits.requestsPerMinute} x ` +
          `${MEASURED_INTERVIEW_TURN_TOKENS} measured tokens for a single interview turn. ` +
          `The interviewer will stop replying mid-conversation.`
      ).toBeGreaterThanOrEqual(limits.requestsPerMinute * MEASURED_INTERVIEW_TURN_TOKENS)
    }
  })

  it("does not refuse a second consecutive interview turn", async () => {
    const { checkRateLimit, recordRequestStart, updateTokenCount } = await importRateLimiter()
    const userId = `budget-test-${Date.now()}`

    // Turn one: allowed, and its real usage lands in the window.
    const first = await checkRateLimit(userId, "free", 1000)
    expect(first.allowed).toBe(true)
    recordRequestStart(userId, 1000)
    updateTokenCount(userId, MEASURED_INTERVIEW_TURN_TOKENS)

    // Turn two is where the interview used to die.
    const second = await checkRateLimit(userId, "free", 1000)
    expect(second.allowed, second.message).toBe(true)
    expect(second.code).toBeUndefined()
  })
})

describe("a single metered request holds one concurrency slot", () => {
  it("leaves a free user room to run their tests while the interviewer replies", async () => {
    const { checkRateLimit, recordRequestStart, RATE_LIMITS } = await importRateLimiter()
    const userId = `concurrency-test-${Date.now()}`

    // A metered route opens exactly one slot. generateAIResponse used to open a second for
    // the same request even when the route had already metered it, so one chat request sat
    // at the free tier's limit of 2 for its whole duration, and pressing Run while the
    // interviewer was thinking was refused by construction.
    recordRequestStart(userId, 1000)

    const whileInterviewerIsThinking = await checkRateLimit(userId, "free", 1000)
    expect(
      whileInterviewerIsThinking.allowed,
      `one in-flight request already consumed all ${RATE_LIMITS.free.maxConcurrentRequests} ` +
        `concurrency slots`
    ).toBe(true)
    expect(whileInterviewerIsThinking.code).not.toBe("CONCURRENT_LIMIT_EXCEEDED")
  })
})
