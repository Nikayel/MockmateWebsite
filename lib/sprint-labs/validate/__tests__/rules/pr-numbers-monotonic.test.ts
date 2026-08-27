import { describe, expect, it } from "vitest"
import { join } from "node:path"
import { loadWorkbookTree } from "../../load-tree"
import { prNumbersMonotonic } from "../../rules/pr-numbers-monotonic"

const FIXTURES = join(__dirname, "../fixtures/pr-numbers-monotonic")
const RULE_ID = "pr-numbers-monotonic"

describe(RULE_ID, () => {
  it("flags a later sprint's review-only PR number regressing below an earlier sprint's", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "red"))
    const findings = prNumbersMonotonic(workbook).filter((f) => f.ruleId === RULE_ID)
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({ severity: "error", ticketKey: "MER-203" })
  })

  it("passes when review-only PR numbers increase sprint over sprint", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "green"))
    const findings = prNumbersMonotonic(workbook).filter((f) => f.ruleId === RULE_ID)
    expect(findings).toHaveLength(0)
  })
})
