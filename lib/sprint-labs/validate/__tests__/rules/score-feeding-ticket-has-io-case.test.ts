import { describe, expect, it } from "vitest"
import { join } from "node:path"
import { loadWorkbookTree } from "../../load-tree"
import { scoreFeedingTicketHasIoCase } from "../../rules/score-feeding-ticket-has-io-case"

const FIXTURES = join(__dirname, "../fixtures/score-feeding-ticket-has-io-case")
const RULE_ID = "score-feeding-ticket-has-io-case"

describe(RULE_ID, () => {
  it("flags an unassisted ticket with an authored hidden tier whose only hidden test is a probe, not an io-case", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "score-feeding-hidden-tier-all-probe"))
    const findings = scoreFeedingTicketHasIoCase(workbook).filter((f) => f.ruleId === RULE_ID)
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({ severity: "error", ticketKey: "MER-201" })
  })

  it("passes when an unassisted ticket's authored hidden tier has at least one io-case hidden test", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "score-feeding-hidden-tier-has-io-case"))
    const findings = scoreFeedingTicketHasIoCase(workbook).filter((f) => f.ruleId === RULE_ID)
    expect(findings).toHaveLength(0)
  })

  it("regression (ruling R23): a score-feeding ticket with NO tests/hidden/ directory at all is a stub and is exempt, not a finding", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "stub-score-feeding-no-hidden-tier"))
    const findings = scoreFeedingTicketHasIoCase(workbook).filter((f) => f.ruleId === RULE_ID)
    expect(findings).toHaveLength(0)
  })
})
