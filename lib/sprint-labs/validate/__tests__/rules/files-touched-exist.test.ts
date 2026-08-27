import { describe, expect, it } from "vitest"
import { join } from "node:path"
import { loadWorkbookTree } from "../../load-tree"
import { filesTouchedExist } from "../../rules/files-touched-exist"

const FIXTURES = join(__dirname, "../fixtures/files-touched-exist")
const RULE_ID = "files-touched-exist"

describe(RULE_ID, () => {
  it("flags a touched path that exists in neither the seed nor any sprint's newSourceFiles", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "red"))
    const findings = filesTouchedExist(workbook).filter((f) => f.ruleId === RULE_ID)
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({ severity: "error", path: "src/db/repositories/outbox.ts" })
  })

  it("passes when every touched path is in the seed or created by that sprint or an earlier one", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "green"))
    const findings = filesTouchedExist(workbook).filter((f) => f.ruleId === RULE_ID)
    expect(findings).toHaveLength(0)
  })

  it("regression (review round 1, I-2): correctly looks back across multiple earlier sprints (S3 touching a file S1 created), not just the immediately prior one", () => {
    const threeSprintFixtures = join(__dirname, "../fixtures/new-source-files-set-difference")
    const red = loadWorkbookTree(join(threeSprintFixtures, "three-sprint-red"))
    const green = loadWorkbookTree(join(threeSprintFixtures, "three-sprint-green"))
    // Neither fixture has a bad TOUCHED path -- both correctly touch a file
    // that exists (created in S1) -- so this rule finds nothing in either;
    // the point is proving a naive "only check the immediately prior
    // sprint" accumulator would have nothing to break here either way.
    expect(filesTouchedExist(red).filter((f) => f.ruleId === RULE_ID)).toHaveLength(0)
    expect(filesTouchedExist(green).filter((f) => f.ruleId === RULE_ID)).toHaveLength(0)
  })
})
