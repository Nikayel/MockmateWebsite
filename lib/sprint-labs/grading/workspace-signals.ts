/**
 * Server-derived workspace signals (RULING R21, fix round 1): replaces the
 * retired client-posted `filesTouched` / `diffLineCount` / `learnerAddedTest`
 * / `timeToFirstEditSeconds` request fields with facts read from data the
 * server already owns — `sprintLabRuns/{runId}/files` (via `runs.ts`'s
 * `listWorkspaceFiles`, the caller's job to fetch) and, where available,
 * server timestamps.
 *
 * ## Honest limitation, disclosed in the Task 8 report
 *
 * R21 asks this to "compare stored file contents/revisions against the
 * compiled seed file map." No such compiled seed file map exists anywhere in
 * this codebase as of this writing — grepped `scripts/compile-workbooks.mjs`,
 * `lib/sprint-labs/content/**`, and `lib/scenarios/sealed/sprint-labs/**`;
 * none emit one. Building one is Task 2/15's compiler territory, out of this
 * task's owned paths.
 *
 * This module instead uses the one server-authoritative fact that DOES exist
 * without a seed map: the client's save flow is dirty-path-tracked ("only
 * changed files post" — PLAN.md Task 6, `runs-client.ts`), so a path's mere
 * PRESENCE in the files subcollection already means the learner touched it.
 * Nothing here trusts a client-posted list, count, or boolean — every value
 * is derived from documents `runs.ts`'s server-stamped write path produced.
 *
 * `diffLineCount` is consequently an APPROXIMATION (current line count summed
 * across touched files, not a true seed-diff line count) until a real seed
 * map lands, at which point only this module needs to change — no caller
 * does. Similarly, `deriveTimeToFirstEditSeconds` needs a per-ticket
 * "entered doing at" timestamp that `SprintLabRun` (`lib/sprint-labs/
 * types.ts`, Task 1/6, frozen/out of scope) does not currently store — only
 * a whole-run `updatedAt` that every mutation overwrites. Until Task 6 adds
 * one, `enteredDoingAt` is always `null` in practice and this function always
 * returns `null`, which is the ruling's own documented graceful-degradation
 * path (Understanding's time-band term drops out and renormalizes).
 */

/** Paths this codebase treats as test files, matching the convention already visible in compiled `visibleTestFiles` (e.g. `claims-parser.test.ts`) and common `tests?/`/`__tests__/` directory layouts. */
const TEST_PATH_PATTERN = /(^|\/)(tests?|__tests__)\/|\.test\.[jt]sx?$|\.spec\.[jt]sx?$/

export interface WorkspaceFileLike {
  path: string
  content: string
}

export interface WorkspaceSignals {
  /** Every path present in the run's file store — server-verified by construction (see file header), never a client-asserted list. */
  filesTouched: string[]
  /** Approximate size signal — see file header for why this is not yet a true seed-diff line count. */
  diffLineCount: number
  /** True iff any touched path matches {@link TEST_PATH_PATTERN}. */
  learnerAddedTest: boolean
}

function countLines(content: string): number {
  if (content.length === 0) return 0
  return content.split("\n").length
}

export function deriveWorkspaceSignals(files: readonly WorkspaceFileLike[]): WorkspaceSignals {
  const filesTouched = files.map((f) => f.path).sort()
  const diffLineCount = files.reduce((sum, f) => sum + countLines(f.content), 0)
  const learnerAddedTest = files.some((f) => TEST_PATH_PATTERN.test(f.path))
  return { filesTouched, diffLineCount, learnerAddedTest }
}

export interface TimeToFirstEditInput {
  /** ISO timestamp of when this ticket entered "doing" on the board, or `null` when that mark does not exist yet (currently always, see file header). */
  enteredDoingAt: string | null
  /** ISO `updatedAt` timestamps of every file in the run's store, any order. */
  fileUpdatedAts: readonly string[]
}

/**
 * Seconds from `enteredDoingAt` to the first file update AT OR AFTER it —
 * ignoring any update that predates the ticket starting (stale activity from
 * earlier work on a DIFFERENT ticket, not evidence about this one). `null`
 * when either side of that comparison is missing.
 */
export function deriveTimeToFirstEditSeconds(input: TimeToFirstEditInput): number | null {
  if (input.enteredDoingAt === null) return null
  const startMs = new Date(input.enteredDoingAt).getTime()

  let earliestAfterStart: number | null = null
  for (const updatedAt of input.fileUpdatedAts) {
    const ms = new Date(updatedAt).getTime()
    if (ms < startMs) continue
    if (earliestAfterStart === null || ms < earliestAfterStart) earliestAfterStart = ms
  }
  if (earliestAfterStart === null) return null

  return Math.round((earliestAfterStart - startMs) / 1000)
}
