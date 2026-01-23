/**
 * useSpacedRepetition Hook
 *
 * Manages spaced repetition logic including:
 * - Due items state management
 * - Skip and mark reviewed actions
 * - Loading states for individual items
 * - Due categories (now, today, minutes, upcoming)
 */

import { useState } from "react"
import type { MasteryLevel } from "@/lib/scoring/types"

export type Priority = "critical" | "high" | "medium" | "low"
export type Algorithm = "sm2" | "fsrs"

// Re-export MasteryLevel for backwards compatibility
export type { MasteryLevel }

export interface DueItem {
  problem_id: string
  scenario_id: string
  title: string
  pattern: string
  difficulty: "easy" | "medium" | "hard"
  last_score: number
  days_overdue: number
  days_until_review: number // Days until next review (negative if overdue)
  minutes_until_review?: number // Minutes until review (for FSRS learning steps)
  next_review_at: string // ISO date string
  priority: Priority
  priority_score: number
  estimated_minutes: number
  mastery_level: MasteryLevel
  retention_estimate: number
  algorithm?: Algorithm // User's assigned algorithm
  fsrs_state?: "new" | "learning" | "review" | "relearning" // FSRS-specific state
  last_reviewed_at?: string // ISO date - when this problem was last practiced
}

export interface UseSpacedRepetitionOptions {
  dueNow?: DueItem[]
  dueToday?: DueItem[]
  dueInMinutes?: DueItem[]
  upcoming?: DueItem[]
  totalDue?: number
  overdueCount?: number
  userAlgorithm?: Algorithm
  onSkip?: (problemId: string) => Promise<void>
  onMarkReviewed?: (problemId: string, scenarioId: string) => Promise<void>
  isLoading?: boolean
}

export interface UseSpacedRepetitionReturn {
  // Data
  dueNow: DueItem[]
  dueToday: DueItem[]
  dueInMinutes: DueItem[]
  upcoming: DueItem[]
  allDue: DueItem[]
  totalDue: number
  overdueCount: number
  userAlgorithm?: Algorithm
  isLoading: boolean

  // UI state
  isUpcomingExpanded: boolean
  setIsUpcomingExpanded: (expanded: boolean) => void
  skippingId: string | null
  markingReviewedId: string | null

  // Actions
  handleSkip: (problemId: string) => Promise<void>
  handleMarkReviewed: (problemId: string, scenarioId: string) => Promise<void>
}

export function useSpacedRepetition({
  dueNow = [],
  dueToday = [],
  dueInMinutes = [],
  upcoming = [],
  totalDue = 0,
  overdueCount = 0,
  userAlgorithm,
  onSkip,
  onMarkReviewed,
  isLoading = false,
}: UseSpacedRepetitionOptions = {}): UseSpacedRepetitionReturn {
  const [isUpcomingExpanded, setIsUpcomingExpanded] = useState(false)
  const [skippingId, setSkippingId] = useState<string | null>(null)
  const [markingReviewedId, setMarkingReviewedId] = useState<string | null>(null)

  const handleSkip = async (problemId: string) => {
    if (!onSkip) return
    setSkippingId(problemId)
    try {
      await onSkip(problemId)
    } finally {
      setSkippingId(null)
    }
  }

  const handleMarkReviewed = async (problemId: string, scenarioId: string) => {
    if (!onMarkReviewed) return
    setMarkingReviewedId(problemId)
    try {
      await onMarkReviewed(problemId, scenarioId)
    } finally {
      setMarkingReviewedId(null)
    }
  }

  const allDue = [...dueInMinutes, ...dueNow, ...dueToday]

  return {
    // Data
    dueNow,
    dueToday,
    dueInMinutes,
    upcoming,
    allDue,
    totalDue,
    overdueCount,
    userAlgorithm,
    isLoading,

    // UI state
    isUpcomingExpanded,
    setIsUpcomingExpanded,
    skippingId,
    markingReviewedId,

    // Actions
    handleSkip,
    handleMarkReviewed,
  }
}
