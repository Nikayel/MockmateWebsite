"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Plus,
  BookOpen,
  Target,
  Sparkles,
  Trophy,
  AlertTriangle,
  Clock,
  RefreshCw,
  PartyPopper,
  Calendar,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Archive,
  CheckCircle2,
  XCircle,
  Play,
  Flame,
  BarChart3,
  Info,
  Zap,
  Crown,
  StopCircle,
} from "lucide-react"
import Link from "next/link"

import { Header } from "@/components/header"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  RoadmapHeader,
  TodaysFocus,
  PatternCoverage,
  WeeklyCalendar,
  CompanyInterviewGuide,
  PersonalizedCompanyGuide,
  RoadmapStatusBanner,
  ArchivedRoadmapsList,
  DayUnlockModal,
  RoadmapCompleteCard,
} from "@/components/roadmap"
import { useRoadmapStore, useActiveRoadmap } from "@/lib/stores/roadmap-store"
import { getCompanyById } from "@/lib/data/company-questions"
import { getStudyRecommendations } from "@/lib/roadmap/prioritization-algorithm"
import { generatePersonalizedGuide } from "@/lib/roadmap/personalized-guide-generator"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"

/**
 * Roadmap Page - Cognitive Load Optimized
 *
 * Design Principles Applied:
 * 1. Miller's Law: Max 7±2 chunks visible at once
 * 2. Progressive Disclosure: Details on demand via tabs
 * 3. Single Primary Action: "Start Next Problem" always prominent
 * 4. F-Pattern: Key info top-left, action top-right
 * 5. Gestalt Grouping: Related items visually clustered
 */

// Tab-based view to reduce cognitive load
type RoadmapTab = "today" | "schedule" | "progress" | "guide"

