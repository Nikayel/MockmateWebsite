"use client"

import { useCallback, useEffect, useState } from "react"
import { Clock } from "lucide-react"
import { AdminLayout, AdminSection, DataTable, type Column } from "@/components/admin/shared"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getCurrentUserToken } from "@/lib/firebase-lazy"
import { formatLearnDuration } from "@/lib/admin/format-learn-duration"
import type { PlatformLearnDayRow, PlatformLearnUsageView } from "@/lib/admin/learn-usage-views"

/**
 * Platform view over the Learn time rollups: how much active study time the curriculum gets,
 * day by day, split by course, and which lessons carry it. Active time means visible tab +
 * recent input (see lib/tutorials/learn-time-client.ts), so these numbers are engagement,
 * not wall clock — and deliberately NOT the dashboard "Practice" stat, which stays
 * interview-only. Per-learner detail lives in the Users page drawer, not here.
 */
const TIME_RANGES = ["7d", "30d", "90d", "all"] as const
type TimeRange = (typeof TIME_RANGES)[number]

const COURSE_LABELS: Record<string, string> = {
  python: "Python",
  "data-engineering": "Data Eng",
  "system-design": "System Design",
}

function courseBreakdown(byCourseMs: Partial<Record<string, number>>): string {
  const parts = Object.entries(byCourseMs)
    .filter(([, ms]) => typeof ms === "number" && ms > 0)
    .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))
    .map(([course, ms]) => `${COURSE_LABELS[course] ?? course} ${formatLearnDuration(ms ?? 0)}`)
  return parts.length ? parts.join(" · ") : "—"
}

export default function LearnUsagePage() {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d")
  const [data, setData] = useState<PlatformLearnUsageView | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (range: TimeRange) => {
    setLoading(true)
    setError(null)
    try {
      const token = await getCurrentUserToken()
      if (!token) throw new Error("Not signed in")
      const res = await fetch(`/api/admin/learn-usage?timeRange=${range}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`Request failed (${res.status})`)
      const body = (await res.json()) as { platform?: PlatformLearnUsageView }
      setData(body.platform ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(timeRange)
  }, [timeRange, load])

  const dayColumns: Column<PlatformLearnDayRow>[] = [
    { key: "day", label: "Day" },
    {
      key: "activeMs",
      label: "Active time",
      render: (row) => formatLearnDuration(row.activeMs),
    },
    { key: "activeUsers", label: "Learners" },
    { key: "opens", label: "Lesson opens" },
    {
      key: "byCourseMs",
      label: "By course",
      render: (row) => courseBreakdown(row.byCourseMs),
    },
  ]

  const lessonColumns: Column<PlatformLearnUsageView["topLessons"][number]>[] = [
    { key: "lessonId", label: "Lesson" },
    {
      key: "activeMs",
      label: "Active time",
      render: (row) => formatLearnDuration(row.activeMs),
    },
    { key: "users", label: "Learners" },
  ]

  const stats = [
    { label: "Active study time", value: data ? formatLearnDuration(data.totals.activeMs) : "—" },
    { label: "Active learners", value: data ? String(data.totals.activeUsers) : "—" },
    { label: "Lesson opens", value: data ? String(data.totals.opens) : "—" },
  ]

  // Newest day at the top of the table; the API returns oldest-first for charting.
  const daysNewestFirst = data ? [...data.days].reverse() : []

  return (
    <AdminLayout
      title="Learn usage"
      description="Active time on /learn lessons: day by day, by course, and by lesson. Separate from interview practice hours by design."
      icon={Clock}
      error={error}
      onRefresh={() => void load(timeRange)}
      refreshing={loading}
      headerActions={
        <div className="flex gap-1 rounded-lg bg-gray-900 p-1">
          {TIME_RANGES.map((range) => (
            <Button
              key={range}
              size="sm"
              variant={timeRange === range ? "default" : "ghost"}
              onClick={() => setTimeRange(range)}
              className={
                timeRange === range
                  ? "bg-[#c4703f] text-black hover:bg-[#c4703f]/80"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }
            >
              {range === "all" ? "All" : range.toUpperCase()}
            </Button>
          ))}
        </div>
      }
    >
      {data?.coverage.truncated && (
        <p className="rounded-lg border border-amber-700/40 bg-amber-950/30 px-4 py-2 text-sm text-amber-300">
          Scan hit its cap ({data.coverage.limit.toLocaleString()} user-days), so totals are lower
          bounds and the oldest days in this window are missing.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-gray-800 bg-gray-900/50">
            <CardContent className="pt-6">
              <p className="text-sm text-gray-400">{stat.label}</p>
              <p className="mt-1 text-2xl font-bold text-white">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <AdminSection
        title="Day by day"
        description="One row per UTC day with at least one active learner. Learners counts distinct signed-in users; anonymous visitors are not measured."
      >
        <DataTable
          data={daysNewestFirst}
          columns={dayColumns}
          keyExtractor={(row) => row.day}
          loading={loading}
          emptyMessage="No learn activity recorded yet."
        />
      </AdminSection>

      <AdminSection
        title="Most-studied lessons"
        description="Where the window's active time actually went. High time with few learners flags a lesson people grind on; high opens elsewhere with low time flags one they bounce off."
      >
        <DataTable
          data={data?.topLessons ?? []}
          columns={lessonColumns}
          keyExtractor={(row) => row.lessonId}
          loading={loading}
          emptyMessage="No lesson time recorded yet."
        />
      </AdminSection>
    </AdminLayout>
  )
}
