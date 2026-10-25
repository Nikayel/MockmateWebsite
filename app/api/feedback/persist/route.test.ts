import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"
import { buildLabAssessment } from "@/lib/bugfix/guided-lab/assessment/report"
import { bookclubGuidedLab } from "@/lib/scenarios/real-world/bugfix/bookclub/milestones"

const mocks = vi.hoisted(() => ({
  verifyAuth: vi.fn(),
  get: vi.fn(),
  update: vi.fn(),
  set: vi.fn(),
}))
vi.mock("@/lib/auth-helpers", () => ({ verifyAuth: mocks.verifyAuth }))
vi.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    runTransaction: async (run: (transaction: unknown) => Promise<unknown>) =>
      run({
        get: mocks.get,
        update: (_ref: unknown, payload: unknown) => mocks.update(payload),
        set: mocks.set,
      }),
    collection: () => ({
      doc: () => ({
        get: mocks.get,
        update: mocks.update,
        collection: () => ({ doc: () => ({ set: mocks.set }) }),
      }),
    }),
  },
}))
const scenarioId = "bugfix-bookclub-reading-streak-workspace"
function body(overrides: Record<string, unknown> = {}) {
  return {
    sessionId: "attempt",
    userId: "user-1",
    scenarioId,
    scenarioType: "bugfix",
    scenarioTitle: "BookClub",
    scores: {
      understanding: 99,
      problemSolving: 99,
      codeQuality: 99,
      communication: 99,
      overall: 99,
    },
    feedback: {
      raw: "Guided practice",
      tldr: "Phase review",
      whatWorked: [],
      fixNext: [],
      actionPlan: [],
    },
    testsPassed: 36,
    testsTotal: 36,
    difficulty: "medium",
    timeSpentMinutes: 150,
    hintsUsed: 20,
    guidedLabAssessment: buildLabAssessment(bookclubGuidedLab, undefined),
    ...overrides,
  }
}
async function post(payload: Record<string, unknown>) {
  const { POST } = await import("./route")
  return POST({ json: async () => payload } as NextRequest)
}
beforeEach(() => {
  vi.clearAllMocks()
  mocks.verifyAuth.mockResolvedValue({ authenticated: true, userId: "user-1" })
  mocks.get.mockResolvedValue({
    exists: true,
    get: (key: string) => ({ user_id: "user-1", scenario_id: scenarioId })[key],
  })
  mocks.update.mockResolvedValue(undefined)
})
describe("guided practice persistence", () => {
  it("persists phase feedback while excluding interview categories and speed/hint penalties", async () => {
    const response = await post(body())
    expect(response.status).toBe(200)
    const update = mocks.update.mock.calls[0][0]
    expect(update.is_guided_lab).toBe(true)
    expect(update.mastery_score).toBe(100)
    expect(update.technical_score).toBeNull()
    expect(update.efficiency_score).toBeNull()
    expect(update.score_breakdown).toBeNull()
    expect(update.bugfix_score_breakdown).toBeNull()
    expect(update.guided_lab_assessment.kind).toBe("guided_practice")
    expect(update.guided_lab_assessment.phases).toHaveLength(6)
  })
  it("uses the owned session's scenario rather than a client-supplied different ID", async () => {
    await post(body({ scenarioId: "a-dsa-scenario", isGuidedLab: false }))
    expect(mocks.update.mock.calls[0][0].is_guided_lab).toBe(true)
  })
  it("does not let a numeric score replace missing reasoning evidence", async () => {
    await post(body({ testsPassed: 18 }))
    const update = mocks.update.mock.calls[0][0]
    expect(update.performance_score).toBe(50)
    expect(update.guided_lab_assessment.phases[1].review.communication.status).toBe("not_observed")
  })
  it("rejects invalid phase findings at the persistence boundary", async () => {
    const response = await post(
      body({ guidedLabAssessment: { kind: "guided_practice", phases: [{ score: 999 }] } })
    )
    expect(response.status).toBe(400)
    expect(mocks.update).not.toHaveBeenCalled()
  })
  it("requires authentication and session ownership before writing", async () => {
    mocks.verifyAuth.mockResolvedValueOnce({ authenticated: false })
    expect((await post(body())).status).toBe(401)
    mocks.get.mockResolvedValueOnce({ exists: true, get: () => "another-user" })
    expect((await post(body())).status).toBe(403)
    expect(mocks.update).not.toHaveBeenCalled()
  })
})
