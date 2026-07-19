"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FunnelChart, TimeSeriesChart, CohortHeatmap } from "@/components/admin/charts"
import { TrendingUp, RefreshCw, AlertCircle, Users } from "lucide-react"
import { logger } from "@/lib/logger"

interface FunnelData {
  stages: Array<{ name: string; value: number; color?: string }>
  conversionRates: {
    visitToSignup: number
    signupToSession: number
    sessionToComplete: number
    completeToSubscribe: number
    overallConversion: number
  }
  trend?: Array<{ date: string; signups: number; sessions: number; completed: number }>
  scoredCompletions?: number
  registeredSessions?: number
  registeredCompletedSessions?: number
  registeredScoredCompletions?: number
  guestSessions?: number
  guestCompletedSessions?: number
  registeredConversionRates?: {
    signupToSession: number
    sessionToComplete: number
    sessionToScored: number
  }
  signupsBySource?: Record<string, number>
}

interface CohortData {
  cohort: string
  size: number
  retention: number[]
}

export default function FunnelPage() {
  const { firebaseUser } = useAuth()
  const [funnel, setFunnel] = useState<FunnelData | null>(null)
  const [cohorts, setCohorts] = useState<CohortData[]>([])
  const [periodLabels, setPeriodLabels] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [timeRange, setTimeRange] = useState("30d")
  const [cohortType, setCohortType] = useState<"weekly" | "monthly">("monthly")

  const loadData = useCallback(async (showRefreshing = false) => {
    if (!firebaseUser) return

    if (showRefreshing) setRefreshing(true)

    try {
      const token = await firebaseUser.getIdToken()
      const headers = { Authorization: `Bearer ${token}` }

      const [funnelRes, cohortRes] = await Promise.all([
        fetch(`/api/admin/funnel?timeRange=${timeRange}`, { headers }),
        fetch(`/api/admin/cohorts?type=${cohortType}&cohorts=6`, { headers }),
      ])

      if (funnelRes.ok) {
        const funnelData = await funnelRes.json()
        if (funnelData.success) {
          setFunnel(funnelData.funnel)
        }
      }

      if (cohortRes.ok) {
        const cohortData = await cohortRes.json()
        if (cohortData.success) {
          setCohorts(cohortData.data)
          setPeriodLabels(cohortData.summary?.periodLabels || [])
        }
      }
    } catch (error) {
      logger.error("Error loading funnel data", { error, timeRange, cohortType })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [firebaseUser, timeRange, cohortType])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c4703f]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white">Conversion Funnel</h1>
          <p className="text-gray-400 mt-1">User journey analysis and retention cohorts</p>
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
                    ? "bg-[#c4703f] text-black hover:bg-[#c4703f]/80"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }
              >
                {range === "all" ? "All" : range.toUpperCase()}
              </Button>
            ))}
          </div>

          <Button
            onClick={() => loadData(true)}
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

      {/* Main Funnel */}
      {funnel ? (
        <FunnelChart
          title="User Conversion Funnel"
          subtitle={`${timeRange.toUpperCase()} period`}
          stages={funnel.stages}
          icon={TrendingUp}
        />
      ) : (
        <Card className="bg-gray-900/50 border-gray-800">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No funnel data available</p>
          </CardContent>
        </Card>
      )}

      {/* Conversion Rates */}
      {funnel && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Visit → Signup", value: funnel.conversionRates.visitToSignup },
            { label: "Signup → Session", value: funnel.conversionRates.signupToSession },
            { label: "Session → Complete", value: funnel.conversionRates.sessionToComplete },
            { label: "Complete → Subscribe", value: funnel.conversionRates.completeToSubscribe },
            { label: "Overall", value: funnel.conversionRates.overallConversion, highlight: true },
          ].map((rate) => (
            <Card
              key={rate.label}
              className={`border-gray-800 ${rate.highlight ? "bg-[#c4703f]/10 border-[#c4703f]/30" : "bg-gray-900/50"}`}
            >
              <CardContent className="p-4 text-center">
                <div className={`text-2xl font-bold ${rate.highlight ? "text-[#c4703f]" : "text-white"}`}>
                  {rate.value.toFixed(1)}%
                </div>
                <p className="text-xs text-gray-400 mt-1">{rate.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Registered-only conversion (guest trials excluded) — the honest rates to quote in a pitch. */}
      {funnel?.registeredConversionRates && (
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Registered users only</h2>
          <p className="text-gray-400 text-sm mb-3">
            Guest trials are excluded, so these are the real registered-user conversion rates.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: "Guest sessions", value: funnel.guestSessions ?? 0, isCount: true },
              { label: "Registered sessions", value: funnel.registeredSessions ?? 0, isCount: true },
              { label: "Signup → Session", value: funnel.registeredConversionRates.signupToSession },
              { label: "Session → Complete", value: funnel.registeredConversionRates.sessionToComplete },
              {
                label: "Session → Scored",
                value: funnel.registeredConversionRates.sessionToScored,
                highlight: true,
              },
            ].map((rate) => (
              <Card
                key={rate.label}
                className={`border-gray-800 ${rate.highlight ? "bg-[#c4703f]/10 border-[#c4703f]/30" : "bg-gray-900/50"}`}
              >
                <CardContent className="p-4 text-center">
                  <div
                    className={`text-2xl font-bold ${rate.highlight ? "text-[#c4703f]" : "text-white"}`}
                  >
                    {rate.isCount ? rate.value.toLocaleString() : `${rate.value.toFixed(1)}%`}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{rate.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Signups by acquisition source (first-touch src/ref) — measures which channels drive signups. */}
      {funnel?.signupsBySource && Object.keys(funnel.signupsBySource).length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-white mb-3">Signups by source</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(funnel.signupsBySource)
              .sort(([, a], [, b]) => b - a)
              .map(([source, count]) => (
                <Card key={source} className="bg-gray-900/50 border-gray-800">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-white">{count.toLocaleString()}</div>
                    <p className="text-xs text-gray-400 mt-1 truncate" title={source}>
                      {source}
                    </p>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      )}

      {/* Funnel Trend */}
      {funnel?.trend && funnel.trend.length > 0 && (
        <TimeSeriesChart
          title="Funnel Trend"
          subtitle="Daily signups, sessions, and completions"
          data={funnel.trend}
          series={[
            { key: "signups", name: "Signups", color: "#c4703f" },
            { key: "sessions", name: "Sessions", color: "#FBBF24" },
            { key: "completed", name: "Completed", color: "#3fb883" },
          ]}
          icon={TrendingUp}
        />
      )}

      {/* Cohort Selector */}
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-bold text-white">Retention Cohorts</h2>
        <div className="flex gap-1 bg-gray-900 rounded-lg p-1">
          {(["weekly", "monthly"] as const).map((type) => (
            <Button
              key={type}
              size="sm"
              variant={cohortType === type ? "default" : "ghost"}
              onClick={() => setCohortType(type)}
              className={
                cohortType === type
                  ? "bg-[#c4703f] text-black hover:bg-[#c4703f]/80"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Cohort Heatmap */}
      {cohorts.length > 0 ? (
        <CohortHeatmap
          title="User Retention"
          subtitle={`${cohortType === "weekly" ? "Weekly" : "Monthly"} cohorts`}
          data={cohorts}
          periodLabels={periodLabels}
          icon={Users}
        />
      ) : (
        <Card className="bg-gray-900/50 border-gray-800">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No cohort data available</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
