import { describe, expect, it } from "vitest"
import { join } from "node:path"
import { VALIDATION_RULES, loadWorkbookTree, validateWorkbook } from "../index"

describe("validateWorkbook", () => {
  it("composes all 15 static rules", () => {
    expect(VALIDATION_RULES).toHaveLength(15)
  })

  it("returns zero findings for a fully valid tiny workbook (the task's PASS case)", () => {
    const workbook = loadWorkbookTree(join(__dirname, "fixtures/whole-workbook-passes"))
    expect(validateWorkbook(workbook)).toEqual([])
  })

  it("surfaces a finding from a rule via the composed entry point", () => {
    // Reuses an existing single-rule fixture to prove index.ts actually wires
    // the rule in, rather than re-testing the rule's own logic.
    const workbook = loadWorkbookTree(join(__dirname, "fixtures/ticket-has-objective/red"))
    const findings = validateWorkbook(workbook)
    expect(findings.some((f) => f.ruleId === "ticket-has-objective")).toBe(true)
  })
})
