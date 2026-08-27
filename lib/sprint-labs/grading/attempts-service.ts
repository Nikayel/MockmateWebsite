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
 * ## Persistence shapes (fix round 1, C1 — rewritten)
 *
 * ONE document per attempt at `sprintLabRuns/{runId}/attempts/{attemptId}`,
 * through two lifecycle states, both validated by the internal
 * `storedAttemptDocSchema` below (a superset of Task 1's frozen, `.strict()`
 * `ticketAttemptSchema` — which has no room for `status`/`attemptIndex`, so
 * this module cannot use it directly as the storage schema the way `runs.ts`
 * does for `WorkspaceFileDoc`):
 *
 *  - `status: "open"` — written by `openSprintLabAttempt`, via `tx.create`
 *    (fails outright if the id somehow already exists): `{ticketKey,
 *    variantId, attemptIndex, aiPolicy, openedAt, status}`.
 *  - `status: "completed"` — written by `completeSprintLabAttempt`, which
 *    transitions the SAME document: adds `finalized`, `gateResults`,
 *    `escapedDefects`, `scores`, `modelId?`, `submittedAt`.
 *
 * `completeSprintLabAttempt` and `reviewSprintLabAttempt` both REQUIRE the
 * doc to exist, belong to the ticket in the request, and (for complete) be
 * `status: "open"` before writing — read-then-write inside ONE transaction,
 * never a bare unconditional `tx.set`. This is what makes attemptId reuse,
 * cross-ticket reuse, and a same-attemptId resubmission race all rejected
 * with a typed error instead of silently re-scoring or overwriting a
 * finalized doc (see the fix-round tests: "same attemptId cannot repeat a
 * variant", "cross-ticket attemptId cannot re-finalize").
 *
 * `projectTicketAttempt` is the ONLY place a completed `StoredAttemptDoc`
 * turns into the frozen, learner-facing `TicketAttempt` — it throws if
 * called on a doc that isn't `status: "completed"` yet, so a caller can
 * never accidentally leak a stub.
 *
 * Two small sibling docs, owned entirely by this module:
 *  - `attempts/{attemptId}/meta/grading` — `{scoredPassed, scoredTotal,
 *    learnerAddedTest, prDescription}`, frozen at complete time, read back
 *    at review time so Verification/Communication recompute faithfully
 *    without re-running the gate or losing the "zero io-cases" fact once
 *    `scores.problemSolving`/`verification` have already been collapsed to
 *    `0` for storage (see the I6 note below).
 *  - `attempts/{attemptId}/reviewRound/decision` — the learner's per-comment
 *    decisions, for idempotency (`ALREADY_REVIEWED`).
 *
 * Neither sibling doc needed a `firestore.rules` change: `attempts/{attemptId}`
 * already reads `allow write: if false` with no recursive wildcard, so an
 * undeclared nested subcollection is unreachable to any client SDK call by
 * construction, and every write here goes through the Admin SDK, which
 * bypasses rules entirely.
 *
 * ## I3/I4 — budget and finalize-once are both transactional, on purpose
 *
 * Budget/cooldown is decided on a FRESH read inside the SAME transaction
 * that creates the attempt's stub doc at open time (I3) — the slot and the
 * stub are consumed atomically. Finalize-once is decided by a
 * `.where("ticketKey", "==", ...)`-scoped read inside the transaction that
 * transitions the doc to `completed` (I4), so it is a document-level
 * guarantee: Firestore retries the whole transaction if a conflicting write
 * lands on a document either read touched, which is what makes the fresh
 * read authoritative even under a genuine race.
 *
 * ## I6 — zero io-cases collapses to 0, never 100, and is excluded from `overall`'s weighting
 *
 * `scorer.ts`'s `scoreProblemSolving`/`scoreVerification` return `null` when
 * a ticket has zero io-case hidden tests (a content-authoring bug for a
 * score-feeding ticket). The frozen `ticketAttemptScoresSchema` types both
 * fields as non-nullable `z.number()`, so this module collapses a `null` to
 * `0` for STORAGE (never left unexplained, never defaulted to 100) — but
 * `computeOverallScore` is always called with the TRUE nullable value
 * first, so `overall` correctly renormalizes across the dimensions that DO
 * have signal, undiluted by a fabricated 0. See scorer.ts's file header for
 * the full reasoning and the Task 8 report for this being flagged as a
 * schema tension, not a silent gap.
 *
 * ## I5 — review-only mastery defers to the review round
 *
 * `completeSprintLabAttempt` does not call `recordSprintLabMastery` for a
 * review-only ticket: Verification/Communication have no server-verifiable
 * signal yet at that point (the review round hasn't happened). Mastery for
 * a review-only ticket is recorded by `reviewSprintLabAttempt`, once
 * finalized, using the fully-updated scores — the one point at which
 * WORKBOOK-SPEC.md's "did you refuse the bad PR" signal actually exists.
 */

import { z } from "zod"
import { adminDb } from "@/lib/firebase-admin"
import { logger } from "@/lib/logger"
import { trackUsageEvent } from "@/lib/usage-tracking"
import { getTicket } from "@/lib/sprint-labs/content/registry"
import { loadSealedTicket } from "@/lib/scenarios/sealed/sprint-labs/registry.server"
import { recordSprintLabMastery } from "@/lib/sprint-labs/mastery"
import {
  listWorkspaceFiles,
  requireOwnedActiveRun,
  type StoredSprintLabRun,
} from "@/lib/sprint-labs/runs"
import {
  aiPolicySchema,
  gateResultSchema,
  ticketAttemptSchema,
  ticketAttemptScoresSchema,
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
import { deriveTimeToFirstEditSeconds, deriveWorkspaceSignals } from "./workspace-signals"

const RUNS_COLLECTION = "sprintLabRuns"
const ATTEMPTS_SUBCOLLECTION = "attempts"

export const SPRINT_LAB_ATTEMPT_ERRORS = {
  UNKNOWN_TICKET: "UNKNOWN_TICKET",
  BUDGET_EXCEEDED: "BUDGET_EXCEEDED",
  COOLDOWN_ACTIVE: "COOLDOWN_ACTIVE",
  /** The attemptId is unknown, or exists but belongs to a different ticket (C1: unknown/foreign ids). */
  ATTEMPT_NOT_FOUND: "ATTEMPT_NOT_FOUND",
  /** The attemptId is real and matches the ticket, but is no longer `status: "open"` (C1: reused ids). */
  ATTEMPT_ALREADY_COMPLETED: "ATTEMPT_ALREADY_COMPLETED",
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
    case SPRINT_LAB_ATTEMPT_ERRORS.ATTEMPT_ALREADY_COMPLETED:
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

/** Single path segment (C1): no `/`, safe charset, bounded length. Firestore auto-ids (what `/attempts` issues) already fit this; kept lenient enough not to be brittle if that format ever changes. */
const ATTEMPT_ID_SHAPE = /^[A-Za-z0-9_-]{1,200}$/
const attemptIdSchema = z
  .string()
  .regex(ATTEMPT_ID_SHAPE, "attemptId must be a single path segment")

function attemptsCollection(
  runId: string
): FirebaseFirestore.CollectionReference<FirebaseFirestore.DocumentData> {
  return adminDb.collection(RUNS_COLLECTION).doc(runId).collection(ATTEMPTS_SUBCOLLECTION)
}

// ============================================================
// Stored attempt doc — stub (open) -> completed. Superset of the frozen
// TicketAttempt; see this file's header for why a separate schema exists.
// ============================================================

const storedAttemptDocSchema = z.object({
  ticketKey: z.string().min(1),
  variantId: z.string().min(1),
  attemptIndex: z.number().int().nonnegative(),
  aiPolicy: aiPolicySchema,
  openedAt: z.string().min(1),
  status: z.enum(["open", "completed"]),
  // Present only once status === "completed":
  finalized: z.boolean().optional(),
  gateResults: z.array(gateResultSchema).optional(),
  escapedDefects: z.array(z.string()).optional(),
  scores: ticketAttemptScoresSchema.optional(),
  modelId: z.string().optional(),
  submittedAt: z.string().optional(),
})
type StoredAttemptDoc = z.infer<typeof storedAttemptDocSchema>

function parseStoredAttemptDoc(raw: unknown, id: string): StoredAttemptDoc | null {
  const parsed = storedAttemptDocSchema.safeParse(raw)
  if (!parsed.success) {
    logger.warn("Discarding malformed sprintLabRuns attempt doc", {
      id,
      issues: parsed.error.errors.map((e) => e.message),
    })
    return null
  }
  return parsed.data
}

/** Projects a COMPLETED stored doc into the frozen, whitelist-safe `TicketAttempt`. Throws (loudly, not silently) if called before completion — a caller bug, never a learner-reachable path. */
function projectTicketAttempt(stored: StoredAttemptDoc): TicketAttempt {
  return ticketAttemptSchema.parse({
    ticketKey: stored.ticketKey,
    aiPolicy: stored.aiPolicy,
    variantId: stored.variantId,
    finalized: stored.finalized,
    gateResults: stored.gateResults,
    escapedDefects: stored.escapedDefects,
    scores: stored.scores,
    modelId: stored.modelId,
    submittedAt: stored.submittedAt,
  })
}

function latestSubmittedAt(attempts: readonly StoredAttemptDoc[]): string | null {
  const withTimestamp = attempts.filter(
    (a): a is StoredAttemptDoc & { submittedAt: string } => typeof a.submittedAt === "string"
  )
  if (withTimestamp.length === 0) return null
  return withTimestamp.reduce(
    (latest, a) => (a.submittedAt > latest ? a.submittedAt : latest),
    withTimestamp[0].submittedAt
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
// attemptsMeta/{ticketKey} — the finalize-once sentinel (fix round 1, I4)
// ============================================================

/**
 * Finalize-once as a document-level guarantee: ONE sentinel doc per
 * (run, ticket), read then (if absent) `tx.create`d inside the SAME
 * transaction that completes an attempt. Whichever completion's transaction
 * commits first wins the create; Firestore retries the other transaction on
 * conflict, so by the time it re-reads, the sentinel already exists and it
 * correctly falls back to formative-only. Simpler to reason about than
 * inferring finalize-once from a query over the whole attempts collection —
 * "does this one document exist" is the entire question.
 */
const finalizeSentinelSchema = z.object({
  finalizedByAttemptId: z.string().min(1),
  finalizedAt: z.string().min(1),
})

function finalizeSentinelRef(
  runId: string,
  ticketKey: string
): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData> {
  return adminDb.collection(RUNS_COLLECTION).doc(runId).collection("attemptsMeta").doc(ticketKey)
}

// ============================================================
// meta/grading — internal bookkeeping the review round reads back
// ============================================================

const gradingMetaSchema = z.object({
  scoredPassed: z.number().int().nonnegative(),
  scoredTotal: z.number().int().nonnegative(),
  learnerAddedTest: z.boolean(),
  /** Accepted from the client and stored for display/retro; NEVER a scoring input (R21). */
  prDescription: z.string().nullable(),
})
type GradingMeta = z.infer<typeof gradingMetaSchema>

function gradingMetaRef(
  runId: string,
  attemptId: string
): FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData> {
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
  const ioCaseIds = hiddenCases.filter((c) => c.kind === "io-case").map((c) => c.id)

  const attemptRef = attemptsCollection(run.id).doc()

  // C1 + I3: the stub is created, and budget/cooldown decided, inside ONE
  // transaction — a fresh read of every existing attempt for this ticket
  // right before the write, so the slot and the stub are consumed
  // atomically. `tx.create` (not `set`) additionally fails outright on an
  // id collision, though with a fresh random `.doc().id` that is a belt,
  // not the primary defense — the primary defense is that COMPLETE later
  // requires this exact doc, matching ticket, still `status: "open"`.
  const { attemptIndex, variant } = await adminDb.runTransaction(async (tx) => {
    // I4: scoped at the Firestore query level (`.where`), not fetched whole
    // and filtered in memory — this transaction only needs, and only reads,
    // this ONE ticket's attempts.
    const freshSnap = await tx.get(
      attemptsCollection(run.id).where("ticketKey", "==", parsed.ticketKey)
    )
    const existing = freshSnap.docs
      .map((doc) => parseStoredAttemptDoc(doc.data(), doc.id))
      .filter((a): a is StoredAttemptDoc => a !== null)

    const attemptIndex = existing.length
    const budgetCheck = checkSubmissionBudget({
      priorAttemptCount: attemptIndex,
      mostRecentSubmittedAt: latestSubmittedAt(existing),
      now: new Date(),
    })
    if (!budgetCheck.allowed) throwCooldownOrBudget(budgetCheck)

    const variant = selectHiddenVariant(ioCaseIds, userId, parsed.ticketKey, attemptIndex)

    const stub: StoredAttemptDoc = {
      ticketKey: parsed.ticketKey,
      variantId: variant.variantId,
      attemptIndex,
      aiPolicy: compiledTicket.ticket.aiPolicy,
      openedAt: new Date().toISOString(),
      status: "open",
    }
    tx.create(attemptRef, storedAttemptDocSchema.parse(stub))

    return { attemptIndex, variant }
  })

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

  return {
    attemptId: attemptRef.id,
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
  attemptId: attemptIdSchema,
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
  /** Accepted and stored for display/retro; never a scoring input (R21 — see scorer.ts). */
  prDescription: z.string().max(5000).optional(),
  modelId: z.string().max(200).optional(),
})
export type CompleteAttemptInput = z.infer<typeof completeAttemptInputSchema>

export interface CompleteAttemptOutcome {
  attempt: TicketAttempt
  submissionsRemaining: number
  /** R11: comment TEXTS only (no `correct` flags), released once the ticket legitimately enters review. */
  reviewComments?: Array<{ id: string; body: string }>
  /** M7: the reference diff, released for EVERY policy once finalized (R11 already covers review comments specifically; this is the general answer-key release). */
  referenceDiff?: string
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

  // R21: every learner-behavior input below is SERVER-DERIVED from the run's
  // own file store — never a request field.
  const workspaceFiles = await listWorkspaceFiles(userId, run.id)
  const { filesTouched, diffLineCount, learnerAddedTest } = deriveWorkspaceSignals(workspaceFiles)
  const timeToFirstEditSeconds = deriveTimeToFirstEditSeconds({
    // `SprintLabRun` does not yet store a per-ticket "entered doing at" mark
    // (Task 6, out of this task's scope) — always null today; see
    // workspace-signals.ts's file header for the documented fallback this
    // feeds into Understanding.
    enteredDoingAt: null,
    fileUpdatedAts: workspaceFiles.map((f) => f.updatedAt),
  })

  const referenceManifest = sealed ? extractDiffFilePaths(sealed.referenceDiff) : []
  const referenceDiffLines = sealed ? countDiffChangedLines(sealed.referenceDiff) : 0
  const rubricWeights: RubricWeights = sealed?.rubric.weights ?? DEFAULT_RUBRIC_WEIGHTS

  const attemptRef = attemptsCollection(run.id).doc(input.attemptId)
  const metaRef = gradingMetaRef(run.id, input.attemptId)
  const sentinelRef = finalizeSentinelRef(run.id, input.ticketKey)

  const { stored, gate } = await adminDb.runTransaction(async (tx) => {
    // C1: require the doc to exist, belong to this ticket, and still be open.
    const stubSnap = await tx.get(attemptRef)
    if (!stubSnap.exists) throw new Error(SPRINT_LAB_ATTEMPT_ERRORS.ATTEMPT_NOT_FOUND)
    const stub = parseStoredAttemptDoc(stubSnap.data(), stubSnap.id)
    if (!stub || stub.ticketKey !== input.ticketKey) {
      // Unknown shape, or a real attemptId that belongs to a DIFFERENT
      // ticket (cross-ticket reuse) — both read as "not a valid attempt for
      // this request," never revealing which.
      throw new Error(SPRINT_LAB_ATTEMPT_ERRORS.ATTEMPT_NOT_FOUND)
    }
    if (stub.status !== "open") {
      throw new Error(SPRINT_LAB_ATTEMPT_ERRORS.ATTEMPT_ALREADY_COMPLETED)
    }

    // I4: finalize-once via the dedicated per-ticket sentinel doc, read then
    // (if absent) created inside this SAME transaction — see
    // finalizeSentinelRef's doc comment for why this is a stronger,
    // simpler-to-reason-about guarantee than inferring it from a query.
    const sentinelSnap = await tx.get(sentinelRef)
    const finalized = !sentinelSnap.exists

    const variant = selectHiddenVariant(ioCaseIds, userId, input.ticketKey, stub.attemptIndex)
    const gate = runHiddenGate({
      hiddenCases,
      issuedIoCaseIds: variant.issuedCaseIds,
      ioCaseOutputs: input.ioCaseOutputs,
      probeResults: input.probeResults,
    })

    const understanding = scoreUnderstanding({
      filesTouched,
      referenceManifest,
      timeToFirstEditSeconds,
    })
    const problemSolvingRaw = scoreProblemSolving({
      hiddenIoCasePassed: gate.scoredPassed,
      hiddenIoCaseTotal: gate.scoredTotal,
    })
    const codeQuality = scoreCodeQuality({ learnerDiffLines: diffLineCount, referenceDiffLines })
    // I5: no review round has happened yet at complete time, even for a
    // review-only ticket — Communication has nothing server-verifiable to
    // score until /attempts/review runs.
    const communicationRaw = scoreCommunication({ isReviewOnly: stub.aiPolicy === "review-only" })
    const verificationRaw = scoreVerification({
      hiddenIoCasePassed: gate.scoredPassed,
      hiddenIoCaseTotal: gate.scoredTotal,
      learnerAddedTest,
    })

    // I6: `overall` is computed from the TRUE nullable values FIRST, so a
    // zero-io-case dimension is excluded from the weighting rather than
    // dragging the average down as a fabricated 0.
    const overall = computeOverallScore(
      {
        understanding,
        problemSolving: problemSolvingRaw,
        codeQuality,
        communication: communicationRaw,
        verification: verificationRaw,
      },
      rubricWeights
    )

    const gateResults: GateResult[] = [
      buildAggregateGateResult("visible", input.visibleResults),
      gate.gateResult,
      buildAggregateGateResult("regression", input.regressionResults),
      buildAggregateGateResult("adversary", input.adversaryResults),
    ]

    // The frozen schema has no null slot for problemSolving/verification —
    // collapse to 0 (never 100) ONLY for storage, after `overall` above
    // already used the true nullable values.
    const scores: TicketAttemptScores = {
      understanding,
      problemSolving: problemSolvingRaw ?? 0,
      codeQuality,
      communication: communicationRaw,
      verification: verificationRaw ?? 0,
      overall,
    }

    const submittedAt = new Date().toISOString()
    const completedDoc: StoredAttemptDoc = {
      ticketKey: input.ticketKey,
      variantId: stub.variantId,
      attemptIndex: stub.attemptIndex,
      aiPolicy: stub.aiPolicy,
      openedAt: stub.openedAt,
      status: "completed",
      finalized,
      gateResults,
      escapedDefects: gate.escapedDefects,
      scores,
      modelId: input.modelId,
      submittedAt,
    }
    const validated = storedAttemptDocSchema.parse(completedDoc)
    tx.set(attemptRef, validated)
    tx.set(metaRef, {
      scoredPassed: gate.scoredPassed,
      scoredTotal: gate.scoredTotal,
      learnerAddedTest,
      prDescription: input.prDescription ?? null,
    } satisfies GradingMeta)
    if (finalized) {
      // tx.create (not set): if a concurrent transaction somehow won the
      // sentinel between our read above and here, Firestore retries this
      // whole transaction rather than let two attempts both believe they
      // finalized.
      tx.create(
        sentinelRef,
        finalizeSentinelSchema.parse({
          finalizedByAttemptId: input.attemptId,
          finalizedAt: submittedAt,
        })
      )
    }

    return { stored: validated, gate }
  })

  const attempt = projectTicketAttempt(stored)

  await trackUsageEvent({
    userId,
    eventType: "session_end",
    service: "sprint-labs-grading",
    scenarioId: `sprint-labs:${run.workbookId}:${input.ticketKey}`,
    cost: 0,
  }).catch((error: unknown) => {
    logger.error("sprint-labs-grading usage tracking failed", { error, userId, runId: run.id })
  })

  // I5: review-only mastery defers to the review round — see this file's header.
  if (compiledTicket.ticket.aiPolicy !== "review-only") {
    await recordSprintLabMastery(userId, run.workbookId, compiledTicket.ticket, attempt)
  }
  void gate // scoredPassed/scoredTotal already persisted to meta/grading above; kept in scope only for that write.

  const reviewComments =
    compiledTicket.ticket.aiPolicy === "review-only" && sealed?.review
      ? sealed.review.map((c) => ({ id: c.id, body: c.body }))
      : undefined

  // M7: released for every policy once finalized.
  const referenceDiff = attempt.finalized && sealed ? sealed.referenceDiff : undefined

  return {
    attempt,
    submissionsRemaining: Math.max(0, SPRINT_LAB_SUBMISSION_BUDGET - stored.attemptIndex - 1),
    reviewComments,
    referenceDiff,
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
  attemptId: attemptIdSchema,
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
  const stub = parseStoredAttemptDoc(attemptSnap.data(), attemptSnap.id)
  if (!stub || stub.ticketKey !== input.ticketKey || stub.status !== "completed") {
    throw new Error(SPRINT_LAB_ATTEMPT_ERRORS.ATTEMPT_NOT_FOUND)
  }
  const attempt = projectTicketAttempt(stub)

  const reviewSnap = await reviewDocRef.get()
  if (reviewSnap.exists) throw new Error(SPRINT_LAB_ATTEMPT_ERRORS.ALREADY_REVIEWED)

  const correctById = new Map(sealed.review.map((c) => [c.id, c.correct]))
  let correctCount = 0
  for (const decision of input.decisions) {
    const isCorrectComment = correctById.get(decision.commentId) === true
    const decisionWasRight =
      (isCorrectComment && decision.decision === "accept") ||
      (!isCorrectComment && decision.decision === "push-back")
    if (decisionWasRight) correctCount++
  }
  const totalCount = input.decisions.length

  const gradingMeta = await readGradingMeta(run.id, input.attemptId)
  const hiddenIoCaseTotal = gradingMeta?.scoredTotal ?? 0
  const verificationRaw = scoreVerification({
    hiddenIoCasePassed: gradingMeta?.scoredPassed ?? 0,
    hiddenIoCaseTotal,
    learnerAddedTest: gradingMeta?.learnerAddedTest ?? false,
    reviewCorrectDecisions: correctCount,
    reviewTotalDecisions: totalCount,
  })
  const communicationRaw = scoreCommunication({
    isReviewOnly: true,
    reviewCorrectDecisions: correctCount,
    reviewDecisionsTotal: totalCount,
  })

  const rubricWeights: RubricWeights = sealed.rubric.weights ?? DEFAULT_RUBRIC_WEIGHTS
  // Reconstruct whether problemSolving was originally null (I6) from the
  // SAME `hiddenIoCaseTotal === 0` fact that made it null at complete
  // time — `attempt.scores.problemSolving` is already collapsed to a
  // stored 0 and cannot be trusted to distinguish "genuinely 0" from
  // "no signal" on its own.
  const problemSolvingForOverall = hiddenIoCaseTotal === 0 ? null : attempt.scores.problemSolving

  const overall = computeOverallScore(
    {
      understanding: attempt.scores.understanding,
      problemSolving: problemSolvingForOverall,
      codeQuality: attempt.scores.codeQuality,
      communication: communicationRaw,
      verification: verificationRaw,
    },
    rubricWeights
  )

  const scores: TicketAttemptScores = {
    understanding: attempt.scores.understanding,
    problemSolving: attempt.scores.problemSolving,
    codeQuality: attempt.scores.codeQuality,
    communication: communicationRaw,
    verification: verificationRaw ?? 0,
    overall,
  }

  const updatedDoc: StoredAttemptDoc = { ...stub, scores }
  const validated = storedAttemptDocSchema.parse(updatedDoc)

  await adminDb.runTransaction(async (tx) => {
    const reCheck = await tx.get(reviewDocRef)
    if (reCheck.exists) throw new Error(SPRINT_LAB_ATTEMPT_ERRORS.ALREADY_REVIEWED)
    tx.set(attemptRef, validated)
    tx.set(reviewDocRef, {
      decisions: input.decisions,
      correctCount,
      totalCount,
      reviewedAt: new Date().toISOString(),
    })
  })

  // I5: mastery for a review-only ticket is recorded HERE, once finalized —
  // this is the point Verification/Communication actually reach their
  // server-verifiable values (see this file's header).
  if (attempt.finalized) {
    await recordSprintLabMastery(
      userId,
      run.workbookId,
      compiledTicket.ticket,
      projectTicketAttempt(validated)
    )
  }

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
