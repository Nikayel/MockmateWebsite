"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { useAuth } from "@/lib/auth-context"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { type DueItem } from "@/components/practice"
import {
  CorrectionTraceBanner,
  type CorrectionTrace,
} from "@/components/practice/CorrectionTraceBanner"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Loader2, Lock, ArrowRight, HelpCircle, List, CalendarDays } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

// Dynamic imports for heavy components - reduces initial bundle size
const StreakBanner = dynamic(
  () => import("@/components/practice").then((mod) => mod.StreakBanner),
  { ssr: false, loading: () => <div className="bg-foreground/5 h-16 animate-pulse rounded-lg" /> }
)

const DueForReview = dynamic(
  () => import("@/components/practice").then((mod) => mod.DueForReview),
  { ssr: false, loading: () => <div className="bg-foreground/5 h-64 animate-pulse rounded-lg" /> }
)

const PatternMastery = dynamic(
  () => import("@/components/practice").then((mod) => mod.PatternMastery),
  { ssr: false, loading: () => <div className="bg-foreground/5 h-48 animate-pulse rounded-lg" /> }
)

const ReviewCalendar = dynamic(
  () => import("@/components/practice").then((mod) => mod.ReviewCalendar),
  { ssr: false, loading: () => <div className="bg-foreground/5 h-96 animate-pulse rounded-lg" /> }
)

interface StatsData {
  overall: {
    total_problems_seen: number
    problems_mastered: number
    problems_reviewing: number
    problems_learning: number
    problems_new: number
    mastery_percentage: number
    streak_days: number
    longest_streak_days: number
    total_reviews: number
    average_score: number
    total_time_minutes: number
  }
  by_pattern: {
    pattern: string
    total: number
    mastered: number
    reviewing?: number
    learning?: number
    new_count?: number
    average_score: number
    mastery_percentage: number
    weakest_problem_id?: string
    weakest_problem_title?: string
  }[]
  by_difficulty: {
    difficulty: "easy" | "medium" | "hard"
    total: number
    mastered: number
    average_score: number
  }[]
  daily_goal: number
  daily_progress: number
  problems_today: string[]
}

interface DueData {
  due_now: DueItem[]
  due_in_minutes: DueItem[] // FSRS learning steps
  due_today: DueItem[]
  upcoming: DueItem[]
  user_algorithm?: "sm2" | "fsrs"
  stats: {
    total_due: number
    overdue_count: number
    learning_steps_due?: number
    streak_at_risk: boolean
  }
  settings?: {
    max_daily_reviews: number
    is_overwhelmed: boolean
    defer_count: number
  }
}

