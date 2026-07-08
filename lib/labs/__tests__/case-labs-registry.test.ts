/**
 * Invariants every authored Case Lab must hold — especially THE CORE RULE:
 * the Build milestone is a codebase drop, never a DSA task.
 */

import { describe, it, expect } from "vitest"
import { listCaseLabs, getCaseLabById } from "../case-labs"
import type { MilestoneGuidance } from "../types"

const CODEBASE_BUILD_TYPES = ["bugfix", "add-functionality", "system-design"]
const MILESTONE_ORDER = ["clarify", "decompose", "design", "build", "review"]

const GUIDANCE_LIST_MIN = 3
const GUIDANCE_LIST_MAX = 5

/** Every learner-facing string in a guidance block, for bulk assertions. */
function guidanceStrings(g: MilestoneGuidance): string[] {
  return [
    g.interviewerPrompt,
    g.whatItTests,
    g.commonTrap,
    ...g.howToApproach,
    ...g.whatGoodLooksLike,
  ]
}

describe("case lab registry", () => {
  it("resolves a lab by id", () => {
    expect(getCaseLabById("palantir-911-dispatch")?.title).toBe("911 Dispatch Optimization")
    expect(getCaseLabById("nope")).toBeUndefined()
  })

  it.each(listCaseLabs())("$id is well-formed", (lab) => {
    expect(lab.id).toBeTruthy()
    expect(lab.buildScenarioId).toBeTruthy()
    // THE CORE RULE: the build is a multi-file codebase scenario, never DSA.
    expect(CODEBASE_BUILD_TYPES).toContain(lab.buildScenarioType)
    // All five milestones, in canonical order.
    expect(lab.milestones.map((m) => m.kind)).toEqual(MILESTONE_ORDER)
    for (const milestone of lab.milestones) {
      expect(milestone.title).toBeTruthy()
      expect(milestone.purpose).toBeTruthy()
    }
  })
})

describe("case lab round guidance", () => {
  // The interviewer prompt + how-to shown on every station. Locks the fix for
  // "each round barely has any instruction" so labs can't regress to a bare label:
  // every round of every lab must ship authored guidance.
  it.each(listCaseLabs())("$id gives every round authored guidance", (lab) => {
    for (const milestone of lab.milestones) {
      expect(milestone.guidance, `${lab.id}/${milestone.kind} guidance`).toBeTruthy()
    }
  })

  it.each(listCaseLabs())("$id guidance is well-formed", (lab) => {
    for (const milestone of lab.milestones) {
      const g = milestone.guidance
      if (!g) continue
      const where = `${lab.id}/${milestone.kind}`

      // The interviewer's prompt for the round: substantial, not a stub.
      expect(g.interviewerPrompt.trim().length, `${where} interviewerPrompt`).toBeGreaterThan(20)
      expect(g.whatItTests.trim(), `${where} whatItTests`).toBeTruthy()
      expect(g.commonTrap.trim(), `${where} commonTrap`).toBeTruthy()

      // Bounded, non-empty lists so the how-to reads as steps, not an essay.
      for (const [name, list] of [
        ["howToApproach", g.howToApproach],
        ["whatGoodLooksLike", g.whatGoodLooksLike],
      ] as const) {
        expect(list.length, `${where} ${name} count`).toBeGreaterThanOrEqual(GUIDANCE_LIST_MIN)
        expect(list.length, `${where} ${name} count`).toBeLessThanOrEqual(GUIDANCE_LIST_MAX)
        for (const item of list) expect(item.trim(), `${where} ${name} item`).toBeTruthy()
      }

      // Project style: no em dashes in learner-facing prose.
      for (const s of guidanceStrings(g)) {
        expect(s, `${where} em dash`).not.toContain("—")
      }
    }
  })
})
