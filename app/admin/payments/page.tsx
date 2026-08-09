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
import type { PaymentStats } from "@/lib/admin/payment-types"

/** One short line naming the scope and the source of the numbers above it. */
function MetricProvenance({ scope, source }: { scope: string; source?: string }) {
  return (
    <p className="text-xs text-gray-500">
      {scope}
      {source ? ` · ${source}` : ""}
    </p>
  )
}

const usd = (value: number) =>
  value.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 })

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
    if (eventType.includes("succeeded") || eventType.includes("paid")) {
      return badgeVariants.success
    }
    if (eventType.includes("failed") || eventType.includes("refund")) {
      return badgeVariants.error
    }
    return badgeVariants.info
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

  return (
    <div className={spacing.pageGap}>
      {/* Header */}
      <PageHeader
        title="Payments & Webhooks"
        subtitle="Monitor payments, refunds, and Stripe webhook activity"
        onRefresh={loadData}
        refreshing={refreshing}
      />

      {/* All-time money. Aggregated across the whole collection, not summed from the tables below. */}
      <div>
        <h2 className="mb-1 text-xl font-bold text-white">All time</h2>
        <MetricProvenance scope="Every payment ever recorded" source={data?.provenance?.allTime} />
        <div className="mt-3 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Revenue"
            value={usd(data?.allTime.revenue || 0)}
            subtitle={`${(data?.allTime.paymentCount || 0).toLocaleString()} payments`}
            icon={DollarSign}
            valueColor="text-green-400"
            iconColor="text-green-400"
          />
          <MetricCard
            title="Total Refunds"
            value={usd(data?.allTime.refunds || 0)}
            subtitle={`${(data?.allTime.refundCount || 0).toLocaleString()} refunds`}
            icon={TrendingDown}
            valueColor="text-red-400"
            iconColor="text-red-400"
          />
          <MetricCard
            title="Net Revenue"
            value={usd(data?.allTime.net || 0)}
            subtitle="Revenue less refunds"
            icon={CreditCard}
            valueColor="text-[#c4703f]"
          />
          <MetricCard
            title="Refund Share"
            value={`${(data?.allTime.refundShareOfEventsPercent || 0).toFixed(1)}%`}
            subtitle="Of all payment events"
            icon={Activity}
            valueColor={
              data?.allTime.refundShareOfEventsPercent &&
              data.allTime.refundShareOfEventsPercent > 5
                ? "text-red-400"
                : "text-green-400"
            }
          />
        </div>
      </div>

      {/* Recent Payments */}
      <Card className={cardStyles.default}>
        <CardHeader className="pb-4">
          <CardTitle className={typography.cardTitle}>
            <CheckCircle className="h-5 w-5 text-green-400" />
            Recent Payments
          </CardTitle>
          <CardDescription className={typography.cardDescription}>
            Successful payments within the {data?.recentSampleSize ?? 0} most recent records. A
            sample, not a total.
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
                    User
                  </th>
                  <th
                    className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-left`}
                  >
                    Type
                  </th>
                  <th
                    className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-right`}
                  >
                    Amount
                  </th>
                  <th
                    className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-left`}
                  >
                    Description
                  </th>
                  <th
                    className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-left`}
                  >
                    Date
                  </th>
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
                    <td
                      className={`${spacing.tableCellPadding} text-right font-medium text-green-400 tabular-nums`}
                    >
                      ${payment.amount.toFixed(2)}
                    </td>
                    <td
                      className={`${spacing.tableCellPadding} ${typography.tableCellMuted} max-w-[200px] truncate`}
                    >
                      {payment.description || "-"}
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
            Refunds within the {data?.recentSampleSize ?? 0} most recent records. A sample, not a
            total.
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
                    User
                  </th>
                  <th
                    className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-right`}
                  >
                    Amount
                  </th>
                  <th
                    className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-left`}
                  >
                    Description
                  </th>
                  <th
                    className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-left`}
                  >
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {data?.recentRefunds.map((refund) => (
                  <tr key={refund.id} className={tableStyles.row}>
                    <td className={`${spacing.tableCellPadding} ${typography.tableCell}`}>
                      {refund.userEmail || refund.userId}
                    </td>
                    <td
                      className={`${spacing.tableCellPadding} text-right font-medium text-red-400 tabular-nums`}
                    >
                      -${refund.amount.toFixed(2)}
                    </td>
                    <td className={`${spacing.tableCellPadding} ${typography.tableCellMuted}`}>
                      {refund.description || "-"}
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
                    Type
                  </th>
                  <th
                    className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-right`}
                  >
                    Amount
                  </th>
                  <th
                    className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-left`}
                  >
                    Reason
                  </th>
                  <th
                    className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-left`}
                  >
                    Date
                  </th>
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
                      <Badge
                        className={
                          reward.type === "signup_cash"
                            ? badgeVariants.success
                            : badgeVariants.purple
                        }
                      >
                        {reward.type === "signup_cash" ? "$10 Cash" : "Free Month"}
                      </Badge>
                    </td>
                    <td
                      className={`${spacing.tableCellPadding} text-right font-medium text-orange-400 tabular-nums`}
                    >
                      {reward.type === "signup_cash" ? `$${reward.amount}` : `${reward.amount} mo`}
                    </td>
                    <td
                      className={`${spacing.tableCellPadding} ${typography.tableCellMuted} max-w-[200px] truncate`}
                    >
                      {reward.voidedReason}
                    </td>
                    <td className={`${spacing.tableCellPadding} ${typography.tableCellMuted}`}>
                      {reward.processedAt ? new Date(reward.processedAt).toLocaleDateString() : "-"}
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
                  <th
                    className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-left`}
                  >
                    Event Type
                  </th>
                  <th
                    className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-left`}
                  >
                    Event ID
                  </th>
                  <th
                    className={`${spacing.tableHeaderPadding} ${typography.tableHeader} text-left`}
                  >
                    Processed At
                  </th>
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
                    <td
                      className={`${spacing.tableCellPadding} font-mono text-xs ${typography.tableCellMuted}`}
                    >
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
