/**
 * Persist idempotency guard.
 *
 * Feedback persistence now has two writers racing for the same session: the
 * client (after consuming the SSE stream, or via fallback scoring on a stream
 * error) and the server (the stream route persists server-side so a closed tab
 * can no longer orphan a session in "processing"). This resolves who wins:
 *
 *  - The first real persist to land is terminal; later persists are no-ops.
 *  - Fallback scores are a placeholder, so real feedback may UPGRADE a
 *    fallback-complete session, but fallback may never overwrite anything.
 *  - Legacy complete docs carry no source stamp and are treated as real.
 */

export type PersistSource = "stream" | "fallback" | "server" | "backfill"

export interface ExistingFeedbackState {
  status?: string | null
  source?: string | null
}

export function resolvePersistAction(
  existing: ExistingFeedbackState,
  incomingSource: PersistSource
): "persist" | "skip" {
  if (existing.status !== "complete") return "persist"
  const existingIsFallback = existing.source === "fallback"
  if (existingIsFallback && incomingSource !== "fallback") return "persist"
  return "skip"
}
