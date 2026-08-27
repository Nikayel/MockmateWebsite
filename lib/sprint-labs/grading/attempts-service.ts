/**
 * The Sprint Labs attempts service (docs/sprint-labs/PLAN.md Task 8):
 * open/complete/review orchestration. Thin route handlers call these three
 * functions; everything Firestore-touching, sealed-content-reading, and
 * scoring-orchestrating lives here so the routes stay parse -> auth ->
 * validate -> service -> response.
 *
 * Ownership match for the sealing test: this is the ONLY file that imports
 * `loadSealedTicket` for the attempts surface, so it — not the three thin
 * route files — is what's added to lib/sprint-labs/__tests__/sealing.test.ts's
 * ALLOWED_IMPORTERS.
 *
 * ## Persistence shapes
 *
 * The `TicketAttempt` document at `sprintLabRuns/{runId}/attempts/{attemptId}`
 * is written using `ticketAttemptSchema` (`lib/sprint-labs/types.ts`)
 * DIRECTLY as the storage schema, exactly like `runs.ts` does for
 * `WorkspaceFileDoc` — that schema already carries everything a learner may
 * ever see (WORKBOOK-SPEC.md's spoiler-boundary invariant), so there is no
 * separate "stored vs public" shape to maintain for it.
 *
 * One small SIBLING doc per attempt, `attempts/{attemptId}/meta/grading`,
 * holds bookkeeping this module owns and Task 1 never typed: the io-case
 * pass/total counts, the learner-added-test flag, and the PR description —
 * enough to recompute Verification/Communication faithfully when the review
 * round lands later, without needing to re-derive a variant's issued set
 * from scratch or smuggle extra keys onto the `.strict()` attempt doc.
 * Another sibling, `attempts/{attemptId}/reviewRound/decision`, records the
 * learner's per-comment accept/push-back decisions once, for idempotency.
 *
 * ## The finalize decision is transactional, on purpose
 *
 * `completeSprintLabAttempt` reads the ticket's existing attempts TWICE:
 * once before scoring (to derive `attemptIndex` for the variant/budget
 * checks, and to validate the client's `variantId` is still current — the
 * optimistic-concurrency guard against a stale/replayed attempt), and again
 * INSIDE the transaction that writes the new attempt doc, where the fresh
 * count is what actually decides `finalized`. Firestore's transaction
 * conflict-retry is what makes that second read authoritative even if a
 * write landed in the gap between the two reads — see the file's git
 * history / Task 8 report for the full reasoning.
 */

import { z } from "zod"
import { adminDb } from "@/lib/firebase-admin"
import { logger } from "@/lib/logger"
import { trackUsageEvent } from "@/lib/usage-tracking"
import { getTicket } from "@/lib/sprint-labs/content/registry"
import { loadSealedTicket } from "@/lib/scenarios/sealed/sprint-labs/registry.server"
import { recordSprintLabMastery } from "@/lib/sprint-labs/mastery"
import { requireOwnedActiveRun, type StoredSprintLabRun } from "@/lib/sprint-labs/runs"
import {
  ticketAttemptSchema,
  type AiPolicy,
  type GateResult,
  type TicketAttempt,
  type TicketAttemptScores,
} from "@/lib/sprint-labs/types"
import { checkSubmissionBudget, SPRINT_LAB_SUBMISSION_BUDGET } from "./budget"
import { countDiffChangedLines, extractDiffFilePaths } from "./diff-utils"
import { runHiddenGate } from "./gate-runner"
import {
  computeOverallScore,
  scoreCodeQuality,
  scoreCommunication,
  scoreProblemSolving,
  scoreUnderstanding,
  scoreVerification,
  type RubricWeights,
} from "./scorer"
import { selectHiddenVariant } from "./variant"

const RUNS_COLLECTION = "sprintLabRuns"
const ATTEMPTS_SUBCOLLECTION = "attempts"

