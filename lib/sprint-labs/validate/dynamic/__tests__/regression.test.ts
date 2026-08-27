/**
 * The regression gate's negative proof: REG-102's `reference.diff` correctly fixes its own bug
 * (`src/util.ts`) but, as a side effect, also reverts REG-101's already-shipped fix
 * (`src/math.ts`) back to the buggy version -- confirmed by hand in task-7-report.md. Validating
 * REG-102 must fail with a regression finding naming REG-101, even though REG-102's OWN red/green
 * is entirely clean.
 */
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { loadWorkbookTree } from "../../load-tree"
import { findTicketLocation } from "../materialize"
import { runDynamicGateForTicket } from "../red-green"

const FIXTURES = join(__dirname, "fixtures")

describe("runDynamicGateForTicket (regression break)", () => {
  it("REG-101 alone goes red->green cleanly", async () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "regression-break"))
    const { ticket } = findTicketLocation(workbook, "REG-101")

    expect(await runDynamicGateForTicket(workbook, ticket)).toEqual([])
  }, 20_000)

  it("REG-102's own red->green is clean, but it regresses REG-101 -- caught and named", async () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "regression-break"))
    const { ticket } = findTicketLocation(workbook, "REG-102")

    const findings = await runDynamicGateForTicket(workbook, ticket)

    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({
      ruleId: "dynamic-regression",
      severity: "error",
      ticketKey: "REG-102",
    })
    expect(findings[0].message).toContain("REG-101")
    expect(findings[0].message).toContain("adds a negative and a positive number")
  }, 20_000)
})
