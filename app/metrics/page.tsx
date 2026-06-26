"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"
import {
  Clock,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ChevronRight,
  Activity,
  Layers,
  Crosshair,
  HelpCircle,
  ToggleLeft,
  ToggleRight,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"

interface MetricsData {
  overview: {
    totalSessions: number
    totalPracticeMinutes: number
    totalPracticeHours: number
    averageScore: number // Overall (includes communication)
    averageTechnicalScore: number // Technical (code-focused)
    lastSessionAt: string | null
  }
  patterns: Array<{
    pattern: string
    displayName: string
    sessions: number
    averageScore: number
    averageTechnicalScore: number
    bestScore: number
    proficiency: "novice" | "learning" | "practicing" | "proficient" | "expert"
  }>
  difficulty: Array<{
    difficulty: string
    sessions: number
    averageScore: number
    averageTechnicalScore: number
  }>
  trends: {
    daily: Array<{ date: string; score: number; sessions: number }>
    weeklyAverage: number
    trend: "improving" | "stable" | "declining"
    trendDescription: string
  }
  recentSessions: Array<{
    id: string
    scenarioId: string
    pattern: string
    difficulty: string
    performanceScore: number
    durationMinutes: number
    completedAt: string
    feedback: string
  }>
  usage: {
    totalCost: number
    totalRequests: number
    budgetUsedPercent: number
    budgetRemaining: number
  } | null
}

// Mini sparkline component for trends
function Sparkline({ data, color = "#fff" }: { data: number[]; color?: string }) {
  if (data.length === 0) return null

  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const width = 80
  const height = 24
  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1 || 1)) * width
      const y = height - ((val - min) / range) * height
      return `${x},${y}`
    })
    .join(" ")

  return (
    <svg width={width} height={height} className="opacity-60">
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} />
    </svg>
  )
}

// Activity heatmap inspired by GitHub
function ActivityHeatmap({
  sessions,
}: {
  sessions: Array<{ completedAt: string; performanceScore: number }>
}) {
  const today = new Date()
  const weeks = 12
  const days = weeks * 7

  // Create a map of date -> session data
  const sessionMap = useMemo(() => {
    const map = new Map<string, { count: number; totalScore: number; avgScore: number }>()
    sessions.forEach((s) => {
      const date = new Date(s.completedAt).toISOString().split("T")[0]
      const existing = map.get(date)
      if (existing) {
        existing.count++
        existing.totalScore += s.performanceScore
        existing.avgScore = Math.round(existing.totalScore / existing.count)
      } else {
        map.set(date, { count: 1, totalScore: s.performanceScore, avgScore: s.performanceScore })
      }
    })
    return map
  }, [sessions])

  const cells = []
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split("T")[0]
    const session = sessionMap.get(dateStr)

    let intensity = 0
    if (session) {
      intensity = Math.min(4, session.count)
    }

    const colors = [
      "bg-zinc-800/50",
      "bg-emerald-900/60",
      "bg-emerald-700/70",
      "bg-emerald-500/80",
      "bg-emerald-400",
    ]

    cells.push(
      <div
        key={dateStr}
        className={`h-2.5 w-2.5 rounded-sm ${colors[intensity]} transition-colors hover:ring-1 hover:ring-white/30`}
        title={
          session
            ? `${dateStr}: ${session.count} session(s), avg ${Math.round(session.avgScore)}%`
            : dateStr
        }
      />
    )
  }

  return (
    <div className="flex flex-wrap gap-0.5" style={{ maxWidth: `${weeks * 12}px` }}>
      {cells}
    </div>
  )
}

