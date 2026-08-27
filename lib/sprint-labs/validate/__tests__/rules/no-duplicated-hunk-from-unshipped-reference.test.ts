import { describe, expect, it } from "vitest"
import { join } from "node:path"
import { loadWorkbookTree } from "../../load-tree"
import { noDuplicatedHunkFromUnshippedReference } from "../../rules/no-duplicated-hunk-from-unshipped-reference"

const FIXTURES = join(__dirname, "../fixtures/no-duplicated-hunk-from-unshipped-reference")
const RULE_ID = "no-duplicated-hunk-from-unshipped-reference"

describe(RULE_ID, () => {
  it("catches four independent evasions of a whole-block-only check (review round 1, C-2), while a coincidental generic-import match (review round 2, item 1) stays silent", () => {
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
    // MER-106's setup.diff shares three ordinary import lines with MER-206's
    // reference.diff -- an all-generic window, never fingerprinted, so it
    // must not add a 6th finding.
    expect(findings.some((f) => f.ticketKey === "MER-106")).toBe(false)

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

  it("regression (review round 2, item 1b): flags a distinctive duplicate hunk when the ticket has no dupHunkSignoff", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "signoff-red"))
    const findings = noDuplicatedHunkFromUnshippedReference(workbook).filter(
      (f) => f.ruleId === RULE_ID
    )
    expect(findings).toHaveLength(1)
    expect(findings[0].ticketKey).toBe("MER-101")
  })

  it("passes the same distinctive duplicate hunk when the ticket carries dupHunkSignoff: true", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "signoff-green"))
    const findings = noDuplicatedHunkFromUnshippedReference(workbook).filter(
      (f) => f.ruleId === RULE_ID
    )
    expect(findings).toHaveLength(0)
  })
})
