"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { FeaturesSection } from "@/components/features-section"
import { AIAssistedSection } from "@/components/ai-assisted-section"
import { Footer } from "@/components/footer"
import { OnboardingModal } from "@/components/OnboardingModal"
import { useAuth } from "@/lib/auth-context"
import { getUserProfile, checkUsageLimit } from "@/lib/firestore-helpers"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Terminal, ArrowRight, Crown, BarChart3 } from "lucide-react"
import Link from "next/link"
import type { Profile } from "@/lib/types"

export default function HomePage() {
  const router = useRouter()
  const { user, firebaseUser, loading: authLoading, initialized } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [usage, setUsage] = useState<{ used: number; limit: number; allowed: boolean; freeOpensRemaining: number } | null>(null)
  const [isPro, setIsPro] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    const loadUserData = async () => {
      // Wait for auth to initialize
      if (authLoading || !initialized) return

      // If not authenticated, show marketing page
      if (!firebaseUser) {
        setIsLoading(false)
        return
      }

      try {
        // Get profile and usage
        const userProfile = await getUserProfile(firebaseUser.uid)
        setProfile(userProfile)
        setIsPro(userProfile?.subscription_tier === "pro")

        // Check if onboarding is needed - only show if profile exists and onboarding is not completed
        if (userProfile) {
          if (!userProfile.onboarding_completed) {
            console.log("Onboarding not completed, showing modal")
            setShowOnboarding(true)
          } else {
            console.log("Onboarding already completed, skipping modal")
            setShowOnboarding(false)
          }
        } else {
          // Profile doesn't exist yet - don't show onboarding until profile is created
          console.log("Profile doesn't exist yet, waiting for profile creation")
          setShowOnboarding(false)
        }

        const usageData = await checkUsageLimit(firebaseUser.uid)
        setUsage(usageData)
      } catch (error) {
        console.error("Error loading user data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadUserData()
  }, [firebaseUser, authLoading, initialized])

  // Show loading while auth is initializing
  if (authLoading || !initialized) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00d9ff]"></div>
      </main>
    )
  }

  // If signed in, show dashboard view
  if (!isLoading && user && firebaseUser) {
    return (
      <main className="min-h-screen bg-black">
        {/* Onboarding modal for first-time users */}
        <OnboardingModal
          isOpen={showOnboarding}
          userId={firebaseUser.uid}
          onComplete={async () => {
            setShowOnboarding(false)
            // Reload profile to get updated onboarding status
            try {
              const updatedProfile = await getUserProfile(firebaseUser.uid)
              if (updatedProfile) {
                setProfile(updatedProfile)
              }
            } catch (error) {
              console.error("Error reloading profile after onboarding:", error)
            }
          }}
        />
        <Header />
        <div className="pt-24 pb-16">
          <div className="container mx-auto px-4 max-w-7xl">
            {/* Welcome Section */}
            <div className="mb-8">
              <h1 className="text-4xl font-heading font-bold text-white mb-2">
                Welcome back, {user.user_metadata?.full_name || "Developer"}!
              </h1>
              <p className="text-gray-400">Ready to practice? Start a new interview session</p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="bg-gray-900/50 border-gray-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-sm font-medium flex items-center">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Practice Sessions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white mb-2">
                    {usage?.used || 0} / {usage?.limit || 2}
                    <span className="text-sm font-normal text-gray-400 ml-2">used</span>
                  </div>
                  <Progress value={usage ? (usage.used / usage.limit) * 100 : 0} className="h-2 mb-2" />
                  {(usage?.freeOpensRemaining || 0) > 0 ? (
                    <p className="text-xs text-[#00ff88]">
                      {usage?.freeOpensRemaining} free opens remaining
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400">
                      {usage?.allowed
                        ? `Next session uses 1 credit, then 10 free opens`
                        : "Limit reached - upgrade for more"}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 border-gray-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-sm font-medium flex items-center">
                    <Crown className="h-4 w-4 mr-2" />
                    Subscription
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge className={isPro ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" : "bg-gray-500/20 text-gray-400 border-gray-500/30"}>
                    {isPro ? "Pro Plan" : "Free Plan"}
                  </Badge>
                  {!isPro && (
                    <Link href="/upgrade" className="block mt-3">
                      <Button size="sm" className="w-full bg-[#00d9ff] hover:bg-[#00d9ff]/80 text-white">
                        Upgrade
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 border-gray-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-sm font-medium flex items-center">
                    <Terminal className="h-4 w-4 mr-2" />
                    Quick Start
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Link href="/interview">
                    <Button className="w-full bg-[#00d9ff] hover:bg-[#00d9ff]/80 text-white">
                      Start Practice
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>

            {/* Practice Section */}
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span className="flex items-center">
                    <Terminal className="h-5 w-5 mr-2 text-[#00d9ff]" />
                    Coding Practice
                  </span>
                  {!usage?.allowed && (
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                      Limit Reached
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {usage?.allowed ? (
                  <div className="space-y-4">
                    <p className="text-gray-300">
                      Ready to practice? Start a new interview session and work on real coding problems with AI guidance.
                    </p>
                    <Link href="/interview">
                      <Button className="w-full bg-[#00d9ff] hover:bg-[#00d9ff]/80 text-white py-6 text-lg">
                        <Terminal className="mr-2 h-5 w-5" />
                        Start New Practice Session
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                      <p className="text-yellow-400 font-medium mb-2">Monthly Limit Reached</p>
                      <p className="text-gray-300 text-sm mb-4">
                        You've used all {usage?.limit || 2} free sessions this month. Upgrade to Pro for unlimited practice!
                      </p>
                      <Link href="/upgrade">
                        <Button className="bg-yellow-500 hover:bg-yellow-600 text-black">
                          <Crown className="mr-2 h-4 w-4" />
                          Upgrade to Pro
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        <Footer />
      </main>
    )
  }

  // For non-signed-in users, show the marketing page
  return (
    <main className="min-h-screen bg-black">
      <Header />
      <HeroSection />
      <AIAssistedSection />
      <FeaturesSection />
      <Footer />
    </main>
  )
}
