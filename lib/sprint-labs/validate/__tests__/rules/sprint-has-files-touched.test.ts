import { describe, expect, it } from "vitest"
import { join } from "node:path"
import { loadWorkbookTree } from "../../load-tree"
import { sprintHasFilesTouched } from "../../rules/sprint-has-files-touched"

const FIXTURES = join(__dirname, "../fixtures/sprint-has-files-touched")
const RULE_ID = "sprint-has-files-touched"

describe(RULE_ID, () => {
  it("flags a sprint with tickets but no filesTouched at all", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "red"))
    const findings = sprintHasFilesTouched(workbook).filter((f) => f.ruleId === RULE_ID)
    expect(findings).toHaveLength(1)
    expect(findings[0].severity).toBe("error")
    expect(findings[0].message).toContain("1 ticket(s)")
  })

  it("passes when a sprint with tickets declares filesTouched", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "green"))
    const findings = sprintHasFilesTouched(workbook).filter((f) => f.ruleId === RULE_ID)
    expect(findings).toHaveLength(0)
  })

  it("regression (review round 2, item 3): passes a sprint with zero tickets and no filesTouched -- there's nothing to have forgotten yet", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "zero-tickets-green"))
    const findings = sprintHasFilesTouched(workbook).filter((f) => f.ruleId === RULE_ID)
    expect(findings).toHaveLength(0)
  })
})
