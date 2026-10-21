import { beforeEach, describe, expect, it } from "vitest"
import { bugfixBookclubReadingStreakWorkspaceScenario as scenario } from "@/lib/scenarios/real-world/bugfix/bugfix-bookclub-reading-streak-workspace"
import { isGuidedLabComplete, revealedTestSuites } from "@/lib/bugfix/guided-lab/gating"
import { getGuidedChatState, useGuidedLabStore } from "./guided-lab-store"

const config = scenario.guidedLab!
const suites = config.milestones.at(-1)!.gate
if (suites.kind !== "tests-pass") throw new Error("Missing release gate")
const ALL_FIXED = suites.testSuites.map((suite) => ({ suite, passed: true }))
const store = () => useGuidedLabStore.getState()
const progress = () => store().progress!
function investigate() {
  store().initGuidedLab(scenario.id, config)
  store().ackCheckpoint("investigation#0")
  store().ackCheckpoint("investigation#1")
  store().ackMilestone("m1-investigate")
}
function complete() {
  investigate()
  for (let n = 0; n < 5; n++) store().applyTestResults(ALL_FIXED)
}

describe("BookClub guided lab store", () => {
  beforeEach(() => store().clear())
  it("requires investigation checkpoints before moving on", () => {
    store().initGuidedLab(scenario.id, config)
    store().ackMilestone("m1-investigate")
    expect(progress().currentMilestoneId).toBe("m1-investigate")
    expect(revealedTestSuites(config, progress())).toEqual(["visible baseline"])
    expect(getGuidedChatState(scenario.id)?.aiRestraint).toBe(false)
  })
  it("advances one phase per run and needs a separate final release run", () => {
    investigate()
    expect(getGuidedChatState(scenario.id)?.aiRestraint).toBe(true)
    for (const next of ["m3-history", "m4-calendar", "m5-cache", "m6-release"]) {
      store().applyTestResults(ALL_FIXED)
      expect(progress().currentMilestoneId).toBe(next)
      expect(isGuidedLabComplete(config, progress())).toBe(false)
    }
    store().applyTestResults(ALL_FIXED)
    expect(isGuidedLabComplete(config, progress())).toBe(true)
  })
  it("does not complete later phases just because their suites happen to pass", () => {
    investigate()
    store().applyTestResults(ALL_FIXED.filter((r) => !r.suite.includes("streak")))
    expect(progress().milestoneStatus["m5-cache"]).toBe("locked")
    expect(revealedTestSuites(config, progress())).not.toContain("visible cache")
  })
  it("reopens the earliest regressed repair and locks following phases", () => {
    complete()
    store().applyTestResults(ALL_FIXED.map((r) => ({ ...r, passed: r.suite !== "hidden history" })))
    expect(progress().milestoneStatus["m2-streak"]).toBe("done")
    expect(progress().milestoneStatus["m3-history"]).toBe("active")
    expect(progress().milestoneStatus["m6-release"]).toBe("locked")
  })
  it("requires fresh final verification after edits and resume", () => {
    complete()
    const saved = progress()
    store().invalidateVerification("other-scenario")
    expect(isGuidedLabComplete(config, progress())).toBe(true)
    store().invalidateVerification(scenario.id)
    expect(progress().milestoneStatus["m6-release"]).toBe("active")
    store().initGuidedLab(scenario.id, config, saved)
    expect(progress().milestoneStatus["m6-release"]).toBe("active")
  })
  it("resets incompatible old progress and malformed local state", () => {
    investigate()
    store().initGuidedLab(scenario.id, config, { ...progress(), version: "bookclub-guided-v1" })
    expect(progress().currentMilestoneId).toBe("m1-investigate")
    expect(getGuidedChatState("other-scenario")).toBeUndefined()
  })
})

it("ignores a green run if source changed while it was executing", () => {
  useGuidedLabStore.getState().clear()
  complete()
  store().invalidateVerification(scenario.id)
  const revision = store().sourceRevision
  store().invalidateVerification(scenario.id)
  store().applyTestResults(ALL_FIXED, revision)
  expect(isGuidedLabComplete(config, progress())).toBe(false)
  store().applyTestResults(ALL_FIXED, store().sourceRevision)
  expect(isGuidedLabComplete(config, progress())).toBe(true)
})
