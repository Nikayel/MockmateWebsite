"use client"

import { useState } from "react"
import Link from "next/link"
import { Clock, Play, AlertTriangle, Check, SkipForward } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DueItem } from "@/lib/hooks"
import { formatPatternLabel } from "@/lib/pattern-labels"
import { difficultyColorClass } from "@/lib/ui/difficulty-colors"

interface ReviewCardProps {
  item: DueItem
  onSkip?: (problemId: string) => Promise<void>
  onMarkReviewed?: (problemId: string, scenarioId: string) => Promise<void>
  isSkipping?: boolean
  isMarkingReviewed?: boolean
  showOverdue?: boolean
  showUpcomingDate?: boolean
  isUpcoming?: boolean
}


/**
 * Get algorithm-aware reasoning for why review is scheduled at this time.
 * Adapts messaging based on SM-2 vs FSRS algorithm.
 * Returns both a short reason and an educational tooltip.
 */
function getReviewReason(item: DueItem): { short: string; tooltip: string } {
  const daysUntil = item.days_until_review
  const minutesUntil = item.minutes_until_review
  const retention = item.retention_estimate
  const interval = Math.abs(daysUntil)
  const isFSRS = item.algorithm === "fsrs"
  const algorithmName = isFSRS ? "FSRS" : "SM-2"

  // FSRS learning phase - due in minutes
  if (isFSRS && minutesUntil !== undefined && minutesUntil <= 60 && minutesUntil > 0) {
    if (minutesUntil <= 1) {
      return {
        short: "Learning step — review now!",
        tooltip: `FSRS uses graduated learning steps (1min → 10min → 1day). Complete this step to progress. Missing it resets progress.`,
      }
    }
    if (minutesUntil <= 10) {
      return {
        short: `Learning step — ${minutesUntil}min`,
        tooltip: `FSRS learning phase uses short intervals to establish initial memory. Review within ${minutesUntil} minutes for best results.`,
      }
    }
    return {
      short: `Due in ${minutesUntil}min`,
      tooltip: `You're in the learning phase. FSRS schedules quick reviews to build memory before moving to longer intervals.`,
    }
  }

  // FSRS relearning phase
  if (isFSRS && item.fsrs_state === "relearning") {
    return {
      short: "Relearning — needs reinforcement",
      tooltip: `You struggled with this last time. FSRS has moved it to relearning phase with shorter intervals until you demonstrate recall.`,
    }
  }

  // Overdue items
  if (daysUntil < 0) {
    if (retention < 50) {
      return {
        short: "Memory fading — review now",
        tooltip: `Your retention dropped to ~${Math.round(retention)}%. The forgetting curve shows memory decays exponentially without review.`,
      }
    }
    return {
      short: "Due for review",
      tooltip: `Reviewing now strengthens the memory trace. Each review extends how long you'll remember.`,
    }
  }

  // Based on mastery level and retention
  if (item.mastery_level === "new" || item.mastery_level === "learning") {
    if (daysUntil <= 1) {
      return {
        short: "Short interval — building foundation",
        tooltip: isFSRS
          ? `FSRS uses ML-optimized intervals. After passing learning steps, you get a 1-day review to confirm retention.`
          : `New memories need frequent reinforcement. SM-2 starts with 1-day intervals, then 3 days, then expands based on performance.`,
      }
    }
    if (daysUntil <= 3) {
      return {
        short: "Strengthening neural pathways",
        tooltip: `Spaced practice creates stronger synaptic connections. Your ${interval}-day interval is optimal for consolidating this pattern.`,
      }
    }
    return {
      short: "Learning phase — regular review",
      tooltip: `You're in the learning phase. Consistent review at ${interval}-day intervals builds lasting memory.`,
    }
  }

  if (item.mastery_level === "reviewing") {
    if (retention >= 80) {
      return {
        short: "Retention strong — interval extended",
        tooltip: `Your ~${Math.round(retention)}% retention shows solid recall. ${algorithmName} extended your interval to ${interval} days to maximize efficiency.`,
      }
    }
    return {
      short: "Optimal spacing for retention",
      tooltip: isFSRS
        ? `FSRS calculates intervals to maintain 90% target retention. Your ${interval}-day interval balances efficiency with memory strength.`
        : `Reviewing at ${interval}-day intervals balances efficiency with retention. Too soon wastes time; too late risks forgetting.`,
    }
  }

  if (item.mastery_level === "mastered") {
    return {
      short: "Maintenance review",
      tooltip: `Even mastered material needs occasional review to prevent decay. Your ${interval}-day interval maintains long-term retention with minimal effort.`,
    }
  }

  // Default based on difficulty
  if (item.difficulty === "hard") {
    return {
      short: "Harder problems need more practice",
      tooltip: `Complex problems require more repetitions to reach automaticity. ${algorithmName} adjusts intervals based on problem difficulty.`,
    }
  }

  return {
    short: "Spaced review for retention",
    tooltip: `Spaced repetition is proven to be 2-3x more effective than massed practice. Your next review is optimally timed.`,
  }
}

