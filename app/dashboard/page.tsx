"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/lib/auth-context"
import { getUserProfile, initializeUserQuota, checkUsageLimit } from "@/lib/firestore-helpers"
import { Profile, ProfileQuota, InterviewSession } from "@/lib/types"
import { PRICING_CONFIG } from "@/lib/config"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs } from "firebase/firestore"
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

// Dynamically import modals to reduce initial bundle size
const OnboardingModal = dynamic(() => import("@/components/OnboardingModal").then(mod => mod.OnboardingModal), {
  ssr: false
})
const InteractiveTour = dynamic(() => import("@/components/InteractiveTour").then(mod => mod.InteractiveTour), {
  ssr: false
})
const MetricsOverview = dynamic(() => import("@/components/dashboard/MetricsOverview").then(mod => mod.MetricsOverview), {
  ssr: false,
  loading: () => (
    <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
      <div className="animate-pulse space-y-3">
        <div className="h-4 bg-gray-800 rounded w-1/3"></div>
        <div className="h-4 bg-gray-800 rounded w-1/2"></div>
      </div>
    </div>
  )
})

export default function DashboardPage() {
  const router = useRouter()
  const { user, firebaseUser, loading: authLoading, initialized } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [usage, setUsage] = useState<{ used: number; limit: number; allowed: boolean; periodEnd?: string } | null>(null)
  const [sessions, setSessions] = useState<InterviewSession[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [authCheckComplete, setAuthCheckComplete] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showTour, setShowTour] = useState(false)

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
        // Parallelize initial data loading for faster page load
        const [userProfile, usageData, sessionsSnap] = await Promise.all([
          getUserProfile(firebaseUser.uid),
          checkUsageLimit(firebaseUser.uid),
          // Load recent sessions in parallel
          (async () => {
            try {
              const sessionsQuery = query(
                collection(db, "interview_sessions"),
                where("user_id", "==", firebaseUser.uid)
              )
              return await getDocs(sessionsQuery)
            } catch {
              return null
            }
          })()
        ])

        setProfile(userProfile)
        setUsage(usageData)

        // Check if onboarding is needed for new users
        if (userProfile && !userProfile.onboarding_completed) {
          setShowOnboarding(true)
        }

        // Process sessions if loaded
        if (sessionsSnap && !sessionsSnap.empty) {
          const sessionsData = sessionsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as InterviewSession))

          // Sort by started_at descending and take first 5
          sessionsData.sort((a, b) => {
            const dateA = new Date(a.started_at).getTime()
            const dateB = new Date(b.started_at).getTime()
            return dateB - dateA
          })

          setSessions(sessionsData.slice(0, 5))
        }

        // Auto-sync subscription if user has Stripe IDs but tier is "free"
        // This fixes Pro users who were incorrectly reset (non-blocking)
        if (userProfile && (userProfile.stripe_subscription_id || userProfile.stripe_customer_id) &&
            userProfile.subscription_tier === "free") {
          // Run sync in background, don't block page load
          firebaseUser.getIdToken().then(token => {
            fetch("/api/sync-subscription", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
              },
              body: JSON.stringify({ userId: firebaseUser.uid }),
            }).then(syncResponse => {
              if (syncResponse.ok) {
                return syncResponse.json()
              }
            }).then(syncData => {
              if (syncData?.success && syncData.profile.subscription_tier === "pro") {
                // Reload profile and usage after sync
                Promise.all([
                  getUserProfile(firebaseUser.uid),
                  checkUsageLimit(firebaseUser.uid)
                ]).then(([updatedProfile, updatedUsage]) => {
                  if (updatedProfile) setProfile(updatedProfile)
                  setUsage(updatedUsage)
                })
              }
            }).catch((error) => {
              // Auto-sync failed - show toast so user knows to try manual refresh
              console.error("Subscription sync failed:", error)
              toast.error("Could not sync subscription status. Please refresh the page.")
            })
          })
        }
      } catch {
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00d9ff]"></div>
      </main>
    )
  }

  if (!user) {
    return null
  }

  const isPro = profile?.subscription_tier === "pro"
  const usagePercentage = usage ? (usage.used / usage.limit) * 100 : 0

  // Calculate performance metrics from completed sessions
  const completedSessions = sessions.filter(s => s.completed_at && s.performance_score !== undefined)
  const avgPerformance = completedSessions.length > 0
    ? Math.round(completedSessions.reduce((sum, s) => sum + (s.performance_score || 0), 0) / completedSessions.length)
    : null

  // Get user's first name for welcome message
  const userName = user?.user_metadata?.full_name?.split(' ')[0] || firebaseUser?.displayName?.split(' ')[0]

  return (
    <main className="min-h-screen bg-black">
      {/* Onboarding modal for first-time users */}
      <OnboardingModal
        isOpen={showOnboarding}
        userId={firebaseUser?.uid || ""}
        userName={userName}
        onComplete={async (takeTour: boolean) => {
          setShowOnboarding(false)
          // Show tour if user chose to take it
          if (takeTour) {
            setShowTour(true)
          }
          // Reload profile to get updated onboarding status
          if (firebaseUser) {
            try {
              const updatedProfile = await getUserProfile(firebaseUser.uid)
              if (updatedProfile) {
                setProfile(updatedProfile)
              }
            } catch (error) {
              console.error("Error reloading profile after onboarding:", error)
            }
          }
        }}
      />

      {/* Interactive tour for new users */}
      {firebaseUser && (
        <InteractiveTour
          isOpen={showTour}
          userId={firebaseUser.uid}
          userName={userName}
          onComplete={() => {
            setShowTour(false)
            router.push('/interview')
          }}
          onSkip={() => {
            setShowTour(false)
          }}
        />
      )}

      <Header />

      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Welcome Section */}
          <div className="mb-8" data-tour="welcome">
            <h1 className="text-4xl font-heading font-bold text-white mb-2">
              Welcome back, {user.user_metadata?.full_name || "Developer"}!
            </h1>
            <p className="text-gray-400">Here's your interview preparation overview</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Usage Card */}
            <Card className="bg-gray-900/50 border-gray-700" data-tour="sessions-card">
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
                <p className="text-xs text-gray-500 mt-1">
                  Resets {usage?.periodEnd
                    ? new Date(usage.periodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : 'next month'}
                </p>
              </CardContent>
            </Card>

            {/* Plan Card */}
            <Card className="bg-gray-900/50 border-gray-700" data-tour="subscription-card">
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

            {/* Quick Start Card */}
            <Card className="bg-gray-900/50 border-gray-700" data-tour="quick-start">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm font-medium flex items-center">
                  <Terminal className="h-4 w-4 mr-2" />
                  Quick Start
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link href="/interview">
                  <Button className="w-full bg-[#00d9ff] hover:bg-[#00d9ff]/80 text-white" data-tour="start-practice-btn">
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
                {avgPerformance !== null ? (
                  <>
                    <div className="text-3xl font-bold text-white mb-1">{avgPerformance}%</div>
                    <p className="text-xs text-gray-400">Average score across {completedSessions.length} session{completedSessions.length !== 1 ? 's' : ''}</p>
                  </>
                ) : (
                  <>
                    <div className="text-3xl font-bold text-white mb-1">--</div>
                    <p className="text-xs text-gray-400">Complete sessions to see stats</p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Content Grid: Recent Activity & Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Recent Activity - Takes 2 columns */}
            <Card className="bg-gray-900/50 border-gray-700 lg:col-span-2" data-tour="recent-activity">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span className="flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-[#00d9ff]" />
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
              {sessions.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No recent sessions</p>
                  <p className="text-gray-500 text-sm mt-2">Start practicing to see your activity here</p>
                  <Link href="/interview" className="block mt-4">
                    <Button className="bg-[#00d9ff] hover:bg-[#00d9ff]/80 text-white">
                      <Terminal className="mr-2 h-4 w-4" />
                      Start Practice Session
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <Link
                      key={session.id}
                      href={session.completed_at ? `/sessions/${session.id}` : `/interview?session=${session.id}&scenario=${session.scenario_id}`}
                      className="block p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-white font-medium text-sm mb-1">{session.topic}</h4>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <Calendar className="h-3 w-3" />
                            {new Date(session.started_at).toLocaleDateString()}
                            {session.completed_at && session.performance_score !== undefined && (
                              <>
                                <span>•</span>
                                <span className="text-[#00d9ff]">{Math.round(session.performance_score)}% score</span>
                              </>
                            )}
                            {!session.completed_at && (
                              <>
                                <span>•</span>
                                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                                  In Progress
                                </Badge>
                              </>
                            )}
                          </div>
                        </div>
                        <Badge className={
                          session.difficulty === "easy" ? "bg-green-600/20 text-green-400 border-green-600/30" :
                          session.difficulty === "medium" ? "bg-yellow-600/20 text-yellow-400 border-yellow-600/30" :
                          "bg-red-600/20 text-red-400 border-red-600/30"
                        }>
                          {session.difficulty.toUpperCase()}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

            {/* Performance Insights - Takes 1 column */}
            <MetricsOverview />
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}

