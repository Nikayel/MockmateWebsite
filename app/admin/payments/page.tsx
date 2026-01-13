"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MetricCard } from "@/components/admin/charts"
import {
  CreditCard,
  RefreshCw,
  Loader2,
  AlertCircle,
  DollarSign,
  TrendingDown,
  Activity,
  XCircle,
  CheckCircle,
  Webhook,
  Ban,
} from "lucide-react"

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

  const getWebhookBadgeColor = (eventType: string) => {
    if (eventType.includes('succeeded') || eventType.includes('paid')) {
      return 'bg-green-500/20 text-green-400 border-green-500/30'
    }
    if (eventType.includes('failed') || eventType.includes('refund')) {
      return 'bg-red-500/20 text-red-400 border-red-500/30'
    }
    return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white">Payments & Webhooks</h1>
          <p className="text-gray-400 mt-1">Monitor payments, refunds, and Stripe webhook activity</p>
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

      {/* Revenue Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Revenue"
          value={`$${(data?.totalRevenue || 0).toFixed(2)}`}
          subtitle={`${data?.paymentCount || 0} payments`}
          icon={DollarSign}
          valueColor="text-green-400"
        />
        <MetricCard
          title="Total Refunds"
          value={`$${(data?.totalRefunds || 0).toFixed(2)}`}
          subtitle={`${data?.refundCount || 0} refunds`}
          icon={TrendingDown}
          valueColor="text-red-400"
        />
        <MetricCard
          title="Net Revenue"
          value={`$${(data?.netRevenue || 0).toFixed(2)}`}
          subtitle="Revenue - Refunds"
          icon={CreditCard}
          valueColor="text-[#00d9ff]"
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
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-400" />
            Recent Payments
          </CardTitle>
          <CardDescription>Successful payments from Stripe</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400">
                  <th className="text-left py-2 px-3">User</th>
                  <th className="text-left py-2 px-3">Type</th>
                  <th className="text-right py-2 px-3">Amount</th>
                  <th className="text-left py-2 px-3">Description</th>
                  <th className="text-left py-2 px-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {data?.recentPayments.map((payment) => (
                  <tr key={payment.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="py-2 px-3 text-white">{payment.userEmail || payment.userId}</td>
                    <td className="py-2 px-3">
                      <Badge variant="outline" className="text-gray-400 border-gray-700">
                        {payment.type}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-right text-green-400 font-medium">
                      ${payment.amount.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-gray-400 truncate max-w-[200px]">
                      {payment.description || '-'}
                    </td>
                    <td className="py-2 px-3 text-gray-500">
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!data?.recentPayments || data.recentPayments.length === 0) && (
              <p className="text-center text-gray-500 py-8">No recent payments</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Refunds */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-red-400" />
            Recent Refunds
          </CardTitle>
          <CardDescription>Refunds processed through Stripe</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400">
                  <th className="text-left py-2 px-3">User</th>
                  <th className="text-right py-2 px-3">Amount</th>
                  <th className="text-left py-2 px-3">Description</th>
                  <th className="text-left py-2 px-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {data?.recentRefunds.map((refund) => (
                  <tr key={refund.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="py-2 px-3 text-white">{refund.userEmail || refund.userId}</td>
                    <td className="py-2 px-3 text-right text-red-400 font-medium">
                      -${refund.amount.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-gray-400">
                      {refund.description || '-'}
                    </td>
                    <td className="py-2 px-3 text-gray-500">
                      {new Date(refund.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!data?.recentRefunds || data.recentRefunds.length === 0) && (
              <p className="text-center text-gray-500 py-8">No recent refunds</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Voided Rewards (Clawbacks) */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Ban className="h-5 w-5 text-orange-400" />
            Voided Rewards (Clawbacks)
          </CardTitle>
          <CardDescription>Referral rewards voided due to refunds or fraud</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400">
                  <th className="text-left py-2 px-3">Referrer</th>
                  <th className="text-left py-2 px-3">Referred User</th>
                  <th className="text-left py-2 px-3">Type</th>
                  <th className="text-right py-2 px-3">Amount</th>
                  <th className="text-left py-2 px-3">Reason</th>
                  <th className="text-left py-2 px-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {data?.voidedRewards.map((reward) => (
                  <tr key={reward.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="py-2 px-3 text-white">{reward.referrerEmail}</td>
                    <td className="py-2 px-3 text-gray-400">{reward.referredEmail}</td>
                    <td className="py-2 px-3">
                      <Badge className={reward.type === 'signup_cash'
                        ? "bg-green-500/20 text-green-400 border-green-500/30"
                        : "bg-purple-500/20 text-purple-400 border-purple-500/30"
                      }>
                        {reward.type === 'signup_cash' ? '$10 Cash' : 'Free Month'}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-right text-orange-400 font-medium">
                      {reward.type === 'signup_cash' ? `$${reward.amount}` : `${reward.amount} mo`}
                    </td>
                    <td className="py-2 px-3 text-gray-400 truncate max-w-[200px]">
                      {reward.voidedReason}
                    </td>
                    <td className="py-2 px-3 text-gray-500">
                      {reward.processedAt ? new Date(reward.processedAt).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!data?.voidedRewards || data.voidedRewards.length === 0) && (
              <p className="text-center text-gray-500 py-8">No voided rewards</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Webhook Events */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Webhook className="h-5 w-5 text-blue-400" />
            Recent Stripe Webhooks
          </CardTitle>
          <CardDescription>Webhook events received from Stripe</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400">
                  <th className="text-left py-2 px-3">Event Type</th>
                  <th className="text-left py-2 px-3">Event ID</th>
                  <th className="text-left py-2 px-3">Processed At</th>
                </tr>
              </thead>
              <tbody>
                {data?.recentWebhooks.slice(0, 20).map((webhook) => (
                  <tr key={webhook.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="py-2 px-3">
                      <Badge className={getWebhookBadgeColor(webhook.eventType)}>
                        {webhook.eventType}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 font-mono text-xs text-gray-500">
                      {webhook.eventId}
                    </td>
                    <td className="py-2 px-3 text-gray-400">
                      {new Date(webhook.processedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!data?.recentWebhooks || data.recentWebhooks.length === 0) && (
              <p className="text-center text-gray-500 py-8">No recent webhook events</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
