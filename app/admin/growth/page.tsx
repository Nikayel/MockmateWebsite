"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MetricCard } from "@/components/admin/charts"
import { Progress } from "@/components/ui/progress"
import {
  ThumbsUp,
  ThumbsDown,
  Users,
  Share2,
  TrendingUp,
  RefreshCw,
  Loader2,
  AlertCircle,
  Meh,
  MessageSquare,
  ArrowUpRight,
  Crown,
} from "lucide-react"

interface NPSData {
  stats: {
    totalResponses: number
    averageScore: number
    npsScore: number
    promoters: number
    passives: number
    detractors: number
    responsesByTier: {
      free: { count: number; avgScore: number; nps: number }
      pro: { count: number; avgScore: number; nps: number }
      enterprise: { count: number; avgScore: number; nps: number }
    }
    recentTrend: {
      last7Days: { count: number; nps: number }
      last30Days: { count: number; nps: number }
    }
  }
  recentResponses: Array<{
    id: string
    userId: string
    score: number
    feedback?: string
    subscriptionTier: string
    createdAt: string
  }>
}

interface ReferralData {
  totalReferrals: number
  totalConversions: number
  conversionRate: number
  viralCoefficient: number
  topReferrers: Array<{
    userId: string
    email: string
    referralCount: number
    conversions: number
  }>
  referralsBySource: {
    organic: number
    referred: number
  }
  weeklyTrend: Array<{
    week: string
    referrals: number
    conversions: number
  }>
}

