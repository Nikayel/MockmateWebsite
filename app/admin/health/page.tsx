"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Database,
  Server,
  Shield,
  HardDrive,
  Activity,
  AlertCircle,
  Bell,
  Check,
  CreditCard,
  Sparkles,
  Mic,
  Mail,
  Bug,
} from "lucide-react"
import { logger } from "@/lib/logger"

/**
 * Every card on this page comes from a probe that can fail. The four cards this
 * replaced (database, api, auth, storage) were initialised healthy, and only one
 * of them was ever reassigned, so the page could not go red.
 *
 * "unverified" is the state that keeps it honest: a dependency we cannot check
 * for free is shown in grey and counted separately, never folded into healthy.
 */
type ProbeStatus = "healthy" | "degraded" | "unhealthy" | "unknown"

interface DependencyResult {
  id: string
  label: string
  critical: boolean
  status: ProbeStatus
  detail: string
  latencyMs: number | null
}

interface HealthAlert {
  id: string
  type: "error" | "warning" | "info"
  title: string
  message: string
  signature: string
  acknowledged: boolean
  acknowledgedBy: string | null
  acknowledgedAt: string | null
}

interface HealthData {
  status: ProbeStatus
  lastChecked: string
  dependencies: DependencyResult[]
  summary: {
    status: ProbeStatus
    healthy: number
    degraded: number
    unhealthy: number
    unknown: number
    total: number
  }
  metrics: {
    /** null when the count could not be taken. Never rendered as a zero. */
    productEvents24h: number | null
  }
  memory: {
    used: number
    total: number
    percentage: number
  }
  alerts: HealthAlert[]
}

const statusConfig: Record<
  ProbeStatus,
  { icon: typeof CheckCircle; color: string; bg: string; label: string }
> = {
  healthy: { icon: CheckCircle, color: "text-green-400", bg: "bg-green-500/20", label: "Healthy" },
  degraded: {
    icon: AlertTriangle,
    color: "text-yellow-400",
    bg: "bg-yellow-500/20",
    label: "Degraded",
  },
  unhealthy: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/20", label: "Unhealthy" },
  unknown: { icon: HelpCircle, color: "text-gray-400", bg: "bg-gray-500/20", label: "Unverified" },
}

/** Falls back to a generic icon so a newly added probe still renders. */
const dependencyIcons: Record<string, typeof Database> = {
  firestore: Database,
  "firebase-auth": Shield,
  stripe: CreditCard,
  openai: Sparkles,
  deepseek: Sparkles,
  gemini: Sparkles,
  deepgram: Mic,
  brevo: Mail,
  sentry: Bug,
}

