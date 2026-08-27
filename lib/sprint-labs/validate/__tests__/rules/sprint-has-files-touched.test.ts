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
})
