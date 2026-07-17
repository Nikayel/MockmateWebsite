/**
 * Sealing tests (INTERVIEWER_SPEC.md "Sealing tests" + PLAN.md Sprint 1 item 7).
 * These fail CI on regression and are the definition of "provably sealed":
 *   1. the candidate-facing pack prompt never overlaps the sealed module's content;
 *   2. sealed content is imported ONLY by the server routes that need it;
 *   3. the machine cannot forward-skip, DEBRIEF needs the literal trigger, and the
 *      phase-2 payload is gated behind PHASE2.
 */

import { execSync } from "node:child_process"
import { describe, expect, it } from "vitest"
import {
  advancePackState,
  initPackProgress,
  PACK_STATES,
  type PackInput,
  type PackState,
} from "../machine"
import { buildPackStatePrompt } from "../prompt"
import { buildBugFixContext } from "@/lib/interview/chat/context-builders"
import { buildPhase2Release } from "../phase2"
import type { SealedPackContent } from "../types"

// Distinctive sealed markers — if any of these leaks into the candidate-facing prompt
// the overlap test fails.
const SEALED: SealedPackContent = {
  packId: "sealing-fixture",
  solutionMd: "SEALED_SOLUTION_PROSE",
  bugLocation: "src/rollup.py:57",
  bugSummary: "SEALED_BUG_dedup_scoped_per_stream_instead_of_cross_stream",
  minimalFix: "SEALED_FIX_dedup_before_splitting_the_streams",
  survivalStory: "SEALED_SURVIVAL",
  redHerrings: [
    {
      location: "src/rollup.py:12",
      looksWrongBecause: "string timestamp sort",
      provablyInnocentBecause: "SEALED_HERRING_iso8601_fixed_width",
    },
  ],
  complexityAnswer: { time: "O(n log n)", space: "O(n)", dominantCost: "SEALED_DOMINANT_sort" },
  phase2: {
    specPatch: "SEALED_PHASE2_SPEC",
    fixturePatch: "SEALED_PHASE2_FIXTURE",
    expectedOutputV2: "SEALED_PHASE2_V2\n",
  },
  buggyOutput: "SEALED_BUGGY_OUTPUT\n",
  debriefRubric: ["SEALED_RUBRIC"],
}

const SEALED_MARKERS = [
  SEALED.solutionMd,
  SEALED.bugLocation,
  SEALED.bugSummary,
  SEALED.minimalFix,
  SEALED.survivalStory,
  SEALED.redHerrings[0].provablyInnocentBecause,
  SEALED.complexityAnswer.dominantCost,
  SEALED.phase2.specPatch,
  SEALED.phase2.fixturePatch,
  SEALED.phase2.expectedOutputV2.trim(),
  SEALED.buggyOutput.trim(),
  SEALED.debriefRubric[0],
]

describe("Sealing test 1 — candidate-facing prompt never overlaps sealed content", () => {
  it("no state's prompt block (any hint level) contains any sealed marker", () => {
    for (const state of PACK_STATES) {
      for (let hintLevel = 0; hintLevel <= 3; hintLevel++) {
        const block = buildPackStatePrompt(state, hintLevel)
        for (const marker of SEALED_MARKERS) {
          expect(block).not.toContain(marker)
        }
      }
    }
  })

  it("the full injected bugFixContext for a pack contains no sealed marker", () => {
    for (const state of PACK_STATES) {
      const { bugFixContext } = buildBugFixContext("bugfix", undefined, { state, hintLevel: 3 })
      for (const marker of SEALED_MARKERS) {
        expect(bugFixContext).not.toContain(marker)
      }
    }
  })

  it("the persona explicitly forbids revealing the bug, fix, or red-herring verdicts", () => {
    const block = buildPackStatePrompt("SCOPE", 0)
    expect(block.toLowerCase()).toContain("never")
    expect(block.toLowerCase()).toContain("red herring")
  })
})

