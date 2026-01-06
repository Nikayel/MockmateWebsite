"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TimeSeriesChart } from "@/components/admin/charts"
import { AlertCircle, RefreshCw, ExternalLink, Bug, AlertTriangle } from "lucide-react"
import { logger } from "@/lib/logger"

interface ErrorEvent {
  timestamp: string
  errorType?: string
  errorMessage?: string
  page?: string
  userId?: string
}

export default function ErrorsPage() {
  const { firebaseUser } = useAuth()
  const [errors, setErrors] = useState<ErrorEvent[]>([])
  const [errorStats, setErrorStats] = useState<{
    total: number
    byType: Record<string, number>
    trend: Array<{ date: string; count: number }>
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [timeRange, setTimeRange] = useState("7d")

  const loadErrors = useCallback(async (showRefreshing = false) => {
    if (!firebaseUser) return

    if (showRefreshing) setRefreshing(true)

    try {
      const token = await firebaseUser.getIdToken()
      const response = await fetch(`/api/admin/analytics?timeRange=${timeRange}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.metrics) {
          setErrors(data.metrics.errors.recent || [])

          // Group errors by date for trend
          const errorsByDate: Record<string, number> = {}
          data.metrics.errors.recent.forEach((err: ErrorEvent) => {
            if (err.timestamp) {
              const date = new Date(err.timestamp).toISOString().split("T")[0]
              errorsByDate[date] = (errorsByDate[date] || 0) + 1
            }
          })

          // Group errors by type
          const errorsByType: Record<string, number> = {}
          data.metrics.errors.recent.forEach((err: ErrorEvent) => {
            const type = err.errorType || "Unknown"
            errorsByType[type] = (errorsByType[type] || 0) + 1
          })

          setErrorStats({
            total: data.metrics.errors.total,
            byType: errorsByType,
            trend: Object.entries(errorsByDate)
              .map(([date, count]) => ({ date, count }))
              .sort((a, b) => a.date.localeCompare(b.date)),
          })
        }
      }
    } catch (error) {
      logger.error("Error loading admin errors", { error, timeRange })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [firebaseUser, timeRange])

  useEffect(() => {
    loadErrors()
  }, [loadErrors])

  const getErrorSeverity = (errorType?: string): "critical" | "warning" | "info" => {
    if (!errorType) return "info"
    const lower = errorType.toLowerCase()
    if (lower.includes("critical") || lower.includes("fatal") || lower.includes("crash")) {
      return "critical"
    }
    if (lower.includes("warning") || lower.includes("warn")) {
      return "warning"
    }
    return "info"
  }

  const getSeverityColor = (severity: "critical" | "warning" | "info") => {
    switch (severity) {
      case "critical":
        return "bg-red-600/20 text-red-400 border-red-600/30"
      case "warning":
        return "bg-yellow-600/20 text-yellow-400 border-yellow-600/30"
      default:
        return "bg-gray-600/20 text-gray-400 border-gray-600/30"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00d9ff]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white">Error Monitoring</h1>
          <p className="text-gray-400 mt-1">Track and analyze application errors</p>
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
            onClick={() => loadErrors(true)}
            disabled={refreshing}
            variant="outline"
            size="sm"
            className="border-gray-700 text-gray-400 hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gray-900/50 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-500/20 rounded-lg">
                <AlertCircle className="h-6 w-6 text-red-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{errorStats?.total || 0}</p>
                <p className="text-sm text-gray-400">Total Errors</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-500/20 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-yellow-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">
                  {Object.keys(errorStats?.byType || {}).length}
                </p>
                <p className="text-sm text-gray-400">Error Types</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800 md:col-span-2">
          <CardContent className="p-6">
            <p className="text-sm text-gray-400 mb-3">Errors by Type</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(errorStats?.byType || {})
                .sort(([, a], [, b]) => b - a)
                .slice(0, 6)
                .map(([type, count]) => (
                  <Badge
                    key={type}
                    className={getSeverityColor(getErrorSeverity(type))}
                  >
                    {type}: {count}
                  </Badge>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Trend */}
      {errorStats?.trend && errorStats.trend.length > 0 && (
        <TimeSeriesChart
          title="Error Trend"
          subtitle="Errors over time"
          data={errorStats.trend}
          series={[{ key: "count", name: "Errors", color: "#EF4444" }]}
          icon={Bug}
        />
      )}

      {/* Sentry Integration CTA */}
      <Card className="bg-purple-900/20 border-purple-500/30">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Bug className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold">Enhanced Error Tracking</h3>
                <p className="text-purple-300/70 text-sm">
                  Connect Sentry for stack traces, source maps, and release tracking
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-purple-400 text-sm">
              <span>Set <code className="bg-purple-900/30 px-1 rounded">SENTRY_DSN</code> to enable</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error List */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-400" />
            Recent Errors
          </CardTitle>
        </CardHeader>
        <CardContent>
          {errors.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
              <p className="text-green-400 font-medium">No errors recorded</p>
              <p className="text-gray-500 text-sm mt-1">Your application is running smoothly</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {errors.map((error, index) => {
                const severity = getErrorSeverity(error.errorType)
                return (
                  <div
                    key={index}
                    className="bg-gray-800/50 border border-gray-700 p-4 rounded-lg hover:border-gray-600 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge className={getSeverityColor(severity)}>
                          {error.errorType || "Error"}
                        </Badge>
                        {error.page && (
                          <span className="text-xs text-gray-500">
                            on {error.page}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(error.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-sm text-gray-300 font-mono break-all">
                      {error.errorMessage || "No message available"}
                    </p>

                    {error.userId && (
                      <p className="text-xs text-gray-500 mt-2">
                        User: {error.userId.substring(0, 12)}...
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
