"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  MetricCard,
  TimeSeriesChart,
  FunnelChart,
  DistributionChart,
} from "@/components/admin/charts"
import {
  PageHeader,
  DashboardSkeleton,
} from "@/components/admin/shared"
import {
  Users,
  DollarSign,
  Terminal,
  TrendingUp,
  AlertCircle,
  Activity,
  RefreshCw,
  Crown,
  Zap,
  LayoutDashboard,
} from "lucide-react"
import { logger } from "@/lib/logger"

interface AnalyticsMetrics {
  users: {
    total: number
    byTier: {
      free: number
      pro: number
      enterprise: number
    }
  }
  sessions: {
    total: number
    completed: number
    inProgress: number
    avgPerformanceScore: number
    byType: Record<string, number>
    byDifficulty: Record<string, number>
    scoredCompleted?: number
    guest?: number
    registered?: number
    registeredCompleted?: number
    registeredScoredCompleted?: number
  }
  wcsr?: {
    currentWeek: number
    total: number
    series: Array<{ week: string; count: number }>
  }
  /** All-time scored rounds via aggregate count; range-independent. Null when the count failed. */
  scoredRoundsAllTime?: number | null
  revenue: {
    /** Null when the signed-in admin role does not hold VIEW_REVENUE. */
    mrr: number | null
    arr: number | null
  }
  analytics: {
    totalEvents: number
    byEventType: Record<string, number>
    codeExecutions: {
      total: number
      passed: number
      passRate: number
    }
  }
  errors: {
    total: number
    recent: Array<{
      timestamp: string
      errorType?: string
      errorMessage?: string
    }>
  }
  timeSeries?: {
    users: Array<{ date: string; total: number; free: number; pro: number; enterprise: number }>
    sessions: Array<{ date: string; total: number; completed: number }>
    revenue: Array<{ date: string; mrr: number }>
  }
}

interface FunnelData {
  stages: Array<{ name: string; value: number; color?: string }>
  conversionRates: {
    visitToSignup: number
    signupToSession: number
    sessionToComplete: number
    completeToSubscribe: number
    overallConversion: number
  }
}

