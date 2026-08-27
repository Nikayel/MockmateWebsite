import { describe, expect, it } from "vitest"
import { join } from "node:path"
import { loadWorkbookTree } from "../../load-tree"
import { noFilePathEnumeration } from "../../rules/no-file-path-enumeration"

const FIXTURES = join(__dirname, "../fixtures/no-file-path-enumeration")
const RULE_ID = "no-file-path-enumeration"

describe(RULE_ID, () => {
  it("flags a ticket body naming 3+ src/ paths with no signoff", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "red"))
    const findings = noFilePathEnumeration(workbook).filter((f) => f.ruleId === RULE_ID)
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({ severity: "error", ticketKey: "DEMO-1" })
  })

  it("passes under the 3-path threshold, and passes at/above it with pathEnumerationSignoff: true", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "green"))
    const findings = noFilePathEnumeration(workbook).filter((f) => f.ruleId === RULE_ID)
    expect(findings).toHaveLength(0)
  })
})
