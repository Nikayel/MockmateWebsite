import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { runTsWorkspace } from "@/lib/workspace-execution/ts-workspace/node-harness"

import { loadWorkbookTree } from "../../load-tree"
import { bridgeHiddenTests, readVisibleTestFiles } from "../hidden-tests"
import { findTicketLocation } from "../materialize"

const FIXTURES = join(__dirname, "fixtures")

describe("readVisibleTestFiles", () => {
  it("reads a ticket's tests/visible/*.test.ts, re-rooted at tests/visible/...", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "happy-path"))
    const { ticket } = findTicketLocation(workbook, "FIX-101")

    const files = readVisibleTestFiles(ticket)

    expect(files).toHaveLength(1)
    expect(files[0].path).toBe("tests/visible/add.test.ts")
    expect(files[0].content).toContain('import { add } from "../../../src/math"')
  })
})

describe("bridgeHiddenTests", () => {
  it("synthesizes a runnable .test.ts for a probe, reusing the visible test's own named-import lines verbatim", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "happy-path"))
    const { ticket } = findTicketLocation(workbook, "FIX-101")
    const visibleFiles = readVisibleTestFiles(ticket)

    const bridged = bridgeHiddenTests(ticket, visibleFiles)

    expect(bridged.findings).toEqual([])
    expect(bridged.paths).toEqual(["tests/hidden/rejects-double-negative.test.ts"])
    expect(bridged.files[0].content).toContain('import { add } from "../../../src/math"')
    expect(bridged.files[0].content).toContain('const assert = require("assert")')
    expect(bridged.files[0].content).toContain("adding two negatives should sum correctly")
  })

  it("the synthesized file actually RUNS and is marked isHidden via runTsWorkspace, both red (buggy source) and green (fixed source)", async () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "happy-path"))
    const { ticket } = findTicketLocation(workbook, "FIX-101")
    const visibleFiles = readVisibleTestFiles(ticket)
    const bridged = bridgeHiddenTests(ticket, visibleFiles)

    const buggySource = {
      path: "src/math.ts",
      content:
        "export function add(a: number, b: number): number { return Math.abs(a) + Math.abs(b) }\n",
    }
    const fixedSource = {
      path: "src/math.ts",
      content: "export function add(a: number, b: number): number { return a + b }\n",
    }

    const redResult = await runTsWorkspace({
      files: [buggySource, ...visibleFiles, ...bridged.files],
      testPaths: visibleFiles.map((f) => f.path),
      hiddenTestPaths: bridged.paths,
    })
    const redHidden = redResult.results.find((r) => r.isHidden)
    expect(redHidden).toMatchObject({ passed: false, suite: "hidden" })

    const greenResult = await runTsWorkspace({
      files: [fixedSource, ...visibleFiles, ...bridged.files],
      testPaths: visibleFiles.map((f) => f.path),
      hiddenTestPaths: bridged.paths,
    })
    const greenHidden = greenResult.results.find((r) => r.isHidden)
    expect(greenHidden).toMatchObject({ passed: true, suite: "hidden" })
  })

  it("bridges an io-case WITH a real entryPoint into a runnable file, zero gaps (real content: DEMO-102, review round 2)", async () => {
    const FIXTURE_WORKBOOK = join(__dirname, "../../../../../workbooks/_fixture-workbook")
    const workbook = loadWorkbookTree(FIXTURE_WORKBOOK)
    const { ticket } = findTicketLocation(workbook, "DEMO-102")
    const visibleFiles = readVisibleTestFiles(ticket)

    const bridged = bridgeHiddenTests(ticket, visibleFiles)

    expect(bridged.findings).toEqual([])
    expect(bridged.paths.sort()).toEqual([
      "tests/hidden/v1-still-accepts-page.test.ts",
      "tests/hidden/v2-rejects-page.test.ts",
    ])
    const v1File = bridged.files.find(
      (f) => f.path === "tests/hidden/v1-still-accepts-page.test.ts"
    )
    // Two levels up (tests/hidden -> tests -> root), the mathematically minimal relative path --
    // NOT the three-up convention DEMO-101's/DEMO-102's own hand-authored visible tests happen to
    // use, which only resolves because the require-graph tolerates excess ".." as a no-op past an
    // empty stack (see computeRelativeImportPath's own doc comment in hidden-tests.ts).
    expect(v1File?.content).toContain(
      'import { compatibilityDescriptor } from "../../src/http/compatibility-descriptor"'
    )
    expect(v1File?.content).toContain('const assert = require("assert")')
    expect(v1File?.content).toContain('const input = "v1"')
    expect(v1File?.content).toContain("await compatibilityDescriptor(input)")
  })

  it("reports an io-case hidden test with NO entryPoint as a named, non-crashing gap -- WARN for assisted, ERROR for a score-feeding policy", () => {
    const ioCaseHidden = {
      fileName: "no-entry-point",
      path: "/dev/null",
      raw: {
        humanName: "Escaped: no entry point authored",
        kind: "io-case",
        input: 1,
        expected: 2,
      },
      humanName: "Escaped: no entry point authored",
      kind: "io-case",
      tags: [],
    }
    const baseTicket = {
      key: "T-1",
      dirPath: join(FIXTURES, "happy-path/sprints/01-only/tickets/FIX-101"),
      sprintNumber: 1,
      frontmatterRaw: {},
      bodyMd: "",
      labels: [],
      objectives: [],
      acceptanceCriteria: [],
      setupDiff: null,
      referenceDiff: null,
      authorBriefRaw: null,
      hiddenTests: [ioCaseHidden],
    }

    const assistedBridged = bridgeHiddenTests({ ...baseTicket, aiPolicy: "assisted" }, [])
    expect(assistedBridged.files).toEqual([])
    expect(assistedBridged.findings).toEqual([
      expect.objectContaining({ ruleId: "dynamic-hidden-test-not-executable", severity: "warn" }),
    ])

    const unassistedBridged = bridgeHiddenTests({ ...baseTicket, aiPolicy: "unassisted" }, [])
    expect(unassistedBridged.findings).toEqual([
      expect.objectContaining({ ruleId: "dynamic-hidden-test-not-executable", severity: "error" }),
    ])

    const reviewOnlyBridged = bridgeHiddenTests({ ...baseTicket, aiPolicy: "review-only" }, [])
    expect(reviewOnlyBridged.findings).toEqual([
      expect.objectContaining({ ruleId: "dynamic-hidden-test-not-executable", severity: "error" }),
    ])
  })
})
