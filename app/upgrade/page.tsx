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
import { useAuth } from "@/lib/auth-context"
import { getUserProfile } from "@/lib/firestore-helpers"
import { Check, CheckCircle } from "lucide-react"
import { getProPricing } from "@/lib/config"
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

  return (
    <main className="min-h-screen bg-black">
      <Header />

      <div className="pt-20 pb-6">
        <div className="container mx-auto px-4 max-w-4xl">

          {/* Minimal Header */}
          <div className="text-center mb-4">
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              Choose Your Plan
            </h1>
          </div>

          {/* Billing Toggle - Inline */}
          {!isProUser && (
            <div className="flex justify-center mb-5">
              <div className="inline-flex items-center gap-1 text-sm">
                <button
                  onClick={() => setBillingPeriod('monthly')}
                  className={`px-3 py-1 rounded-full transition-all ${
                    billingPeriod === 'monthly' ? "text-white bg-white/10" : "text-gray-500 hover:text-white"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingPeriod('yearly')}
                  className={`px-3 py-1 rounded-full transition-all ${
                    billingPeriod === 'yearly' ? "text-white bg-white/10" : "text-gray-500 hover:text-white"
                  }`}
                >
                  Annually
                </button>
                {billingPeriod === 'yearly' && (
                  <span className="text-green-400 text-xs ml-1">Save 25%</span>
                )}
              </div>
            </div>
          )}

          {/* Pricing Cards - Ultra Compact */}
          {!isProUser && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 max-w-2xl mx-auto">

              {/* Free Plan */}
              <div className="rounded-xl p-5 border bg-white/[0.02] border-white/10">
                <h3 className="text-base font-semibold text-white mb-3">Free</h3>

                <div className="text-4xl font-bold text-white mb-2">Free</div>

                <Link href="/interview">
                  <Button
                    variant="outline"
                    className="w-full border-white/20 text-white hover:bg-white/10 mb-4"
                  >
                    Get Started
                  </Button>
                </Link>

                <p className="text-gray-400 text-xs mb-2">Try before you commit.</p>

                <ul className="space-y-1.5 text-sm text-gray-400">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-gray-500" />
                    2 interview scenarios/month
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-gray-500" />
                    All 200+ DSA problems
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-gray-500" />
                    AI interviewer feedback
                  </li>
                </ul>
              </div>

              {/* Pro Plan */}
              <div className="rounded-xl p-5 border-2 bg-gradient-to-br from-accent/5 to-transparent border-accent/50">
                <h3 className="text-base font-semibold text-white mb-3">Pro</h3>

                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-bold text-accent">
                    {currentPrice.priceDisplay}
                  </span>
                  <span className="text-gray-400 text-sm">{currentPrice.period}</span>
                </div>

                <Button
                  onClick={() => handleUpgrade(billingPeriod)}
                  disabled={loading === billingPeriod}
                  className="w-full bg-accent hover:bg-accent/90 text-black font-semibold mb-4"
                >
                  {loading === billingPeriod ? "Processing..." : "Subscribe"}
                </Button>

                <p className="text-gray-400 text-xs mb-2">Everything you need to get hired.</p>

                <p className="text-xs text-gray-500 mb-2">Everything in Free, plus...</p>
                <ul className="space-y-1.5 text-sm text-gray-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-accent" />
                    35 scenarios/month
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-accent" />
                    Spaced repetition scheduling
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-accent" />
                    Personalized study roadmap
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-accent" />
                    Priority support
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Trust - Single line */}
          {!isProUser && (
            <p className="text-center text-xs text-gray-600">
              30-day money-back guarantee · Cancel anytime · Used by engineers at Google, Meta, Amazon
            </p>
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