export const SPRINT_LAB_ATTEMPT_ERRORS = {
  UNKNOWN_TICKET: "UNKNOWN_TICKET",
  BUDGET_EXCEEDED: "BUDGET_EXCEEDED",
  COOLDOWN_ACTIVE: "COOLDOWN_ACTIVE",
  STALE_ATTEMPT: "STALE_ATTEMPT",
  ATTEMPT_NOT_FOUND: "ATTEMPT_NOT_FOUND",
  NOT_REVIEW_ONLY: "NOT_REVIEW_ONLY",
  ALREADY_REVIEWED: "ALREADY_REVIEWED",
  INVALID_REVIEW_DECISIONS: "INVALID_REVIEW_DECISIONS",
} as const

type SprintLabAttemptErrorCode =
  (typeof SPRINT_LAB_ATTEMPT_ERRORS)[keyof typeof SPRINT_LAB_ATTEMPT_ERRORS]

/** Map a thrown service error to the HTTP status a route should respond with, or `null` for a 500. */
export function sprintLabAttemptErrorStatus(error: unknown): number | null {
  if (!(error instanceof Error)) return null
  switch (error.message as SprintLabAttemptErrorCode) {
    case SPRINT_LAB_ATTEMPT_ERRORS.UNKNOWN_TICKET:
    case SPRINT_LAB_ATTEMPT_ERRORS.NOT_REVIEW_ONLY:
    case SPRINT_LAB_ATTEMPT_ERRORS.INVALID_REVIEW_DECISIONS:
      return 400
    case SPRINT_LAB_ATTEMPT_ERRORS.ATTEMPT_NOT_FOUND:
      return 404
    case SPRINT_LAB_ATTEMPT_ERRORS.BUDGET_EXCEEDED:
    case SPRINT_LAB_ATTEMPT_ERRORS.COOLDOWN_ACTIVE:
    case SPRINT_LAB_ATTEMPT_ERRORS.STALE_ATTEMPT:
    case SPRINT_LAB_ATTEMPT_ERRORS.ALREADY_REVIEWED:
      return 409
    default:
      return null
  }
}

/** A rubric-free ticket (no sealed content authored, or authored with all-zero weights) falls back to an equal split rather than a divide-by-zero. */
const DEFAULT_RUBRIC_WEIGHTS: RubricWeights = {
  understanding: 0.2,
  problemSolving: 0.2,
  codeQuality: 0.2,
  communication: 0.2,
  verification: 0.2,
}

function attemptsCollection(runId: string) {
  return adminDb.collection(RUNS_COLLECTION).doc(runId).collection(ATTEMPTS_SUBCOLLECTION)
}

function parseStoredAttempt(raw: unknown, id: string): TicketAttempt | null {
  const parsed = ticketAttemptSchema.safeParse(raw)
  if (!parsed.success) {
    logger.warn("Discarding malformed sprintLabRuns attempt doc", {
      id,
      issues: parsed.error.errors.map((e) => e.message),
    })
    return null
  }
  return parsed.data
}

async function listAttemptsForTicket(runId: string, ticketKey: string): Promise<TicketAttempt[]> {
  const snap = await attemptsCollection(runId).get()
  return snap.docs
    .map((doc) => parseStoredAttempt(doc.data(), doc.id))
    .filter((a): a is TicketAttempt => a !== null)
    .filter((a) => a.ticketKey === ticketKey)
}

function latestSubmittedAt(attempts: TicketAttempt[]): string | null {
  if (attempts.length === 0) return null
  return attempts.reduce(
    (latest, a) => (a.submittedAt > latest ? a.submittedAt : latest),
    attempts[0].submittedAt
  )
}

/**
 * Every ticket key already marked "done" on the run's board, excluding the
 * current one — derived from the LEARNER's own board state (the run doc this
 * service already reads), not a content-registry "tickets for sprint N"
 * lookup, which does not exist yet (see lib/sprint-labs/runs.ts's own
 * documented limitation on `getTicket`/`getSprint`). Reflects what the
 * learner has actually shipped so far, which is what a regression check
 * cares about.
 */
