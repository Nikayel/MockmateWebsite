import { beforeEach, describe, expect, it, vi } from "vitest"
import { aggregateMetricSessions } from "@/lib/user-metrics/aggregate"
import { normalizeMetricSession } from "@/lib/user-metrics/normalize"
const h = vi.hoisted(() => ({ load: vi.fn() }))
vi.mock("@/lib/user-metrics/repository", () => ({ loadUserMetrics: h.load }))
import { getUserScoreStats } from "../score-persistence"

beforeEach(() => vi.clearAllMocks())
describe("getUserScoreStats canonical snapshot", () => {
  it("uses the same final scores and exact sums as the dashboard", async () => {
    const sessions = [81, 82, 83].map(
      (performance_score, index) =>
        normalizeMetricSession(String(index), {
          completed_at: "2026-09-01T00:00:00Z",
          feedback_status: "complete",
          performance_score,
          technical_score: index === 0 ? 0 : undefined,
        })!
    )
    h.load.mockResolvedValue(aggregateMetricSessions(sessions))
    const result = await getUserScoreStats("u1")
    expect(h.load).toHaveBeenCalledWith("u1")
    expect(result).toMatchObject({
      totalSessions: 3,
      sumOverallScore: 246,
      averageOverallScore: 82,
      averageTechnicalScore: 0,
    })
  })
  it("preserves unobserved averages for users without completed interviews", async () => {
    h.load.mockResolvedValue(aggregateMetricSessions([]))
    expect(await getUserScoreStats("empty")).toMatchObject({
      totalSessions: 0,
      averageOverallScore: null,
      averageTechnicalScore: null,
    })
  })
})
