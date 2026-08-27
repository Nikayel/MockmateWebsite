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
 * ## The gate-execution seam (Task 13 report, item 1)
 *
 * `completeAttempt` is called with EMPTY `ioCaseOutputs`/`probeResults` and
 * no `visibleResults`/`regressionResults`/`adversaryResults`. There is no
 * Sprint-Labs-specific in-browser executor to run the learner's saved files
 * against the issued hidden io-cases yet (`lib/workspace-execution` is
 * scenario/pack-shaped, not wired to this ticket model — confirmed by
 * searching the tree before writing this). This is REAL behavior of the
 * real, unmodified API given no execution input, not a fabricated result:
 * every issued hidden case reads as failed (`gate-runner.ts`'s documented
 * "issued but unposted counts as failed" rule) and the three aggregate gates
 * read as `"errored"` ("this gate could not run", never a false failure).
 * Wiring a real executor is a single, isolated change at this call site.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import type { AiPolicy, GateResult, TicketBoardStatus } from "@/lib/sprint-labs/types"
import type { CompleteAttemptOutcome } from "@/lib/sprint-labs/grading/attempts-service"
import {
  cacheCompletedOutcome,
  completeAttempt,
  ensureBoardAtLeast,
  getCachedCompletedOutcome,
  openAttempt,
} from "./attempt-client"

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
  const [outcome, setOutcome] = useState<CompleteAttemptOutcome | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [cooldownDeadline, setCooldownDeadline] = useState<number | null>(null)
  const [cooldownSecondsRemaining, setCooldownSecondsRemaining] = useState(0)
  const startedForRef = useRef<string | null>(null)

  // Resolve the initial phase once run + board data are available.
  useEffect(() => {
    if (runId === null || boardStatus === null) return
    if (startedForRef.current === `${runId}:${ticketKey}`) return

    startedForRef.current = `${runId}:${ticketKey}`
    const cached = getCachedCompletedOutcome(runId, ticketKey)
    if (cached) {
      setOutcome(cached)
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
    setOutcome(null)
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

    // Documented seam — see file header. Empty until a real in-browser executor is wired in.
    const completed = await completeAttempt({
      runId,
      ticketKey,
      attemptId: opened.data.attemptId,
      ioCaseOutputs: {},
      probeResults: {},
    })
    if (!completed.ok) {
      setErrorMessage("Couldn't grade this submission.")
      setPhase("error")
      return
    }

    cacheCompletedOutcome(runId, ticketKey, completed.data)
    setOutcome(completed.data)
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
    gateResults: outcome?.attempt.gateResults ?? null,
    escapedDefects: outcome?.attempt.escapedDefects ?? [],
    aiPolicy: outcome?.attempt.aiPolicy ?? null,
    submissionsRemaining: outcome?.submissionsRemaining ?? null,
    reviewComments: outcome?.reviewComments ?? null,
    errorMessage,
    cooldownSecondsRemaining,
    start,
    retry,
  }
}
