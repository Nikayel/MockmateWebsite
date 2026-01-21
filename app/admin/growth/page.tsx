"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MetricCard } from "@/components/admin/charts"
import { PageHeader } from "@/components/admin/shared"
import { Progress } from "@/components/ui/progress"
import {
  ThumbsUp,
  ThumbsDown,
  Users,
  Share2,
  TrendingUp,
  Loader2,
  AlertCircle,
  Meh,
  MessageSquare,
  ArrowUpRight,
  Crown,
  DollarSign,
  Gift,
  Check,
} from "lucide-react"
import {
  typography,
  spacing,
  cardStyles,
  tableStyles,
  badgeVariants,
} from "@/lib/admin/design-system"

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

interface DetailedReferral {
  id: string
  referrerEmail: string
  referrerId: string
  referredEmail: string
  referredUserId: string
  referralCode: string
  signupDate: string
  convertedToPro: boolean
  convertedDate?: string
  signupRewardStatus: "pending" | "paid"
  conversionRewardStatus: "pending" | "credited" | "n/a"
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
  detailedReferrals: DetailedReferral[]
}

interface RewardItem {
  id: string
  referrerId: string
  referredUserId: string
  type: "signup_credit" | "conversion_cash" | "conversion_credit"
  amount: number
  status: string
  createdAt: string
  referrerEmail: string
  referredEmail: string
}

interface RewardsData {
  cashRewards: RewardItem[]
  creditRewards: RewardItem[]
  totals: {
    pendingCash: number
    pendingCredits: number
  }
}

