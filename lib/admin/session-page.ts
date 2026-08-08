/**
 * Turning a bounded Firestore scan into one page of the admin session list.
 *
 * This is the part of cursor pagination that is easy to get subtly wrong, so it
 * lives here as a pure function over already-read documents rather than inside
 * the route where only a live Firestore could exercise it.
 *
 * Three things it has to get right:
 *
 * - the `openOnly` statuses discard some of what was read, so "did we read more
 *   than a page" is not the same question as "is there another page";
 * - the resume position differs by reason. A full page resumes after its last
 *   ROW. A scan that hit its ceiling without filling the page resumes after the
 *   last document SCANNED, because everything between the final match and the
 *   ceiling was already inspected and rejected, and replaying it would re-read
 *   documents only to discard them a second time;
 * - a page that neither filled nor hit the ceiling is the end of the list, and
 *   must report no cursor, or the caller pages forever.
 */

import { scanBudgetFor, type SessionCursor, type SessionQueryPlan } from "./session-query"
import type { SessionRowSource } from "./session-rows"

/** One document read by the scan, before any projection. */
export interface ScannedSession {
  id: string
  data: SessionRowSource
}

export interface SessionPage {
  /** The documents that belong on this page, at most `plan.pageSize` of them. */
  items: ScannedSession[]
  /** Where the next page resumes, or null at the end of the list. */
  nextCursor: SessionCursor | null
  /** Documents read to produce this page. */
  scanned: number
  /**
   * True when an `openOnly` scan stopped at its ceiling. The page is real; it
   * just does not prove there is nothing older.
   */
  scanCapped: boolean
}

/** A round with no `completed_at`: what in-progress and abandoned actually mean. */
export function isOpenSession(session: SessionRowSource): boolean {
  return !session.completed_at
}

/**
 * Resume position for a document.
 *
 * `created_at` is an ISO string from both writers and the query orders on it, so
 * a scanned document without one is a shape anomaly. Returning null for it ends
 * pagination, which the caller treats as worth reporting rather than as the end.
 */
export function cursorForSession(session: ScannedSession): SessionCursor | null {
  const startedAt = session.data.created_at
  if (typeof startedAt !== "string" || startedAt === "") return null
  return { startedAt, sessionId: session.id }
}

export function assembleSessionPage(
  scanned: readonly ScannedSession[],
  plan: SessionQueryPlan
): SessionPage {
  const budget = scanBudgetFor(plan)
  const matching = plan.openOnly ? scanned.filter((row) => isOpenSession(row.data)) : scanned
  const items = matching.slice(0, plan.pageSize)

  // Only an openOnly plan over-fetches, so only it can be cut short by the
  // ceiling. A fully indexed plan reads pageSize + 1 and that extra row is the
  // probe, not a cap.
  const scanCapped = plan.openOnly && scanned.length >= budget

  let nextCursor: SessionCursor | null = null
  if (matching.length > plan.pageSize) {
    nextCursor = cursorForSession(items[items.length - 1])
  } else if (scanCapped && scanned.length > 0) {
    nextCursor = cursorForSession(scanned[scanned.length - 1])
  }

  return { items, nextCursor, scanned: scanned.length, scanCapped }
}
