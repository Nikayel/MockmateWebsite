import { describe, expect, it } from "vitest"
import { join } from "node:path"
import { loadWorkbookTree } from "../../load-tree"
import { ticketHasObjective } from "../../rules/ticket-has-objective"

const FIXTURES = join(__dirname, "../fixtures/ticket-has-objective")
const RULE_ID = "ticket-has-objective"

describe(RULE_ID, () => {
  it("flags a ticket with zero objectives", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "red"))
    const findings = ticketHasObjective(workbook).filter((f) => f.ruleId === RULE_ID)
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({ severity: "error", ticketKey: "DEMO-1" })
  })

  it("passes when every ticket maps to at least one objective", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "green"))
    const findings = ticketHasObjective(workbook).filter((f) => f.ruleId === RULE_ID)
    expect(findings).toHaveLength(0)
  })
})
