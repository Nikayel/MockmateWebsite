/**
 * Server-side persistence for tutorial progress (Admin SDK, server-only).
 *
 * Mirrors `lib/labs/case-lab-runs.ts`: a Zod input schema that omits server-owned fields
 * (`userId`, timestamps), ownership-checked reads, and an upsert that stamps `updatedAt`,
 * preserves `startedAt`, sets `completedAt` on completion, and OMITS undefined fields (Firestore
 * rejects `undefined`). One small doc per user-per-lesson at `user_tutorial_progress/${uid}__${lessonId}`.
 *
 * MUST stay server-only — it imports the Firebase Admin SDK. Client code uses `progress-client.ts`.
 */
import { z } from "zod"
import { adminDb } from "@/lib/firebase-admin"
import type { CourseId, TutorialLessonProgress } from "./types"

const COLLECTION = "user_tutorial_progress"

/** Deterministic, per-user-per-lesson document id. */
export function progressDocId(userId: string, lessonId: string): string {
  return `${userId}__${lessonId}`
}

/**
 * Which course a lesson belongs to, from its id prefix (`sd-` → system-design, `sql-`/`de-` → the
 * data-engineering track, else python). Persisted on every progress doc so dashboards can group by
 * course without a backfill. `de-` is the prefix for the Data Engineering levels (L7+); the frozen
 * `sql-` ids share the same course.
 */
function courseIdFromLessonId(lessonId: string): CourseId {
  if (lessonId.startsWith("sd-")) return "system-design"
  if (lessonId.startsWith("sql-") || lessonId.startsWith("de-")) return "sql"
  return "python"
}

const sectionStatusSchema = z.enum(["not_started", "in_progress", "completed"])

/**
 * Accepted from the client. `userId`, `startedAt`, and `updatedAt` are server-owned and never
 * trusted from the body. `completedAt` may be passed but the server overrides it on completion.
 */
export const tutorialProgressInputSchema = z.object({
  lessonId: z.string().min(1),
  // Python ships L1-4, SQL L1-6, and System Design L0-11 (L0 is the interview-method level). The
  // literal union spans the full shared 0..11 `TutorialLevelId` range so every course's section
  // progress persists AND `z.infer` narrows to `TutorialLevelId` (not a bare `number`).
  levelId: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
    z.literal(6),
    z.literal(7),
    z.literal(8),
    z.literal(9),
    z.literal(10),
    z.literal(11),
  ]),
  sections: z.object({
    teach: sectionStatusSchema,
    apply: sectionStatusSchema,
    practice: sectionStatusSchema,
  }),
  lessonStatus: sectionStatusSchema,
  lastExerciseScore: z.number().min(0).max(100).optional(),
  completedAt: z.string().optional(),
})

export type TutorialProgressInput = z.infer<typeof tutorialProgressInputSchema>

function composeProgress(
  userId: string,
  input: TutorialProgressInput,
  timestamps: { startedAt: string; updatedAt: string }
): TutorialLessonProgress {
  const completedAt =
    input.lessonStatus === "completed" ? (input.completedAt ?? timestamps.updatedAt) : undefined
  return {
    userId,
    lessonId: input.lessonId,
    courseId: courseIdFromLessonId(input.lessonId),
    levelId: input.levelId,
    sections: input.sections,
    lessonStatus: input.lessonStatus,
    // `lastExerciseScore` can legitimately be 0, so omit only when truly undefined.
    ...(input.lastExerciseScore !== undefined
      ? { lastExerciseScore: input.lastExerciseScore }
      : {}),
    startedAt: timestamps.startedAt,
    updatedAt: timestamps.updatedAt,
    // Omit `completedAt` when undefined — Firestore rejects undefined values.
    ...(completedAt ? { completedAt } : {}),
  }
}

/** Read one lesson's progress, ownership-checked. Returns null if missing or not owned. */
export async function getLessonProgress(
  userId: string,
  lessonId: string
): Promise<TutorialLessonProgress | null> {
  const snap = await adminDb.collection(COLLECTION).doc(progressDocId(userId, lessonId)).get()
  if (!snap.exists) return null
  const data = snap.data() as TutorialLessonProgress | undefined
  if (!data || data.userId !== userId) return null
  return data
}

/**
 * All of a user's progress docs (powers the level/dashboard % overlay). Queries by `userId`
 * only (auto single-field index) and sorts newest-first in memory — no composite index needed.
 */
export async function listUserProgress(userId: string): Promise<TutorialLessonProgress[]> {
  const query = await adminDb.collection(COLLECTION).where("userId", "==", userId).get()
  return query.docs
    .map((doc) => doc.data() as TutorialLessonProgress)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

/**
 * Create or update a lesson's progress. Stamps `updatedAt`, preserves the original `startedAt`,
 * and throws `Error("UNAUTHORIZED")` if an existing doc is owned by someone else (the route maps
 * that to 403). Full overwrite via `ref.set` — the doc is small and fully client-derived.
 */
export async function upsertLessonProgress(
  userId: string,
  input: TutorialProgressInput
): Promise<TutorialLessonProgress> {
  const now = new Date().toISOString()
  const ref = adminDb.collection(COLLECTION).doc(progressDocId(userId, input.lessonId))
  const snap = await ref.get()

  if (snap.exists) {
    const existing = snap.data() as TutorialLessonProgress
    if (existing.userId !== userId) throw new Error("UNAUTHORIZED")
    const progress = composeProgress(userId, input, {
      startedAt: existing.startedAt ?? now,
      updatedAt: now,
    })
    await ref.set(progress)
    return progress
  }

  const progress = composeProgress(userId, input, { startedAt: now, updatedAt: now })
  await ref.set(progress)
  return progress
}
