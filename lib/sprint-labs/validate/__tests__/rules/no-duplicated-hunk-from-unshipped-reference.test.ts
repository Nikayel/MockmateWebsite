import { describe, expect, it } from "vitest"
import { join } from "node:path"
import { loadWorkbookTree } from "../../load-tree"
import { noDuplicatedHunkFromUnshippedReference } from "../../rules/no-duplicated-hunk-from-unshipped-reference"

const FIXTURES = join(__dirname, "../fixtures/no-duplicated-hunk-from-unshipped-reference")
const RULE_ID = "no-duplicated-hunk-from-unshipped-reference"

describe(RULE_ID, () => {
  it("flags a sprint-1 setup.diff hunk that leaks sprint-2's not-yet-shipped reference.diff, and a MERIDIAN.md paragraph that leaks another ticket's reference.diff", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "red"))
    const findings = noDuplicatedHunkFromUnshippedReference(workbook).filter(
      (f) => f.ruleId === RULE_ID
    )

    expect(findings).toHaveLength(2)
    expect(findings.some((f) => f.ticketKey === "MER-101")).toBe(true)
    expect(findings.some((f) => f.path === "MERIDIAN.md")).toBe(true)
  })

  it("passes when no setup.diff or MERIDIAN.md text duplicates a reference.diff hunk", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "green"))
    const findings = noDuplicatedHunkFromUnshippedReference(workbook).filter(
      (f) => f.ruleId === RULE_ID
    )
    expect(findings).toHaveLength(0)
  })
})
