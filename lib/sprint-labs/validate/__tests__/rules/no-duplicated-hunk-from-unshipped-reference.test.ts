import { describe, expect, it } from "vitest"
import { join } from "node:path"
import { loadWorkbookTree } from "../../load-tree"
import { noDuplicatedHunkFromUnshippedReference } from "../../rules/no-duplicated-hunk-from-unshipped-reference"

const FIXTURES = join(__dirname, "../fixtures/no-duplicated-hunk-from-unshipped-reference")
const RULE_ID = "no-duplicated-hunk-from-unshipped-reference"

describe(RULE_ID, () => {
  it("catches four independent evasions of a whole-block-only check (review round 1, C-2)", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "red"))
    const findings = noDuplicatedHunkFromUnshippedReference(workbook).filter(
      (f) => f.ruleId === RULE_ID
    )

    // (d) byte-identical whole hunk copied verbatim
    expect(findings.some((f) => f.ticketKey === "MER-101")).toBe(true)
    // (a) partial copy: only 3 of a 5-line reference hunk copied
    expect(findings.some((f) => f.ticketKey === "MER-102")).toBe(true)
    // (c) same added lines, with an unrelated context line interleaved in setup.diff
    expect(findings.some((f) => f.ticketKey === "MER-103")).toBe(true)
    // (b) the same lines embedded in a ```ts fence in MERIDIAN.md, plus the
    // original plain-prose paragraph -- two distinct MERIDIAN.md matches
    const meridianFindings = findings.filter((f) => f.path === "MERIDIAN.md")
    expect(meridianFindings).toHaveLength(2)

    expect(findings).toHaveLength(5)
    expect(findings.every((f) => f.severity === "error")).toBe(true)
  })

  it("passes when no setup.diff or MERIDIAN.md text (including inside a code fence) duplicates a reference.diff hunk", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "green"))
    const findings = noDuplicatedHunkFromUnshippedReference(workbook).filter(
      (f) => f.ruleId === RULE_ID
    )
    expect(findings).toHaveLength(0)
  })
})
