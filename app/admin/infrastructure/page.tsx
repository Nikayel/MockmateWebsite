"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
  Ban,
  DollarSign,
  Activity,
  CheckCircle,
  XCircle,
  Zap,
} from "lucide-react"

interface RateLimitData {
  totalRequests: number
  blockedRequests: number
  blockRate: number
  uniqueIdentifiers: number
  byEndpoint: Record<string, { total: number; blocked: number; blockRate: number }>
  topOffenders: Array<{
    identifier: string
    blockedCount: number
    lastBlocked: string
    endpoints: string[]
  }>
  hourlyTrend: Array<{ hour: string; total: number; blocked: number }>
  alerts: {
    highBlockRate: boolean
    ddosIndicator: boolean
    bruteForceIndicator: boolean
  }
}

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
    context: Record<string, any>
    timestamp: string
    acknowledged: boolean
  }>
}

interface QueryPerfData {
  totalQueries: number
  averageDurationMs: number
  slowQueries: number
  slowQueryRate: number
  costlyQueries: number
  byCollection: Record<string, {
    count: number
    avgDurationMs: number
    avgDocumentCount: number
    slowCount: number
  }>
  byOperation: Record<string, { count: number; avgDurationMs: number }>
  slowestQueries: Array<{
    collection: string
    operation: string
    durationMs: number
    documentCount: number
    filters?: string[]
    timestamp: string
  }>
  recommendations: string[]
}

