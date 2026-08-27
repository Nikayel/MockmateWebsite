/**
 * Client-safe fetchers + session cache for the Task 8 attempts API
 * (`/api/sprint-labs/attempts`, `/complete`, `/review`), mirroring
 * `lib/sprint-labs/runs-client.ts`'s shape: attach the Firebase auth token,
 * bound every request with a timeout, and never import the server service
 * module (only its TYPES, which erase at compile time and pull nothing into
 * the client bundle).
 *
 * ## Why a session cache exists at all
 *
 * There is no GET endpoint anywhere under `app/api/sprint-labs/attempts/**`
 * (Task 8 shipped POST `attempts`, `attempts/complete`, `attempts/review`
 * only — see `components/sprint-labs/board/types.ts`'s own documented gap on
 * `escapedCount`). A completed attempt's gate results, escaped defects,
 * review comments and reference diff exist ONLY in the synchronous response
 * of the call that produced them. Submit, review and retro are three
 * separate routes (UX-SPEC.md §1.2 requires real segments, not one client
 * page that switches), so without a bridge, navigating submit -> review ->
 * retro would lose that response the instant the submit page unmounts.
 *
 * `sessionStorage`, keyed by `(runId, ticketKey)`, is that bridge. It is
 * NOT a second source of truth: the server-persisted `sprintLabRuns/{runId}/
 * attempts/{attemptId}` document is authoritative, this is purely a same-tab
 * UX continuity cache. A cache miss (new tab, cleared storage, a later
 * session) is rendered as an honest "not available in this session" state,
 * never a fabricated result — see each screen's empty-state handling.
 *
 * ## The GET endpoint (runtimeB task — the follow-up this file used to just flag)
 *
 * `GET /api/sprint-labs/attempts/[attemptId]` (the dynamic segment is the ticket key — see that
 * route's own header) now exists: it returns the ONE finalized attempt for `(runId, ticketKey)`,
 * or 404 if none exists yet. `fetchFinalizedAttempt` below is the client wrapper: session cache
 * first (a same-tab re-render should never re-fetch), then the GET, writing a hit back into the
 * cache so a second same-tab read stays free. The GET is the source of truth and works in a fresh
 * tab; the cache is purely an optimization on top of it, same as before.
 */

import { getCurrentUserToken } from "@/lib/firebase-lazy"
import { moveSprintLabRunTicket } from "@/lib/sprint-labs/runs-client"
import type { TicketBoardStatus } from "@/lib/sprint-labs/types"
import type {
  CompleteAttemptInput,
  CompleteAttemptOutcome,
  OpenAttemptInput,
  OpenAttemptResult,
  ReviewAttemptInput,
  ReviewAttemptOutcome,
} from "@/lib/sprint-labs/grading/attempts-service"

const REQUEST_TIMEOUT_MS = 15000

export type AttemptCallResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; retryAfterSeconds?: number }

async function authHeaders(): Promise<Record<string, string> | null> {
  const token = await getCurrentUserToken()
  if (!token) return null
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
}

async function postJson<T>(path: string, body: unknown): Promise<AttemptCallResult<T>> {
  const headers = await authHeaders()
  if (!headers) return { ok: false, status: 401, error: "Not signed in" }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(path, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: typeof data.error === "string" ? data.error : "Request failed",
        retryAfterSeconds:
          typeof data.retryAfterSeconds === "number" ? data.retryAfterSeconds : undefined,
      }
    }
    return { ok: true, data: data as T }
  } catch {
    return { ok: false, status: 0, error: "Network error" }
  } finally {
    clearTimeout(timer)
  }
}

export function openAttempt(
  input: OpenAttemptInput
): Promise<AttemptCallResult<OpenAttemptResult>> {
  return postJson("/api/sprint-labs/attempts", input)
}

export function completeAttempt(
  input: CompleteAttemptInput
): Promise<AttemptCallResult<CompleteAttemptOutcome>> {
  return postJson("/api/sprint-labs/attempts/complete", input)
}

export function reviewAttempt(
  input: ReviewAttemptInput
): Promise<AttemptCallResult<ReviewAttemptOutcome>> {
  return postJson("/api/sprint-labs/attempts/review", input)
}

// ============================================================
// Session cache — see file header
// ============================================================

function completedKey(runId: string, ticketKey: string): string {
  return `sprintlab:attempt:${runId}:${ticketKey}`
}

function reviewKey(runId: string, ticketKey: string): string {
  return `sprintlab:review:${runId}:${ticketKey}`
}

