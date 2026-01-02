/**
 * PROPRIETARY CODE - NOT OPEN SOURCE
 * This file contains payment UI and upgrade flow logic and is not part of the MIT license.
 * All rights reserved.
 */

"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"
import { getUserProfile } from "@/lib/firestore-helpers"
import { Check, Crown, Zap, ArrowRight, CheckCircle, Shield, Sparkles, X } from "lucide-react"
import { PRICING_CONFIG, getProPricing } from "@/lib/config"
import { Profile } from "@/lib/types"
import { toast } from "sonner"
import { ErrorBoundary } from "@/components/error-boundary"
import Link from "next/link"

function UpgradePageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, firebaseUser, loading: authLoading, initialized } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [loading, setLoading] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly')
  const proPricing = getProPricing('website')
  const currentPrice = billingPeriod === 'yearly' ? proPricing.yearly : proPricing.monthly

  useEffect(() => {
    setMounted(true)
  }, [])

  const isProUser = profile?.subscription_tier === "pro"

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
                  body: JSON.stringify({ userId: currentUserId }),
                })

                if (syncResponse.ok) {
                  const syncData = await syncResponse.json()

                  if (syncData.profile?.subscription_tier === "pro") {
                    syncSuccess = true
                    setProfile(prev => ({
                      ...prev,
                      ...syncData.profile,
                    } as Profile))
                    toast.success("You're now a Pro member!")
                  } else {
                    await new Promise(resolve => setTimeout(resolve, 1500))
                  }
                } else {
                  await new Promise(resolve => setTimeout(resolve, 1000))
                }
              } catch {
                await new Promise(resolve => setTimeout(resolve, 1000))
              }
            }

            if (!syncSuccess) {
              toast.info("Redirecting to your account. If Pro status isn't showing, please refresh the page.")
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

  const handleUpgrade = async (planType: 'monthly' | 'yearly') => {
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
    try {
      const idToken = await firebaseUser.getIdToken()

      const response = await fetch("/api/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
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
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred"
      toast.error("Upgrade failed", {
        description: errorMessage,
        duration: 5000,
      })
      setLoading(null)
    }
  }

  // Compact features for display
  const freeFeatures = [
    "2 scenarios/month",
    "All 200+ problems",
    "AI interviewer",
  ]

  const freeLimitations = [
    "No spaced repetition",
    "No personalized roadmap",
  ]

  const proFeatures = [
    "35 scenarios/month",
    "Unlimited practice",
    "Spaced repetition",
    "Personalized roadmap",
    "System design prep",
    "Priority support",
  ]

  return (
    <main className="min-h-screen bg-black">
      <Header />

      <div className="pt-16 pb-8 md:pt-20 md:pb-12">
        <div className="container mx-auto px-4 max-w-5xl">

          {/* Compact Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
              Choose Your Plan
            </h1>
            <p className="text-gray-400 text-sm md:text-base">
              Start free, upgrade when you're ready
            </p>
          </div>

          {/* Billing Toggle - Compact */}
          {!isProUser && (
            <div className="flex justify-center mb-6">
              <div className="inline-flex items-center gap-2 p-1 rounded-full bg-white/5 border border-white/10">
                <button
                  onClick={() => setBillingPeriod('monthly')}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    billingPeriod === 'monthly' ? "text-black bg-white" : "text-gray-400 hover:text-white"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingPeriod('yearly')}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    billingPeriod === 'yearly' ? "text-black bg-white" : "text-gray-400 hover:text-white"
                  }`}
                >
                  Yearly
                </button>
                {billingPeriod === 'yearly' && (
                  <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs font-semibold border border-green-500/30 ml-1">
                    -25%
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Pricing Cards - Side by Side */}
          {!isProUser && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">

              {/* Free Plan */}
              <div className="rounded-2xl p-5 md:p-6 border bg-white/[0.02] border-white/10 hover:border-white/20 transition-colors">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-gray-400" />
                  <h3 className="text-lg font-bold text-white">Free</h3>
                </div>

                <div className="mb-1">
                  <span className="text-3xl font-bold text-white">$0</span>
                </div>
                <p className="text-gray-500 text-xs mb-4">Best for trying it out</p>

                <ul className="space-y-2 mb-5">
                  {freeFeatures.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                  {freeLimitations.map((limitation, idx) => (
                    <li key={`limit-${idx}`} className="flex items-center gap-2 text-sm">
                      <X className="w-4 h-4 text-gray-700 flex-shrink-0" />
                      <span className="text-gray-600">{limitation}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/interview">
                  <Button
                    variant="outline"
                    className="w-full border-white/20 text-white hover:bg-white/10"
                  >
                    Start Free
                  </Button>
                </Link>
              </div>

              {/* Pro Plan */}
              <div className="relative rounded-2xl p-5 md:p-6 border-2 bg-gradient-to-br from-accent/5 to-transparent border-accent/50 hover:border-accent transition-colors">
                {/* Badge */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-accent text-black text-xs font-semibold px-3 py-0.5">
                    Most Popular
                  </Badge>
                </div>

                <div className="flex items-center gap-2 mb-3 mt-1">
                  <Crown className="w-5 h-5 text-accent" />
                  <h3 className="text-lg font-bold text-white">Pro</h3>
                </div>

                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-3xl font-bold text-accent">
                    {currentPrice.priceDisplay}
                  </span>
                  <span className="text-gray-400 text-sm">{currentPrice.period}</span>
                  {billingPeriod === 'yearly' && (
                    <span className="text-gray-600 text-sm line-through">$25/mo</span>
                  )}
                </div>
                <p className="text-gray-500 text-xs mb-1">
                  Best for landing your dream job
                </p>
                {billingPeriod === 'yearly' && (
                  <p className="text-green-400 text-xs font-medium mb-3">
                    Save ${proPricing.yearly.savings}/year (3 months free)
                  </p>
                )}
                {billingPeriod === 'monthly' && <div className="mb-3" />}

                <ul className="space-y-2 mb-5">
                  {proFeatures.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-accent flex-shrink-0" />
                      <span className="text-gray-200">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleUpgrade(billingPeriod)}
                  disabled={loading === billingPeriod}
                  className="w-full bg-accent hover:bg-accent/90 text-black font-semibold"
                >
                  {loading === billingPeriod ? (
                    "Processing..."
                  ) : (
                    <>
                      <Zap className="mr-1.5 h-4 w-4" />
                      {billingPeriod === 'yearly' ? `Get Pro — ${proPricing.yearly.totalDisplay}/yr` : 'Get Pro — $25/mo'}
                      <ArrowRight className="ml-1.5 h-4 w-4" />
                    </>
                  )}
                </Button>

                {/* Trust signal */}
                <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-gray-500">
                  <Shield className="w-3 h-3 text-green-500" />
                  <span>30-day money-back guarantee</span>
                </div>
              </div>
            </div>
          )}

          {/* Trust Bar - Compact */}
          {!isProUser && (
            <div className="flex items-center justify-center gap-4 text-xs text-gray-500 flex-wrap">
              <span>Cancel anytime</span>
              <span className="text-gray-700">•</span>
              <span>No hidden fees</span>
              <span className="text-gray-700">•</span>
              <span>Used by engineers at Google, Meta, Amazon</span>
            </div>
          )}

          {/* Already Pro Message */}
          {isProUser && (
            <div className="text-center space-y-4 py-8">
              <div className="inline-flex items-center rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-emerald-200">
                <CheckCircle className="mr-2 h-5 w-5 text-emerald-400" />
                You're already enjoying CodeSparring Pro!
              </div>
              <div>
                <Button
                  onClick={() => router.push("/account")}
                  size="lg"
                  className="bg-gray-100 text-black font-semibold px-8 hover:bg-white"
                >
                  Manage subscription
                </Button>
              </div>
              <p className="text-gray-400 text-sm">
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
      <Suspense fallback={
        <main className="min-h-screen bg-black flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00d9ff]"></div>
        </main>
      }>
        <UpgradePageContent />
      </Suspense>
    </ErrorBoundary>
  )
}
