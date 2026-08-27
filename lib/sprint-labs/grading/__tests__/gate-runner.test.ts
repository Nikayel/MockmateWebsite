/**
 * Tests for the hidden-gate runner: the server-side comparison D1 depends on
 * (docs/sprint-labs/EXECUTION-STATE.md). Given the sealed hidden cases, which
 * io-case ids this attempt's variant issued, and what the client posted back
 * (raw outputs for io-cases, booleans for probes), it produces the
 * whitelist-projected `GateResult` plus the SCORED counts (io-case only) and
 * the escaped-defects list (io-case only — see gate-runner.ts's file header
 * for why probes never touch either).
 */

import { describe, expect, it } from "vitest"
import type { SealedHiddenCase } from "@/lib/scenarios/sealed/sprint-labs/types"
import { runHiddenGate } from "../gate-runner"

const IO_CASE_A: SealedHiddenCase = {
  id: "case-a",
  humanName: "Escaped: a boolean amount is still accepted",
  tags: ["typed-boundaries"],
  kind: "io-case",
  input: { amount: true },
  expected: { ok: false, reason: "amount must be a finite number" },
}

const IO_CASE_B: SealedHiddenCase = {
  id: "case-b",
  humanName: "Escaped: v2 silently accepts page",
  tags: ["contract-versioning"],
  kind: "io-case",
  input: { path: "/v2/claims?page=2" },
  expected: { status: 400 },
}

const PROBE_CASE: SealedHiddenCase = {
  id: "probe-a",
  humanName: "Escaped: a boolean amount is still accepted as a claim amount",
  tags: ["typed-boundaries"],
  kind: "probe",
  body: 'assert(false, "placeholder")',
}

