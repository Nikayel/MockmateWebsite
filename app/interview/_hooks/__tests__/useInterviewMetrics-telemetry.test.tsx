/** @vitest-environment jsdom */
import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { useInterviewMetrics } from "../useInterviewMetrics"
import { trackSessionComplete } from "@/lib/analytics"

vi.mock("@/lib/analytics", () => ({ trackSessionComplete: vi.fn() }))
const completion = {
  sessionId: "s",
  finalCode: "code",
  language: "python",
  testsPassed: 1,
  testsTotal: 1,
  efficiencyScore: 50,
}

describe("completion telemetry", () => {
  it("reports the real scenario context and elapsed time", async () => {
    const { result } = renderHook(() =>
      useInterviewMetrics({
        firebaseUser: null,
        selectedScenarioId: "cache",
        userId: "u",
        guestId: null,
        currentSessionId: "s",
        ragHints: [],
        scenarioType: "bugfix",
        difficulty: "medium",
        elapsedTimeSeconds: 180,
      })
    )
    await act(async () => result.current.trackSessionCompletion(completion))
    expect(trackSessionComplete).toHaveBeenLastCalledWith(
      expect.objectContaining({
        scenarioType: "bugfix",
        difficulty: "medium",
        durationMinutes: 3,
      })
    )
  })

  it("leaves missing context absent instead of recording invented zeroes", async () => {
    const { result } = renderHook(() =>
      useInterviewMetrics({
        firebaseUser: null,
        selectedScenarioId: "cache",
        userId: "u",
        guestId: null,
        currentSessionId: "s",
        ragHints: [],
      })
    )
    await act(async () => result.current.trackSessionCompletion(completion))
    const event = vi.mocked(trackSessionComplete).mock.lastCall![0]
    expect(event).not.toHaveProperty("durationMinutes")
    expect(event).not.toHaveProperty("scenarioType")
    expect(event).not.toHaveProperty("difficulty")
  })
})