function buildRegressionManifest(
  run: StoredSprintLabRun,
  currentTicketKey: string
): Array<{ ticketKey: string }> {
  return Object.entries(run.board)
    .filter(([key, status]) => key !== currentTicketKey && status === "done")
    .map(([key]) => ({ ticketKey: key }))
    .sort((a, b) => a.ticketKey.localeCompare(b.ticketKey))
}

function throwCooldownOrBudget(
  check:
    | { allowed: false; reason: "BUDGET_EXCEEDED" }
    | { allowed: false; reason: "COOLDOWN_ACTIVE"; retryAfterSeconds: number }
): never {
  if (check.reason === "BUDGET_EXCEEDED") {
    throw new Error(SPRINT_LAB_ATTEMPT_ERRORS.BUDGET_EXCEEDED)
  }
  const error = new Error(SPRINT_LAB_ATTEMPT_ERRORS.COOLDOWN_ACTIVE) as Error & {
    retryAfterSeconds: number
  }
  error.retryAfterSeconds = check.retryAfterSeconds
  throw error
}

/** A gate whose per-case verdicts are client-reported aggregate counts (visible/regression/adversary — see gate-runner.ts's file header for why these never score). One synthetic case summarizes the count; an empty/absent report yields no cases at all rather than a fabricated one. */
function buildAggregateGateResult(
  gate: "visible" | "regression" | "adversary",
  counts: { passed: number; total: number } | undefined
): GateResult {
  if (!counts || counts.total <= 0) return { gate, cases: [] }
  return {
    gate,
    cases: [
      {
        testId: `${gate}-summary`,
        humanName: `${counts.passed}/${counts.total} ${gate} tests passed`,
        passed: counts.passed === counts.total,
      },
    ],
  }
}

// ============================================================
// meta/grading — internal bookkeeping the review round reads back
// ============================================================

const gradingMetaSchema = z.object({
  scoredPassed: z.number().int().nonnegative(),
  scoredTotal: z.number().int().nonnegative(),
  learnerAddedTest: z.boolean(),
  prDescription: z.string().nullable(),
})
type GradingMeta = z.infer<typeof gradingMetaSchema>

function gradingMetaRef(runId: string, attemptId: string) {
  return attemptsCollection(runId).doc(attemptId).collection("meta").doc("grading")
}

async function readGradingMeta(runId: string, attemptId: string): Promise<GradingMeta | null> {
  const snap = await gradingMetaRef(runId, attemptId).get()
  if (!snap.exists) return null
  const parsed = gradingMetaSchema.safeParse(snap.data())
  return parsed.success ? parsed.data : null
}

// ============================================================
// Open
// ============================================================

export const openAttemptInputSchema = z.object({
  runId: z.string().min(1),
  ticketKey: z.string().min(1),
})
export type OpenAttemptInput = z.infer<typeof openAttemptInputSchema>

export interface OpenAttemptResult {
  attemptId: string
  ticketKey: string
  variantId: string
  aiPolicy: AiPolicy
  ioCases: Array<{ id: string; humanName: string; input: unknown }>
  probes: Array<{ id: string; humanName: string; body: string }>
  regressionManifest: Array<{ ticketKey: string }>
  submissionsUsed: number
  submissionsRemaining: number
}

