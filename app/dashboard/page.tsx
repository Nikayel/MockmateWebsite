"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/lib/auth-context"
import { getUserProfile, checkUsageLimit } from "@/lib/firestore-helpers"
import { Profile, InterviewSession } from "@/lib/types"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs } from "firebase/firestore"
import {
  Crown,
  BarChart3,
  Calendar,
  Terminal,
  Clock,
  ArrowRight,
  ChevronRight,
  Zap,
  Target,
  TrendingUp
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

const OnboardingModal = dynamic(() => import("@/components/OnboardingModal").then(mod => mod.OnboardingModal), {
  ssr: false
})
const InteractiveTour = dynamic(() => import("@/components/InteractiveTour").then(mod => mod.InteractiveTour), {
  ssr: false
})
const MetricsOverview = dynamic(() => import("@/components/dashboard/MetricsOverview").then(mod => mod.MetricsOverview), {
  ssr: false,
  loading: () => (
    <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4">
      <div className="animate-pulse space-y-2">
        <div className="h-3 bg-zinc-800 rounded w-1/3"></div>
        <div className="h-3 bg-zinc-800 rounded w-1/2"></div>
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

  useEffect(() => {
    if (!initialized || authLoading) return
    const timer = setTimeout(() => {
      setAuthCheckComplete(true)
    }, 300)
    return () => clearTimeout(timer)
  }, [initialized, authLoading])

  useEffect(() => {
    const loadDashboard = async () => {
      if (authLoading || !initialized || !authCheckComplete) return

      if (!firebaseUser) {
        router.push("/login?redirect=dashboard")
        return
      }

      try {
        const [userProfile, usageData, sessionsSnap] = await Promise.all([
          getUserProfile(firebaseUser.uid),
          checkUsageLimit(firebaseUser.uid),
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

        if (userProfile && !userProfile.onboarding_completed) {
          setShowOnboarding(true)
        }

        if (sessionsSnap && !sessionsSnap.empty) {
          const sessionsData = sessionsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as InterviewSession))

          sessionsData.sort((a, b) => {
            const dateA = new Date(a.started_at).getTime()
            const dateB = new Date(b.started_at).getTime()
            return dateB - dateA
          })

          setSessions(sessionsData.slice(0, 5))
        }

        if (userProfile && (userProfile.stripe_subscription_id || userProfile.stripe_customer_id) &&
            userProfile.subscription_tier === "free") {
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
                Promise.all([
                  getUserProfile(firebaseUser.uid),
                  checkUsageLimit(firebaseUser.uid)
                ]).then(([updatedProfile, updatedUsage]) => {
                  if (updatedProfile) setProfile(updatedProfile)
                  setUsage(updatedUsage)
                })
              }
            }).catch((error) => {
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
      <main className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-zinc-600 rounded-full animate-pulse" />
          <div className="w-2 h-2 bg-zinc-500 rounded-full animate-pulse delay-75" />
          <div className="w-2 h-2 bg-zinc-400 rounded-full animate-pulse delay-150" />
        </div>
      </main>
    )
  }

  if (!user) {
    return null
  }

  const isPro = profile?.subscription_tier === "pro"
  const usagePercentage = usage ? (usage.used / usage.limit) * 100 : 0
  const userName = user?.user_metadata?.full_name?.split(' ')[0] || firebaseUser?.displayName?.split(' ')[0]

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400'
    if (score >= 60) return 'text-amber-400'
    return 'text-red-400'
  }

  const getDifficultyStyle = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-emerald-400'
      case 'medium': return 'text-amber-400'
      case 'hard': return 'text-red-400'
      default: return 'text-zinc-400'
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950">
      <OnboardingModal
        isOpen={showOnboarding}
        userId={firebaseUser?.uid || ""}
        userName={userName}
        onComplete={async (takeTour: boolean) => {
          setShowOnboarding(false)
          if (takeTour) {
            setShowTour(true)
          }
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

      <div className="pt-20 sm:pt-24 pb-12 sm:pb-16">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Header Row - Responsive */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8" data-tour="welcome">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-white">
                Welcome back{userName ? `, ${userName}` : ''}
              </h1>
              <p className="text-zinc-500 text-sm mt-1">Your interview prep overview</p>
            </div>
            <Link href="/interview" data-tour="start-practice-btn">
              <Button className="w-full sm:w-auto bg-white hover:bg-zinc-200 text-zinc-900 font-medium">
                <Terminal className="mr-2 h-4 w-4" />
                Start Practice
              </Button>
            </Link>
          </div>

          {/* Stats Row - Responsive grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            {/* Sessions Used */}
            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4" data-tour="sessions-card">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-4 w-4 text-zinc-500" />
                <span className="text-xs text-zinc-500">Sessions</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-light text-white">{usage?.used || 0}</span>
                <span className="text-zinc-500 text-sm">/ {usage?.limit || 2}</span>
              </div>
              <Progress value={usagePercentage} className="h-1 mt-2 bg-zinc-800" />
              <p className="text-[10px] text-zinc-600 mt-1.5">
                Resets {usage?.periodEnd
                  ? new Date(usage.periodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : 'next month'}
              </p>
            </div>

            {/* Plan */}
            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4" data-tour="subscription-card">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-4 w-4 text-zinc-500" />
                <span className="text-xs text-zinc-500">Plan</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-lg font-medium ${isPro ? 'text-amber-400' : 'text-zinc-300'}`}>
                  {isPro ? 'Pro' : 'Free'}
                </span>
                {isPro && <Crown className="h-4 w-4 text-amber-400" />}
              </div>
              {!isPro && (
                <Link href="/upgrade">
                  <Button size="sm" variant="outline" className="w-full h-7 text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-800 mt-1">
                    Upgrade
                  </Button>
                </Link>
              )}
            </div>

            {/* Total Sessions */}
            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-zinc-500" />
                <span className="text-xs text-zinc-500">Total Sessions</span>
              </div>
              <span className="text-2xl sm:text-3xl font-light text-white">{sessions.length > 0 ? sessions.length : '0'}</span>
              <p className="text-[10px] text-zinc-600 mt-1.5">All time</p>
            </div>

            {/* Avg Score */}
            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-zinc-500" />
                <span className="text-xs text-zinc-500">Avg Score</span>
              </div>
              {sessions.filter(s => s.performance_score).length > 0 ? (
                <>
                  <span className={`text-2xl sm:text-3xl font-light ${getScoreColor(
                    Math.round(sessions.filter(s => s.performance_score).reduce((acc, s) => acc + (s.performance_score || 0), 0) / sessions.filter(s => s.performance_score).length)
                  )}`}>
                    {Math.round(sessions.filter(s => s.performance_score).reduce((acc, s) => acc + (s.performance_score || 0), 0) / sessions.filter(s => s.performance_score).length)}%
                  </span>
                  <p className="text-[10px] text-zinc-600 mt-1.5">From completed sessions</p>
                </>
              ) : (
                <>
                  <span className="text-2xl sm:text-3xl font-light text-zinc-600">—</span>
                  <p className="text-[10px] text-zinc-600 mt-1.5">No data yet</p>
                </>
              )}
            </div>
          </div>

          {/* Main Content - Responsive 2-column */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
            {/* Recent Activity - 3 cols on lg */}
            <div className="lg:col-span-3 bg-zinc-900/50 border border-zinc-800/50 rounded-xl" data-tour="recent-activity">
              <div className="flex items-center justify-between p-4 border-b border-zinc-800/50">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-zinc-500" />
                  <span className="text-sm font-medium text-zinc-300">Recent Activity</span>
                </div>
                <Link href="/sessions">
                  <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-white h-7 text-xs">
                    View All
                    <ChevronRight className="ml-1 h-3 w-3" />
                  </Button>
                </Link>
              </div>

              {sessions.length === 0 ? (
                <div className="p-8 sm:p-12 text-center">
                  <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                    <Calendar className="h-6 w-6 text-zinc-600" />
                  </div>
                  <p className="text-zinc-400 text-sm mb-1">No sessions yet</p>
                  <p className="text-zinc-600 text-xs mb-4">Start practicing to track your progress</p>
                  <Link href="/interview">
                    <Button size="sm" className="bg-white hover:bg-zinc-200 text-zinc-900">
                      <Zap className="mr-1.5 h-3.5 w-3.5" />
                      Start First Session
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-zinc-800/50">
                  {sessions.map((session) => (
                    <Link
                      key={session.id}
                      href={session.completed_at ? `/sessions/${session.id}` : `/interview?session=${session.id}&scenario=${session.scenario_id}`}
                      className="flex items-center gap-3 p-3 sm:p-4 hover:bg-zinc-800/30 transition-colors"
                    >
                      {/* Score indicator */}
                      <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center font-mono text-sm shrink-0 ${
                        session.performance_score
                          ? session.performance_score >= 80 ? 'bg-emerald-500/10 text-emerald-400' :
                            session.performance_score >= 60 ? 'bg-amber-500/10 text-amber-400' :
                            'bg-red-500/10 text-red-400'
                          : !session.completed_at ? 'bg-amber-500/10 text-amber-400' : 'bg-zinc-800 text-zinc-500'
                      }`}>
                        {session.performance_score ? Math.round(session.performance_score) : !session.completed_at ? '...' : '—'}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm text-white font-medium truncate">{session.topic}</span>
                          <span className={`text-[10px] uppercase tracking-wider ${getDifficultyStyle(session.difficulty)}`}>
                            {session.difficulty}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          <span>{new Date(session.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          {!session.completed_at && (
                            <Badge className="bg-amber-500/10 text-amber-400 border-0 text-[10px] px-1.5 py-0">
                              In Progress
                            </Badge>
                          )}
                        </div>
                      </div>

                      <ChevronRight className="h-4 w-4 text-zinc-600 shrink-0" />
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Metrics Overview - 2 cols on lg */}
            <div className="lg:col-span-2" data-tour="quick-start">
              <MetricsOverview />
            </div>
          </div>

          {/* Usage Warning - Show when low */}
          {!isPro && usagePercentage >= 80 && (
            <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-amber-400 text-sm font-medium">Running low on sessions</p>
                  <p className="text-zinc-400 text-xs mt-0.5">Upgrade to Pro for unlimited access</p>
                </div>
                <Link href="/upgrade">
                  <Button size="sm" className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-black">
                    <Crown className="mr-1.5 h-3.5 w-3.5" />
                    Upgrade
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </main>
  )
}
