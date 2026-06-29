import { beforeEach, describe, expect, it } from "vitest"
import { bugfixBookclubReadingStreakWorkspaceScenario as scenario } from "@/lib/scenarios/real-world/bugfix/bugfix-bookclub-reading-streak-workspace"
import { isGuidedLabComplete, revealedTestSuites } from "@/lib/bugfix/guided-lab/gating"
import { getGuidedChatState, useGuidedLabStore } from "./guided-lab-store"

// End-to-end wiring check: drives the REAL BookClub guided-lab config through the
// REAL store + reveal + chat-state + gating, exactly as the UI does. This is the
// automated stand-in for a manual click-through (the live UI also needs an
// auth'd Run Tests call, which this bypasses by feeding suite results directly).

const config = scenario.guidedLab
const SID = scenario.id

const STREAK_FIXED = [
  { suite: "visible streak", passed: true },
  { suite: "hidden streak", passed: true },
  { suite: "visible history order", passed: false },
  { suite: "hidden history", passed: false },
]
const ALL_FIXED = [
  { suite: "visible streak", passed: true },
  { suite: "hidden streak", passed: true },
  { suite: "visible history order", passed: true },
  { suite: "hidden history", passed: true },
]

describe("BookClub guided lab — store wiring end to end", () => {
  beforeEach(() => useGuidedLabStore.getState().clear())

  it("ships a guided lab config", () => {
    expect(config).toBeTruthy()
    expect(config?.milestones.map((m) => m.id)).toEqual([
      "m1-read",
      "m2-reproduce",
      "m3-streak",
      "m4-history",
    ])
  })

  it("starts on M1 with nothing revealed and no AI restraint", () => {
    if (!config) throw new Error("guidedLab missing")
    useGuidedLabStore.getState().initGuidedLab(SID, config)
    const p = useGuidedLabStore.getState().progress!
    expect(p.milestoneStatus["m1-read"]).toBe("active")
    expect(p.milestoneStatus["m4-history"]).toBe("locked")
    expect(revealedTestSuites(config, p)).toEqual([])
    expect(getGuidedChatState(SID)?.milestoneId).toBe("m1-read")
    expect(getGuidedChatState(SID)?.aiRestraint).toBe(false)
  })

  it("keeps Bug 2 + its test suite hidden until Bug 1 passes, then reveals them", () => {
    if (!config) throw new Error("guidedLab missing")
    const store = useGuidedLabStore.getState()
    store.initGuidedLab(SID, config)
    store.ackMilestone("m1-read")
    store.ackMilestone("m2-reproduce")

    let p = useGuidedLabStore.getState().progress!
    expect(p.milestoneStatus["m3-streak"]).toBe("active")
    expect(p.milestoneStatus["m4-history"]).toBe("locked")
    // On the streak step the AI must withhold (find-it-yourself) and the history
    // suite must NOT be visible yet.
    expect(getGuidedChatState(SID)?.activeBugId).toBe("bug-1-streak")
    expect(getGuidedChatState(SID)?.aiRestraint).toBe(true)
    expect(revealedTestSuites(config, p)).not.toContain("visible history order")

    // Fix Bug 1: streak suites green, history still red → M4 unlocks, Bug 2 revealed.
    useGuidedLabStore.getState().applyTestResults(STREAK_FIXED)
    p = useGuidedLabStore.getState().progress!
    expect(p.milestoneStatus["m3-streak"]).toBe("done")
    expect(p.milestoneStatus["m4-history"]).toBe("active")
    expect(getGuidedChatState(SID)?.activeBugId).toBe("bug-2-history")
    expect(revealedTestSuites(config, p)).toContain("visible history order")
    expect(isGuidedLabComplete(config, p)).toBe(false)

    // Fix Bug 2: everything green → lab complete (Submit unlocks).
    useGuidedLabStore.getState().applyTestResults(ALL_FIXED)
    p = useGuidedLabStore.getState().progress!
    expect(p.milestoneStatus["m4-history"]).toBe("done")
    expect(isGuidedLabComplete(config, p)).toBe(true)
  })

  it("ignores test runs from a different scenario id", () => {
    if (!config) throw new Error("guidedLab missing")
    useGuidedLabStore.getState().initGuidedLab(SID, config)
    // A guided lab for another scenario must not read this one's state.
    expect(getGuidedChatState("some-other-scenario")).toBeUndefined()
  })
})
