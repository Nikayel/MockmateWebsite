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
  RefreshCw,
  ExternalLink,
  Calendar,
  Loader2,
  AlertCircle,
  Percent,
  Receipt,
} from "lucide-react"
import { logger } from "@/lib/logger"

interface RevenueData {
  actual: {
    total_collected: number
    mrr_equivalent: number
    refunds: number
    net_revenue: number
  }
  calculated: {
    mrr: number
    arr: number
  }
  byType: {
    monthly: {
      subscribers: number
      revenue: number
      avgPayment: number
    }
    yearly: {
      subscribers: number
      revenue: number
      avgPayment: number
      mrrEquivalent: number
    }
  }
  discounts: {
    paymentsWithDiscount: number
    totalDiscountAmount: number
    avgDiscountPercent: number
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
    totalRefunds: number
    chargeCount: number
  }
}

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
    { name: "Monthly", value: metrics.byType.monthly.subscribers, color: "#00d9ff" },
    { name: "Yearly", value: metrics.byType.yearly.subscribers, color: "#A855F7" },
  ] : []

  const totalSubscribers = (metrics?.byType.monthly.subscribers || 0) + (metrics?.byType.yearly.subscribers || 0)

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        title="Revenue"
        subtitle="Actual revenue from Stripe payments"
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

      {/* Key Metrics - Actual Revenue */}
      {metrics && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Net Revenue"
              value={`$${metrics.actual.net_revenue.toLocaleString()}`}
              subtitle={`${timeRange === "all" ? "All time" : `Last ${timeRange}`}`}
              icon={DollarSign}
              valueColor="text-green-400"
              iconColor="text-green-400"
              sparklineData={metrics.timeSeries?.slice(-7).map((r) => r.revenue)}
              sparklineColor="#00ff88"
            />
            <MetricCard
              title="MRR (Actual)"
              value={`$${metrics.actual.mrr_equivalent.toLocaleString()}`}
              subtitle="Based on actual payments"
              icon={TrendingUp}
              valueColor="text-green-400"
            />
            <MetricCard
              title="Total Subscribers"
              value={totalSubscribers}
              subtitle={`${metrics.byType.monthly.subscribers} monthly, ${metrics.byType.yearly.subscribers} yearly`}
              icon={Users}
              iconColor="text-[#00d9ff]"
            />
            <MetricCard
              title="Refunds"
              value={`$${metrics.actual.refunds.toLocaleString()}`}
              subtitle={`${timeRange === "all" ? "All time" : `Last ${timeRange}`}`}
              icon={Receipt}
              iconColor="text-red-400"
            />
          </div>

          {/* Subscription Type Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly vs Yearly Cards */}
            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-[#00d9ff]" />
                  Monthly Subscriptions
                </CardTitle>
                <CardDescription>$25/month recurring</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-white">{metrics.byType.monthly.subscribers}</p>
                    <p className="text-xs text-gray-400 mt-1">Subscribers</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-green-400">${metrics.byType.monthly.revenue.toLocaleString()}</p>
                    <p className="text-xs text-gray-400 mt-1">Total Revenue</p>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg">
                  <span className="text-gray-400">Avg Payment</span>
                  <span className="text-white font-medium">${metrics.byType.monthly.avgPayment.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-400" />
                  Yearly Subscriptions
                </CardTitle>
                <CardDescription>$225/year (25% savings)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-white">{metrics.byType.yearly.subscribers}</p>
                    <p className="text-xs text-gray-400 mt-1">Subscribers</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-purple-400">${metrics.byType.yearly.revenue.toLocaleString()}</p>
                    <p className="text-xs text-gray-400 mt-1">Total Revenue</p>
                  </div>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg">
                  <span className="text-gray-400">MRR Equivalent</span>
                  <span className="text-white font-medium">${metrics.byType.yearly.mrrEquivalent.toFixed(2)}/mo</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Chart */}
          {metrics.timeSeries && metrics.timeSeries.length > 0 && (
            <TimeSeriesChart
              title="Revenue Trend"
              subtitle="Daily revenue from actual payments"
              data={metrics.timeSeries}
              series={[
                { key: "revenue", name: "Revenue", color: "#00ff88" },
                { key: "refunds", name: "Refunds", color: "#ef4444" },
              ]}
              icon={DollarSign}
              valueFormatter={(v) => `$${v.toLocaleString()}`}
            />
          )}

          {/* Discounts & Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DistributionChart
              title="Subscription Types"
              data={typeDistribution}
              type="pie"
              icon={Users}
            />

            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Percent className="h-5 w-5 text-yellow-400" />
                  Discounts Applied
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <p className="text-2xl font-bold text-yellow-400">{metrics.discounts.paymentsWithDiscount}</p>
                    <p className="text-xs text-gray-400 mt-1">Discounted Payments</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <p className="text-2xl font-bold text-yellow-400">${metrics.discounts.totalDiscountAmount}</p>
                    <p className="text-xs text-gray-400 mt-1">Total Discounts</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <p className="text-2xl font-bold text-yellow-400">{metrics.discounts.avgDiscountPercent}%</p>
                    <p className="text-xs text-gray-400 mt-1">Avg Discount</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Calculated vs Actual Comparison */}
          <Card className="bg-blue-900/20 border-blue-500/30">
            <CardHeader>
              <CardTitle className="text-white">Calculated vs Actual Revenue</CardTitle>
              <CardDescription>Comparing subscriber-based estimates to actual payments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-sm text-gray-400">Calculated MRR (from subscriber counts)</p>
                  <p className="text-2xl font-bold text-gray-300">${metrics.calculated.mrr.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Based on {totalSubscribers} Pro subscribers x $25/mo</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-400">Actual MRR (from payments)</p>
                  <p className="text-2xl font-bold text-green-400">${metrics.actual.mrr_equivalent.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Includes yearly plans prorated + discounts</p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
                <p className="text-xs text-gray-400">
                  Difference of <span className="text-white font-medium">
                    ${Math.abs(metrics.calculated.mrr - metrics.actual.mrr_equivalent).toFixed(2)}
                  </span> due to yearly subscriptions, discounts, and payment timing.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Stripe Live Data */}
          {metrics.stripe && (
            <Card className="bg-purple-900/20 border-purple-500/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Live Stripe Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-green-400">${metrics.stripe.available.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">Available</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-yellow-400">${metrics.stripe.pending.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">Pending</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">${metrics.stripe.totalCharges.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">Total Charges</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-400">${metrics.stripe.totalRefunds.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">Refunds</p>
                  </div>
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
                              : "border-[#00d9ff] text-[#00d9ff]"
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
