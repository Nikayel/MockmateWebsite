"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MetricCard, TimeSeriesChart, DistributionChart } from "@/components/admin/charts"
import { PageHeader, MetricsGridSkeleton, ChartSkeleton } from "@/components/admin/shared"
import { Terminal, CheckCircle, Clock, Zap, RefreshCw, TrendingUp } from "lucide-react"
import { logger } from "@/lib/logger"

export default function SessionsPage() {
  const { firebaseUser } = useAuth()
  const [metrics, setMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState("30d")

  const loadData = useCallback(async () => {
    if (!firebaseUser) return

    try {
      const token = await firebaseUser.getIdToken()
      const response = await fetch(`/api/admin/analytics?timeRange=${timeRange}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setMetrics(data.metrics)
        }
      }
    } catch (error) {
      logger.error("Error loading session data", { error, timeRange })
    } finally {
      setLoading(false)
    }
  }, [firebaseUser, timeRange])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading) {
    return (
      <div className="space-y-8">
        <PageHeader title="Sessions" subtitle="Interview session analytics" />
        <MetricsGridSkeleton count={4} />
        <ChartSkeleton height={280} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton height={280} />
          <ChartSkeleton height={280} />
        </div>
      </div>
    )
  }

  const completionRate = metrics && metrics.sessions.total > 0
    ? ((metrics.sessions.completed / metrics.sessions.total) * 100).toFixed(1)
    : "0"

  const typeDistribution = metrics
    ? Object.entries(metrics.sessions.byType).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, " "),
        value: value as number,
      }))
    : []

  const difficultyDistribution = metrics
    ? Object.entries(metrics.sessions.byDifficulty).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value: value as number,
        color: name === "easy" ? "#3fb883" : name === "medium" ? "#FBBF24" : "#EF4444",
      }))
    : []

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        title="Sessions"
        subtitle="Interview session analytics"
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        onRefresh={loadData}
      />

      {/* Key Metrics */}
      {metrics && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Sessions"
              value={metrics.sessions.total}
              icon={Terminal}
              sparklineData={metrics.timeSeries?.sessions.slice(-7).map((s: any) => s.total)}
              sparklineColor="#c4703f"
            />
            <MetricCard
              title="Completed"
              value={metrics.sessions.completed}
              subtitle={`${completionRate}% completion rate`}
              icon={CheckCircle}
              iconColor="text-green-400"
              valueColor="text-green-400"
            />
            <MetricCard
              title="In Progress"
              value={metrics.sessions.inProgress}
              icon={Clock}
              iconColor="text-yellow-400"
            />
            <MetricCard
              title="Avg Score"
              value={`${metrics.sessions.avgPerformanceScore}%`}
              icon={TrendingUp}
              valueColor="text-[#c4703f]"
            />
          </div>

          {/* Session Activity Chart */}
          {metrics.timeSeries?.sessions && (
            <TimeSeriesChart
              title="Session Activity"
              subtitle="Sessions started vs completed"
              data={metrics.timeSeries.sessions}
              series={[
                { key: "total", name: "Started", color: "#c4703f" },
                { key: "completed", name: "Completed", color: "#3fb883" },
              ]}
              icon={Terminal}
            />
          )}

          {/* Distributions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {typeDistribution.length > 0 && (
              <DistributionChart
                title="Session Types"
                data={typeDistribution}
                type="horizontal-bar"
                icon={Terminal}
              />
            )}

            {difficultyDistribution.length > 0 && (
              <DistributionChart
                title="Difficulty Distribution"
                data={difficultyDistribution}
                type="bar"
                icon={Zap}
              />
            )}
          </div>

          {/* Code Execution Stats */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Zap className="h-5 w-5 text-[#c4703f]" />
                Code Execution Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                  <div className="text-3xl font-bold text-white">
                    {metrics.analytics.codeExecutions.total.toLocaleString()}
                  </div>
                  <p className="text-gray-400 text-sm mt-1">Total Executions</p>
                </div>
                <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                  <div className="text-3xl font-bold text-green-400">
                    {metrics.analytics.codeExecutions.passed.toLocaleString()}
                  </div>
                  <p className="text-gray-400 text-sm mt-1">Passed</p>
                </div>
                <div className="text-center p-4 bg-gray-800/50 rounded-lg">
                  <div className="text-3xl font-bold text-[#c4703f]">
                    {metrics.analytics.codeExecutions.passRate}%
                  </div>
                  <p className="text-gray-400 text-sm mt-1">Pass Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
