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
  Database,
  Server,
  Shield,
  HardDrive,
  Activity,
  AlertCircle,
  Bell,
  Check,
} from "lucide-react"
import { logger } from "@/lib/logger"

interface ServiceHealth {
  status: "healthy" | "degraded" | "unhealthy"
  latency: number
  message?: string
}

interface HealthData {
  status: "healthy" | "degraded" | "unhealthy"
  lastChecked: string
  services: {
    database: ServiceHealth
    api: ServiceHealth
    auth: ServiceHealth
    storage: ServiceHealth
  }
  metrics: {
    errorCount: number
    warningCount: number
    requestVolume: number
  }
  memory: {
    used: number
    total: number
    percentage: number
  }
  alerts: Array<{
    id: string
    type: "error" | "warning" | "info"
    title: string
    message: string
    timestamp: string
    acknowledged: boolean
  }>
}

const statusConfig = {
  healthy: { icon: CheckCircle, color: "text-green-400", bg: "bg-green-500/20", label: "Healthy" },
  degraded: {
    icon: AlertTriangle,
    color: "text-yellow-400",
    bg: "bg-yellow-500/20",
    label: "Degraded",
  },
  unhealthy: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/20", label: "Unhealthy" },
}

const serviceIcons = {
  database: Database,
  api: Server,
  auth: Shield,
  storage: HardDrive,
}

export default function SystemHealthPage() {
  const { firebaseUser } = useAuth()
  const [health, setHealth] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

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

  const acknowledgeAlert = async (alertId: string) => {
    if (!firebaseUser) return

    try {
      const token = await firebaseUser.getIdToken()
      await fetch("/api/admin/health", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ alertId, acknowledged: true }),
      })
      loadHealth(true)
    } catch (error) {
      logger.error("Error acknowledging alert", { error })
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
          <p className="mt-1 text-gray-400">Monitor system status, performance, and alerts</p>
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
            <div className="text-right">
              <p className="text-3xl font-bold text-white">{health.metrics.errorCount}</p>
              <p className="text-gray-400">Errors in window</p>
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
                className={`rounded-lg border p-4 ${
                  alert.type === "error"
                    ? "border-red-500/30 bg-red-500/10"
                    : alert.type === "warning"
                      ? "border-yellow-500/30 bg-yellow-500/10"
                      : "border-blue-500/30 bg-blue-500/10"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertCircle
                      className={`h-5 w-5 ${
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
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => acknowledgeAlert(alert.id)}
                    className="text-gray-400 hover:text-white"
                  >
                    <Check className="mr-1 h-4 w-4" />
                    Acknowledge
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Services Status */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {(Object.entries(health.services) as [keyof typeof health.services, ServiceHealth][]).map(
          ([name, service]) => {
            const ServiceIcon = serviceIcons[name]
            const ServiceStatusIcon = statusConfig[service.status].icon
            return (
              <Card key={name} className="border-gray-800 bg-gray-900/50">
                <CardContent className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div className={`p-3 ${statusConfig[service.status].bg} rounded-lg`}>
                      <ServiceIcon className={`h-6 w-6 ${statusConfig[service.status].color}`} />
                    </div>
                    <Badge
                      className={
                        statusConfig[service.status].bg + " " + statusConfig[service.status].color
                      }
                    >
                      <ServiceStatusIcon className="mr-1 h-3 w-3" />
                      {statusConfig[service.status].label}
                    </Badge>
                  </div>
                  <h3 className="font-medium text-white capitalize">{name}</h3>
                  <p className="mt-1 text-sm text-gray-400">{service.latency}ms latency</p>
                  {service.message && (
                    <p className="mt-2 text-xs text-yellow-400">{service.message}</p>
                  )}
                </CardContent>
              </Card>
            )
          }
        )}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <Card className="border-gray-800 bg-gray-900/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[#c4703f]/20 p-3">
                <Activity className="h-6 w-6 text-[#c4703f]" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">
                  {health.metrics.requestVolume.toLocaleString()}
                </p>
                <p className="text-sm text-gray-400">Requests (24h)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-800 bg-gray-900/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-500/20 p-3">
                <AlertCircle className="h-6 w-6 text-red-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{health.metrics.errorCount}</p>
                <p className="text-sm text-gray-400">Errors (24h)</p>
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