export default function InfrastructurePage() {
  const { firebaseUser } = useAuth()
  const [rateLimitData, setRateLimitData] = useState<RateLimitData | null>(null)
  const [costAnomalyData, setCostAnomalyData] = useState<CostAnomalyData | null>(null)
  const [queryPerfData, setQueryPerfData] = useState<QueryPerfData | null>(null)
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

      const [rateRes, costRes, queryRes] = await Promise.all([
        fetch("/api/admin/rate-limits?hours=24", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/admin/cost-anomalies", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/admin/query-performance?hours=24", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      const [rate, cost, query] = await Promise.all([
        rateRes.json(),
        costRes.json(),
        queryRes.json(),
      ])

      if (rate.success) setRateLimitData(rate.data)
      if (cost.success) setCostAnomalyData(cost.data)
      if (query.success) setQueryPerfData(query.data)
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-[#c4703f]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <p className="text-red-400">{error}</p>
        <Button onClick={() => loadData()} variant="outline">
          Retry
        </Button>
      </div>
    )
  }

  const hasActiveAlerts =
    rateLimitData?.alerts.highBlockRate ||
    rateLimitData?.alerts.ddosIndicator ||
    rateLimitData?.alerts.bruteForceIndicator ||
    (costAnomalyData?.stats.unacknowledged || 0) > 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white">Infrastructure Health</h1>
          <p className="text-gray-400 mt-1">Rate limits, cost monitoring, and database performance</p>
        </div>

        <div className="flex items-center gap-3">
          {hasActiveAlerts && (
            <Badge variant="destructive" className="animate-pulse">
              <AlertTriangle className="h-3 w-3 mr-1" />
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
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Rate Limiting Section */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-400" />
          Rate Limiting (Last 24h)
        </h2>

        {/* Alerts */}
        {(rateLimitData?.alerts.highBlockRate ||
          rateLimitData?.alerts.ddosIndicator ||
          rateLimitData?.alerts.bruteForceIndicator) && (
          <Card className="bg-red-900/20 border-red-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <div>
                  <p className="text-red-400 font-medium">Security Alerts Detected</p>
                  <div className="flex gap-2 mt-1">
                    {rateLimitData?.alerts.highBlockRate && (
                      <Badge variant="destructive">High Block Rate</Badge>
                    )}
                    {rateLimitData?.alerts.ddosIndicator && (
                      <Badge variant="destructive">Possible DDoS</Badge>
                    )}
                    {rateLimitData?.alerts.bruteForceIndicator && (
                      <Badge variant="destructive">Brute Force Attempt</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Requests"
            value={rateLimitData?.totalRequests.toLocaleString() || 0}
            subtitle="Last 24 hours"
            icon={Activity}
          />
          <MetricCard
            title="Blocked Requests"
            value={rateLimitData?.blockedRequests.toLocaleString() || 0}
            subtitle={`${(rateLimitData?.blockRate || 0).toFixed(2)}% block rate`}
            icon={Ban}
            valueColor={(rateLimitData?.blockRate || 0) > 5 ? "text-red-400" : "text-green-400"}
          />
          <MetricCard
            title="Unique IPs"
            value={rateLimitData?.uniqueIdentifiers || 0}
            subtitle="Distinct clients"
            icon={Shield}
          />
          <MetricCard
            title="Top Offenders"
            value={rateLimitData?.topOffenders.length || 0}
            subtitle="IPs with blocks"
            icon={AlertTriangle}
            valueColor={(rateLimitData?.topOffenders.length || 0) > 10 ? "text-yellow-400" : "text-gray-300"}
          />
        </div>

        {/* Rate Limit by Endpoint */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">By Endpoint</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(rateLimitData?.byEndpoint || {}).map(([endpoint, stats]) => (
                <div key={endpoint} className="bg-gray-800/50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 truncate">{endpoint}</p>
                  <p className="text-lg font-bold text-white">{stats.total.toLocaleString()}</p>
                  <p className={`text-xs ${stats.blockRate > 5 ? 'text-red-400' : 'text-gray-500'}`}>
                    {stats.blocked} blocked ({stats.blockRate.toFixed(1)}%)
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Offenders */}
        {rateLimitData?.topOffenders && rateLimitData.topOffenders.length > 0 && (
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Top Offenders</CardTitle>
              <CardDescription>IPs with the most blocked requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-400">
                      <th className="text-left py-2 px-3">IP Address</th>
                      <th className="text-right py-2 px-3">Blocked</th>
                      <th className="text-left py-2 px-3">Endpoints</th>
                      <th className="text-left py-2 px-3">Last Blocked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rateLimitData.topOffenders.slice(0, 10).map((offender) => (
                      <tr key={offender.identifier} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                        <td className="py-2 px-3 font-mono text-gray-300">{offender.identifier}</td>
                        <td className="py-2 px-3 text-right text-red-400 font-bold">{offender.blockedCount}</td>
                        <td className="py-2 px-3">
                          <div className="flex flex-wrap gap-1">
                            {offender.endpoints.slice(0, 3).map((ep) => (
                              <Badge key={ep} variant="outline" className="text-xs">{ep}</Badge>
                            ))}
                            {offender.endpoints.length > 3 && (
                              <Badge variant="outline" className="text-xs">+{offender.endpoints.length - 3}</Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-gray-500 text-xs">
                          {new Date(offender.lastBlocked).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Cost Anomalies Section */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-yellow-400" />
          Cost Anomalies
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
            valueColor={(costAnomalyData?.stats.unacknowledged || 0) > 0 ? "text-red-400" : "text-green-400"}
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
          <Card className="bg-yellow-900/20 border-yellow-500/30">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-yellow-400 font-medium">Warnings</p>
                <p className="text-3xl font-bold text-yellow-400">{costAnomalyData?.stats.bySeverity.warning || 0}</p>
              </div>
              <AlertTriangle className="h-10 w-10 text-yellow-500/50" />
            </CardContent>
          </Card>
          <Card className="bg-red-900/20 border-red-500/30">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-red-400 font-medium">Critical</p>
                <p className="text-3xl font-bold text-red-400">{costAnomalyData?.stats.bySeverity.critical || 0}</p>
              </div>
              <XCircle className="h-10 w-10 text-red-500/50" />
            </CardContent>
          </Card>
        </div>

        {/* Recent Anomalies */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Recent Anomalies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {costAnomalyData?.recentAnomalies.slice(0, 10).map((anomaly) => (
                <div
                  key={anomaly.id}
                  className={`p-3 rounded-lg border ${
                    anomaly.severity === 'critical'
                      ? 'bg-red-900/20 border-red-500/30'
                      : 'bg-yellow-900/20 border-yellow-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={anomaly.severity === 'critical' ? 'destructive' : 'default'}>
                          {anomaly.severity}
                        </Badge>
                        <Badge variant="outline">{anomaly.type}</Badge>
                        {anomaly.acknowledged && (
                          <Badge variant="outline" className="text-green-400 border-green-500">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Acknowledged
                          </Badge>
                        )}
                      </div>
                      <p className="text-gray-300 text-sm">{anomaly.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Cost: ${anomaly.cost.toFixed(4)} (threshold: ${anomaly.threshold.toFixed(2)})
                        {' • '}
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
                          'Acknowledge'
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {(!costAnomalyData?.recentAnomalies || costAnomalyData.recentAnomalies.length === 0) && (
                <p className="text-center text-gray-500 py-8">No anomalies detected. System is healthy!</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Query Performance Section */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Database className="h-5 w-5 text-green-400" />
          Database Performance (Last 24h)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Queries"
            value={queryPerfData?.totalQueries.toLocaleString() || 0}
            subtitle="Tracked queries"
            icon={Database}
          />
          <MetricCard
            title="Avg Duration"
            value={`${(queryPerfData?.averageDurationMs || 0).toFixed(0)}ms`}
            subtitle="Per query"
            icon={Clock}
            valueColor={(queryPerfData?.averageDurationMs || 0) > 200 ? "text-yellow-400" : "text-green-400"}
          />
          <MetricCard
            title="Slow Queries"
            value={queryPerfData?.slowQueries || 0}
            subtitle={`${(queryPerfData?.slowQueryRate || 0).toFixed(1)}% of total`}
            icon={Zap}
            valueColor={(queryPerfData?.slowQueryRate || 0) > 5 ? "text-red-400" : "text-green-400"}
          />
          <MetricCard
            title="Costly Queries"
            value={queryPerfData?.costlyQueries || 0}
            subtitle=">100 docs per query"
            icon={AlertTriangle}
          />
        </div>

        {/* Recommendations */}
        {queryPerfData?.recommendations && queryPerfData.recommendations.length > 0 && (
          <Card className="bg-blue-900/20 border-blue-500/30">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-400" />
                Optimization Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {queryPerfData.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-blue-300 text-sm">
                    <span className="text-blue-400 mt-1">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* By Collection */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">By Collection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400">
                    <th className="text-left py-2 px-3">Collection</th>
                    <th className="text-right py-2 px-3">Queries</th>
                    <th className="text-right py-2 px-3">Avg Time</th>
                    <th className="text-right py-2 px-3">Avg Docs</th>
                    <th className="text-right py-2 px-3">Slow</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(queryPerfData?.byCollection || {}).map(([collection, stats]) => (
                    <tr key={collection} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="py-2 px-3 text-gray-300 font-mono">{collection}</td>
                      <td className="py-2 px-3 text-right text-white">{stats.count.toLocaleString()}</td>
                      <td className={`py-2 px-3 text-right ${stats.avgDurationMs > 500 ? 'text-yellow-400' : 'text-gray-300'}`}>
                        {stats.avgDurationMs.toFixed(0)}ms
                      </td>
                      <td className={`py-2 px-3 text-right ${stats.avgDocumentCount > 50 ? 'text-yellow-400' : 'text-gray-300'}`}>
                        {stats.avgDocumentCount.toFixed(0)}
                      </td>
                      <td className={`py-2 px-3 text-right ${stats.slowCount > 0 ? 'text-red-400' : 'text-gray-500'}`}>
                        {stats.slowCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Slowest Queries */}
        {queryPerfData?.slowestQueries && queryPerfData.slowestQueries.length > 0 && (
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Slowest Queries</CardTitle>
              <CardDescription>Queries taking more than 1 second</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {queryPerfData.slowestQueries.map((query, idx) => (
                  <div key={idx} className="p-3 bg-gray-800/30 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{query.collection}</Badge>
                        <Badge variant="outline">{query.operation}</Badge>
                      </div>
                      <span className="text-red-400 font-mono">{query.durationMs}ms</span>
                    </div>
                    <div className="text-sm text-gray-400">
                      <span>{query.documentCount} documents</span>
                      {query.filters && query.filters.length > 0 && (
                        <span className="ml-2">• Filters: {query.filters.join(', ')}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(query.timestamp).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
