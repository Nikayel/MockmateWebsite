/**
 * Bugfix pack contract (Sprint 1, item 1 of future-sprints/PLAN.md).
 *
 * A "pack" is a SEALED, STDOUT-ORACLE variant of the existing BugFixScenario engine
 * (see future-sprints/INTERVIEWER_SPEC.md + PACK_REALISM_GUIDE.md). Unlike the legacy
 * assert-based real-world scenarios, a pack is verified by character-exact stdout
 * comparison against a PUBLIC oracle, and its solution is physically sealed into a
 * server-only module instead of shipping in the client bundle.
 *
 * This file is CLIENT-SAFE: it defines only types (erased at compile time) plus the
 * client-safe `BugfixPack` shape. The sealed DATA lives in
 * `lib/scenarios/sealed/<pack-id>.server.ts` behind `import "server-only"`. The
 * `SealedPackContent` interface lives here because interfaces do not ship in the
 * bundle — only the concrete sealed values are server-only.
 */

import type { Company } from "@/lib/scenarios/types"

/**
 * Company profiles enumerated in PACK_REALISM_GUIDE.md §1. `generic-fdse` is the
 * fallback for packs imitating the genre without a specific, researched company claim.
 */
export type PackCompanyTag =
  | "palantir-fdse"
  | "stripe-bug-squash"
  | "datadog-debugging"
  | "generic-fdse"

/** "researched" = grounded in cited sources; "styled" = imitating the pattern. */
export type PackConfidence = "researched" | "styled"

/** Bug taxonomy from PACK_REALISM_GUIDE.md §3 — pick exactly one per pack. */
export type PackBugClass =
  | "accumulator-wrong-scope"
  | "off-by-one-window"
  | "double-count"
  | "wrong-dedup-key"
  | "mutation-during-iteration"
  | "order-dependence"
  | "silent-boundary"

/** 1 = intern, 2 = new grad, 3 = industry (PACK_REALISM_GUIDE.md §3 calibration). */
export type PackDifficulty = 1 | 2 | 3

/**
 * Packs run under Pyodide client-side; only stdlib Python is available in the runner
 * (PACK_REALISM_GUIDE.md §7). Kept as a union so a JS-based pack variant can be added
 * later without reshaping consumers.
 */
export type PackLanguage = "python"

export interface PackCompany {
  tag: PackCompanyTag
  /** e.g. "Re-engineering / debugging round". */
  roundName: string
  confidence: PackConfidence
  /** One line: what makes this round distinctive. Cite sources when researched. */
  notes?: string
}

export interface PackSourceFile {
  /** Workspace-relative path, e.g. "src/main.py". */
  path: string
  /** The working-looking (buggy) source, exactly as shipped to the candidate. */
  content: string
}

export interface PackFixtureFile {
  /** Workspace-relative path, e.g. "fixtures/input.txt". */
  path: string
  /** Plain UTF-8 fixture text; may contain realistic noise the correct code tolerates. */
  content: string
}

/**
 * The CLIENT-SAFE half of a pack: everything the candidate is allowed to see.
 * Contains NO solution, NO phase-2 payload, and NO buggy-output commentary — those
 * live only in the sealed module. The `expectedOutput` oracle IS public (it is the
 * candidate's diffing tool, embedded in task.md).
 */
export interface BugfixPack {
  id: string
  title: string
  /** One-line, symptom-only incident summary for cards. Must not name the bug/fix. */
  summary: string
  /**
   * The one-sentence job, in the product's own terms, for the brief's task box.
   *
   * Authored per pack. This slot used to hold a template whose only variable was the
   * run command, so all 14 packs told the candidate the same thing: "make stdout
   * match byte-for-byte" — the grading mechanism, not the job, and already stated in
   * `successCriteria` one line below.
   *
   * Authoring rule (PACK_REALISM_GUIDE §9): state the JOB and add no fact that the
   * public `## Data contract` does not already state. Never single out one contract
   * clause — that points at the defect's terrain. Deletion test: if removing the
   * sentence would make the fault harder to find, it is a hint, not a spec.
   */
  task: string
  company: PackCompany
  /** Company-union tags for BugFixScenario registration + card display. */
  companies: Company[]
  domain: string
  language: PackLanguage
  difficulty: PackDifficulty
  estMinutes: number
  /**
   * task.md content: the spec, the run command, and the EXACT expected-output block.
   * PUBLIC, candidate-visible content — sealing applies to solution.md/phase-2 only.
   */
  taskMd: string
  /** The working-looking (buggy) source, 1–2 files, 60–120 lines total. */
  srcFiles: PackSourceFile[]
  /** Input fixtures the candidate runs against. */
  fixtures: PackFixtureFile[]
  /** e.g. "python3 src/main.py fixtures/input.txt". */
  runCmd: string
  /** The exact correct stdout — the PUBLIC oracle, also embedded in `taskMd`. */
  expectedOutput: string
}

export interface PackRedHerring {
  /** Where the suspicious code is, e.g. "src/main.py:42" or a short description. */
  location: string
  /** Why it draws a suspicious stare. */
  looksWrongBecause: string
  /** Why it is provably fine under the documented data contract. */
  provablyInnocentBecause: string
}

/**
 * The phase-2 twist (PACK_REALISM_GUIDE.md §5). The data needed for the new
 * requirement must ALREADY exist in the buggy program's dataflow and be thrown away;
 * `fixturePatch` must leave v1 output unchanged when run against unadapted code.
 */
export interface PackPhase2 {
  /** The added requirement text ("ops also needs X"). */
  specPatch: string
  /** Extra fixture content appended for the twist. */
  fixturePatch: string
  /** Exact stdout after the fix + the phase-2 adaptation. */
  expectedOutputV2: string
}

/**
 * The SEALED half of a pack: never candidate-visible, never in the interviewer
 * model's context before the literal "debrief me" trigger. The concrete value of this
 * interface is exported only from `lib/scenarios/sealed/<pack-id>.server.ts`.
 */
export interface SealedPackContent {
  packId: string
  /**
   * The bug's category ("off-by-one-window", "wrong-dedup-key", ...).
   *
   * Sealed, not client-safe. It used to ship in the compiled client module, where
   * nothing rendered it but anyone could read `bugClass: "order-dependence"` out of
   * the bundle — a direct category hint for the fault the pack exists to hide. It is
   * authoring/coverage metadata (see packs/INDEX.md), which reads it from
   * manifest.json, not from the client module.
   */
  bugClass: PackBugClass
  /** Full solution.md prose (bug, minimal fix, symptom explanation, complexity, phase-2 path). */
  solutionMd: string
  /** "src/main.py:57" — the intended bug location. */
  bugLocation: string
  /** One sentence stating the bug. */
  bugSummary: string
  /** The minimal fix (diff or precise description). */
  minimalFix: string
  /** Why this bug plausibly passed code review (PACK_REALISM_GUIDE.md §2.4). */
  survivalStory: string
  /** At least one reachable, provably-innocent suspect (PACK_REALISM_GUIDE.md §4). */
  redHerrings: PackRedHerring[]
  complexityAnswer: {
    time: string
    space: string
    /** The dominant cost the candidate must find themselves (usually the sort). */
    dominantCost: string
  }
  phase2: PackPhase2
  /** The exact wrong stdout as shipped (buggy). */
  buggyOutput: string
  /** Debrief rubric notes (feeds the DEBRIEF state; exactly one drill recommended). */
  debriefRubric: string[]
}