export default function PracticePage() {
  const router = useRouter()
  const { user, loading: authLoading, initialized } = useAuth()
  const [stats, setStats] = useState<StatsData | null>(null)
  const [due, setDue] = useState<DueData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPro, setIsPro] = useState<boolean | null>(null)
  /** True when entitlement could not be determined — distinct from "not entitled". */
  const [entitlementFailed, setEntitlementFailed] = useState(false)
  const [isDeferring, setIsDeferring] = useState(false)
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list")
  const [corrections, setCorrections] = useState<CorrectionTrace[]>([])

  const getAuthToken = useCallback(async () => {
    const { auth } = await import("@/lib/firebase")
    const currentUser = auth.currentUser
    if (!currentUser) return null
    return currentUser.getIdToken()
  }, [])

  const fetchData = useCallback(async () => {
    try {
      const token = await getAuthToken()
      if (!token) return

      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      }

      const [statsRes, dueRes, correctionsRes] = await Promise.all([
        fetch("/api/spaced-repetition/stats", { headers }),
        fetch("/api/spaced-repetition/due", { headers }),
        fetch("/api/learner-model/corrections", { headers }),
      ])

      if (!statsRes.ok || !dueRes.ok) {
        throw new Error("Failed to fetch data")
      }

      const [statsData, dueData] = await Promise.all([statsRes.json(), dueRes.json()])

      setStats(statsData)
      setDue(dueData)

      // Learner-model correction traces are best-effort: the banner is an
      // enhancement, never a reason for the page to fail.
      if (correctionsRes.ok) {
        const correctionsData = await correctionsRes.json()
        const traces: CorrectionTrace[] = correctionsData.corrections ?? []
        setCorrections(traces)
        if (traces.length > 0) {
          void fetch("/api/learner-model/events", {
            method: "POST",
            headers,
            body: JSON.stringify({
              event_type: "olm_trace_shown",
              payload: { count: traces.length },
            }),
          }).catch(() => {})
        }
      }
    } catch (err) {
      // Error logged via monitoring; user sees friendly message
      setError("Failed to load practice data. Please try refreshing the page.")
    } finally {
      setIsLoading(false)
    }
  }, [getAuthToken])

  const handleSkipProblem = async (problemId: string) => {
    try {
      const token = await getAuthToken()
      if (!token) return

      const res = await fetch("/api/spaced-repetition/skip", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ problem_id: problemId }),
      })

      if (res.ok) {
        const dueRes = await fetch("/api/spaced-repetition/due", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })
        if (dueRes.ok) {
          const dueData = await dueRes.json()
          setDue(dueData)
        }
      }
    } catch (err) {
      // Skip error is non-critical
    }
  }

  const handleMarkReviewed = async (problemId: string, scenarioId: string) => {
    try {
      const token = await getAuthToken()
      if (!token) return

      const res = await fetch("/api/spaced-repetition/mark-reviewed", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ problem_id: problemId, scenario_id: scenarioId }),
      })

      if (res.ok) {
        // Refresh both due items and stats
        const [dueRes, statsRes] = await Promise.all([
          fetch("/api/spaced-repetition/due", {
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          }),
          fetch("/api/spaced-repetition/stats", {
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          }),
        ])

        if (dueRes.ok) {
          const dueData = await dueRes.json()
          setDue(dueData)
        }
        if (statsRes.ok) {
          const statsData = await statsRes.json()
          setStats(statsData)
        }
      }
    } catch (err) {
      // Review error is non-critical
    }
  }

  const handleBatchDefer = async () => {
    try {
      setIsDeferring(true)
      const token = await getAuthToken()
      if (!token) {
        toast.error("Please sign in again to defer your reviews.")
        return
      }

      const res = await fetch("/api/spaced-repetition/batch-defer", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}), // Use user's default max_daily_reviews
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        toast.error(data?.message || data?.error || "Could not defer reviews. Please try again.")
        return
      }

      // Refresh due items to show updated queue
      const dueRes = await fetch("/api/spaced-repetition/due", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
      if (dueRes.ok) {
        setDue(await dueRes.json())
      }

      toast.success(data?.message ?? `Deferred ${data?.deferred_count ?? 0} reviews.`)
    } catch {
      toast.error("Could not defer reviews. Please try again.")
    } finally {
      setIsDeferring(false)
    }
  }

  /**
   * Entitlement check. Three outcomes, not two.
   *
   * Collapsing "not Pro", "the check failed" and "no token" into isPro=false means a
   * 500 or a network blip shows the Upgrade wall to a PAYING subscriber, with no
   * error and no retry — and `if (!currentUser) return` leaves isPro null forever,
   * so the loading gate never clears and the page is a permanent spinner.
   *
   * Fail closed on ACCESS, never on the explanation. Same fix as /knowledge.
   */
  const checkSubscription = useCallback(async () => {
    if (!user) return
    setEntitlementFailed(false)

    try {
      const { auth } = await import("@/lib/firebase")
      const currentUser = auth.currentUser
      if (!currentUser) {
        setEntitlementFailed(true)
        setIsPro(false)
        return
      }

      const token = await currentUser.getIdToken()

      const res = await fetch("/api/user/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        setEntitlementFailed(true)
        setIsPro(false)
        return
      }

      const profile = await res.json()
      setIsPro(profile.subscription_tier === "pro" || profile.subscription_tier === "enterprise")
    } catch {
      setEntitlementFailed(true)
      setIsPro(false)
    }
  }, [user])

  useEffect(() => {
    if (initialized && user) {
      void checkSubscription()
    }
  }, [user, initialized, checkSubscription])

  useEffect(() => {
    if (initialized && user && isPro) {
      fetchData()
    }
  }, [initialized, user, isPro, fetchData])

  useEffect(() => {
    if (initialized && !user && !authLoading) {
      router.push("/login?redirect=/practice")
    }
  }, [initialized, user, authLoading, router])

  if (!initialized || authLoading || isPro === null) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <Loader2 className="text-foreground h-6 w-6 animate-spin" />
      </div>
    )
  }

  // Entitlement could not be determined. Access still fails closed, but the user is
  // told the check failed and given a retry instead of an upgrade pitch they may
  // already have paid for.
  if (entitlementFailed) {
    return (
      <div className="bg-background min-h-screen">
        <Header />
        <main className="container mx-auto px-4 pt-24 pb-16">
          <div className="mx-auto max-w-lg text-center">
            <h1 className="text-foreground mb-3 text-2xl font-bold">
              Couldn&apos;t check your account
            </h1>
            <p className="text-muted-foreground mb-8">
              We couldn&apos;t confirm your subscription just now, so this page is holding back.
              Nothing has changed on your account.
            </p>
            <Button
              onClick={() => {
                setIsPro(null)
                void checkSubscription()
              }}
              className="border-accent/40 bg-accent/10 text-accent-strong hover:bg-accent/20 dark:text-accent border"
            >
              Try again
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  // Upgrade prompt for non-Pro users
  if (!isPro) {
    return (
      <div className="bg-background min-h-screen">
        <Header />
        <main className="container mx-auto px-4 pt-24 pb-16">
          <div className="mx-auto max-w-lg text-center">
            {/* bg-muted on bg-background is 1.03:1 light / 1.10:1 dark (where --muted
                is the same hex as --card), so this badge did not render in either
                theme and the lock glyph floated in space. */}
            <div className="border-border bg-card mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border shadow-sm">
              <Lock className="text-muted-foreground h-8 w-8" />
            </div>
            <h1 className="text-foreground mb-3 text-2xl font-bold">Spaced Repetition Practice</h1>
            <p className="text-muted-foreground mb-8">
              Smart practice sessions with spaced repetition to maximize your learning and
              retention.
            </p>
            <div className="mx-auto mb-8 max-w-sm space-y-3 text-left">
              {[
                "Optimized review intervals",
                "Pattern mastery tracking",
                "Personalized recommendations",
                "Daily goals and streaks",
              ].map((feature, i) => (
                <div key={i} className="text-muted-foreground flex items-center gap-3">
                  <div className="bg-card h-1.5 w-1.5 rounded-full" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
            <Link href="/pricing">
              <Button className="bg-card text-foreground hover:bg-muted">
                Upgrade to Pro
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="bg-background min-h-screen">
      <Header />
      <main className="container mx-auto px-4 pt-24 pb-16">
        <div className="mx-auto max-w-5xl">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-foreground mb-1 text-2xl font-bold">Practice</h1>
            <p className="text-muted-foreground">Review problems at optimal intervals</p>
          </div>

          {error && (
            <div className="mb-6 rounded-lg border border-rose-500/10 bg-rose-500/5 p-4 text-sm text-rose-400">
              {error}
            </div>
          )}

          {/* Streak Banner */}
          <div className="border-border mb-8 border-b pb-6">
            <StreakBanner
              streakDays={stats?.overall.streak_days || 0}
              dailyGoal={stats?.daily_goal || 5}
              dailyProgress={stats?.daily_progress || 0}
              longestStreak={stats?.overall.longest_streak_days}
              isLoading={isLoading}
            />
          </div>

          {/* Main Content */}
          <div className="space-y-8">
            {/* View Toggle */}
            <div className="mb-4 flex items-center justify-end">
              <div className="border-border bg-foreground/5 inline-flex rounded-lg border p-1">
                <button
                  onClick={() => setViewMode("list")}
                  className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    viewMode === "list"
                      ? "bg-foreground/10 text-foreground"
                      : "text-muted-foreground hover:text-muted-foreground"
                  }`}
                >
                  <List className="h-4 w-4" />
                  List
                </button>
                <button
                  onClick={() => setViewMode("calendar")}
                  className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    viewMode === "calendar"
                      ? "bg-foreground/10 text-foreground"
                      : "text-muted-foreground hover:text-muted-foreground"
                  }`}
                >
                  <CalendarDays className="h-4 w-4" />
                  Calendar
                </button>
              </div>
            </div>

            {/* Learner-model correction traces: the model responds visibly */}
            <CorrectionTraceBanner corrections={corrections} />

            {/* Due for Review - List View */}
            {viewMode === "list" && (
              <div className="border-border bg-card/30 rounded-xl border p-6">
                <DueForReview
                  dueNow={due?.due_now || []}
                  dueInMinutes={due?.due_in_minutes || []}
                  dueToday={due?.due_today || []}
                  upcoming={due?.upcoming || []}
                  totalDue={due?.stats.total_due || 0}
                  overdueCount={due?.stats.overdue_count || 0}
                  userAlgorithm={due?.user_algorithm}
                  onSkip={handleSkipProblem}
                  onMarkReviewed={handleMarkReviewed}
                  isLoading={isLoading}
                  // Overwhelm management
                  maxDailyReviews={due?.settings?.max_daily_reviews}
                  isOverwhelmed={due?.settings?.is_overwhelmed}
                  deferCount={due?.settings?.defer_count}
                  onBatchDefer={handleBatchDefer}
                  isDeferring={isDeferring}
                />
              </div>
            )}

            {/* Due for Review - Calendar View */}
            {viewMode === "calendar" && (
              <div className="border-border bg-card/30 rounded-xl border p-6">
                <ReviewCalendar
                  dueItems={[
                    ...(due?.due_now || []),
                    ...(due?.due_in_minutes || []),
                    ...(due?.due_today || []),
                  ]}
                  upcoming={due?.upcoming || []}
                />
              </div>
            )}

            {/* Pattern Mastery */}
            <div className="border-border bg-card/30 rounded-xl border p-6">
              <PatternMastery patterns={stats?.by_pattern || []} isLoading={isLoading} />
            </div>
          </div>

          {/* Stats Summary */}
          {stats && !isLoading && (
            <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="py-4 text-center">
                <div className="text-foreground text-2xl font-bold">
                  {stats.overall.total_problems_seen}
                </div>
                <div className="text-muted-foreground text-sm">Problems</div>
              </div>
              <div className="py-4 text-center">
                <div className="text-2xl font-bold text-emerald-400">
                  {stats.overall.problems_mastered}
                </div>
                <div className="text-muted-foreground text-sm">Mastered</div>
              </div>
              <div className="py-4 text-center">
                <div className="text-foreground text-2xl font-bold">
                  {stats.overall.average_score}%
                </div>
                <div className="text-muted-foreground flex items-center justify-center gap-1 text-sm">
                  Review Avg
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="text-muted-foreground h-3 w-3 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-muted text-foreground max-w-xs">
                      <p>
                        Review Average: Your average score across spaced repetition reviews. This
                        tracks how well you perform when revisiting problems over time.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
              <div className="py-4 text-center">
                <div className="text-foreground text-2xl font-bold">
                  {Math.round(stats.overall.total_time_minutes / 60)}h
                </div>
                <div className="text-muted-foreground text-sm">Practice Time</div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
