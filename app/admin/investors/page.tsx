"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MetricCard, TimeSeriesChart, CohortHeatmap } from "@/components/admin/charts"
import {
  LineChart,
  DollarSign,
  Users,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Download,
  Target,
  BarChart3,
  Percent,
  Clock,
  AlertCircle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import { logger } from "@/lib/logger"

interface InvestorMetrics {
  revenue: {
    mrr: number
    arr: number
    mrrGrowth: number
    newMrr: number
    churnedMrr: number
    netNewMrr: number
  }
  users: {
    total: number
    active: number
    free: number
    pro: number
    enterprise: number
    paid: number
    conversionRate: number
    newInPeriod: number
  }
  unitEconomics: {
    arpu: number
    ltv: number
    cac: number
    ltvCacRatio: number | string
    paybackPeriodMonths: number
  }
  retention: {
    churnRate: number
    nrr: number
    quickRatio: number | string
    avgSessionsPerUser: number
  }
  engagement: {
    totalSessions: number
    completedSessions: number
    completionRate: number
  }
  cohorts: Array<{
    cohort: string
    users: number
    retention: number[]
    ltv: number
    churnRate: number
  }>
  growthTimeline: Array<{
    date: string
    users: number
    mrr: number
    sessions: number
  }>
  benchmarks: {
    churnRate: { good: number; avg: number; yours: number }
    nrr: { good: number; avg: number; yours: number }
    ltvCacRatio: { good: number; avg: number; yours: number }
    quickRatio: { good: number; avg: number; yours: number }
  }
}

function BenchmarkIndicator({
  label,
  good,
  avg,
  yours,
  higherIsBetter = true,
}: {
  label: string
  good: number
  avg: number
  yours: number
  higherIsBetter?: boolean
}) {
  const isGood = higherIsBetter ? yours >= good : yours <= good
  const isAvg = higherIsBetter ? yours >= avg : yours <= avg
  const status = isGood ? "good" : isAvg ? "average" : "needs-work"

  const colors = {
    good: "text-green-400",
    average: "text-yellow-400",
    "needs-work": "text-red-400",
  }

  const bgColors = {
    good: "bg-green-500/20",
    average: "bg-yellow-500/20",
    "needs-work": "bg-red-500/20",
  }

  return (
    <div className="flex items-center justify-between rounded-lg bg-gray-800/50 p-3">
      <div>
        <p className="text-sm text-gray-400">{label}</p>
        <div className="mt-1 flex items-center gap-2">
          <span className={`text-lg font-bold ${colors[status]}`}>
            {typeof yours === "number" ? yours.toFixed(1) : yours}
            {label.includes("%") || label.includes("Rate") || label === "NRR" ? "%" : ""}
          </span>
          {status === "good" && <CheckCircle className="h-4 w-4 text-green-400" />}
          {status === "needs-work" && <AlertCircle className="h-4 w-4 text-red-400" />}
        </div>
      </div>
      <div className={`rounded px-2 py-1 ${bgColors[status]}`}>
        <span className={`text-xs ${colors[status]}`}>
          {status === "good" ? "Above Target" : status === "average" ? "On Track" : "Below Target"}
        </span>
      </div>
    </div>
  )
}

export default function InvestorDashboard() {
  const { firebaseUser } = useAuth()
  const [metrics, setMetrics] = useState<InvestorMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [timeRange, setTimeRange] = useState("90d")

  const loadMetrics = useCallback(
    async (showRefreshing = false) => {
      if (!firebaseUser) return

      if (showRefreshing) setRefreshing(true)

      try {
        const token = await firebaseUser.getIdToken()
        const response = await fetch(`/api/admin/investors?timeRange=${timeRange}`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setMetrics(data.metrics)
          }
        }
      } catch (error) {
        logger.error("Error loading investor metrics", { error })
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [firebaseUser, timeRange]
  )

  useEffect(() => {
    loadMetrics()
  }, [loadMetrics])

  const handleExport = () => {
    if (!metrics) return

    const exportData = {
      generatedAt: new Date().toISOString(),
      timeRange,
      ...metrics,
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `investor-metrics-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#00d9ff]"></div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <Card className="border-red-500/30 bg-red-900/20">
        <CardContent className="p-8 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-400" />
          <p className="font-medium text-red-400">Failed to load investor metrics</p>
          <Button onClick={() => loadMetrics(true)} className="mt-4" variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading flex items-center gap-3 text-3xl font-bold text-white">
            <LineChart className="h-8 w-8 text-[#00d9ff]" />
            Investor Dashboard
          </h1>
          <p className="mt-1 text-gray-400">
            SaaS metrics and KPIs for board reporting and investor updates
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex gap-1 rounded-lg bg-gray-900 p-1">
            {["30d", "90d", "180d", "365d"].map((range) => (
              <Button
                key={range}
                size="sm"
                variant={timeRange === range ? "default" : "ghost"}
                onClick={() => setTimeRange(range)}
                className={
                  timeRange === range
                    ? "bg-[#00d9ff] text-black hover:bg-[#00d9ff]/80"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }
              >
                {range.toUpperCase()}
              </Button>
            ))}
          </div>

          <Button
            onClick={handleExport}
            variant="outline"
            size="sm"
            className="border-gray-700 text-gray-400 hover:text-white"
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>

          <Button
            onClick={() => loadMetrics(true)}
            disabled={refreshing}
            variant="outline"
            size="sm"
            className="border-gray-700 text-gray-400 hover:text-white"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Revenue Hero Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <Card className="border-[#00d9ff]/30 bg-gradient-to-br from-[#00d9ff]/10 to-[#00ff88]/10 lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Monthly Recurring Revenue</p>
                <p className="mt-2 text-4xl font-bold text-white">
                  ${metrics.revenue.mrr.toLocaleString()}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  {metrics.revenue.mrrGrowth >= 0 ? (
                    <ArrowUpRight className="h-4 w-4 text-green-400" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-400" />
                  )}
                  <span
                    className={metrics.revenue.mrrGrowth >= 0 ? "text-green-400" : "text-red-400"}
                  >
                    {metrics.revenue.mrrGrowth >= 0 ? "+" : ""}
                    {metrics.revenue.mrrGrowth.toFixed(1)}%
                  </span>
                  <span className="text-sm text-gray-500">vs previous period</span>
                </div>
              </div>
              <div className="rounded-full bg-[#00d9ff]/20 p-4">
                <DollarSign className="h-8 w-8 text-[#00d9ff]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-800 bg-gray-900/50">
          <CardContent className="p-6">
            <p className="text-sm text-gray-400">Annual Recurring Revenue</p>
            <p className="mt-2 text-3xl font-bold text-white">
              ${metrics.revenue.arr.toLocaleString()}
            </p>
            <p className="mt-2 text-sm text-gray-500">MRR × 12</p>
          </CardContent>
        </Card>

        <Card className="border-gray-800 bg-gray-900/50">
          <CardContent className="p-6">
            <p className="text-sm text-gray-400">Net New MRR</p>
            <p
              className={`mt-2 text-3xl font-bold ${metrics.revenue.netNewMrr >= 0 ? "text-green-400" : "text-red-400"}`}
            >
              {metrics.revenue.netNewMrr >= 0 ? "+" : ""}$
              {metrics.revenue.netNewMrr.toLocaleString()}
            </p>
            <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
              <span className="text-green-400">
                +${metrics.revenue.newMrr.toLocaleString()} new
              </span>
              <span>-</span>
              <span className="text-red-400">
                -${metrics.revenue.churnedMrr.toLocaleString()} churned
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unit Economics */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          title="LTV"
          value={`$${metrics.unitEconomics.ltv.toLocaleString()}`}
          subtitle="Customer Lifetime Value"
          icon={TrendingUp}
          valueColor="text-[#00ff88]"
          iconColor="text-[#00ff88]"
        />
        <MetricCard
          title="CAC"
          value={`$${metrics.unitEconomics.cac.toLocaleString()}`}
          subtitle="Customer Acq. Cost"
          icon={Target}
          valueColor="text-yellow-400"
          iconColor="text-yellow-400"
        />
        <MetricCard
          title="LTV:CAC"
          value={String(metrics.unitEconomics.ltvCacRatio)}
          subtitle="Target: >3:1"
          icon={BarChart3}
          valueColor={
            Number(metrics.unitEconomics.ltvCacRatio) >= 3 ? "text-green-400" : "text-yellow-400"
          }
        />
        <MetricCard
          title="Payback"
          value={`${metrics.unitEconomics.paybackPeriodMonths} mo`}
          subtitle="CAC Payback Period"
          icon={Clock}
        />
        <MetricCard
          title="ARPU"
          value={`$${metrics.unitEconomics.arpu}`}
          subtitle="Avg Revenue/User"
          icon={Users}
        />
      </div>

      {/* Growth Chart */}
      {metrics.growthTimeline && metrics.growthTimeline.length > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <TimeSeriesChart
            title="User Growth"
            subtitle="Total users over time"
            data={metrics.growthTimeline}
            series={[{ key: "users", name: "Users", color: "#00d9ff" }]}
            icon={Users}
          />
          <TimeSeriesChart
            title="MRR Growth"
            subtitle="Monthly recurring revenue"
            data={metrics.growthTimeline}
            series={[{ key: "mrr", name: "MRR", color: "#00ff88" }]}
            icon={DollarSign}
            valueFormatter={(v) => `$${v.toLocaleString()}`}
          />
        </div>
      )}

      {/* Retention & Health Metrics */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Key Ratios */}
        <Card className="border-gray-800 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Percent className="h-5 w-5 text-[#00d9ff]" />
              Health Metrics vs Benchmarks
            </CardTitle>
            <CardDescription className="text-gray-400">
              Compare your metrics against SaaS industry standards
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <BenchmarkIndicator
              label="Monthly Churn Rate"
              good={metrics.benchmarks.churnRate.good}
              avg={metrics.benchmarks.churnRate.avg}
              yours={metrics.benchmarks.churnRate.yours}
              higherIsBetter={false}
            />
            <BenchmarkIndicator
              label="NRR (Net Revenue Retention)"
              good={metrics.benchmarks.nrr.good}
              avg={metrics.benchmarks.nrr.avg}
              yours={metrics.benchmarks.nrr.yours}
              higherIsBetter={true}
            />
            <BenchmarkIndicator
              label="LTV:CAC Ratio"
              good={metrics.benchmarks.ltvCacRatio.good}
              avg={metrics.benchmarks.ltvCacRatio.avg}
              yours={metrics.benchmarks.ltvCacRatio.yours}
              higherIsBetter={true}
            />
            <BenchmarkIndicator
              label="Quick Ratio"
              good={metrics.benchmarks.quickRatio.good}
              avg={metrics.benchmarks.quickRatio.avg}
              yours={metrics.benchmarks.quickRatio.yours}
              higherIsBetter={true}
            />
          </CardContent>
        </Card>

        {/* User Breakdown */}
        <Card className="border-gray-800 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Users className="h-5 w-5 text-[#00d9ff]" />
              User Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-gray-800/50 p-4">
                <p className="text-sm text-gray-400">Total Users</p>
                <p className="text-2xl font-bold text-white">
                  {metrics.users.total.toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg bg-gray-800/50 p-4">
                <p className="text-sm text-gray-400">Paid Users</p>
                <p className="text-2xl font-bold text-[#00ff88]">
                  {metrics.users.paid.toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg bg-gray-800/50 p-4">
                <p className="text-sm text-gray-400">Conversion Rate</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {metrics.users.conversionRate}%
                </p>
              </div>
              <div className="rounded-lg bg-gray-800/50 p-4">
                <p className="text-sm text-gray-400">New This Period</p>
                <p className="text-2xl font-bold text-[#00d9ff]">
                  {metrics.users.newInPeriod.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Free</span>
                <span className="text-white">{metrics.users.free.toLocaleString()}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-700">
                <div
                  className="h-full rounded-full bg-gray-500"
                  style={{ width: `${(metrics.users.free / metrics.users.total) * 100}%` }}
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-yellow-400">Pro</span>
                <span className="text-white">{metrics.users.pro.toLocaleString()}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-700">
                <div
                  className="h-full rounded-full bg-yellow-400"
                  style={{ width: `${(metrics.users.pro / metrics.users.total) * 100}%` }}
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-purple-400">Enterprise</span>
                <span className="text-white">{metrics.users.enterprise.toLocaleString()}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-700">
                <div
                  className="h-full rounded-full bg-purple-400"
                  style={{ width: `${(metrics.users.enterprise / metrics.users.total) * 100}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cohort Analysis */}
      {metrics.cohorts && metrics.cohorts.length > 0 && (
        <Card className="border-gray-800 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <BarChart3 className="h-5 w-5 text-[#00d9ff]" />
              Cohort Analysis
            </CardTitle>
            <CardDescription className="text-gray-400">
              User retention by signup cohort
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="px-4 py-3 text-left text-gray-400">Cohort</th>
                    <th className="px-4 py-3 text-center text-gray-400">Users</th>
                    <th className="px-4 py-3 text-center text-gray-400">Week 1</th>
                    <th className="px-4 py-3 text-center text-gray-400">Week 2</th>
                    <th className="px-4 py-3 text-center text-gray-400">Week 3</th>
                    <th className="px-4 py-3 text-center text-gray-400">Week 4</th>
                    <th className="px-4 py-3 text-right text-gray-400">Churn %</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.cohorts.map((cohort) => (
                    <tr key={cohort.cohort} className="border-b border-gray-800/50">
                      <td className="px-4 py-3 font-medium text-white">{cohort.cohort}</td>
                      <td className="px-4 py-3 text-center text-gray-300">{cohort.users}</td>
                      {[0, 1, 2, 3].map((week) => (
                        <td key={week} className="px-4 py-3 text-center">
                          {cohort.retention[week] !== undefined ? (
                            <span
                              className={`rounded px-2 py-1 ${
                                cohort.retention[week] >= 80
                                  ? "bg-green-500/20 text-green-400"
                                  : cohort.retention[week] >= 50
                                    ? "bg-yellow-500/20 text-yellow-400"
                                    : "bg-red-500/20 text-red-400"
                              }`}
                            >
                              {cohort.retention[week].toFixed(0)}%
                            </span>
                          ) : (
                            <span className="text-gray-600">-</span>
                          )}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right">
                        <span className={cohort.churnRate <= 5 ? "text-green-400" : "text-red-400"}>
                          {cohort.churnRate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Engagement Metrics */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="border-gray-800 bg-gray-900/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[#00d9ff]/20 p-3">
                <BarChart3 className="h-6 w-6 text-[#00d9ff]" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">
                  {metrics.engagement.totalSessions.toLocaleString()}
                </p>
                <p className="text-sm text-gray-400">Total Sessions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-800 bg-gray-900/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-500/20 p-3">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">
                  {metrics.engagement.completedSessions.toLocaleString()}
                </p>
                <p className="text-sm text-gray-400">Completed Sessions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-800 bg-gray-900/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-yellow-500/20 p-3">
                <Percent className="h-6 w-6 text-yellow-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">
                  {metrics.engagement.completionRate}%
                </p>
                <p className="text-sm text-gray-400">Completion Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Info */}
      <Card className="border-purple-500/30 bg-purple-900/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-purple-500/20 p-3">
                <LineChart className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Board Deck Ready</h3>
                <p className="text-sm text-purple-300/70">
                  Export this data as JSON for your investor updates or board presentations
                </p>
              </div>
            </div>
            <Button
              onClick={handleExport}
              variant="outline"
              className="border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
            >
              <Download className="mr-2 h-4 w-4" />
              Export Metrics
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
