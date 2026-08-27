/**
 * The five-dimension scorer (docs/sprint-labs/WORKBOOK-SPEC.md §5,
 * docs/sprint-labs/PLAN.md Task 8). Pure functions only — no Firestore, no
 * clock reads, no randomness. The attempts service (attempts-service.ts)
 * gathers the inputs (from the gate runner's server-verified comparisons and
 * from server-derived workspace signals) and calls these.
 *
 * ## RULING R21 (fix round 1, binding): no dimension consumes a client-posted
 * JUDGMENT. Clients post raw artifacts only.
 *
 * This supersedes the original, narrower "client-posted booleans are
 * display-only" reading (still true, but R21 is broader): it is not just
 * pass/fail booleans that are untrustworthy, it is any VALUE that encodes
 * the client's own assessment of itself. Concretely, per dimension:
 *
 *  - **Understanding**: `filesTouched` and `timeToFirstEditSeconds` are
 *    SERVER-DERIVED (workspace-signals.ts, from the run's `files`
 *    subcollection and — where available — server timestamps), never
 *    request fields. A ticket's reference manifest still comes from parsing
 *    the sealed `reference.diff` (diff-utils.ts).
 *  - **Problem-Solving**: the HIDDEN gate's io-case pass rate ONLY
 *    (server-compared, gate-runner.ts). Visible/regression/adversary
 *    results and hidden PROBE-kind results are client-reported and NEVER a
 *    scoring input — they render in `gateResults[]` for display only.
 *  - **Code Quality**: diff-size band, `learnerDiffLines` now SERVER-DERIVED
 *    (workspace-signals.ts) rather than client-posted. Regression is still
 *    NOT a scored input (client-reported, see above) — a disclosed gap
 *    pending a server execution engine or regression-as-io-cases.
 *  - **Communication**: R21 retires the PR-description length heuristic
 *    entirely — a learner typing more text was an "elective dimension"
 *    trick (inflate an unrelated score by supplying more of something
 *    nobody server-verifies). Communication is now `null` on every ticket
 *    EXCEPT review-only, where it is driven purely by the review round's
 *    accept/push-back correctness — a fact the server verifies against the
 *    sealed `correct` flags in `/attempts/review`, not a client judgment.
 *    Prose the client posts is still accepted and stored (attempts-service's
 *    `meta/grading` doc) for display/retro; it is never a scoring input.
 *  - **Verification**: `learnerAddedTest` is now SERVER-DERIVED (a changed/
 *    added file under a test path, workspace-signals.ts) rather than a
 *    client-posted boolean.
 *
 * ## I6 (fix round 1): zero hidden io-cases is a CONTENT MISTAKE, not a free 100
 *
 * `scoreProblemSolving` and `scoreVerification` return `null` (not 100) when
 * `hiddenIoCaseTotal === 0` — score-feeding tickets (unassisted/review-only)
 * are required by `lab validate` to carry at least one io-case hidden test,
 * so a zero here means that rule was violated and the gap must be visible,
 * never quietly inflated into a perfect score. `computeOverallScore`
 * renormalizes across whichever dimensions are non-null, exactly as it
 * already does for `communication`.
 *
 * **Known tension with the frozen output schema, flagged for the
 * controller**: `lib/sprint-labs/types.ts`'s `ticketAttemptScoresSchema`
 * (Task 1, `.strict()`, out of this task's touch-with-care scope) types
 * `problemSolving` and `verification` as plain non-nullable `z.number()` —
 * only `communication` is nullable there. This module's functions are
 * honestly typed `number | null` so the actual renormalization math is
 * correct; attempts-service.ts is where a `null` gets collapsed to `0`
 * (never left as an unexplained gap, never defaulted to 100) for the one
 * frozen field that has nowhere else to put "no signal." See the Task 8
 * report for the full reasoning — this is a deliberate, disclosed choice
 * given a schema I am not able to edit, not a silent gap.
 */

// ============================================================
// Understanding — files touched vs reference manifest, time to first edit
// ============================================================

export const UNDERSTANDING_WEIGHTS = { filesTouched: 0.7, timeToFirstEdit: 0.3 } as const

/**
 * F1 of the learner's touched-files set against the reference solution's
 * touched-files set (parsed from `reference.diff` by diff-utils.ts). F1
 * (not recall alone) means touching every file in the repo "to be safe"
 * scores no better than touching nothing — precision penalizes noise the
 * same way recall penalizes misses.
 */
