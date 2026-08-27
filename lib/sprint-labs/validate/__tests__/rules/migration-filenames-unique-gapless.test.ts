import { describe, expect, it } from "vitest"
import { join } from "node:path"
import { loadWorkbookTree } from "../../load-tree"
import { migrationFilenamesUniqueGapless } from "../../rules/migration-filenames-unique-gapless"

const FIXTURES = join(__dirname, "../fixtures/migration-filenames-unique-gapless")
const RULE_ID = "migration-filenames-unique-gapless"

describe(RULE_ID, () => {
  it("flags a migration number reused by two different files and a gap in the sequence", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "red"))
    const findings = migrationFilenamesUniqueGapless(workbook).filter((f) => f.ruleId === RULE_ID)

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
})