export default function GrowthPage() {
  const { firebaseUser } = useAuth()
  const [npsData, setNpsData] = useState<NPSData | null>(null)
  const [referralData, setReferralData] = useState<ReferralData | null>(null)
  const [rewardsData, setRewardsData] = useState<RewardsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [processingReward, setProcessingReward] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!firebaseUser) return

    setRefreshing(true)
    setError(null)

    try {
      const token = await firebaseUser.getIdToken()

      const [npsRes, referralRes, rewardsRes] = await Promise.all([
        fetch("/api/admin/nps", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/admin/referrals", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/admin/referrals/rewards", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      if (!npsRes.ok || !referralRes.ok) {
        throw new Error("Failed to load growth data")
      }

      const [nps, referrals, rewards] = await Promise.all([
        npsRes.json(),
        referralRes.json(),
        rewardsRes.ok ? rewardsRes.json() : { success: false },
      ])

      if (nps.success) setNpsData(nps.data)
      if (referrals.success) setReferralData(referrals.data)
      if (rewards.success) setRewardsData(rewards.data)
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

  const processReward = async (rewardId: string, notes?: string) => {
    if (!firebaseUser) return

    setProcessingReward(rewardId)
    try {
      const token = await firebaseUser.getIdToken()
      const res = await fetch("/api/admin/referrals/rewards", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rewardId, notes }),
      })

      if (res.ok) {
        // Refresh rewards data
        loadData()
      }
    } catch (error) {
      console.error("Failed to process reward:", error)
    } finally {
      setProcessingReward(null)
    }
  }

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
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#00d9ff]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="text-sm text-red-400">{error}</p>
        <button
          onClick={() => loadData()}
          className="text-sm text-gray-400 underline hover:text-white"
        >
          Try again
        </button>
      </div>
    )
  }

  const totalResponses = npsData?.stats.totalResponses || 0
  const promoterPercent =
    totalResponses > 0 ? ((npsData?.stats.promoters || 0) / totalResponses) * 100 : 0
  const passivePercent =
    totalResponses > 0 ? ((npsData?.stats.passives || 0) / totalResponses) * 100 : 0
  const detractorPercent =
    totalResponses > 0 ? ((npsData?.stats.detractors || 0) / totalResponses) * 100 : 0

  return (
    <div className={spacing.pageGap}>
      {/* Header */}
      <PageHeader
        title="Growth Metrics"
        subtitle="NPS scores and referral tracking"
        onRefresh={loadData}
        refreshing={refreshing}
      />

      {/* NPS Section */}
      <div className={spacing.sectionGap}>
        <h2 className={typography.sectionTitle}>
          <MessageSquare className="h-5 w-5 text-[#00d9ff]" />
          Net Promoter Score (NPS)
        </h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
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
        <Card className={cardStyles.default}>
          <CardHeader className="pb-4">
            <CardTitle className={typography.cardTitle}>Response Distribution</CardTitle>
            <CardDescription className={typography.cardDescription}>
              Promoters (9-10), Passives (7-8), Detractors (0-6)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <ThumbsUp className="h-5 w-5 text-green-400" />
                <div className="flex-1">
                  <div className="mb-1 flex justify-between">
                    <span className="font-medium text-green-400">Promoters</span>
                    <span className="text-gray-400">
                      {npsData?.stats.promoters || 0} ({promoterPercent.toFixed(0)}%)
                    </span>
                  </div>
                  <Progress value={promoterPercent} className="h-2 bg-gray-800" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Meh className="h-5 w-5 text-yellow-400" />
                <div className="flex-1">
                  <div className="mb-1 flex justify-between">
                    <span className="font-medium text-yellow-400">Passives</span>
                    <span className="text-gray-400">
                      {npsData?.stats.passives || 0} ({passivePercent.toFixed(0)}%)
                    </span>
                  </div>
                  <Progress value={passivePercent} className="h-2 bg-gray-800" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <ThumbsDown className="h-5 w-5 text-red-400" />
                <div className="flex-1">
                  <div className="mb-1 flex justify-between">
                    <span className="font-medium text-red-400">Detractors</span>
                    <span className="text-gray-400">
                      {npsData?.stats.detractors || 0} ({detractorPercent.toFixed(0)}%)
                    </span>
                  </div>
                  <Progress value={detractorPercent} className="h-2 bg-gray-800" />
                </div>
              </div>
            </div>

            {/* NPS by Tier */}
            <div className="grid grid-cols-3 gap-4 border-t border-gray-800 pt-4">
              {(["free", "pro", "enterprise"] as const).map((tier) => {
                const tierData = npsData?.stats.responsesByTier[tier]
                return (
                  <div key={tier} className="rounded-lg bg-gray-800/50 p-4 text-center">
                    <Badge className="mb-2" variant={tier === "pro" ? "default" : "outline"}>
                      {tier.charAt(0).toUpperCase() + tier.slice(1)}
                    </Badge>
                    <p className={`text-2xl font-bold ${getNPSColor(tierData?.nps || 0)}`}>
                      {tierData?.nps || 0}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">{tierData?.count || 0} responses</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent NPS Responses */}
        <Card className={cardStyles.default}>
          <CardHeader className="pb-4">
            <CardTitle className={typography.cardTitle}>Recent Responses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {npsData?.recentResponses.slice(0, 10).map((response) => (
                <div
                  key={response.id}
                  className="flex items-start gap-3 rounded-lg bg-gray-800/30 p-3"
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white ${getScoreColor(response.score)}`}
                  >
                    {response.score}
                  </div>
                  <div className="min-w-0 flex-1">
                    {response.feedback ? (
                      <p className="text-sm text-gray-300">&quot;{response.feedback}&quot;</p>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No feedback provided</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      {new Date(response.createdAt).toLocaleDateString()} •{" "}
                      {response.subscriptionTier}
                    </p>
                  </div>
                </div>
              ))}
              {(!npsData?.recentResponses || npsData.recentResponses.length === 0) && (
                <p className="py-8 text-center text-gray-500">No NPS responses yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referral Section */}
      <div className={spacing.sectionGap}>
        <h2 className={typography.sectionTitle}>
          <Share2 className="h-5 w-5 text-purple-400" />
          Referral Program
        </h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
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
            valueColor={
              referralData?.viralCoefficient && referralData.viralCoefficient >= 1
                ? "text-green-400"
                : "text-yellow-400"
            }
          />
          <MetricCard
            title="Organic vs Referred"
            value={`${(((referralData?.referralsBySource.referred || 0) / ((referralData?.referralsBySource.organic || 1) + (referralData?.referralsBySource.referred || 0))) * 100).toFixed(0)}%`}
            subtitle="% from referrals"
            icon={ArrowUpRight}
          />
        </div>

        {/* Top Referrers */}
        <Card className={cardStyles.default}>
          <CardHeader className="pb-4">
            <CardTitle className={typography.cardTitle}>Top Referrers</CardTitle>
            <CardDescription className={typography.cardDescription}>
              Users who have referred the most people
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={tableStyles.container}>
              <table className={tableStyles.table}>
                <thead>
                  <tr className={tableStyles.headerRow}>
                    <th
                      className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-left`}
                    >
                      #
                    </th>
                    <th
                      className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-left`}
                    >
                      Email
                    </th>
                    <th
                      className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-right`}
                    >
                      Referrals
                    </th>
                    <th
                      className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-right`}
                    >
                      Conversions
                    </th>
                    <th
                      className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-right`}
                    >
                      Conv. Rate
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {referralData?.topReferrers.slice(0, 10).map((referrer, idx) => (
                    <tr key={referrer.userId} className={tableStyles.row}>
                      <td className={`${spacing.tableCellPadding} ${typography.tableCellMuted}`}>
                        {idx + 1}
                      </td>
                      <td className={`${spacing.tableCellPadding} ${typography.tableCell}`}>
                        {referrer.email}
                      </td>
                      <td
                        className={`${spacing.tableCellPadding} text-right font-medium text-white tabular-nums`}
                      >
                        {referrer.referralCount}
                      </td>
                      <td
                        className={`${spacing.tableCellPadding} text-right text-green-400 tabular-nums`}
                      >
                        {referrer.conversions}
                      </td>
                      <td
                        className={`${spacing.tableCellPadding} text-right ${typography.tableCellMuted} tabular-nums`}
                      >
                        {referrer.referralCount > 0
                          ? `${((referrer.conversions / referrer.referralCount) * 100).toFixed(0)}%`
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!referralData?.topReferrers || referralData.topReferrers.length === 0) && (
                <p className={tableStyles.emptyState}>No referrals yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* All Referrals - Detailed View */}
        <Card className={cardStyles.default}>
          <CardHeader className="pb-4">
            <CardTitle className={typography.cardTitle}>All Referrals</CardTitle>
            <CardDescription className={typography.cardDescription}>
              Who referred who, signup status, and reward tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={tableStyles.container}>
              <table className={tableStyles.table}>
                <thead>
                  <tr className={tableStyles.headerRow}>
                    <th
                      className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-left`}
                    >
                      Referrer
                    </th>
                    <th
                      className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-left`}
                    >
                      Referred
                    </th>
                    <th
                      className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-left`}
                    >
                      Code
                    </th>
                    <th
                      className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-left`}
                    >
                      Signed Up
                    </th>
                    <th
                      className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-center`}
                    >
                      Pro?
                    </th>
                    <th
                      className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-center`}
                    >
                      $10 Owed
                    </th>
                    <th
                      className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-center`}
                    >
                      Free Month
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {referralData?.detailedReferrals?.map((ref) => (
                    <tr key={ref.id} className={tableStyles.row}>
                      <td className={`${spacing.tableCellPadding} ${typography.tableCell}`}>
                        {ref.referrerEmail}
                      </td>
                      <td className={`${spacing.tableCellPadding} ${typography.tableCellMuted}`}>
                        {ref.referredEmail}
                      </td>
                      <td
                        className={`${spacing.tableCellPadding} font-mono text-xs ${typography.tableCellMuted}`}
                      >
                        {ref.referralCode}
                      </td>
                      <td className={`${spacing.tableCellPadding} ${typography.tableCellMuted}`}>
                        {new Date(ref.signupDate).toLocaleDateString()}
                      </td>
                      <td className={`${spacing.tableCellPadding} text-center`}>
                        {ref.convertedToPro ? (
                          <Badge className={badgeVariants.success}>Pro</Badge>
                        ) : (
                          <Badge variant="outline" className={badgeVariants.muted}>
                            Free
                          </Badge>
                        )}
                      </td>
                      <td className={`${spacing.tableCellPadding} text-center`}>
                        {ref.signupRewardStatus === "paid" ? (
                          <Badge className={badgeVariants.success}>Paid</Badge>
                        ) : (
                          <Badge className={badgeVariants.warning}>Owe $10</Badge>
                        )}
                      </td>
                      <td className={`${spacing.tableCellPadding} text-center`}>
                        {ref.conversionRewardStatus === "credited" ? (
                          <Badge className={badgeVariants.purple}>Credited</Badge>
                        ) : ref.conversionRewardStatus === "pending" ? (
                          <Badge className={badgeVariants.warning}>Pending</Badge>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!referralData?.detailedReferrals ||
                referralData.detailedReferrals.length === 0) && (
                <p className={tableStyles.emptyState}>No referrals yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Weekly Trend */}
        {referralData?.weeklyTrend && referralData.weeklyTrend.length > 0 && (
          <Card className={cardStyles.default}>
            <CardHeader className="pb-4">
              <CardTitle className={typography.cardTitle}>Weekly Referral Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
                {referralData.weeklyTrend.slice(0, 12).map((week) => (
                  <div key={week.week} className="rounded-lg bg-gray-800/50 p-3 text-center">
                    <p className="mb-1 text-xs text-gray-500">{week.week}</p>
                    <p className="text-lg font-bold text-white">{week.referrals}</p>
                    <p className="text-xs text-green-400">{week.conversions} conv</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Rewards Management Section */}
      <div className={spacing.sectionGap}>
        <h2 className={typography.sectionTitle}>
          <Gift className="h-5 w-5 text-yellow-400" />
          Rewards Management
        </h2>

        {/* Rewards Summary */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <MetricCard
            title="Pending Cash Payouts"
            value={`$${rewardsData?.totals.pendingCash || 0}`}
            subtitle={`${rewardsData?.cashRewards.length || 0} rewards waiting`}
            icon={DollarSign}
            valueColor="text-green-400"
          />
          <MetricCard
            title="Pending Free Months"
            value={rewardsData?.totals.pendingCredits || 0}
            subtitle={`${rewardsData?.creditRewards.length || 0} credits waiting`}
            icon={Gift}
            valueColor="text-purple-400"
          />
        </div>

        {/* Cash Rewards Table */}
        <Card className={cardStyles.default}>
          <CardHeader className="pb-4">
            <CardTitle className={typography.cardTitle}>
              <DollarSign className="h-5 w-5 text-green-400" />
              Pending Cash Rewards ($10 per signup)
            </CardTitle>
            <CardDescription className={typography.cardDescription}>
              Manual PayPal payouts to referrers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={tableStyles.container}>
              <table className={tableStyles.table}>
                <thead>
                  <tr className={tableStyles.headerRow}>
                    <th
                      className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-left`}
                    >
                      Referrer
                    </th>
                    <th
                      className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-left`}
                    >
                      Referred User
                    </th>
                    <th
                      className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-right`}
                    >
                      Amount
                    </th>
                    <th
                      className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-left`}
                    >
                      Date
                    </th>
                    <th
                      className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-right`}
                    >
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rewardsData?.cashRewards.map((reward) => (
                    <tr key={reward.id} className={tableStyles.row}>
                      <td className={`${spacing.tableCellPadding} ${typography.tableCell}`}>
                        {reward.referrerEmail}
                      </td>
                      <td className={`${spacing.tableCellPadding} ${typography.tableCellMuted}`}>
                        {reward.referredEmail}
                      </td>
                      <td
                        className={`${spacing.tableCellPadding} text-right font-medium text-green-400 tabular-nums`}
                      >
                        ${reward.amount}
                      </td>
                      <td className={`${spacing.tableCellPadding} ${typography.tableCellMuted}`}>
                        {new Date(reward.createdAt).toLocaleDateString()}
                      </td>
                      <td className={`${spacing.tableCellPadding} text-right`}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => processReward(reward.id)}
                          disabled={processingReward === reward.id}
                          className="border-green-600 text-green-400 hover:bg-green-600/20"
                        >
                          {processingReward === reward.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="mr-1 h-4 w-4" />
                              Mark Paid
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!rewardsData?.cashRewards || rewardsData.cashRewards.length === 0) && (
                <p className={tableStyles.emptyState}>No pending cash rewards</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Credit Rewards Table */}
        <Card className={cardStyles.default}>
          <CardHeader className="pb-4">
            <CardTitle className={typography.cardTitle}>
              <Gift className="h-5 w-5 text-purple-400" />
              Pending Free Month Credits
            </CardTitle>
            <CardDescription className={typography.cardDescription}>
              1 free month when referred user upgrades to Pro
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={tableStyles.container}>
              <table className={tableStyles.table}>
                <thead>
                  <tr className={tableStyles.headerRow}>
                    <th
                      className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-left`}
                    >
                      Referrer
                    </th>
                    <th
                      className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-left`}
                    >
                      Converted User
                    </th>
                    <th
                      className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-right`}
                    >
                      Credit
                    </th>
                    <th
                      className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-left`}
                    >
                      Date
                    </th>
                    <th
                      className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-right`}
                    >
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rewardsData?.creditRewards.map((reward) => (
                    <tr key={reward.id} className={tableStyles.row}>
                      <td className={`${spacing.tableCellPadding} ${typography.tableCell}`}>
                        {reward.referrerEmail}
                      </td>
                      <td className={`${spacing.tableCellPadding} ${typography.tableCellMuted}`}>
                        {reward.referredEmail}
                      </td>
                      <td
                        className={`${spacing.tableCellPadding} text-right font-medium text-purple-400 tabular-nums`}
                      >
                        {reward.amount} month{reward.amount > 1 ? "s" : ""}
                      </td>
                      <td className={`${spacing.tableCellPadding} ${typography.tableCellMuted}`}>
                        {new Date(reward.createdAt).toLocaleDateString()}
                      </td>
                      <td className={`${spacing.tableCellPadding} text-right`}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => processReward(reward.id)}
                          disabled={processingReward === reward.id}
                          className="border-purple-600 text-purple-400 hover:bg-purple-600/20"
                        >
                          {processingReward === reward.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="mr-1 h-4 w-4" />
                              Mark Credited
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!rewardsData?.creditRewards || rewardsData.creditRewards.length === 0) && (
                <p className={tableStyles.emptyState}>No pending free month credits</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
