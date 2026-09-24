import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const firestore = vi.hoisted(() => ({
  collection: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  get: vi.fn(),
}))

vi.mock("@/lib/firebase-admin", () => {
  const query = {
    where: (...args: unknown[]) => {
      firestore.where(...args)
      return query
    },
    orderBy: (...args: unknown[]) => {
      firestore.orderBy(...args)
      return query
    },
    get: () => firestore.get(),
  }
  return {
    adminDb: {
      collection: (name: string) => {
        firestore.collection(name)
        return query
      },
    },
  }
})

import { getPerformanceTrends } from "../session-metrics"

function session(completedAt: string, score: number | null, status = "complete") {
  return {
    data: () => ({ completed_at: completedAt, performance_score: score, feedback_status: status }),
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-09-24T12:00:00.000Z"))
  vi.clearAllMocks()
})

afterEach(() => vi.useRealTimers())

describe("getPerformanceTrends", () => {
  it("uses final completed-session scores for This Week", async () => {
    firestore.get.mockResolvedValue({
      docs: [
        session("2026-09-24T10:00:00.000Z", 83),
        session("2026-09-24T09:00:00.000Z", 39, "processing"),
        session("2026-09-23T10:00:00.000Z", 70),
        session("2026-09-22T10:00:00.000Z", null),
        session("2026-09-02T10:00:00.000Z", 20),
      ],
    })

    const result = await getPerformanceTrends("user-1", 30)

    expect(firestore.collection).toHaveBeenCalledWith("interview_sessions")
    expect(firestore.where).toHaveBeenCalledWith("user_id", "==", "user-1")
    expect(firestore.where).toHaveBeenCalledWith("completed_at", ">=", "2026-08-25T12:00:00.000Z")
    expect(firestore.orderBy).toHaveBeenCalledWith("completed_at", "desc")
    expect(result.weeklyAverage).toBe(77)
    expect(result.daily).toEqual([
      { date: "2026-09-02", score: 20, sessions: 1 },
      { date: "2026-09-23", score: 70, sessions: 1 },
      { date: "2026-09-24", score: 83, sessions: 1 },
    ])
  })

  it("averages sessions across the full seven-day window, including zero scores", async () => {
    firestore.get.mockResolvedValue({
      docs: [
        session("2026-09-24T10:00:00.000Z", 0),
        session("2026-09-22T10:00:00.000Z", 100),
        session("2026-09-22T09:00:00.000Z", 100),
      ],
    })

    const result = await getPerformanceTrends("user-1", 1)

    expect(firestore.where).toHaveBeenCalledWith("completed_at", ">=", "2026-09-17T12:00:00.000Z")
    expect(result.weeklyAverage).toBe(67)
    expect(result.daily).toEqual([{ date: "2026-09-24", score: 0, sessions: 1 }])
  })
})
