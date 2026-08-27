import { describe, expect, it } from "vitest"
import { join } from "node:path"
import { loadWorkbookTree } from "../../load-tree"
import { hiddenTestsHaveHumanName } from "../../rules/hidden-tests-have-human-name"

const FIXTURES = join(__dirname, "../fixtures/hidden-tests-have-human-name")
const RULE_ID = "hidden-tests-have-human-name"

describe(RULE_ID, () => {
  it("flags a hidden test with no humanName", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "red"))
    const findings = hiddenTestsHaveHumanName(workbook).filter((f) => f.ruleId === RULE_ID)
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({ severity: "error", ticketKey: "DEMO-1" })
  })

  it("passes when every hidden test carries a humanName", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "green"))
    const findings = hiddenTestsHaveHumanName(workbook).filter((f) => f.ruleId === RULE_ID)
    expect(findings).toHaveLength(0)
  })
})
