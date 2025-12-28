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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth-context"
import { getUserProfile } from "@/lib/firestore-helpers"
import { Check, Crown, Zap, Star, ArrowRight, CheckCircle } from "lucide-react"
import { PRICING_CONFIG, getProPricing } from "@/lib/config"
import { User, Profile } from "@/lib/types"
import { toast } from "sonner"
import { ErrorBoundary } from "@/components/error-boundary"

function UpgradePageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, firebaseUser, loading: authLoading, initialized } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [loading, setLoading] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly')
  const proPricing = getProPricing('website') // Website pricing
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
        // Check for Stripe redirect success
        const success = searchParams?.get("success")
        const canceled = searchParams?.get("canceled")

        if (success === "true") {
          const sessionId = searchParams?.get("session_id")
          toast.success("Payment successful! Syncing your account...")

          // IMPORTANT: Save user info BEFORE any state changes
          // router.replace can trigger re-renders that lose auth state
          const currentUserId = user?.id
          const currentFirebaseUser = firebaseUser

          // Sync subscription with retries to handle webhook race condition
          if (sessionId && currentFirebaseUser && currentUserId) {
            let syncSuccess = false
            let attempts = 0
            const maxAttempts = 5

            while (!syncSuccess && attempts < maxAttempts) {
              attempts++
              try {
                const token = await currentFirebaseUser.getIdToken(true) // Force refresh token

                // Call sync API to check Stripe and update profile
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

                  // Check if user is now Pro
                  if (syncData.profile?.subscription_tier === "pro") {
                    syncSuccess = true
                    setProfile(prev => ({
                      ...prev,
                      ...syncData.profile,
                    } as Profile))
                    toast.success("You're now a Pro member!")
                  } else {
                    // Not yet synced, wait and retry
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

          // Clean URL and redirect AFTER sync is complete
          router.replace("/account")
        } else if (canceled === "true") {
          toast.info("Payment canceled. You can try again anytime.")
          // Clean URL params after showing toast
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
      toast.success("You're already on Pro! 🎉")
      router.push("/account")
      return
    }

    if (!user) {
      window.location.href = "/login?redirect=upgrade"
      return
    }

    setLoading(planType)
    try {
      // Create Stripe checkout session
      const response = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          platform: "website",
          planType: planType,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session")
      }

      if (data.url) {
        // Redirect to Stripe Checkout immediately
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

      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <Badge className="bg-accent/20 text-accent border-accent/30 mb-4">
              <Crown className="mr-1 h-3 w-3" />
              Join 2,000+ developers
            </Badge>
            <h1 className="text-4xl font-bold text-white mb-4">Get Hired Faster</h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Stop grinding without a system. Pro gives you science-backed spaced repetition,
              personalized roadmaps, and unlimited practice.
            </p>
          </div>

          {/* Billing Toggle */}
          {!isProUser && (
            <div className="flex justify-center mb-8">
              <div className="relative inline-flex items-center gap-3 p-1.5 rounded-full bg-white/5 border border-white/10">
                <button
                  onClick={() => setBillingPeriod('monthly')}
                  className={`relative px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                    billingPeriod === 'monthly' ? "text-black bg-white" : "text-gray-400 hover:text-white"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingPeriod('yearly')}
                  className={`relative px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                    billingPeriod === 'yearly' ? "text-black bg-white" : "text-gray-400 hover:text-white"
                  }`}
                >
                  Yearly
                </button>
                {billingPeriod === 'yearly' && (
                  <span className="absolute -right-24 md:-right-28 px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-semibold border border-green-500/30">
                    Save 25%
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Pro Plan */}
          {!isProUser && (
            <div className="max-w-lg mx-auto mb-12">
              <Card className="bg-gradient-to-br from-accent/10 to-neural/10 border-accent/50 relative">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-accent text-black font-semibold">
                    <Star className="mr-1 h-3 w-3" />
                    {billingPeriod === 'yearly' ? 'Save $75/year' : 'Most Popular'}
                  </Badge>
                </div>
                <CardHeader className="pt-8">
                  <CardTitle className="text-white flex items-center">
                    <Crown className="mr-2 h-5 w-5 text-accent" />
                    Pro {billingPeriod === 'yearly' ? 'Yearly' : 'Monthly'}
                  </CardTitle>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-accent">
                      {currentPrice.priceDisplay}
                    </span>
                    <span className="text-sm font-normal text-gray-400">{currentPrice.period}</span>
                    {billingPeriod === 'yearly' && (
                      <span className="text-sm text-gray-600 line-through">$25/mo</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-400">
                    {currentPrice.billingNote}
                  </div>
                  {billingPeriod === 'yearly' && (
                    <>
                      <div className="text-sm text-green-400 mt-2 font-medium">
                        Save ${proPricing.yearly.savings}/year — that's 3 months free
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        One-time payment for 12 months access
                      </div>
                    </>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Value highlight */}
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 mb-4">
                    <p className="text-white text-sm font-medium mb-1">Unlimited Practice</p>
                    <p className="text-gray-400 text-xs">
                      35 scenarios/month, each with 10+ problems. Practice unlimited times—only scenarios count.
                    </p>
                  </div>

                  {PRICING_CONFIG.pro.highlights.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
                      <span className="text-white text-sm">{feature}</span>
                    </div>
                  ))}
                  <Button
                    onClick={() => handleUpgrade(billingPeriod)}
                    disabled={loading === billingPeriod}
                    size="lg"
                    className="w-full bg-accent hover:bg-accent/90 text-black font-semibold mt-4"
                  >
                    {loading === billingPeriod ? (
                      "Processing..."
                    ) : (
                      <>
                        <Zap className="mr-2 h-5 w-5" />
                        {billingPeriod === 'yearly' ? `Get Hired Faster for ${proPricing.yearly.totalDisplay}` : 'Start Pro Monthly'}
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>

                  {/* Trust signals */}
                  <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    <span>30-day money-back guarantee</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Already Pro Message */}
          {isProUser && (
            <div className="text-center space-y-4 mb-12">
              <div className="inline-flex items-center rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-emerald-200">
                <CheckCircle className="mr-2 h-5 w-5 text-emerald-400" />
                You're already enjoying CodeSparring Pro!
              </div>
              <Button
                onClick={() => router.push("/account")}
                size="lg"
                className="bg-gray-100 text-black font-semibold px-8 py-4 text-lg hover:bg-white"
              >
                Manage subscription
              </Button>
              <p className="text-gray-400 text-sm">
                Need help? Contact support@skillon.dev
              </p>
            </div>
          )}

          {!isProUser && (
            <div className="text-center space-y-2">
              <p className="text-gray-400 text-sm">Cancel anytime. No hidden fees.</p>
              <p className="text-gray-600 text-xs">
                Trusted by engineers at Google, Meta, Amazon, and 50+ other companies
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
