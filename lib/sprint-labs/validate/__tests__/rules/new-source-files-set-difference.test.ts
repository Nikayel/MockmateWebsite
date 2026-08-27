import { describe, expect, it } from "vitest"
import { join } from "node:path"
import { loadWorkbookTree } from "../../load-tree"
import { newSourceFilesSetDifference } from "../../rules/new-source-files-set-difference"

const FIXTURES = join(__dirname, "../fixtures/new-source-files-set-difference")
const RULE_ID = "new-source-files-set-difference"

describe(RULE_ID, () => {
  it("flags an over-counted newSourceFiles entry, an under-counted one, and an invalid rewrittenFiles entry", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "red"))
    const findings = newSourceFilesSetDifference(workbook).filter((f) => f.ruleId === RULE_ID)

    expect(findings).toHaveLength(3)
    expect(findings.some((f) => f.message.includes("already exists in the seed"))).toBe(true)
    expect(findings.some((f) => f.message.includes("missing from newSourceFiles"))).toBe(true)
    expect(
      findings.some(
        (f) => f.message.includes("rewrittenFiles") && f.message.includes("does not exist")
      )
    ).toBe(true)
  })

  it("passes when newSourceFiles is exactly the set difference and rewrittenFiles is a seed/prior subset", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "green"))
    const findings = newSourceFilesSetDifference(workbook).filter((f) => f.ruleId === RULE_ID)
    expect(findings).toHaveLength(0)
  })
})
