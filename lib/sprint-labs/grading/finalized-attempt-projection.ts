/**
 * Pure gate for GET /api/sprint-labs/attempts/[attemptId]'s release rules (runtimeB task).
 *
 * Split out of `attempts-service.ts` on purpose: this is the one piece of that route's logic with
 * real security weight ("never leak expecteds/probe bodies/trap pre-finalization"), and a pure
 * function taking plain data in and returning plain data out can be unit-tested directly, with no
 * Firestore, no `loadSealedTicket`, no auth -- see `__tests__/finalized-attempt-projection.test.ts`.
 * `attempts-service.ts` (the ONLY file the sealing test allows to import `loadSealedTicket`) stays
 * the thin Firestore-fetching wrapper that calls this.
 *
 * Two release rules, deliberately different strictness:
 *
 *  - `referenceDiff` releases whenever `attempt.finalized` is true, for every `ai_policy`. This
 *    matches `completeSprintLabAttempt`'s OWN existing M7 rule EXACTLY (`attempt.finalized && sealed
 *    ? sealed.referenceDiff : undefined`) -- this route's whole point is to match what complete
 *    already released, not to invent a stricter or looser rule for the same field.
 *  - `reviewCorrectness` (the `correct` flag per review comment) additionally requires
 *    `reviewRoundSubmitted`. `completeSprintLabAttempt` never releases this field AT ALL (only
 *    `reviewSprintLabAttempt` does, and only as part of RECORDING the learner's decisions) --
 *    `attempt.finalized` alone is NOT enough here, because for a review-only ticket finalization
 *    happens at COMPLETE time, which is BEFORE the review round runs (`useTicketReview.ts` bootstraps
 *    open+complete on first visit, then the learner decides). Gating on `attempt.finalized` alone
 *    would let a fresh tab that never visited the review screen read the trap's answer before
 *    deciding -- exactly the spoiler task-13-report.md's own review flagged as never allowed
 *    ("never computed or shipped client-side until the real POST /attempts/review response carries
 *    released"). `reviewRoundSubmitted` (the attempt's `reviewRound/decision` sub-doc existing) is
 *    the caller's job to determine; this function only enforces the gate once it's known.
 */

export interface FinalizedAttemptReleaseInput {
  aiPolicy: string
  finalized: boolean
  /** Whether `attempts/{attemptId}/reviewRound/decision` exists for this attempt. */
  reviewRoundSubmitted: boolean
  /** `sealed.review` verbatim, or `null` if the ticket authored no `review.yaml`. */
  sealedReview: Array<{ id: string; body: string; correct: boolean }> | null
  /** `sealed.referenceDiff`, or `null` if no sealed content exists for this ticket at all. */
  sealedReferenceDiff: string | null
}

export interface FinalizedAttemptRelease {
  /** Comment bodies only -- mirrors `CompleteAttemptOutcome.reviewComments` exactly, released
   *  whenever the ticket is review-only and authored a review round, regardless of finalization
   *  or whether the round has been submitted (the learner needs the comments to decide on). */
  reviewComments?: Array<{ id: string; body: string }>
  /** The reference/"answer key" diff. Released once finalized, for every ai_policy -- M7. */
  referenceDiff?: string
  /** `{id, correct}` per comment. Released ONLY once finalized AND the review round has actually
   *  been submitted -- see file header. */
  reviewCorrectness?: Array<{ id: string; correct: boolean }>
}

export function projectFinalizedAttemptRelease(
  input: FinalizedAttemptReleaseInput
): FinalizedAttemptRelease {
  const reviewComments =
    input.aiPolicy === "review-only" && input.sealedReview
      ? input.sealedReview.map((c) => ({ id: c.id, body: c.body }))
      : undefined

  const referenceDiff =
    input.finalized && input.sealedReferenceDiff !== null ? input.sealedReferenceDiff : undefined

  // Explicit `aiPolicy === "review-only"` check, defense-in-depth: `reviewSprintLabAttempt` (the
  // only writer of `reviewRound/decision`) already refuses any other policy before it could ever
  // write that doc, so `reviewRoundSubmitted` should never be true for a non-review-only ticket in
  // practice -- but this projection is the spoiler boundary itself, so it does not rely on that
  // being true elsewhere. Mirrors `reviewComments`'s own explicit gate above.
  const reviewCorrectness =
    input.aiPolicy === "review-only" &&
    input.finalized &&
    input.reviewRoundSubmitted &&
    input.sealedReview
      ? input.sealedReview.map((c) => ({ id: c.id, correct: c.correct }))
      : undefined

  return { reviewComments, referenceDiff, reviewCorrectness }
}