export default function GrowthPage() {
  const { firebaseUser } = useAuth()
  const [npsData, setNpsData] = useState<NPSData | null>(null)
  const [referralData, setReferralData] = useState<ReferralData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!firebaseUser) return

    setRefreshing(true)
    setError(null)

    try {
      const token = await firebaseUser.getIdToken()

      const [npsRes, referralRes] = await Promise.all([
        fetch("/api/admin/nps", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/admin/referrals", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      if (!npsRes.ok || !referralRes.ok) {
        throw new Error("Failed to load growth data")
      }

      const [nps, referrals] = await Promise.all([
        npsRes.json(),
        referralRes.json(),
      ])

      if (nps.success) setNpsData(nps.data)
      if (referrals.success) setReferralData(referrals.data)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to load data")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [firebaseUser])

  useEffect(() => {
    loadData()
  }, [loadData])

  const getNPSColor = (nps: number) => {
    if (nps >= 50) return "text-green-400"
    if (nps >= 0) return "text-yellow-400"
    return "text-red-400"
  }

  const getScoreColor = (score: number) => {
    if (score >= 9) return "bg-green-500"
    if (score >= 7) return "bg-yellow-500"
    return "bg-red-500"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-[#00d9ff]" />
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

  const totalResponses = npsData?.stats.totalResponses || 0
  const promoterPercent = totalResponses > 0 ? (npsData?.stats.promoters || 0) / totalResponses * 100 : 0
  const passivePercent = totalResponses > 0 ? (npsData?.stats.passives || 0) / totalResponses * 100 : 0
  const detractorPercent = totalResponses > 0 ? (npsData?.stats.detractors || 0) / totalResponses * 100 : 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white">Growth Metrics</h1>
          <p className="text-gray-400 mt-1">NPS scores and referral tracking</p>
        </div>

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

      {/* NPS Section */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-[#00d9ff]" />
          Net Promoter Score (NPS)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="NPS Score"
            value={npsData?.stats.npsScore || 0}
            subtitle="Range: -100 to +100"
            icon={TrendingUp}
            valueColor={getNPSColor(npsData?.stats.npsScore || 0)}
          />
          <MetricCard
            title="Total Responses"
            value={npsData?.stats.totalResponses || 0}
            subtitle="All time"
            icon={MessageSquare}
          />
          <MetricCard
            title="Average Score"
            value={(npsData?.stats.averageScore || 0).toFixed(1)}
            subtitle="Out of 10"
            icon={ThumbsUp}
            valueColor="text-[#00d9ff]"
          />
          <MetricCard
            title="7-Day NPS"
            value={npsData?.stats.recentTrend.last7Days.nps || 0}
            subtitle={`${npsData?.stats.recentTrend.last7Days.count || 0} responses`}
            icon={TrendingUp}
            valueColor={getNPSColor(npsData?.stats.recentTrend.last7Days.nps || 0)}
          />
        </div>

        {/* NPS Distribution */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Response Distribution</CardTitle>
            <CardDescription>Promoters (9-10), Passives (7-8), Detractors (0-6)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <ThumbsUp className="h-5 w-5 text-green-400" />
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-green-400 font-medium">Promoters</span>
                    <span className="text-gray-400">{npsData?.stats.promoters || 0} ({promoterPercent.toFixed(0)}%)</span>
                  </div>
                  <Progress value={promoterPercent} className="h-2 bg-gray-800" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Meh className="h-5 w-5 text-yellow-400" />
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-yellow-400 font-medium">Passives</span>
                    <span className="text-gray-400">{npsData?.stats.passives || 0} ({passivePercent.toFixed(0)}%)</span>
                  </div>
                  <Progress value={passivePercent} className="h-2 bg-gray-800" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <ThumbsDown className="h-5 w-5 text-red-400" />
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-red-400 font-medium">Detractors</span>
                    <span className="text-gray-400">{npsData?.stats.detractors || 0} ({detractorPercent.toFixed(0)}%)</span>
                  </div>
                  <Progress value={detractorPercent} className="h-2 bg-gray-800" />
                </div>
              </div>
            </div>

            {/* NPS by Tier */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-800">
              {(['free', 'pro', 'enterprise'] as const).map((tier) => {
                const tierData = npsData?.stats.responsesByTier[tier]
                return (
                  <div key={tier} className="bg-gray-800/50 rounded-lg p-4 text-center">
                    <Badge className="mb-2" variant={tier === 'pro' ? 'default' : 'outline'}>
                      {tier.charAt(0).toUpperCase() + tier.slice(1)}
                    </Badge>
                    <p className={`text-2xl font-bold ${getNPSColor(tierData?.nps || 0)}`}>
                      {tierData?.nps || 0}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{tierData?.count || 0} responses</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent NPS Responses */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Recent Responses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {npsData?.recentResponses.slice(0, 10).map((response) => (
                <div key={response.id} className="flex items-start gap-3 p-3 bg-gray-800/30 rounded-lg">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${getScoreColor(response.score)}`}>
                    {response.score}
                  </div>
                  <div className="flex-1 min-w-0">
                    {response.feedback ? (
                      <p className="text-gray-300 text-sm">&quot;{response.feedback}&quot;</p>
                    ) : (
                      <p className="text-gray-500 text-sm italic">No feedback provided</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(response.createdAt).toLocaleDateString()} • {response.subscriptionTier}
                    </p>
                  </div>
                </div>
              ))}
              {(!npsData?.recentResponses || npsData.recentResponses.length === 0) && (
                <p className="text-center text-gray-500 py-8">No NPS responses yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referral Section */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Share2 className="h-5 w-5 text-purple-400" />
          Referral Program
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Referrals"
            value={referralData?.totalReferrals || 0}
            subtitle="Users who came via referral"
            icon={Users}
            iconColor="text-purple-400"
          />
          <MetricCard
            title="Conversions"
            value={referralData?.totalConversions || 0}
            subtitle={`${(referralData?.conversionRate || 0).toFixed(1)}% conversion rate`}
            icon={Crown}
            valueColor="text-green-400"
          />
          <MetricCard
            title="Viral Coefficient"
            value={(referralData?.viralCoefficient || 0).toFixed(2)}
            subtitle="Referrals per user"
            icon={TrendingUp}
            valueColor={referralData?.viralCoefficient && referralData.viralCoefficient >= 1 ? "text-green-400" : "text-yellow-400"}
          />
          <MetricCard
            title="Organic vs Referred"
            value={`${((referralData?.referralsBySource.referred || 0) / ((referralData?.referralsBySource.organic || 1) + (referralData?.referralsBySource.referred || 0)) * 100).toFixed(0)}%`}
            subtitle="% from referrals"
            icon={ArrowUpRight}
          />
        </div>

        {/* Top Referrers */}
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Top Referrers</CardTitle>
            <CardDescription>Users who have referred the most people</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400">
                    <th className="text-left py-2 px-3">#</th>
                    <th className="text-left py-2 px-3">Email</th>
                    <th className="text-right py-2 px-3">Referrals</th>
                    <th className="text-right py-2 px-3">Conversions</th>
                    <th className="text-right py-2 px-3">Conv. Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {referralData?.topReferrers.slice(0, 10).map((referrer, idx) => (
                    <tr key={referrer.userId} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="py-2 px-3 text-gray-500">{idx + 1}</td>
                      <td className="py-2 px-3 text-gray-300">{referrer.email}</td>
                      <td className="py-2 px-3 text-right text-white font-medium">{referrer.referralCount}</td>
                      <td className="py-2 px-3 text-right text-green-400">{referrer.conversions}</td>
                      <td className="py-2 px-3 text-right text-gray-400">
                        {referrer.referralCount > 0
                          ? `${(referrer.conversions / referrer.referralCount * 100).toFixed(0)}%`
                          : '-'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!referralData?.topReferrers || referralData.topReferrers.length === 0) && (
                <p className="text-center text-gray-500 py-8">No referrals yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Weekly Trend */}
        {referralData?.weeklyTrend && referralData.weeklyTrend.length > 0 && (
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Weekly Referral Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {referralData.weeklyTrend.slice(0, 12).map((week) => (
                  <div key={week.week} className="bg-gray-800/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500 mb-1">{week.week}</p>
                    <p className="text-lg font-bold text-white">{week.referrals}</p>
                    <p className="text-xs text-green-400">{week.conversions} conv</p>
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
