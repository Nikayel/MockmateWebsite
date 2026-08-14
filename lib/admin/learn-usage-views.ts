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

export interface PlatformLearnUsageView {
  /** Oldest first, for charting. */
  days: PlatformLearnDayRow[]
  /** Most-studied lessons in the window, with distinct-learner counts. */
  topLessons: Array<{ lessonId: string; activeMs: number; users: number }>
  totals: { activeMs: number; opens: number; activeUsers: number }
  coverage: ScanCoverage
}

const TOP_LESSONS_LIMIT = 50

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

export async function getPlatformLearnUsageView(
  sinceDayKey: string
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

  return {
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
}