export default function SystemHealthPage() {
  const { firebaseUser } = useAuth()
  const [health, setHealth] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [acknowledging, setAcknowledging] = useState<string | null>(null)

  const loadHealth = useCallback(
    async (showRefreshing = false) => {
      if (!firebaseUser) return
      if (showRefreshing) setRefreshing(true)

      try {
        const token = await firebaseUser.getIdToken()
        const response = await fetch("/api/admin/health", {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success) setHealth(data.health)
        }
      } catch (error) {
        logger.error("Error loading health data", { error })
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [firebaseUser]
  )

  useEffect(() => {
    loadHealth()
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => loadHealth(), 30000)
    return () => clearInterval(interval)
  }, [loadHealth])

  /**
   * The signature travels with the acknowledgement so the server can reject a
   * stale tab trying to silence a failure it never saw.
   */
  const setAcknowledged = async (alert: HealthAlert, acknowledged: boolean) => {
    if (!firebaseUser) return
    setAcknowledging(alert.id)

    try {
      const token = await firebaseUser.getIdToken()
      const response = await fetch("/api/admin/health", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ alertId: alert.id, signature: alert.signature, acknowledged }),
      })
      if (!response.ok) {
        logger.error("Acknowledge request rejected", { status: response.status })
      }
      await loadHealth(true)
    } catch (error) {
      logger.error("Error acknowledging alert", { error })
    } finally {
      setAcknowledging(null)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#c4703f]"></div>
      </div>
    )
  }

  if (!health) {
    return (
      <Card className="border-red-500/30 bg-red-900/20">
        <CardContent className="p-8 text-center">
          <XCircle className="mx-auto mb-4 h-12 w-12 text-red-400" />
          <p className="text-red-400">Failed to load system health</p>
          <Button onClick={() => loadHealth(true)} variant="outline" className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  const StatusIcon = statusConfig[health.status].icon

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-white">System Health</h1>
          <p className="mt-1 text-gray-400">Live checks against every service the platform runs on</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            Last checked: {new Date(health.lastChecked).toLocaleTimeString()}
          </span>
          <Button
            onClick={() => loadHealth(true)}
            disabled={refreshing}
            variant="outline"
            size="sm"
            className="border-gray-700 text-gray-400"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Status */}
      <Card
        className={`border-2 ${statusConfig[health.status].bg} ${statusConfig[health.status].color.replace("text-", "border-")}/30`}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`rounded-full p-4 ${statusConfig[health.status].bg}`}>
                <StatusIcon className={`h-8 w-8 ${statusConfig[health.status].color}`} />
              </div>
              <div>
                <h2 className={`text-2xl font-bold ${statusConfig[health.status].color}`}>
                  System {statusConfig[health.status].label}
                </h2>
                <p className="text-gray-400">
                  Checked {new Date(health.lastChecked).toLocaleTimeString()}
                </p>
              </div>
            </div>
            <div className="text-right text-sm">
              <p className="text-3xl font-bold text-white">
                {health.summary.healthy}/{health.summary.total}
              </p>
              <p className="text-gray-400">dependencies verified healthy</p>
              {health.summary.unknown > 0 && (
                <p className="mt-1 text-gray-500">
                  {health.summary.unknown} could not be checked
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {health.alerts.length > 0 && (
        <Card className="border-gray-800 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Bell className="h-5 w-5 text-[#c4703f]" />
              Active Alerts ({health.alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {health.alerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-lg border p-4 ${alert.acknowledged ? "opacity-60" : ""} ${
                  alert.type === "error"
                    ? "border-red-500/30 bg-red-500/10"
                    : alert.type === "warning"
                      ? "border-yellow-500/30 bg-yellow-500/10"
                      : "border-blue-500/30 bg-blue-500/10"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle
                      className={`h-5 w-5 shrink-0 ${
                        alert.type === "error"
                          ? "text-red-400"
                          : alert.type === "warning"
                            ? "text-yellow-400"
                            : "text-blue-400"
                      }`}
                    />
                    <div>
                      <h4 className="font-medium text-white">{alert.title}</h4>
                      <p className="text-sm text-gray-400">{alert.message}</p>
                      {alert.acknowledged && alert.acknowledgedAt && (
                        <p className="mt-1 text-xs text-gray-500">
                          Acknowledged {new Date(alert.acknowledgedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  {alert.acknowledged ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={acknowledging === alert.id}
                      onClick={() => setAcknowledged(alert, false)}
                      className="shrink-0 text-gray-500 hover:text-white"
                    >
                      <Check className="mr-1 h-4 w-4" />
                      Acknowledged
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={acknowledging === alert.id}
                      onClick={() => setAcknowledged(alert, true)}
                      className="shrink-0 text-gray-400 hover:text-white"
                    >
                      <Check className="mr-1 h-4 w-4" />
                      Acknowledge
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Dependencies */}
      <div>
        <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-white">
          <Server className="h-5 w-5 text-[#c4703f]" />
          Dependencies
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {health.dependencies.map((dependency) => {
            const config = statusConfig[dependency.status]
            const DependencyIcon = dependencyIcons[dependency.id] ?? Server
            const DependencyStatusIcon = config.icon
            return (
              <Card key={dependency.id} className="border-gray-800 bg-gray-900/50">
                <CardContent className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div className={`rounded-lg p-3 ${config.bg}`}>
                      <DependencyIcon className={`h-6 w-6 ${config.color}`} />
                    </div>
                    <Badge className={`${config.bg} ${config.color}`}>
                      <DependencyStatusIcon className="mr-1 h-3 w-3" />
                      {config.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-white">{dependency.label}</h3>
                    {dependency.critical && (
                      <Badge variant="outline" className="border-gray-700 text-xs text-gray-400">
                        Critical
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-400">
                    {dependency.latencyMs === null
                      ? "Not measured"
                      : `${dependency.latencyMs}ms latency`}
                  </p>
                  <p className="mt-2 text-xs text-gray-500">{dependency.detail}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Counters */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="border-gray-800 bg-gray-900/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[#c4703f]/20 p-3">
                <Activity className="h-6 w-6 text-[#c4703f]" />
              </div>
              <div>
                {health.metrics.productEvents24h === null ? (
                  <p className="text-lg font-medium text-gray-500">Not collected</p>
                ) : (
                  <p className="text-3xl font-bold text-white">
                    {health.metrics.productEvents24h.toLocaleString()}
                  </p>
                )}
                <p className="text-sm text-gray-400">Product events (24h)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error volume is deliberately absent. It was a count of analytics_events rows with
            event_name "error", which nothing has ever written, so it was a permanent zero
            driving an alert that could never fire. Errors go to Sentry through lib/logger. */}
        <Card className="border-gray-800 bg-gray-900/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-gray-500/20 p-3">
                <AlertCircle className="h-6 w-6 text-gray-400" />
              </div>
              <div>
                <p className="text-lg font-medium text-gray-500">Not collected here</p>
                <p className="text-sm text-gray-400">
                  Error volume lives in Sentry. No Firestore sink records it.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Memory Usage */}
      <Card className="border-gray-800 bg-gray-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <HardDrive className="h-5 w-5 text-[#c4703f]" />
            Resource Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex justify-between">
                <span className="text-gray-400">V8 heap, instance serving this request</span>
                <span className="text-white">
                  {health.memory.used}MB / {health.memory.total}MB
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-gray-700">
                <div
                  className={`h-full rounded-full ${
                    health.memory.percentage > 80
                      ? "bg-red-400"
                      : health.memory.percentage > 60
                        ? "bg-yellow-400"
                        : "bg-green-400"
                  }`}
                  style={{ width: `${health.memory.percentage}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* No performance history is charted here. The 24 points this panel used to draw were
          generated with Math.random() on every request, so the trend line moved constantly and
          meant nothing. Restoring it needs a real time series, which is a monitoring provider
          or a scheduled snapshot job, not a shape invented at render time. */}
    </div>
  )
}
