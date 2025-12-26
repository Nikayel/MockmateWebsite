"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MetricCard, TimeSeriesChart, DistributionChart } from "@/components/admin/charts"
import { Terminal, CheckCircle, Clock, Zap, RefreshCw, TrendingUp } from "lucide-react"

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
      console.error("Error loading session data:", error)
    } finally {
      setLoading(false)
    }
  }, [firebaseUser, timeRange])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00d9ff]"></div>
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
        color: name === "easy" ? "#00ff88" : name === "medium" ? "#FBBF24" : "#EF4444",
      }))
    : []

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white">Sessions</h1>
          <p className="text-gray-400 mt-1">Interview session analytics</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-gray-900 rounded-lg p-1">
            {["7d", "30d", "90d", "all"].map((range) => (
              <Button
                key={range}
                size="sm"
                variant={timeRange === range ? "default" : "ghost"}
                onClick={() => setTimeRange(range)}
                className={
                  timeRange === range
                    ? "bg-[#00d9ff] text-black hover:bg-[#00d9ff]/80"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }
              >
                {range === "all" ? "All" : range.toUpperCase()}
              </Button>
            ))}
          </div>

          <Button
            onClick={loadData}
            variant="outline"
            size="sm"
            className="border-gray-700 text-gray-400 hover:text-white"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {metrics && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Sessions"
              value={metrics.sessions.total}
              icon={Terminal}
              sparklineData={metrics.timeSeries?.sessions.slice(-7).map((s: any) => s.total)}
              sparklineColor="#00d9ff"
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
              valueColor="text-[#00d9ff]"
            />
          </div>

          {/* Session Activity Chart */}
          {metrics.timeSeries?.sessions && (
            <TimeSeriesChart
              title="Session Activity"
              subtitle="Sessions started vs completed"
              data={metrics.timeSeries.sessions}
              series={[
                { key: "total", name: "Started", color: "#00d9ff" },
                { key: "completed", name: "Completed", color: "#00ff88" },
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
                <Zap className="h-5 w-5 text-[#00d9ff]" />
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
                  <div className="text-3xl font-bold text-[#00d9ff]">
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
