"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/lib/auth-context"
import { getUserProfile, initializeUserQuota, checkUsageLimit } from "@/lib/firestore-helpers"
import { Profile, ProfileQuota } from "@/lib/types"
import { PRICING_CONFIG } from "@/lib/config"
import {
  User,
  Crown,
  BarChart3,
  Calendar,
  Terminal,
  TrendingUp,
  Target,
  Clock,
  Zap,
  ArrowRight
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

export default function DashboardPage() {
  const router = useRouter()
  const { user, firebaseUser, loading: authLoading, initialized } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [usage, setUsage] = useState<{ used: number; limit: number; allowed: boolean } | null>(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [authCheckComplete, setAuthCheckComplete] = useState(false)

  // Separate effect to handle auth check with delay to prevent race condition on refresh
  useEffect(() => {
    if (!initialized || authLoading) return

    // Give Firebase a moment to restore session on page refresh before checking auth
    const timer = setTimeout(() => {
      setAuthCheckComplete(true)
    }, 300)

    return () => clearTimeout(timer)
  }, [initialized, authLoading])

  useEffect(() => {
    const loadDashboard = async () => {
      // Wait for auth to fully initialize and complete our auth check
      if (authLoading || !initialized || !authCheckComplete) return

      // Redirect if not authenticated
      if (!firebaseUser) {
        router.push("/login?redirect=dashboard")
        return
      }

      try {

        // Load profile (refresh to get latest subscription status)
        const userProfile = await getUserProfile(firebaseUser.uid)
        if (userProfile) {
          setProfile(userProfile)

          // Auto-sync subscription if user has Stripe IDs but tier is "free"
          // This fixes Pro users who were incorrectly reset
          if ((userProfile.stripe_subscription_id || userProfile.stripe_customer_id) &&
            userProfile.subscription_tier === "free") {
            console.log("Auto-syncing subscription for user with Stripe IDs but free tier")
            try {
              const token = await firebaseUser.getIdToken()
              const syncResponse = await fetch("/api/sync-subscription", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ userId: firebaseUser.uid }),
              })

              if (syncResponse.ok) {
                const syncData = await syncResponse.json()
                if (syncData.success && syncData.profile.subscription_tier === "pro") {
                  // Reload profile and usage after sync
                  const updatedProfile = await getUserProfile(firebaseUser.uid)
                  if (updatedProfile) {
                    setProfile(updatedProfile)
                  }
                  const updatedUsage = await checkUsageLimit(firebaseUser.uid)
                  setUsage(updatedUsage)
                }
              }
            } catch (syncError) {
              console.error("Auto-sync failed (non-critical):", syncError)
              // Don't show error to user, just log it
            }
          }
        }

        // Load usage (this will use the correct subscription tier)
        const usageData = await checkUsageLimit(firebaseUser.uid)
        setUsage(usageData)
      } catch (error) {
        console.error("Error loading dashboard:", error)
        toast.error("Failed to load dashboard")
      } finally {
        setDataLoading(false)
      }
    }

    loadDashboard()

    // Refresh data when page becomes visible (e.g., after returning from Stripe)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !authLoading) {
        loadDashboard()
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [router, firebaseUser, authLoading, initialized, authCheckComplete])

  if (authLoading || !initialized || !authCheckComplete || dataLoading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff5733]"></div>
      </main>
    )
  }

  if (!user) {
    return null
  }

  const isPro = profile?.subscription_tier === "pro"
  const usagePercentage = usage ? (usage.used / usage.limit) * 100 : 0

  return (
    <main className="min-h-screen bg-black">
      <Header />

      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-4xl font-heading font-bold text-white mb-2">
              Welcome back, {user.user_metadata?.full_name || "Developer"}!
            </h1>
            <p className="text-gray-400">Here's your interview preparation overview</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {/* Usage Card */}
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm font-medium flex items-center">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Sessions This Month
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white mb-2">
                  {usage?.used || 0} / {usage?.limit || 2}
                </div>
                <Progress value={usagePercentage} className="h-2 mb-2" />
                <p className="text-xs text-gray-400">
                  {usage?.allowed ? `${usage.limit - (usage.used || 0)} sessions remaining` : "Limit reached"}
                </p>
              </CardContent>
            </Card>

            {/* Plan Card */}
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
                    <Button size="sm" className="w-full bg-[#ff5733] hover:bg-[#ff5733]/80 text-white">
                      Upgrade
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>

            {/* Quick Start Card */}
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm font-medium flex items-center">
                  <Terminal className="h-4 w-4 mr-2" />
                  Quick Start
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link href="/interview">
                  <Button className="w-full bg-[#ff5733] hover:bg-[#ff5733]/80 text-white">
                    Start Practice
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Performance Card */}
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm font-medium flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white mb-1">--</div>
                <p className="text-xs text-gray-400">Complete sessions to see stats</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className="bg-gray-900/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span className="flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-[#ff5733]" />
                  Recent Activity
                </span>
                <Link href="/sessions">
                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                    View All
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No recent sessions</p>
                <p className="text-gray-500 text-sm mt-2">Start practicing to see your activity here</p>
                <Link href="/interview" className="block mt-4">
                  <Button className="bg-[#ff5733] hover:bg-[#ff5733]/80 text-white">
                    <Terminal className="mr-2 h-4 w-4" />
                    Start Practice Session
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </main>
  )
}

