import { describe, expect, it } from "vitest"
import { join } from "node:path"
import { loadWorkbookTree } from "../../load-tree"
import { oneNamePerFile } from "../../rules/one-name-per-file"

const FIXTURES = join(__dirname, "../fixtures/one-name-per-file")
const RULE_ID = "one-name-per-file"

describe(RULE_ID, () => {
  it("flags outbox-repository.ts in filesTouched/newSourceFiles, claim-repository.ts inside a diff, a ticket's body/criteria, and MERIDIAN.md", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "red"))
    const findings = oneNamePerFile(workbook).filter((f) => f.ruleId === RULE_ID)

    expect(findings.some((f) => f.message.includes("outbox-repository.ts"))).toBe(true)
    expect(findings.some((f) => f.message.includes("claim-repository.ts"))).toBe(true)
    expect(findings.some((f) => f.ticketKey === "MER-102" && f.message.includes("body"))).toBe(true)
    expect(
      findings.some((f) => f.ticketKey === "MER-102" && f.message.includes("acceptanceCriteria"))
    ).toBe(true)
    expect(findings.some((f) => f.path === "MERIDIAN.md")).toBe(true)
  })

  it("passes when only the canonical outbox.ts/claims.ts names are used, including in prose and MERIDIAN.md", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "green"))
    const findings = oneNamePerFile(workbook).filter((f) => f.ruleId === RULE_ID)
    expect(findings).toHaveLength(0)
  })
})
