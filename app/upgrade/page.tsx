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
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth-context"
import { getUserProfile } from "@/lib/firestore-helpers"
import { db } from "@/lib/firebase"
import { doc, setDoc, getDoc } from "firebase/firestore"
import { Check, Crown, Zap, Star, ArrowRight, Ticket, CheckCircle } from "lucide-react"
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
  const [loading, setLoading] = useState(false)
  const [promoCode, setPromoCode] = useState("")
  const [applyingPromo, setApplyingPromo] = useState(false)
  const [mounted, setMounted] = useState(false)
  const proPricing = getProPricing('website') // Website pricing

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
                  console.log(`Subscription sync attempt ${attempts}:`, syncData)

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
                    console.log(`Sync attempt ${attempts}: Not yet Pro, waiting...`)
                    await new Promise(resolve => setTimeout(resolve, 1500))
                  }
                } else {
                  const errorText = await syncResponse.text()
                  console.error(`Sync attempt ${attempts} failed:`, syncResponse.status, errorText)
                  await new Promise(resolve => setTimeout(resolve, 1000))
                }
              } catch (syncError) {
                console.error(`Sync attempt ${attempts} error:`, syncError)
                await new Promise(resolve => setTimeout(resolve, 1000))
              }
            }

            if (!syncSuccess) {
              console.warn("Could not confirm Pro status after retries - redirecting anyway")
              toast.info("Redirecting to your account. If Pro status isn't showing, please refresh the page.")
            }
          } else {
            console.error("Missing auth info for sync:", {
              hasSessionId: !!sessionId,
              hasFirebaseUser: !!currentFirebaseUser,
              hasUserId: !!currentUserId
            })
          }

          // Clean URL and redirect AFTER sync is complete
          router.replace("/account")
        } else if (canceled === "true") {
          toast.info("Payment canceled. You can try again anytime.")
          // Clean URL params after showing toast
          router.replace("/upgrade")
        }
      } catch (error) {
        console.error("Error handling search params:", error)
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
      } catch (error) {
        console.error("Error loading profile on upgrade page:", error)
      } finally {
        setProfileLoading(false)
      }
    }

    loadProfile()
  }, [authLoading, initialized, mounted, firebaseUser])

  const handlePromoCode = async () => {
    if (isProUser) {
      toast.info("You're already a Pro member")
      return
    }

    if (!user || !promoCode.trim()) {
      toast.error("Please enter a promo code")
      return
    }

    setApplyingPromo(true)
    try {
      const response = await fetch("/api/promo-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: promoCode.trim(),
          userId: user.id,
        }),
      })

      const data = await response.json()

      if (data.valid) {
        // Promo code is valid, now update profile client-side (with proper auth)
        try {
          // Verify Firebase auth before Firestore writes
          if (!firebaseUser || firebaseUser.uid !== user.id) {
            toast.error("Authentication error. Please log in again.")
            window.location.href = "/login?redirect=upgrade"
            setApplyingPromo(false)
            return
          }

          // Check if code was already used (double-check client-side)
          const promoUsageRef = doc(db, "promo_code_usage", `${user.id}_${promoCode.trim().toUpperCase()}`)
          let promoUsageSnap
          try {
            promoUsageSnap = await getDoc(promoUsageRef)
          } catch (readError: any) {
            // If read fails due to permissions, it might be because document doesn't exist
            // Continue to try creating it
            console.log("Read check failed (document may not exist):", readError)
          }
          
          if (promoUsageSnap?.exists()) {
            toast.error("This promo code has already been used")
            setApplyingPromo(false)
            return
          }

          // Mark promo code as used
          await setDoc(promoUsageRef, {
            user_id: user.id,
            code: promoCode.trim().toUpperCase(),
            used_at: new Date().toISOString(),
            discount_type: data.discount_type,
          })

          // Update user profile to Pro
          const profileRef = doc(db, "profiles", user.id)
          await setDoc(profileRef, {
            subscription_tier: "pro",
            updated_at: new Date().toISOString(),
          }, { merge: true })

          toast.success("Promo code applied successfully! You've been upgraded to Pro.")
          setPromoCode("")
          // Reload page to show updated subscription
          setTimeout(() => {
            window.location.reload()
          }, 1500)
        } catch (updateError: any) {
          console.error("Error updating profile:", updateError)
          console.error("Error code:", updateError.code)
          console.error("Error message:", updateError.message)
          
          if (updateError.code === "permission-denied") {
            toast.error("Permission denied. Please:\n1. Update Firestore security rules in Firebase Console\n2. See FIRESTORE_RULES.md for instructions", {
              duration: 10000,
            })
          } else {
            toast.error(`Failed to apply promo code: ${updateError.message || "Unknown error"}`)
          }
          setApplyingPromo(false)
        }
      } else {
        toast.error(data.error || "Invalid promo code")
      }
    } catch (error) {
      console.error("Promo code error:", error)
      toast.error("Failed to apply promo code. Please try again.")
    } finally {
      setApplyingPromo(false)
    }
  }

  const handleUpgrade = async () => {
    if (isProUser) {
      toast.success("You're already on Pro! 🎉")
      router.push("/account")
      return
    }

    if (!user) {
      window.location.href = "/login?redirect=upgrade"
      return
    }

    setLoading(true)
    try {
      // Create Stripe checkout session
      const response = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          platform: "website", // or detect from context
          promoCode: promoCode.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle validation errors (e.g., invalid promo code)
        throw new Error(data.error || "Failed to create checkout session")
      }

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url
      } else {
        throw new Error(data.error || "Failed to create checkout session")
      }
    } catch (error) {
      console.error("Upgrade error:", error)
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred"
      toast.error("Upgrade failed", {
        description: errorMessage,
        duration: 5000,
      })
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-black">
      <Header />

      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 mb-4">
              <Crown className="mr-1 h-3 w-3" />
              Upgrade to Pro
            </Badge>
            <h1 className="text-4xl font-bold text-white mb-4">Unlock Your Full Potential</h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Get unlimited access to advanced features and take your interview preparation to the next level.
            </p>
          </div>

          {/* Pricing Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* Free Plan */}
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">{PRICING_CONFIG.free.name}</CardTitle>
                <div className="text-2xl font-bold text-white">
                  {PRICING_CONFIG.free.priceDisplay}
                  <span className="text-sm font-normal text-gray-400">{PRICING_CONFIG.free.period}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {PRICING_CONFIG.free.features.slice(0, 4).map((feature, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-400" />
                    <span className="text-gray-300">{feature}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-yellow-500 text-black font-semibold">
                  <Star className="mr-1 h-3 w-3" />
                  Most Popular
                </Badge>
              </div>
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Crown className="mr-2 h-5 w-5 text-yellow-400" />
                  {proPricing.name}
                </CardTitle>
                <div className="text-3xl font-bold text-white">
                  {proPricing.priceDisplay}
                  <span className="text-sm font-normal text-gray-400">{proPricing.period}</span>
                </div>
                <Badge className="mt-2 bg-blue-600/20 text-blue-300 border-blue-600/30 text-xs">
                  💡 VS Code users: $19/month
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {PRICING_CONFIG.pro.features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Check className="h-4 w-4 text-green-400" />
                    <span className={index === 0 ? "text-white font-medium" : "text-white"}>{feature}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Promo Code Section */}
          {user && !isProUser && (
            <Card className="bg-gray-900/50 border-gray-700 mb-8">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                  <div className="flex-1 w-full">
                    <div className="flex items-center space-x-2 mb-2">
                      <Ticket className="h-4 w-4 text-yellow-400" />
                      <label className="text-sm text-gray-300">Have a promo code?</label>
                    </div>
                    <Input
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      placeholder="Enter promo code (applied at checkout)"
                      className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                      onKeyPress={(e) => e.key === "Enter" && !applyingPromo && handlePromoCode()}
                      disabled={applyingPromo}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Promo codes can also be applied during Stripe checkout
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={handlePromoCode}
                      disabled={applyingPromo || !promoCode.trim()}
                      className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                    >
                      {applyingPromo ? "Applying..." : "Apply Free Code"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* CTA */}
          <div className="text-center">
            {isProUser ? (
              <div className="space-y-4">
                <div className="inline-flex items-center rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-emerald-200">
                  <CheckCircle className="mr-2 h-5 w-5 text-emerald-400" />
                  You're already enjoying MockMate Pro!
                </div>
                <Button
                  onClick={() => router.push("/account")}
                  size="lg"
                  className="bg-gray-100 text-black font-semibold px-8 py-4 text-lg hover:bg-white"
                >
                  Manage subscription
                </Button>
                <p className="text-gray-400 text-sm">
                  Need help? Contact support@mockmate.dev
                </p>
              </div>
            ) : (
              <>
                <Button
                  onClick={handleUpgrade}
                  disabled={loading}
                  size="lg"
                  className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-8 py-4 text-lg"
                >
                  {loading ? (
                    "Processing..."
                  ) : (
                    <>
                      <Zap className="mr-2 h-5 w-5" />
                      Upgrade to Pro - {proPricing.priceDisplay}
                      {proPricing.period}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>

                <p className="text-gray-400 text-sm mt-4">Cancel anytime. No hidden fees. 30-day money-back guarantee.</p>
              </>
            )}
          </div>
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
