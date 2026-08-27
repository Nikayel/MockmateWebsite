/**
 * The five-dimension scorer (docs/sprint-labs/WORKBOOK-SPEC.md §5,
 * docs/sprint-labs/PLAN.md Task 8). Pure functions only — no Firestore, no
 * clock reads, no randomness. The attempts service (attempts-service.ts)
 * gathers the inputs (from the gate runner's server-verified comparisons and
 * from client-reported measurements) and calls these.
 *
 * ## What is, and is not, a scoring input — the STANDING NOTE
 *
 * docs/sprint-labs/EXECUTION-STATE.md is explicit and binding: "Browser-
 * reported pass/fail is NEVER authoritative for anything scored... every
 * scoring path must treat client-posted booleans as display-only." That
 * rules out the VISIBLE gate, the REGRESSION gate, the ADVERSARY gate, and
 * PROBE-kind hidden cases as numeric-score inputs — none of those verdicts
 * are compared server-side against a secret; they are either fully public
 * (visible, regression) or a client-executed/client-reported boolean
 * (probes, adversary payloads), all spoofable in principle. They still
 * appear in `GateResult[]` for DISPLAY (the learner sees "12/15 visible
 * passed"), and a probe's humanName can still surface as FORMATIVE feedback
 * — just never as a term in any of the five numbers below.
 *
 * The only scored signal is the HIDDEN gate's IO-CASE-kind verdicts (server
 * compares the client-posted raw output against the sealed `expected`).
 * `scoreProblemSolving` and `scoreVerification`'s escaped-defect term both
 * key off that, and only that — which is also why WORKBOOK-SPEC.md §5's
 * headline metric ("hidden tests failed / hidden tests run") is computed
 * the same way in the gate runner.
 *
 * Regression's "regressions caused" and adversary's resistance signal are
 * consequently NOT implemented as score inputs in this pass — doing so
 * would mean scoring a client-posted boolean, which the standing note rules
 * out. This is a disclosed limitation, not an oversight: closing it needs
 * either a server-side execution engine (explicitly "next month",
 * EXECUTION-STATE.md) or re-authoring those tiers as io-cases too, both
 * outside this task. Flagged in the Task 8 report.
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

/** Used when the client reported no time-to-first-edit signal at all — neutral, neither rewarded nor punished. */
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

export function scoreProblemSolving(input: ProblemSolvingInput): number {
  // A ticket with zero io-case hidden tests (an assisted, probe-only ticket
  // like the fixture's DEMO-101) has no scored signal to give here. Default
  // to full credit rather than penalizing a ticket for its own authoring
  // shape — assisted attempts don't feed the readiness score anyway.
  if (input.hiddenIoCaseTotal === 0) return 100
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
// Communication — null unless the ticket collects prose, else renormalized by computeOverallScore
// ============================================================

/** Checked in descending `minLength` order; the first band the trimmed length clears wins. */
export const COMMUNICATION_PR_LENGTH_BANDS = [
  { minLength: 120, score: 100 },
  { minLength: 40, score: 70 },
  { minLength: 1, score: 40 },
] as const

export function scorePrDescription(prDescription: string): number {
  const length = prDescription.trim().length
  for (const band of COMMUNICATION_PR_LENGTH_BANDS) {
    if (length >= band.minLength) return band.score
  }
  return 0
}

export interface CommunicationInput {
  /** Free-text PR description, if the request included one. */
  prDescription?: string
  /** How many review-round push-back decisions carried a non-empty reason. Undefined until the review round has happened. */
  reviewReasonsGiven?: number
  /** Total review-round decisions made. Undefined (or 0) until the review round has happened. */
  reviewDecisionsTotal?: number
}

/**
 * Returns `null` when the ticket collected no prose at all — computeOverallScore
 * renormalizes across the remaining four dimensions in that case, per
 * WORKBOOK-SPEC.md §5. A PR description and a review round can each supply a
 * signal independently (an assisted or unassisted ticket may only ever have
 * a PR description; a review-only ticket may only have review reasons before
 * a description is written); when both are present they are averaged.
 */
export function scoreCommunication(input: CommunicationInput): number | null {
  const trimmedPr = input.prDescription?.trim() ?? ""
  const hasPrSignal = trimmedPr.length > 0
  const hasReviewSignal = (input.reviewDecisionsTotal ?? 0) > 0

  if (!hasPrSignal && !hasReviewSignal) return null

  const prScore = hasPrSignal ? scorePrDescription(trimmedPr) : null
  const reviewScore = hasReviewSignal
    ? clampRound(((input.reviewReasonsGiven ?? 0) / (input.reviewDecisionsTotal as number)) * 100)
    : null

  if (prScore !== null && reviewScore !== null) return clampRound((prScore + reviewScore) / 2)
  return prScore ?? reviewScore
}

// ============================================================
// Verification — escaped-defect rate + learner-test-presence bonus + review-round correctness
// ============================================================

/** Added to the escaped-defect-rate base score when the learner's submission reported adding a new test case. Capped at 100. */
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

export function scoreVerification(input: VerificationInput): number {
  const escapedRate =
    input.hiddenIoCaseTotal > 0 ? 1 - input.hiddenIoCasePassed / input.hiddenIoCaseTotal : 0
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
// Overall — rubric-weighted, renormalized when communication is null
// ============================================================

export interface RubricWeights {
  understanding: number
  problemSolving: number
  codeQuality: number
  communication: number
  verification: number
}

export interface DimensionScores {
  understanding: number
  problemSolving: number
  codeQuality: number
  communication: number | null
  verification: number
}

/**
 * Weighted average over whichever dimensions are ACTIVE (communication is
 * excluded from both the numerator and the denominator when it is `null`),
 * which is mathematically identical to redistributing its authored weight
 * proportionally across the rest — the renormalization WORKBOOK-SPEC.md §5
 * requires, without needing a separate redistribution step. Falls back to a
 * plain average of the active scores if every supplied weight is zero
 * (malformed rubric content), so a divide-by-zero can never surface as a
 * score.
 */
export function computeOverallScore(scores: DimensionScores, weights: RubricWeights): number {
  const active: Array<{ score: number; weight: number }> = [
    { score: scores.understanding, weight: weights.understanding },
    { score: scores.problemSolving, weight: weights.problemSolving },
    { score: scores.codeQuality, weight: weights.codeQuality },
    { score: scores.verification, weight: weights.verification },
  ]
  if (scores.communication !== null) {
    active.push({ score: scores.communication, weight: weights.communication })
  }

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
