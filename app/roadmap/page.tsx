"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Target,
  Sparkles,
  Trophy,
  AlertTriangle,
  Clock,
  PartyPopper,
  Calendar,
  ArrowRight,
  ChevronDown,
  ChevronUp,
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
import type { DailyPlan, Milestone, PersonalizedRoadmap } from "@/lib/data/company-questions/types"
import { getStudyRecommendations } from "@/lib/roadmap/prioritization-algorithm"
import { roadmapProgressPercent } from "@/lib/roadmap/progress"
import { generatePersonalizedGuide } from "@/lib/roadmap/personalized-guide-generator"
import { cn, getStoredDateComponents, getLocalDateComponents } from "@/lib/utils"
import { selectDeferTargetIndex } from "@/lib/roadmap/defer-question"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"
import {
  EmptyState,
  QuickStat,
  RoadmapListView,
  TabButton,
  type RoadmapSummary,
} from "./_components/RoadmapPageParts"

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

type SerializedDailyPlan = Omit<DailyPlan, "date" | "questions"> & {
  date: string | Date
  questions?: Array<
    Omit<DailyPlan["questions"][number], "completedAt"> & {
      completedAt?: string | Date
    }
  >
}

type SerializedMilestone = Omit<Milestone, "targetDate" | "completedAt"> & {
  targetDate: string | Date
  completedAt?: string | Date
}

type SerializedRoadmap = Omit<
  PersonalizedRoadmap,
  "interviewDate" | "createdAt" | "updatedAt" | "dailyPlans" | "milestones"
> & {
  interviewDate: string | Date
  createdAt?: string | Date
  updatedAt?: string | Date
  dailyPlans?: SerializedDailyPlan[]
  milestones?: SerializedMilestone[]
}

function hydrateRoadmap(serializedRoadmap: SerializedRoadmap): PersonalizedRoadmap {
  return {
    ...serializedRoadmap,
    interviewDate: new Date(serializedRoadmap.interviewDate),
    createdAt: serializedRoadmap.createdAt ? new Date(serializedRoadmap.createdAt) : new Date(),
    updatedAt: serializedRoadmap.updatedAt ? new Date(serializedRoadmap.updatedAt) : new Date(),
    dailyPlans:
      serializedRoadmap.dailyPlans?.map((plan) => ({
        ...plan,
        date: new Date(plan.date),
        questions:
          plan.questions?.map((question) => ({
            ...question,
            completedAt: question.completedAt ? new Date(question.completedAt) : undefined,
          })) || [],
      })) || [],
    milestones:
      serializedRoadmap.milestones?.map((milestone) => ({
        ...milestone,
        targetDate: new Date(milestone.targetDate),
        completedAt: milestone.completedAt ? new Date(milestone.completedAt) : undefined,
      })) || [],
  }
}

