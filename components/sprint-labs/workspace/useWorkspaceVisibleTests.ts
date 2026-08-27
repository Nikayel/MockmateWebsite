"use client"

/**
 * useWorkspaceVisibleTests — runs the ticket's visible tests client-side and derives the
 * `TurnStateStrip`'s never-run/running/fresh/stale state machine from REAL test state (PLAN.md
 * Task 12, UX-SPEC.md §7).
 *
 * "On resume, before the first run of the session, it reads 'Run the visible tests to refresh
 * this'... rather than showing a restored count, because a stale red count is worse than none" —
 * `status` starts at `"never-run"` every mount (nothing is restored from a prior session) and only
 * becomes `"fresh"`/`"stale"` after a real run in THIS session. `"stale"` is not a timer or a guess:
 * it is a direct comparison between the editable-file snapshot the last run actually executed
 * against and the current one, so an edit made after the last run immediately (on the next render)
 * marks the strip stale rather than showing a red count that may no longer be true.
 *
 * `redVisibleTests`/`failingCount` are exactly the data `PartnerChat`'s `getPerTurnState` prop
 * needs (`lib/sprint-labs/partner/context-layers.ts`'s `PerTurnState`, minus `turnIndex`, which
 * `PartnerChat` supplies itself) — this hook is the single source both the strip and the chat's
 * Layer D note read from, so they can never disagree about which tests are red.
 */
import { useCallback, useRef, useState } from "react"
import {
  runVisibleTests,
  type RunnableFile,
  type RunVisibleTestsSummary,
} from "@/lib/sprint-labs/workspace/run-visible-tests"
import type { WorkspaceTestResult } from "@/lib/workspace-execution/types"
import type { TurnStateStripStatus } from "./TurnStateStrip"

export interface RedVisibleTestForLayerD {
  name: string
  failingAssertion: string
}

export interface UseWorkspaceVisibleTestsResult {
  status: TurnStateStripStatus
  results: WorkspaceTestResult[]
  summary: RunVisibleTestsSummary | null
  infraError: string | null
  failingCount: number
  redVisibleTests: RedVisibleTestForLayerD[]
  run: () => Promise<void>
}

interface RunState {
  ranOnce: boolean
  running: boolean
  results: WorkspaceTestResult[]
  summary: RunVisibleTestsSummary | null
  infraError: string | null
}

const INITIAL_STATE: RunState = {
  ranOnce: false,
  running: false,
  results: [],
  summary: null,
  infraError: null,
}

function sameContent(a: Record<string, string>, b: Record<string, string>): boolean {
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) return false
  return aKeys.every((key) => a[key] === b[key])
}

/**
 * `editableFiles` is the live, reactive map (from `useSprintLabRunSync`). `fixedFiles` are the
 * ticket's locked reference files (the visible test bodies) always included in the run regardless
 * of the editable overlay. `testPaths` are those same fixed files' paths, passed to the runner.
 */
export function useWorkspaceVisibleTests(
  editableFiles: Record<string, string>,
  fixedFiles: readonly RunnableFile[],
  testPaths: readonly string[]
): UseWorkspaceVisibleTestsResult {
  const [state, setState] = useState<RunState>(INITIAL_STATE)
  const lastRunFilesRef = useRef<Record<string, string> | null>(null)

  const run = useCallback(async () => {
    setState((prev) => (prev.running ? prev : { ...prev, running: true }))
    const combined: RunnableFile[] = [
      ...fixedFiles,
      ...Object.entries(editableFiles).map(([path, content]) => ({ path, content })),
    ]
    const result = await runVisibleTests(combined, [...testPaths])
    lastRunFilesRef.current = { ...editableFiles }
    setState({
      ranOnce: true,
      running: false,
      results: result.results,
      summary: result.summary,
      infraError: result.infraError,
    })
    // fixedFiles/testPaths are recreated per-render at typical call sites; only editableFiles'
    // CONTENT is what actually changes what a run executes against, so no deep-equal dance is
    // needed here beyond React's own dependency comparison.
  }, [editableFiles, fixedFiles, testPaths])

  const isStale =
    state.ranOnce &&
    !state.running &&
    lastRunFilesRef.current !== null &&
    !sameContent(lastRunFilesRef.current, editableFiles)

  const status: TurnStateStripStatus = !state.ranOnce
    ? "never-run"
    : state.running
      ? "running"
      : isStale
        ? "stale"
        : "fresh"

  const redVisibleTests: RedVisibleTestForLayerD[] = state.results
    .filter((r) => !r.passed)
    .map((r) => ({ name: `${r.suite}: ${r.name}`, failingAssertion: r.error ?? "" }))

  return {
    status,
    results: state.results,
    summary: state.summary,
    infraError: state.infraError,
    failingCount: redVisibleTests.length,
    redVisibleTests,
    run,
  }
}
