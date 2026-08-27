import { describe, expect, it } from "vitest"
import { join } from "node:path"
import { loadWorkbookTree } from "../../load-tree"
import { migrationFilenamesUniqueGapless } from "../../rules/migration-filenames-unique-gapless"

const FIXTURES = join(__dirname, "../fixtures/migration-filenames-unique-gapless")
const RULE_ID = "migration-filenames-unique-gapless"

describe(RULE_ID, () => {
  it("flags a migration number reused by two different files and a gap in the sequence (exactly 2 findings)", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "red"))
    const findings = migrationFilenamesUniqueGapless(workbook).filter((f) => f.ruleId === RULE_ID)

    expect(findings).toHaveLength(2)
    expect(
      findings.some((f) => f.message.includes("0002") && f.message.includes("different files"))
    ).toBe(true)
    expect(findings.some((f) => f.message.includes("gap"))).toBe(true)
  })

  it("passes on a unique, gapless migration sequence spanning the seed and later sprints", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "green"))
    const findings = migrationFilenamesUniqueGapless(workbook).filter((f) => f.ruleId === RULE_ID)
    expect(findings).toHaveLength(0)
  })

  it("regression (review round 1, M-4): dirname-aware duplicate detection catches a same-number-same-basename file in a DIFFERENT directory (exactly 1 finding)", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "dirname-duplicate-red"))
    const findings = migrationFilenamesUniqueGapless(workbook).filter((f) => f.ruleId === RULE_ID)
    expect(findings).toHaveLength(1)
    expect(findings[0].message).toContain("0002")
    expect(findings[0].message).toContain("different files")
    expect(findings[0].message).toContain("archive/migrations/0002_claims.sql")
  })

  it("passes when the same exact path (not just basename) is touched again by a later diff", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "dirname-duplicate-green"))
    const findings = migrationFilenamesUniqueGapless(workbook).filter((f) => f.ruleId === RULE_ID)
    expect(findings).toHaveLength(0)
  })

  it("regression (review round 1, M-4): enforces the 0001-0030 allocation band (exactly 2 findings: band + gap)", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "band-violation-red"))
    const findings = migrationFilenamesUniqueGapless(workbook).filter((f) => f.ruleId === RULE_ID)
    expect(findings).toHaveLength(2)
    expect(findings.some((f) => f.message.includes("outside the allocated"))).toBe(true)
    expect(findings.some((f) => f.message.includes("gap"))).toBe(true)
  })

  it("passes when every migration number stays within the 0001-0030 band", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "band-violation-green"))
    const findings = migrationFilenamesUniqueGapless(workbook).filter((f) => f.ruleId === RULE_ID)
    expect(findings).toHaveLength(0)
  })
})
