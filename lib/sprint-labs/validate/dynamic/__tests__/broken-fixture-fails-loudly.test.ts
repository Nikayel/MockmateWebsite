/**
 * The brief's explicit negative-path proof: "a deliberately broken temp fixture (reference.diff
 * that misses a hidden case) FAILS loudly." `fixtures/broken-reference/BROK-101`'s reference.diff
 * fixes exactly the case the VISIBLE test asserts (`add(5, -3)`) but not the case the HIDDEN probe
 * asserts (`add(-5, -3)`) -- confirmed by hand in task-7-report.md. The gate must report a
 * red->green failure naming the ticket and which tier (hidden) didn't flip, not a false pass.
 */
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { loadWorkbookTree } from "../../load-tree"
import { findTicketLocation } from "../materialize"
import { runDynamicGateForTicket } from "../red-green"

const FIXTURES = join(__dirname, "fixtures")

describe("runDynamicGateForTicket (deliberately broken reference)", () => {
  it("fails loudly, naming the ticket and that the hidden tier (not visible) didn't flip green", async () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "broken-reference"))
    const { ticket } = findTicketLocation(workbook, "BROK-101")

    const findings = await runDynamicGateForTicket(workbook, ticket)

    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({
      ruleId: "dynamic-red-green",
      severity: "error",
      ticketKey: "BROK-101",
    })
    expect(findings[0].message).toContain("visible=PASS")
    expect(findings[0].message).toContain("hidden=FAIL")
  }, 20_000)
})
