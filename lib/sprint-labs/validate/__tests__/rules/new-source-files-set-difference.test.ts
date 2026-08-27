import { describe, expect, it } from "vitest"
import { join } from "node:path"
import { loadWorkbookTree } from "../../load-tree"
import { newSourceFilesSetDifference } from "../../rules/new-source-files-set-difference"

const FIXTURES = join(__dirname, "../fixtures/new-source-files-set-difference")
const RULE_ID = "new-source-files-set-difference"

describe(RULE_ID, () => {
  it("flags an over-counted newSourceFiles entry, a not-even-touched newSourceFiles entry, an under-counted filesTouched entry, and an invalid rewrittenFiles entry, each with a distinguishable message (review round 1, M-5)", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "red"))
    const findings = newSourceFilesSetDifference(workbook).filter((f) => f.ruleId === RULE_ID)

    expect(findings).toHaveLength(4)
    expect(findings.some((f) => f.message.includes("already exists in the seed"))).toBe(true)
    expect(
      findings.some(
        (f) =>
          f.path === "src/never/touched.ts" &&
          f.message.includes("not in this sprint's filesTouched at all")
      )
    ).toBe(true)
    expect(findings.some((f) => f.message.includes("missing from newSourceFiles"))).toBe(true)
    expect(
      findings.some(
        (f) => f.message.includes("rewrittenFiles") && f.message.includes("does not exist")
      )
    ).toBe(true)
  })

  it("passes when newSourceFiles is exactly the set difference and rewrittenFiles is a seed/prior subset", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "green"))
    const findings = newSourceFilesSetDifference(workbook).filter((f) => f.ruleId === RULE_ID)
    expect(findings).toHaveLength(0)
  })

  it("regression (review round 1, I-2): flags S3 re-listing as new a file S1 created two sprints earlier", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "three-sprint-red"))
    const findings = newSourceFilesSetDifference(workbook).filter((f) => f.ruleId === RULE_ID)
    expect(findings).toHaveLength(1)
    expect(findings[0].message).toContain("already exists")
  })

  it("passes when S3 correctly does not re-list a file S1 created two sprints earlier", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "three-sprint-green"))
    const findings = newSourceFilesSetDifference(workbook).filter((f) => f.ruleId === RULE_ID)
    expect(findings).toHaveLength(0)
  })
})
