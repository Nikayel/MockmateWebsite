/**
 * Tests for referral reward eligibility.
 *
 * Regression guard for GTM-METRICS-7: checkRewardEligibility used to query a
 * never-written sessions/userId/status collection, so a signup reward could never
 * become eligible. It must now count completed rounds in the real interview_sessions
 * collection keyed by user_id.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"

interface SessionsQuery {
  where: ReturnType<typeof vi.fn>
  limit: ReturnType<typeof vi.fn>
  get: ReturnType<typeof vi.fn>
}

const { mockRewardGet, sessionsQuery } = vi.hoisted(() => {
  const query = {
    where: vi.fn(() => query),
    limit: vi.fn(() => query),
    get: vi.fn(),
  }
  return { mockRewardGet: vi.fn(), sessionsQuery: query as SessionsQuery }
})

vi.mock("../firebase-admin", () => ({
  adminDb: {
    collection: vi.fn((name: string) =>
      name === "interview_sessions"
        ? sessionsQuery
        : { doc: vi.fn(() => ({ get: mockRewardGet })) }
    ),
  },
}))

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    increment: vi.fn((n: number) => ({ __increment: n })),
    serverTimestamp: vi.fn(() => "__ts"),
  },
}))

vi.mock("../logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

vi.mock("nanoid", () => ({
  customAlphabet: () => () => "TESTCODE1",
}))

// A signup_credit reward that has passed its eligibleAt and is not expired, so the
// only remaining gate is whether the referred user completed a session.
function signupRewardDoc() {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  return {
    exists: true,
    data: () => ({
      type: "signup_credit",
      referredUserId: "referred-user-1",
      eligibleAt: { toDate: () => yesterday },
      expiresAt: { toDate: () => nextMonth },
    }),
  }
}

describe("checkRewardEligibility", () => {
  beforeEach(() => {
    mockRewardGet.mockReset()
    sessionsQuery.where.mockClear()
    sessionsQuery.limit.mockClear()
    sessionsQuery.get.mockReset()
  })

  it("becomes eligible after one completed interview session", async () => {
    mockRewardGet.mockResolvedValue(signupRewardDoc())
    sessionsQuery.get.mockResolvedValue({
      docs: [{ data: () => ({ completed_at: "2026-07-10T00:00:00.000Z" }) }],
    })

    const { checkRewardEligibility } = await import("../referrals")
    const result = await checkRewardEligibility("reward-1")

    expect(result.eligible).toBe(true)
    // Must query the real collection by the real field name.
    expect(sessionsQuery.where).toHaveBeenCalledWith("user_id", "==", "referred-user-1")
  })

  it("stays ineligible while the referred user has no completed session", async () => {
    mockRewardGet.mockResolvedValue(signupRewardDoc())
    // Session exists but was only started (no completed_at) — must not count.
    sessionsQuery.get.mockResolvedValue({
      docs: [{ data: () => ({ started_at: "2026-07-10T00:00:00.000Z" }) }],
    })

    const { checkRewardEligibility } = await import("../referrals")
    const result = await checkRewardEligibility("reward-1")

    expect(result.eligible).toBe(false)
    expect(result.reason).toMatch(/more session/i)
  })
})
