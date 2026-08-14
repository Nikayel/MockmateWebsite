"use client"

import { useEffect, useState } from "react"
import { BookOpen } from "lucide-react"
import { DrawerSection } from "./DrawerSection"
import { formatLearnDuration } from "@/lib/admin/format-learn-duration"
import type { UserLearnUsageView } from "@/lib/admin/learn-usage-views"

/**
 * "Learn usage" section of the admin user-profile drawer: which lessons this user actually
 * spends active time on, and their day-by-day rhythm. Fetches its own data from
 * /api/admin/learn-usage?userId= rather than widening the already-heavy user-profile route.
 * Deliberately separate from interview practice hours — Learn time never feeds that stat.
 */
const DAILY_WINDOW = "90d"
const MAX_LESSON_ROWS = 10
const MAX_DAY_ROWS = 14

const COURSE_LABELS: Record<string, string> = {
  python: "Python",
  "data-engineering": "Data Eng",
  "system-design": "System Design",
}

export function LearnUsageSection({ userId, token }: { userId: string; token: string }) {
  const [data, setData] = useState<UserLearnUsageView | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setData(null)
    setError(null)
    fetch(`/api/admin/learn-usage?userId=${encodeURIComponent(userId)}&timeRange=${DAILY_WINDOW}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Request failed (${res.status})`)
        const body = (await res.json()) as { user?: UserLearnUsageView }
        if (!cancelled) setData(body.user ?? null)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load learn usage")
      })
    return () => {
      cancelled = true
    }
  }, [userId, token])

  return (
    <DrawerSection title="Learn Usage" icon={BookOpen} defaultOpen={false}>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {!error && !data && <p className="text-sm text-gray-400">Loading…</p>}
      {!error && data && data.lessons.length === 0 && (
        <p className="text-sm text-gray-400">No learn activity recorded for this user.</p>
      )}
      {!error && data && data.lessons.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <span className="text-gray-400">
              Total active:{" "}
              <span className="font-medium text-white">
                {formatLearnDuration(data.totals.activeMs)}
              </span>
            </span>
            <span className="text-gray-400">
              Lesson opens: <span className="font-medium text-white">{data.totals.opens}</span>
            </span>
            {Object.entries(data.totals.byCourseMs)
              .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))
              .map(([course, ms]) => (
                <span key={course} className="text-gray-400">
                  {COURSE_LABELS[course] ?? course}:{" "}
                  <span className="font-medium text-white">{formatLearnDuration(ms ?? 0)}</span>
                </span>
              ))}
          </div>

          <div>
            <p className="mb-1 text-xs font-medium tracking-wide text-gray-500 uppercase">
              Most-used lessons (lifetime)
            </p>
            <div className="space-y-1">
              {data.lessons.slice(0, MAX_LESSON_ROWS).map((lesson) => (
                <div key={lesson.lessonId} className="flex items-center justify-between py-0.5">
                  <span className="truncate pr-2 font-mono text-sm text-gray-300">
                    {lesson.lessonId}
                  </span>
                  <span className="text-sm whitespace-nowrap text-gray-400">
                    {formatLearnDuration(lesson.activeMs)} · {lesson.opens} open
                    {lesson.opens === 1 ? "" : "s"}
                  </span>
                </div>
              ))}
              {data.lessons.length > MAX_LESSON_ROWS && (
                <p className="text-xs text-gray-500">
                  +{data.lessons.length - MAX_LESSON_ROWS} more lessons
                </p>
              )}
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium tracking-wide text-gray-500 uppercase">
              Day by day (last {DAILY_WINDOW})
            </p>
            {data.daily.length === 0 ? (
              <p className="text-sm text-gray-400">No activity in this window.</p>
            ) : (
              <div className="space-y-1">
                {[...data.daily]
                  .reverse()
                  .slice(0, MAX_DAY_ROWS)
                  .map((day) => (
                    <div key={day.day} className="flex items-center justify-between py-0.5">
                      <span className="font-mono text-sm text-gray-300">{day.day}</span>
                      <span className="text-sm text-gray-400">
                        {formatLearnDuration(day.activeMs)}
                        {day.byLessonMs && Object.keys(day.byLessonMs).length > 0
                          ? ` · ${Object.keys(day.byLessonMs).length} lesson${
                              Object.keys(day.byLessonMs).length === 1 ? "" : "s"
                            }`
                          : ""}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}
    </DrawerSection>
  )
}
