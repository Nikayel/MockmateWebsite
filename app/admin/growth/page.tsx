"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
// Type-only import: erased at compile time, so this client component never
// pulls lib/referrals (and firebase-admin) into the browser bundle. It buys
// compile-time exhaustiveness over the status union without a runtime import.
import type { DetailedRewardStatus } from "@/lib/referrals"
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
  // Raw status drives the badge colour; the words come from the server so the
  // page cannot invent a vocabulary the service never writes.
  signupRewardStatus: DetailedRewardStatus
  conversionRewardStatus: DetailedRewardStatus
  signupRewardLabel: string
  conversionRewardLabel: string
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
  type: string
  amount: number
  status: string
  createdAt: string
  referrerEmail: string
  referredEmail: string
  /** Rendered server-side from the reward's own type, so a $10 row can never print as months. */
  amountLabel: string
  typeLabel: string
}

interface RewardsData {
  cashRewards: RewardItem[]
  creditRewards: RewardItem[]
  totals: {
    pendingCash: number
    pendingCredits: number
  }
}

interface RedemptionActionProps {
  reference: string
  onReferenceChange: (value: string) => void
  onRecord: () => void
  processing: boolean
  error?: string
  accentClassName: string
}

/**
 * The reference input is not optional decoration. Without it the record
 * reconciles against nothing and the button is pure self-attestation, so the
 * action stays disabled until one is entered and the server rejects a blank
 * one independently.
 */