export function scoreFilesTouched(filesTouched: string[], referenceManifest: string[]): number {
  if (referenceManifest.length === 0) return 100
  const referenceSet = new Set(referenceManifest)
  const touchedSet = new Set(filesTouched)
  let intersectionSize = 0
  for (const path of touchedSet) if (referenceSet.has(path)) intersectionSize++

  const precision = touchedSet.size > 0 ? intersectionSize / touchedSet.size : 0
  const recall = intersectionSize / referenceSet.size
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall)
  return clampRound(f1 * 100)
}

/** Ascending time bands; the first one `seconds` fits within wins. Beyond the last band, {@link TIME_TO_FIRST_EDIT_SLOW_SCORE}. */
export const TIME_TO_FIRST_EDIT_BANDS = [
  { maxSeconds: 120, score: 100 },
  { maxSeconds: 600, score: 85 },
  { maxSeconds: 1800, score: 65 },
] as const

/** Used when the server has no time-to-first-edit signal (no timestamp to derive it from yet) — neutral, neither rewarded nor punished. */
export const TIME_TO_FIRST_EDIT_DEFAULT_SCORE = 70

/** Used once `seconds` exceeds every band above. */
export const TIME_TO_FIRST_EDIT_SLOW_SCORE = 40

export function scoreTimeToFirstEdit(seconds: number | null): number {
  if (seconds === null) return TIME_TO_FIRST_EDIT_DEFAULT_SCORE
  for (const band of TIME_TO_FIRST_EDIT_BANDS) {
    if (seconds <= band.maxSeconds) return band.score
  }
  return TIME_TO_FIRST_EDIT_SLOW_SCORE
}

export interface UnderstandingInput {
  filesTouched: string[]
  referenceManifest: string[]
  timeToFirstEditSeconds: number | null
}

export function scoreUnderstanding(input: UnderstandingInput): number {
  const filesScore = scoreFilesTouched(input.filesTouched, input.referenceManifest)
  const timeScore = scoreTimeToFirstEdit(input.timeToFirstEditSeconds)
  return clampRound(
    filesScore * UNDERSTANDING_WEIGHTS.filesTouched +
      timeScore * UNDERSTANDING_WEIGHTS.timeToFirstEdit
  )
}

// ============================================================
// Problem-Solving — hidden IO-case pass rate ONLY (see file header)
// ============================================================

export interface ProblemSolvingInput {
  hiddenIoCasePassed: number
  hiddenIoCaseTotal: number
}

/** `null` when the ticket has zero io-case hidden tests — I6: a content mistake must surface, never inflate to 100. */
export function scoreProblemSolving(input: ProblemSolvingInput): number | null {
  if (input.hiddenIoCaseTotal === 0) return null
  return clampRound((input.hiddenIoCasePassed / input.hiddenIoCaseTotal) * 100)
}

// ============================================================
// Code Quality — diff-size band vs reference (regression EXCLUDED, see file header)
// ============================================================

export const CODE_QUALITY_DIFF_BAND = {
  closeMin: 0.5,
  closeMax: 2.0,
  closeScore: 100,
  looseMin: 0.25,
  looseMax: 4.0,
  looseScore: 70,
  farScore: 40,
} as const

/** `learnerDiffLines`/`referenceDiffLines`, banded. Too small risks an incomplete fix; too large risks unrelated churn. */
export function scoreDiffSizeBand(learnerDiffLines: number, referenceDiffLines: number): number {
  if (referenceDiffLines <= 0) return 100
  const ratio = learnerDiffLines / referenceDiffLines
  const band = CODE_QUALITY_DIFF_BAND
  if (ratio >= band.closeMin && ratio <= band.closeMax) return band.closeScore
  if (ratio >= band.looseMin && ratio <= band.looseMax) return band.looseScore
  return band.farScore
}

export interface CodeQualityInput {
  learnerDiffLines: number
  referenceDiffLines: number
}

export function scoreCodeQuality(input: CodeQualityInput): number {
  return scoreDiffSizeBand(input.learnerDiffLines, input.referenceDiffLines)
}

// ============================================================
// Communication — review-only tickets ONLY, driven by server-verified
// push-back correctness. Never a PR-description/prose heuristic (R21).
// ============================================================

export interface CommunicationInput {
  isReviewOnly: boolean
  /** Correct accept/push-back decisions in the review round. Undefined until the round has run. */
  reviewCorrectDecisions?: number
  /** Total review-round decisions. Undefined (or 0) until the round has run. */
  reviewDecisionsTotal?: number
}

