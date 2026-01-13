"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Gift, Copy, Check, Share2, Users, DollarSign } from "lucide-react"
import { toast } from "sonner"

interface ReferralStats {
  referralCode: string
  shareUrl: string
  referralCount: number
  conversions: number
  rewards: {
    pendingCash: number // $10 per signup, not yet paid
    totalCashEarned: number // Total paid out
    pendingFreeMonths: number // Free months not yet applied
    totalFreeMonthsEarned: number // Total free months credited
  }
}

export function ReferralWidget() {
  const { firebaseUser } = useAuth()
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const loadReferralData = async () => {
      if (!firebaseUser) {
        setLoading(false)
        return
      }

      try {
        const token = await firebaseUser.getIdToken()
        const response = await fetch("/api/referral", {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setStats(data.data)
          } else {
            setError(true)
          }
        } else {
          setError(true)
        }
      } catch (error) {
        console.error("Failed to load referral data:", error)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    loadReferralData()
  }, [firebaseUser])

  const copyToClipboard = async () => {
    if (!stats?.shareUrl) return

    try {
      await navigator.clipboard.writeText(stats.shareUrl)
      setCopied(true)
      toast.success("Referral link copied!")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Failed to copy")
    }
  }

  const shareNative = async () => {
    if (!stats?.shareUrl) return

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Try Mockmate - AI Interview Practice",
          text: "I've been using Mockmate to prep for coding interviews. Use my link to sign up!",
          url: stats.shareUrl,
        })
      } catch {
        // User cancelled or error
      }
    } else {
      copyToClipboard()
    }
  }

  if (loading) {
    return (
      <Card className="border-zinc-800/50 bg-zinc-900/50">
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-1/3 rounded bg-zinc-800" />
            <div className="h-8 w-full rounded bg-zinc-800" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show placeholder when not logged in or error occurred
  if (!stats) {
    return (
      <Card className="border-zinc-800/50 bg-gradient-to-br from-purple-900/20 to-zinc-900/50">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20">
              <Gift className="h-4 w-4 text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Invite Friends</p>
              <p className="text-xs text-zinc-500">Earn rewards for referrals</p>
            </div>
          </div>
          <p className="text-xs text-zinc-400">
            {error
              ? "Unable to load referral data. Please refresh."
              : "Sign in to get your referral code"}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-zinc-800/50 bg-gradient-to-br from-purple-900/20 to-zinc-900/50">
      <CardContent className="p-4">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20">
              <Gift className="h-4 w-4 text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Invite Friends</p>
              <p className="text-xs text-zinc-500">Earn rewards for referrals</p>
            </div>
          </div>
          {stats.referralCount > 0 && (
            <Badge className="border-0 bg-purple-500/20 text-purple-400">
              {stats.referralCount} referred
            </Badge>
          )}
        </div>

        {/* Shareable Link */}
        <div className="mb-3">
          <p className="mb-1.5 text-[10px] tracking-wide text-zinc-500 uppercase">
            Your referral link
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2">
              <p className="truncate text-xs text-white">{stats.shareUrl}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={copyToClipboard}
              className="shrink-0 border-zinc-700 hover:bg-zinc-800"
            >
              {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button
              size="sm"
              onClick={shareNative}
              className="shrink-0 bg-purple-600 hover:bg-purple-700"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 rounded-lg bg-zinc-800/30 p-2">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Users className="h-3 w-3 text-zinc-500" />
              <span className="text-lg font-bold text-white">{stats.referralCount}</span>
            </div>
            <p className="text-[10px] text-zinc-500">Signups</p>
          </div>
          <div className="border-x border-zinc-700/50 text-center">
            <div className="flex items-center justify-center gap-1">
              <Gift className="h-3 w-3 text-zinc-500" />
              <span className="text-lg font-bold text-purple-400">
                {(stats.rewards?.pendingFreeMonths || 0) +
                  (stats.rewards?.totalFreeMonthsEarned || 0)}
              </span>
            </div>
            <p className="text-[10px] text-zinc-500">Free Months</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <DollarSign className="h-3 w-3 text-zinc-500" />
              <span className="text-lg font-bold text-green-400">
                ${(stats.rewards?.pendingCash || 0) + (stats.rewards?.totalCashEarned || 0)}
              </span>
            </div>
            <p className="text-[10px] text-zinc-500">Earned</p>
          </div>
        </div>

        {/* Rewards Info */}
        <div className="mt-3 rounded-lg border border-dashed border-zinc-700 p-2">
          <p className="text-[11px] leading-relaxed text-zinc-400">
            <span className="font-medium text-purple-400">Earn rewards:</span> Get{" "}
            <span className="text-purple-400">1 free month</span> per signup +{" "}
            <span className="text-green-400">$10</span> &{" "}
            <span className="text-purple-400">1 extra month</span> when they upgrade to Pro
          </p>
          <a
            href="/referral-terms"
            className="mt-1 block text-[10px] text-zinc-500 underline hover:text-zinc-400"
          >
            Terms & Conditions
          </a>
        </div>
      </CardContent>
    </Card>
  )
}
