import { describe, expect, it } from "vitest"
import { join } from "node:path"
import { loadWorkbookTree } from "../../load-tree"
import { payoffRequiresSignoff } from "../../rules/payoff-requires-signoff"

const FIXTURES = join(__dirname, "../fixtures/payoff-requires-signoff")
const RULE_ID = "payoff-requires-signoff"

describe(RULE_ID, () => {
  it("flags a payoffFor ticket with no payoffSignoff", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "red"))
    const findings = payoffRequiresSignoff(workbook).filter((f) => f.ruleId === RULE_ID)
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({ severity: "error", ticketKey: "MER-302" })
  })

  it("passes when a payoffFor ticket carries payoffSignoff: true", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "green"))
    const findings = payoffRequiresSignoff(workbook).filter((f) => f.ruleId === RULE_ID)
    expect(findings).toHaveLength(0)
  })
})