/**
 * `null` on every ticket that is not review-only, REGARDLESS of any prose
 * the client posted (R21 kills the elective-dimension trick outright — see
 * this file's header). On a review-only ticket, `null` until the review
 * round has actually happened (nothing server-verifiable exists yet), then
 * the correct-decision rate, 0-100.
 */
export function scoreCommunication(input: CommunicationInput): number | null {
  if (!input.isReviewOnly) return null
  if (!input.reviewDecisionsTotal) return null
  return clampRound(((input.reviewCorrectDecisions ?? 0) / input.reviewDecisionsTotal) * 100)
}

// ============================================================
// Verification — escaped-defect rate + learner-test-presence bonus + review-round correctness
// ============================================================

/** Added to the escaped-defect-rate base score when the learner's file store shows an added/changed test file. Capped at 100. */
export const VERIFICATION_TEST_PRESENCE_BONUS = 10

/** How much weight the review round's "did you make the right accept/push-back call" rate carries once it exists. */
export const VERIFICATION_REVIEW_WEIGHT = 0.4

export interface VerificationInput {
  hiddenIoCasePassed: number
  hiddenIoCaseTotal: number
  learnerAddedTest: boolean
  /** Correct accept/push-back decisions in the review round. Undefined until the round has run. */
  reviewCorrectDecisions?: number
  /** Total review-round decisions. Undefined (or 0) until the round has run. */
  reviewTotalDecisions?: number
}

/** `null` when the ticket has zero io-case hidden tests — same I6 reasoning as Problem-Solving, unconditional (even if a review round exists). */
export function scoreVerification(input: VerificationInput): number | null {
  if (input.hiddenIoCaseTotal === 0) return null

  const escapedRate = 1 - input.hiddenIoCasePassed / input.hiddenIoCaseTotal
  const base = (1 - escapedRate) * 100
  const withTestBonus = Math.min(
    100,
    base + (input.learnerAddedTest ? VERIFICATION_TEST_PRESENCE_BONUS : 0)
  )

  if (!input.reviewTotalDecisions) {
    return clampRound(withTestBonus)
  }

  const reviewCorrectRate = (input.reviewCorrectDecisions ?? 0) / input.reviewTotalDecisions
  const blended =
    withTestBonus * (1 - VERIFICATION_REVIEW_WEIGHT) +
    reviewCorrectRate * 100 * VERIFICATION_REVIEW_WEIGHT
  return clampRound(blended)
}

// ============================================================
// Overall — rubric-weighted, renormalized across whichever dimensions are non-null
// ============================================================

export interface RubricWeights {
  understanding: number
  problemSolving: number
  codeQuality: number
  communication: number
  verification: number
}

/**
 * The TRUE, honestly-nullable per-dimension scores — this is the shape
 * `computeOverallScore` does its renormalization math over. NOT the same
 * shape as the persisted/output `TicketAttemptScores` (which cannot express
 * null for `problemSolving`/`verification` — see this file's header); the
 * caller is responsible for keeping those two representations straight.
 */
export interface DimensionScores {
  understanding: number
  problemSolving: number | null
  codeQuality: number
  communication: number | null
  verification: number | null
}

/**
 * Weighted average over whichever dimensions are non-null, which is
 * mathematically identical to redistributing a null dimension's authored
 * weight proportionally across the rest — the renormalization
 * WORKBOOK-SPEC.md §5 and I6 both require, without a separate redistribution
 * step. Falls back to a plain average of the active scores if every
 * supplied weight among the active dimensions is zero (malformed rubric
 * content), so a divide-by-zero can never surface as a score.
 * `understanding` and `codeQuality` are always numbers in this module's own
 * functions, so `active` always has at least those two entries.
 */
export function computeOverallScore(scores: DimensionScores, weights: RubricWeights): number {
  const all: Array<{ score: number | null; weight: number }> = [
    { score: scores.understanding, weight: weights.understanding },
    { score: scores.problemSolving, weight: weights.problemSolving },
    { score: scores.codeQuality, weight: weights.codeQuality },
    { score: scores.communication, weight: weights.communication },
    { score: scores.verification, weight: weights.verification },
  ]
  const active = all.filter((d): d is { score: number; weight: number } => d.score !== null)

  const totalWeight = active.reduce((sum, d) => sum + d.weight, 0)
  if (totalWeight <= 0) {
    return clampRound(active.reduce((sum, d) => sum + d.score, 0) / active.length)
  }

  const weightedSum = active.reduce((sum, d) => sum + d.score * d.weight, 0)
  return clampRound(weightedSum / totalWeight)
}

// ============================================================
// Shared
// ============================================================

function clampRound(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}
