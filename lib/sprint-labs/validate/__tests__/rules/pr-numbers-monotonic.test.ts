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

  it("regression (review round 1, M-2): flags a PR number regression mentioned by an assisted ticket, not just review-only ones", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "assisted-ticket-red"))
    const findings = prNumbersMonotonic(workbook).filter((f) => f.ruleId === RULE_ID)
    expect(findings).toHaveLength(1)
    expect(findings[0].ticketKey).toBe("MER-206")
  })

  it("passes when an assisted ticket's mentioned PR number also increases", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "assisted-ticket-green"))
    const findings = prNumbersMonotonic(workbook).filter((f) => f.ruleId === RULE_ID)
    expect(findings).toHaveLength(0)
  })

  it("regression (review round 2, item 2): flags a later ticket whose MAX mentioned PR number is still below an earlier ticket's max", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "cross-ticket-max-regression-red"))
    const findings = prNumbersMonotonic(workbook).filter((f) => f.ruleId === RULE_ID)
    expect(findings).toHaveLength(1)
    expect(findings[0].ticketKey).toBe("MER-206")
  })

  it("passes the reviewer's self-citation repro: a ticket citing an older PR for context ('follows up on #500; #480 didn't fix it') never self-flags", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "self-citation-green"))
    const findings = prNumbersMonotonic(workbook).filter((f) => f.ruleId === RULE_ID)
    expect(findings).toHaveLength(0)
  })
})
