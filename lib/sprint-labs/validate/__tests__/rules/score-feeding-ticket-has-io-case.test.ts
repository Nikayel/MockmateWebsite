import { describe, expect, it } from "vitest"
import { join } from "node:path"
import { loadWorkbookTree } from "../../load-tree"
import { scoreFeedingTicketHasIoCase } from "../../rules/score-feeding-ticket-has-io-case"

const FIXTURES = join(__dirname, "../fixtures/score-feeding-ticket-has-io-case")
const RULE_ID = "score-feeding-ticket-has-io-case"

describe(RULE_ID, () => {
  it("flags an unassisted ticket whose only hidden test is a probe, not an io-case", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "red"))
    const findings = scoreFeedingTicketHasIoCase(workbook).filter((f) => f.ruleId === RULE_ID)
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({ severity: "error", ticketKey: "MER-201" })
  })

  it("passes when an unassisted ticket has at least one io-case hidden test", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "green"))
    const findings = scoreFeedingTicketHasIoCase(workbook).filter((f) => f.ruleId === RULE_ID)
    expect(findings).toHaveLength(0)
  })
})
