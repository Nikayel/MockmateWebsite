"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MetricCard } from "@/components/admin/charts"
import { PageHeader } from "@/components/admin/shared"
import {
  CreditCard,
  Loader2,
  AlertCircle,
  DollarSign,
  TrendingDown,
  Activity,
  CheckCircle,
  Webhook,
  Ban,
} from "lucide-react"
import {
  typography,
  spacing,
  cardStyles,
  tableStyles,
  badgeVariants,
} from "@/lib/admin/design-system"

interface PaymentRecord {
  id: string
  userId: string
  userEmail?: string
  type: 'subscription' | 'one_time'
  amount: number
  currency: string
  status: 'succeeded' | 'failed' | 'refunded'
  description?: string
  createdAt: string
}

interface WebhookEvent {
  id: string
  eventType: string
  processedAt: string
  eventId: string
}

interface VoidedReward {
  id: string
  referrerId: string
  referrerEmail: string
  referredUserId: string
  referredEmail: string
  type: 'signup_cash' | 'conversion_credit'
  amount: number
  voidedReason: string
  processedAt: string
}

interface PaymentStats {
  totalRevenue: number
  totalRefunds: number
  netRevenue: number
  paymentCount: number
  refundCount: number
  refundRate: number
  recentPayments: PaymentRecord[]
  recentRefunds: PaymentRecord[]
  recentWebhooks: WebhookEvent[]
  voidedRewards: VoidedReward[]
}

