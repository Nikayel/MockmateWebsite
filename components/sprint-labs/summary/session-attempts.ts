/**
 * Reads every FINALIZED attempt this browser tab has cached for one run,
 * across however many tickets the learner submitted this session, for the
 * workbook summary (UX-SPEC.md §11).
 *
 * There is no cross-ticket aggregation endpoint anywhere in the Sprint Labs
 * API — no GET for a single attempt (see `attempt-client.ts`'s file header)
 * and certainly none for "every attempt across a run." `run.board` (the one
 * real, server-sourced signal available here) carries per-ticket STATUS
 * only, never scores or escaped counts. So this reads the SAME
 * `sprintlab:attempt:{runId}:{ticketKey}` session-cache keys submit/review
 * already write, scoped to one run, and is honestly partial: it only ever
 * reflects tickets finalized in THIS tab this session, never a learner's
 * full historical arc. Screen 10's own spec already anticipates a sparse
 * data source ("in progress", "fewer than 2 graded attempts", "assisted
 * only so far" are all named states), which is what this naturally
 * produces — flagged in the Task 13 report as the thing a real per-run
 * summary endpoint would replace.
 */

import { getCachedCompletedOutcome } from "@/components/sprint-labs/submit/attempt-client"
import type { AiPolicy } from "@/lib/sprint-labs/types"

export interface SessionAttemptSummary {
  ticketKey: string
  aiPolicy: AiPolicy
  escapedCount: number
  /** The hidden gate's issued-case count (`gateResults`'s hidden entry's `cases.length`) — the
   *  real denominator for WORKBOOK-SPEC.md §5's "hidden tests failed / hidden tests run". */
  hiddenTotal: number
  modelId?: string
  submittedAt: string
}

const CACHE_KEY_PREFIX = "sprintlab:attempt:"

function sessionStorageKeys(): string[] {
  try {
    const keys: string[] = []
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const key = window.sessionStorage.key(i)
      if (key) keys.push(key)
    }
    return keys
  } catch {
    return []
  }
}

/** Every finalized attempt cached for `runId`, oldest submission first. */
export function readSessionAttempts(runId: string): SessionAttemptSummary[] {
  if (typeof window === "undefined") return []
  const prefix = `${CACHE_KEY_PREFIX}${runId}:`
  const results: SessionAttemptSummary[] = []

  for (const key of sessionStorageKeys()) {
    if (!key.startsWith(prefix)) continue
    const ticketKey = key.slice(prefix.length)
    const cached = getCachedCompletedOutcome(runId, ticketKey)
    if (!cached || !cached.outcome.attempt.finalized) continue
    const hiddenGate = cached.outcome.attempt.gateResults.find((g) => g.gate === "hidden")
    results.push({
      ticketKey,
      aiPolicy: cached.outcome.attempt.aiPolicy,
      escapedCount: cached.outcome.attempt.escapedDefects.length,
      hiddenTotal: hiddenGate?.cases.length ?? 0,
      modelId: cached.outcome.attempt.modelId,
      submittedAt: cached.outcome.attempt.submittedAt,
    })
  }

  return results.sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
}

/** WORKBOOK-SPEC.md §5 rule 1: only unassisted and review-only attempts feed the readiness score. */
export function isGraded(attempt: SessionAttemptSummary): boolean {
  return attempt.aiPolicy === "unassisted" || attempt.aiPolicy === "review-only"
}

export interface EscapedRatePoint {
  ticketKey: string
  /** 0..1, or null when the hidden gate never ran (0 issued cases — see gate-runner.ts). */
  rate: number | null
  graded: boolean
}

export function toEscapedRatePoints(attempts: SessionAttemptSummary[]): EscapedRatePoint[] {
  return attempts.map((a) => ({
    ticketKey: a.ticketKey,
    rate: a.hiddenTotal > 0 ? a.escapedCount / a.hiddenTotal : null,
    graded: isGraded(a),
  }))
}