// Score ring visualization
function ScoreRing({ score, size = 120, label }: { score: number; size?: number; label: string }) {
  const radius = (size - 12) / 2
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference
  const remaining = circumference - progress

  const getScoreColor = (s: number) => {
    if (s >= 80) return "#22c55e"
    if (s >= 60) return "#eab308"
    return "#ef4444"
  }

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#27272a"
          strokeWidth="6"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getScoreColor(score)}
          strokeWidth="6"
          strokeDasharray={`${progress} ${remaining}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white">{score}%</span>
        <span className="text-[10px] tracking-wider text-zinc-500 uppercase">{label}</span>
      </div>
    </div>
  )
}

const proficiencyConfig: Record<string, { label: string; color: string; bg: string }> = {
  novice: { label: "Novice", color: "text-zinc-400", bg: "bg-zinc-700" },
  learning: { label: "Learning", color: "text-sky-400", bg: "bg-sky-500/20" },
  practicing: { label: "Practicing", color: "text-amber-400", bg: "bg-amber-500/20" },
  proficient: { label: "Proficient", color: "text-emerald-400", bg: "bg-emerald-500/20" },
  expert: { label: "Expert", color: "text-violet-400", bg: "bg-violet-500/20" },
}

export default function MetricsPage() {
  const router = useRouter()
  const { firebaseUser, loading: authLoading, initialized } = useAuth()
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showOverallScore, setShowOverallScore] = useState(false) // Default to technical score

  useEffect(() => {
    const loadMetrics = async () => {
      if (!initialized || authLoading) return

      if (!firebaseUser) {
        router.push("/login?redirect=metrics")
        return
      }

      try {
        const token = await firebaseUser.getIdToken()
        const response = await fetch("/api/user/metrics?days=30", {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!response.ok) {
          throw new Error("Failed to load metrics")
        }

        const data = await response.json()
        if (data.success) {
          setMetrics(data.data)
        } else {
          setError(data.error || "Failed to load metrics")
        }
      } catch (err) {
        console.error("Error loading metrics:", err)
        setError("Failed to load your metrics. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    loadMetrics()
  }, [firebaseUser, authLoading, initialized, router])

  if (authLoading || !initialized || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 animate-pulse rounded-full bg-zinc-600" />
          <div className="h-2 w-2 animate-pulse rounded-full bg-zinc-500 delay-75" />
          <div className="h-2 w-2 animate-pulse rounded-full bg-zinc-400 delay-150" />
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-zinc-950">
        <Header />
        <div className="pt-24 pb-16">
          <div className="container mx-auto max-w-5xl px-4">
            <div className="py-16 text-center">
              <p className="mb-4 font-mono text-sm text-red-400">{error}</p>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="border-zinc-700"
              >
                Retry
              </Button>
            </div>
          </div>
        </div>
        <Footer />
      </main>
    )
  }

  const hasData = metrics && metrics.overview.totalSessions > 0

  // Calculate trend data for sparkline
  const trendScores = metrics?.trends.daily.map((d) => d.score) || []

  // Get difficulty breakdown
  const easyData = metrics?.difficulty.find((d) => d.difficulty === "easy")
  const mediumData = metrics?.difficulty.find((d) => d.difficulty === "medium")
  const hardData = metrics?.difficulty.find((d) => d.difficulty === "hard")

  return (
    <main className="min-h-screen bg-zinc-950">
      <Header />

      <div className="pt-24 pb-16">
        <div className="container mx-auto max-w-6xl px-4">
          {!hasData ? (
            /* Empty State - Minimal */
            <div className="mx-auto max-w-lg py-24 text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900">
                <Activity className="h-8 w-8 text-zinc-600" />
              </div>
              <h1 className="mb-3 text-2xl font-semibold text-white">No sessions yet</h1>
              <p className="mb-8 leading-relaxed text-zinc-500">
                Complete your first practice session to see your performance analytics.
              </p>
              <Link href="/interview">
                <Button className="bg-white font-medium text-zinc-900 hover:bg-zinc-200">
                  Start practicing
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          ) : (
            <>
              {/* Header - Compact */}
              <div className="mb-12">
                <div className="mb-2 flex items-center gap-2 text-sm text-zinc-500">
                  <Activity className="h-4 w-4" />
                  <span>Performance Analytics</span>
                </div>
                <h1 className="text-3xl font-semibold text-white">Your Progress</h1>
              </div>

              {/* Main Stats - Bento Grid */}
              <div className="mb-8 grid grid-cols-12 gap-4">
                {/* Big Number - Sessions */}
                <div className="col-span-12 rounded-2xl border border-zinc-800/50 bg-zinc-900/50 p-6 md:col-span-4">
                  <div className="mb-4 flex items-start justify-between">
                    <span className="text-sm text-zinc-500">Total Sessions</span>
                    <span className="font-mono text-xs text-zinc-600">30d</span>
                  </div>
                  <div className="flex items-end gap-4">
                    <span className="text-5xl font-light tracking-tight text-white">
                      {metrics.overview.totalSessions}
                    </span>
                    <div className="pb-2">
                      <Sparkline
                        data={metrics.trends.daily.map((d) => d.sessions)}
                        color="#71717a"
                      />
                    </div>
                  </div>
                </div>

                {/* Score Ring with Toggle */}
                <div className="col-span-6 flex flex-col items-center justify-center rounded-2xl border border-zinc-800/50 bg-zinc-900/50 p-6 md:col-span-4">
                  <ScoreRing
                    score={
                      showOverallScore
                        ? metrics.overview.averageScore
                        : metrics.overview.averageTechnicalScore
                    }
                    label={showOverallScore ? "interview" : "technical"}
                  />
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => setShowOverallScore(!showOverallScore)}
                      className="flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
                    >
                      {showOverallScore ? (
                        <ToggleRight className="h-4 w-4 text-[#c4703f]" />
                      ) : (
                        <ToggleLeft className="h-4 w-4" />
                      )}
                      <span>{showOverallScore ? "Interview" : "Technical"}</span>
                    </button>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3 w-3 cursor-help text-zinc-500" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs bg-zinc-800 text-zinc-200">
                        <p className="mb-1 font-medium">
                          {showOverallScore ? "Interview Score" : "Technical Score"}
                        </p>
                        <p className="text-xs">
                          {showOverallScore
                            ? "Your overall interview performance weighted as: Code Quality (30%) + Problem Solving (25%) + Understanding (25%) + Communication (20%)"
                            : "Code-focused score excluding communication: Understanding (37.5%) + Problem Solving (31.25%) + Code Quality (31.25%)"}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                {/* Trend + Practice Time Stack */}
                <div className="col-span-6 flex flex-col gap-4 md:col-span-4">
                  {/* Trend */}
                  <div className="flex-1 rounded-2xl border border-zinc-800/50 bg-zinc-900/50 p-5">
                    <span className="text-sm text-zinc-500">Weekly Trend</span>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-2xl font-light text-white">
                        {metrics.trends.weeklyAverage}%
                      </span>
                      {metrics.trends.trend === "improving" && (
                        <span className="flex items-center text-sm text-emerald-500">
                          <ArrowUpRight className="h-4 w-4" />
                        </span>
                      )}
                      {metrics.trends.trend === "declining" && (
                        <span className="flex items-center text-sm text-red-500">
                          <ArrowDownRight className="h-4 w-4" />
                        </span>
                      )}
                      {metrics.trends.trend === "stable" && (
                        <span className="flex items-center text-sm text-zinc-500">
                          <Minus className="h-4 w-4" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Practice Time */}
                  <div className="flex-1 rounded-2xl border border-zinc-800/50 bg-zinc-900/50 p-5">
                    <span className="text-sm text-zinc-500">Practice Time</span>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-2xl font-light text-white">
                        {metrics.overview.totalPracticeHours}
                      </span>
                      <span className="text-sm text-zinc-500">hours</span>
                    </div>
                  </div>
                </div>

                {/* Activity Heatmap */}
                <div className="col-span-12 rounded-2xl border border-zinc-800/50 bg-zinc-900/50 p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-sm text-zinc-500">Activity</span>
                    <span className="text-xs text-zinc-600">Last 12 weeks</span>
                  </div>
                  <ActivityHeatmap sessions={metrics.recentSessions} />
                  <div className="mt-4 flex items-center gap-2 text-xs text-zinc-600">
                    <span>Less</span>
                    <div className="flex gap-0.5">
                      <div className="h-2.5 w-2.5 rounded-sm bg-zinc-800/50" />
                      <div className="h-2.5 w-2.5 rounded-sm bg-emerald-900/60" />
                      <div className="h-2.5 w-2.5 rounded-sm bg-emerald-700/70" />
                      <div className="h-2.5 w-2.5 rounded-sm bg-emerald-500/80" />
                      <div className="h-2.5 w-2.5 rounded-sm bg-emerald-400" />
                    </div>
                    <span>More</span>
                  </div>
                </div>
              </div>

              {/* Trend Message - Inline */}
              {metrics.trends.trendDescription && (
                <div className="mb-8 flex items-center gap-3 text-sm">
                  <div
                    className={`h-1.5 w-1.5 rounded-full ${
                      metrics.trends.trend === "improving"
                        ? "bg-emerald-500"
                        : metrics.trends.trend === "declining"
                          ? "bg-red-500"
                          : "bg-zinc-500"
                    }`}
                  />
                  <span className="text-zinc-400">{metrics.trends.trendDescription}</span>
                </div>
              )}

              {/* Two Column Layout */}
              <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Pattern Mastery */}
                <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/50">
                  <div className="flex items-center gap-2 border-b border-zinc-800/50 p-5">
                    <Layers className="h-4 w-4 text-zinc-600" />
                    <span className="text-sm font-medium text-zinc-300">Pattern Mastery</span>
                  </div>
                  <div className="p-4">
                    {metrics.patterns.length === 0 ? (
                      <p className="p-4 text-sm text-zinc-600">
                        Complete sessions to track patterns
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {metrics.patterns.slice(0, 6).map((pattern) => {
                          const config = proficiencyConfig[pattern.proficiency]
                          return (
                            <div
                              key={pattern.pattern}
                              className="group flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-zinc-800/30"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-white">{pattern.displayName}</span>
                                <span
                                  className={`rounded px-2 py-0.5 text-xs ${config.bg} ${config.color}`}
                                >
                                  {config.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-xs text-zinc-500">
                                  {pattern.sessions} sessions
                                </span>
                                <span className="w-12 text-right font-mono text-sm text-zinc-300">
                                  {showOverallScore
                                    ? pattern.averageScore
                                    : pattern.averageTechnicalScore || pattern.averageScore}
                                  %
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Difficulty Breakdown */}
                <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/50">
                  <div className="flex items-center gap-2 border-b border-zinc-800/50 p-5">
                    <Crosshair className="h-4 w-4 text-zinc-600" />
                    <span className="text-sm font-medium text-zinc-300">By Difficulty</span>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { key: "easy", label: "Easy", data: easyData, color: "emerald" },
                        { key: "medium", label: "Medium", data: mediumData, color: "amber" },
                        { key: "hard", label: "Hard", data: hardData, color: "red" },
                      ].map(({ key, label, data, color }) => (
                        <div key={key} className="text-center">
                          <div
                            className={`mb-3 inline-block rounded-full px-3 py-1 text-xs font-medium ${color === "emerald" ? "bg-emerald-500/10 text-emerald-500" : ""} ${color === "amber" ? "bg-amber-500/10 text-amber-500" : ""} ${color === "red" ? "bg-red-500/10 text-red-500" : ""} `}
                          >
                            {label}
                          </div>
                          {data ? (
                            <>
                              <div
                                className={`mb-1 text-3xl font-light ${color === "emerald" ? "text-emerald-400" : ""} ${color === "amber" ? "text-amber-400" : ""} ${color === "red" ? "text-red-400" : ""} `}
                              >
                                {showOverallScore
                                  ? data.averageScore
                                  : data.averageTechnicalScore || data.averageScore}
                                %
                              </div>
                              <div className="text-xs text-zinc-500">{data.sessions} sessions</div>
                            </>
                          ) : (
                            <div className="text-sm text-zinc-600">—</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Sessions - List Style */}
              <div className="mb-8 rounded-2xl border border-zinc-800/50 bg-zinc-900/50">
                <div className="flex items-center justify-between border-b border-zinc-800/50 p-5">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-zinc-600" />
                    <span className="text-sm font-medium text-zinc-300">Recent Sessions</span>
                  </div>
                  <span className="text-xs text-zinc-600">
                    {metrics.recentSessions.length} total
                  </span>
                </div>
                <div>
                  {metrics.recentSessions.length === 0 ? (
                    <p className="p-6 text-sm text-zinc-600">No sessions yet</p>
                  ) : (
                    <div className="divide-y divide-zinc-800/50">
                      {metrics.recentSessions.slice(0, 5).map((session) => (
                        <Link
                          key={session.id}
                          href={`/sessions/${session.id}`}
                          className="group flex items-center justify-between p-4 transition-colors hover:bg-zinc-800/30"
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className={`flex h-10 w-10 items-center justify-center rounded-lg font-mono text-sm ${session.performanceScore >= 80 ? "bg-emerald-500/10 text-emerald-400" : ""} ${session.performanceScore >= 60 && session.performanceScore < 80 ? "bg-amber-500/10 text-amber-400" : ""} ${session.performanceScore < 60 ? "bg-red-500/10 text-red-400" : ""} `}
                            >
                              {session.performanceScore}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-white capitalize">
                                  {(session.pattern || "unknown").replace(/-/g, " ")}
                                </span>
                                <span
                                  className={`rounded px-1.5 py-0.5 text-[10px] tracking-wider uppercase ${session.difficulty === "easy" ? "text-emerald-500" : ""} ${session.difficulty === "medium" ? "text-amber-500" : ""} ${session.difficulty === "hard" ? "text-red-500" : ""} `}
                                >
                                  {session.difficulty}
                                </span>
                              </div>
                              <div className="mt-0.5 flex items-center gap-3 text-xs text-zinc-500">
                                <span>{session.durationMinutes} min</span>
                                <span>
                                  {new Date(session.completedAt).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-zinc-600 transition-colors group-hover:text-zinc-400" />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* CTA - Minimal */}
              <div className="flex items-center justify-between rounded-2xl border border-zinc-800/50 bg-zinc-900/30 p-6">
                <div>
                  <h3 className="mb-1 font-medium text-white">Ready for more practice?</h3>
                  <p className="text-sm text-zinc-500">
                    Keep building your skills with targeted sessions.
                  </p>
                </div>
                <Link href="/interview">
                  <Button
                    variant="outline"
                    className="border-zinc-700 text-white hover:bg-zinc-800"
                  >
                    Practice now
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      <Footer />
    </main>
  )
}
