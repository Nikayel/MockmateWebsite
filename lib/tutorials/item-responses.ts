/**
 * Server-side persistence for item-level Learn telemetry (Admin SDK, server-only).
 *
 * WHY THIS EXISTS: `user_tutorial_progress` is one small, fully-overwritten doc per
 * lesson holding three section statuses. That is product state and it is the right
 * shape for resuming a lesson, but it destroys every learning signal on the way in:
 * attempts, wrong answers, hint usage, and which distractor a learner picked all
 * existed in component state and were discarded on unmount. This collection is the
 * append-only counterpart: one immutable row per learner action, never updated,
 * never deleted, so the attempt trajectory survives.
 *
 * Conventions deliberately mirror `lib/spaced-repetition/research-tracker.ts` — the
 * platform's existing research log — so the two are joinable:
 *   - deterministic doc id `${userId}_${itemId}_${epochMs}`
 *   - snake_case fields
 *   - undefined stripped before write (Firestore rejects `undefined`)
 *   - writes NEVER throw to the caller; telemetry must not break a lesson
 *
 * MUST stay server-only — imports the Firebase Admin SDK. Client code uses
 * `item-responses-client.ts`.
 */
import { z } from "zod"
import { adminDb } from "@/lib/firebase-admin"
import { getResearchConsent, isResearchUsable } from "./research-consent"
import { toKnowledgeComponents } from "./knowledge-components"
import type { CourseId, LearnItemResponse } from "./types"

const COLLECTION = "learn_item_responses"

/** Cap on rows accepted in one request, so a buggy client cannot flood a write batch. */
export const MAX_ITEM_RESPONSES_PER_REQUEST = 20

/** Failing-assertion text is learner-facing output of unknown size; truncate hard. */
const MAX_FAILED_TESTS = 3
const MAX_FIELD_CHARS = 500

/** A left-open tab must not report a six-hour "latency". Clamp to 30 minutes. */
const MAX_LATENCY_MS = 30 * 60 * 1000

const lessonSectionSchema = z.enum(["teach", "apply", "practice"])

const failedTestSchema = z.object({
  name: z.string().optional(),
  expected: z.string().optional(),
  actual: z.string().optional(),
  error: z.string().optional(),
})

/**
 * Accepted from the client. `user_id`, `id`, `timestamp`, and `course_id` are
 * server-owned or server-derived and are never trusted from the body.
 */
export const learnItemResponseInputSchema = z.object({
  kind: z.enum(["exercise_run", "check_answer", "hint_reveal", "reference_reveal", "demo_run"]),
  /** `demo_run` only: whether the learner edited the example before running it. */
  edited: z.boolean().optional(),
  lessonId: z.string().min(1).max(200),
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
  itemId: z.string().min(1).max(200),
  section: lessonSectionSchema,
  skills: z.array(z.string().min(1).max(80)).max(12).optional(),

  attemptIndex: z.number().int().min(0).max(10_000).optional(),
  passed: z.boolean().optional(),
  testsTotal: z.number().int().min(0).max(1000).optional(),
  testsPassed: z.number().int().min(0).max(1000).optional(),
  failedTests: z.array(failedTestSchema).max(20).optional(),
  errorKind: z.string().max(60).optional(),

  checkKind: z.enum(["predict", "classify"]).optional(),
  selectedIndex: z.number().int().min(0).max(100).optional(),
  selectedLabel: z.string().max(300).optional(),
  selectedBuckets: z.array(z.string().max(120)).max(20).optional(),
  correct: z.boolean().optional(),
  correctCount: z.number().int().min(0).max(100).optional(),
  itemsTotal: z.number().int().min(0).max(100).optional(),
  retryIndex: z.number().int().min(0).max(1000).optional(),

  hintIndex: z.number().int().min(0).max(100).optional(),
  hintsTotal: z.number().int().min(0).max(100).optional(),

  latencyMs: z.number().min(0).optional(),
})

export type LearnItemResponseInput = z.infer<typeof learnItemResponseInputSchema>

/**
 * Which course a lesson belongs to, from its id prefix. Same derivation as
 * `progress.ts` so both collections group identically without a backfill.
 */
function courseIdFromLessonId(lessonId: string): CourseId {
  if (lessonId.startsWith("sd-")) return "system-design"
  if (lessonId.startsWith("sql-") || lessonId.startsWith("de-")) return "data-engineering"
  return "python"
}

/** Firestore doc ids cannot contain `/`; authored ids are kebab-case but never assume it. */
function sanitizeIdPart(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 120)
}

function truncate(value: string | undefined): string | undefined {
  if (value === undefined) return undefined
  return value.length > MAX_FIELD_CHARS ? `${value.slice(0, MAX_FIELD_CHARS)}…` : value
}

/**
 * Build the persisted row. Exported for unit testing: composing the doc is where the
 * clamping and undefined-stripping rules live, and those are worth pinning without a
 * Firestore round-trip.
 */
