/**
 * Security + shape tests for `materializeInitialTree`. The load-bearing claim: a learner opening a
 * ticket's workspace must never receive a hidden test, a reference diff, or any other secret-file
 * content, on top of the workspace actually looking like a real day-one Meridian ticket (src files,
 * MERIDIAN.md, visible tests all present).
 *
 * Two independent lines of evidence for the security claim, not one:
 *  1. Task 7's OWN provisioning scans (`scanProvisionedBundleContent`, `scanFreshWorkspaceGitObjects`)
 *     reused verbatim against the identical `materializeThroughSetup` output this module strips down
 *     -- a clean result there is a clean result on this module's own input, checked both by file
 *     content/path AND by raw git-object content/tree-entry name (the "fresh workspace has zero git
 *     objects matching a hidden-test signature" launch blocker, AGENT-CONTEXT.md §4).
 *  2. A direct path-shape assertion on THIS module's own stripped output, independent of Task 7's
 *     scan implementation -- belt and suspenders against the residual risk named in this module's
 *     own header (a diff smuggling a forbidden-shaped path underneath `src/`).
 */
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { loadWorkbookTree } from "@/lib/sprint-labs/validate/load-tree"
import { findTicketLocation } from "@/lib/sprint-labs/validate/dynamic/materialize"
import {
  scanFreshWorkspaceGitObjects,
  scanProvisionedBundleContent,
} from "@/lib/sprint-labs/validate/dynamic/provisioning"

import { materializeInitialTree, type ProvisionedFile } from "../materialize-initial-tree"

const FIXTURE_WORKBOOK = join(__dirname, "../../../../workbooks/_fixture-workbook")

function byRole(files: ProvisionedFile[], role: ProvisionedFile["role"]): ProvisionedFile[] {
  return files.filter((f) => f.role === role)
}

/** Every path-shape this module's own header names as forbidden, regardless of which category
 *  (editable/docs/test) it would have landed in. */
