"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MetricCard, TimeSeriesChart, DistributionChart } from "@/components/admin/charts"
import { DollarSign, TrendingUp, Users, CreditCard, RefreshCw, ExternalLink } from "lucide-react"

export default function RevenuePage() {
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
      console.error("Error loading revenue data:", error)
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

  const tierDistribution = metrics ? [
    { name: "Free", value: metrics.users.byTier.free, color: "#6B7280" },
    { name: "Pro", value: metrics.users.byTier.pro, color: "#FBBF24" },
    { name: "Enterprise", value: metrics.users.byTier.enterprise, color: "#A855F7" },
  ] : []

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white">Revenue</h1>
          <p className="text-gray-400 mt-1">Revenue metrics and subscription analytics</p>
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
            onClick={() => window.open("https://dashboard.stripe.com", "_blank")}
            variant="outline"
            size="sm"
            className="border-gray-700 text-gray-400 hover:text-white"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Stripe Dashboard
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {metrics && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="MRR"
              value={`$${metrics.revenue.mrr.toLocaleString()}`}
              subtitle="Monthly Recurring Revenue"
              icon={DollarSign}
              valueColor="text-green-400"
              iconColor="text-green-400"
              sparklineData={metrics.timeSeries?.revenue.slice(-7).map((r: any) => r.mrr)}
              sparklineColor="#00ff88"
            />
            <MetricCard
              title="ARR"
              value={`$${metrics.revenue.arr.toLocaleString()}`}
              subtitle="Annual Recurring Revenue"
              icon={TrendingUp}
              valueColor="text-green-400"
            />
            <MetricCard
              title="Pro Subscribers"
              value={metrics.users.byTier.pro}
              subtitle={`${((metrics.users.byTier.pro / metrics.users.total) * 100).toFixed(1)}% conversion`}
              icon={Users}
              iconColor="text-yellow-400"
            />
            <MetricCard
              title="ARPU"
              value={metrics.users.byTier.pro > 0 ? `$${(metrics.revenue.mrr / metrics.users.byTier.pro).toFixed(2)}` : "$0"}
              subtitle="Avg Revenue Per User"
              icon={CreditCard}
            />
          </div>

          {/* Revenue Chart */}
          {metrics.timeSeries?.revenue && (
            <TimeSeriesChart
              title="Revenue Trend"
              subtitle="MRR over time"
              data={metrics.timeSeries.revenue}
              series={[{ key: "mrr", name: "MRR", color: "#00ff88" }]}
              icon={DollarSign}
              valueFormatter={(v) => `$${v.toLocaleString()}`}
            />
          )}

          {/* Subscription Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DistributionChart
              title="Subscription Tiers"
              data={tierDistribution}
              type="pie"
              icon={Users}
            />

            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Revenue Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
                  <span className="text-gray-400">Pro Tier Revenue</span>
                  <span className="text-green-400 font-bold">
                    ${(metrics.users.byTier.pro * 25).toLocaleString()}/mo
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg">
                  <span className="text-gray-400">Enterprise Revenue</span>
                  <span className="text-purple-400 font-bold">
                    ${(metrics.users.byTier.enterprise * 100).toLocaleString()}/mo
                  </span>
                </div>
                <div className="border-t border-gray-700 pt-4">
                  <p className="text-xs text-gray-500">
                    Note: This shows calculated revenue based on subscriber counts.
                    For actual charges, refunds, and discounts, use the Stripe Dashboard.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Stripe CTA */}
      <Card className="bg-purple-900/20 border-purple-500/30">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold">Need detailed financial data?</h3>
              <p className="text-purple-300/70 text-sm mt-1">
                Stripe Dashboard shows actual charges, refunds, disputes, discounts, and more.
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
    </div>
  )
}