function RedemptionAction({
  reference,
  onReferenceChange,
  onRecord,
  processing,
  error,
  accentClassName,
}: RedemptionActionProps) {
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center justify-end gap-2">
        <Input
          value={reference}
          onChange={(event) => onReferenceChange(event.target.value)}
          placeholder="Payout or credit reference"
          aria-label="Redemption reference"
          disabled={processing}
          className="h-8 w-52 border-gray-700 bg-gray-900 text-xs"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={onRecord}
          disabled={processing || !reference.trim()}
          className={accentClassName}
        >
          {processing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Check className="mr-1 h-4 w-4" />
              Record
            </>
          )}
        </Button>
      </div>
      {error && (
        <p role="alert" className="max-w-xs text-right text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  )
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
  // Per-row redemption reference and per-row failure. The action used to
  // discard non-2xx responses entirely, so a rejected request looked exactly
  // like a successful one.
  const [referenceDrafts, setReferenceDrafts] = useState<Record<string, string>>({})
  const [rewardErrors, setRewardErrors] = useState<Record<string, string>>({})

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

  /**
   * Record that a reward was redeemed out of band.
   *
   * This does NOT pay anyone or grant anything. There is no payout integration
   * and no subscription-granting path in the product, so the button writes a
   * bookkeeping record against a reference and the reward stays on the books
   * as owed until a human actually delivers it.
   */
  const recordRedemption = async (rewardId: string) => {
    if (!firebaseUser) return

    const reference = (referenceDrafts[rewardId] || "").trim()
    if (!reference) {
      setRewardErrors((prev) => ({
        ...prev,
        [rewardId]: "Enter the payout or credit reference before recording this.",
      }))
      return
    }

    setProcessingReward(rewardId)
    setRewardErrors((prev) => {
      const next = { ...prev }
      delete next[rewardId]
      return next
    })

    try {
      const token = await firebaseUser.getIdToken()
      const res = await fetch("/api/admin/referrals/rewards", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rewardId, reference }),
      })

      const payload = await res.json().catch(() => null)

      if (!res.ok || !payload?.success) {
        setRewardErrors((prev) => ({
          ...prev,
          [rewardId]: payload?.error || `Request failed (${res.status})`,
        }))
        return
      }

      setReferenceDrafts((prev) => {
        const next = { ...prev }
        delete next[rewardId]
        return next
      })
      await loadData()
    } catch (error) {
      setRewardErrors((prev) => ({
        ...prev,
        [rewardId]: error instanceof Error ? error.message : "Failed to record redemption",
      }))
    } finally {
      setProcessingReward(null)
    }
  }

  /**
   * Colour only. The words come from the server. Keyed by the full status
   * union so a new status is a compile error here rather than a blank badge.
   */
  const rewardStatusBadge: Record<DetailedRewardStatus, string> = {
    none: badgeVariants.muted,
    pending: badgeVariants.warning,
    redemption_recorded: badgeVariants.success,
    expired: badgeVariants.muted,
    voided: badgeVariants.error,
    // Closed by the old action, which recorded no reference and delivered
    // nothing. Deliberately not green.
    credited: badgeVariants.orange,
    paid: badgeVariants.orange,
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
        <Loader2 className="h-10 w-10 animate-spin text-[#c4703f]" />
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

  // Share of signups that came through a referral. The old inline expression
  // substituted 1 for an organic count of 0, so a real zero silently became a
  // denominator of 1 and skewed the percentage. Null means there is nothing to
  // divide, which is a different fact from 0%.
  const organicSignups = referralData?.referralsBySource.organic ?? 0
  const referredSignups = referralData?.referralsBySource.referred ?? 0
  const totalSignups = organicSignups + referredSignups
  const referredShare = totalSignups > 0 ? (referredSignups / totalSignups) * 100 : null

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
          <MessageSquare className="h-5 w-5 text-[#c4703f]" />
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
            valueColor="text-[#c4703f]"
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
            value={referredShare === null ? "No data" : `${referredShare.toFixed(0)}%`}
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
              Who referred who, signup status, and reward tracking. The signup reward is 1 free
              month. The $10 is earned only when a referred user upgrades to Pro.
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
                      Signup reward
                    </th>
                    <th
                      className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-center`}
                    >
                      Upgrade reward
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
                        <Badge className={rewardStatusBadge[ref.signupRewardStatus]}>
                          {ref.signupRewardLabel}
                        </Badge>
                      </td>
                      <td className={`${spacing.tableCellPadding} text-center`}>
                        <Badge className={rewardStatusBadge[ref.conversionRewardStatus]}>
                          {ref.conversionRewardLabel}
                        </Badge>
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

        {/* What this surface can and cannot do. The buttons below used to read
            as fulfilment; nothing in the product applies a free month or sends
            money, so saying so here is what stops an operator believing a
            reward has been delivered. */}
        <Card className="border-yellow-500/30 bg-yellow-500/10">
          <CardContent className="flex items-start gap-4 pt-6">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-400" />
            <div className="space-y-1">
              <p className="font-medium text-yellow-400">Recording is bookkeeping, not payment</p>
              <p className="text-sm text-gray-300">
                CodeSparring has no payout integration and no path that applies a subscription
                credit. Pay the referrer or extend their subscription by hand first, then record it
                here with the reference so the two can be reconciled. Recording does not settle the
                balance, and the reward stays counted as owed until redemption is automated.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Rewards Summary */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <MetricCard
            title="Cash Owed to Referrers"
            value={`$${rewardsData?.totals.pendingCash || 0}`}
            subtitle={`${rewardsData?.cashRewards.length || 0} awaiting manual payout`}
            icon={DollarSign}
            valueColor="text-green-400"
          />
          <MetricCard
            title="Free Months Owed"
            value={rewardsData?.totals.pendingCredits || 0}
            subtitle={`${rewardsData?.creditRewards.length || 0} awaiting manual credit`}
            icon={Gift}
            valueColor="text-purple-400"
          />
        </div>

        {/* Cash Rewards Table */}
        <Card className={cardStyles.default}>
          <CardHeader className="pb-4">
            <CardTitle className={typography.cardTitle}>
              <DollarSign className="h-5 w-5 text-green-400" />
              Cash Rewards Owed
            </CardTitle>
            <CardDescription className={typography.cardDescription}>
              $10 earned when a referred user upgrades to Pro. Paid by hand, then recorded here.
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
                        {reward.amountLabel}
                      </td>
                      <td className={`${spacing.tableCellPadding} ${typography.tableCellMuted}`}>
                        {new Date(reward.createdAt).toLocaleDateString()}
                      </td>
                      <td className={`${spacing.tableCellPadding} text-right`}>
                        <RedemptionAction
                          reference={referenceDrafts[reward.id] || ""}
                          onReferenceChange={(value) =>
                            setReferenceDrafts((prev) => ({ ...prev, [reward.id]: value }))
                          }
                          onRecord={() => recordRedemption(reward.id)}
                          processing={processingReward === reward.id}
                          error={rewardErrors[reward.id]}
                          accentClassName="border-green-600 text-green-400 hover:bg-green-600/20"
                        />
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
              Free Months Owed
            </CardTitle>
            <CardDescription className={typography.cardDescription}>
              1 free month per signup, plus 1 more when that user upgrades to Pro. Applied by hand,
              then recorded here.
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
                      className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-left`}
                    >
                      Earned for
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
                      {/* Both signup and upgrade credits land in this table, and
                          they are earned for different things. */}
                      <td className={`${spacing.tableCellPadding} ${typography.tableCellMuted}`}>
                        {reward.typeLabel}
                      </td>
                      <td
                        className={`${spacing.tableCellPadding} text-right font-medium text-purple-400 tabular-nums`}
                      >
                        {reward.amountLabel}
                      </td>
                      <td className={`${spacing.tableCellPadding} ${typography.tableCellMuted}`}>
                        {new Date(reward.createdAt).toLocaleDateString()}
                      </td>
                      <td className={`${spacing.tableCellPadding} text-right`}>
                        <RedemptionAction
                          reference={referenceDrafts[reward.id] || ""}
                          onReferenceChange={(value) =>
                            setReferenceDrafts((prev) => ({ ...prev, [reward.id]: value }))
                          }
                          onRecord={() => recordRedemption(reward.id)}
                          processing={processingReward === reward.id}
                          error={rewardErrors[reward.id]}
                          accentClassName="border-purple-600 text-purple-400 hover:bg-purple-600/20"
                        />
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
