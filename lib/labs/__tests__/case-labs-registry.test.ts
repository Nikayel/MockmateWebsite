/**
 * Invariants every authored Case Lab must hold — especially THE CORE RULE:
 * the Build milestone is a codebase drop, never a DSA task.
 */

import { describe, it, expect } from "vitest"
import { listCaseLabs, getCaseLabById } from "../case-labs"

const CODEBASE_BUILD_TYPES = ["bugfix", "add-functionality", "system-design"]
const MILESTONE_ORDER = ["clarify", "decompose", "design", "build", "review"]

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