export async function openSprintLabAttempt(
  userId: string,
  input: OpenAttemptInput
): Promise<OpenAttemptResult> {
  const parsed = openAttemptInputSchema.parse(input)
  const run = await requireOwnedActiveRun(userId, parsed.runId)

  const compiledTicket = await getTicket(run.workbookId, parsed.ticketKey)
  if (!compiledTicket) throw new Error(SPRINT_LAB_ATTEMPT_ERRORS.UNKNOWN_TICKET)

  const sealed = await loadSealedTicket(run.workbookId, parsed.ticketKey)
  const hiddenCases = sealed?.hiddenCases ?? []

  const existing = await listAttemptsForTicket(run.id, parsed.ticketKey)
  const attemptIndex = existing.length

  const budgetCheck = checkSubmissionBudget({
    priorAttemptCount: attemptIndex,
    mostRecentSubmittedAt: latestSubmittedAt(existing),
    now: new Date(),
  })
  if (!budgetCheck.allowed) throwCooldownOrBudget(budgetCheck)

  const ioCaseIds = hiddenCases.filter((c) => c.kind === "io-case").map((c) => c.id)
  const variant = selectHiddenVariant(ioCaseIds, userId, parsed.ticketKey, attemptIndex)
  const issued = new Set(variant.issuedCaseIds)

  const ioCases = hiddenCases
    .filter((c) => c.kind === "io-case" && issued.has(c.id))
    .map((c) => ({ id: c.id, humanName: c.humanName, input: c.input }))

  const probes =
    compiledTicket.ticket.aiPolicy === "assisted"
      ? hiddenCases
          .filter((c) => c.kind === "probe")
          .map((c) => ({ id: c.id, humanName: c.humanName, body: c.body ?? "" }))
      : []

  const attemptId = attemptsCollection(run.id).doc().id

  return {
    attemptId,
    ticketKey: parsed.ticketKey,
    variantId: variant.variantId,
    aiPolicy: compiledTicket.ticket.aiPolicy,
    ioCases,
    probes,
    regressionManifest: buildRegressionManifest(run, parsed.ticketKey),
    submissionsUsed: attemptIndex,
    submissionsRemaining: Math.max(0, SPRINT_LAB_SUBMISSION_BUDGET - attemptIndex - 1),
  }
}

// ============================================================
// Complete
// ============================================================

export const completeAttemptInputSchema = z.object({
  runId: z.string().min(1),
  ticketKey: z.string().min(1),
  attemptId: z.string().min(1),
  variantId: z.string().min(1),
  ioCaseOutputs: z.record(z.string(), z.unknown()).default({}),
  probeResults: z.record(z.string(), z.boolean()).default({}),
  visibleResults: z
    .object({ passed: z.number().int().nonnegative(), total: z.number().int().nonnegative() })
    .optional(),
  regressionResults: z
    .object({ passed: z.number().int().nonnegative(), total: z.number().int().nonnegative() })
    .optional(),
  adversaryResults: z
    .object({ passed: z.number().int().nonnegative(), total: z.number().int().nonnegative() })
    .optional(),
  filesTouched: z.array(z.string()).default([]),
  timeToFirstEditSeconds: z.number().nonnegative().nullable().default(null),
  diffLineCount: z.number().int().nonnegative().default(0),
  learnerAddedTest: z.boolean().default(false),
  prDescription: z.string().max(5000).optional(),
  modelId: z.string().max(200).optional(),
})
export type CompleteAttemptInput = z.infer<typeof completeAttemptInputSchema>

export interface CompleteAttemptOutcome {
  attempt: TicketAttempt
  submissionsRemaining: number
  /** R11: comment TEXTS only (no `correct` flags), released once the ticket legitimately enters review. */
  reviewComments?: Array<{ id: string; body: string }>
}

