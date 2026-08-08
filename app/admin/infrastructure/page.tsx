"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MetricCard } from "@/components/admin/charts"
import {
  Shield,
  AlertTriangle,
  Database,
  RefreshCw,
  Loader2,
  AlertCircle,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  Unplug,
} from "lucide-react"

interface CostAnomalyData {
  stats: {
    total: number
    unacknowledged: number
    byType: Record<string, number>
    bySeverity: { warning: number; critical: number }
    last24Hours: number
    estimatedLoss: number
  }
  recentAnomalies: Array<{
    id: string
    type: string
    severity: string
    description: string
    cost: number
    threshold: number
    context: Record<string, unknown>
    timestamp: string
    acknowledged: boolean
  }>
}

/**
 * A panel for a metric that has no data source.
 *
 * This exists because the alternative is worse. Rate limiting and query
 * performance both used to render "0 blocked, 0.00% block rate" and "0 slow
 * queries" in green, fed by collections that nothing has ever written. A zero
 * next to a green threshold reads as a healthy system, so the panel was actively
 * misinforming the person checking whether the platform was under attack.
 */
function NotCollectedPanel({
  title,
  icon: Icon,
  reason,
  toRestore,
}: {
  title: string
  icon: typeof Database
  reason: string
  toRestore: string
}) {
  return (
    <div className="space-y-6">
      <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
        <Icon className="h-5 w-5 text-gray-500" />
        {title}
      </h2>
      <Card className="border-gray-800 bg-gray-900/50">
        <CardContent className="flex items-start gap-4 p-6">
          <div className="rounded-lg bg-gray-500/20 p-3">
            <Unplug className="h-6 w-6 text-gray-400" />
          </div>
          <div className="space-y-2">
            <p className="font-medium text-gray-300">Not collected</p>
            <p className="text-sm text-gray-400">{reason}</p>
            <p className="text-sm text-gray-500">{toRestore}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function InfrastructurePage() {
  const { firebaseUser } = useAuth()
  const [costAnomalyData, setCostAnomalyData] = useState<CostAnomalyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [acknowledging, setAcknowledging] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!firebaseUser) return

    setRefreshing(true)
    setError(null)

    try {
      const token = await firebaseUser.getIdToken()

      // Cost anomalies are the one panel on this page with a live writer:
      // lib/ai-providers records every request cost and lib/usage-tracking runs
      // the hourly sweep. The rate limit and query performance endpoints are no
      // longer called from here because nothing fills the collections they read.
      const response = await fetch("/api/admin/cost-anomalies", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const cost = await response.json()

      if (cost.success) setCostAnomalyData(cost.data)
      else setError(cost.error || "Failed to load cost anomalies")
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to load data")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [firebaseUser])

  const acknowledgeAnomaly = async (anomalyId: string) => {
    if (!firebaseUser) return

    setAcknowledging(anomalyId)
    try {
      const token = await firebaseUser.getIdToken()
      await fetch("/api/admin/cost-anomalies", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "acknowledge", anomalyId }),
      })
      await loadData()
    } catch (error) {
      console.error("Failed to acknowledge anomaly:", error)
    } finally {
      setAcknowledging(null)
    }
  }

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-[#c4703f]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <p className="text-red-400">{error}</p>
        <Button onClick={() => loadData()} variant="outline">
          Retry
        </Button>
      </div>
    )
  }

  const hasActiveAlerts = (costAnomalyData?.stats.unacknowledged || 0) > 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-white">Infrastructure Health</h1>
          <p className="mt-1 text-gray-400">
            Cost monitoring, plus an honest account of what is not being measured
          </p>
        </div>

        <div className="flex items-center gap-3">
          {hasActiveAlerts && (
            <Badge variant="destructive" className="animate-pulse">
              <AlertTriangle className="mr-1 h-3 w-3" />
              Active Alerts
            </Badge>
          )}
          <Button
            onClick={loadData}
            variant="outline"
            size="sm"
            disabled={refreshing}
            className="border-gray-700 text-gray-400 hover:text-white"
          >
            {refreshing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Cost Anomalies Section */}
      <div className="space-y-6">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
          <DollarSign className="h-5 w-5 text-yellow-400" />
          Cost Anomalies
        </h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Anomalies"
            value={costAnomalyData?.stats.total || 0}
            subtitle="All time"
            icon={AlertTriangle}
          />
          <MetricCard
            title="Unacknowledged"
            value={costAnomalyData?.stats.unacknowledged || 0}
            subtitle="Needs review"
            icon={AlertCircle}
            valueColor={
              (costAnomalyData?.stats.unacknowledged || 0) > 0 ? "text-red-400" : "text-green-400"
            }
          />
          <MetricCard
            title="Last 24 Hours"
            value={costAnomalyData?.stats.last24Hours || 0}
            subtitle="Recent anomalies"
            icon={Clock}
          />
          <MetricCard
            title="Est. Excess Cost"
            value={`$${(costAnomalyData?.stats.estimatedLoss || 0).toFixed(2)}`}
            subtitle="Above thresholds"
            icon={DollarSign}
            valueColor="text-red-400"
          />
        </div>

        {/* Severity Breakdown */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-yellow-500/30 bg-yellow-900/20">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-yellow-400">Warnings</p>
                <p className="text-3xl font-bold text-yellow-400">
                  {costAnomalyData?.stats.bySeverity.warning || 0}
                </p>
              </div>
              <AlertTriangle className="h-10 w-10 text-yellow-500/50" />
            </CardContent>
          </Card>
          <Card className="border-red-500/30 bg-red-900/20">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-red-400">Critical</p>
                <p className="text-3xl font-bold text-red-400">
                  {costAnomalyData?.stats.bySeverity.critical || 0}
                </p>
              </div>
              <XCircle className="h-10 w-10 text-red-500/50" />
            </CardContent>
          </Card>
        </div>

        {/* Recent Anomalies */}
        <Card className="border-gray-800 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="text-white">Recent Anomalies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {costAnomalyData?.recentAnomalies.slice(0, 10).map((anomaly) => (
                <div
                  key={anomaly.id}
                  className={`rounded-lg border p-3 ${
                    anomaly.severity === "critical"
                      ? "border-red-500/30 bg-red-900/20"
                      : "border-yellow-500/30 bg-yellow-900/20"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <Badge variant={anomaly.severity === "critical" ? "destructive" : "default"}>
                          {anomaly.severity}
                        </Badge>
                        <Badge variant="outline">{anomaly.type}</Badge>
                        {anomaly.acknowledged && (
                          <Badge variant="outline" className="border-green-500 text-green-400">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Acknowledged
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-300">{anomaly.description}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        Cost: ${anomaly.cost.toFixed(4)} (threshold: ${anomaly.threshold.toFixed(2)})
                        {" • "}
                        {new Date(anomaly.timestamp).toLocaleString()}
                      </p>
                    </div>
                    {!anomaly.acknowledged && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => acknowledgeAnomaly(anomaly.id)}
                        disabled={acknowledging === anomaly.id}
                      >
                        {acknowledging === anomaly.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Acknowledge"
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {(!costAnomalyData?.recentAnomalies ||
                costAnomalyData.recentAnomalies.length === 0) && (
                <p className="py-8 text-center text-gray-500">
                  No anomalies recorded in this window.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <NotCollectedPanel
        title="Rate Limiting"
        icon={Shield}
        reason="Nothing records rate limit decisions. The limiter in lib/rate-limit allows and blocks requests without writing anywhere, so block rate, top offenders and the DDoS and brute force indicators have no data behind them."
        toRestore="This panel showed a 0.00% block rate in green whatever was happening. Restoring it means recording decisions from the limiter itself, which is worth pricing first because it sits on the hot path of every API request."
      />

      <NotCollectedPanel
        title="Database Performance"
        icon={Database}
        reason="Firestore calls are not timed. The wrapper that was supposed to time them was never wrapped around a single query, so total queries, average duration and slow query rate have no data behind them."
        toRestore="This panel showed 0 slow queries in green, which looks the same as a perfectly tuned database. Restoring it means timing real call sites, ideally through one shared Firestore accessor rather than a wrapper every caller has to remember."
      />
    </div>
  )
}
