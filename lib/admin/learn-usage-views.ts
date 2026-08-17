/**
 * Admin view models over the Learn time rollups (`lib/tutorials/learn-time.ts`).
 *
 * Same shape of responsibility as `lib/admin/usage-views.ts`: the service owns reading and
 * aggregating; the route stays parse → auth → call → respond. Firestore rows are snake_case
 * (Learn telemetry convention); these API-facing rows are camelCase (admin API convention),
 * and the mapping happens here, in exactly one place.
 *
 * Platform aggregation is a bounded scan of `learn_daily` (one doc per active user-day) and
 * carries `coverage` — when truncated, every number is a lower bound and the page must say so.
 */
import {
  listUserLearnDaily,
  listUserLearnUsage,
  scanLearnDailySince,
  type LearnDailyUsage,
} from "@/lib/tutorials/learn-time"
import { adminAuth } from "@/lib/firebase-admin"
import type { ScanCoverage } from "@/lib/usage/scan-limits"
import type { CourseId } from "@/lib/tutorials/types"

export interface LearnUsageLessonRow {
  lessonId: string
  levelId: number
  courseId: CourseId
  activeMs: number
  opens: number
  firstSeenAt: string
  lastSeenAt: string
}

export interface LearnUsageDayRow {
  day: string
  activeMs: number
  opens: number
  byCourseMs: Partial<Record<CourseId, number>>
  /** Per-user view only: which lessons that day's time went to. */
  byLessonMs?: Record<string, number>
}

export interface UserLearnUsageView {
  /** Lifetime per-lesson totals, most-used first. */
  lessons: LearnUsageLessonRow[]
  /** Day-by-day within the requested window, oldest first. */
  daily: LearnUsageDayRow[]
  /** Lifetime totals across all lessons (not windowed by the daily range). */
  totals: { activeMs: number; opens: number; byCourseMs: Partial<Record<CourseId, number>> }
}

export interface PlatformLearnDayRow {
  day: string
  activeMs: number
  opens: number
  activeUsers: number
  byCourseMs: Partial<Record<CourseId, number>>
}

export interface PlatformLearnerRow {
  userId: string
  /** Null when the auth record is gone (deleted account with surviving telemetry). */
  email: string | null
  fullName: string | null
  activeMs: number
  opens: number
  /** Distinct UTC days with any active time inside the window. */
  activeDays: number
  byCourseMs: Partial<Record<CourseId, number>>
  lastActiveDay: string
}

export interface PlatformLearnUsageView {
  /** Oldest first, for charting. */
  days: PlatformLearnDayRow[]
  /** Most-studied lessons in the window, with distinct-learner counts. */
  topLessons: Array<{ lessonId: string; activeMs: number; users: number }>
  totals: { activeMs: number; opens: number; activeUsers: number }
  coverage: ScanCoverage
  /**
   * Most-active learners in the window. Present only when the request carried
   * VIEW_USER_DETAILS — the aggregate view above stays readable by analytics-only
   * admins, who must not be able to page through individual learners.
   */
  learners?: PlatformLearnerRow[]
}

const TOP_LESSONS_LIMIT = 50
/** Also the bound on the identity lookup; adminAuth.getUsers accepts at most 100. */
const TOP_LEARNERS_LIMIT = 50

function addCourseMs(
  target: Partial<Record<CourseId, number>>,
  source: LearnDailyUsage["by_course_ms"] | undefined
): void {
  for (const [course, ms] of Object.entries(source ?? {})) {
    if (typeof ms !== "number" || !Number.isFinite(ms)) continue
    target[course as CourseId] = (target[course as CourseId] ?? 0) + ms
  }
}

export async function getUserLearnUsageView(
  userId: string,
  sinceDayKey: string
): Promise<UserLearnUsageView> {
  const [usage, daily] = await Promise.all([
    listUserLearnUsage(userId),
    listUserLearnDaily(userId, sinceDayKey),
  ])

  const totals: UserLearnUsageView["totals"] = { activeMs: 0, opens: 0, byCourseMs: {} }
  const lessons = usage.map((row) => {
    totals.activeMs += row.total_active_ms ?? 0
    totals.opens += row.open_count ?? 0
    totals.byCourseMs[row.course_id] =
      (totals.byCourseMs[row.course_id] ?? 0) + (row.total_active_ms ?? 0)
    return {
      lessonId: row.lesson_id,
      levelId: row.level_id,
      courseId: row.course_id,
      activeMs: row.total_active_ms ?? 0,
      opens: row.open_count ?? 0,
      firstSeenAt: row.first_seen_at,
      lastSeenAt: row.last_seen_at,
    }
  })

  return {
    lessons,
    daily: daily.map((row) => {
      const byCourseMs: Partial<Record<CourseId, number>> = {}
      addCourseMs(byCourseMs, row.by_course_ms)
      return {
        day: row.day,
        activeMs: row.total_active_ms ?? 0,
        opens: row.opens ?? 0,
        byCourseMs,
        byLessonMs: row.by_lesson_ms ?? {},
      }
    }),
    totals,
  }
}

