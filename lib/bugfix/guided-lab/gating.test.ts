import { describe, expect, it } from "vitest"
import type { GuidedLabConfig } from "./types"
import {
  acknowledgeMilestone,
  applyTestRunToProgress,
  initialGuidedLabProgress,
  isGuidedLabComplete,
  passedSuiteSet,
  revealedTestSuites,
} from "./gating"

const NOW = "2026-06-28T00:00:00.000Z"

const config: GuidedLabConfig = {
  version: "bookclub-guided-v1",
  milestones: [
    { id: "m1", title: "Read", purpose: "", blocks: [], gate: { kind: "manual-ack" } },
    {
      id: "m2",
      title: "Reproduce",
      purpose: "",
      blocks: [],
      gate: { kind: "manual-ack" },
      revealTestSuites: ["visible streak"],
    },
    {
      id: "m3",
      title: "Streak",
      purpose: "",
      bugId: "bug-1-streak",
      blocks: [],
      gate: { kind: "tests-pass", testSuites: ["visible streak", "hidden streak"] },
      revealTestSuites: ["visible streak"],
    },
    {
      id: "m4",
      title: "History",
      purpose: "",
      bugId: "bug-2-history",
      dependsOn: ["m3"],
      blocks: [],
      gate: { kind: "tests-pass", testSuites: ["visible history order", "hidden history"] },
      revealTestSuites: ["visible history order"],
    },
  ],
}

describe("passedSuiteSet", () => {
  it("marks a suite passed only when every test in it passes", () => {
    const passed = passedSuiteSet([
      { suite: "visible streak", passed: true },
      { suite: "visible streak", passed: false },
      { suite: "hidden streak", passed: true },
    ])
    expect(passed.has("visible streak")).toBe(false)
    expect(passed.has("hidden streak")).toBe(true)
  })
})

describe("guided lab gating", () => {
  it("starts with only the first milestone active", () => {
    const p = initialGuidedLabProgress(config, NOW)
    expect(p.milestoneStatus).toEqual({ m1: "active", m2: "locked", m3: "locked", m4: "locked" })
    expect(p.currentMilestoneId).toBe("m1")
  })

  it("advances through manual-ack milestones", () => {
    let p = initialGuidedLabProgress(config, NOW)
    p = acknowledgeMilestone(config, p, "m1", NOW)
    expect(p.milestoneStatus.m1).toBe("done")
    expect(p.milestoneStatus.m2).toBe("active")
    p = acknowledgeMilestone(config, p, "m2", NOW)
    expect(p.milestoneStatus.m2).toBe("done")
    expect(p.milestoneStatus.m3).toBe("active")
    expect(p.activeBugId).toBe("bug-1-streak")
  })

  it("does not let an ack skip a locked milestone", () => {
    let p = initialGuidedLabProgress(config, NOW)
    p = acknowledgeMilestone(config, p, "m3", NOW) // m3 is locked
    expect(p.milestoneStatus.m3).toBe("locked")
  })

  it("keeps Bug 2 locked until Bug 1's suites pass, then unlocks it", () => {
    let p = initialGuidedLabProgress(config, NOW)
    p = acknowledgeMilestone(config, p, "m1", NOW)
    p = acknowledgeMilestone(config, p, "m2", NOW)

    // Bug 1 fixed: streak suites green, history suites still red.
    p = applyTestRunToProgress(
      config,
      p,
      [
        { suite: "visible streak", passed: true },
        { suite: "hidden streak", passed: true },
        { suite: "visible history order", passed: false },
        { suite: "hidden history", passed: false },
      ],
      NOW
    )
    expect(p.milestoneStatus.m3).toBe("done")
    expect(p.milestoneStatus.m4).toBe("active")
    expect(p.activeBugId).toBe("bug-2-history")
    expect(isGuidedLabComplete(config, p)).toBe(false)

    // Bug 2 fixed: everything green.
    p = applyTestRunToProgress(
      config,
      p,
      [
        { suite: "visible streak", passed: true },
        { suite: "hidden streak", passed: true },
        { suite: "visible history order", passed: true },
        { suite: "hidden history", passed: true },
      ],
      NOW
    )
    expect(p.milestoneStatus.m4).toBe("done")
    expect(isGuidedLabComplete(config, p)).toBe(true)
  })

  it("does not complete Bug 1 if only some streak suites pass", () => {
    let p = initialGuidedLabProgress(config, NOW)
    p = acknowledgeMilestone(config, p, "m1", NOW)
    p = acknowledgeMilestone(config, p, "m2", NOW)
    p = applyTestRunToProgress(
      config,
      p,
      [
        { suite: "visible streak", passed: true },
        { suite: "hidden streak", passed: false },
      ],
      NOW
    )
    expect(p.milestoneStatus.m3).toBe("active")
    expect(p.milestoneStatus.m4).toBe("locked")
  })

  it("reveals a milestone's suites only once it is active or done", () => {
    let p = initialGuidedLabProgress(config, NOW)
    expect(revealedTestSuites(config, p)).toEqual([]) // m1 active, no suites
    p = acknowledgeMilestone(config, p, "m1", NOW) // m2 active → reveals visible streak
    expect(revealedTestSuites(config, p)).toEqual(["visible streak"])
    p = acknowledgeMilestone(config, p, "m2", NOW)
    p = applyTestRunToProgress(
      config,
      p,
      [
        { suite: "visible streak", passed: true },
        { suite: "hidden streak", passed: true },
      ],
      NOW
    )
    // m4 active now → history suite revealed too
    expect(revealedTestSuites(config, p).sort()).toEqual([
      "visible history order",
      "visible streak",
    ])
  })
})