export function composeItemResponse(
  userId: string,
  input: LearnItemResponseInput,
  now: Date,
  researchConsent = false
): LearnItemResponse {
  const id = `${sanitizeIdPart(userId)}_${sanitizeIdPart(input.itemId)}_${now.getTime()}`

  // Assemble optionals separately so a single `undefined` never reaches Firestore.
  const optional: Partial<LearnItemResponse> = {}
  if (input.attemptIndex !== undefined) optional.attempt_index = input.attemptIndex
  if (input.passed !== undefined) optional.passed = input.passed
  if (input.testsTotal !== undefined) optional.tests_total = input.testsTotal
  if (input.testsPassed !== undefined) optional.tests_passed = input.testsPassed
  if (input.errorKind !== undefined) optional.error_kind = input.errorKind
  if (input.failedTests?.length) {
    optional.failed_tests = input.failedTests.slice(0, MAX_FAILED_TESTS).map((test) => {
      const row: Record<string, string> = {}
      const name = truncate(test.name)
      const expected = truncate(test.expected)
      const actual = truncate(test.actual)
      const error = truncate(test.error)
      if (name !== undefined) row.name = name
      if (expected !== undefined) row.expected = expected
      if (actual !== undefined) row.actual = actual
      if (error !== undefined) row.error = error
      return row
    })
  }

  if (input.checkKind !== undefined) optional.check_kind = input.checkKind
  if (input.selectedIndex !== undefined) optional.selected_index = input.selectedIndex
  if (input.selectedLabel !== undefined) optional.selected_label = truncate(input.selectedLabel)
  if (input.selectedBuckets !== undefined) optional.selected_buckets = input.selectedBuckets
  if (input.correct !== undefined) optional.correct = input.correct
  if (input.correctCount !== undefined) optional.correct_count = input.correctCount
  if (input.itemsTotal !== undefined) optional.items_total = input.itemsTotal
  if (input.retryIndex !== undefined) optional.retry_index = input.retryIndex

  if (input.hintIndex !== undefined) optional.hint_index = input.hintIndex
  if (input.hintsTotal !== undefined) optional.hints_total = input.hintsTotal

  if (input.edited !== undefined) optional.edited = input.edited

  if (input.latencyMs !== undefined) {
    optional.latency_ms = Math.round(Math.min(input.latencyMs, MAX_LATENCY_MS))
  }

  return {
    id,
    user_id: userId,
    timestamp: now.toISOString(),
    kind: input.kind,
    course_id: courseIdFromLessonId(input.lessonId),
    lesson_id: input.lessonId,
    level_id: input.levelId,
    item_id: input.itemId,
    section: input.section,
    skills: input.skills ?? [],
    // Canonical vocabulary alongside the authored chips. Analysis groups by this;
    // `skills` stays exactly as a human wrote it. See knowledge-components.ts.
    knowledge_components: toKnowledgeComponents(input.skills),
    // The learner's consent state AT THE MOMENT OF OBSERVATION. See research-consent.ts
    // for why this is stamped rather than joined at export.
    research_consent: researchConsent,
    ...optional,
  }
}

/**
 * Append item responses. Returns the number written.
 *
 * Never throws: a telemetry failure must never surface to a learner mid-lesson, and the
 * route treats a partial write as success. Each row gets its own millisecond-stamped id,
 * nudged forward on collision so two responses in the same millisecond cannot overwrite
 * each other (the whole point of an append-only log).
 */
export async function recordItemResponses(
  userId: string,
  inputs: LearnItemResponseInput[]
): Promise<number> {
  if (inputs.length === 0) return 0
  const capped = inputs.slice(0, MAX_ITEM_RESPONSES_PER_REQUEST)

  try {
    // One read per batch, not per row. Resolved here rather than at export because
    // consent is a fact about when the observation happened.
    const researchConsent = isResearchUsable(await getResearchConsent(userId))

    const batch = adminDb.batch()
    const seen = new Set<string>()
    let stamp = Date.now()

    for (const input of capped) {
      let row = composeItemResponse(userId, input, new Date(stamp), researchConsent)
      // Same user + same item + same millisecond would collide; advance until unique.
      while (seen.has(row.id)) {
        stamp += 1
        row = composeItemResponse(userId, input, new Date(stamp), researchConsent)
      }
      seen.add(row.id)
      batch.set(adminDb.collection(COLLECTION).doc(row.id), row)
    }

    await batch.commit()
    return capped.length
  } catch (error) {
    console.error("[learn-telemetry] failed to record item responses", error)
    return 0
  }
}

/**
 * All of one user's item responses (powers per-user research export). Queries by
 * `user_id` only and sorts in memory, matching `listUserProgress` — no composite index.
 */
export async function listUserItemResponses(userId: string): Promise<LearnItemResponse[]> {
  const query = await adminDb.collection(COLLECTION).where("user_id", "==", userId).get()
  return query.docs
    .map((doc) => doc.data() as LearnItemResponse)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
}
