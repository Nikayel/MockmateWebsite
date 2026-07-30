"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useAuthedFetch } from "@/lib/hooks/useAuthedFetch"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Gift, Copy, Check, Share2, Users, DollarSign, ChevronRight } from "lucide-react"
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
  const { get } = useAuthedFetch()
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
        const result = await get<{ success?: boolean; data?: ReferralStats }>("/api/referral")

        if (!result.ok) {
          console.warn("[API] Request failed:", result.status, "/api/referral", result.error)
          setError(true)
          return
        }

        if (result.data?.success) {
          setStats(result.data.data ?? null)
        } else {
          setError(true)
        }
      } finally {
        setLoading(false)
      }
    }

    loadReferralData()
  }, [firebaseUser, get])

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
          title: "Try CodeSparring - AI Interview Practice",
          text: "I've been using CodeSparring to prep for coding interviews. Use my link to sign up!",
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
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="bg-muted h-4 w-1/3 rounded" />
            <div className="bg-muted h-8 w-full rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show placeholder when not logged in or error occurred
  if (!stats) {
    return (
      <Card className="border-border/50 to-card/50 bg-gradient-to-br from-purple-900/20">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20">
              <Gift className="h-4 w-4 text-purple-400" />
            </div>
            <div>
              <p className="text-foreground text-sm font-medium">Invite Friends</p>
              <p className="text-muted-foreground text-xs">Earn rewards for referrals</p>
            </div>
          </div>
          <p className="text-muted-foreground text-xs">
            {error
              ? "Unable to load referral data. Please refresh."
              : "Sign in to get your referral code"}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/50 to-card/50 bg-gradient-to-br from-purple-900/20">
      <CardContent className="p-4">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20">
              <Gift className="h-4 w-4 text-purple-400" />
            </div>
            <div>
              <p className="text-foreground text-sm font-medium">Invite Friends</p>
              <p className="text-muted-foreground text-xs">Earn rewards for referrals</p>
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
          <p className="text-muted-foreground mb-1.5 text-[10px] tracking-wide uppercase">
            Your referral link
          </p>
          <div className="flex items-center gap-2">
            <div className="border-border bg-muted/50 flex-1 overflow-hidden rounded-lg border px-3 py-2">
              <p className="text-foreground truncate text-xs">{stats.shareUrl}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={copyToClipboard}
              className="border-border hover:bg-muted shrink-0"
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
        <div className="bg-muted/30 grid grid-cols-3 gap-2 rounded-lg p-2">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Users className="text-muted-foreground h-3 w-3" />
              <span className="text-foreground text-lg font-bold">{stats.referralCount}</span>
            </div>
            <p className="text-muted-foreground text-[10px]">Signups</p>
          </div>
          <div className="border-border/50 border-x text-center">
            <div className="flex items-center justify-center gap-1">
              <Gift className="text-muted-foreground h-3 w-3" />
              <span className="text-lg font-bold text-purple-400">
                {(stats.rewards?.pendingFreeMonths || 0) +
                  (stats.rewards?.totalFreeMonthsEarned || 0)}
              </span>
            </div>
            <p className="text-muted-foreground text-[10px]">Free Months</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <DollarSign className="text-muted-foreground h-3 w-3" />
              <span className="text-lg font-bold text-green-400">
                ${(stats.rewards?.pendingCash || 0) + (stats.rewards?.totalCashEarned || 0)}
              </span>
            </div>
            <p className="text-muted-foreground text-[10px]">Earned</p>
          </div>
        </div>

        {/* Rewards Info */}
        <div className="border-border mt-3 rounded-lg border border-dashed p-2">
          <p className="text-muted-foreground text-[11px] leading-relaxed">
            <span className="font-medium text-purple-400">Earn rewards:</span> Get{" "}
            <span className="text-purple-400">1 free month</span> per signup +{" "}
            <span className="text-green-400">$10</span> &{" "}
            <span className="text-purple-400">1 extra month</span> when they upgrade to Pro
          </p>
          <a
            href="/referral-terms"
            className="text-muted-foreground hover:text-muted-foreground mt-1 block text-[10px] underline"
          >
            Terms & Conditions
          </a>
        </div>

        {/* Terms Link */}
        <a
          href="/referral-terms"
          className="text-muted-foreground hover:text-muted-foreground mt-2 flex items-center justify-center gap-1 text-[10px] transition-colors"
        >
          Program terms apply
          <ChevronRight className="h-3 w-3" />
        </a>
      </CardContent>
    </Card>
  )
}
