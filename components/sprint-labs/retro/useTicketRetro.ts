"use client"

/**
 * useTicketRetro — screen 9's data (UX-SPEC.md §10).
 *
 * Retro reads, it never writes an attempt: everything it shows comes from
 * `fetchFinalizedAttempt` (runtimeB task) — GET /api/sprint-labs/attempts/[attemptId], with the
 * same-tab session cache as a first-check optimization only (`attempt-client.ts`'s file header).
 * Unlike the pre-GET version of this file, a genuine cache/GET miss (never submitted) and a
 * not-yet-finalized cached practice attempt both still render as `"not-available"` — the task's
 * own instruction: "a not-yet-submitted ticket's retro/review shows a 'submit first' empty state,
 * not a 404" — but now a FINALIZED result from an earlier session, or a different tab, is found
 * too: the GET is the source of truth and works cold.
 */

import { useEffect, useMemo, useState } from "react"
import { getTicket } from "@/lib/sprint-labs/content/registry"
import {
  fetchFinalizedAttempt,
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
  const [cached, setCached] = useState<CachedAttempt | null | undefined>(undefined)
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

  // Mirrors the `ticket` effect above: async-loaded, not a synchronous memo, since
  // `fetchFinalizedAttempt` may now hit the network (GET) on a same-tab cache miss.
  useEffect(() => {
    let cancelled = false
    if (runId === null) {
      setCached(null)
      return
    }
    setCached(undefined)
    fetchFinalizedAttempt(runId, ticketKey).then((result) => {
      if (!cancelled) setCached(result)
    })
    return () => {
      cancelled = true
    }
  }, [runId, ticketKey, reloadToken])

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
  else if (cached === undefined) phase = "loading"
  else if (!finalized) phase = "not-available"
  else if (ticket === undefined) phase = "loading"
  else phase = "ready"

  return {
    phase,
    ticket: ticket ?? null,
    cached: cached ?? null,
    objectiveDeltas,
    nextTicketKey,
    retry: () => setReloadToken((n) => n + 1),
  }
}