/**
 * Rank learners by active time within the scanned window. Pure so the shape of the
 * rollup (day counting, course merging, ordering) is unit-testable without Firestore.
 * `learn_daily` holds one doc per user per day, so each row is a distinct active day.
 */
export function aggregateLearnerRows(
  rows: LearnDailyUsage[]
): Array<Omit<PlatformLearnerRow, "email" | "fullName">> {
  const byUser = new Map<string, Omit<PlatformLearnerRow, "email" | "fullName">>()
  for (const row of rows) {
    if (!row.user_id || !row.day) continue
    let user = byUser.get(row.user_id)
    if (!user) {
      user = {
        userId: row.user_id,
        activeMs: 0,
        opens: 0,
        activeDays: 0,
        byCourseMs: {},
        lastActiveDay: row.day,
      }
      byUser.set(row.user_id, user)
    }
    user.activeMs += row.total_active_ms ?? 0
    user.opens += row.opens ?? 0
    user.activeDays += 1
    if (row.day > user.lastActiveDay) user.lastActiveDay = row.day
    addCourseMs(user.byCourseMs, row.by_course_ms)
  }
  return [...byUser.values()].sort((a, b) => b.activeMs - a.activeMs)
}

/**
 * Same email precedence as the admin users list (auth record first). A failed lookup
 * degrades to uid-only rows rather than failing the whole platform view: identity is
 * decoration here, the time data is the point.
 */
async function resolveLearnerIdentities(
  userIds: string[]
): Promise<Map<string, { email: string | null; fullName: string | null }>> {
  const identities = new Map<string, { email: string | null; fullName: string | null }>()
  if (userIds.length === 0) return identities
  try {
    const result = await adminAuth.getUsers(userIds.map((uid) => ({ uid })))
    for (const user of result.users) {
      identities.set(user.uid, {
        email: user.email ?? null,
        fullName: user.displayName ?? null,
      })
    }
  } catch (error) {
    console.error("[learn-usage] learner identity lookup failed", error)
  }
  return identities
}

export async function getPlatformLearnUsageView(
  sinceDayKey: string,
  options?: { includeLearners?: boolean }
): Promise<PlatformLearnUsageView> {
  const { rows, coverage } = await scanLearnDailySince(sinceDayKey)

  const byDay = new Map<string, PlatformLearnDayRow & { userIds: Set<string> }>()
  const byLesson = new Map<string, { activeMs: number; userIds: Set<string> }>()
  const allUsers = new Set<string>()
  const totals = { activeMs: 0, opens: 0 }

  for (const row of rows) {
    if (!row.day) continue
    totals.activeMs += row.total_active_ms ?? 0
    totals.opens += row.opens ?? 0
    if (row.user_id) allUsers.add(row.user_id)

    let day = byDay.get(row.day)
    if (!day) {
      day = {
        day: row.day,
        activeMs: 0,
        opens: 0,
        activeUsers: 0,
        byCourseMs: {},
        userIds: new Set(),
      }
      byDay.set(row.day, day)
    }
    day.activeMs += row.total_active_ms ?? 0
    day.opens += row.opens ?? 0
    if (row.user_id) day.userIds.add(row.user_id)
    addCourseMs(day.byCourseMs, row.by_course_ms)

    for (const [lessonId, ms] of Object.entries(row.by_lesson_ms ?? {})) {
      if (typeof ms !== "number" || !Number.isFinite(ms)) continue
      let lesson = byLesson.get(lessonId)
      if (!lesson) {
        lesson = { activeMs: 0, userIds: new Set() }
        byLesson.set(lessonId, lesson)
      }
      lesson.activeMs += ms
      if (row.user_id) lesson.userIds.add(row.user_id)
    }
  }

  const view: PlatformLearnUsageView = {
    days: [...byDay.values()]
      .map(({ userIds, ...day }) => ({ ...day, activeUsers: userIds.size }))
      .sort((a, b) => a.day.localeCompare(b.day)),
    topLessons: [...byLesson.entries()]
      .map(([lessonId, { activeMs, userIds }]) => ({ lessonId, activeMs, users: userIds.size }))
      .sort((a, b) => b.activeMs - a.activeMs)
      .slice(0, TOP_LESSONS_LIMIT),
    totals: { ...totals, activeUsers: allUsers.size },
    coverage,
  }

  if (options?.includeLearners) {
    const ranked = aggregateLearnerRows(rows).slice(0, TOP_LEARNERS_LIMIT)
    const identities = await resolveLearnerIdentities(ranked.map((row) => row.userId))
    view.learners = ranked.map((row) => ({
      ...row,
      email: identities.get(row.userId)?.email ?? null,
      fullName: identities.get(row.userId)?.fullName ?? null,
    }))
  }

  return view
}
