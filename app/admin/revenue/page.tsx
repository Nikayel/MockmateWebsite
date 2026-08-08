"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MetricCard, TimeSeriesChart, DistributionChart } from "@/components/admin/charts"
import { PageHeader, MetricsGridSkeleton, ChartSkeleton } from "@/components/admin/shared"
import {
  DollarSign,
  TrendingUp,
  Users,
  CreditCard,
  ExternalLink,
  Calendar,
  AlertCircle,
  Percent,
  Receipt,
} from "lucide-react"
import { logger } from "@/lib/logger"

interface RevenueData {
  /** The window the `collected` block is scoped to. `recurring` ignores it. */
  window: {
    timeRange: string
    label: string
    startDate: string | null
    endDate: string
  }
  /** Point in time: what the subscriptions billing us today are worth. */
  recurring: {
    mrr: number
    arr: number
    breakdown: {
      proMonthly: number
      proYearly: number
      enterprise: number
    }
    subscriptions: {
      proMonthly: number
      proYearly: number
      enterprise: number
      total: number
      /** Paid tier with no subscription_status, so its billing state is unknown. */
      unknownBillingState: number
    }
  }
  /** Money that actually moved inside the window. */
  collected: {
    total: number
    refunds: number
    net: number
    paymentCount: number
    refundCount: number
    refundShareOfEventsPercent: number
  }
  byType: {
    monthly: { collected: number; paymentCount: number }
    yearly: { collected: number; paymentCount: number }
  }
  recentPayments: Array<{
    id: string
    user_id: string
    amount: number
    currency: string
    type: "subscription" | "one_time"
    status: string
    description?: string
    created_at: string
  }>
  timeSeries: Array<{
    date: string
    revenue: number
    payments: number
    refunds: number
  }>
  stripe?: {
    available: number
    pending: number
    totalCharges: number
    /** Refunds booked against charges created in the range, whenever they happened. */
    refundedAgainstTheseCharges: number
    chargeCount: number
    truncated: boolean
  } | null
  provenance?: {
    recurring: string
    collected: string
    stripe: string
  }
}

/** One short line naming the window and the source of the numbers above it. */
function MetricProvenance({ window, source }: { window: string; source?: string }) {
  return (
    <p className="text-gray-500 text-xs">
      {window}
      {source ? ` · ${source}` : ""}
    </p>
  )
}

const usd = (value: number) =>
  value.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 })

