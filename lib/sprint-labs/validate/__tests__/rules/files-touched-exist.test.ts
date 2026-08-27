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
})
