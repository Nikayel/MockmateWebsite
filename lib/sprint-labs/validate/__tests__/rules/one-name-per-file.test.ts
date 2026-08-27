import { describe, expect, it } from "vitest"
import { join } from "node:path"
import { loadWorkbookTree } from "../../load-tree"
import { oneNamePerFile } from "../../rules/one-name-per-file"

const FIXTURES = join(__dirname, "../fixtures/one-name-per-file")
const RULE_ID = "one-name-per-file"

describe(RULE_ID, () => {
  it("flags outbox-repository.ts in filesTouched/newSourceFiles and claim-repository.ts inside a diff", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "red"))
    const findings = oneNamePerFile(workbook).filter((f) => f.ruleId === RULE_ID)

    expect(findings.length).toBeGreaterThanOrEqual(2)
    expect(findings.some((f) => f.message.includes("outbox-repository.ts"))).toBe(true)
    expect(findings.some((f) => f.message.includes("claim-repository.ts"))).toBe(true)
  })

  it("passes when only the canonical outbox.ts/claims.ts names are used", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "green"))
    const findings = oneNamePerFile(workbook).filter((f) => f.ruleId === RULE_ID)
    expect(findings).toHaveLength(0)
  })
})