describe("Sealing test 2 — sealed content is imported only by server routes", () => {
  const ALLOWED_IMPORTERS = new Set([
    "app/api/feedback/stream/route.ts",
    "app/api/interview/pack/phase2/route.ts",
    "app/api/interview/pack/advance/route.ts",
  ])

  function grepImporters(pattern: string): string[] {
    try {
      const out = execSync(
        `grep -rlE --include=*.ts --include=*.tsx "${pattern}" app components lib hooks 2>/dev/null || true`,
        { cwd: process.cwd(), encoding: "utf8" }
      )
      return out
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    } catch {
      return []
    }
  }

  it("only the whitelisted server routes import the sealed registry loader", () => {
    const importers = grepImporters("scenarios/sealed/registry.server").filter(
      (path) => !path.includes("__tests__") && !path.startsWith("lib/scenarios/sealed/")
    )
    for (const importer of importers) {
      expect(ALLOWED_IMPORTERS.has(importer)).toBe(true)
    }
  })

  it("no client component imports any sealed module (alias OR relative path)", () => {
    // Match any import of a sealed .server module regardless of prefix — the alias
    // (@/lib/scenarios/sealed/x.server), a cross-dir relative (../../scenarios/sealed/x.server),
    // or a sibling relative (../sealed/x.server). The old check matched only the alias, so a
    // relative import could smuggle sealed string literals into a client bundle undetected.
    const importers = grepImporters("sealed/[a-zA-Z0-9_-]+\\.server").filter(
      (path) => !path.includes("__tests__") && !path.startsWith("lib/scenarios/sealed/")
    )
    for (const importer of importers) {
      const contents = execSync(`cat "${importer}"`, { cwd: process.cwd(), encoding: "utf8" })
      expect(contents.includes('"use client"'), `${importer} imports sealed content`).toBe(false)
    }
  })
})

describe("Sealing test 3 — no forward skip, DEBRIEF gated, phase-2 gated", () => {
  const RUN_MISMATCH: PackInput = { kind: "run", matchedOracle: false }
  const RUN_MATCH: PackInput = { kind: "run", matchedOracle: true }
  const RUN_V2: PackInput = { kind: "run", matchedOracle: false, matchedOracleV2: true }
  const ADVANCE: PackInput = { kind: "advance", evidence: "quoted" }
  const DEBRIEF: PackInput = { kind: "debrief-trigger", phrase: "debrief me" }

  it("drives all 10 states only when each exit condition is met, never skipping", () => {
    let p = initPackProgress()
    const script: PackInput[] = [
      ADVANCE,
      RUN_MISMATCH,
      ADVANCE,
      ADVANCE,
      ADVANCE,
      RUN_MATCH,
      ADVANCE,
      RUN_V2,
      DEBRIEF,
    ]
    const visited: PackState[] = [p.state]
    for (const step of script) {
      p = advancePackState(p, step).progress
      visited.push(p.state)
    }
    expect(visited).toEqual([...PACK_STATES])
  })

  it("phase-2 payload is NOT released before PHASE2 and IS at PHASE2", () => {
    let p = initPackProgress()
    for (const step of [ADVANCE, RUN_MISMATCH, ADVANCE, ADVANCE, ADVANCE]) {
      p = advancePackState(p, step).progress
    }
    expect(p.state).toBe("FIX")
    expect(buildPhase2Release(p, SEALED).released).toBe(false) // before PHASE2 → 403 territory

    for (const step of [RUN_MATCH, ADVANCE]) {
      p = advancePackState(p, step).progress
    }
    expect(p.state).toBe("PHASE2")
    expect(buildPhase2Release(p, SEALED).released).toBe(true)
  })

  it("DEBRIEF is unreachable without the literal trigger", () => {
    let p = initPackProgress()
    for (const step of [
      ADVANCE,
      RUN_MISMATCH,
      ADVANCE,
      ADVANCE,
      ADVANCE,
      RUN_MATCH,
      ADVANCE,
      RUN_V2,
    ]) {
      p = advancePackState(p, step).progress
    }
    expect(p.state).toBe("SCALE")
    expect(advancePackState(p, ADVANCE).progress.state).toBe("SCALE")
    expect(advancePackState(p, DEBRIEF).progress.state).toBe("DEBRIEF")
  })
})
