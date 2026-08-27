import { describe, expect, it } from "vitest"
import { join } from "node:path"
import { loadWorkbookTree } from "../../load-tree"
import { snakeCaseAuthoringKeys } from "../../rules/snake-case-authoring-keys"

const FIXTURES = join(__dirname, "../fixtures/snake-case-authoring-keys")
const RULE_ID = "snake-case-authoring-keys"

describe(RULE_ID, () => {
  it("flags aiPolicy (camelCase) in ticket.md, concessionTriggers (camelCase) in author_brief.yaml, and files_touched (snake_case, wrong per R17) in sprint.yaml", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "red"))
    const findings = snakeCaseAuthoringKeys(workbook).filter((f) => f.ruleId === RULE_ID)
    expect(findings).toHaveLength(3)
    expect(findings.every((f) => f.severity === "error")).toBe(true)
    expect(findings.some((f) => f.message.includes("aiPolicy"))).toBe(true)
    expect(findings.some((f) => f.message.includes("concessionTriggers"))).toBe(true)
    expect(findings.some((f) => f.message.includes("files_touched"))).toBe(true)
  })

  it("passes when ai_policy and concession_triggers use the snake_case spelling", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "green"))
    const findings = snakeCaseAuthoringKeys(workbook).filter((f) => f.ruleId === RULE_ID)
    expect(findings).toHaveLength(0)
  })
})
