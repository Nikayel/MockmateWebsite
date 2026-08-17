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

export interface PlatformLearnUsageView {
  /** Oldest first, for charting. */
  days: PlatformLearnDayRow[]
  /** Most-studied lessons in the window, with distinct-learner counts. */
  topLessons: Array<{ lessonId: string; activeMs: number; users: number }>
  totals: { activeMs: number; opens: number; activeUsers: number }
  coverage: ScanCoverage
}

/**
 * One row per signed-up account in the learner directory — including accounts with no
 * learn activity, because "who is NOT engaging" is half of what the directory is for.
 * Activity fields are zeros/nulls for them rather than absent, so the table can sort on
 * them uniformly.
 */
export interface LearnerDirectoryRow {
  userId: string
  /** Null on telemetry-only rows whose auth account was deleted. */
  email: string | null
  fullName: string | null
  /** Auth account creation time (ISO); null for deleted-account rows. */
  joinedAt: string | null
  activeMs: number
  opens: number
  /** Distinct UTC days with any active time inside the window. */
  activeDays: number
  byCourseMs: Partial<Record<CourseId, number>>
  lastActiveDay: string | null
}

export const LEARNER_DIRECTORY_SORT_KEYS = [
  "activeMs",
  "activeDays",
  "opens",
  "lastActiveDay",
  "joinedAt",
  "email",
] as const
export type LearnerDirectorySortKey = (typeof LEARNER_DIRECTORY_SORT_KEYS)[number]

export interface LearnerDirectoryQuery {
  page: number
  limit: number
  search?: string
  sort?: LearnerDirectorySortKey
  dir?: "asc" | "desc"
}

export interface LearnerDirectoryView {
  rows: LearnerDirectoryRow[]
  page: number
  totalPages: number
  /** Accounts matching the search (all accounts when the search is empty). */
  totalFiltered: number
  /** All signed-up accounts, regardless of learn activity or search. */
  totalUsers: number
  /** Accounts with any active learn time inside the window. */
  activeUsers: number
  coverage: ScanCoverage
}

const TOP_LESSONS_LIMIT = 50
/** Same bounds as the admin users list: Firebase pages at 1000, capped to avoid timeouts. */
const DIRECTORY_AUTH_BATCH = 1000
const DIRECTORY_MAX_AUTH_USERS = 5000

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

/** The per-user activity slice of a directory row, before identity is joined on. */
export type LearnerActivityRollup = Pick<
  LearnerDirectoryRow,
  "userId" | "activeMs" | "opens" | "activeDays" | "byCourseMs"
> & { lastActiveDay: string }

/**
 * Rank learners by active time within the scanned window. Pure so the shape of the
 * rollup (day counting, course merging, ordering) is unit-testable without Firestore.
 * `learn_daily` holds one doc per user per day, so each row is a distinct active day.
 */
export function aggregateLearnerRows(rows: LearnDailyUsage[]): LearnerActivityRollup[] {
  const byUser = new Map<string, LearnerActivityRollup>()
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

/** Every auth account, same pagination/cap discipline as the admin users list. */
async function listAllAuthUsers(): Promise<import("firebase-admin/auth").UserRecord[]> {
  const users: import("firebase-admin/auth").UserRecord[] = []
  let pageToken: string | undefined
  do {
    const result = await adminAuth.listUsers(DIRECTORY_AUTH_BATCH, pageToken)
    users.push(...result.users)
    pageToken = result.pageToken
    if (users.length >= DIRECTORY_MAX_AUTH_USERS) break
  } while (pageToken)
  return users
}

function compareNullableStrings(a: string | null, b: string | null, dir: "asc" | "desc"): number {
  // Nulls sink to the bottom in BOTH directions: "never active" and "no email" are
  // absences, not extremes, and flipping the sort should not surface them first.
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1
  return dir === "asc" ? a.localeCompare(b) : b.localeCompare(a)
}

/**
 * Search + sort + slice for the learner directory. Pure and exported so pagination
 * boundaries and null-sinking are unit-tested without Firestore or Auth.
 */
export function paginateLearnerDirectory(
  rows: LearnerDirectoryRow[],
  query: LearnerDirectoryQuery
): { rows: LearnerDirectoryRow[]; page: number; totalPages: number; totalFiltered: number } {
  const search = query.search?.trim().toLowerCase()
  const filtered = search
    ? rows.filter(
        (row) =>
          row.email?.toLowerCase().includes(search) ||
          row.fullName?.toLowerCase().includes(search) ||
          row.userId.toLowerCase().includes(search)
      )
    : rows

  const sortKey: LearnerDirectorySortKey = query.sort ?? "activeMs"
  const dir = query.dir ?? "desc"
  const sorted = [...filtered].sort((a, b) => {
    let primary: number
    if (sortKey === "lastActiveDay" || sortKey === "joinedAt" || sortKey === "email") {
      primary = compareNullableStrings(a[sortKey], b[sortKey], dir)
    } else {
      primary = dir === "asc" ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey]
    }
    if (primary !== 0) return primary
    // Stable, meaningful tiebreak: most-engaged first, then alphabetical.
    if (b.activeMs !== a.activeMs) return b.activeMs - a.activeMs
    return compareNullableStrings(a.email, b.email, "asc")
  })

  const totalPages = Math.max(1, Math.ceil(sorted.length / query.limit))
  const page = Math.min(Math.max(1, query.page), totalPages)
  return {
    rows: sorted.slice((page - 1) * query.limit, page * query.limit),
    page,
    totalPages,
    totalFiltered: sorted.length,
  }
}

/**
 * All signed-up accounts joined with their learn activity in the window. Telemetry rows
 * whose auth account no longer exists still get a line (the time was really spent); they
 * are excluded from `totalUsers`, which counts signed-up accounts.
 */
export async function getLearnerDirectory(
  sinceDayKey: string,
  query: LearnerDirectoryQuery
): Promise<LearnerDirectoryView> {
  const [{ rows: dailyRows, coverage }, authUsers] = await Promise.all([
    scanLearnDailySince(sinceDayKey),
    listAllAuthUsers(),
  ])

  const activity = new Map(aggregateLearnerRows(dailyRows).map((row) => [row.userId, row]))

  const allRows: LearnerDirectoryRow[] = authUsers.map((user) => {
    const rollup = activity.get(user.uid)
    activity.delete(user.uid)
    return {
      userId: user.uid,
      email: user.email ?? null,
      fullName: user.displayName ?? null,
      joinedAt: user.metadata?.creationTime
        ? new Date(user.metadata.creationTime).toISOString()
        : null,
      activeMs: rollup?.activeMs ?? 0,
      opens: rollup?.opens ?? 0,
      activeDays: rollup?.activeDays ?? 0,
      byCourseMs: rollup?.byCourseMs ?? {},
      lastActiveDay: rollup?.lastActiveDay ?? null,
    }
  })
  const totalUsers = allRows.length
  for (const orphan of activity.values()) {
    allRows.push({ ...orphan, email: null, fullName: null, joinedAt: null })
  }

  const activeUsers = allRows.filter((row) => row.activeMs > 0).length
  const pageResult = paginateLearnerDirectory(allRows, query)
  return { ...pageResult, totalUsers, activeUsers, coverage }
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
