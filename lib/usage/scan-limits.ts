/**
 * Bounded-scan limits and coverage reporting for usage queries.
 *
 * Every aggregate on the admin usage dashboard is built by reading a capped
 * page of documents rather than a true aggregate, because an unbounded scan of
 * usage_events is itself a Firestore cost. The caps were previously repeated as
 * bare `10000` literals in four functions with no shared constant, and — worse
 * — a scan that hit its cap was presented as a complete total. A month with
 * 10,001 events reported the newest 10,000 as if that were everything.
 *
 * These helpers keep the caps in one place and make truncation visible, so the
 * dashboard can say "partial" instead of quietly under-reporting.
 */

/** Documents read per usage_events aggregate. */
export const USAGE_EVENT_SCAN_LIMIT = 10000

/** Documents read when aggregating interview_sessions for the scenario view. */
export const SESSION_SCAN_LIMIT = 500

/** Per-user usage_summaries read for the platform-wide user table. */
export const USER_SUMMARY_SCAN_LIMIT = 10000

/**
 * How much of the underlying data an aggregate actually saw.
 *
 * `truncated` is the honest signal: when true, every total derived from this
 * scan is a lower bound, not a total.
 */
export interface ScanCoverage {
  /** Documents actually read. */
  scanned: number
  /** Cap that applied to the read. */
  limit: number
  /** True when the read hit its cap and older data was therefore excluded. */
  truncated: boolean
}

export function describeCoverage(scanned: number, limit: number): ScanCoverage {
  return { scanned, limit, truncated: scanned >= limit }
}

/** True when any input scan was truncated, for rolling several into one banner. */
export function anyTruncated(...coverages: Array<ScanCoverage | undefined>): boolean {
  return coverages.some((coverage) => coverage?.truncated === true)
}
