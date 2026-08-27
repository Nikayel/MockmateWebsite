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

describe("scanProvisionedBundleContent -- earned, shipped value carried downstream is not a leak", () => {
  // The MER-205 regression: a hidden io-case expected value that the OWNING ticket ships into
  // permanent source (its own reference.diff), then legitimately inherited by every strictly-later
  // ticket's cumulative tree. Once earned, the owner's hidden tier is never replayed downstream
  // (red-green.ts regresses visible tiers only), so the value surfacing later is not a leak.
  const EARNED = join(FIXTURES, "earned-shipped-value")
  const FUTURE = join(FIXTURES, "future-owner-value")

  it("the upstream shipper's own bundle is clean (it ships the value in its reference, never its setup)", () => {
    const workbook = loadWorkbookTree(EARNED)
    const { ticket } = findTicketLocation(workbook, "EARN-101")

    expect(scanProvisionedBundleContent(workbook, ticket)).toEqual([])
  })

  it("SUPPRESSED: a strictly-later ticket inheriting the earlier ticket's shipped source is not flagged, in BOTH the content and git-object scans", () => {
    const workbook = loadWorkbookTree(EARNED)
    const { ticket } = findTicketLocation(workbook, "EARN-102")

    expect(scanProvisionedBundleContent(workbook, ticket)).toEqual([])
    expect(scanFreshWorkspaceGitObjects(workbook, ticket)).toEqual([])
  })

  it("STILL FIRES: a ticket's OWN answer in its OWN setup and an earlier ticket's NON-shipped humanName both report, while the earned shipped value stays suppressed", () => {
    const workbook = loadWorkbookTree(EARNED)
    const { ticket } = findTicketLocation(workbook, "EARN-103")

    const findings = scanProvisionedBundleContent(workbook, ticket)

    // Own io-case answer leaked into its own setup: owner index == bundle index, not suppressed.
    expect(findings.some((f) => f.message.includes("SELF-ANSWER: mango"))).toBe(true)
    // An earlier ticket's humanName (a grading identifier, never shipped source): not suppressed.
    expect(
      findings.some((f) => f.message.includes("describeOrder omits the canonical field order"))
    ).toBe(true)
    // The earned, shipped value from the earlier ticket is NOT reported.
    expect(findings.some((f) => f.message.includes("CANONICAL-ORDER: alpha"))).toBe(false)
  })

  it("STILL FIRES: a FUTURE ticket's shipped answer visible in an earlier bundle is flagged (max-owner guard -- never suppress a future ticket's answer)", () => {
    const workbook = loadWorkbookTree(FUTURE)
    const { ticket } = findTicketLocation(workbook, "FUT-101")

    const findings = scanProvisionedBundleContent(workbook, ticket)

    expect(findings.some((f) => f.message.includes("FUTURE-VALUE: quartz"))).toBe(true)
  })
})
