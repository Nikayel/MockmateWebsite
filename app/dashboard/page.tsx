"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
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
  ChevronRight,
  Zap,
  RefreshCw,
  TrendingUp,
  HelpCircle,
  ShieldCheck,
  FlaskConical,
} from "lucide-react"
import { SubscriptionStatusBanner } from "@/components/ui/subscription-status-banner"
import Link from "next/link"
import { toast } from "sonner"

const OnboardingModal = dynamic(
  () => import("@/components/OnboardingModal").then((mod) => mod.OnboardingModal),
  {
    ssr: false,
  }
)
const InteractiveTour = dynamic(
  () => import("@/components/InteractiveTour").then((mod) => mod.InteractiveTour),
  {
    ssr: false,
  }
)
const MetricsOverview = dynamic(
  () => import("@/components/dashboard/MetricsOverview").then((mod) => mod.MetricsOverview),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/50 p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-3 w-1/3 rounded bg-zinc-800"></div>
          <div className="h-3 w-1/2 rounded bg-zinc-800"></div>
        </div>
      </div>
    ),
  }
)

const ReferralWidget = dynamic(
  () => import("@/components/dashboard/ReferralWidget").then((mod) => mod.ReferralWidget),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/50 p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-1/3 rounded bg-zinc-800"></div>
          <div className="h-8 w-full rounded bg-zinc-800"></div>
        </div>
      </div>
    ),
  }
)