export default function AdminDashboard() {
  const { firebaseUser } = useAuth()
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null)
  const [funnel, setFunnel] = useState<FunnelData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [timeRange, setTimeRange] = useState("7d")
  const [error, setError] = useState<string | null>(null)

  const loadMetrics = useCallback(async (showRefreshing = false) => {
    if (!firebaseUser) return

    if (showRefreshing) setRefreshing(true)
    setError(null)

    try {
      const token = await firebaseUser.getIdToken()
      const headers = { Authorization: `Bearer ${token}` }

      // Fetch analytics and funnel data in parallel
      const [analyticsRes, funnelRes] = await Promise.all([
        fetch(`/api/admin/analytics?timeRange=${timeRange}`, { headers }),
        fetch(`/api/admin/funnel?timeRange=${timeRange}`, { headers }),
      ])

      if (!analyticsRes.ok) {
        throw new Error("Failed to load analytics")
      }

      const analyticsData = await analyticsRes.json()
      if (analyticsData.success && analyticsData.metrics) {
        setMetrics(analyticsData.metrics)
      }

      if (funnelRes.ok) {
        const funnelData = await funnelRes.json()
        if (funnelData.success && funnelData.funnel) {
          setFunnel(funnelData.funnel)
        }
      }
    } catch (err) {
      logger.error("Error loading admin metrics", { error: err, timeRange })
      setError(err instanceof Error ? err.message : "Failed to load data")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [firebaseUser, timeRange])

  useEffect(() => {
    loadMetrics()
  }, [loadMetrics])

  const handleRefresh = () => loadMetrics(true)

  if (loading) {
    return <DashboardSkeleton />
  }

  if (error || !metrics) {
    return (
      <Card className="bg-red-900/20 border-red-500/30">
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 font-medium">{error || "Failed to load analytics data"}</p>
          <Button onClick={handleRefresh} className="mt-4" variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  const conversionRate = metrics.users.total > 0
    ? ((metrics.users.byTier.pro / metrics.users.total) * 100).toFixed(1)
    : "0"

  const completionRate = metrics.sessions.total > 0
    ? ((metrics.sessions.completed / metrics.sessions.total) * 100).toFixed(1)
    : "0"

  // Prepare tier distribution data
  const tierDistribution = [
    { name: "Free", value: metrics.users.byTier.free, color: "#6B7280" },
    { name: "Pro", value: metrics.users.byTier.pro, color: "#FBBF24" },
    { name: "Enterprise", value: metrics.users.byTier.enterprise, color: "#A855F7" },
  ]

  // Prepare difficulty distribution
  const difficultyDistribution = Object.entries(metrics.sessions.byDifficulty).map(
    ([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: name === "easy" ? "#3fb883" : name === "medium" ? "#FBBF24" : "#EF4444",
    })
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        title="Dashboard Overview"
        subtitle="Real-time platform analytics and metrics"
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Users"
          value={metrics.users.total}
          subtitle={`${metrics.users.byTier.pro} Pro (${conversionRate}%)`}
          icon={Users}
          sparklineData={metrics.timeSeries?.users.slice(-7).map((u) => u.total)}
          sparklineColor="#c4703f"
        />
        <MetricCard
          title="MRR"
          // The API returns null here for an admin role without VIEW_REVENUE.
          // "Hidden" is the honest render; $0 would read as a real number.
          value={
            metrics.revenue.mrr === null ? "Hidden" : `$${metrics.revenue.mrr.toLocaleString()}`
          }
          subtitle={
            metrics.revenue.arr === null
              ? "Requires the revenue permission"
              : `ARR: $${metrics.revenue.arr.toLocaleString()}`
          }
          icon={DollarSign}
          valueColor="text-green-400"
          iconColor="text-green-400"
          sparklineData={metrics.timeSeries?.revenue.slice(-7).map((r) => r.mrr)}
          sparklineColor="#3fb883"
        />
        <MetricCard
          title="Sessions"
          value={metrics.sessions.total}
          subtitle={`${completionRate}% completion rate`}
          icon={Terminal}
          sparklineData={metrics.timeSeries?.sessions.slice(-7).map((s) => s.total)}
          sparklineColor="#FBBF24"
        />
        <MetricCard
          title="Avg Score"
          value={`${metrics.sessions.avgPerformanceScore}%`}
          subtitle="Across all sessions"
          icon={TrendingUp}
          valueColor="text-[#c4703f]"
        />
        {metrics.wcsr && (
          <MetricCard
            title="Weekly Scored Rounds"
            value={metrics.wcsr.currentWeek}
            // wcsr.total is scoped to the selected range, so calling it "all-time"
            // put a range-dependent figure directly beside the genuine all-time card
            // below, under the same label and with a different number.
            subtitle={`North Star · ${metrics.wcsr.total.toLocaleString()} in ${timeRange.toUpperCase()}`}
            icon={TrendingUp}
            valueColor="text-[#c4703f]"
            iconColor="text-[#c4703f]"
            sparklineData={metrics.wcsr.series.slice(-8).map((w) => w.count)}
            sparklineColor="#c4703f"
          />
        )}
        {typeof metrics.scoredRoundsAllTime === "number" && (
          <MetricCard
            title="Scored Rounds (All-Time)"
            value={metrics.scoredRoundsAllTime}
            subtitle="Measured aggregate count"
            icon={TrendingUp}
            valueColor="text-[#c4703f]"
            iconColor="text-[#c4703f]"
          />
        )}
      </div>

      {/* Registered vs guest sessions (honest split) + scored rounds */}
      {metrics.sessions.registered !== undefined && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Registered sessions", value: metrics.sessions.registered ?? 0 },
            { label: "Guest sessions", value: metrics.sessions.guest ?? 0 },
            { label: "Registered completed", value: metrics.sessions.registeredCompleted ?? 0 },
            { label: "Scored rounds", value: metrics.sessions.scoredCompleted ?? 0, highlight: true },
          ].map((s) => (
            <Card
              key={s.label}
              className={`border-gray-800 ${s.highlight ? "bg-[#c4703f]/10 border-[#c4703f]/30" : "bg-gray-900/50"}`}
            >
              <CardContent className="p-4">
                <div
                  className={`text-xl font-bold ${s.highlight ? "text-[#c4703f]" : "text-white"}`}
                >
                  {s.value.toLocaleString()}
                </div>
                <p className="text-xs text-gray-400 mt-1">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        {metrics.timeSeries?.users && metrics.timeSeries.users.length > 0 && (
          <TimeSeriesChart
            title="User Growth"
            subtitle={timeRange.toUpperCase()}
            data={metrics.timeSeries.users}
            series={[
              { key: "free", name: "Free", color: "#6B7280" },
              { key: "pro", name: "Pro", color: "#FBBF24" },
              { key: "enterprise", name: "Enterprise", color: "#A855F7" },
            ]}
            stacked
            icon={Users}
          />
        )}

        {/* Revenue Chart */}
        {metrics.timeSeries?.revenue && metrics.timeSeries.revenue.length > 0 && (
          <TimeSeriesChart
            title="Revenue Trend"
            subtitle="MRR over time"
            data={metrics.timeSeries.revenue}
            series={[{ key: "mrr", name: "MRR", color: "#3fb883" }]}
            icon={DollarSign}
            valueFormatter={(v) => `$${v.toLocaleString()}`}
          />
        )}
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversion Funnel */}
        {funnel && (
          <div className="lg:col-span-2">
            <FunnelChart
              title="Conversion Funnel"
              subtitle={timeRange.toUpperCase()}
              stages={funnel.stages}
              icon={TrendingUp}
            />
          </div>
        )}

        {/* Tier Distribution */}
        <DistributionChart
          title="User Tiers"
          data={tierDistribution}
          type="pie"
          icon={Crown}
          height={280}
        />
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sessions Chart */}
        {metrics.timeSeries?.sessions && metrics.timeSeries.sessions.length > 0 && (
          <div className="lg:col-span-2">
            <TimeSeriesChart
              title="Session Activity"
              subtitle="Sessions started vs completed"
              data={metrics.timeSeries.sessions}
              series={[
                { key: "total", name: "Started", color: "#c4703f" },
                { key: "completed", name: "Completed", color: "#3fb883" },
              ]}
              icon={Activity}
            />
          </div>
        )}

        {/* Difficulty Distribution */}
        {difficultyDistribution.length > 0 && (
          <DistributionChart
            title="Session Difficulty"
            data={difficultyDistribution}
            type="bar"
            icon={Zap}
            height={280}
          />
        )}
      </div>

      {/* Code Execution Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-[#c4703f]" />
              Code Executions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Total Executions</span>
                <span className="text-2xl font-bold text-white">
                  {metrics.analytics.codeExecutions.total.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Passed</span>
                <span className="text-xl font-semibold text-green-400">
                  {metrics.analytics.codeExecutions.passed.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Pass Rate</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-400 rounded-full"
                      style={{ width: `${metrics.analytics.codeExecutions.passRate}%` }}
                    />
                  </div>
                  <span className="text-[#c4703f] font-semibold">
                    {metrics.analytics.codeExecutions.passRate}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Event Types */}
        <Card className="bg-gray-900/50 border-gray-800 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="h-5 w-5 text-[#c4703f]" />
              Analytics Events ({metrics.analytics.totalEvents.toLocaleString()} total)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(metrics.analytics.byEventType)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 8)
                .map(([eventType, count]) => (
                  <div key={eventType} className="bg-gray-800/50 p-3 rounded-lg">
                    <div className="text-xl font-bold text-white">{count.toLocaleString()}</div>
                    <p className="text-xs text-gray-400 capitalize truncate">
                      {eventType.replace(/_/g, " ")}
                    </p>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Errors */}
      {metrics.errors.total > 0 && (
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-400" />
              Recent Errors ({metrics.errors.total})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {metrics.errors.recent.slice(0, 5).map((error, index) => (
                <div
                  key={index}
                  className="bg-red-900/10 border border-red-500/20 p-3 rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <Badge className="bg-red-600/20 text-red-400 border-red-600/30">
                      {error.errorType || "Error"}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {new Date(error.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-red-300 mt-2 line-clamp-2">
                    {error.errorMessage || "Unknown error"}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
