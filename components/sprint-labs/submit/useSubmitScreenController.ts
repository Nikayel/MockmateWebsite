"use client"

/**
 * useSubmitScreenController — screen 7's data/orchestration (UX-SPEC.md §8).
 *
 * Owns the whole open -> complete -> board-walk sequence for one ticket. A
 * cached completed outcome (same tab, from an earlier visit — see
 * `attempt-client.ts`'s file header on why the cache exists) short-circuits
 * straight to `"active"` with the real gate results; otherwise the screen
 * shows an explicit pre-run confirmation (`"confirm-first"` for a genuinely
 * new attempt, `"confirm-practice"` when the board says this ticket already
 * has a finalized result this tab cannot see) and only calls the network on
 * an explicit `start()`.
 *
 * ## The gate-execution seam (Task 13 report, item 1 — now wired, runtimeB task)
 *
 * `completeAttempt` is now called with the REAL `ioCaseOutputs` the client-side io-case executor
 * (`lib/sprint-labs/runtime/io-case-executor.ts`) produces by running the learner's CURRENT
 * workspace files (seed + saved overlay — `fetchSprintLabWorkspaceFiles` +
 * `reassembleWorkspaceFiles`, the same recipe `useSprintLabRunSync` uses for the workspace screen)
 * against every io-case the open call issued. This never compares to an expected value client-side
 * — the executor has no expecteds, only raw outputs; `gate-runner.ts` (server-side) is the only
 * place a real comparison happens. `probeResults`/`visibleResults`/`regressionResults`/
 * `adversaryResults` are still not wired here (out of this task's scope — see
 * task-runtimeB-report.md), so the visible/regression/adversary gates still read as `"errored"`;
 * only the HIDDEN gate is now fed real per-case outputs.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import type { AiPolicy, GateResult, TicketBoardStatus } from "@/lib/sprint-labs/types"
import {
  fetchSprintLabWorkspaceFiles,
  reassembleWorkspaceFiles,
} from "@/lib/sprint-labs/runs-client"
import { runIoCases, toIoCaseOutputs } from "@/lib/sprint-labs/runtime/io-case-executor"
import {
  cacheCompletedOutcome,
  completeAttempt,
  ensureBoardAtLeast,
  getCachedCompletedOutcome,
  openAttempt,
  type CachedAttempt,
} from "./attempt-client"

/**
 * No compiled field carries a ticket's editable `src/` seed content yet (the same documented gap
 * `WorkspaceView.tsx`'s own header names) — an empty seed here is not a shortcut, it is the ONLY
 * correct value today. Reassembling against it (rather than against the overlay alone) means this
 * call site lights up unchanged the moment that field exists, exactly like `WorkspaceView.tsx`'s
 * own `EMPTY_SOURCE_SEED`.
 */
const EMPTY_SOURCE_SEED: Array<{ path: string; content: string }> = []

export type SubmitPhase =
  | "loading"
  | "confirm-first"
  | "confirm-practice"
  | "active"
  | "budget-exceeded"
  | "cooldown"
  | "error"

export interface SubmitScreenState {
  phase: SubmitPhase
  gateResults: GateResult[] | null
  escapedDefects: string[]
  aiPolicy: AiPolicy | null
  /** The server's own authoritative signal: true on exactly the first completion ever for this
   *  ticket, false on every later (practice) re-attempt. `null` before any result has landed. */
  finalized: boolean | null
  submissionsRemaining: number | null
  reviewComments: Array<{ id: string; body: string }> | null
  errorMessage: string | null
  /** Live, ticking seconds remaining. Only meaningful in the `"cooldown"` phase. */
  cooldownSecondsRemaining: number
  start: () => void
  retry: () => void
}

export interface UseSubmitScreenControllerInput {
  runId: string | null
  ticketKey: string
  boardStatus: TicketBoardStatus | null
}

