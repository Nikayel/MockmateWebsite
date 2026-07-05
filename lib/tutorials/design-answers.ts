/**
 * Server-side persistence for System-Design free-response answers (Admin SDK, server-only).
 *
 * This is the ONE genuinely new subsystem the System-Design course adds. It is a structural clone of
 * `lib/tutorials/progress.ts`: a Zod input schema that omits server-owned fields (`userId`,
 * timestamps), ownership-checked reads, and an upsert that stamps `updatedAt`, preserves `startedAt`,
 * and OMITS undefined fields (Firestore rejects `undefined`). One small doc per user-per-exercise at
 * `user_design_answers/${uid}__${exerciseId}`.
 *
 * Separate concern from progress: section/lesson *completion* still flows through the unchanged
 * `user_tutorial_progress` pipeline. This collection stores only the learner's private answer TEXT,
 * which has no analog in the code courses (Python/SQL grading is deterministic, so editor text is not
 * worth persisting server-side). Answers are the learner's actual work product, so they are
 * server-owned and auth-gated.
 *
 * MUST stay server-only — it imports the Firebase Admin SDK. Client code uses `design-answers-client.ts`.
 */
import { z } from "zod"
import { adminDb } from "@/lib/firebase-admin"

const COLLECTION = "user_design_answers"

/**
 * A learner's saved free-text answer for one design exercise. `userId` and timestamps are
 * SERVER-owned — never trusted from the client. Namespaced by the `sd-` exercise-id prefix.
 */
export interface DesignAnswer {
  userId: string
  /** `sd-l{N}-{slug}-{apply|practice}`. */
  exerciseId: string
  /** `sd-l{N}-{slug}` — for per-lesson listing / cleanup. */
  lessonId: string
  /** The learner's free-text answer (Markdown). Length-bounded by the input schema. */
  answer: string
  /** ISO timestamp; the first save, preserved across later upserts. */
  startedAt: string
  /** ISO timestamp; stamped on every write. */
  updatedAt: string
}

/** Deterministic, per-user-per-exercise document id (mirrors `progressDocId`). */
export function designAnswerDocId(userId: string, exerciseId: string): string {
  return `${userId}__${exerciseId}`
}

/**
 * Accepted from the client. `userId` and timestamps are server-owned and never trusted from the body.
 * `exerciseId` / `lessonId` MUST carry the `sd-` prefix so this route can only ever write the
 * System-Design namespace (defense-in-depth). `answer` is generously capped to guard against abuse /
 * oversized docs.
 */
export const designAnswerInputSchema = z.object({
  exerciseId: z.string().min(1).max(120).startsWith("sd-"),
  lessonId: z.string().min(1).max(120).startsWith("sd-"),
  answer: z.string().max(20_000),
})

export type DesignAnswerInput = z.infer<typeof designAnswerInputSchema>

function composeAnswer(
  userId: string,
  input: DesignAnswerInput,
  timestamps: { startedAt: string; updatedAt: string }
): DesignAnswer {
  return {
    userId,
    exerciseId: input.exerciseId,
    lessonId: input.lessonId,
    answer: input.answer,
    startedAt: timestamps.startedAt,
    updatedAt: timestamps.updatedAt,
  }
}

/** Read one exercise's saved answer, ownership-checked. Returns null if missing or not owned. */
export async function getDesignAnswer(
  userId: string,
  exerciseId: string
): Promise<DesignAnswer | null> {
  const snap = await adminDb.collection(COLLECTION).doc(designAnswerDocId(userId, exerciseId)).get()
  if (!snap.exists) return null
  const data = snap.data() as DesignAnswer | undefined
  if (!data || data.userId !== userId) return null
  return data
}

/**
 * All of a user's saved answers (powers a future "review my answers" view). Queries by `userId`
 * only (auto single-field index) and sorts newest-first in memory — no composite index needed.
 */
export async function listUserDesignAnswers(userId: string): Promise<DesignAnswer[]> {
  const query = await adminDb.collection(COLLECTION).where("userId", "==", userId).get()
  return query.docs
    .map((doc) => doc.data() as DesignAnswer)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

/**
 * Create or update an exercise's saved answer. Stamps `updatedAt`, preserves the original
 * `startedAt`, and throws `Error("UNAUTHORIZED")` if an existing doc is owned by someone else (the
 * route maps that to 403). Full overwrite via `ref.set` — the doc is small and fully client-derived.
 */
export async function upsertDesignAnswer(
  userId: string,
  input: DesignAnswerInput
): Promise<DesignAnswer> {
  const now = new Date().toISOString()
  const ref = adminDb.collection(COLLECTION).doc(designAnswerDocId(userId, input.exerciseId))
  const snap = await ref.get()

  if (snap.exists) {
    const existing = snap.data() as DesignAnswer
    if (existing.userId !== userId) throw new Error("UNAUTHORIZED")
    const answer = composeAnswer(userId, input, {
      startedAt: existing.startedAt ?? now,
      updatedAt: now,
    })
    await ref.set(answer)
    return answer
  }

  const answer = composeAnswer(userId, input, { startedAt: now, updatedAt: now })
  await ref.set(answer)
  return answer
}
