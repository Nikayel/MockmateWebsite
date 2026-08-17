"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { BookOpen, Clock, Gauge, Users } from "lucide-react"
import { AdminLayout, AdminSection, DataTable, type Column } from "@/components/admin/shared"
import { MetricCard, TimeSeriesChart } from "@/components/admin/charts"
import { Button } from "@/components/ui/button"
import { UserProfileDrawer } from "@/components/admin/UserProfileDrawer"
import { getCurrentUserToken } from "@/lib/firebase-lazy"
import { formatLearnDuration } from "@/lib/admin/format-learn-duration"
import type {
  LearnerDirectoryRow,
  LearnerDirectorySortKey,
  LearnerDirectoryView,
  PlatformLearnUsageView,
} from "@/lib/admin/learn-usage-views"
import type { SortDirection } from "@/lib/admin/table-sort"

/**
 * Learn engagement analytics: daily active study time charted by course, headline
 * engagement metrics, and a directory of EVERY signed-up account joined with its learn
 * activity — the zero rows are the point, because "who is not engaging" is half the
 * story. Active time means visible tab + recent input (see
 * lib/tutorials/learn-time-client.ts), so these numbers are engagement, not wall clock —
 * and deliberately NOT the dashboard "Practice" stat, which stays interview-only.
 * Clicking a learner opens the same profile drawer as the Users page; the directory only
 * exists for admins holding view_user_details, and the section explains itself when absent.
 */
const TIME_RANGES = ["7d", "30d", "90d", "all"] as const
type TimeRange = (typeof TIME_RANGES)[number]

const RANGE_DAY_COUNTS: Record<TimeRange, number | null> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  all: null,
}

const COURSE_LABELS: Record<string, string> = {
  python: "Python",
  "data-engineering": "Data Eng",
  "system-design": "System Design",
}

const COURSE_COLORS: Record<string, string> = {
  python: "#3b82f6",
  "data-engineering": "#10b981",
  "system-design": "#c4703f",
}

const DIRECTORY_PAGE_SIZE = 25
const SEARCH_DEBOUNCE_MS = 300

const SORTABLE_KEYS: readonly LearnerDirectorySortKey[] = [
  "activeMs",
  "activeDays",
  "opens",
  "lastActiveDay",
  "joinedAt",
  "email",
]

function courseBreakdown(byCourseMs: Partial<Record<string, number>>): string {
  const parts = Object.entries(byCourseMs)
    .filter(([, ms]) => typeof ms === "number" && ms > 0)
    .sort(([, a], [, b]) => (b ?? 0) - (a ?? 0))
    .map(([course, ms]) => `${COURSE_LABELS[course] ?? course} ${formatLearnDuration(ms ?? 0)}`)
  return parts.length ? parts.join(" · ") : "—"
}

/** UTC day key, matching the server's rollup keys. */
function utcDayKeyFromMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

