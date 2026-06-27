/**
 * Server-side persistence for Case Lab runs (`caseLabRuns` collection).
 *
 * Treats the Firestore document as the `CaseLabRun` contract (see
 * docs/FIREBASE_STRUCTURE.md). Ownership is always enforced from the
 * authenticated user — the client-supplied `userId` is never trusted. Used by
 * `app/api/labs/runs/route.ts`; keep route handlers thin and call these.
 */

import { z } from "zod"
import { adminDb } from "@/lib/firebase-admin"
import type {
  CaseLabAnswers,
  CaseLabRun,
  MilestoneKind,
  MilestoneStatus,
  MilestoneStatusMap,
} from "@/lib/labs/types"

const COLLECTION = "caseLabRuns"

const MILESTONE_KINDS: MilestoneKind[] = ["clarify", "decompose", "design", "build", "review"]

const milestoneKindSchema = z.enum(["clarify", "decompose", "design", "build", "review"])
const milestoneStatusSchema = z.enum(["locked", "active", "done"])

/**
 * Validated shape the client may send to upsert a run. `userId`, `startedAt`,
 * and `updatedAt` are server-controlled and intentionally absent here.
 */
export const caseLabRunInputSchema = z.object({
  id: z.string().min(1).optional(),
  caseLabId: z.string().min(1),
  mode: z.enum(["practice", "onsite"]),
  status: z.enum(["in_progress", "completed", "abandoned"]),
  currentMilestone: milestoneKindSchema,
  // Answers are user content; structural validation happens client-side via the
  // typed store. Accept an object here and store it as the typed contract.
  answers: z.record(z.string(), z.unknown()).optional(),
  milestoneStatus: z.record(milestoneKindSchema, milestoneStatusSchema).optional(),
  completedAt: z.string().optional(),
})

export type CaseLabRunInput = z.infer<typeof caseLabRunInputSchema>

function buildMilestoneStatus(
  partial: Partial<Record<MilestoneKind, MilestoneStatus>> | undefined,
  current: MilestoneKind
): MilestoneStatusMap {
  const status = MILESTONE_KINDS.reduce((acc, kind) => {
    acc[kind] = kind === current ? "active" : "locked"
    return acc
  }, {} as MilestoneStatusMap)
  if (partial) {
    for (const kind of MILESTONE_KINDS) {
      const value = partial[kind]
      if (value) status[kind] = value
    }
  }
  return status
}

function composeRun(
  id: string,
  userId: string,
  input: CaseLabRunInput,
  timestamps: { startedAt: string; updatedAt: string }
): CaseLabRun {
  const completedAt =
    input.status === "completed" ? (input.completedAt ?? timestamps.updatedAt) : undefined
  return {
    id,
    userId,
    caseLabId: input.caseLabId,
    mode: input.mode,
    status: input.status,
    currentMilestone: input.currentMilestone,
    startedAt: timestamps.startedAt,
    updatedAt: timestamps.updatedAt,
    // Omit `completedAt` when undefined — Firestore rejects undefined values.
    ...(completedAt ? { completedAt } : {}),
    answers: (input.answers ?? {}) as CaseLabAnswers,
    milestoneStatus: buildMilestoneStatus(input.milestoneStatus, input.currentMilestone),
  }
}

/** Fetch a run by id, scoped to its owner (returns null if not owned/missing). */
export async function getCaseLabRun(userId: string, runId: string): Promise<CaseLabRun | null> {
  const snap = await adminDb.collection(COLLECTION).doc(runId).get()
  if (!snap.exists) return null
  const data = snap.data() as CaseLabRun | undefined
  if (!data || data.userId !== userId) return null
  return { ...data, id: snap.id }
}

/**
 * The user's latest meaningful run for a lab — an in-progress one to resume, or
 * failing that the most recent completed one so finished work isn't lost from
 * their session (the gallery can show "Completed", and the play page can decide
 * whether to resume or offer a fresh start). Abandoned runs are ignored.
 *
 * In-progress always wins over completed regardless of timestamp; within a
 * status, the most-recently-updated run is returned. Queries by `userId` only
 * (an auto single-field index) and filters/sorts in memory to avoid requiring a
 * composite index.
 */
export async function getActiveCaseLabRun(
  userId: string,
  caseLabId: string
): Promise<CaseLabRun | null> {
  const query = await adminDb.collection(COLLECTION).where("userId", "==", userId).get()
  const runs = query.docs
    .map((doc) => ({ ...(doc.data() as CaseLabRun), id: doc.id }))
    .filter(
      (run) =>
        run.caseLabId === caseLabId &&
        (run.status === "in_progress" || run.status === "completed")
    )
    .sort((a, b) => {
      // In-progress first, then newest within the same status.
      if (a.status !== b.status) return a.status === "in_progress" ? -1 : 1
      return b.updatedAt.localeCompare(a.updatedAt)
    })
  return runs[0] ?? null
}

/**
 * Create or update a run. On update, ownership is verified and `startedAt` is
 * preserved. Throws `UNAUTHORIZED` if the target run belongs to another user.
 */
export async function upsertCaseLabRun(
  userId: string,
  input: CaseLabRunInput
): Promise<CaseLabRun> {
  const now = new Date().toISOString()

  if (input.id) {
    const ref = adminDb.collection(COLLECTION).doc(input.id)
    const snap = await ref.get()
    if (snap.exists) {
      const existing = snap.data() as CaseLabRun
      if (existing.userId !== userId) throw new Error("UNAUTHORIZED")
      const run = composeRun(input.id, userId, input, {
        startedAt: existing.startedAt ?? now,
        updatedAt: now,
      })
      await ref.set(run)
      return run
    }
    const run = composeRun(input.id, userId, input, {
      startedAt: now,
      updatedAt: now,
    })
    await ref.set(run)
    return run
  }

  const ref = adminDb.collection(COLLECTION).doc()
  const run = composeRun(ref.id, userId, input, { startedAt: now, updatedAt: now })
  await ref.set(run)
  return run
}