function readCache<T>(key: string): T | null {
  try {
    const raw = window.sessionStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function writeCache(key: string, value: unknown): void {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Best-effort only (private-mode quota, disabled storage). The screen
    // still has the value in memory for this render; a later visit simply
    // falls back to the "not available" empty state.
  }
}

/**
 * `CompleteAttemptOutcome` carries no `attemptId` (`TicketAttempt` is frozen/`.strict()` with no id
 * field — see lib/sprint-labs/types.ts). The review round's input schema requires one anyway
 * (`reviewAttemptInputSchema.attemptId`), so the cache keeps it alongside the outcome rather than
 * discarding the one value `POST /attempts` (open) ever hands back.
 */
export interface CachedAttempt {
  attemptId: string
  outcome: CompleteAttemptOutcome
}

export function getCachedCompletedOutcome(runId: string, ticketKey: string): CachedAttempt | null {
  return readCache<CachedAttempt>(completedKey(runId, ticketKey))
}

/**
 * Write-once once finalized. `finalized` is true on exactly the first completion of a ticket ever
 * (attempts-service.ts's per-ticket sentinel doc); every later completion is a practice re-attempt
 * with `finalized: false` and different, non-representative gate results. Overwriting the cache
 * unconditionally would let a same-tab practice re-attempt silently erase the ONLY copy this screen
 * has of the finalized result retro needs (UX-SPEC.md §12.5: "the finalized result stands"). A
 * caller that already has a finalized entry and completes a fresh practice attempt is expected to
 * keep using ITS OWN in-memory outcome for the current screen; only the cache — which is what a
 * later navigation reads — is protected here.
 */
export function cacheCompletedOutcome(
  runId: string,
  ticketKey: string,
  cached: CachedAttempt
): void {
  const existing = getCachedCompletedOutcome(runId, ticketKey)
  if (existing?.outcome.attempt.finalized && !cached.outcome.attempt.finalized) return
  writeCache(completedKey(runId, ticketKey), cached)
}

interface FinalizedAttemptResponse {
  attemptId: string
  outcome: CompleteAttemptOutcome
  reviewCorrectness?: Array<{ id: string; correct: boolean }>
}

/**
 * Retro/review's read path (runtimeB task): a same-tab session-cache hit short-circuits (no
 * network call); otherwise calls `GET /api/sprint-labs/attempts/[attemptId]` (ticket-keyed — see
 * that route's header) and, on a hit, writes the result into the SAME session cache
 * `cacheCompletedOutcome`/`getCachedCompletedOutcome` already maintain, so a later same-tab read
 * (including from `useSubmitScreenController`, which still reads the cache directly) sees it too.
 * Returns `null` for a 401/403/404/network failure alike — every one of those means "there is no
 * finalized result to show right now," and the caller (retro's "not-available" state, review's
 * open+complete bootstrap fallback) already has an honest empty/fallback path for exactly that.
 */
export async function fetchFinalizedAttempt(
  runId: string,
  ticketKey: string
): Promise<CachedAttempt | null> {
  const cached = getCachedCompletedOutcome(runId, ticketKey)
  if (cached) return cached

  const headers = await authHeaders()
  if (!headers) return null

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(
      `/api/sprint-labs/attempts/${encodeURIComponent(ticketKey)}?runId=${encodeURIComponent(runId)}`,
      { method: "GET", headers, signal: controller.signal }
    )
    if (!res.ok) return null
    const data = (await res.json()) as FinalizedAttemptResponse
    if (!data.attemptId || !data.outcome) return null

    const result: CachedAttempt = { attemptId: data.attemptId, outcome: data.outcome }
    cacheCompletedOutcome(runId, ticketKey, result)
    return result
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * `ReviewAttemptOutcome` carries scores and (once finalized) the correctness
 * per comment id, but never the learner's own decisions back. Re-deriving a
 * verdict on a later bootstrap (a cache hit from an earlier visit this same
 * tab) needs both halves, so the cache keeps the decisions that were
 * actually submitted alongside the server's response.
 */
export interface CachedReview {
  decisions: Array<{ commentId: string; decision: "accept" | "push-back"; reason?: string }>
  outcome: ReviewAttemptOutcome
}

export function getCachedReviewOutcome(runId: string, ticketKey: string): CachedReview | null {
  return readCache<CachedReview>(reviewKey(runId, ticketKey))
}

export function cacheReviewOutcome(runId: string, ticketKey: string, cached: CachedReview): void {
  writeCache(reviewKey(runId, ticketKey), cached)
}

// ============================================================
// Board-status walk — moves a ticket forward one legal step at a time
// ============================================================

const BOARD_ORDER: TicketBoardStatus[] = ["todo", "doing", "review", "done"]

/**
 * Walks `ticketKey` forward through `LEGAL_BOARD_TRANSITIONS`
 * (`lib/sprint-labs/runs.ts`, todo -> doing -> review -> done, one step at a
 * time) until it reaches at least `target`, using the existing, unmodified
 * `moveSprintLabRunTicket` client call. A step that fails (network error, a
 * concurrent conflict) stops the walk and returns the furthest status
 * actually reached rather than throwing — the caller treats "didn't reach
 * target" as its own error state.
 */
export async function ensureBoardAtLeast(
  runId: string,
  currentStatus: TicketBoardStatus,
  ticketKey: string,
  target: TicketBoardStatus
): Promise<TicketBoardStatus> {
  let status = currentStatus
  const targetIndex = BOARD_ORDER.indexOf(target)
  while (BOARD_ORDER.indexOf(status) < targetIndex) {
    const nextStatus = BOARD_ORDER[BOARD_ORDER.indexOf(status) + 1]
    const result = await moveSprintLabRunTicket({ runId, ticketKey, to: nextStatus })
    if (!result) break
    status = result.board[ticketKey] ?? nextStatus
  }
  return status
}
