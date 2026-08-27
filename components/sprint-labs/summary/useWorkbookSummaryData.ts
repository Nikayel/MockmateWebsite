"use client"

/**
 * useWorkbookSummaryData — screen 10's data (UX-SPEC.md §11).
 *
 * Scoped ENTIRELY to what this browser tab's session cache actually knows
 * (see `session-attempts.ts`'s file header): every number here — tickets
 * shipped, points, the escaped curve, the mastery grid — reflects only
 * tickets finalized in THIS session, never a learner's full historical arc.
 * Deliberately consistent rather than mixing a full-board count (real, but
 * would make the headline disagree with a session-scoped curve underneath
 * it) with session-scoped detail. Flagged in the Task 13 report: the real
 * fix is a per-run summary aggregation endpoint.
 */

import { useEffect, useMemo, useState } from "react"
import { getTicket } from "@/lib/sprint-labs/content/registry"
import type { CompiledTicket } from "@/lib/sprint-labs/content/types"
import type { ObjectiveView } from "@/components/sprint-labs/ui/ObjectiveChip"
import {
  isGraded,
  readSessionAttempts,
  toEscapedRatePoints,
  type EscapedRatePoint,
  type SessionAttemptSummary,
} from "./session-attempts"

export type SummaryPhase = "loading" | "empty" | "ready"

export interface WorkbookSummaryState {
  phase: SummaryPhase
  ticketsShipped: number
  pointsShipped: number
  objectives: ObjectiveView[]
  escapedRatePoints: EscapedRatePoint[]
  gradedCount: number
  assistedCount: number
  unassistedGradedCount: number
  reviewOnlyGradedCount: number
  gradedEscapedRatePercent: number | null
  scoredAt: string | null
  modelId: string | null
}

function aggregateObjectives(
  attempts: SessionAttemptSummary[],
  ticketsByKey: Record<string, CompiledTicket>
): ObjectiveView[] {
  const byId = new Map<string, ObjectiveView>()
  for (const attempt of attempts) {
    const ticket = ticketsByKey[attempt.ticketKey]
    if (!ticket) continue
    const demonstrated = attempt.escapedCount === 0
    for (const objective of ticket.ticket.objectives) {
      const existing = byId.get(objective.id)
      // A learner can touch the same objective across several tickets; once demonstrated on any
      // of them it stays demonstrated (this screen never regresses a state backward).
      const state =
        existing?.state === "demonstrated" || demonstrated ? "demonstrated" : "practicing"
      byId.set(objective.id, {
        id: objective.id,
        label: objective.label,
        sentence: objective.canDo,
        state,
      })
    }
  }
  return Array.from(byId.values())
}

export function useWorkbookSummaryData(
  workbookId: string,
  runId: string | null
): WorkbookSummaryState {
  const [ticketsByKey, setTicketsByKey] = useState<Record<string, CompiledTicket>>({})
  const [ticketsLoaded, setTicketsLoaded] = useState(false)

  const attempts = useMemo(() => (runId ? readSessionAttempts(runId) : []), [runId])
  const ticketKeys = useMemo(() => attempts.map((a) => a.ticketKey).sort(), [attempts])

  useEffect(() => {
    if (ticketKeys.length === 0) {
      setTicketsByKey({})
      setTicketsLoaded(true)
      return
    }
    let cancelled = false
    setTicketsLoaded(false)
    Promise.all(ticketKeys.map((key) => getTicket(workbookId, key)))
      .then((results) => {
        if (cancelled) return
        const byKey: Record<string, CompiledTicket> = {}
        results.forEach((ticket, index) => {
          if (ticket) byKey[ticketKeys[index]] = ticket
        })
        setTicketsByKey(byKey)
      })
      .finally(() => {
        if (!cancelled) setTicketsLoaded(true)
      })
    return () => {
      cancelled = true
    }
    // ticketKeys is a sorted, content-derived array — comparing by its joined value avoids an
    // effect re-run on every render from a fresh array identity with the same actual keys.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workbookId, ticketKeys.join(",")])

  const gradedAttempts = attempts.filter(isGraded)
  const assistedAttempts = attempts.filter((a) => !isGraded(a))
  const mostRecentGraded = gradedAttempts[gradedAttempts.length - 1] ?? null

  let phase: SummaryPhase = "loading"
  if (runId === null) phase = "loading"
  else if (!ticketsLoaded) phase = "loading"
  else if (attempts.length === 0) phase = "empty"
  else phase = "ready"

  const totalGradedHidden = gradedAttempts.reduce((sum, a) => sum + a.hiddenTotal, 0)
  const totalGradedEscaped = gradedAttempts.reduce((sum, a) => sum + a.escapedCount, 0)
  const gradedEscapedRatePercent =
    totalGradedHidden > 0 ? Math.round((totalGradedEscaped / totalGradedHidden) * 100) : null

  const pointsShipped = attempts.reduce(
    (sum, a) => sum + (ticketsByKey[a.ticketKey]?.ticket.points ?? 0),
    0
  )

  return {
    phase,
    ticketsShipped: attempts.length,
    pointsShipped,
    objectives: aggregateObjectives(attempts, ticketsByKey),
    escapedRatePoints: toEscapedRatePoints(attempts),
    gradedCount: gradedAttempts.length,
    assistedCount: assistedAttempts.length,
    unassistedGradedCount: gradedAttempts.filter((a) => a.aiPolicy === "unassisted").length,
    reviewOnlyGradedCount: gradedAttempts.filter((a) => a.aiPolicy === "review-only").length,
    gradedEscapedRatePercent,
    scoredAt: mostRecentGraded?.submittedAt ?? null,
    modelId: mostRecentGraded?.modelId ?? null,
  }
}