export function useSubmitScreenController({
  runId,
  ticketKey,
  boardStatus,
}: UseSubmitScreenControllerInput): SubmitScreenState {
  const [phase, setPhase] = useState<SubmitPhase>("loading")
  const [cached, setCached] = useState<CachedAttempt | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [cooldownDeadline, setCooldownDeadline] = useState<number | null>(null)
  const [cooldownSecondsRemaining, setCooldownSecondsRemaining] = useState(0)
  const startedForRef = useRef<string | null>(null)

  // Resolve the initial phase once run + board data are available.
  useEffect(() => {
    if (runId === null || boardStatus === null) return
    if (startedForRef.current === `${runId}:${ticketKey}`) return

    startedForRef.current = `${runId}:${ticketKey}`
    const existing = getCachedCompletedOutcome(runId, ticketKey)
    if (existing) {
      setCached(existing)
      setPhase("active")
      return
    }
    setPhase(
      boardStatus === "review" || boardStatus === "done" ? "confirm-practice" : "confirm-first"
    )
  }, [runId, boardStatus, ticketKey])

  // Live cooldown countdown.
  useEffect(() => {
    if (phase !== "cooldown" || cooldownDeadline === null) return
    const tick = () => {
      setCooldownSecondsRemaining(Math.max(0, Math.round((cooldownDeadline - Date.now()) / 1000)))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [phase, cooldownDeadline])

  const runAttempt = useCallback(async () => {
    if (runId === null) return
    startedForRef.current = `${runId}:${ticketKey}`
    setPhase("active")
    setCached(null)
    setErrorMessage(null)

    const opened = await openAttempt({ runId, ticketKey })
    if (!opened.ok) {
      if (opened.error === "BUDGET_EXCEEDED") {
        setPhase("budget-exceeded")
        return
      }
      if (opened.error === "COOLDOWN_ACTIVE") {
        setCooldownDeadline(Date.now() + (opened.retryAfterSeconds ?? 60) * 1000)
        setPhase("cooldown")
        return
      }
      setErrorMessage("Couldn't start this submission.")
      setPhase("error")
      return
    }

    // Real execution — see file header. Runs the LEARNER's current workspace code against every
    // issued io-case; never the reference solution, never a comparison (the client has no
    // expecteds). A load failure degrades to an empty file set rather than aborting the submit —
    // every issued case then reports its own "did not run" captured error (still never a crash),
    // consistent with how a genuinely-missing file already reads server-side.
    const filesResult = await fetchSprintLabWorkspaceFiles(runId)
    const workspaceFiles = reassembleWorkspaceFiles(
      EMPTY_SOURCE_SEED,
      filesResult.ok ? filesResult.files : []
    )
    const executions = await runIoCases(workspaceFiles, opened.data.ioCases)
    const ioCaseOutputs = toIoCaseOutputs(executions)

    const completed = await completeAttempt({
      runId,
      ticketKey,
      attemptId: opened.data.attemptId,
      ioCaseOutputs,
      probeResults: {},
    })
    if (!completed.ok) {
      setErrorMessage("Couldn't grade this submission.")
      setPhase("error")
      return
    }

    const nextCached: CachedAttempt = { attemptId: opened.data.attemptId, outcome: completed.data }
    cacheCompletedOutcome(runId, ticketKey, nextCached)
    setCached(nextCached)
    setPhase("active")

    void ensureBoardAtLeast(runId, boardStatus ?? "todo", ticketKey, "review").then((reached) => {
      if (reached === "review" && !completed.data.reviewComments?.length) {
        void ensureBoardAtLeast(runId, "review", ticketKey, "done")
      }
    })
  }, [runId, ticketKey, boardStatus])

  const start = useCallback(() => {
    void runAttempt()
  }, [runAttempt])

  const retry = useCallback(() => {
    startedForRef.current = null
    void runAttempt()
  }, [runAttempt])

  return {
    phase,
    gateResults: cached?.outcome.attempt.gateResults ?? null,
    escapedDefects: cached?.outcome.attempt.escapedDefects ?? [],
    aiPolicy: cached?.outcome.attempt.aiPolicy ?? null,
    finalized: cached?.outcome.attempt.finalized ?? null,
    submissionsRemaining: cached?.outcome.submissionsRemaining ?? null,
    reviewComments: cached?.outcome.reviewComments ?? null,
    errorMessage,
    cooldownSecondsRemaining,
    start,
    retry,
  }
}
