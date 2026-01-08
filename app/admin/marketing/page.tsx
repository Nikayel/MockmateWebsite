"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MetricCard } from "@/components/admin/charts"
import {
  Target,
  RefreshCw,
  Users,
  TrendingUp,
  Globe,
  Link,
  BarChart3,
  MousePointer,
} from "lucide-react"
import { logger } from "@/lib/logger"

interface MarketingData {
  overview: {
    totalEvents: number
    totalSignups: number
    paidConversions: number
    conversionRate: number
  }
  utmBreakdown: {
    sources: Array<{ source: string; count: number }>
    mediums: Array<{ medium: string; count: number }>
    campaigns: Array<{ campaign: string; count: number }>
  }
  referrers: Array<{ domain: string; count: number }>
  channelPerformance: Array<{ channel: string; signups: number; conversions: number }>
}

export default function MarketingPage() {
  const { firebaseUser } = useAuth()
  const [data, setData] = useState<MarketingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [timeRange, setTimeRange] = useState("30d")

  const loadData = useCallback(
    async (showRefreshing = false) => {
      if (!firebaseUser) return
      if (showRefreshing) setRefreshing(true)

      try {
        const token = await firebaseUser.getIdToken()
        const response = await fetch(`/api/admin/marketing?timeRange=${timeRange}`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (response.ok) {
          const result = await response.json()
          if (result.success) setData(result.marketing)
        }
      } catch (error) {
        logger.error("Error loading marketing data", { error })
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [firebaseUser, timeRange]
  )

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#00d9ff]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-white">Marketing & Acquisition</h1>
          <p className="mt-1 text-gray-400">
            Track campaigns, UTM parameters, and conversion rates
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex gap-1 rounded-lg bg-gray-900 p-1">
            {["7d", "30d", "90d", "all"].map((range) => (
              <Button
                key={range}
                size="sm"
                variant={timeRange === range ? "default" : "ghost"}
                onClick={() => setTimeRange(range)}
                className={timeRange === range ? "bg-[#00d9ff] text-black" : "text-gray-400"}
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
            className="border-gray-700 text-gray-400"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <MetricCard
          title="Total Events"
          value={data?.overview.totalEvents.toLocaleString() || "0"}
          subtitle="Tracked interactions"
          icon={MousePointer}
        />
        <MetricCard
          title="Signups"
          value={data?.overview.totalSignups.toLocaleString() || "0"}
          subtitle="New registrations"
          icon={Users}
          valueColor="text-[#00d9ff]"
        />
        <MetricCard
          title="Paid Conversions"
          value={data?.overview.paidConversions.toLocaleString() || "0"}
          subtitle="To paid plans"
          icon={TrendingUp}
          valueColor="text-green-400"
        />
        <MetricCard
          title="Conversion Rate"
          value={`${data?.overview.conversionRate || 0}%`}
          subtitle="Signup to paid"
          icon={Target}
          valueColor="text-yellow-400"
        />
      </div>

      {/* UTM Sources & Campaigns */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-gray-800 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Globe className="h-5 w-5 text-[#00d9ff]" />
              Top Traffic Sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.utmBreakdown.sources.length === 0 ? (
              <p className="py-8 text-center text-gray-400">No UTM data tracked yet</p>
            ) : (
              <div className="space-y-3">
                {data?.utmBreakdown.sources.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-white">{item.source}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-32 overflow-hidden rounded-full bg-gray-700">
                        <div
                          className="h-full rounded-full bg-[#00d9ff]"
                          style={{
                            width: `${(item.count / (data?.utmBreakdown.sources[0]?.count || 1)) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="w-12 text-right text-gray-400">{item.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-gray-800 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <BarChart3 className="h-5 w-5 text-[#00d9ff]" />
              Top Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.utmBreakdown.campaigns.length === 0 ? (
              <p className="py-8 text-center text-gray-400">No campaigns tracked yet</p>
            ) : (
              <div className="space-y-3">
                {data?.utmBreakdown.campaigns.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="max-w-[200px] truncate text-white">{item.campaign}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-32 overflow-hidden rounded-full bg-gray-700">
                        <div
                          className="h-full rounded-full bg-purple-400"
                          style={{
                            width: `${(item.count / (data?.utmBreakdown.campaigns[0]?.count || 1)) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="w-12 text-right text-gray-400">{item.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Referrers & Channel Performance */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-gray-800 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Link className="h-5 w-5 text-[#00d9ff]" />
              Top Referrers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.referrers.length === 0 ? (
              <p className="py-8 text-center text-gray-400">No referrer data yet</p>
            ) : (
              <div className="space-y-3">
                {data?.referrers.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-white">{item.domain}</span>
                    <span className="text-gray-400">{item.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-gray-800 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <TrendingUp className="h-5 w-5 text-[#00d9ff]" />
              Channel Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data?.channelPerformance.map((channel, i) => (
                <div key={i} className="rounded-lg bg-gray-800/50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-medium text-white">{channel.channel}</span>
                    <span className="text-sm text-green-400">
                      {channel.signups > 0
                        ? Math.round((channel.conversions / channel.signups) * 100)
                        : 0}
                      % conv.
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span>{channel.signups} signups</span>
                    <span>{channel.conversions} conversions</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
