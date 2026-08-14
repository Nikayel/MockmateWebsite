/**
 * Server-side persistence for Learn active-time telemetry (Admin SDK, server-only).
 *
 * WHY THIS EXISTS: `learn_item_responses` captures per-item latency but only while a learner
 * is answering something — time spent reading a teach section is invisible to it, and
 * `user_tutorial_progress` stores statuses, never durations. This module is the time
 * counterpart: the client meters ACTIVE time (visible tab, recent input) and flushes small
 * deltas; this service clamps and rolls them up.
 *
 * Two rollups per accepted flush, mirroring `lib/usage-tracking.ts`:
 *   - `users/{uid}/learn_usage/{lessonId}` — lifetime per-lesson totals (transaction: the
 *     read of `last_seen_at` is what lets the server clamp a reported delta to wall-clock
 *     elapsed, so a hostile client cannot inflate time faster than real time passes).
 *   - `users/{uid}/learn_daily/{YYYY-MM-DD}` — per-day totals split by course and lesson.
 *     Deliberately a merge+increment OUTSIDE the transaction: it needs no read, and a
 *     contended lesson doc must not make the daily counter retry.
 *
 * The subcollection names are deliberately distinct from each other and from `usage_summaries`
 * / `daily_usage` so no collectionGroup query can ever sum one into the other.
 *
 * THIS DATA MUST NEVER FEED `user_stats.totalPracticeMinutes` or anything else behind the
 * dashboard "Practice" stat — that number's contract is clamped INTERVIEW wall clock. Learn
 * time is an admin/research surface only. A guard test pins this separation.
 *
 * Conventions mirror `item-responses.ts`: snake_case fields, undefined never written, writes
 * never throw to the caller (losing a telemetry flush is strictly better than breaking a
 * lesson). MUST stay server-only — imports the Firebase Admin SDK. Client code uses
 * `learn-time-client.ts`.
 */
import { FieldPath, FieldValue } from "firebase-admin/firestore"
import { z } from "zod"
import { adminDb } from "@/lib/firebase-admin"
import { utcDayKey } from "@/lib/usage-tracking"
import { describeCoverage, type ScanCoverage } from "@/lib/usage/scan-limits"
import { courseIdFromLessonId } from "./course-id"
import { sanitizeIdPart } from "./item-responses"
import { tutorialLevelIdSchema } from "./level-id-schema"
import type { CourseId, TutorialLevelId } from "./types"

const LEARN_USAGE_COLLECTION = "learn_usage"
const LEARN_DAILY_COLLECTION = "learn_daily"

/**
 * Hard ceiling on one flush. The client reports at most every ~5 minutes
 * (`learn-time-client.ts`), so a single honest report never exceeds that plus timer drift in
 * a throttled background tab. Anything larger is a bug or a forgery; take the cap, not the claim.
 */
export const MAX_FLUSH_ACTIVE_MS = 6 * 60 * 1000

/**
 * Reported time may also never exceed wall-clock elapsed since the lesson's previous flush
 * (plus this slack for clock skew and in-flight overlap). This is what makes the metric
 * robust rather than advisory: replaying flushes cannot accrue time faster than real time.
 */
export const ELAPSED_SLACK_MS = 30 * 1000

/** Below this a flush is dust — not worth a write unless it carries an open to count. */
export const MIN_FLUSH_ACTIVE_MS = 1000

/** Documents read when aggregating learn_daily platform-wide (one doc per active user-day). */
export const LEARN_DAILY_SCAN_LIMIT = 5000

/**
 * Accepted from the client. `userId`, timestamps, and `courseId` are server-owned.
 * The schema bound on `activeMs` is a sanity check; the real cap is `clampFlushActiveMs`.
 */
export const learnTimeFlushSchema = z.object({
  lessonId: z.string().min(1).max(200),
  levelId: tutorialLevelIdSchema,
  /** Milliseconds of ACTIVE time accumulated since the client's previous flush. */
  activeMs: z
    .number()
    .min(0)
    .max(60 * 60 * 1000),
  /** True on the first flush of a lesson visit, so opens can be counted. */
  opened: z.boolean().optional(),
})

export type LearnTimeFlushInput = z.infer<typeof learnTimeFlushSchema>

/** Lifetime per-lesson rollup, one doc per user per lesson. */
export interface LearnLessonUsage {
  user_id: string
  lesson_id: string
  level_id: TutorialLevelId
  course_id: CourseId
  total_active_ms: number
  open_count: number
  flush_count: number
  first_seen_at: string
  last_seen_at: string
}

/** Per-day rollup, one doc per user per UTC day. */
export interface LearnDailyUsage {
  user_id: string
  day: string
  total_active_ms: number
  opens: number
  by_course_ms: Partial<Record<CourseId, number>>
  by_lesson_ms: Record<string, number>
}

/**
 * How much of a reported delta the server accepts. Exported for unit testing — this is the
 * entire trust boundary for the metric, so it is worth pinning without a Firestore round-trip.
 */
