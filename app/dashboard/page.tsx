"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { getCurrentUser, convertFirebaseUser } from "@/lib/auth"
import { getUserProfile, initializeUserQuota, checkUsageLimit } from "@/lib/firestore-helpers"
import { User as UserType, Profile, ProfileQuota } from "@/lib/types"
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
  const [user, setUser] = useState<UserType | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [usage, setUsage] = useState<{ used: number; limit: number; allowed: boolean } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const firebaseUser = await getCurrentUser()
        if (!firebaseUser) {
          router.push("/login?redirect=dashboard")
          return
        }

        const convertedUser = convertFirebaseUser(firebaseUser)
        setUser(convertedUser)

        // Load profile (refresh to get latest subscription status)
        const userProfile = await getUserProfile(firebaseUser.uid)
        if (userProfile) {
          setProfile(userProfile)
        }

        // Load usage (this will use the correct subscription tier)
        const usageData = await checkUsageLimit(firebaseUser.uid)
        setUsage(usageData)
      } catch (error) {
        console.error("Error loading dashboard:", error)
        toast.error("Failed to load dashboard")
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
    
    // Refresh data when page becomes visible (e.g., after returning from Stripe)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadDashboard()
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [router])

  if (loading) {
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

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - 2/3 */}
            <div className="lg:col-span-2 space-y-6">
              {/* Practice Section */}
              <Card className="bg-gray-900/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center justify-between">
                    <span className="flex items-center">
                      <Terminal className="h-5 w-5 mr-2 text-[#ff5733]" />
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
                        <Button className="w-full bg-[#ff5733] hover:bg-[#ff5733]/80 text-white py-6 text-lg">
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

              {/* Recent Activity */}
              <Card className="bg-gray-900/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Clock className="h-5 w-5 mr-2 text-[#ff5733]" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No recent sessions</p>
                    <p className="text-gray-500 text-sm mt-2">Start practicing to see your activity here</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - 1/3 */}
            <div className="space-y-6">
              {/* Profile Summary */}
              <Card className="bg-gray-900/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <User className="h-5 w-5 mr-2 text-[#ff5733]" />
                    Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center">
                      <User className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{user.user_metadata?.full_name || "Developer"}</p>
                      <p className="text-gray-400 text-sm">{user.email}</p>
                    </div>
                  </div>
                  <Link href="/profile">
                    <Button variant="outline" className="w-full border-gray-600 text-white hover:bg-gray-800">
                      View Full Profile
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Quick Links */}
              <Card className="bg-gray-900/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Quick Links</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Link href="/sessions">
                    <Button variant="ghost" className="w-full justify-start text-white hover:bg-gray-800">
                      <Clock className="mr-2 h-4 w-4" />
                      View All Sessions
                    </Button>
                  </Link>
                  <Link href="/profile">
                    <Button variant="ghost" className="w-full justify-start text-white hover:bg-gray-800">
                      <User className="mr-2 h-4 w-4" />
                      Account Settings
                    </Button>
                  </Link>
                  {!isPro && (
                    <Link href="/upgrade">
                      <Button variant="ghost" className="w-full justify-start text-white hover:bg-gray-800">
                        <Crown className="mr-2 h-4 w-4" />
                        Upgrade to Pro
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}

