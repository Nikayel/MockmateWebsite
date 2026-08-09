"use client"

import { useEffect, useState, type MouseEvent, type ReactNode } from "react"
import { motion } from "framer-motion"
import { Archive, BookOpen, CheckCircle2, Plus, RefreshCw, Target, XCircle } from "lucide-react"

import { Header } from "@/components/header"
import { useAuth } from "@/lib/auth-context"
import { roadmapProgressPercent } from "@/lib/roadmap/progress"
import { isPaidTier } from "@/lib/pricing"
import type { SubscriptionTier } from "@/lib/config"
import { cn } from "@/lib/utils"

export interface RoadmapSummary {
  id: string
  status?: "active" | "archived" | "completed" | "abandoned" | string
  interviewDate: string | Date
  questionsCompleted: number
  totalQuestions: number
  companyName?: string
  targetCompany?: string
  actualHoursSpent?: number
  patternCoverage?: Array<{
    pattern: string
    total: number
    completed: number
    percentage: number
  }>
  dailyPlans?: Array<{
    dayNumber: number
    theme: string
    questions: Array<{
      scenarioId: string
      title: string
      pattern: string
      difficulty: "easy" | "medium" | "hard"
      status: "pending" | "in_progress" | "completed" | "skipped" | "evaluating"
      score?: number
    }>
  }>
  assessment?: {
    experienceLevel?: string
    hoursPerDay?: number
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS - Extracted for clarity
// ═══════════════════════════════════════════════════════════════════════════

export function QuickStat({
  value,
  label,
  color = "default",
}: {
  value: string
  label: string
  color?: "green" | "blue" | "orange" | "default"
}) {
  return (
    <div className="text-center">
      <p
        className={cn(
          "text-lg font-bold",
          color === "green" && "text-green-600",
          color === "blue" && "text-primary",
          color === "orange" && "text-orange-500",
          color === "default" && "text-foreground"
        )}
      >
        {value}
      </p>
      <p className="text-muted-foreground text-[10px]">{label}</p>
    </div>
  )
}

export function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: ReactNode
  label: string
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

// Roadmap List View - Shows all roadmaps (active and archived)
export function RoadmapListView({
  roadmaps,
  onCreateNew,
  onClose,
  onReactivate,
}: {
  roadmaps: RoadmapSummary[]
  onCreateNew: () => void
  onClose?: () => void
  onReactivate?: (roadmapId: string) => Promise<void>
}) {
  const [reactivatingId, setReactivatingId] = useState<string | null>(null)
  const activeRoadmaps = roadmaps.filter((r) => r.status === "active")
  const archivedRoadmaps = roadmaps.filter(
    (r) => r.status === "archived" || r.status === "completed" || r.status === "abandoned"
  )

  const handleReactivate = async (roadmapId: string) => {
    if (!onReactivate) return
    setReactivatingId(roadmapId)
    try {
      await onReactivate(roadmapId)
    } finally {
      setReactivatingId(null)
    }
  }

  return (
    <div className="bg-background min-h-screen">
      <Header />
      <main className="container mx-auto max-w-4xl space-y-5 px-4 py-6 pt-24">
        {/* Compact Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-foreground text-xl font-bold">My Roadmaps</h1>
            <span className="text-muted-foreground bg-muted rounded-full px-2 py-0.5 text-xs">
              {roadmaps.length} total
            </span>
          </div>
          <div className="flex gap-2">
            {onClose && (
              <button
                onClick={onClose}
                className="border-border hover:bg-muted rounded-lg border px-3 py-1.5 text-sm transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={onCreateNew}
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              New
            </button>
          </div>
        </div>

        {/* Active Roadmaps */}
        {activeRoadmaps.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
              Active
            </h2>
            <div className="grid gap-2">
              {activeRoadmaps.map((roadmap) => (
                <RoadmapCard key={roadmap.id} roadmap={roadmap} />
              ))}
            </div>
          </div>
        )}

        {/* Archived Roadmaps */}
        {archivedRoadmaps.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
              Archived ({archivedRoadmaps.length})
            </h2>
            <div className="grid gap-2">
              {archivedRoadmaps.map((roadmap) => (
                <RoadmapCard
                  key={roadmap.id}
                  roadmap={roadmap}
                  onReactivate={handleReactivate}
                  isReactivating={reactivatingId === roadmap.id}
                />
              ))}
            </div>
          </div>
        )}

        {roadmaps.length === 0 && (
          <div className="py-8 text-center">
            <BookOpen className="text-muted-foreground mx-auto mb-3 h-10 w-10" />
            <p className="text-muted-foreground mb-4 text-sm">No roadmaps yet</p>
            <button
              onClick={onCreateNew}
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create Your First Roadmap
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

// Roadmap Card Component - Compact version
function RoadmapCard({
  roadmap,
  onReactivate,
  isReactivating,
}: {
  roadmap: RoadmapSummary
  onReactivate?: (roadmapId: string) => Promise<void>
  isReactivating?: boolean
}) {
  const interviewDate = new Date(roadmap.interviewDate)
  const progress = roadmapProgressPercent(roadmap.questionsCompleted, roadmap.totalQuestions)
  const companyName = roadmap.companyName || roadmap.targetCompany
  const status = roadmap.status
  const isExpired = interviewDate < new Date()
  const canReactivate = (status === "archived" || status === "abandoned") && !isExpired

  const getStatusBadge = () => {
    if (isExpired) {
      return (
        <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
          Expired
        </span>
      )
    }
    switch (status) {
      case "active":
        return (
          <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-[10px] font-medium">
            Active
          </span>
        )
      case "completed":
        return (
          <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
            Completed
          </span>
        )
      case "archived":
        return (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            Archived
          </span>
        )
      case "abandoned":
        return (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            Replaced
          </span>
        )
      default:
        return null
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case "active":
        return <Target className="text-primary h-3.5 w-3.5" />
      case "completed":
        return <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
      case "archived":
        return <Archive className="text-muted-foreground h-3.5 w-3.5" />
      case "abandoned":
        return <XCircle className="text-muted-foreground h-3.5 w-3.5" />
      default:
        return <BookOpen className="text-muted-foreground h-3.5 w-3.5" />
    }
  }

  const handleReactivate = async (e: MouseEvent) => {
    e.stopPropagation()
    if (onReactivate && !isReactivating) {
      await onReactivate(roadmap.id)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-border hover:bg-muted/30 bg-card rounded-lg border p-4 transition-all"
    >
      <div className="flex items-center justify-between gap-4">
        {/* Left side - Company & Status */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="bg-muted flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
            {getStatusIcon()}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-foreground truncate text-sm font-semibold">{companyName}</h3>
              {getStatusBadge()}
            </div>
            <div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-xs">
              <span>{progress}% complete</span>
              <span>•</span>
              <span>
                {roadmap.questionsCompleted}/{roadmap.totalQuestions} questions
              </span>
            </div>
          </div>
        </div>

        {/* Right side - Date & Action */}
        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden text-right sm:block">
            <p
              className={cn(
                "text-xs font-medium",
                isExpired ? "text-red-500" : "text-muted-foreground"
              )}
            >
              {interviewDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </p>
          </div>

          {canReactivate && onReactivate && (
            <button
              onClick={handleReactivate}
              disabled={isReactivating}
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
            >
              {isReactivating ? (
                <>
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span className="hidden sm:inline">Resuming...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3" />
                  <span className="hidden sm:inline">Resume</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Compact progress bar */}
      <div className="border-border/50 mt-3 border-t pt-3">
        <div className="flex items-center gap-3">
          <div className="bg-muted h-1.5 flex-1 rounded-full">
            <div
              className={cn(
                "h-1.5 rounded-full transition-all",
                status === "completed" ? "bg-green-500" : "bg-primary"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-muted-foreground shrink-0 text-xs">
            {Math.round(roadmap.actualHoursSpent || 0)}h studied
          </span>
        </div>
      </div>
    </motion.div>
  )
}

export function EmptyState({ onCreateNew }: { onCreateNew: () => void }) {
  const { user, firebaseUser, initialized } = useAuth()
  const [isPro, setIsPro] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check user's subscription status
  useEffect(() => {
    const checkSubscription = async () => {
      if (!initialized || !user?.id || !firebaseUser) {
        setIsLoading(false)
        return
      }

      try {
        const token = await firebaseUser.getIdToken()
        const response = await fetch("/api/user/subscription-status", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        if (response.ok) {
          const data = (await response.json()) as { tier?: SubscriptionTier }
          setIsPro(isPaidTier(data.tier ?? "free"))
        }
      } catch (error) {
        console.error("Error checking subscription:", error)
      } finally {
        setIsLoading(false)
      }
    }

    checkSubscription()
  }, [user?.id, firebaseUser, initialized])

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-background min-h-screen">
        <Header />
        <div className="flex min-h-[calc(100vh-80px)] items-center justify-center pt-24">
          <div className="text-center">
            <div className="border-primary mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-t-transparent" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  // Pro user - show create roadmap CTA
  if (isPro) {
    return (
      <div className="bg-background min-h-screen">
        <Header />
        <div className="flex min-h-[calc(100vh-80px)] items-center justify-center pt-24">
          <div className="mx-auto max-w-md px-4 text-center">
            <div className="from-primary to-primary/60 mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br">
              <BookOpen className="text-primary-foreground h-10 w-10" />
            </div>
            <h1 className="text-foreground mb-2 text-2xl font-bold">
              Create Your Interview Roadmap
            </h1>
            <p className="text-muted-foreground mb-8">
              Get a personalized AI-powered study plan tailored to your target company, interview
              date, and skill gaps. Includes spaced repetition scheduling and pattern mastery
              tracking.
            </p>
            <button
              onClick={onCreateNew}
              className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-6 py-3 font-semibold transition-colors"
            >
              <Plus className="h-5 w-5" />
              Create Roadmap
            </button>

            <div className="mt-12 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-foreground text-2xl font-bold">20+</p>
                <p className="text-muted-foreground text-xs">Companies</p>
              </div>
              <div>
                <p className="text-foreground text-2xl font-bold">200+</p>
                <p className="text-muted-foreground text-xs">Questions</p>
              </div>
              <div>
                <p className="text-foreground text-2xl font-bold">15</p>
                <p className="text-muted-foreground text-xs">Patterns</p>
              </div>
            </div>

            <div className="bg-primary/5 border-primary/20 mt-8 rounded-xl border p-4 text-left">
              <h3 className="text-foreground mb-2 text-sm font-semibold">
                Your roadmap will include:
              </h3>
              <ul className="text-muted-foreground space-y-1.5 text-xs">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="text-primary h-3.5 w-3.5" />
                  Custom study plan for your interview date
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="text-primary h-3.5 w-3.5" />
                  Spaced repetition for long-term retention
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="text-primary h-3.5 w-3.5" />
                  Pattern mastery tracking across 15+ DSA patterns
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="text-primary h-3.5 w-3.5" />
                  Company-specific interview tips
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Free user - show preview and let them start the wizard
  // They'll see the upgrade prompt at the generation step
  return (
    <div className="bg-background min-h-screen">
      <Header />
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center pt-24">
        <div className="mx-auto max-w-md px-4 text-center">
          <div className="from-primary to-primary/60 mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br">
            <BookOpen className="text-primary-foreground h-10 w-10" />
          </div>
          <h1 className="text-foreground mb-2 text-2xl font-bold">Create Your Interview Roadmap</h1>
          <p className="text-muted-foreground mb-8">
            Get a personalized AI-powered study plan tailored to your target company, interview
            date, and skill gaps. Includes spaced repetition scheduling and pattern mastery
            tracking.
          </p>
          <button
            onClick={onCreateNew}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-6 py-3 font-semibold transition-colors"
          >
            <Plus className="h-5 w-5" />
            Create Roadmap
          </button>

          <div className="mt-12 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-foreground text-2xl font-bold">20+</p>
              <p className="text-muted-foreground text-xs">Companies</p>
            </div>
            <div>
              <p className="text-foreground text-2xl font-bold">200+</p>
              <p className="text-muted-foreground text-xs">Questions</p>
            </div>
            <div>
              <p className="text-foreground text-2xl font-bold">15</p>
              <p className="text-muted-foreground text-xs">Patterns</p>
            </div>
          </div>

          <div className="bg-primary/5 border-primary/20 mt-8 rounded-xl border p-4 text-left">
            <h3 className="text-foreground mb-2 text-sm font-semibold">
              Your roadmap will include:
            </h3>
            <ul className="text-muted-foreground space-y-1.5 text-xs">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="text-primary h-3.5 w-3.5" />
                Custom study plan for your interview date
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="text-primary h-3.5 w-3.5" />
                Spaced repetition for long-term retention
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="text-primary h-3.5 w-3.5" />
                Pattern mastery tracking across 15+ DSA patterns
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="text-primary h-3.5 w-3.5" />
                Company-specific interview tips
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
