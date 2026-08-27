import { describe, expect, it } from "vitest"
import { join } from "node:path"
import { loadWorkbookTree } from "../../load-tree"
import { objectiveTagVocabulary } from "../../rules/objective-tag-vocabulary"

const FIXTURES = join(__dirname, "../fixtures/objective-tag-vocabulary")
const RULE_ID = "objective-tag-vocabulary"

describe(RULE_ID, () => {
  it("errors on an unknown objective tag and warns on an unused vocabulary entry", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "red"))
    const findings = objectiveTagVocabulary(workbook).filter((f) => f.ruleId === RULE_ID)

    const errors = findings.filter((f) => f.severity === "error")
    const warns = findings.filter((f) => f.severity === "warn")

    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatchObject({ ticketKey: "DEMO-1" })
    expect(errors[0].message).toContain("ghost-objective")

    expect(warns).toHaveLength(1)
    expect(warns[0].message).toContain("unused-objective")
  })

  it("passes when every ticket tag is in vocabulary and every vocabulary entry is used", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "green"))
    const findings = objectiveTagVocabulary(workbook).filter((f) => f.ruleId === RULE_ID)
    expect(findings).toHaveLength(0)
  })
})