export default function PaymentsPage() {
  const { firebaseUser } = useAuth()
  const [data, setData] = useState<PaymentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!firebaseUser) return

    setRefreshing(true)
    setError(null)

    try {
      const token = await firebaseUser.getIdToken()
      const response = await fetch("/api/admin/payments", {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        throw new Error("Failed to load payment data")
      }

      const result = await response.json()
      if (result.success) {
        setData(result.data)
      }
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

  const getWebhookBadgeVariant = (eventType: string) => {
    if (eventType.includes('succeeded') || eventType.includes('paid')) {
      return badgeVariants.success
    }
    if (eventType.includes('failed') || eventType.includes('refund')) {
      return badgeVariants.error
    }
    return badgeVariants.info
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-[#c4703f]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={() => loadData()}
          className="text-sm text-gray-400 hover:text-white underline"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className={spacing.pageGap}>
      {/* Header */}
      <PageHeader
        title="Payments & Webhooks"
        subtitle="Monitor payments, refunds, and Stripe webhook activity"
        onRefresh={loadData}
        refreshing={refreshing}
      />

      {/* Revenue Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Revenue"
          value={`$${(data?.totalRevenue || 0).toFixed(2)}`}
          subtitle={`${data?.paymentCount || 0} payments`}
          icon={DollarSign}
          valueColor="text-green-400"
          iconColor="text-green-400"
        />
        <MetricCard
          title="Total Refunds"
          value={`$${(data?.totalRefunds || 0).toFixed(2)}`}
          subtitle={`${data?.refundCount || 0} refunds`}
          icon={TrendingDown}
          valueColor="text-red-400"
          iconColor="text-red-400"
        />
        <MetricCard
          title="Net Revenue"
          value={`$${(data?.netRevenue || 0).toFixed(2)}`}
          subtitle="Revenue - Refunds"
          icon={CreditCard}
          valueColor="text-[#c4703f]"
        />
        <MetricCard
          title="Refund Rate"
          value={`${(data?.refundRate || 0).toFixed(1)}%`}
          subtitle="Refunds / Payments"
          icon={Activity}
          valueColor={data?.refundRate && data.refundRate > 5 ? "text-red-400" : "text-green-400"}
        />
      </div>

      {/* Recent Payments */}
      <Card className={cardStyles.default}>
        <CardHeader className="pb-4">
          <CardTitle className={typography.cardTitle}>
            <CheckCircle className="h-5 w-5 text-green-400" />
            Recent Payments
          </CardTitle>
          <CardDescription className={typography.cardDescription}>
            Successful payments from Stripe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={tableStyles.container}>
            <table className={tableStyles.table}>
              <thead>
                <tr className={tableStyles.headerRow}>
                  <th className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-left`}>User</th>
                  <th className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-left`}>Type</th>
                  <th className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-right`}>Amount</th>
                  <th className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-left`}>Description</th>
                  <th className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-left`}>Date</th>
                </tr>
              </thead>
              <tbody>
                {data?.recentPayments.map((payment) => (
                  <tr key={payment.id} className={tableStyles.row}>
                    <td className={`${spacing.tableCellPadding} ${typography.tableCell}`}>
                      {payment.userEmail || payment.userId}
                    </td>
                    <td className={spacing.tableCellPadding}>
                      <Badge variant="outline" className={badgeVariants.muted}>
                        {payment.type}
                      </Badge>
                    </td>
                    <td className={`${spacing.tableCellPadding} text-right text-green-400 font-medium tabular-nums`}>
                      ${payment.amount.toFixed(2)}
                    </td>
                    <td className={`${spacing.tableCellPadding} ${typography.tableCellMuted} truncate max-w-[200px]`}>
                      {payment.description || '-'}
                    </td>
                    <td className={`${spacing.tableCellPadding} ${typography.tableCellMuted}`}>
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!data?.recentPayments || data.recentPayments.length === 0) && (
              <p className={tableStyles.emptyState}>No recent payments</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Refunds */}
      <Card className={cardStyles.default}>
        <CardHeader className="pb-4">
          <CardTitle className={typography.cardTitle}>
            <TrendingDown className="h-5 w-5 text-red-400" />
            Recent Refunds
          </CardTitle>
          <CardDescription className={typography.cardDescription}>
            Refunds processed through Stripe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={tableStyles.container}>
            <table className={tableStyles.table}>
              <thead>
                <tr className={tableStyles.headerRow}>
                  <th className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-left`}>User</th>
                  <th className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-right`}>Amount</th>
                  <th className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-left`}>Description</th>
                  <th className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-left`}>Date</th>
                </tr>
              </thead>
              <tbody>
                {data?.recentRefunds.map((refund) => (
                  <tr key={refund.id} className={tableStyles.row}>
                    <td className={`${spacing.tableCellPadding} ${typography.tableCell}`}>
                      {refund.userEmail || refund.userId}
                    </td>
                    <td className={`${spacing.tableCellPadding} text-right text-red-400 font-medium tabular-nums`}>
                      -${refund.amount.toFixed(2)}
                    </td>
                    <td className={`${spacing.tableCellPadding} ${typography.tableCellMuted}`}>
                      {refund.description || '-'}
                    </td>
                    <td className={`${spacing.tableCellPadding} ${typography.tableCellMuted}`}>
                      {new Date(refund.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!data?.recentRefunds || data.recentRefunds.length === 0) && (
              <p className={tableStyles.emptyState}>No recent refunds</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Voided Rewards (Clawbacks) */}
      <Card className={cardStyles.default}>
        <CardHeader className="pb-4">
          <CardTitle className={typography.cardTitle}>
            <Ban className="h-5 w-5 text-orange-400" />
            Voided Rewards (Clawbacks)
          </CardTitle>
          <CardDescription className={typography.cardDescription}>
            Referral rewards voided due to refunds or fraud
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={tableStyles.container}>
            <table className={tableStyles.table}>
              <thead>
                <tr className={tableStyles.headerRow}>
                  <th className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-left`}>Referrer</th>
                  <th className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-left`}>Referred User</th>
                  <th className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-left`}>Type</th>
                  <th className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-right`}>Amount</th>
                  <th className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-left`}>Reason</th>
                  <th className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-left`}>Date</th>
                </tr>
              </thead>
              <tbody>
                {data?.voidedRewards.map((reward) => (
                  <tr key={reward.id} className={tableStyles.row}>
                    <td className={`${spacing.tableCellPadding} ${typography.tableCell}`}>
                      {reward.referrerEmail}
                    </td>
                    <td className={`${spacing.tableCellPadding} ${typography.tableCellMuted}`}>
                      {reward.referredEmail}
                    </td>
                    <td className={spacing.tableCellPadding}>
                      <Badge className={reward.type === 'signup_cash'
                        ? badgeVariants.success
                        : badgeVariants.purple
                      }>
                        {reward.type === 'signup_cash' ? '$10 Cash' : 'Free Month'}
                      </Badge>
                    </td>
                    <td className={`${spacing.tableCellPadding} text-right text-orange-400 font-medium tabular-nums`}>
                      {reward.type === 'signup_cash' ? `$${reward.amount}` : `${reward.amount} mo`}
                    </td>
                    <td className={`${spacing.tableCellPadding} ${typography.tableCellMuted} truncate max-w-[200px]`}>
                      {reward.voidedReason}
                    </td>
                    <td className={`${spacing.tableCellPadding} ${typography.tableCellMuted}`}>
                      {reward.processedAt ? new Date(reward.processedAt).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!data?.voidedRewards || data.voidedRewards.length === 0) && (
              <p className={tableStyles.emptyState}>No voided rewards</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Webhook Events */}
      <Card className={cardStyles.default}>
        <CardHeader className="pb-4">
          <CardTitle className={typography.cardTitle}>
            <Webhook className="h-5 w-5 text-blue-400" />
            Recent Stripe Webhooks
          </CardTitle>
          <CardDescription className={typography.cardDescription}>
            Webhook events received from Stripe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={tableStyles.container}>
            <table className={tableStyles.table}>
              <thead>
                <tr className={tableStyles.headerRow}>
                  <th className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-left`}>Event Type</th>
                  <th className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-left`}>Event ID</th>
                  <th className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-left`}>Processed At</th>
                </tr>
              </thead>
              <tbody>
                {data?.recentWebhooks.slice(0, 20).map((webhook) => (
                  <tr key={webhook.id} className={tableStyles.row}>
                    <td className={spacing.tableCellPadding}>
                      <Badge className={getWebhookBadgeVariant(webhook.eventType)}>
                        {webhook.eventType}
                      </Badge>
                    </td>
                    <td className={`${spacing.tableCellPadding} font-mono text-xs ${typography.tableCellMuted}`}>
                      {webhook.eventId}
                    </td>
                    <td className={`${spacing.tableCellPadding} ${typography.tableCellMuted}`}>
                      {new Date(webhook.processedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!data?.recentWebhooks || data.recentWebhooks.length === 0) && (
              <p className={tableStyles.emptyState}>No recent webhook events</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
