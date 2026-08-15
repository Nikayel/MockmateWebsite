/**
 * PROPRIETARY CODE - NOT OPEN SOURCE
 * This file contains payment UI and upgrade flow logic and is not part of the MIT license.
 * All rights reserved.
 */

"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { getUserProfile } from "@/lib/firestore-helpers"
import { Check, CheckCircle } from "lucide-react"
import { getProPricing, PRICING_CONFIG } from "@/lib/config"
import { trackUpgradeFlow, trackPurchase } from "@/lib/analytics"
import { reportFunnelEvent } from "@/lib/metrics/funnel-client"
import { Profile } from "@/lib/types"
import { toast } from "sonner"
import { ErrorBoundary } from "@/components/error-boundary"
import Link from "next/link"
import { isPaidTier } from "@/lib/pricing"
import { ROADMAP_FEATURE_COPY } from "@/lib/pricing-features"
import type { SubscriptionTier } from "@/lib/config"
import { SparraLoader } from "@/components/brand/SparraLoader"

function UpgradePageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, firebaseUser, loading: authLoading, initialized } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [loading, setLoading] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  // Honour the period the visitor already chose on /pricing. Without this the
  // page reset to yearly, so selecting Monthly there, seeing $25/mo, and
  // clicking Subscribe landed here on a card quoting $19/mo. Anything other
  // than an explicit "monthly" keeps the yearly default.
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    searchParams?.get("billing") === "monthly" ? "monthly" : "yearly"
  )
  const proPricing = getProPricing("website")
  const currentPrice = billingPeriod === "yearly" ? proPricing.yearly : proPricing.monthly

  useEffect(() => {
    setMounted(true)
  }, [])

  // isPaidTier, not tier === "pro": an enterprise user must not be pitched an upgrade.
  const isProUser = isPaidTier((profile?.subscription_tier ?? "free") as SubscriptionTier)

  // Fire a single view_pricing funnel event once the page is interactive.
  const viewPricingTracked = useRef(false)
  useEffect(() => {
    if (!mounted || !initialized || viewPricingTracked.current) return
    viewPricingTracked.current = true
    trackUpgradeFlow({ userId: user?.id ?? "anonymous", step: "view_pricing" })
  }, [mounted, initialized, user?.id])

  useEffect(() => {
    if (authLoading || !initialized) return
    if (!mounted) return

    const handleStripeRedirect = async () => {
      try {
        const success = searchParams?.get("success")
        const canceled = searchParams?.get("canceled")

        if (success === "true") {
          const sessionId = searchParams?.get("session_id")
          toast.success("Payment successful! Syncing your account...")

          const currentUserId = user?.id
          const currentFirebaseUser = firebaseUser

          if (sessionId && currentFirebaseUser && currentUserId) {
            let syncSuccess = false
            let attempts = 0
            const maxAttempts = 5

            while (!syncSuccess && attempts < maxAttempts) {
              attempts++
              try {
                const token = await currentFirebaseUser.getIdToken(true)

                const syncResponse = await fetch("/api/sync-subscription", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  // The session id is what makes this retry able to rescue a YEARLY purchase. Yearly
                  // is a one-time payment with no Stripe subscription behind it, so without the
                  // session the sync has nothing to find and a failed webhook leaves a paying
                  // customer on Free with no way out. The server re-verifies the session's owner and
                  // payment status against Stripe before granting anything.
                  body: JSON.stringify({ userId: currentUserId, sessionId }),
                })

                if (syncResponse.ok) {
                  const syncData = await syncResponse.json()

                  if (syncData.profile?.subscription_tier === "pro") {
                    syncSuccess = true
                    setProfile(
                      (prev) =>
                        ({
                          ...prev,
                          ...syncData.profile,
                        }) as Profile
                    )

                    // Conversion: confirmed Pro after Stripe checkout. Derive the
                    // transaction value from the synced plan so GA4 revenue is accurate.
                    const purchasedYearly = syncData.profile?.subscription_type === "yearly"
                    trackUpgradeFlow({ userId: currentUserId, step: "complete_checkout" })
                    trackPurchase({
                      userId: currentUserId,
                      tier: "pro",
                      value: purchasedYearly ? proPricing.yearly.price : proPricing.monthly.price,
                      currency: "USD",
                      platform: "website",
                    })

                    toast.success("You're now a Pro member!")
                  } else {
                    await new Promise((resolve) => setTimeout(resolve, 1500))
                  }
                } else {
                  await new Promise((resolve) => setTimeout(resolve, 1000))
                }
              } catch {
                await new Promise((resolve) => setTimeout(resolve, 1000))
              }
            }

            if (!syncSuccess) {
              toast.info(
                "Redirecting to your account. If Pro status isn't showing, please refresh the page."
              )
            }
          }

          router.replace("/account")
        } else if (canceled === "true") {
          toast.info("Payment canceled. You can try again anytime.")
          router.replace("/upgrade")
        }
      } catch {
        // Error handling search params
      }
    }

    handleStripeRedirect()
  }, [authLoading, mounted, searchParams, router, user, firebaseUser, initialized])

  useEffect(() => {
    if (authLoading || !initialized || !mounted) return

    const loadProfile = async () => {
      if (!firebaseUser) {
        setProfile(null)
        setProfileLoading(false)
        return
      }

      try {
        const userProfile = await getUserProfile(firebaseUser.uid)
        setProfile(userProfile)
      } catch {
        // Error loading profile
      } finally {
        setProfileLoading(false)
      }
    }

    loadProfile()
  }, [authLoading, initialized, mounted, firebaseUser])

  const handleUpgrade = async (planType: "monthly" | "yearly") => {
    // click_upgrade fires before the guards: the step means "pressed the
    // button", including the anonymous and already-Pro presses the later
    // steps never see. It was defined in the union with zero call sites.
    trackUpgradeFlow({ userId: user?.id ?? "anonymous", step: "click_upgrade", tier: planType })

    if (isProUser) {
      toast.success("You're already on Pro!")
      router.push("/account")
      return
    }

    if (!user || !firebaseUser) {
      window.location.href = "/login?redirect=upgrade"
      return
    }

    setLoading(planType)
    trackUpgradeFlow({ userId: user.id, step: "start_checkout", tier: planType })
    reportFunnelEvent("checkout_start")
    try {
      const idToken = await firebaseUser.getIdToken()

      const response = await fetch("/api/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          platform: "website",
          planType: planType,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session")
      }

      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error(data.error || "Failed to create checkout session")
      }
    } catch (error) {
      toast.error("Upgrade failed", {
        description: "Something went wrong. Please try again or contact support.",
        duration: 5000,
      })
      setLoading(null)
    }
  }

  return (
    <main className="bg-background min-h-screen">
      <Header />

      <div className="pt-20 pb-6">
        <div className="container mx-auto max-w-4xl px-4">
          {/* Minimal Header */}
          <div className="mb-4 text-center">
            <h1 className="text-foreground text-2xl font-bold md:text-3xl">Choose Your Plan</h1>
          </div>

          {/* Billing Toggle - Inline */}
          {!isProUser && (
            <div className="mb-5 flex justify-center">
              <div className="inline-flex items-center gap-1 text-sm">
                <button
                  onClick={() => setBillingPeriod("monthly")}
                  className={`rounded-full px-3 py-1 transition-all ${
                    billingPeriod === "monthly"
                      ? "bg-foreground/10 text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingPeriod("yearly")}
                  className={`rounded-full px-3 py-1 transition-all ${
                    billingPeriod === "yearly"
                      ? "bg-foreground/10 text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Annually
                </button>
                {billingPeriod === "yearly" && (
                  <span className="ml-1 text-xs text-green-400">Save 25%</span>
                )}
              </div>
            </div>
          )}

          {/* Pricing Cards - Ultra Compact */}
          {!isProUser && (
            <div className="mx-auto mb-4 grid max-w-xl grid-cols-1 gap-4">
              {/* Pro Plan */}
              <div className="from-accent/5 border-accent/50 rounded-xl border-2 bg-gradient-to-br to-transparent p-5">
                <h3 className="text-foreground mb-3 text-base font-semibold">Pro</h3>

                <div className="mb-2 flex items-baseline gap-1">
                  <span className="text-accent text-4xl font-bold">
                    {billingPeriod === "yearly" &&
                    "totalDisplay" in currentPrice &&
                    currentPrice.totalDisplay
                      ? currentPrice.totalDisplay
                      : currentPrice.priceDisplay}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {billingPeriod === "yearly" ? "/year" : currentPrice.period}
                  </span>
                </div>

                <Button
                  onClick={() => handleUpgrade(billingPeriod)}
                  disabled={loading === billingPeriod}
                  className="bg-accent hover:bg-accent/90 text-foreground mb-4 w-full font-semibold"
                >
                  {loading === billingPeriod ? "Processing..." : "Subscribe"}
                </Button>

                <p className="text-muted-foreground mb-2 text-xs">
                  Everything you need to get hired.
                </p>

                <p className="text-muted-foreground mb-2 text-xs">Everything in Free, plus...</p>
                <ul className="text-muted-foreground space-y-1.5 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="text-accent h-3.5 w-3.5" />
                    {/* The number is the enforced quota, not copy: it must move with
                        PRICING_CONFIG or the checkout page promises a limit the
                        server no longer grants. */}
                    {`${PRICING_CONFIG.pro.sessionsPerMonth} sessions/month`}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="text-accent h-3.5 w-3.5" />
                    Spaced repetition scheduling
                  </li>
                  {/* items-start, not items-center: this row wraps to two lines
                      and the check must hold the first line. shrink-0 keeps the
                      icon square when it does. */}
                  <li className="flex items-start gap-2">
                    <Check className="text-accent mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {ROADMAP_FEATURE_COPY}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="text-accent h-3.5 w-3.5" />
                    Priority support
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Trust line. The third clause used to read "Used by engineers at
              Google, Meta, Amazon", an unsubstantiated endorsement on the checkout
              path. The two guarantees are real; the claim was not. The middle
              clause tracks the billing period: yearly is a one-time charge with
              no subscription, so "cancel anytime" is monthly-only truth. */}
          {!isProUser && (
            <p className="text-muted-foreground text-center text-xs">
              30-day money-back guarantee ·{" "}
              {billingPeriod === "monthly" ? "Cancel anytime" : "One payment, never auto-renews"} ·
              No card required to start
            </p>
          )}

          {/* Already Pro Message */}
          {isProUser && (
            <div className="space-y-4 py-8 text-center">
              <div className="border-neural/40 bg-neural/10 text-neural inline-flex items-center rounded-lg border px-4 py-3">
                <CheckCircle className="text-neural mr-2 h-5 w-5" />
                You're already enjoying CodeSparring Pro!
              </div>
              <div>
                <Button
                  onClick={() => router.push("/account")}
                  size="lg"
                  className="bg-muted text-foreground hover:bg-card px-8 font-semibold"
                >
                  Manage subscription
                </Button>
              </div>
              <p className="text-muted-foreground text-sm">
                Need help? Contact support@codesparring.dev
              </p>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </main>
  )
}

export default function UpgradePage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<SparraLoader fullPage />}>
        <UpgradePageContent />
      </Suspense>
    </ErrorBoundary>
  )
}
