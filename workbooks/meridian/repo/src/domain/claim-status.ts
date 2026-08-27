/**
 * Where a claim sits in its lifecycle:
 *  - submitted    - just landed, nothing has looked at it yet
 *  - under_review - an adjuster (or, eventually, the extractor) is working it
 *  - approved     - the payout amount is set, nothing has been sent yet
 *  - paid         - a payout webhook has gone out
 *  - rejected     - denied, with no payout
 */
export type ClaimStatus = "submitted" | "under_review" | "approved" | "paid" | "rejected"

const TERMINAL_STATUSES: ReadonlySet<ClaimStatus> = new Set(["paid", "rejected"])

/** A claim in a terminal status is not expected to change again on its own. */
export function isTerminalStatus(status: ClaimStatus): boolean {
  return TERMINAL_STATUSES.has(status)
}
