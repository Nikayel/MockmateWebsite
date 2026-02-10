"use client"

import { AlertTriangle, CreditCard, Clock, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Profile } from "@/lib/types"

interface SubscriptionStatusBannerProps {
  profile: Profile | null
}

const DEGRADED_STATUSES: Record<
  string,
  {
    icon: typeof AlertTriangle
    label: string
    description: string
    color: string
    bgColor: string
    borderColor: string
  }
> = {
  past_due: {
    icon: CreditCard,
    label: "Payment failed",
    description: "Your last payment was declined. Update your payment method to keep Pro access.",
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
  },
  requires_action: {
    icon: AlertTriangle,
    label: "Payment action required",
    description:
      "Your payment requires additional verification (e.g. 3D Secure). Complete it to keep Pro access.",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
  },
  cancel_at_period_end: {
    icon: Clock,
    label: "Subscription ending",
    description: "Your Pro access will end at the end of your current billing period.",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
  },
  unpaid: {
    icon: XCircle,
    label: "Subscription unpaid",
    description: "Your subscription is unpaid. Update your payment method to restore access.",
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
  },
}

function formatDate(isoDate: string | undefined): string {
  if (!isoDate) return ""
  try {
    return new Date(isoDate).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return ""
  }
}

export function SubscriptionStatusBanner({ profile }: SubscriptionStatusBannerProps) {
  if (!profile) return null

  const status = profile.subscription_status
  if (!status) return null

  const config = DEGRADED_STATUSES[status]
  if (!config) return null

  const Icon = config.icon

  // Build contextual description
  let description = config.description
  if (status === "cancel_at_period_end" && profile.subscription_current_period_end) {
    const endDate = formatDate(profile.subscription_current_period_end)
    description = `Your Pro access will end on ${endDate}. Renew anytime to keep your features.`
  }

  const showPortalButton =
    status === "past_due" || status === "requires_action" || status === "unpaid"

  async function handleManageSubscription() {
    try {
      const { getAuth } = await import("firebase/auth")
      const auth = getAuth()
      const idToken = await auth.currentUser?.getIdToken()
      if (!idToken) return

      const response = await fetch("/api/customer-portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
      })

      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      // Silently fail - user can navigate to account page manually
    }
  }

  return (
    <div
      className={`rounded-xl border ${config.borderColor} ${config.bgColor} p-4`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${config.color}`} />
          <div>
            <p className={`text-sm font-medium ${config.color}`}>{config.label}</p>
            <p className="mt-0.5 text-xs text-zinc-400">{description}</p>
          </div>
        </div>
        {showPortalButton && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleManageSubscription}
            className="w-full border-zinc-700 sm:w-auto"
          >
            <CreditCard className="mr-1.5 h-3.5 w-3.5" />
            Update payment
          </Button>
        )}
      </div>
    </div>
  )
}
