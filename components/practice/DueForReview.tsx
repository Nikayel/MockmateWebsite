"use client"

import { Check } from "lucide-react"
import { useSpacedRepetition } from "@/lib/hooks"
import { ReviewSections } from "./ReviewSections"
import type { DueItem, Priority, MasteryLevel, Algorithm } from "@/lib/hooks/useSpacedRepetition"

// Re-export types for backward compatibility
export type { DueItem, Priority, MasteryLevel, Algorithm }

interface DueForReviewProps {
  dueNow: DueItem[]
  dueToday: DueItem[]
  dueInMinutes?: DueItem[] // FSRS learning steps - due within the hour
  upcoming: DueItem[]
  totalDue: number
  overdueCount: number
  userAlgorithm?: Algorithm // User's assigned algorithm for transparency
  onSkip?: (problemId: string) => Promise<void>
  onMarkReviewed?: (problemId: string, scenarioId: string) => Promise<void>
  isLoading?: boolean
  // Overwhelm management props
  maxDailyReviews?: number
  isOverwhelmed?: boolean
  deferCount?: number
  onBatchDefer?: () => void
  isDeferring?: boolean
}

export function DueForReview({
  dueNow,
  dueToday,
  dueInMinutes = [],
  upcoming,
  totalDue,
  overdueCount,
  userAlgorithm,
  onSkip,
  onMarkReviewed,
  isLoading = false,
  // Overwhelm management
  maxDailyReviews,
  isOverwhelmed,
  deferCount,
  onBatchDefer,
  isDeferring,
}: DueForReviewProps) {
  const {
    allDue,
    isUpcomingExpanded,
    setIsUpcomingExpanded,
    handleSkip,
    handleMarkReviewed,
    skippingId,
    markingReviewedId,
  } = useSpacedRepetition({
    dueNow,
    dueToday,
    dueInMinutes,
    upcoming,
    totalDue,
    overdueCount,
    userAlgorithm,
    onSkip,
    onMarkReviewed,
    isLoading,
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-foreground/5" />
        ))}
      </div>
    )
  }

  if (allDue.length === 0 && upcoming.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
          <Check className="h-6 w-6 text-emerald-400" />
        </div>
        <h3 className="mb-1 text-lg font-medium text-foreground">All caught up</h3>
        <p className="text-sm text-muted-foreground">
          No reviews due. Check back later or practice new problems.
        </p>
      </div>
    )
  }

  return (
    <ReviewSections
      dueInMinutes={dueInMinutes}
      dueNow={dueNow}
      dueToday={dueToday}
      upcoming={upcoming}
      allDue={allDue}
      overdueCount={overdueCount}
      totalDue={totalDue}
      userAlgorithm={userAlgorithm}
      isUpcomingExpanded={isUpcomingExpanded}
      onToggleUpcoming={() => setIsUpcomingExpanded(!isUpcomingExpanded)}
      onSkip={onSkip ? handleSkip : undefined}
      onMarkReviewed={onMarkReviewed ? handleMarkReviewed : undefined}
      skippingId={skippingId}
      markingReviewedId={markingReviewedId}
      // Overwhelm management
      maxDailyReviews={maxDailyReviews}
      isOverwhelmed={isOverwhelmed}
      deferCount={deferCount}
      onBatchDefer={onBatchDefer}
      isDeferring={isDeferring}
    />
  )
}
