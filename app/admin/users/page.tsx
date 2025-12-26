"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MetricCard, TimeSeriesChart, DistributionChart } from "@/components/admin/charts"
import { Users, UserPlus, Crown, Search, RefreshCw } from "lucide-react"

interface UserProfile {
  id: string
  email: string
  full_name?: string
  subscription_tier: string
  created_at: string
  updated_at?: string
}

export default function UsersPage() {
  const { firebaseUser } = useAuth()
  const [metrics, setMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState("30d")
  const [searchQuery, setSearchQuery] = useState("")

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
      console.error("Error loading user data:", error)
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

  const conversionRate = metrics && metrics.users.total > 0
    ? ((metrics.users.byTier.pro / metrics.users.total) * 100).toFixed(1)
    : "0"

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white">Users</h1>
          <p className="text-gray-400 mt-1">User management and analytics</p>
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
            onClick={loadData}
            variant="outline"
            size="sm"
            className="border-gray-700 text-gray-400 hover:text-white"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {metrics && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Users"
              value={metrics.users.total}
              icon={Users}
              sparklineData={metrics.timeSeries?.users.slice(-7).map((u: any) => u.total)}
              sparklineColor="#00d9ff"
            />
            <MetricCard
              title="Pro Users"
              value={metrics.users.byTier.pro}
              subtitle={`${conversionRate}% of total`}
              icon={Crown}
              iconColor="text-yellow-400"
              valueColor="text-yellow-400"
            />
            <MetricCard
              title="Free Users"
              value={metrics.users.byTier.free}
              icon={UserPlus}
            />
            <MetricCard
              title="Enterprise"
              value={metrics.users.byTier.enterprise}
              icon={Users}
              iconColor="text-purple-400"
              valueColor="text-purple-400"
            />
          </div>

          {/* User Growth Chart */}
          {metrics.timeSeries?.users && (
            <TimeSeriesChart
              title="User Growth"
              subtitle="Total users over time"
              data={metrics.timeSeries.users}
              series={[
                { key: "free", name: "Free", color: "#6B7280" },
                { key: "pro", name: "Pro", color: "#FBBF24" },
                { key: "enterprise", name: "Enterprise", color: "#A855F7" },
              ]}
              stacked
              icon={Users}
            />
          )}

          {/* Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DistributionChart
              title="User Distribution"
              data={tierDistribution}
              type="pie"
              icon={Users}
            />

            <Card className="bg-gray-900/50 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Tier Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { tier: "Free", count: metrics.users.byTier.free, color: "gray" },
                  { tier: "Pro", count: metrics.users.byTier.pro, color: "yellow" },
                  { tier: "Enterprise", count: metrics.users.byTier.enterprise, color: "purple" },
                ].map((item) => (
                  <div key={item.tier} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge
                        className={
                          item.color === "yellow"
                            ? "bg-yellow-600/20 text-yellow-400 border-yellow-600/30"
                            : item.color === "purple"
                            ? "bg-purple-600/20 text-purple-400 border-purple-600/30"
                            : "bg-gray-600/20 text-gray-400 border-gray-600/30"
                        }
                      >
                        {item.tier}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-white font-semibold">{item.count}</span>
                      <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            item.color === "yellow"
                              ? "bg-yellow-400"
                              : item.color === "purple"
                              ? "bg-purple-400"
                              : "bg-gray-400"
                          }`}
                          style={{
                            width: `${metrics.users.total > 0 ? (item.count / metrics.users.total) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <span className="text-gray-500 text-sm w-12">
                        {metrics.users.total > 0 ? ((item.count / metrics.users.total) * 100).toFixed(0) : 0}%
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Info Card */}
      <Card className="bg-blue-900/20 border-blue-500/30">
        <CardContent className="p-4">
          <p className="text-blue-300 text-sm">
            Individual user management (view details, change tiers, etc.) can be done directly in the
            Firebase Console → Firestore → profiles collection.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