export async function completeSprintLabAttempt(
  userId: string,
  rawInput: CompleteAttemptInput
): Promise<CompleteAttemptOutcome> {
  const input = completeAttemptInputSchema.parse(rawInput)
  const run = await requireOwnedActiveRun(userId, input.runId)

  const compiledTicket = await getTicket(run.workbookId, input.ticketKey)
  if (!compiledTicket) throw new Error(SPRINT_LAB_ATTEMPT_ERRORS.UNKNOWN_TICKET)

  const sealed = await loadSealedTicket(run.workbookId, input.ticketKey)
  const hiddenCases = sealed?.hiddenCases ?? []
  const ioCaseIds = hiddenCases.filter((c) => c.kind === "io-case").map((c) => c.id)

  const existingBeforeWrite = await listAttemptsForTicket(run.id, input.ticketKey)
  const attemptIndex = existingBeforeWrite.length

  const budgetCheck = checkSubmissionBudget({
    priorAttemptCount: attemptIndex,
    mostRecentSubmittedAt: latestSubmittedAt(existingBeforeWrite),
    now: new Date(),
  })
  if (!budgetCheck.allowed) throwCooldownOrBudget(budgetCheck)

  // Optimistic-concurrency guard: re-derive what THIS attemptIndex's variant
  // would be right now and compare against what the client echoes back. A
  // mismatch means the attempt count moved on since /attempts issued this
  // variantId (a race, or simply a stale/replayed request) — reject rather
  // than grade against a variant that no longer corresponds to reality.
  const variant = selectHiddenVariant(ioCaseIds, userId, input.ticketKey, attemptIndex)
  if (variant.variantId !== input.variantId) {
    throw new Error(SPRINT_LAB_ATTEMPT_ERRORS.STALE_ATTEMPT)
  }

  const gate = runHiddenGate({
    hiddenCases,
    issuedIoCaseIds: variant.issuedCaseIds,
    ioCaseOutputs: input.ioCaseOutputs,
    probeResults: input.probeResults,
  })

  const referenceManifest = sealed ? extractDiffFilePaths(sealed.referenceDiff) : []
  const referenceDiffLines = sealed ? countDiffChangedLines(sealed.referenceDiff) : 0

  const understanding = scoreUnderstanding({
    filesTouched: input.filesTouched,
    referenceManifest,
    timeToFirstEditSeconds: input.timeToFirstEditSeconds,
  })
  const problemSolving = scoreProblemSolving({
    hiddenIoCasePassed: gate.scoredPassed,
    hiddenIoCaseTotal: gate.scoredTotal,
  })
  const codeQuality = scoreCodeQuality({
    learnerDiffLines: input.diffLineCount,
    referenceDiffLines,
  })
  const communication = scoreCommunication({ prDescription: input.prDescription })
  const verification = scoreVerification({
    hiddenIoCasePassed: gate.scoredPassed,
    hiddenIoCaseTotal: gate.scoredTotal,
    learnerAddedTest: input.learnerAddedTest,
  })
  const rubricWeights: RubricWeights = sealed?.rubric.weights ?? DEFAULT_RUBRIC_WEIGHTS
  const overall = computeOverallScore(
    { understanding, problemSolving, codeQuality, communication, verification },
    rubricWeights
  )

  const gateResults: GateResult[] = [
    buildAggregateGateResult("visible", input.visibleResults),
    gate.gateResult,
    buildAggregateGateResult("regression", input.regressionResults),
    buildAggregateGateResult("adversary", input.adversaryResults),
  ]

  const scores: TicketAttemptScores = {
    understanding,
    problemSolving,
    codeQuality,
    communication,
    verification,
    overall,
  }

  const submittedAt = new Date().toISOString()
  const attemptRef = attemptsCollection(run.id).doc(input.attemptId)
  const metaRef = gradingMetaRef(run.id, input.attemptId)

  const { attempt } = await adminDb.runTransaction(async (tx) => {
    // Re-read the ticket's attempts FRESH, inside the transaction: this is
    // the read that actually decides `finalized`, per WORKBOOK-SPEC.md §5
    // rule 2. Firestore retries the whole transaction if a conflicting
    // write lands on a document this read touched, so this stays correct
    // even under the (practically unrealistic, single learner) case of two
    // concurrent completions on the same ticket.
    const freshSnap = await tx.get(attemptsCollection(run.id))
    const freshDocs = (
      freshSnap as { docs: Array<{ id: string; data: () => Record<string, unknown> }> }
    ).docs
    const alreadyForTicket = freshDocs
      .map((doc) => parseStoredAttempt(doc.data(), doc.id))
      .filter((a): a is TicketAttempt => a !== null)
      .filter((a) => a.ticketKey === input.ticketKey)
    const finalized = alreadyForTicket.length === 0

    const candidate: TicketAttempt = {
      ticketKey: input.ticketKey,
      aiPolicy: compiledTicket.ticket.aiPolicy,
      variantId: variant.variantId,
      finalized,
      gateResults,
      escapedDefects: gate.escapedDefects,
      scores,
      modelId: input.modelId,
      submittedAt,
    }
    const validated = ticketAttemptSchema.parse(candidate)
    tx.set(attemptRef, validated)
    tx.set(metaRef, {
      scoredPassed: gate.scoredPassed,
      scoredTotal: gate.scoredTotal,
      learnerAddedTest: input.learnerAddedTest,
      prDescription: input.prDescription ?? null,
    } satisfies GradingMeta)

    return { attempt: validated }
  })

  await trackUsageEvent({
    userId,
    eventType: "session_end",
    service: "sprint-labs-grading",
    scenarioId: `sprint-labs:${run.workbookId}:${input.ticketKey}`,
    cost: 0,
  }).catch((error: unknown) => {
    logger.error("sprint-labs-grading usage tracking failed", { error, userId, runId: run.id })
  })

  // recordSprintLabMastery is itself best-effort/never-throws (mastery.ts),
  // but the ai_policy/finalized gate is checked there too — this call is
  // unconditional on purpose, so there is exactly one place that decides
  // the gate.
  await recordSprintLabMastery(userId, run.workbookId, compiledTicket.ticket, attempt)

  const reviewComments =
    compiledTicket.ticket.aiPolicy === "review-only" && sealed?.review
      ? sealed.review.map((c) => ({ id: c.id, body: c.body }))
      : undefined

  return {
    attempt,
    submissionsRemaining: Math.max(0, SPRINT_LAB_SUBMISSION_BUDGET - attemptIndex - 1),
    reviewComments,
  }
}

