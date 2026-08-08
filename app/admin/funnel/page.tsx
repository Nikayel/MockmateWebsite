"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FunnelChart, TimeSeriesChart, CohortHeatmap } from "@/components/admin/charts"
import { TrendingUp, RefreshCw, AlertCircle, Users } from "lucide-react"
import { logger } from "@/lib/logger"

interface FunnelData {
  /** The window every block is scoped to unless it says otherwise. */
  window?: {
    timeRange: string
    label: string
    startDate: string | null
    endDate: string
  }
  stages: Array<{ name: string; value: number; color?: string }>
  conversionRates: {
    signupToSession: number
    sessionToComplete: number
    completeToSubscribe: number
    overallConversion: number
  }
  /** Cohort members paying today who never completed a round. */
  subscribedWithoutCompletedRound?: number
  trend?: Array<{ date: string; signups: number; sessions: number; completed: number }>
  /** The span the trend chart really covers, which is not always the selected range. */
  trendWindow?: {
    startDate: string
    endDate: string
    days: number
    truncated: boolean
  }
  scoredCompletions?: number
  registeredSessions?: number
  registeredCompletedSessions?: number
  registeredScoredCompletions?: number
  guestSessions?: number
  guestCompletedSessions?: number
  registeredConversionRates?: {
    sessionToComplete: number
    sessionToScored: number
  }
  signupsBySource?: Record<string, number>
  /** First scored round within 24h of signup, fixed signup window (null when unavailable). */
  activation?: {
    windowDays: number
    signups: number
    activated: number
    rate: number
  } | null
  /** Where each block's numbers come from, rendered so no figure appears unsourced. */
  provenance?: {
    funnel: string
    registered: string
    activation: string
    trend: string
    signupsBySource: string
  }
}