export function clampFlushActiveMs(
  reportedMs: number,
  lastSeenAtIso: string | undefined,
  now: Date
): number {
  if (!Number.isFinite(reportedMs) || reportedMs <= 0) return 0
  let accepted = Math.min(Math.round(reportedMs), MAX_FLUSH_ACTIVE_MS)
  if (lastSeenAtIso) {
    const lastSeen = Date.parse(lastSeenAtIso)
    if (!Number.isNaN(lastSeen)) {
      // A corrupt future last_seen_at must clamp to the slack floor, not go negative.
      const wallElapsed = Math.max(0, now.getTime() - lastSeen)
      accepted = Math.min(accepted, wallElapsed + ELAPSED_SLACK_MS)
    }
  }
  return accepted
}

/**
 * Record one flush. Returns the milliseconds actually credited (0 when skipped or failed).
 * Never throws: time telemetry must never surface a failure into a lesson.
 */
export async function recordLearnTime(
  userId: string,
  input: LearnTimeFlushInput,
  now: Date = new Date()
): Promise<number> {
  const opened = input.opened === true
  if (input.activeMs < MIN_FLUSH_ACTIVE_MS && !opened) return 0

  try {
    const courseId = courseIdFromLessonId(input.lessonId)
    const nowIso = now.toISOString()
    const lessonRef = adminDb
      .collection("users")
      .doc(userId)
      .collection(LEARN_USAGE_COLLECTION)
      .doc(sanitizeIdPart(input.lessonId))

    let acceptedMs = 0
    await adminDb.runTransaction(async (transaction) => {
      const doc = await transaction.get(lessonRef)
      const lastSeenAt = doc.exists ? (doc.data()?.last_seen_at as string | undefined) : undefined
      acceptedMs = clampFlushActiveMs(input.activeMs, lastSeenAt, now)
      if (acceptedMs === 0 && !opened) return

      if (!doc.exists) {
        transaction.set(lessonRef, {
          user_id: userId,
          lesson_id: input.lessonId,
          level_id: input.levelId,
          course_id: courseId,
          total_active_ms: acceptedMs,
          open_count: opened ? 1 : 0,
          flush_count: 1,
          first_seen_at: nowIso,
          last_seen_at: nowIso,
          updated_at: FieldValue.serverTimestamp(),
        })
      } else {
        transaction.update(lessonRef, {
          total_active_ms: FieldValue.increment(acceptedMs),
          open_count: FieldValue.increment(opened ? 1 : 0),
          flush_count: FieldValue.increment(1),
          last_seen_at: nowIso,
          updated_at: FieldValue.serverTimestamp(),
        })
      }
    })

    if (acceptedMs > 0 || opened) {
      await adminDb
        .collection("users")
        .doc(userId)
        .collection(LEARN_DAILY_COLLECTION)
        .doc(utcDayKey(now))
        .set(
          {
            user_id: userId,
            day: utcDayKey(now),
            total_active_ms: FieldValue.increment(acceptedMs),
            opens: FieldValue.increment(opened ? 1 : 0),
            by_course_ms: { [courseId]: FieldValue.increment(acceptedMs) },
            by_lesson_ms: { [sanitizeIdPart(input.lessonId)]: FieldValue.increment(acceptedMs) },
            updated_at: FieldValue.serverTimestamp(),
          },
          { merge: true }
        )
    }
    return acceptedMs
  } catch (error) {
    console.error("[learn-time] failed to record flush", error)
    return 0
  }
}

/** One user's per-lesson lifetime totals, most-used first. In-memory sort, no composite index. */
export async function listUserLearnUsage(userId: string): Promise<LearnLessonUsage[]> {
  const snapshot = await adminDb
    .collection("users")
    .doc(userId)
    .collection(LEARN_USAGE_COLLECTION)
    .get()
  return snapshot.docs
    .map((doc) => doc.data() as LearnLessonUsage)
    .sort((a, b) => (b.total_active_ms ?? 0) - (a.total_active_ms ?? 0))
}

/**
 * One user's day-by-day rollups since `sinceDayKey` (inclusive), oldest first. Day keys are
 * the document ids, so this is an id-range read — no index needed.
 */
export async function listUserLearnDaily(
  userId: string,
  sinceDayKey: string
): Promise<LearnDailyUsage[]> {
  const snapshot = await adminDb
    .collection("users")
    .doc(userId)
    .collection(LEARN_DAILY_COLLECTION)
    .where(FieldPath.documentId(), ">=", sinceDayKey)
    .get()
  return snapshot.docs
    .map((doc) => doc.data() as LearnDailyUsage)
    .sort((a, b) => a.day.localeCompare(b.day))
}

/**
 * Platform-wide scan of learn_daily docs since `sinceDayKey`, for the admin overview. Bounded
 * and coverage-described (`lib/usage/scan-limits.ts`): a truncated scan is a lower bound, and
 * the route must say so rather than present it as a total. Requires the COLLECTION_GROUP
 * field override on `day` in firestore.indexes.json.
 */
export async function scanLearnDailySince(
  sinceDayKey: string
): Promise<{ rows: LearnDailyUsage[]; coverage: ScanCoverage }> {
  const snapshot = await adminDb
    .collectionGroup(LEARN_DAILY_COLLECTION)
    .where("day", ">=", sinceDayKey)
    .limit(LEARN_DAILY_SCAN_LIMIT)
    .get()
  return {
    rows: snapshot.docs.map((doc) => doc.data() as LearnDailyUsage),
    coverage: describeCoverage(snapshot.size, LEARN_DAILY_SCAN_LIMIT),
  }
}