// ============================================================
// Review round
// ============================================================

export const reviewDecisionSchema = z.object({
  commentId: z.string().min(1),
  decision: z.enum(["accept", "push-back"]),
  reason: z.string().max(2000).optional(),
})

export const reviewAttemptInputSchema = z.object({
  runId: z.string().min(1),
  ticketKey: z.string().min(1),
  attemptId: z.string().min(1),
  decisions: z.array(reviewDecisionSchema).min(1),
})
export type ReviewAttemptInput = z.infer<typeof reviewAttemptInputSchema>

export interface ReviewAttemptOutcome {
  scores: TicketAttemptScores
  finalized: boolean
  /** Released ONLY when the attempt is finalized (R11). */
  released?: { review: Array<{ id: string; correct: boolean }>; referenceDiff: string }
}

export async function reviewSprintLabAttempt(
  userId: string,
  rawInput: ReviewAttemptInput
): Promise<ReviewAttemptOutcome> {
  const input = reviewAttemptInputSchema.parse(rawInput)
  const run = await requireOwnedActiveRun(userId, input.runId)

  const compiledTicket = await getTicket(run.workbookId, input.ticketKey)
  if (!compiledTicket) throw new Error(SPRINT_LAB_ATTEMPT_ERRORS.UNKNOWN_TICKET)
  if (compiledTicket.ticket.aiPolicy !== "review-only") {
    throw new Error(SPRINT_LAB_ATTEMPT_ERRORS.NOT_REVIEW_ONLY)
  }

  const sealed = await loadSealedTicket(run.workbookId, input.ticketKey)
  if (!sealed?.review || sealed.review.length === 0) {
    throw new Error(SPRINT_LAB_ATTEMPT_ERRORS.NOT_REVIEW_ONLY)
  }

  const sealedIds = new Set(sealed.review.map((c) => c.id))
  const decisionIds = input.decisions.map((d) => d.commentId)
  const coversExactly =
    decisionIds.length === sealedIds.size &&
    new Set(decisionIds).size === decisionIds.length &&
    decisionIds.every((id) => sealedIds.has(id))
  if (!coversExactly) throw new Error(SPRINT_LAB_ATTEMPT_ERRORS.INVALID_REVIEW_DECISIONS)

  const attemptRef = attemptsCollection(run.id).doc(input.attemptId)
  const reviewDocRef = attemptRef.collection("reviewRound").doc("decision")

  const attemptSnap = await attemptRef.get()
  if (!attemptSnap.exists) throw new Error(SPRINT_LAB_ATTEMPT_ERRORS.ATTEMPT_NOT_FOUND)
  const attempt = parseStoredAttempt(attemptSnap.data(), attemptSnap.id)
  if (!attempt || attempt.ticketKey !== input.ticketKey) {
    throw new Error(SPRINT_LAB_ATTEMPT_ERRORS.ATTEMPT_NOT_FOUND)
  }

  const reviewSnap = await reviewDocRef.get()
  if (reviewSnap.exists) throw new Error(SPRINT_LAB_ATTEMPT_ERRORS.ALREADY_REVIEWED)

  const correctById = new Map(sealed.review.map((c) => [c.id, c.correct]))
  let correctCount = 0
  let reasonsGiven = 0
  for (const decision of input.decisions) {
    const isCorrectComment = correctById.get(decision.commentId) === true
    const decisionWasRight =
      (isCorrectComment && decision.decision === "accept") ||
      (!isCorrectComment && decision.decision === "push-back")
    if (decisionWasRight) correctCount++
    if (decision.decision === "push-back" && (decision.reason ?? "").trim().length > 0) {
      reasonsGiven++
    }
  }
  const totalCount = input.decisions.length

  const gradingMeta = await readGradingMeta(run.id, input.attemptId)
  const verification = scoreVerification({
    hiddenIoCasePassed: gradingMeta?.scoredPassed ?? 0,
    hiddenIoCaseTotal: gradingMeta?.scoredTotal ?? 0,
    learnerAddedTest: gradingMeta?.learnerAddedTest ?? false,
    reviewCorrectDecisions: correctCount,
    reviewTotalDecisions: totalCount,
  })
  const communication = scoreCommunication({
    prDescription: gradingMeta?.prDescription ?? undefined,
    reviewReasonsGiven: reasonsGiven,
    reviewDecisionsTotal: totalCount,
  })

  const rubricWeights: RubricWeights = sealed.rubric.weights ?? DEFAULT_RUBRIC_WEIGHTS
  const scores: TicketAttemptScores = {
    understanding: attempt.scores.understanding,
    problemSolving: attempt.scores.problemSolving,
    codeQuality: attempt.scores.codeQuality,
    communication,
    verification,
    overall: computeOverallScore(
      {
        understanding: attempt.scores.understanding,
        problemSolving: attempt.scores.problemSolving,
        codeQuality: attempt.scores.codeQuality,
        communication,
        verification,
      },
      rubricWeights
    ),
  }

  const updatedAttempt = ticketAttemptSchema.parse({ ...attempt, scores })

  await adminDb.runTransaction(async (tx) => {
    const reCheck = await tx.get(reviewDocRef)
    if ((reCheck as { exists: boolean }).exists)
      throw new Error(SPRINT_LAB_ATTEMPT_ERRORS.ALREADY_REVIEWED)
    tx.set(attemptRef, updatedAttempt)
    tx.set(reviewDocRef, {
      decisions: input.decisions,
      correctCount,
      totalCount,
      reviewedAt: new Date().toISOString(),
    })
  })

  return {
    scores,
    finalized: attempt.finalized,
    released: attempt.finalized
      ? {
          review: sealed.review.map((c) => ({ id: c.id, correct: c.correct })),
          referenceDiff: sealed.referenceDiff,
        }
      : undefined,
  }
}