export default function RoadmapPage() {
  const router = useRouter()
  const roadmap = useActiveRoadmap()
  const { user, firebaseUser, initialized } = useAuth()
  const {
    selectedDayIndex,
    selectDay,
    markQuestionCompleted,
    markQuestionSkipped,
    setActiveRoadmap,
  } = useRoadmapStore()
  const [activeTab, setActiveTab] = useState<RoadmapTab>("today")
  const [isLoadingRoadmap, setIsLoadingRoadmap] = useState(true)
  const [allRoadmaps, setAllRoadmaps] = useState<any[]>([])
  const [showArchived, setShowArchived] = useState(false)
  const [showTips, setShowTips] = useState(false)
  const [showEndRoadmapDialog, setShowEndRoadmapDialog] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [showDayUnlockModal, setShowDayUnlockModal] = useState(false)
  const [acknowledgedDays, setAcknowledgedDays] = useState<Set<number>>(new Set())

  // Get today's plan
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayIndex =
    roadmap?.dailyPlans.findIndex((plan) => {
      const planDate = new Date(plan.date)
      planDate.setHours(0, 0, 0, 0)
      return planDate.getTime() === today.getTime()
    }) ?? 0

  // Load roadmaps from Firebase on mount
  // IMPORTANT: Clear stale roadmap first to prevent cross-user data leaks
  useEffect(() => {
    if (!initialized) return

    const loadRoadmaps = async () => {
      if (!user?.id || !firebaseUser) {
        // No user - clear any stale roadmap data
        setActiveRoadmap(null)
        setIsLoadingRoadmap(false)
        return
      }

      // Clear existing roadmap before loading to prevent showing stale data
      setActiveRoadmap(null)

      try {
        // Get ID token for authorization
        const idToken = await firebaseUser.getIdToken()
        const authHeaders = {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        }

        // Load active roadmap from Firebase (source of truth)
        console.log("[Roadmap] Fetching active roadmap...")
        const activeResponse = await fetch("/api/roadmap", { headers: authHeaders })

        if (!activeResponse.ok) {
          const errorText = await activeResponse.text()
          console.error("[Roadmap] API error:", activeResponse.status, errorText)
        } else {
          const activeData = await activeResponse.json()
          console.log("[Roadmap] API response:", activeData)

          if (activeData.roadmap) {
            // Convert date strings back to Date objects for the store
            const roadmap = {
              ...activeData.roadmap,
              interviewDate: new Date(activeData.roadmap.interviewDate),
              createdAt: activeData.roadmap.createdAt
                ? new Date(activeData.roadmap.createdAt)
                : new Date(),
              updatedAt: activeData.roadmap.updatedAt
                ? new Date(activeData.roadmap.updatedAt)
                : new Date(),
              dailyPlans:
                activeData.roadmap.dailyPlans?.map((plan: any) => ({
                  ...plan,
                  date: new Date(plan.date),
                  questions: plan.questions?.map((q: any) => ({
                    ...q,
                    completedAt: q.completedAt ? new Date(q.completedAt) : undefined,
                  })),
                })) || [],
              milestones:
                activeData.roadmap.milestones?.map((m: any) => ({
                  ...m,
                  targetDate: new Date(m.targetDate),
                })) || [],
            }
            console.log("[Roadmap] Setting active roadmap:", roadmap.id, roadmap.companyName)
            setActiveRoadmap(roadmap)
          } else {
            console.log("[Roadmap] No active roadmap found in response")
          }
        }

        // Load all roadmaps for the list view
        const allResponse = await fetch("/api/roadmap?all=true", { headers: authHeaders })
        if (allResponse.ok) {
          const allData = await allResponse.json()
          if (allData.roadmaps) {
            setAllRoadmaps(allData.roadmaps)
          }
        }
      } catch (error) {
        console.error("Error loading roadmaps:", error)
      } finally {
        setIsLoadingRoadmap(false)
      }
    }

    loadRoadmaps()
  }, [user?.id, firebaseUser, initialized, setActiveRoadmap])

  // Set selected day to today on initial mount only
  useEffect(() => {
    if (roadmap && todayIndex >= 0) {
      // Only auto-select today on first load, not on every change
      selectDay(todayIndex)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roadmap?.id]) // Only run when roadmap changes, not on every selectedDayIndex change

  const handleStartQuestion = (scenarioId: string) => {
    // Navigate to interview with this scenario
    router.push(`/interview?scenario=${scenarioId}&roadmap=true`)
  }

  const handleSkipQuestion = (scenarioId: string) => {
    markQuestionSkipped(scenarioId)
  }

  const handleMarkComplete = (scenarioId: string) => {
    markQuestionCompleted(scenarioId)
  }

  // Load acknowledged days from localStorage when roadmap changes
  useEffect(() => {
    if (!roadmap?.id) return
    const storageKey = `roadmap-acknowledged-days-${roadmap.id}`
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      try {
        const days = JSON.parse(stored) as number[]
        setAcknowledgedDays(new Set(days))
      } catch {
        setAcknowledgedDays(new Set())
      }
    } else {
      setAcknowledgedDays(new Set())
    }
  }, [roadmap?.id])

  // Check if current day was just completed and show unlock modal
  useEffect(() => {
    if (!roadmap) return

    const currentPlan = roadmap.dailyPlans[selectedDayIndex]
    if (!currentPlan || currentPlan.questions.length === 0) return

    const allCompleted = currentPlan.questions.every(
      (q) => q.status === "completed" || q.status === "skipped"
    )
    const hasNextDay = selectedDayIndex < roadmap.dailyPlans.length - 1

    // Show unlock modal if day is complete, there's a next day, and user hasn't acknowledged this day
    if (allCompleted && hasNextDay && !acknowledgedDays.has(selectedDayIndex)) {
      setShowDayUnlockModal(true)
    }
  }, [roadmap?.dailyPlans, selectedDayIndex, acknowledgedDays])

  // Mark day as acknowledged and persist to localStorage
  const acknowledgeDayCompletion = (dayIndex: number) => {
    if (!roadmap?.id) return
    const newAcknowledged = new Set(acknowledgedDays)
    newAcknowledged.add(dayIndex)
    setAcknowledgedDays(newAcknowledged)
    const storageKey = `roadmap-acknowledged-days-${roadmap.id}`
    localStorage.setItem(storageKey, JSON.stringify([...newAcknowledged]))
  }

  // Handle unlocking next day
  const handleUnlockNextDay = () => {
    if (!roadmap) return
    acknowledgeDayCompletion(selectedDayIndex)
    const nextDayIndex = selectedDayIndex + 1
    if (nextDayIndex < roadmap.dailyPlans.length) {
      selectDay(nextDayIndex)
      setShowDayUnlockModal(false)
    }
  }

  // Handle taking a break (just close modal)
  const handleTakeBreak = () => {
    acknowledgeDayCompletion(selectedDayIndex)
    setShowDayUnlockModal(false)
  }

  // Handle starting a mock interview
  const handleStartMockInterview = () => {
    router.push("/interview?mode=mock")
  }

  // Handle adding more questions (would need to implement roadmap extension)
  const handleAddMoreQuestions = () => {
    // For now, just show a message or navigate to settings
    // In future, this could open a modal to add more questions to the roadmap
    router.push("/roadmap/new?extend=true")
  }

  // Handle reactivating an archived/abandoned roadmap
  const handleReactivateRoadmap = async (roadmapId: string) => {
    if (!firebaseUser) return

    try {
      const idToken = await firebaseUser.getIdToken()
      const authHeaders = {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      }

      // Reactivate the roadmap
      const response = await fetch("/api/roadmap", {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ roadmapId, status: "active" }),
      })

      if (!response.ok) {
        console.error("[Roadmap] Failed to reactivate roadmap")
        return
      }

      // Reload roadmaps to get the updated state
      const activeResponse = await fetch("/api/roadmap", { headers: authHeaders })
      if (activeResponse.ok) {
        const activeData = await activeResponse.json()
        if (activeData.roadmap) {
          const roadmap = {
            ...activeData.roadmap,
            interviewDate: new Date(activeData.roadmap.interviewDate),
            createdAt: activeData.roadmap.createdAt
              ? new Date(activeData.roadmap.createdAt)
              : new Date(),
            updatedAt: activeData.roadmap.updatedAt
              ? new Date(activeData.roadmap.updatedAt)
              : new Date(),
            dailyPlans:
              activeData.roadmap.dailyPlans?.map((plan: any) => ({
                ...plan,
                date: new Date(plan.date),
                questions: plan.questions?.map((q: any) => ({
                  ...q,
                  completedAt: q.completedAt ? new Date(q.completedAt) : undefined,
                })),
              })) || [],
            milestones:
              activeData.roadmap.milestones?.map((m: any) => ({
                ...m,
                targetDate: new Date(m.targetDate),
              })) || [],
          }
          setActiveRoadmap(roadmap)
        }
      }

      // Update all roadmaps list
      const allResponse = await fetch("/api/roadmap?all=true", { headers: authHeaders })
      if (allResponse.ok) {
        const allData = await allResponse.json()
        if (allData.roadmaps) {
          setAllRoadmaps(allData.roadmaps)
        }
      }
    } catch (error) {
      console.error("Error reactivating roadmap:", error)
    }
  }

  // Handle archiving the current roadmap (end early)
  const handleArchiveRoadmap = async () => {
    if (!firebaseUser || !roadmap) return

    setIsArchiving(true)
    try {
      const idToken = await firebaseUser.getIdToken()
      const authHeaders = {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      }

      const response = await fetch("/api/roadmap", {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ roadmapId: roadmap.id, status: "archived" }),
      })

      if (!response.ok) {
        console.error("[Roadmap] Failed to archive roadmap")
        return
      }

      setActiveRoadmap(null)
      setShowEndRoadmapDialog(false)

      // Reload all roadmaps
      const allResponse = await fetch("/api/roadmap?all=true", { headers: authHeaders })
      if (allResponse.ok) {
        const allData = await allResponse.json()
        if (allData.roadmaps) {
          setAllRoadmaps(allData.roadmaps)
        }
      }
    } catch (error) {
      console.error("Error archiving roadmap:", error)
    } finally {
      setIsArchiving(false)
    }
  }

  // Loading state
  if (!initialized || isLoadingRoadmap) {
    return (
      <div className="bg-background min-h-screen">
        <Header />
        <div className="flex min-h-[calc(100vh-80px)] items-center justify-center pt-24">
          <div className="text-center">
            <div className="border-primary mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-t-transparent" />
            <p className="text-muted-foreground">Loading your roadmap...</p>
          </div>
        </div>
      </div>
    )
  }

  // No active roadmap - show list of archived roadmaps or empty state
  if (!roadmap) {
    const archivedRoadmaps = allRoadmaps.filter(
      (r) => r.status === "archived" || r.status === "completed" || r.status === "abandoned"
    )

    if (archivedRoadmaps.length > 0) {
      return (
        <RoadmapListView
          roadmaps={allRoadmaps}
          onCreateNew={() => router.push("/roadmap/new")}
          onReactivate={handleReactivateRoadmap}
        />
      )
    }

    return <EmptyState onCreateNew={() => router.push("/roadmap/new")} />
  }

  // Check for edge cases
  const interviewDate = new Date(roadmap.interviewDate)
  const now = new Date()
  const daysRemaining = Math.ceil((interviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const isExpired = daysRemaining < 0
  const isCompleted =
    roadmap.questionsCompleted === roadmap.totalQuestions && roadmap.totalQuestions > 0
  const isIntern = roadmap.assessment?.experienceLevel === "intern"
  const progress = Math.round((roadmap.questionsCompleted / roadmap.totalQuestions) * 100)

  // Determine the status type for banner display
  const getStatusType = (): "expired" | "completed" | "archived" | "abandoned" | null => {
    if (isExpired) return "expired"
    if (isCompleted) return "completed"
    if (roadmap.status === "archived") return "archived"
    if (roadmap.status === "abandoned") return "abandoned"
    return null
  }
  const statusType = getStatusType()

  // Handler for archiving expired roadmap
  const handleArchiveExpired = async () => {
    if (!firebaseUser) return
    setIsArchiving(true)
    try {
      const idToken = await firebaseUser.getIdToken()
      const authHeaders = {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      }
      await fetch("/api/roadmap", {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ roadmapId: roadmap.id, status: "archived" }),
      })
      setActiveRoadmap(null)
      // Reload roadmaps
      const response = await fetch("/api/roadmap?all=true", { headers: authHeaders })
      if (response.ok) {
        const data = await response.json()
        if (data.roadmaps) {
          setAllRoadmaps(data.roadmaps)
        }
      }
    } catch (error) {
      console.error("Error archiving roadmap:", error)
    } finally {
      setIsArchiving(false)
    }
  }

  // Get archived roadmaps for the collapsible list
  const archivedRoadmaps = allRoadmaps.filter(
    (r) =>
      (r.status === "archived" || r.status === "completed" || r.status === "abandoned") &&
      r.id !== roadmap?.id
  )

  const companyData = getCompanyById(roadmap.targetCompany)
  const selectedPlan = roadmap.dailyPlans[selectedDayIndex]
  const todayPlan = roadmap.dailyPlans[todayIndex >= 0 ? todayIndex : 0]
  const recommendations = getStudyRecommendations(roadmap)
  const topPatterns = companyData?.topPatterns.map((p) => p.pattern) || []

  // Generate personalized guide based on user's assessment
  const personalizedGuide = roadmap.assessment
    ? generatePersonalizedGuide(roadmap.assessment, roadmap.totalQuestions)
    : null

  // Get first pending question for primary CTA
  const nextQuestion = todayPlan?.questions.find(
    (q) => q.status === "pending" || q.status === "in_progress"
  )
  const todayCompleted = todayPlan?.questions.filter((q) => q.status === "completed").length || 0
  const todayTotal = todayPlan?.questions.length || 0

  return (
    <div className="bg-background min-h-screen">
      <Header />

      <main className="container mx-auto max-w-4xl px-4 py-6 pt-24">
        {showArchived ? (
          <RoadmapListView
            roadmaps={allRoadmaps}
            onCreateNew={() => router.push("/roadmap/new")}
            onClose={() => setShowArchived(false)}
            onReactivate={handleReactivateRoadmap}
          />
        ) : (
          <div className="space-y-6">
            {/* ═══════════════════════════════════════════════════════════════
                STATUS BANNER: For expired, completed, archived, abandoned states
                - Compact, collapsible - doesn't take over the whole screen
                - Shows key actions (create new, archive, resume)
                - Allows user to still see their progress/roadmap details
            ═══════════════════════════════════════════════════════════════ */}
            {statusType && (
              <RoadmapStatusBanner
                type={statusType}
                roadmap={{
                  companyName: roadmap.companyName,
                  questionsCompleted: roadmap.questionsCompleted,
                  totalQuestions: roadmap.totalQuestions,
                  actualHoursSpent: roadmap.actualHoursSpent,
                  interviewDate: new Date(roadmap.interviewDate),
                  patternCoverage: roadmap.patternCoverage,
                }}
                onCreateNew={() => router.push("/roadmap/new")}
                onArchive={statusType === "expired" ? handleArchiveExpired : undefined}
                isArchiving={isArchiving}
              />
            )}

            {/* ═══════════════════════════════════════════════════════════════
                HERO SECTION: Single Clear Focus (Cognitive Load Principle #1)
                - One primary action visible
                - Key metrics at a glance (max 4 items)
                - F-pattern: Company left, CTA right
            ═══════════════════════════════════════════════════════════════ */}
            <section className="relative">
              {/* Urgent warning - only when critical (≤3 days) and not expired/completed */}
              {!statusType && daysRemaining <= 3 && daysRemaining >= 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 flex items-center gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-2"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                    {daysRemaining === 0
                      ? "Interview Day! Focus on confidence."
                      : `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left`}
                  </span>
                </motion.div>
              )}

              {/* Main Hero Card */}
              <div className="bg-card border-border overflow-hidden rounded-xl border">
                {/* Top Bar: Company + Days Remaining */}
                <div className="border-border bg-accent/5 border-b px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                        <Target className="text-primary h-5 w-5" />
                      </div>
                      <div>
                        <h1 className="text-foreground text-lg font-bold">{roadmap.companyName}</h1>
                        <div className="text-muted-foreground flex items-center gap-2 text-xs">
                          <Calendar className="h-3 w-3" />
                          <span>{daysRemaining} days remaining</span>
                          {isIntern && (
                            <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                              Intern Track
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Stats - Max 3 for cognitive load */}
                    <div className="hidden items-center gap-4 sm:flex">
                      <QuickStat
                        value={`${progress}%`}
                        label="complete"
                        color={progress >= 75 ? "green" : progress >= 50 ? "blue" : "orange"}
                      />
                      <QuickStat
                        value={`${roadmap.questionsCompleted}/${roadmap.totalQuestions}`}
                        label="solved"
                      />
                    </div>
                  </div>
                </div>

                {/* Primary Action Area: What to do NOW */}
                <div className="p-5">
                  {nextQuestion ? (
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="flex-1">
                        <div className="text-muted-foreground mb-1 flex items-center gap-2 text-xs">
                          <Flame className="h-3.5 w-3.5 text-orange-500" />
                          <span>
                            Today's Focus • {todayCompleted}/{todayTotal} done
                          </span>
                        </div>
                        <h2 className="text-foreground mb-1 text-base font-semibold">
                          {nextQuestion.title}
                        </h2>
                        <div className="flex items-center gap-2 text-xs">
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5 font-medium",
                              nextQuestion.difficulty === "easy" &&
                                "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                              nextQuestion.difficulty === "medium" &&
                                "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                              nextQuestion.difficulty === "hard" &&
                                "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            )}
                          >
                            {nextQuestion.difficulty}
                          </span>
                          <span className="text-muted-foreground">
                            {nextQuestion.pattern.replace(/-/g, " ")}
                          </span>
                          <span className="text-muted-foreground">
                            • {nextQuestion.estimatedMinutes} min
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleStartQuestion(nextQuestion.scenarioId)}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2 rounded-lg px-6 py-3 font-semibold shadow-sm transition-all hover:shadow-md"
                      >
                        <Play className="h-4 w-4" />
                        Start Problem
                      </button>
                    </div>
                  ) : todayTotal > 0 && todayCompleted === todayTotal ? (
                    <div className="flex items-center justify-center gap-3 py-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500">
                        <Trophy className="h-5 w-5 text-white" />
                      </div>
                      <div className="text-center sm:text-left">
                        <p className="font-semibold text-green-600 dark:text-green-400">
                          Today complete!
                        </p>
                        <p className="text-muted-foreground text-xs">
                          Great work on your interview prep
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-muted-foreground py-2 text-center">
                      <p>Select a day from the schedule to view problems</p>
                    </div>
                  )}
                </div>

                {/* Company Tips & Study Tips Toggle */}
                {((roadmap.ragEnhancements?.companyTips?.length ?? 0) > 0 ||
                  recommendations.length > 0) && (
                  <div className="border-border border-t">
                    <button
                      onClick={() => setShowTips(!showTips)}
                      className="text-muted-foreground hover:bg-muted/30 flex w-full items-center justify-between px-5 py-2.5 text-xs transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Zap className="text-primary h-3 w-3" />
                        {(roadmap.ragEnhancements?.companyTips?.length ?? 0) > 0
                          ? `${roadmap.companyName} interview tips & study strategies`
                          : "Study tips available"}
                      </span>
                      {showTips ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <AnimatePresence>
                      {showTips && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-3 px-5 pb-4">
                            {/* Company-Specific Tips from RAG */}
                            {(roadmap.ragEnhancements?.companyTips?.length ?? 0) > 0 && (
                              <div className="space-y-1.5">
                                <p className="text-foreground flex items-center gap-1.5 text-xs font-medium">
                                  <Target className="h-3 w-3 text-blue-500" />
                                  {roadmap.companyName} Focus Areas
                                </p>
                                {(roadmap.ragEnhancements?.companyTips?.slice(0, 3) || []).map(
                                  (tip: string, i: number) => (
                                    <p key={i} className="text-muted-foreground pl-4 text-xs">
                                      • {tip}
                                    </p>
                                  )
                                )}
                              </div>
                            )}
                            {/* Personalized Advice from RAG */}
                            {(roadmap.ragEnhancements?.personalizedAdvice?.length ?? 0) > 0 && (
                              <div className="space-y-1.5">
                                <p className="text-foreground flex items-center gap-1.5 text-xs font-medium">
                                  <Sparkles className="h-3 w-3 text-yellow-500" />
                                  Personalized for You
                                </p>
                                {(
                                  roadmap.ragEnhancements?.personalizedAdvice?.slice(0, 2) || []
                                ).map((advice: string, i: number) => (
                                  <p key={i} className="text-muted-foreground pl-4 text-xs">
                                    • {advice}
                                  </p>
                                ))}
                              </div>
                            )}
                            {/* General Study Recommendations */}
                            {recommendations.length > 0 && (
                              <div className="border-border/50 space-y-1 border-t pt-1">
                                {recommendations.slice(0, 2).map((rec, i) => (
                                  <p key={i} className="text-muted-foreground text-xs">
                                    • {rec}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════
                TAB NAVIGATION: Progressive Disclosure (Principle #2)
                - Reduces simultaneous information
                - User controls what they see
                - Max 4 tabs (Miller's Law)
            ═══════════════════════════════════════════════════════════════ */}
            <nav className="bg-muted/50 flex items-center gap-1 rounded-lg p-1" role="tablist">
              <TabButton
                active={activeTab === "today"}
                onClick={() => setActiveTab("today")}
                icon={<Flame className="h-4 w-4" />}
                label="Today"
              />
              <TabButton
                active={activeTab === "schedule"}
                onClick={() => setActiveTab("schedule")}
                icon={<Calendar className="h-4 w-4" />}
                label="Schedule"
              />
              <TabButton
                active={activeTab === "progress"}
                onClick={() => setActiveTab("progress")}
                icon={<BarChart3 className="h-4 w-4" />}
                label="Progress"
              />
              {companyData && (
                <TabButton
                  active={activeTab === "guide"}
                  onClick={() => setActiveTab("guide")}
                  icon={<Info className="h-4 w-4" />}
                  label="Guide"
                />
              )}
            </nav>

            {/* ═══════════════════════════════════════════════════════════════
                TAB CONTENT: One view at a time (Principle #3)
            ═══════════════════════════════════════════════════════════════ */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                {activeTab === "today" && selectedPlan && (
                  <>
                    {/* Show RoadmapCompleteCard when ALL roadmap questions are done */}
                    {isCompleted && companyData ? (
                      <RoadmapCompleteCard
                        companyName={roadmap.companyName}
                        companyId={roadmap.targetCompany}
                        questionsCompleted={roadmap.questionsCompleted}
                        totalHoursSpent={roadmap.actualHoursSpent}
                        daysUntilInterview={daysRemaining}
                        patternsCovered={
                          roadmap.patternCoverage.filter((p) => p.completed > 0).length
                        }
                        onStartMockInterview={handleStartMockInterview}
                        onAddMoreQuestions={handleAddMoreQuestions}
                      />
                    ) : (
                      <TodaysFocus
                        plan={selectedPlan}
                        onStartQuestion={handleStartQuestion}
                        onSkipQuestion={handleSkipQuestion}
                        onMarkComplete={handleMarkComplete}
                        ragEnhancements={roadmap.ragEnhancements}
                        companyName={roadmap.companyName}
                      />
                    )}
                  </>
                )}

                {activeTab === "schedule" && (
                  <div className="space-y-4">
                    <WeeklyCalendar
                      dailyPlans={roadmap.dailyPlans}
                      selectedDayIndex={selectedDayIndex}
                      onSelectDay={(index) => {
                        selectDay(index)
                        setActiveTab("today")
                      }}
                    />
                    {/* Milestones - compact in schedule view */}
                    <div className="bg-card border-border rounded-xl border p-4">
                      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                        <Target className="text-primary h-4 w-4" />
                        Milestones
                      </h3>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {roadmap.milestones.slice(0, 3).map((milestone) => (
                          <div
                            key={milestone.id}
                            className={cn(
                              "rounded-lg border p-2.5 text-center",
                              milestone.isCompleted
                                ? "border-green-200 bg-green-50 dark:border-green-800/30 dark:bg-green-900/20"
                                : "bg-muted/50 border-border"
                            )}
                          >
                            <p className="truncate text-xs font-medium">{milestone.name}</p>
                            <p className="text-muted-foreground mt-0.5 text-[10px]">
                              {new Date(milestone.targetDate).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "progress" && (
                  <div className="space-y-4">
                    <RoadmapHeader roadmap={roadmap} />
                    <PatternCoverage roadmap={roadmap} companyTopPatterns={topPatterns} />
                  </div>
                )}

                {activeTab === "guide" && companyData && (
                  <div className="space-y-4">
                    {/* Personalized Guide - Dynamic based on user profile */}
                    {personalizedGuide ? (
                      <PersonalizedCompanyGuide guide={personalizedGuide} />
                    ) : (
                      /* Fallback to static guide if no assessment data */
                      <CompanyInterviewGuide company={companyData} isIntern={isIntern} />
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Archived Roadmaps - Compact Collapsible List */}
            {archivedRoadmaps.length > 0 && (
              <ArchivedRoadmapsList
                roadmaps={archivedRoadmaps.map((r) => ({
                  id: r.id,
                  companyName: r.companyName || r.targetCompany,
                  status: r.status as "archived" | "completed" | "abandoned",
                  questionsCompleted: r.questionsCompleted,
                  totalQuestions: r.totalQuestions,
                  interviewDate: new Date(r.interviewDate),
                }))}
                onReactivate={handleReactivateRoadmap}
                reactivatingId={null}
              />
            )}

            {/* Footer - End Roadmap option (only for active roadmaps) */}
            {!statusType && (
              <div className="border-border flex items-center justify-end border-t pt-4">
                <button
                  onClick={() => setShowEndRoadmapDialog(true)}
                  className="text-muted-foreground text-xs transition-colors hover:text-red-500"
                >
                  <StopCircle className="mr-1 inline h-3 w-3" />
                  End Roadmap
                </button>
              </div>
            )}
          </div>
        )}

        {/* Day Unlock Modal - Shows when user completes a day */}
        {roadmap && (
          <DayUnlockModal
            isOpen={showDayUnlockModal}
            onClose={() => {
              acknowledgeDayCompletion(selectedDayIndex)
              setShowDayUnlockModal(false)
            }}
            onUnlockNextDay={handleUnlockNextDay}
            onTakeBreak={handleTakeBreak}
            completedDay={selectedDayIndex + 1}
            totalDaysRemaining={roadmap.dailyPlans.length - selectedDayIndex - 1}
            questionsCompletedToday={
              roadmap.dailyPlans[selectedDayIndex]?.questions.filter(
                (q) => q.status === "completed"
              ).length || 0
            }
            minutesSpentToday={
              roadmap.dailyPlans[selectedDayIndex]?.questions.reduce(
                (sum, q) => sum + (q.status === "completed" ? q.estimatedMinutes : 0),
                0
              ) || 0
            }
            nextDayTheme={roadmap.dailyPlans[selectedDayIndex + 1]?.theme}
            nextDayQuestionCount={roadmap.dailyPlans[selectedDayIndex + 1]?.questions.length}
          />
        )}

        {/* Confirmation Dialog for Ending Roadmap */}
        <Dialog open={showEndRoadmapDialog} onOpenChange={setShowEndRoadmapDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                End This Roadmap?
              </DialogTitle>
              <div className="text-muted-foreground pt-2 text-left text-sm">
                Are you sure you want to end your {roadmap?.companyName} roadmap early?
                <ul className="mt-3 space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-muted-foreground">•</span>
                    <span>
                      Your progress ({roadmap?.questionsCompleted}/{roadmap?.totalQuestions}{" "}
                      questions) will be saved
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-muted-foreground">•</span>
                    <span>
                      You can resume this roadmap later if the interview date hasn't passed
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-muted-foreground">•</span>
                    <span>You can create a new roadmap for a different company</span>
                  </li>
                </ul>
              </div>
            </DialogHeader>
            <DialogFooter className="flex-row gap-2 sm:justify-end">
              <button
                onClick={() => setShowEndRoadmapDialog(false)}
                className="border-border hover:bg-muted flex-1 rounded-lg border px-4 py-2 text-sm transition-colors sm:flex-none"
              >
                Keep Studying
              </button>
              <button
                onClick={handleArchiveRoadmap}
                disabled={isArchiving}
                className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-sm text-white transition-colors hover:bg-red-600 disabled:opacity-50 sm:flex-none"
              >
                {isArchiving ? "Ending..." : "End Roadmap"}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS - Extracted for clarity
// ═══════════════════════════════════════════════════════════════════════════

function QuickStat({
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

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
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
function RoadmapListView({
  roadmaps,
  onCreateNew,
  onClose,
  onReactivate,
}: {
  roadmaps: any[]
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
  roadmap: any
  onReactivate?: (roadmapId: string) => Promise<void>
  isReactivating?: boolean
}) {
  const interviewDate = new Date(roadmap.interviewDate)
  const progress = Math.round((roadmap.questionsCompleted / roadmap.totalQuestions) * 100)
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

  const handleReactivate = async (e: React.MouseEvent) => {
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

function EmptyState({ onCreateNew }: { onCreateNew: () => void }) {
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
          const data = await response.json()
          setIsPro(data.tier === "pro" || data.tier === "enterprise")
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
                  Pattern mastery tracking across 15 DSA patterns
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
                Pattern mastery tracking across 15 DSA patterns
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