export default function DashboardPage() {
  const router = useRouter()
  const { user, firebaseUser, loading: authLoading, initialized } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [usage, setUsage] = useState<{
    used: number
    limit: number
    allowed: boolean
    periodEnd?: string
  } | null>(null)
  const [sessions, setSessions] = useState<InterviewSession[]>([])
  const [completedSessions, setCompletedSessions] = useState<InterviewSession[]>([])
  const [reviewStats, setReviewStats] = useState<{
    overdueCount: number
    totalDue: number
    daysUntilNext: number | null
  }>({ overdueCount: 0, totalDue: 0, daysUntilNext: null })
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
        const [userProfile, usageData, sessionsSnap, dueData] = await Promise.all([
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
          })(),
          (async () => {
            try {
              const token = await firebaseUser.getIdToken()
              const response = await fetch("/api/spaced-repetition/due?limit=10", {
                headers: { Authorization: `Bearer ${token}` },
              })
              if (response.ok) {
                return await response.json()
              }
              return null
            } catch {
              return null
            }
          })(),
        ])

        setProfile(userProfile)
        setUsage(usageData)

        if (dueData) {
          // Find the soonest upcoming review if nothing is due
          let daysUntilNext: number | null = null
          if (
            dueData.stats?.overdue_count === 0 &&
            dueData.stats?.total_due === 0 &&
            dueData.upcoming?.length > 0
          ) {
            // Find the minimum days_until_review from upcoming
            daysUntilNext = Math.min(
              ...dueData.upcoming.map(
                (item: { days_until_review: number }) => item.days_until_review
              )
            )
          }
          setReviewStats({
            overdueCount: dueData.stats?.overdue_count || 0,
            totalDue: dueData.stats?.total_due || 0,
            daysUntilNext,
          })
        }

        if (userProfile && !userProfile.onboarding_completed) {
          setShowOnboarding(true)
        }

        if (sessionsSnap && !sessionsSnap.empty) {
          const sessionsData = sessionsSnap.docs.map(
            (doc) =>
              ({
                id: doc.id,
                ...doc.data(),
              }) as InterviewSession
          )

          sessionsData.sort((a, b) => {
            const dateA = new Date(a.started_at).getTime()
            const dateB = new Date(b.started_at).getTime()
            return dateB - dateA
          })

          // For Recent Activity: show up to 5 most recent (any status)
          setSessions(sessionsData.slice(0, 5))

          // For Recent Avg: only use completed sessions with scores
          const completed = sessionsData.filter(
            (s) => s.performance_score !== undefined && s.performance_score !== null
          )
          setCompletedSessions(completed.slice(0, 5))
        }

        if (
          userProfile &&
          (userProfile.stripe_subscription_id || userProfile.stripe_customer_id) &&
          userProfile.subscription_tier === "free"
        ) {
          firebaseUser.getIdToken().then((token) => {
            fetch("/api/sync-subscription", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ userId: firebaseUser.uid }),
            })
              .then((syncResponse) => {
                if (syncResponse.ok) {
                  return syncResponse.json()
                }
              })
              .then((syncData) => {
                if (syncData?.success && syncData.profile.subscription_tier === "pro") {
                  Promise.all([
                    getUserProfile(firebaseUser.uid),
                    checkUsageLimit(firebaseUser.uid),
                  ]).then(([updatedProfile, updatedUsage]) => {
                    if (updatedProfile) setProfile(updatedProfile)
                    setUsage(updatedUsage)
                  })
                }
              })
              .catch((error) => {
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
      <main className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 animate-pulse rounded-full bg-zinc-600" />
          <div className="h-2 w-2 animate-pulse rounded-full bg-zinc-500 delay-75" />
          <div className="h-2 w-2 animate-pulse rounded-full bg-zinc-400 delay-150" />
        </div>
      </main>
    )
  }

  if (!user) {
    return null
  }

  const isPro = profile?.subscription_tier === "pro"
  const usagePercentage = usage ? (usage.used / usage.limit) * 100 : 0
  const userName =
    user?.user_metadata?.full_name?.split(" ")[0] || firebaseUser?.displayName?.split(" ")[0]

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400"
    if (score >= 60) return "text-amber-400"
    return "text-red-400"
  }

  const getDifficultyStyle = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "text-emerald-400"
      case "medium":
        return "text-amber-400"
      case "hard":
        return "text-red-400"
      default:
        return "text-zinc-400"
    }
  }

  const bugfixSessions = completedSessions.filter((session) => session.type === "bugfix")
  const latestBugfixSession = bugfixSessions[0]
  const latestBugfixEvidence = latestBugfixSession?.bugfix_evidence_summary
  const latestBugfixScore =
    latestBugfixSession?.bugfix_score_breakdown?.overall ?? latestBugfixSession?.performance_score
  const bugfixReadiness =
    bugfixSessions.length > 0
      ? Math.round(
          bugfixSessions.reduce(
            (sum, session) =>
              sum + (session.bugfix_score_breakdown?.overall ?? session.performance_score ?? 0),
            0
          ) / bugfixSessions.length
        )
      : null
  const shouldRecommendBugfixRamp =
    latestBugfixEvidence &&
    (!latestBugfixEvidence.reproducedBeforeEditing ||
      (latestBugfixEvidence.inspectedFiles?.length || 0) < 2 ||
      (latestBugfixEvidence.inspectedTestOrDocs?.length || 0) === 0)

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
            router.push("/interview")
          }}
          onSkip={() => {
            setShowTour(false)
          }}
        />
      )}

      <Header />

      <div className="pt-20 pb-12 sm:pt-24 sm:pb-16">
        <div className="container mx-auto max-w-6xl px-4">
          <h1 className="sr-only">Dashboard</h1>
          <div
            className="mb-6 flex flex-col gap-2 sm:mb-8 sm:flex-row sm:justify-end"
            data-tour="welcome"
          >
            <Link href="/labs">
              <Button
                variant="outline"
                className="w-full border-zinc-700 font-medium text-zinc-300 hover:bg-zinc-800 sm:w-auto"
              >
                <FlaskConical className="mr-2 h-4 w-4" />
                Case Labs
              </Button>
            </Link>
            <Link href="/interview" data-tour="start-practice-btn">
              <Button className="w-full bg-white font-medium text-zinc-900 hover:bg-zinc-200 sm:w-auto">
                <Terminal className="mr-2 h-4 w-4" />
                Start Practice
              </Button>
            </Link>
          </div>

          {/* Stats Row - Responsive grid */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:mb-8 sm:gap-4 lg:grid-cols-4">
            {/* Sessions Used */}
            <div
              className="rounded-xl border border-zinc-800/50 bg-zinc-900/50 p-4"
              data-tour="sessions-card"
            >
              <div className="mb-2 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-zinc-500" />
                <span className="text-xs text-zinc-500">Sessions</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-light text-white sm:text-3xl">
                  {usage?.used || 0}
                </span>
                <span className="text-sm text-zinc-500">/ {usage?.limit || 8}</span>
              </div>
              <Progress value={usagePercentage} className="mt-2 h-1 bg-zinc-800" />
              <p className="mt-1.5 text-[10px] text-zinc-600">
                Resets{" "}
                {usage?.periodEnd
                  ? new Date(usage.periodEnd).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  : "next month"}
              </p>
            </div>

            {/* Plan */}
            <div
              className="rounded-xl border border-zinc-800/50 bg-zinc-900/50 p-4"
              data-tour="subscription-card"
            >
              <div className="mb-2 flex items-center gap-2">
                <Crown className="h-4 w-4 text-zinc-500" />
                <span className="text-xs text-zinc-500">Plan</span>
              </div>
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={`text-lg font-medium ${isPro ? "text-amber-400" : "text-zinc-300"}`}
                >
                  {isPro ? "Pro" : "Free"}
                </span>
                {isPro && <Crown className="h-4 w-4 text-amber-400" />}
              </div>
              {!isPro && (
                <Link href="/upgrade">
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-1 h-7 w-full border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-800"
                  >
                    Upgrade
                  </Button>
                </Link>
              )}
            </div>

            {/* Due for Review */}
            <Link
              href="/practice"
              className="rounded-xl border border-zinc-800/50 bg-zinc-900/50 p-4 transition-colors hover:border-zinc-700 hover:bg-zinc-800/50"
            >
              <div className="mb-2 flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-zinc-500" />
                <span className="text-xs text-zinc-500">
                  {reviewStats.overdueCount > 0 ? "Overdue" : "Next Review"}
                </span>
              </div>
              {reviewStats.overdueCount > 0 ? (
                <>
                  <span className="text-2xl font-light text-red-400 sm:text-3xl">
                    {reviewStats.overdueCount}
                  </span>
                  <p className="mt-1.5 text-[10px] text-zinc-600">
                    {reviewStats.overdueCount === 1 ? "Problem overdue" : "Problems overdue"}
                  </p>
                </>
              ) : reviewStats.totalDue > 0 ? (
                <>
                  <span className="text-2xl font-light text-amber-400 sm:text-3xl">
                    {reviewStats.totalDue}
                  </span>
                  <p className="mt-1.5 text-[10px] text-zinc-600">Due today</p>
                </>
              ) : reviewStats.daysUntilNext !== null ? (
                <>
                  <span className="text-2xl font-light text-white sm:text-3xl">
                    {reviewStats.daysUntilNext}d
                  </span>
                  <p className="mt-1.5 text-[10px] text-zinc-600">Until next review</p>
                </>
              ) : (
                <>
                  <span className="text-2xl font-light text-emerald-400 sm:text-3xl">—</span>
                  <p className="mt-1.5 text-[10px] text-zinc-600">No reviews scheduled</p>
                </>
              )}
            </Link>

            {/* Recent Avg Score */}
            <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-zinc-500" />
                <span className="text-xs text-zinc-500">Recent Avg</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3 w-3 cursor-help text-zinc-600" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs bg-zinc-800 text-zinc-200">
                    <p>
                      Interview Score: Your overall performance including code quality (30%),
                      problem solving (25%), understanding (25%), and communication (20%)
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              {completedSessions.length > 0 ? (
                <>
                  <span
                    className={`text-2xl font-light sm:text-3xl ${getScoreColor(
                      Math.round(
                        completedSessions.reduce((acc, s) => acc + (s.performance_score || 0), 0) /
                          completedSessions.length
                      )
                    )}`}
                  >
                    {Math.round(
                      completedSessions.reduce((acc, s) => acc + (s.performance_score || 0), 0) /
                        completedSessions.length
                    )}
                    %
                  </span>
                  <p className="mt-1.5 text-[10px] text-zinc-600">
                    Last {completedSessions.length} completed sessions
                  </p>
                </>
              ) : (
                <>
                  <span className="text-2xl font-light text-zinc-600 sm:text-3xl">—</span>
                  <p className="mt-1.5 text-[10px] text-zinc-600">No data yet</p>
                </>
              )}
            </div>
          </div>

          {/* Main Content - Responsive 2-column */}
          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-5">
            {/* Left column - Recent Activity + Referral Widget */}
            <div className="space-y-4 lg:col-span-3">
              {/* Recent Activity */}
              <div
                className="rounded-xl border border-zinc-800/50 bg-zinc-900/50"
                data-tour="recent-activity"
              >
                <div className="flex items-center justify-between border-b border-zinc-800/50 p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-zinc-500" />
                    <span className="text-sm font-medium text-zinc-300">Recent Activity</span>
                  </div>
                  <Link href="/sessions">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-zinc-500 hover:text-white"
                    >
                      View All
                      <ChevronRight className="ml-1 h-3 w-3" />
                    </Button>
                  </Link>
                </div>

                {sessions.length === 0 ? (
                  <div className="p-8 text-center sm:p-12">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800">
                      <Calendar className="h-6 w-6 text-zinc-600" />
                    </div>
                    <p className="mb-1 text-sm text-zinc-400">No sessions yet</p>
                    <p className="mb-4 text-xs text-zinc-600">
                      Start practicing to track your progress
                    </p>
                    <Link href="/interview">
                      <Button size="sm" className="bg-white text-zinc-900 hover:bg-zinc-200">
                        <Zap className="mr-1.5 h-3.5 w-3.5" />
                        Start First Session
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-800/50">
                    {sessions.map((session) => {
                      // Determine session state: completed, evaluating, or in-progress
                      // Note: Legacy sessions may not have feedback_status, treat completed_at as complete
                      const isEvaluating = session.feedback_status === "pending"
                      const isCompleted =
                        session.completed_at &&
                        (session.feedback_status === "complete" || !session.feedback_status)
                      const isInProgress = !session.completed_at && !isEvaluating

                      // Link to session detail if completed or evaluating, otherwise reopen interview
                      const href =
                        isCompleted || isEvaluating
                          ? `/sessions/${session.id}`
                          : `/interview?session=${session.id}&scenario=${session.scenario_id}`

                      return (
                        <Link
                          key={session.id}
                          href={href}
                          className="flex items-center gap-3 p-3 transition-colors hover:bg-zinc-800/30 sm:p-4"
                        >
                          {/* Score indicator */}
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-mono text-sm sm:h-11 sm:w-11 ${
                              session.performance_score
                                ? session.performance_score >= 80
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : session.performance_score >= 60
                                    ? "bg-amber-500/10 text-amber-400"
                                    : "bg-red-500/10 text-red-400"
                                : isEvaluating
                                  ? "bg-blue-500/10 text-blue-400"
                                  : isInProgress
                                    ? "bg-amber-500/10 text-amber-400"
                                    : "bg-zinc-800 text-zinc-500"
                            }`}
                          >
                            {session.performance_score
                              ? Math.round(session.performance_score)
                              : isEvaluating
                                ? "⏳"
                                : isInProgress
                                  ? "..."
                                  : "—"}
                          </div>

                          {/* Content */}
                          <div className="min-w-0 flex-1">
                            <div className="mb-0.5 flex items-center gap-2">
                              <span className="truncate text-sm font-medium text-white">
                                {session.topic}
                              </span>
                              <span
                                className={`text-[10px] tracking-wider uppercase ${getDifficultyStyle(session.difficulty)}`}
                              >
                                {session.difficulty}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-zinc-500">
                              <span>
                                {new Date(session.started_at).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                              {isEvaluating && (
                                <Badge className="border-0 bg-blue-500/10 px-1.5 py-0 text-[10px] text-blue-400">
                                  Evaluating
                                </Badge>
                              )}
                              {isInProgress && (
                                <Badge className="border-0 bg-amber-500/10 px-1.5 py-0 text-[10px] text-amber-400">
                                  In Progress
                                </Badge>
                              )}
                            </div>
                          </div>

                          <ChevronRight className="h-4 w-4 shrink-0 text-zinc-600" />
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Referral Widget - below Recent Activity */}
              <ReferralWidget />
            </div>

            {/* Metrics Overview - 2 cols on lg */}
            <div className="space-y-4 lg:col-span-2" data-tour="quick-start">
              <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/50 p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <span className="truncate text-sm font-medium text-zinc-300">
                      Bugfix Readiness
                    </span>
                  </div>
                  {bugfixReadiness !== null && (
                    <span className={`text-xl font-light ${getScoreColor(bugfixReadiness)}`}>
                      {bugfixReadiness}%
                    </span>
                  )}
                </div>

                {bugfixReadiness === null ? (
                  <div className="space-y-3">
                    <p className="text-sm text-zinc-400">
                      Practice production incidents and build a separate debugging signal.
                    </p>
                    <Link href="/interview?practice=true&type=bugfix">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-full border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-800"
                      >
                        <Terminal className="mr-1.5 h-3.5 w-3.5" />
                        Start Bugfix
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-zinc-950/60 p-2">
                        <p className="text-zinc-500">Last Score</p>
                        <p
                          className={
                            latestBugfixScore ? getScoreColor(latestBugfixScore) : "text-zinc-500"
                          }
                        >
                          {latestBugfixScore ? `${Math.round(latestBugfixScore)}%` : "—"}
                        </p>
                      </div>
                      <div className="rounded-lg bg-zinc-950/60 p-2">
                        <p className="text-zinc-500">Files Opened</p>
                        <p className="text-zinc-300">
                          {latestBugfixEvidence?.inspectedFiles?.length || 0}
                        </p>
                      </div>
                      <div className="rounded-lg bg-zinc-950/60 p-2">
                        <p className="text-zinc-500">Tests Run</p>
                        <p className="text-zinc-300">
                          {latestBugfixEvidence?.visibleTestsRun || 0}
                        </p>
                      </div>
                      <div className="rounded-lg bg-zinc-950/60 p-2">
                        <p className="text-zinc-500">AI Shortcut</p>
                        <p
                          className={
                            latestBugfixEvidence?.aiShortcutCount
                              ? "text-amber-400"
                              : "text-emerald-400"
                          }
                        >
                          {latestBugfixEvidence?.aiShortcutCount || 0}
                        </p>
                      </div>
                    </div>

                    {shouldRecommendBugfixRamp && (
                      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
                        <p className="text-xs font-medium text-emerald-300">
                          Beginner Debugger track recommended
                        </p>
                        <p className="mt-1 text-xs text-zinc-400">
                          Focus on reproducing before editing and opening the visible test first.
                        </p>
                      </div>
                    )}

                    <Link href="/interview?practice=true&type=bugfix">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-full border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-800"
                      >
                        <Terminal className="mr-1.5 h-3.5 w-3.5" />
                        Practice Bugfix
                      </Button>
                    </Link>
                  </div>
                )}
              </div>

              <MetricsOverview />
            </div>
          </div>

          {/* Subscription Status Warning - payment issues, cancellation, etc. */}
          <SubscriptionStatusBanner profile={profile} />

          {/* Usage Warning - Show when low */}
          {!isPro && usagePercentage >= 80 && (
            <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-400">Running low on sessions</p>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    Upgrade to Pro for unlimited access
                  </p>
                </div>
                <Link href="/upgrade">
                  <Button
                    size="sm"
                    className="w-full bg-amber-500 text-black hover:bg-amber-600 sm:w-auto"
                  >
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