function assertNoForbiddenPaths(files: ProvisionedFile[]): void {
  for (const file of files) {
    expect(file.path).not.toMatch(/(?:^|\/)tests\/hidden\//)
    expect(file.path).not.toMatch(/(?:^|\/)adversary\//)
    expect(file.path.endsWith("reference.diff")).toBe(false)
    expect(file.path.endsWith("review.yaml")).toBe(false)
    expect(file.path.endsWith("author_brief.yaml")).toBe(false)
    expect(file.path.endsWith("rubric.yaml")).toBe(false)
  }
}

describe("materializeInitialTree -- DEMO-101 (fixture-demo, real authored content)", () => {
  it("returns editable src files, MERIDIAN.md (docs), and the ticket's visible tests", () => {
    const files = materializeInitialTree("fixture-demo", "DEMO-101")

    const editable = byRole(files, "editable")
    expect(editable.length).toBeGreaterThan(0)
    expect(editable.every((f) => f.path === "src" || f.path.startsWith("src/"))).toBe(true)
    expect(editable.some((f) => f.path === "src/http/claims-parser.ts")).toBe(true)
    // DEMO-101's setup.diff creates this file as `any`-typed -- the RED starting point, never the
    // reference (green) solution.
    const parser = editable.find((f) => f.path === "src/http/claims-parser.ts")
    expect(parser?.content).toContain("body: any")

    // fixture-demo (workbooks/_fixture-workbook) is a compiler-test fixture with no authored
    // MERIDIAN.md at all ("Not real learner content", per its own workbook.yaml header) -- correctly
    // yields zero docs entries rather than a fabricated one. The "meridian" suite below covers the
    // MERIDIAN.md-present path against the real workbook.
    expect(byRole(files, "docs")).toEqual([])

    const tests = byRole(files, "test")
    expect(tests.length).toBeGreaterThan(0)
    expect(tests.every((f) => f.path.startsWith("tests/visible/"))).toBe(true)
  })

  it("carries zero hidden-test/secret signatures -- Task 7's own scans on the underlying materialized tree", () => {
    const workbook = loadWorkbookTree(FIXTURE_WORKBOOK)
    const { ticket } = findTicketLocation(workbook, "DEMO-101")

    expect(scanProvisionedBundleContent(workbook, ticket)).toEqual([])
    expect(scanFreshWorkspaceGitObjects(workbook, ticket)).toEqual([])
  })

  it("carries no forbidden-shaped path in its own stripped output (belt and suspenders)", () => {
    assertNoForbiddenPaths(materializeInitialTree("fixture-demo", "DEMO-101"))
  })
})

describe("materializeInitialTree -- DEMO-102 (already carries DEMO-101's shipped reference)", () => {
  it("still carries none of DEMO-101's secret content or DEMO-102's own hidden-test signatures", () => {
    const workbook = loadWorkbookTree(FIXTURE_WORKBOOK)
    const { ticket } = findTicketLocation(workbook, "DEMO-102")

    expect(scanProvisionedBundleContent(workbook, ticket)).toEqual([])
    expect(scanFreshWorkspaceGitObjects(workbook, ticket)).toEqual([])
  })

  it("returns a sane file set: editable src (including DEMO-101's shipped reference), MERIDIAN.md, visible tests", () => {
    const files = materializeInitialTree("fixture-demo", "DEMO-102")

    const editable = byRole(files, "editable")
    expect(editable.length).toBeGreaterThan(0)
    // DEMO-102's setup.diff imports parseClaimPayload from the file DEMO-101's reference.diff
    // shipped -- confirms prior-ticket reference diffs really do land before this ticket's own
    // setup.diff (materialize.ts's own documented ordering).
    expect(editable.some((f) => f.path === "src/http/claims-list.ts")).toBe(true)
    const parser = editable.find((f) => f.path === "src/http/claims-parser.ts")
    expect(parser?.content).toContain("ParsedClaim") // DEMO-101's reference (green) shape, not `any`

    expect(byRole(files, "docs")).toEqual([]) // fixture-demo has no MERIDIAN.md -- see the note above
    expect(byRole(files, "test").length).toBeGreaterThan(0)

    assertNoForbiddenPaths(files)
  })
})

describe("materializeInitialTree -- meridian (real seed, direct-dirname resolution, MER-101 is a content stub)", () => {
  it("degrades gracefully to the raw seed when a ticket has no setup/reference diff authored yet", () => {
    const files = materializeInitialTree("meridian", "MER-101")

    const editable = byRole(files, "editable")
    expect(editable.length).toBeGreaterThan(0)
    expect(editable.every((f) => f.path === "src" || f.path.startsWith("src/"))).toBe(true)

    expect(byRole(files, "docs").some((f) => f.path === "MERIDIAN.md")).toBe(true)
    assertNoForbiddenPaths(files)
  })
})

describe("materializeInitialTree -- error paths", () => {
  it("throws UNKNOWN_WORKBOOK for a workbookId with no authored directory", () => {
    expect(() => materializeInitialTree("does-not-exist", "DEMO-101")).toThrow("UNKNOWN_WORKBOOK")
  })

  // Review round 1, MINOR-3: a workbookId that path.join would otherwise resolve OUTSIDE
  // workbooks/ (via ".." segments) must never escape the root, even though today's one real caller
  // only ever passes a registry-validated id (see materialize-initial-tree.ts's own doc comment on
  // resolveWorkbookDir for why the primitive is hardened anyway).
  it("throws UNKNOWN_WORKBOOK for a workbookId that would path-traverse outside workbooks/", () => {
    expect(() => materializeInitialTree("../../../../../../etc", "DEMO-101")).toThrow(
      "UNKNOWN_WORKBOOK"
    )
    expect(() => materializeInitialTree("..", "DEMO-101")).toThrow("UNKNOWN_WORKBOOK")
    expect(() => materializeInitialTree("../meridian", "MER-101")).toThrow("UNKNOWN_WORKBOOK")
  })

  it("throws UNKNOWN_TICKET for a ticket key not present in the workbook", () => {
    expect(() => materializeInitialTree("fixture-demo", "DEMO-999")).toThrow("UNKNOWN_TICKET")
  })
})
