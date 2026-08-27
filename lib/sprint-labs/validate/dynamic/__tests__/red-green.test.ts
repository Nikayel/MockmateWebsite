import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { loadWorkbookTree } from "../../load-tree"
import { findTicketLocation } from "../materialize"
import { runDynamicGateForTicket } from "../red-green"

const FIXTURES = join(__dirname, "fixtures")

describe("runDynamicGateForTicket (happy path)", () => {
  it("FIX-101: setup.diff is red (visible partially fails, hidden fails), reference.diff goes fully green, zero findings", async () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "happy-path"))
    const { ticket } = findTicketLocation(workbook, "FIX-101")

    const findings = await runDynamicGateForTicket(workbook, ticket)

    expect(findings).toEqual([])
  }, 20_000)

  it("FIX-102: depends on FIX-101's reference already landed (same sprint, earlier key), goes red->green, and its own reference does not regress FIX-101", async () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "happy-path"))
    const { ticket } = findTicketLocation(workbook, "FIX-102")

    const findings = await runDynamicGateForTicket(workbook, ticket)

    expect(findings).toEqual([])
  }, 20_000)
})
