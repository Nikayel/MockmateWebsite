/**
 * getUserScoreStats must read the field names updateUserStats actually writes.
 *
 * It asked for sumOverallScore / sumTechnicalScore / sumMasteryScore, which no
 * writer in the codebase produces, so every average it returned was 0 and
 * /api/user/metrics reported zeroed averages for every user with sessions.
 */
import { describe, it, expect, beforeEach, vi } from "vitest"

const h = vi.hoisted(() => ({ get: vi.fn() }))

vi.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: () => ({ doc: () => ({ get: h.get }) }),
  },
}))

import { getUserScoreStats } from "../score-persistence"

beforeEach(() => h.get.mockReset())

/** Mirrors the shape updateUserStats writes in lib/session-metrics.ts. */
function userStatsDoc(fields: Record<string, unknown>) {
  return { data: () => fields }
}

describe("getUserScoreStats", () => {
  it("computes averages from the totalScore fields the writer stores", async () => {
    h.get.mockResolvedValue(
      userStatsDoc({ totalSessions: 4, totalScore: 320, totalTechnicalScore: 280 })
    )

    const stats = await getUserScoreStats("u1")

    expect(stats.averageOverallScore).toBe(80)
    expect(stats.averageTechnicalScore).toBe(70)
    // Mastery and technical are the same number by design.
    expect(stats.averageMasteryScore).toBe(70)
  })

  it("no longer returns zeroed averages for a user with real sessions", async () => {
    h.get.mockResolvedValue(
      userStatsDoc({ totalSessions: 3, totalScore: 210, totalTechnicalScore: 180 })
    )

    const stats = await getUserScoreStats("u1")

    expect(stats.averageOverallScore).toBeGreaterThan(0)
    expect(stats.averageTechnicalScore).toBeGreaterThan(0)
    expect(stats.averageMasteryScore).toBeGreaterThan(0)
  })

  it("still prefers the legacy sum* fields when a document carries them", async () => {
    h.get.mockResolvedValue(
      userStatsDoc({
        totalSessions: 2,
        sumOverallScore: 180,
        sumTechnicalScore: 160,
        sumMasteryScore: 140,
        totalScore: 999,
        totalTechnicalScore: 999,
      })
    )

    const stats = await getUserScoreStats("u1")

    expect(stats.averageOverallScore).toBe(90)
    expect(stats.averageTechnicalScore).toBe(80)
    expect(stats.averageMasteryScore).toBe(70)
  })

  it("falls back to the overall total when no technical total exists", async () => {
    h.get.mockResolvedValue(userStatsDoc({ totalSessions: 2, totalScore: 150 }))

    const stats = await getUserScoreStats("u1")

    expect(stats.averageOverallScore).toBe(75)
    expect(stats.averageTechnicalScore).toBe(75)
    expect(stats.averageMasteryScore).toBe(75)
  })

  it("returns zeros for a user with no sessions rather than dividing by zero", async () => {
    h.get.mockResolvedValue(userStatsDoc({ totalSessions: 0 }))

    const stats = await getUserScoreStats("u1")

    expect(stats.averageOverallScore).toBe(0)
    expect(stats.averageTechnicalScore).toBe(0)
    expect(stats.averageMasteryScore).toBe(0)
  })

  it("handles a missing document", async () => {
    h.get.mockResolvedValue({ data: () => undefined })

    const stats = await getUserScoreStats("u1")

    expect(stats.totalSessions).toBe(0)
    expect(stats.averageOverallScore).toBe(0)
  })
})
