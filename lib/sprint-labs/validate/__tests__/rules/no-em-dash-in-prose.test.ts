import { describe, expect, it } from "vitest"
import { join } from "node:path"
import { loadWorkbookTree } from "../../load-tree"
import { noEmDashInProse } from "../../rules/no-em-dash-in-prose"

const FIXTURES = join(__dirname, "../fixtures/no-em-dash-in-prose")
const RULE_ID = "no-em-dash-in-prose"

describe(RULE_ID, () => {
  it("flags an em dash in the objective canDo, sprint goal, standupQuote, ticket title, body, criteria, and hidden-test humanName", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "red"))
    const findings = noEmDashInProse(workbook).filter((f) => f.ruleId === RULE_ID)
    expect(findings).toHaveLength(7)
    expect(findings.every((f) => f.severity === "error")).toBe(true)
    expect(findings.some((f) => f.message.includes("goal"))).toBe(true)
    expect(findings.some((f) => f.message.includes("title"))).toBe(true)
  })

  it("passes when no learner-facing prose field contains an em dash", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "green"))
    const findings = noEmDashInProse(workbook).filter((f) => f.ruleId === RULE_ID)
    expect(findings).toHaveLength(0)
  })
})