describe("runHiddenGate", () => {
  it("a correct client-posted output for an issued io-case passes, and does not appear in escapedDefects", () => {
    const result = runHiddenGate({
      hiddenCases: [IO_CASE_A],
      issuedIoCaseIds: ["case-a"],
      ioCaseOutputs: { "case-a": { ok: false, reason: "amount must be a finite number" } },
      probeResults: {},
    })
    expect(result.gateResult).toEqual({
      gate: "hidden",
      cases: [{ testId: "case-a", humanName: IO_CASE_A.humanName, passed: true }],
    })
    expect(result.scoredPassed).toBe(1)
    expect(result.scoredTotal).toBe(1)
    expect(result.escapedDefects).toEqual([])
  })

  it("a wrong client-posted output for an issued io-case fails and is named in escapedDefects", () => {
    const result = runHiddenGate({
      hiddenCases: [IO_CASE_A],
      issuedIoCaseIds: ["case-a"],
      ioCaseOutputs: { "case-a": { ok: true, value: { amount: true } } },
      probeResults: {},
    })
    expect(result.gateResult.cases).toEqual([
      { testId: "case-a", humanName: IO_CASE_A.humanName, passed: false },
    ])
    expect(result.scoredPassed).toBe(0)
    expect(result.scoredTotal).toBe(1)
    expect(result.escapedDefects).toEqual([IO_CASE_A.humanName])
  })

  it("an issued io-case with NO posted output at all counts as failed, not skipped (closes the omit-what-you're-unsure-of gap)", () => {
    const result = runHiddenGate({
      hiddenCases: [IO_CASE_A],
      issuedIoCaseIds: ["case-a"],
      ioCaseOutputs: {},
      probeResults: {},
    })
    expect(result.gateResult.cases).toEqual([
      { testId: "case-a", humanName: IO_CASE_A.humanName, passed: false },
    ])
    expect(result.scoredTotal).toBe(1)
    expect(result.escapedDefects).toEqual([IO_CASE_A.humanName])
  })

  it("an io-case NOT in the issued set is entirely omitted, even if the client posted an output for it anyway", () => {
    const result = runHiddenGate({
      hiddenCases: [IO_CASE_A, IO_CASE_B],
      issuedIoCaseIds: ["case-a"], // case-b held back / not this variant
      ioCaseOutputs: {
        "case-a": { ok: false, reason: "amount must be a finite number" },
        "case-b": { status: 400 }, // client fabricated this — must not count
      },
      probeResults: {},
    })
    expect(result.gateResult.cases).toEqual([
      { testId: "case-a", humanName: IO_CASE_A.humanName, passed: true },
    ])
    expect(result.scoredTotal).toBe(1) // case-b never enters the denominator
  })

  it("a fabricated probe 'pass' cannot alter an io-case verdict (separate channels)", () => {
    const result = runHiddenGate({
      hiddenCases: [IO_CASE_A, PROBE_CASE],
      issuedIoCaseIds: ["case-a"],
      ioCaseOutputs: { "case-a": { ok: true, value: {} } }, // WRONG output -> should fail
      probeResults: { "probe-a": true }, // client claims the probe passed
    })
    const ioCaseEntry = result.gateResult.cases.find((c) => c.testId === "case-a")
    expect(ioCaseEntry?.passed).toBe(false)
    expect(result.scoredPassed).toBe(0)
    expect(result.scoredTotal).toBe(1) // the probe never enters the io-case denominator
    expect(result.escapedDefects).toEqual([IO_CASE_A.humanName])
  })

  it("probe results are display-only: included in gateResult.cases but never counted in scoredPassed/scoredTotal/escapedDefects", () => {
    const result = runHiddenGate({
      hiddenCases: [PROBE_CASE],
      issuedIoCaseIds: [],
      ioCaseOutputs: {},
      probeResults: { "probe-a": false },
    })
    expect(result.gateResult.cases).toEqual([
      { testId: "probe-a", humanName: PROBE_CASE.humanName, passed: false },
    ])
    expect(result.scoredTotal).toBe(0)
    expect(result.scoredPassed).toBe(0)
    expect(result.escapedDefects).toEqual([]) // probes never populate the (io-case-only) escaped-defects list
  })

  it("a probe with no client-reported result at all is omitted from gateResult.cases entirely (not defaulted to failed)", () => {
    const result = runHiddenGate({
      hiddenCases: [PROBE_CASE],
      issuedIoCaseIds: [],
      ioCaseOutputs: {},
      probeResults: {},
    })
    expect(result.gateResult.cases).toEqual([])
  })

  it("the projection NEVER includes runner output: no `expected`, `input`, `body`, or any key beyond testId/humanName/passed", () => {
    const result = runHiddenGate({
      hiddenCases: [IO_CASE_A],
      issuedIoCaseIds: ["case-a"],
      ioCaseOutputs: { "case-a": { ok: true } },
      probeResults: {},
    })
    for (const gateCase of result.gateResult.cases) {
      expect(Object.keys(gateCase).sort()).toEqual(["humanName", "passed", "testId"])
    }
  })

  it("scores and displays multiple issued io-cases together, independently", () => {
    const result = runHiddenGate({
      hiddenCases: [IO_CASE_A, IO_CASE_B],
      issuedIoCaseIds: ["case-a", "case-b"],
      ioCaseOutputs: {
        "case-a": { ok: false, reason: "amount must be a finite number" }, // correct
        "case-b": { status: 200 }, // wrong (expected 400)
      },
      probeResults: {},
    })
    expect(result.scoredTotal).toBe(2)
    expect(result.scoredPassed).toBe(1)
    expect(result.escapedDefects).toEqual([IO_CASE_B.humanName])
  })

  it("returns a fully empty result for a ticket with no hidden cases at all", () => {
    const result = runHiddenGate({
      hiddenCases: [],
      issuedIoCaseIds: [],
      ioCaseOutputs: {},
      probeResults: {},
    })
    expect(result).toEqual({
      gateResult: { gate: "hidden", cases: [] },
      scoredPassed: 0,
      scoredTotal: 0,
      escapedDefects: [],
    })
  })
})