/** One short line under a heading naming the window and the source of the numbers below it. */
function MetricProvenance({ window, source }: { window: string; source?: string }) {
  return (
    <p className="text-gray-500 text-xs mb-3">
      {window}
      {source ? ` · ${source}` : ""}
    </p>
  )
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

interface CohortData {
  cohort: string
  size: number
  retention: number[]
  /** Retained-active counting interview OR Learn-lesson activity that period. */
  retentionInclLearn?: number[]
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

  // Named by the API so the page never invents a label for a window it did not choose.
  const windowLabel = funnel?.window?.label ?? (timeRange === "all" ? "all time" : `last ${timeRange}`)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white">Conversion Funnel</h1>
          <p className="text-gray-400 mt-1">
            Measured user journey and retention cohorts. Page views are not measured, so there is
            no visits stage.
          </p>
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

      {/* Signup-cohort funnel: one window, one population, every stage a subset of the one above. */}
      {funnel ? (
        <div>
          <FunnelChart
            title="Signup cohort"
            subtitle={`People who signed up in the ${windowLabel}, and how far they got`}
            stages={funnel.stages}
            icon={TrendingUp}
          />
          <div className="mt-2">
            <MetricProvenance
              window={`Signed up in the ${windowLabel}`}
              source={funnel.provenance?.funnel}
            />
          </div>
        </div>
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
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Conversion within the cohort</h2>
          <MetricProvenance
            window={`Signed up in the ${windowLabel}`}
            source="Each rate is a subset of the stage above it, so none can exceed 100%."
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Signup → started a round", value: funnel.conversionRates.signupToSession },
              { label: "Started → completed", value: funnel.conversionRates.sessionToComplete },
              { label: "Completed → paying", value: funnel.conversionRates.completeToSubscribe },
              {
                label: "Signup → paying",
                value: funnel.conversionRates.overallConversion,
                highlight: true,
              },
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
          {funnel.subscribedWithoutCompletedRound !== undefined &&
            funnel.subscribedWithoutCompletedRound > 0 && (
              <p className="text-gray-500 text-xs mt-3">
                {funnel.subscribedWithoutCompletedRound.toLocaleString()} cohort{" "}
                {funnel.subscribedWithoutCompletedRound === 1 ? "member is" : "members are"} paying
                today without ever completing a round. They sit outside the funnel above, because
                counting them in a stage would make it larger than the stage feeding it.
              </p>
            )}
        </div>
      )}

      {/* Round volume, registered only. These count rounds, not people, so they sit outside the funnel. */}
      {funnel?.registeredConversionRates && (
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Rounds run, registered users only</h2>
          <MetricProvenance
            window={`Rounds started in the ${windowLabel}`}
            source={funnel.provenance?.registered}
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Guest rounds", value: funnel.guestSessions ?? 0, isCount: true },
              { label: "Registered rounds", value: funnel.registeredSessions ?? 0, isCount: true },
              { label: "Round → completed", value: funnel.registeredConversionRates.sessionToComplete },
              {
                label: "Round → scored",
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

      {/* Activation (council definition): first scored round within 24h of signup, fixed 30-day signup cohort. */}
      {funnel?.activation && (
        <div>
          <h2 className="text-xl font-bold text-white mb-1">
            Activation (last {funnel.activation.windowDays} days)
          </h2>
          <p className="text-gray-400 text-sm mb-1">
            Users who signed up in the last {funnel.activation.windowDays} days and completed
            their first scored round within 24 hours of signup.
          </p>
          <MetricProvenance
            window={`Fixed ${funnel.activation.windowDays}-day signup window, not the range above`}
            source={funnel.provenance?.activation}
          />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: "Signups", value: funnel.activation.signups, isCount: true },
              { label: "Activated within 24h", value: funnel.activation.activated, isCount: true },
              { label: "Activation rate", value: funnel.activation.rate, highlight: true },
            ].map((stat) => (
              <Card
                key={stat.label}
                className={`border-gray-800 ${stat.highlight ? "bg-[#c4703f]/10 border-[#c4703f]/30" : "bg-gray-900/50"}`}
              >
                <CardContent className="p-4 text-center">
                  <div
                    className={`text-2xl font-bold ${stat.highlight ? "text-[#c4703f]" : "text-white"}`}
                  >
                    {stat.isCount ? stat.value.toLocaleString() : `${stat.value.toFixed(1)}%`}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Signups by acquisition source (first-touch src/ref) — measures which channels drive signups. */}
      {funnel?.signupsBySource && Object.keys(funnel.signupsBySource).length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Signups by source</h2>
          <MetricProvenance
            window={`Signed up in the ${windowLabel}`}
            source={funnel.provenance?.signupsBySource}
          />
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

      {/* Funnel Trend. The charted span is stated, because All time is capped at a year. */}
      {funnel?.trend && funnel.trend.length > 0 && (
        <div>
          <TimeSeriesChart
            title="Funnel Trend"
            subtitle={
              funnel.trendWindow
                ? `Daily signups, rounds, and completions from ${formatDay(funnel.trendWindow.startDate)} to ${formatDay(funnel.trendWindow.endDate)}`
                : "Daily signups, rounds, and completions"
            }
            data={funnel.trend}
            series={[
              { key: "signups", name: "Signups", color: "#c4703f" },
              { key: "sessions", name: "Rounds", color: "#FBBF24" },
              { key: "completed", name: "Completed", color: "#3fb883" },
            ]}
            icon={TrendingUp}
          />
          <div className="mt-2">
            <MetricProvenance
              window={
                funnel.trendWindow
                  ? `${funnel.trendWindow.days} days${funnel.trendWindow.truncated ? ", capped at one year" : ""}`
                  : windowLabel
              }
              source={funnel.provenance?.trend}
            />
          </div>
        </div>
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

      {/* Same cohorts with Learn-lesson activity also counting as retained-active. */}
      {cohorts.length > 0 && cohorts.some((c) => (c.retentionInclLearn?.length ?? 0) > 0) && (
        <CohortHeatmap
          title="User Retention (incl. Learn)"
          subtitle={`${cohortType === "weekly" ? "Weekly" : "Monthly"} cohorts · interview or Learn activity`}
          data={cohorts.map((c) => ({ ...c, retention: c.retentionInclLearn ?? [] }))}
          periodLabels={periodLabels}
          icon={Users}
        />
      )}
    </div>
  )
}