export default function RevenuePage() {
  const { firebaseUser } = useAuth()
  const [metrics, setMetrics] = useState<RevenueData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [timeRange, setTimeRange] = useState("30d")
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async (live = false) => {
    if (!firebaseUser) return

    if (live) setRefreshing(true)
    setError(null)

    try {
      const token = await firebaseUser.getIdToken()
      const url = `/api/admin/revenue?timeRange=${timeRange}${live ? "&live=true" : ""}`
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || "Failed to load revenue data")
      }

      const data = await response.json()
      if (data.success) {
        setMetrics(data.metrics)
      } else {
        throw new Error(data.error || "Unknown error")
      }
    } catch (error) {
      logger.error("Error loading revenue data", { error, timeRange })
      setError(error instanceof Error ? error.message : "Failed to load data")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [firebaseUser, timeRange])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading) {
    return (
      <div className="space-y-8">
        <PageHeader title="Revenue" subtitle="Actual revenue from Stripe payments" />
        <MetricsGridSkeleton count={4} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton height={280} />
          <ChartSkeleton height={280} />
        </div>
        <ChartSkeleton height={300} />
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

  const typeDistribution = metrics ? [
    { name: "Pro monthly", value: metrics.recurring.subscriptions.proMonthly, color: "#c4703f" },
    { name: "Pro yearly", value: metrics.recurring.subscriptions.proYearly, color: "#A855F7" },
    { name: "Enterprise", value: metrics.recurring.subscriptions.enterprise, color: "#3fb883" },
  ] : []

  const totalSubscribers = metrics?.recurring.subscriptions.total || 0
  const windowLabel = metrics?.window.label ?? (timeRange === "all" ? "all time" : `last ${timeRange}`)

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        title="Revenue"
        subtitle="Recurring revenue as of today, and money collected in the selected window"
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        onRefresh={() => loadData(true)}
        refreshing={refreshing}
        refreshLabel="Sync Stripe"
        actions={
          <Button
            onClick={() => window.open("https://dashboard.stripe.com", "_blank")}
            variant="outline"
            size="sm"
            className="border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Stripe Dashboard
          </Button>
        }
      />

      {metrics && (
        <>
          {/* Point in time. These do not move when the range selector moves. */}
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Recurring revenue, as of today</h2>
            <MetricProvenance
              window="Point in time, not the selected range"
              source={metrics.provenance?.recurring}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-3">
              <MetricCard
                title="MRR at list price"
                value={usd(metrics.recurring.mrr)}
                subtitle="Subscriptions billing today"
                icon={TrendingUp}
                valueColor="text-green-400"
                iconColor="text-green-400"
              />
              <MetricCard
                title="ARR at list price"
                value={usd(metrics.recurring.arr)}
                subtitle="MRR x 12"
                icon={DollarSign}
                valueColor="text-green-400"
                iconColor="text-green-400"
              />
              <MetricCard
                title="Paying subscribers"
                value={totalSubscribers}
                subtitle={`${metrics.recurring.subscriptions.proMonthly} monthly, ${metrics.recurring.subscriptions.proYearly} yearly, ${metrics.recurring.subscriptions.enterprise} enterprise`}
                icon={Users}
                iconColor="text-[#c4703f]"
              />
              <MetricCard
                title="Unresolved accounts"
                value={metrics.recurring.subscriptions.unknownBillingState}
                subtitle="Paid tier, no subscription status"
                icon={AlertCircle}
                valueColor={
                  metrics.recurring.subscriptions.unknownBillingState > 0
                    ? "text-yellow-400"
                    : "text-white"
                }
                iconColor="text-yellow-400"
              />
            </div>
            <p className="text-gray-500 text-xs mt-3">
              Every subscription is priced at the current list price, because the platform does not
              store what each one is actually charged. Coupons and legacy prices are therefore not
              reflected here. Stripe holds the billed amounts.
            </p>
            {metrics.recurring.subscriptions.unknownBillingState > 0 && (
              <p className="text-gray-500 text-xs mt-2">
                {metrics.recurring.subscriptions.unknownBillingState} account
                {metrics.recurring.subscriptions.unknownBillingState === 1 ? "" : "s"} carry a paid
                tier with no subscription status, so we cannot say whether they are billing. They
                are excluded from MRR rather than counted at list price.
              </p>
            )}
          </div>

          {/* Windowed. Money that actually moved. */}
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Collected in the {windowLabel}</h2>
            <MetricProvenance
              window={`Payments dated in the ${windowLabel}`}
              source={metrics.provenance?.collected}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-3">
              <MetricCard
                title="Net collected"
                value={usd(metrics.collected.net)}
                subtitle="Payments less refunds"
                icon={DollarSign}
                valueColor="text-green-400"
                iconColor="text-green-400"
                sparklineData={metrics.timeSeries?.slice(-7).map((r) => r.revenue)}
                sparklineColor="#3fb883"
              />
              <MetricCard
                title="Payments"
                value={usd(metrics.collected.total)}
                subtitle={`${metrics.collected.paymentCount} succeeded`}
                icon={CreditCard}
                iconColor="text-[#c4703f]"
              />
              <MetricCard
                title="Refunds"
                value={usd(metrics.collected.refunds)}
                subtitle={`${metrics.collected.refundCount} refunded`}
                icon={Receipt}
                valueColor="text-red-400"
                iconColor="text-red-400"
              />
              <MetricCard
                title="Refund share"
                value={`${metrics.collected.refundShareOfEventsPercent.toFixed(1)}%`}
                subtitle="Of payment events in the window"
                icon={Percent}
                iconColor="text-yellow-400"
              />
            </div>
          </div>

          {/* Subscription Type Breakdown. Head counts are point in time; collected is windowed. */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-[#c4703f]" />
                  Pro monthly
                </CardTitle>
                <CardDescription>Billed every month</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-white">
                      {metrics.recurring.subscriptions.proMonthly}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Billing today</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-green-400">
                      {usd(metrics.byType.monthly.collected)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Collected, {windowLabel}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg">
                  <span className="text-gray-400">Contributes to MRR</span>
                  <span className="text-white font-medium">
                    {usd(metrics.recurring.breakdown.proMonthly)}/mo
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-400" />
                  Pro yearly
                </CardTitle>
                <CardDescription>Billed once a year, amortised over twelve months</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-white">
                      {metrics.recurring.subscriptions.proYearly}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Billing today</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-purple-400">
                      {usd(metrics.byType.yearly.collected)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Collected, {windowLabel}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg">
                  <span className="text-gray-400">Contributes to MRR</span>
                  <span className="text-white font-medium">
                    {usd(metrics.recurring.breakdown.proYearly)}/mo
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Chart */}
          {metrics.timeSeries && metrics.timeSeries.length > 0 && (
            <div>
              <TimeSeriesChart
                title="Revenue Trend"
                subtitle={`Daily payments and refunds, ${windowLabel}`}
                data={metrics.timeSeries}
                series={[
                  { key: "revenue", name: "Payments", color: "#3fb883" },
                  { key: "refunds", name: "Refunds", color: "#ef4444" },
                ]}
                icon={DollarSign}
                valueFormatter={(v) => usd(v)}
              />
              <div className="mt-2">
                <MetricProvenance
                  window={`Payments dated in the ${windowLabel}`}
                  source={metrics.provenance?.collected}
                />
              </div>
            </div>
          )}

          {/* Subscription mix. There is deliberately no discounts panel: it used to
              infer a discount from any payment below list price, which counted
              prorations and plan changes as discounts. Stripe holds the real figures. */}
          <DistributionChart
            title="Subscriptions billing today"
            data={typeDistribution}
            type="pie"
            icon={Users}
          />

          {/* Stripe Live Data */}
          {metrics.stripe && (
            <Card className="bg-purple-900/20 border-purple-500/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Live Stripe Balance
                </CardTitle>
                <CardDescription>
                  {metrics.stripe.chargeCount.toLocaleString()} charges created in the {windowLabel}
                  {metrics.stripe.truncated ? ", capped at the first 1,000" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-green-400">{usd(metrics.stripe.available)}</p>
                    <p className="text-xs text-gray-400">Available</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-yellow-400">{usd(metrics.stripe.pending)}</p>
                    <p className="text-xs text-gray-400">Pending</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{usd(metrics.stripe.totalCharges)}</p>
                    <p className="text-xs text-gray-400">Charges in window</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-400">
                      {usd(metrics.stripe.refundedAgainstTheseCharges)}
                    </p>
                    <p className="text-xs text-gray-400">Refunded against them</p>
                  </div>
                </div>
                <p className="text-gray-400 text-xs mt-4">
                  Refunds are attributed to the charge they reverse, not to the date the refund
                  happened, so the last figure is not refunds issued in this window.
                </p>
                <div className="mt-2">
                  <MetricProvenance
                    window={`Charges created in the ${windowLabel}`}
                    source={metrics.provenance?.stripe}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Payments */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Recent Payments</CardTitle>
              <CardDescription>Last 50 payments from Stripe webhooks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-400">
                      <th className="text-left py-2 px-3">Date</th>
                      <th className="text-left py-2 px-3">Type</th>
                      <th className="text-right py-2 px-3">Amount</th>
                      <th className="text-center py-2 px-3">Status</th>
                      <th className="text-left py-2 px-3">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.recentPayments.slice(0, 20).map((payment) => (
                      <tr key={payment.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                        <td className="py-2 px-3 text-gray-300">
                          {new Date(payment.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-2 px-3">
                          <Badge variant="outline" className={
                            payment.type === "one_time"
                              ? "border-purple-500 text-purple-400"
                              : "border-[#c4703f] text-[#c4703f]"
                          }>
                            {payment.type === "one_time" ? "Yearly" : "Monthly"}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-white">
                          ${payment.amount.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <Badge className={
                            payment.status === "succeeded"
                              ? "bg-green-500/20 text-green-400 border-green-500/30"
                              : payment.status === "refunded"
                              ? "bg-red-500/20 text-red-400 border-red-500/30"
                              : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                          }>
                            {payment.status}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-gray-400 truncate max-w-[200px]">
                          {payment.description || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {metrics.recentPayments.length === 0 && (
                <p className="text-center text-gray-500 py-8">
                  No payment history yet. Payments will appear here as they are processed.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Stripe CTA */}
          <Card className="bg-purple-900/20 border-purple-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-semibold">Need more detailed financial data?</h3>
                  <p className="text-purple-300/70 text-sm mt-1">
                    Stripe Dashboard shows invoices, disputes, payouts, and tax information.
                  </p>
                </div>
                <Button
                  onClick={() => window.open("https://dashboard.stripe.com", "_blank")}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Stripe
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