export default function RoadmapPage() {
  const router = useRouter()
  const roadmap = useActiveRoadmap()
  const { user, firebaseUser, initialized } = useAuth()
  const {
    selectedDayIndex,
    selectDay,
    markQuestionCompleted,
    markQuestionSkipped,
    deferQuestion,
    setActiveRoadmap,
  } = useRoadmapStore()
  const [activeTab, setActiveTab] = useState<RoadmapTab>("today")
  const [isLoadingRoadmap, setIsLoadingRoadmap] = useState(true)
  const [allRoadmaps, setAllRoadmaps] = useState<RoadmapSummary[]>([])
  const [showArchived, setShowArchived] = useState(false)
  const [showTips, setShowTips] = useState(false)
  const [showEndRoadmapDialog, setShowEndRoadmapDialog] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [showDayUnlockModal, setShowDayUnlockModal] = useState(false)
  const [acknowledgedDays, setAcknowledgedDays] = useState<Set<number>>(new Set())
  // Track if acknowledged days have been loaded from localStorage
  const [acknowledgedDaysLoaded, setAcknowledgedDaysLoaded] = useState(false)
  // Track if we should check for day completion (after completing/skipping a question)
  const [shouldCheckDayCompletion, setShouldCheckDayCompletion] = useState(false)

  // Get today's plan
  // Use timezone-safe date comparison: plan dates are stored as UTC midnight,
  // so we use UTC methods to extract the "intended" date and compare with local today.
  // This ensures "Day 2" on Jan 9 UTC matches Jan 9 local time, regardless of timezone.
  const today = new Date()
  const localToday = getLocalDateComponents(today)
  const localTodayTimestamp = Date.UTC(localToday.year, localToday.month, localToday.day)

  const todayIndex =
    roadmap?.dailyPlans.findIndex((plan) => {
      const planDate = new Date(plan.date)
      // Use UTC methods to get the intended date from the stored UTC midnight timestamp
      const planDateComponents = getStoredDateComponents(planDate)
      return (
        planDateComponents.year === localToday.year &&
        planDateComponents.month === localToday.month &&
        planDateComponents.day === localToday.day
      )
    }) ?? -1 // Use -1 to indicate no match, then handle below

  // If today's date doesn't exactly match any plan day, find the best day to show:
  // - The most recent day that is today or before today (current progress)
  // - Or the first day if we're before the roadmap starts
  const getBestDayIndex = (): number => {
    if (!roadmap?.dailyPlans?.length) return 0
    if (todayIndex >= 0) return todayIndex

    // Find the last day that is on or before today
    let bestIndex = 0
    for (let i = 0; i < roadmap.dailyPlans.length; i++) {
      const planDate = new Date(roadmap.dailyPlans[i].date)
      const planComponents = getStoredDateComponents(planDate)
      const planTimestamp = Date.UTC(planComponents.year, planComponents.month, planComponents.day)

      if (planTimestamp <= localTodayTimestamp) {
        bestIndex = i
      } else {
        // Plan date is in the future, stop searching
        break
      }
    }
    return bestIndex
  }

  const bestDayIndex = getBestDayIndex()

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
        const activeResponse = await fetch("/api/roadmap", { headers: authHeaders })

        if (activeResponse.ok) {
          const activeData = await activeResponse.json()

          if (activeData.roadmap) {
            // Convert date strings back to Date objects for the store
            const roadmap = hydrateRoadmap(activeData.roadmap as SerializedRoadmap)
            setActiveRoadmap(roadmap)

            // Calculate and set the correct day index immediately after loading
            // This prevents the flash of wrong day on initial navigation
            const now = new Date()
            const localTodayForInit = getLocalDateComponents(now)
            const localTodayTimestampForInit = Date.UTC(
              localTodayForInit.year,
              localTodayForInit.month,
              localTodayForInit.day
            )

            // First try to find an exact match for today
            let correctDayIndex =
              roadmap.dailyPlans?.findIndex((plan) => {
                const planDate = new Date(plan.date)
                const planDateComponents = getStoredDateComponents(planDate)
                return (
                  planDateComponents.year === localTodayForInit.year &&
                  planDateComponents.month === localTodayForInit.month &&
                  planDateComponents.day === localTodayForInit.day
                )
              }) ?? -1

            // If no exact match, find the best day (most recent day on or before today)
            if (correctDayIndex === -1 && roadmap.dailyPlans?.length > 0) {
              correctDayIndex = 0
              for (let i = 0; i < roadmap.dailyPlans.length; i++) {
                const planDate = new Date(roadmap.dailyPlans[i].date)
                const planComponents = getStoredDateComponents(planDate)
                const planTimestamp = Date.UTC(
                  planComponents.year,
                  planComponents.month,
                  planComponents.day
                )
                if (planTimestamp <= localTodayTimestampForInit) {
                  correctDayIndex = i
                } else {
                  break
                }
              }
            }

            if (correctDayIndex >= 0) {
              selectDay(correctDayIndex)
            }
          }
        }

        // Load all roadmaps for the list view
        const allResponse = await fetch("/api/roadmap?all=true", { headers: authHeaders })
        if (allResponse.ok) {
          const allData = await allResponse.json()
          if (allData.roadmaps) {
            setAllRoadmaps(allData.roadmaps as RoadmapSummary[])
          }
        }
      } catch {
        // Error loading roadmaps - will show empty state
      } finally {
        setIsLoadingRoadmap(false)
      }
    }

    loadRoadmaps()
  }, [user?.id, firebaseUser, initialized, setActiveRoadmap])

  // Set selected day to best day on initial mount only
  // NOTE: We use bestDayIndex as a dependency to handle the case where it's
  // calculated before roadmap is loaded. This ensures we select the correct day
  // as soon as both are available.
  useEffect(() => {
    if (roadmap && selectedDayIndex !== bestDayIndex) {
      // Only auto-select on first load or when date changes
      selectDay(bestDayIndex)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roadmap?.id, bestDayIndex]) // Re-run when bestDayIndex changes to ensure correct day selection

  const handleStartQuestion = (scenarioId: string) => {
    // Navigate to interview with this scenario
    router.push(`/interview?scenario=${scenarioId}&roadmap=true`)
  }

  const handleSkipQuestion = (scenarioId: string) => {
    markQuestionSkipped(scenarioId)
    // Trigger day completion check after skipping
    // Use setTimeout to allow state to update first
    setTimeout(() => setShouldCheckDayCompletion(true), 100)
  }

  const handleMarkComplete = (scenarioId: string) => {
    markQuestionCompleted(scenarioId)
    // Trigger day completion check after marking complete
    // Use setTimeout to allow state to update first
    setTimeout(() => setShouldCheckDayCompletion(true), 100)
  }

  const handleDeferQuestion = (scenarioId: string) => {
    const outcome = deferQuestion(scenarioId)
    if (!outcome.ok) {
      toast.error(
        outcome.reason === "no_later_day"
          ? "No later day before your interview to move this to."
          : "Could not move this question."
      )
      return
    }
    const targetTheme =
      outcome.targetDayIndex !== undefined
        ? roadmap?.dailyPlans[outcome.targetDayIndex]?.theme
        : undefined
    toast.success(targetTheme ? `Moved to ${targetTheme}.` : "Moved to a later day.")
    // Moving the question may leave the current day complete; check for the unlock modal.
    setTimeout(() => setShouldCheckDayCompletion(true), 100)
  }

  // Load acknowledged days from localStorage when roadmap changes
  useEffect(() => {
    if (!roadmap?.id) {
      setAcknowledgedDaysLoaded(false)
      return
    }
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
    setAcknowledgedDaysLoaded(true)
  }, [roadmap?.id])

  // Check if user just completed a question (coming back from interview page)
  // This runs once on mount to check sessionStorage
  useEffect(() => {
    if (!roadmap?.id || !acknowledgedDaysLoaded) return

    const completionData = sessionStorage.getItem("roadmap-question-just-completed")
    if (!completionData) return

    try {
      const { roadmapId, timestamp } = JSON.parse(completionData)

      // Only process if it's for the current roadmap and recent (within 5 minutes)
      const isRecent = Date.now() - timestamp < 5 * 60 * 1000
      const isCurrentRoadmap = roadmapId === roadmap.id

      if (isRecent && isCurrentRoadmap) {
        // Clear the flag so it doesn't trigger again on subsequent navigations
        sessionStorage.removeItem("roadmap-question-just-completed")
        // Signal that we should check for day completion
        setShouldCheckDayCompletion(true)
      } else {
        // Stale or different roadmap - clean up
        sessionStorage.removeItem("roadmap-question-just-completed")
      }
    } catch {
      sessionStorage.removeItem("roadmap-question-just-completed")
    }
  }, [roadmap?.id, acknowledgedDaysLoaded])

  // Check if current day was just completed and show unlock modal
  // Only show if: user just came back from completing a question AND the day is now complete
  useEffect(() => {
    if (!roadmap || !acknowledgedDaysLoaded || !shouldCheckDayCompletion) return

    // Reset the flag so we don't check again
    setShouldCheckDayCompletion(false)

    // Find which day the user was working on (the one with the most recently completed question)
    // We need to find the correct day, not rely on selectedDayIndex which might be stale
    let completedDayIndex = -1
    for (let i = 0; i < roadmap.dailyPlans.length; i++) {
      const plan = roadmap.dailyPlans[i]
      const allCompleted =
        plan.questions.length > 0 &&
        plan.questions.every((q) => q.status === "completed" || q.status === "skipped")
      // Check if this day is complete and not already acknowledged
      if (allCompleted && !acknowledgedDays.has(i)) {
        completedDayIndex = i
        break // Take the first unacknowledged completed day
      }
    }

    if (completedDayIndex === -1) return

    const hasNextDay = completedDayIndex < roadmap.dailyPlans.length - 1

    // Show unlock modal if there's a completed day that hasn't been acknowledged
    if (hasNextDay) {
      // Select the completed day so the modal shows correct info
      selectDay(completedDayIndex)
      setShowDayUnlockModal(true)
    }
  }, [roadmap, acknowledgedDaysLoaded, shouldCheckDayCompletion, acknowledgedDays, selectDay])

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
          const roadmap = hydrateRoadmap(activeData.roadmap as SerializedRoadmap)
          setActiveRoadmap(roadmap)

          // Calculate and set the correct day index immediately
          const now = new Date()
          const localTodayForReactivate = getLocalDateComponents(now)
          const localTodayTimestampForReactivate = Date.UTC(
            localTodayForReactivate.year,
            localTodayForReactivate.month,
            localTodayForReactivate.day
          )

          // First try to find an exact match for today
          let correctDayIndex =
            roadmap.dailyPlans?.findIndex((plan) => {
              const planDate = new Date(plan.date)
              const planDateComponents = getStoredDateComponents(planDate)
              return (
                planDateComponents.year === localTodayForReactivate.year &&
                planDateComponents.month === localTodayForReactivate.month &&
                planDateComponents.day === localTodayForReactivate.day
              )
            }) ?? -1

          // If no exact match, find the best day (most recent day on or before today)
          if (correctDayIndex === -1 && roadmap.dailyPlans?.length > 0) {
            correctDayIndex = 0
            for (let i = 0; i < roadmap.dailyPlans.length; i++) {
              const planDate = new Date(roadmap.dailyPlans[i].date)
              const planComponents = getStoredDateComponents(planDate)
              const planTimestamp = Date.UTC(
                planComponents.year,
                planComponents.month,
                planComponents.day
              )
              if (planTimestamp <= localTodayTimestampForReactivate) {
                correctDayIndex = i
              } else {
                break
              }
            }
          }

          if (correctDayIndex >= 0) {
            selectDay(correctDayIndex)
          }
        }
      }

      // Update all roadmaps list
      const allResponse = await fetch("/api/roadmap?all=true", { headers: authHeaders })
      if (allResponse.ok) {
        const allData = await allResponse.json()
        if (allData.roadmaps) {
          setAllRoadmaps(allData.roadmaps as RoadmapSummary[])
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
          setAllRoadmaps(allData.roadmaps as RoadmapSummary[])
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
  const progress = roadmapProgressPercent(roadmap.questionsCompleted, roadmap.totalQuestions)

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
          setAllRoadmaps(data.roadmaps as RoadmapSummary[])
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
  // A question can be deferred only when a later day exists to move it to.
  const canDeferFromSelectedDay =
    selectDeferTargetIndex(roadmap.dailyPlans, selectedDayIndex, new Date()) !== null
  // Use bestDayIndex which finds the most appropriate day to show
  // (exact match for today, or the most recent day if today isn't in the plan)
  const todayPlan = roadmap.dailyPlans[bestDayIndex]
  const recommendations = getStudyRecommendations(roadmap)
  const topPatterns = companyData?.topPatterns.map((p) => p.pattern) || []

  // Generate personalized guide based on user's assessment
  const personalizedGuide = roadmap.assessment
    ? generatePersonalizedGuide(roadmap.assessment, roadmap.totalQuestions)
    : null

  // Get first pending question for primary CTA (evaluating questions are shown but not as "next")
  const nextQuestion = todayPlan?.questions.find(
    (q) => q.status === "pending" || q.status === "in_progress" || q.status === "evaluating"
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
                            {nextQuestion.pattern
                              ? nextQuestion.pattern.replace(/-/g, " ")
                              : (nextQuestion.topic ?? "Practice")}
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
            <div className="bg-muted/50 flex items-center gap-1 rounded-lg p-1" role="tablist">
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
            </div>

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
                        onDeferQuestion={handleDeferQuestion}
                        canDefer={canDeferFromSelectedDay}
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
                  companyName: r.companyName || r.targetCompany || "Unknown company",
                  status: r.status as "archived" | "completed" | "abandoned",
                  questionsCompleted: r.questionsCompleted,
                  totalQuestions: r.totalQuestions,
                  interviewDate: new Date(r.interviewDate),
                  actualHoursSpent: r.actualHoursSpent,
                  patternCoverage: r.patternCoverage,
                  dailyPlans: r.dailyPlans?.map(
                    (day: {
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
                    }) => ({
                      dayNumber: day.dayNumber,
                      theme: day.theme,
                      questions: day.questions.map(
                        (q: {
                          scenarioId: string
                          title: string
                          pattern: string
                          difficulty: "easy" | "medium" | "hard"
                          status: "pending" | "in_progress" | "completed" | "skipped" | "evaluating"
                          score?: number
                        }) => ({
                          scenarioId: q.scenarioId,
                          title: q.title,
                          pattern: q.pattern,
                          difficulty: q.difficulty,
                          status: q.status,
                          score: q.score,
                        })
                      ),
                    })
                  ),
                  assessment: r.assessment
                    ? {
                        experienceLevel: r.assessment.experienceLevel,
                        hoursPerDay: r.assessment.hoursPerDay,
                      }
                    : undefined,
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