/**
 * Format the next review timing with context AND exact date
 */
function getNextReviewDisplay(item: DueItem): {
  timing: string
  context: string
  exactDate: string
} {
  const daysUntil = item.days_until_review
  const reviewDate = new Date(item.next_review_at)
  const exactDate = reviewDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })

  if (daysUntil < 0) {
    const daysOverdue = Math.abs(daysUntil)
    return {
      timing: daysOverdue === 1 ? "1 day overdue" : `${daysOverdue} days overdue`,
      context: "Review soon to maintain progress",
      exactDate: `Was due ${exactDate}`,
    }
  }

  if (daysUntil === 0) {
    // Check if it's actually tomorrow (less than 24h but next calendar day)
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)

    if (reviewDate >= tomorrow) {
      return { timing: "Tomorrow", context: "Based on your performance", exactDate }
    }
    return { timing: "Due today", context: "Review to maintain streak", exactDate: "Today" }
  }

  if (daysUntil === 1) {
    return { timing: "Tomorrow", context: "Based on your performance", exactDate }
  }

  if (daysUntil <= 7) {
    return {
      timing: exactDate,
      context: `${daysUntil}-day interval from last review`,
      exactDate,
    }
  }

  if (daysUntil <= 30) {
    return {
      timing: exactDate,
      context: "Extended interval — you're progressing well",
      exactDate,
    }
  }

  // Format as date for items more than a month away
  return {
    timing: exactDate,
    context: "Mastery maintenance interval",
    exactDate,
  }
}

/**
 * Info icon with proper hover tooltip for showing science behind spaced repetition
 */
function InfoTooltip({ text }: { text: string }) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <span
      role="button"
      tabIndex={0}
      className="relative inline-flex items-center"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onClick={() => setIsVisible(!isVisible)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          setIsVisible(!isVisible)
        }
      }}
    >
      <span className="ml-1 inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-gray-700/50 text-[10px] text-gray-400 transition-colors hover:bg-gray-600/50 hover:text-gray-300">
        ?
      </span>
      {isVisible && (
        <span className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg border border-gray-700 bg-gray-800 p-3 text-xs leading-relaxed text-gray-300 shadow-xl">
          <span className="mb-1 block font-medium text-white">Why this interval?</span>
          {text}
          <span className="absolute top-full left-1/2 h-0 w-0 -translate-x-1/2 border-t-[6px] border-r-[6px] border-l-[6px] border-t-gray-700 border-r-transparent border-l-transparent" />
        </span>
      )}
    </span>
  )
}

