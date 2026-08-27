"use client"

/**
 * useTicketRetro — screen 9's data (UX-SPEC.md §10).
 *
 * Retro reads, it never writes an attempt: everything it shows comes from
 * the SAME session cache submit/review populate (`attempt-client.ts`'s file
 * header explains why that cache exists at all — no GET endpoint anywhere
 * under `/api/sprint-labs/attempts/**`). A cache miss, or a cached outcome
 * that is not yet `finalized`, both render as `"not-available"` — the task's
 * own instruction: "a not-yet-submitted ticket's retro/review shows a
 * 'submit first' empty state, not a 404." This intentionally also covers a
 * genuinely-submitted ticket whose result just isn't in THIS browser
 * session: there is no way to tell the two apart without the missing GET
 * endpoint, and showing the same honest empty state for both is correct
 * either way (never a crash, never fabricated content).
 */

import { useEffect, useMemo, useState } from "react"
import { getTicket } from "@/lib/sprint-labs/content/registry"
import {
  getCachedCompletedOutcome,
  type CachedAttempt,
} from "@/components/sprint-labs/submit/attempt-client"
import type { CompiledTicket } from "@/lib/sprint-labs/content/types"
import type { TicketBoardStatus } from "@/lib/sprint-labs/types"
import { buildObjectiveDeltas, type ObjectiveDelta } from "./objective-deltas"

export type RetroPhase = "loading" | "not-available" | "ready" | "error"

export interface TicketRetroState {
  phase: RetroPhase
  ticket: CompiledTicket | null
  cached: CachedAttempt | null
  objectiveDeltas: ObjectiveDelta[]
  /** The next ticket key to work, if one is findable on this run's board — see file header on the limitation. */
  nextTicketKey: string | null
  retry: () => void
}

export interface UseTicketRetroInput {
  workbookId: string
  ticketKey: string
  runId: string | null
  board: Record<string, TicketBoardStatus> | null
}

/**
 * Best-effort "what's next": the compiled registry has no ticket-to-sprint
 * mapping (the same documented gap `lib/sprint-labs/runs.ts`'s
 * `requireKnownWorkbookAndTickets` and the ticket screen both carry already),
 * so this can only look at keys already seeded onto THIS run's board, sorted
 * lexicographically (Meridian's zero-padded `MER-###` keys sort correctly
 * this way) and picks the next one after the current ticket that is not yet
 * done. Returns null rather than guess when there is nothing to find.
 */
function findNextTicketKey(
  board: Record<string, TicketBoardStatus>,
  currentKey: string
): string | null {
  const keys = Object.keys(board).sort((a, b) => a.localeCompare(b))
  const currentIndex = keys.indexOf(currentKey)
  if (currentIndex === -1) return null
  for (let i = currentIndex + 1; i < keys.length; i++) {
    if (board[keys[i]] !== "done") return keys[i]
  }
  return null
}

export function useTicketRetro({
  workbookId,
  ticketKey,
  runId,
  board,
}: UseTicketRetroInput): TicketRetroState {
  const [ticket, setTicket] = useState<CompiledTicket | null | undefined>(undefined)
  const [ticketError, setTicketError] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false
    setTicket(undefined)
    setTicketError(false)
    getTicket(workbookId, ticketKey)
      .then((result) => {
        if (!cancelled) setTicket(result ?? null)
      })
      .catch(() => {
        if (!cancelled) setTicketError(true)
      })
    return () => {
      cancelled = true
    }
  }, [workbookId, ticketKey, reloadToken])

  const cached = useMemo(
    () => (runId ? getCachedCompletedOutcome(runId, ticketKey) : null),
    [runId, ticketKey]
  )

  const finalized = cached?.outcome.attempt.finalized === true

  const objectiveDeltas = useMemo(() => {
    if (!ticket || !finalized || !cached) return []
    return buildObjectiveDeltas(
      ticket.ticket.objectives,
      cached.outcome.attempt.escapedDefects.length === 0
    )
  }, [ticket, finalized, cached])

  const nextTicketKey = useMemo(
    () => (board ? findNextTicketKey(board, ticketKey) : null),
    [board, ticketKey]
  )

  let phase: RetroPhase = "loading"
  if (ticketError) phase = "error"
  else if (runId === null) phase = "loading"
  else if (!finalized) phase = "not-available"
  else if (ticket === undefined) phase = "loading"
  else phase = "ready"

  return {
    phase,
    ticket: ticket ?? null,
    cached,
    objectiveDeltas,
    nextTicketKey,
    retry: () => setReloadToken((n) => n + 1),
  }
}
