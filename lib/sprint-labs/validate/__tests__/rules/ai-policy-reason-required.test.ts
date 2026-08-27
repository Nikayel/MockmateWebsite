import { describe, expect, it } from "vitest"
import { join } from "node:path"
import { loadWorkbookTree } from "../../load-tree"
import { aiPolicyReasonRequired } from "../../rules/ai-policy-reason-required"

const FIXTURES = join(__dirname, "../fixtures/ai-policy-reason-required")
const RULE_ID = "ai-policy-reason-required"

describe(RULE_ID, () => {
  it("flags an unassisted ticket with no ai_policy_reason", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "red"))
    const findings = aiPolicyReasonRequired(workbook).filter((f) => f.ruleId === RULE_ID)
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({ severity: "error", ticketKey: "DEMO-1" })
  })

  it("passes when an unassisted ticket carries ai_policy_reason", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "green"))
    const findings = aiPolicyReasonRequired(workbook).filter((f) => f.ruleId === RULE_ID)
    expect(findings).toHaveLength(0)
  })
})