export function ReviewCard({
  item,
  onSkip,
  onMarkReviewed,
  isSkipping,
  isMarkingReviewed,
  showOverdue = false,
  showUpcomingDate = false,
  isUpcoming = false,
}: ReviewCardProps) {
  const [showEarlyWarning, setShowEarlyWarning] = useState(false)
  const reviewReason = getReviewReason(item)
  const nextReview = getNextReviewDisplay(item)

  // Get early practice warning based on how far out the review is scheduled
  const getEarlyPracticeWarning = (): { title: string; message: string; canProceed: boolean } => {
    const days = item.days_until_review

    if (days <= 1) {
      return {
        title: "Almost due",
        message: "This review is scheduled for soon. Practicing now is fine!",
        canProceed: true,
      }
    }

    if (days <= 3) {
      return {
        title: "Slightly early",
        message: `This problem is scheduled for ${days} days from now. Practicing early won't hurt, but waiting would be more efficient for long-term retention.`,
        canProceed: true,
      }
    }

    if (days <= 7) {
      return {
        title: "Review not due yet",
        message: `Spaced repetition works by reviewing at optimal intervals. This problem is scheduled for ${days} days from now — practicing too early means you're not testing your memory at the forgetting threshold, which reduces the strengthening effect.`,
        canProceed: true,
      }
    }

    // More than a week away
    return {
      title: "Too early for optimal learning",
      message: `This problem isn't due for ${days} days. Research shows that reviewing too early provides weaker memory reinforcement because you haven't reached the "desirable difficulty" threshold. Your brain strengthens memories most when you recall them just before forgetting. Consider practicing problems that are due now instead.`,
      canProceed: true,
    }
  }

  // Check if item is actually scheduled for tomorrow or later (not due today)
  const isScheduledForFuture = (() => {
    if (item.days_until_review > 0) return true
    if (item.days_until_review === 0) {
      // Edge case: less than 24h away but actually tomorrow (next calendar day)
      const now = new Date()
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)
      const reviewDate = new Date(item.next_review_at)
      return reviewDate >= tomorrow
    }
    return false
  })()

  const handleStartClick = () => {
    if (isUpcoming && isScheduledForFuture && item.days_until_review > 1) {
      // Show warning for items more than 1 day away
      setShowEarlyWarning(true)
    } else {
      // Navigate directly for items due soon
      window.location.href = `/interview?scenario=${item.scenario_id}&practice=true`
    }
  }

  const warning = getEarlyPracticeWarning()

  return (
    <>
      <div className="group -mx-4 flex items-center justify-between rounded-lg px-4 py-3 transition-colors hover:bg-white/[0.02]">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate font-medium text-white">{item.title}</span>
              {showOverdue && item.days_overdue > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-xs text-rose-400">
                  <AlertTriangle className="h-3 w-3" />
                  {item.days_overdue}d overdue
                </span>
              )}
              {showUpcomingDate && (
                <span
                  className="flex cursor-help items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400"
                  title={
                    item.days_until_review > 0
                      ? `Scheduled for review in ${item.days_until_review} day${item.days_until_review === 1 ? "" : "s"} based on your last score of ${item.last_score}%`
                      : `Scheduled for review based on your last score of ${item.last_score}%`
                  }
                >
                  <Clock className="h-3 w-3" />
                  {nextReview.timing}
                </span>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm">
              <span className={difficultyColorClass(item.difficulty, "text")}>{item.difficulty}</span>
              <span className="text-gray-500">{formatPatternLabel(item.pattern)}</span>
              <span className="text-gray-600">{item.estimated_minutes}m</span>
              {item.last_score > 0 && (
                <span
                  className={`${item.last_score >= 70 ? "text-emerald-500" : item.last_score >= 50 ? "text-amber-500" : "text-rose-400"}`}
                >
                  Last: {item.last_score}%
                </span>
              )}
              {/* Show review reason with science tooltip */}
              <span className="flex items-center text-gray-500">
                <span className="text-gray-600">·</span>
                <span className="ml-2 text-gray-400 italic">{reviewReason.short}</span>
                <InfoTooltip text={reviewReason.tooltip} />
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          {onSkip && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-gray-500 hover:text-gray-300"
              onClick={() => onSkip(item.problem_id)}
              disabled={isSkipping}
              title="Skip for now"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          )}
          {onMarkReviewed && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-emerald-500 hover:text-emerald-400"
              onClick={() => onMarkReviewed(item.problem_id, item.scenario_id)}
              disabled={isMarkingReviewed}
              title="Mark as reviewed (practiced elsewhere)"
            >
              <Check className="mr-1 h-4 w-4" />
              Done
            </Button>
          )}
          {isUpcoming && isScheduledForFuture ? (
            <Button
              size="sm"
              className="h-8 bg-gray-700 text-gray-300 hover:bg-gray-600"
              onClick={handleStartClick}
            >
              <Play className="mr-1 h-3 w-3" />
              Practice Early
            </Button>
          ) : (
            <Link href={`/interview?scenario=${item.scenario_id}&practice=true`}>
              <Button size="sm" className="h-8 bg-white text-black hover:bg-gray-200">
                <Play className="mr-1 h-3 w-3" />
                Start
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Early Practice Warning Modal */}
      {showEarlyWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
            <div className="mb-4 flex items-start gap-3">
              <div className="rounded-lg bg-amber-500/10 p-2">
                <Clock className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{warning.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-gray-400">{warning.message}</p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
                onClick={() => setShowEarlyWarning(false)}
              >
                Wait for Due Date
              </Button>
              <Link
                href={`/interview?scenario=${item.scenario_id}&practice=true`}
                className="flex-1"
              >
                <Button className="w-full bg-amber-600 text-white hover:bg-amber-500">
                  Practice Anyway
                </Button>
              </Link>
            </div>

            <p className="mt-4 text-center text-xs text-gray-500">
              Tip: Focus on overdue problems first for maximum retention benefit
            </p>
          </div>
        </div>
      )}
    </>
  )
}
