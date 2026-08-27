/**
 * PLAN.md Task 7 review round 1, Important 2 regression locks.
 *
 * 2a: `humanName`/`fileName` are never length-gated -- a 4-character humanName ("zero", the
 * review's own example) is exactly as real a leak as a long one.
 * 2b: both scans check PATHS/tree-entry NAMES, not just content -- a leak that is itself a
 * filename (not embedded in any blob's bytes) must not evade either scan.
 */
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { loadWorkbookTree } from "../../load-tree"
import { findTicketLocation } from "../materialize"
import { scanFreshWorkspaceGitObjects, scanProvisionedBundleContent } from "../provisioning"

const FIXTURES = join(__dirname, "fixtures")

describe("short hidden-test signature ('zero', 4 chars) and filename-shaped leak", () => {
  it("scanProvisionedBundleContent catches BOTH the content leak (a comment mentioning 'zero') and the path leak (a file literally named src/zero.ts)", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "short-signature-leak"))
    const { ticket } = findTicketLocation(workbook, "LEAK2-101")

    const findings = scanProvisionedBundleContent(workbook, ticket)

    expect(findings.length).toBeGreaterThanOrEqual(2)
    expect(findings.every((f) => f.ruleId === "dynamic-provisioning-leak")).toBe(true)

    const contentHit = findings.find((f) => f.path === "src/util.ts")
    expect(contentHit).toBeDefined()

    const pathHit = findings.find((f) => f.path === "src/zero.ts")
    expect(pathHit).toBeDefined()
  })

  it("scanFreshWorkspaceGitObjects catches the same short signature via a git tree-entry NAME (src/zero.ts's basename), not just blob content", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "short-signature-leak"))
    const { ticket } = findTicketLocation(workbook, "LEAK2-101")

    const findings = scanFreshWorkspaceGitObjects(workbook, ticket)

    expect(findings.length).toBeGreaterThanOrEqual(1)
    expect(findings.every((f) => f.ruleId === "dynamic-fresh-workspace-git-objects")).toBe(true)
    expect(findings.some((f) => f.message.includes("tree entry name"))).toBe(true)
  })
})
