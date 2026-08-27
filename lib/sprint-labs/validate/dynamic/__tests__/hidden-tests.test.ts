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

  it("reports an io-case hidden test with no entryPoint as a named, non-crashing gap -- ERROR, since DEMO-102 is ai_policy: unassisted (score-feeding)", async () => {
    const FIXTURE_WORKBOOK = join(__dirname, "../../../../../workbooks/_fixture-workbook")
    const workbook = loadWorkbookTree(FIXTURE_WORKBOOK)
    const { ticket } = findTicketLocation(workbook, "DEMO-102")
    const visibleFiles = readVisibleTestFiles(ticket)

    const bridged = bridgeHiddenTests(ticket, visibleFiles)

    expect(bridged.files).toEqual([])
    expect(bridged.paths).toEqual([])
    expect(bridged.findings).toHaveLength(2)
    for (const finding of bridged.findings) {
      expect(finding).toMatchObject({
        ruleId: "dynamic-hidden-test-not-executable",
        severity: "error",
        ticketKey: "DEMO-102",
      })
      expect(finding.message).toContain("io-case")
    }
  })
})
