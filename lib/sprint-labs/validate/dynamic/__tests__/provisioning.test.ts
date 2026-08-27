import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { loadWorkbookTree } from "../../load-tree"
import {
  createGitWorkspace,
  cleanupGitWorkspace,
  commitAll,
  readAllGitObjectBlobs,
  writeWorkspaceFiles,
} from "../git-workspace"
import { findTicketLocation } from "../materialize"
import {
  scanFreshWorkspaceGitObjects,
  scanProvisionedBundleContent,
  scanProvisioning,
} from "../provisioning"

const FIXTURES = join(__dirname, "fixtures")
const FIXTURE_WORKBOOK = join(__dirname, "../../../../../workbooks/_fixture-workbook")

describe("scanProvisionedBundleContent -- positive (clean) cases", () => {
  it("the sprint 1 learner grep: DEMO-101's provisioned bundle (workbooks/_fixture-workbook, real content) carries zero hidden-test signatures, zero future-ticket markers, zero secret-file content", async () => {
    const workbook = loadWorkbookTree(FIXTURE_WORKBOOK)
    const { ticket } = findTicketLocation(workbook, "DEMO-101")

    const findings = scanProvisionedBundleContent(workbook, ticket)

    expect(findings).toEqual([])
  })

  it("DEMO-102's provisioned bundle (which DOES already contain DEMO-101's shipped reference) still carries none of DEMO-101's SECRET content (reference.diff text) or DEMO-102's own hidden-test signatures", async () => {
    const workbook = loadWorkbookTree(FIXTURE_WORKBOOK)
    const { ticket } = findTicketLocation(workbook, "DEMO-102")

    const findings = scanProvisionedBundleContent(workbook, ticket)

    expect(findings).toEqual([])
  })

  it("happy-path fixture: both tickets' bundles are clean", async () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "happy-path"))
    for (const key of ["FIX-101", "FIX-102"]) {
      const { ticket } = findTicketLocation(workbook, key)
      expect(scanProvisionedBundleContent(workbook, ticket)).toEqual([])
    }
  })
})

describe("scanProvisionedBundleContent -- catches a real leak", () => {
  it("catches a future ticket's key AND this ticket's own hidden-test humanName, both leaked into setup.diff's created source", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "leak-future-marker"))
    const { ticket } = findTicketLocation(workbook, "LEAK-101")

    const findings = scanProvisionedBundleContent(workbook, ticket)

    const futureKeyFinding = findings.find((f) => f.message.includes("LEAK-102"))
    expect(futureKeyFinding).toMatchObject({
      ruleId: "dynamic-provisioning-leak",
      severity: "error",
      ticketKey: "LEAK-101",
      path: "src/leaky.ts",
    })

    const hiddenSignatureFinding = findings.find((f) => f.message.includes("hidden-test content"))
    expect(hiddenSignatureFinding).toMatchObject({
      ruleId: "dynamic-provisioning-leak",
      severity: "error",
      ticketKey: "LEAK-101",
    })

    expect(findings).toHaveLength(2)
  })

  it("LEAK-102's own bundle (setup.diff never mentions its own key or LEAK-101's hidden test) is clean -- the leak is specific to LEAK-101, not a blanket false positive", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "leak-future-marker"))
    const { ticket } = findTicketLocation(workbook, "LEAK-102")

    expect(scanProvisionedBundleContent(workbook, ticket)).toEqual([])
  })
})

describe("scanFreshWorkspaceGitObjects", () => {
  it("a workspace provisioned by git-workspace.ts's real git init + copy (never a clone) has zero git objects matching any hidden-test signature -- fixture-workbook, both tickets", async () => {
    const workbook = loadWorkbookTree(FIXTURE_WORKBOOK)
    for (const key of ["DEMO-101", "DEMO-102"]) {
      const { ticket } = findTicketLocation(workbook, key)
      expect(scanFreshWorkspaceGitObjects(workbook, ticket)).toEqual([])
    }
  })

  it("detects a real leak when one exists: a hidden-test signature committed directly into a git workspace's object store IS found by readAllGitObjectBlobs (proves the detector itself works, not just that nothing is ever planted)", () => {
    const ws = createGitWorkspace()
    try {
      const signature =
        "Escaped: this exact sentence must never appear in a provisioned learner bundle"
      writeWorkspaceFiles(ws, [
        { path: "src/oops.ts", content: `// ${signature}\nexport const oops = 1\n` },
      ])
      commitAll(ws, "deliberately plants a leak for this test")

      const blobs = readAllGitObjectBlobs(ws)

      expect(blobs.some((blob) => blob.includes(signature))).toBe(true)
    } finally {
      cleanupGitWorkspace(ws)
    }
  })
})

describe("scanProvisioning (composition)", () => {
  it("runs both scans and returns clean results for a real, non-leaky ticket", async () => {
    const workbook = loadWorkbookTree(FIXTURE_WORKBOOK)

    const result = scanProvisioning(workbook, "DEMO-101")

    expect(result.contentFindings).toEqual([])
    expect(result.gitObjectFindings).toEqual([])
  })
})