export default function LearnUsagePage() {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d")
  const [platform, setPlatform] = useState<PlatformLearnUsageView | null>(null)
  const [platformLoading, setPlatformLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [directory, setDirectory] = useState<LearnerDirectoryView | null>(null)
  const [directoryLoading, setDirectoryLoading] = useState(true)
  const [directoryDenied, setDirectoryDenied] = useState(false)
  const [directoryError, setDirectoryError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<{ key: LearnerDirectorySortKey; dir: SortDirection } | null>(
    null
  )

  // The profile drawer needs the token; keep the latest one instead of re-fetching on click.
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const loadPlatform = useCallback(async (range: TimeRange) => {
    setPlatformLoading(true)
    setError(null)
    try {
      const token = await getCurrentUserToken()
      if (!token) throw new Error("Not signed in")
      setAuthToken(token)
      const res = await fetch(`/api/admin/learn-usage?timeRange=${range}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`Request failed (${res.status})`)
      const body = (await res.json()) as { platform?: PlatformLearnUsageView }
      setPlatform(body.platform ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
      setPlatform(null)
    } finally {
      setPlatformLoading(false)
    }
  }, [])

  const loadDirectory = useCallback(
    async (opts: {
      range: TimeRange
      page: number
      search: string
      sort: { key: LearnerDirectorySortKey; dir: SortDirection } | null
    }) => {
      setDirectoryLoading(true)
      setDirectoryError(null)
      try {
        const token = await getCurrentUserToken()
        if (!token) throw new Error("Not signed in")
        setAuthToken(token)
        const params = new URLSearchParams({
          view: "learners",
          timeRange: opts.range,
          page: String(opts.page),
          limit: String(DIRECTORY_PAGE_SIZE),
        })
        if (opts.search) params.set("search", opts.search)
        if (opts.sort) {
          params.set("sort", opts.sort.key)
          params.set("dir", opts.sort.dir)
        }
        const res = await fetch(`/api/admin/learn-usage?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.status === 401 || res.status === 403) {
          setDirectoryDenied(true)
          setDirectory(null)
          return
        }
        if (!res.ok) throw new Error(`Request failed (${res.status})`)
        const body = (await res.json()) as { learners?: LearnerDirectoryView }
        setDirectory(body.learners ?? null)
      } catch (e) {
        setDirectoryError(e instanceof Error ? e.message : "Failed to load learners")
        setDirectory(null)
      } finally {
        setDirectoryLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    void loadPlatform(timeRange)
  }, [timeRange, loadPlatform])

  // Debounce the search box so the directory is not re-fetched per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    if (directoryDenied) return
    void loadDirectory({ range: timeRange, page, search, sort })
  }, [timeRange, page, search, sort, directoryDenied, loadDirectory])

  const refresh = useCallback(() => {
    void loadPlatform(timeRange)
    if (!directoryDenied) void loadDirectory({ range: timeRange, page, search, sort })
  }, [loadPlatform, loadDirectory, timeRange, page, search, sort, directoryDenied])

  /**
   * Continuous UTC day series for the chart, zeros filled in: with sparse data an
   * area chart would otherwise draw a straight line between two active days and
   * invent engagement that never happened.
   */
  const chartData = useMemo(() => {
    const byDay = new Map((platform?.days ?? []).map((day) => [day.day, day]))
    const dayMs = 24 * 60 * 60 * 1000
    const today = Date.now()
    let dayCount = RANGE_DAY_COUNTS[timeRange]
    if (dayCount === null) {
      const earliest = platform?.days[0]?.day
      dayCount = earliest
        ? Math.min(365, Math.round((today - Date.parse(earliest)) / dayMs) + 1)
        : 30
      dayCount = Math.max(dayCount, 14)
    }
    const rows: Array<Record<string, string | number>> = []
    for (let i = dayCount - 1; i >= 0; i--) {
      const key = utcDayKeyFromMs(today - i * dayMs)
      const byCourse: Partial<Record<string, number>> = byDay.get(key)?.byCourseMs ?? {}
      const row: Record<string, string | number> = { date: key }
      for (const course of Object.keys(COURSE_LABELS)) {
        row[course] = Math.round(((byCourse[course] ?? 0) / 60_000) * 10) / 10
      }
      rows.push(row)
    }
    return rows
  }, [platform, timeRange])

  const chartSeries = useMemo(() => {
    const seen = new Set<string>()
    for (const day of platform?.days ?? []) {
      for (const [course, ms] of Object.entries(day.byCourseMs)) {
        if (typeof ms === "number" && ms > 0) seen.add(course)
      }
    }
    const courses = seen.size > 0 ? [...seen] : Object.keys(COURSE_LABELS)
    return courses.map((course) => ({
      key: course,
      name: COURSE_LABELS[course] ?? course,
      color: COURSE_COLORS[course] ?? "#6b7280",
    }))
  }, [platform])

  const dailyTotalsSparkline = useMemo(
    () => chartData.map((row) => chartSeries.reduce((sum, s) => sum + Number(row[s.key] ?? 0), 0)),
    [chartData, chartSeries]
  )

  const totals = platform?.totals
  const avgPerActiveLearner =
    totals && totals.activeUsers > 0 ? totals.activeMs / totals.activeUsers : 0

  const learnerColumns: Column<LearnerDirectoryRow>[] = [
    {
      key: "email",
      label: "Learner",
      sortable: true,
      render: (_, row) => (
        <button
          type="button"
          title={row.userId}
          onClick={() => {
            setSelectedUserId(row.userId)
            setDrawerOpen(true)
          }}
          className="rounded-sm text-left underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-[#c4703f] focus-visible:outline-none"
        >
          <span className="block font-medium text-white hover:text-[#c4703f]">
            {row.email ?? row.fullName ?? "Deleted account"}
          </span>
          <span className="block text-xs text-gray-500">
            {row.email && row.fullName ? row.fullName : row.userId.slice(0, 12)}
          </span>
        </button>
      ),
    },
    {
      key: "activeMs",
      label: "Active time",
      sortable: true,
      align: "right",
      render: (_, row) => (
        <span className={row.activeMs > 0 ? "font-medium text-white" : "text-gray-600"}>
          {row.activeMs > 0 ? formatLearnDuration(row.activeMs) : "—"}
        </span>
      ),
    },
    {
      key: "activeDays",
      label: "Days",
      sortable: true,
      align: "right",
      render: (_, row) =>
        row.activeDays > 0 ? row.activeDays : <span className="text-gray-600">—</span>,
    },
    {
      key: "opens",
      label: "Lesson opens",
      sortable: true,
      align: "right",
      render: (_, row) => (row.opens > 0 ? row.opens : <span className="text-gray-600">—</span>),
    },
    {
      key: "byCourseMs",
      label: "By course",
      render: (_, row) => courseBreakdown(row.byCourseMs),
    },
    {
      key: "lastActiveDay",
      label: "Last active",
      sortable: true,
      render: (_, row) =>
        row.lastActiveDay ?? <span className="text-gray-600">Never opened Learn</span>,
    },
    {
      key: "joinedAt",
      label: "Joined",
      sortable: true,
      render: (_, row) => (row.joinedAt ? row.joinedAt.slice(0, 10) : "—"),
    },
  ]

  const handleSort = useCallback((columnKey: string, direction: SortDirection) => {
    if (!(SORTABLE_KEYS as readonly string[]).includes(columnKey)) return
    setSort({ key: columnKey as LearnerDirectorySortKey, dir: direction })
    setPage(1)
  }, [])

  return (
    <AdminLayout
      title="Learn usage"
      description="Engagement analytics for /learn: active study time by day, course, lesson, and learner. Separate from interview practice hours by design."
      icon={Clock}
      error={error}
      onRefresh={refresh}
      refreshing={platformLoading || directoryLoading}
      headerActions={
        <div className="flex gap-1 rounded-lg bg-gray-900 p-1">
          {TIME_RANGES.map((range) => (
            <Button
              key={range}
              size="sm"
              variant={timeRange === range ? "default" : "ghost"}
              onClick={() => {
                setTimeRange(range)
                setPage(1)
              }}
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
      {platform?.coverage.truncated && (
        <p className="rounded-lg border border-amber-700/40 bg-amber-950/30 px-4 py-2 text-sm text-amber-300">
          Scan hit its cap ({platform.coverage.limit.toLocaleString()} user-days), so totals are
          lower bounds and the oldest days in this window are missing.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Active study time"
          value={totals ? formatLearnDuration(totals.activeMs) : "—"}
          subtitle={timeRange === "all" ? "all time" : `last ${timeRange}`}
          icon={Clock}
          sparklineData={dailyTotalsSparkline}
          loading={platformLoading}
        />
        <MetricCard
          title="Active learners"
          value={totals ? totals.activeUsers : "—"}
          subtitle={
            directory ? `of ${directory.totalUsers} signed up` : "signed-in learners in window"
          }
          icon={Users}
          loading={platformLoading}
        />
        <MetricCard
          title="Lesson opens"
          value={totals ? totals.opens : "—"}
          subtitle="lesson visits in window"
          icon={BookOpen}
          loading={platformLoading}
        />
        <MetricCard
          title="Avg per active learner"
          value={totals && totals.activeUsers > 0 ? formatLearnDuration(avgPerActiveLearner) : "—"}
          subtitle="active time per engaged learner"
          icon={Gauge}
          loading={platformLoading}
        />
      </div>

      <TimeSeriesChart
        title="Daily active study time"
        subtitle="minutes per UTC day, stacked by course"
        data={chartData}
        series={chartSeries}
        xAxisKey="date"
        stacked
        loading={platformLoading}
        icon={Clock}
        valueFormatter={(minutes) => formatLearnDuration(Math.round(minutes * 60_000))}
      />

      <AdminSection
        title="Learners"
        description="Every signed-up account with its learn engagement in the window — the zero rows show who has not opened Learn yet. Click a learner for their full profile, including per-lesson and day-by-day detail."
      >
        {directoryDenied ? (
          <p className="rounded-lg border border-gray-800 bg-gray-900/50 px-4 py-3 text-sm text-gray-400">
            The learner directory requires the user-details permission; the aggregate numbers above
            are unaffected.
          </p>
        ) : directoryError ? (
          <p className="rounded-lg border border-red-900/40 bg-red-950/30 px-4 py-3 text-sm text-red-300">
            {directoryError}
          </p>
        ) : (
          <div className="space-y-2">
            <DataTable
              data={directory?.rows ?? []}
              columns={learnerColumns}
              keyExtractor={(row) => row.userId}
              loading={directoryLoading}
              searchable
              searchPlaceholder="Search email or name…"
              onSearch={setSearchInput}
              onSort={handleSort}
              pagination={
                directory && directory.totalPages > 1
                  ? {
                      page: directory.page,
                      totalPages: directory.totalPages,
                      onPageChange: setPage,
                    }
                  : undefined
              }
              rowClassName={(row) => (row.activeMs === 0 ? "opacity-60" : "")}
              emptyMessage={search ? "No accounts match this search." : "No accounts found."}
            />
            {directory && (
              <p className="px-1 text-xs text-gray-500">
                {directory.totalFiltered.toLocaleString()} account
                {directory.totalFiltered === 1 ? "" : "s"}
                {search ? " matching" : ""} · {directory.activeUsers.toLocaleString()} active in
                window · sorted by {sort ? sort.key : "active time"}
              </p>
            )}
          </div>
        )}
      </AdminSection>

      <AdminSection
        title="Most-studied lessons"
        description="Where the window's active time actually went. High time with few learners flags a lesson people grind on; high opens elsewhere with low time flags one they bounce off."
      >
        <DataTable
          data={platform?.topLessons ?? []}
          columns={[
            { key: "lessonId", label: "Lesson" },
            {
              key: "activeMs",
              label: "Active time",
              align: "right",
              render: (_, row) => formatLearnDuration(row.activeMs),
            },
            { key: "users", label: "Learners", align: "right" },
          ]}
          keyExtractor={(row) => row.lessonId}
          loading={platformLoading}
          emptyMessage="No lesson time recorded yet."
        />
      </AdminSection>

      <UserProfileDrawer
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false)
          setSelectedUserId(null)
        }}
        userId={selectedUserId}
        token={authToken}
      />
    </AdminLayout>
  )
}
