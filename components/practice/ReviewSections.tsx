"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Play,
  Zap,
  Brain,
  Calendar,
  Clock,
  Archive,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { DueItem, Algorithm } from "@/lib/hooks"
import { ReviewCard } from "./ReviewCard"
import { OverwhelmedBanner } from "./OverwhelmedBanner"

interface ReviewSectionsProps {
  dueInMinutes: DueItem[]
  dueNow: DueItem[]
  dueToday: DueItem[]
  upcoming: DueItem[]
  allDue: DueItem[]
  overdueCount: number
  totalDue: number
  userAlgorithm?: Algorithm
  isUpcomingExpanded: boolean
  onToggleUpcoming: () => void
  onSkip?: (problemId: string) => void
  onMarkReviewed?: (problemId: string, scenarioId: string) => void
  skippingId: string | null
  markingReviewedId: string | null
  // Overwhelm management props
  maxDailyReviews?: number
  isOverwhelmed?: boolean
  deferCount?: number
  onBatchDefer?: () => void
  isDeferring?: boolean
}

// Collapsible section component for better UX
function CollapsibleSection({
  title,
  count,
  children,
  defaultExpanded = true,
  icon: Icon,
  iconColor = "text-gray-500",
  badge,
  subtitle,
}: {
  title: string
  count: number
  children: React.ReactNode
  defaultExpanded?: boolean
  icon?: React.ComponentType<{ className?: string }>
  iconColor?: string
  badge?: React.ReactNode
  subtitle?: string
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  if (count === 0) return null

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="mb-2 flex w-full items-center gap-2 text-xs font-medium tracking-wider uppercase transition-colors hover:text-gray-300"
      >
        {isExpanded ? (
          <ChevronDown className="h-3 w-3 text-gray-500" />
        ) : (
          <ChevronRight className="h-3 w-3 text-gray-500" />
        )}
        {Icon && <Icon className={`h-3 w-3 ${iconColor}`} />}
        <span className="text-gray-400">{title}</span>
        <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
          {count}
        </span>
        {badge}
        <span className="flex-1" />
      </button>
      {subtitle && !isExpanded && (
        <p className="-mt-1 mb-2 ml-5 text-xs text-gray-600">{subtitle}</p>
      )}
      {isExpanded && <div className="divide-y divide-white/5">{children}</div>}
    </div>
  )
}

export function ReviewSections({
  dueInMinutes,
  dueNow,
  dueToday,
  upcoming,
  allDue,
  overdueCount,
  totalDue,
  userAlgorithm,
  isUpcomingExpanded,
  onToggleUpcoming: _onToggleUpcoming,
  onSkip,
  onMarkReviewed,
  skippingId,
  markingReviewedId,
  // Overwhelm management
  maxDailyReviews = 10,
  isOverwhelmed = false,
  deferCount = 0,
  onBatchDefer,
  isDeferring = false,
}: ReviewSectionsProps) {
  const [showAllScheduled, setShowAllScheduled] = useState(false)

  // Wrap callbacks to ensure they return promises
  const handleSkip = onSkip
    ? async (id: string) => {
        await Promise.resolve(onSkip(id))
      }
    : undefined

  const handleMarkReviewed = onMarkReviewed
    ? async (id: string, scenarioId: string) => {
        await Promise.resolve(onMarkReviewed(id, scenarioId))
      }
    : undefined

  // Sort all upcoming by due date (soonest first)
  const sortedUpcoming = useMemo(() => {
    return [...upcoming].sort(
      (a, b) => new Date(a.next_review_at).getTime() - new Date(b.next_review_at).getTime()
    )
  }, [upcoming])

  // Split into "Due Soon" (within 7 days) and "Later" (beyond 7 days)
  const { dueSoon, dueLater } = useMemo(() => {
    const now = new Date()
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const dueSoon: DueItem[] = []
    const dueLater: DueItem[] = []

    sortedUpcoming.forEach((item) => {
      const dueDate = new Date(item.next_review_at)
      if (dueDate <= sevenDaysFromNow) {
        dueSoon.push(item)
      } else {
        dueLater.push(item)
      }
    })

    return { dueSoon, dueLater }
  }, [sortedUpcoming])

  // Calculate totals
  const totalUpcoming = upcoming.length

  return (
    <div>
      {/* Header with Algorithm Indicator */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-medium text-white">Due for Review</h3>
          {totalDue > 0 && <span className="text-sm text-gray-500">{totalDue} due today</span>}
          {/* Algorithm transparency indicator */}
          {userAlgorithm && (
            <span
              className={`inline-flex cursor-help items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                userAlgorithm === "fsrs"
                  ? "border border-purple-500/20 bg-purple-500/10 text-purple-400"
                  : "border border-blue-500/20 bg-blue-500/10 text-blue-400"
              }`}
              title={
                userAlgorithm === "fsrs"
                  ? "FSRS: ML-optimized algorithm with 90% retention target. Schedules based on your mastery score."
                  : "SM-2: Classic spaced repetition algorithm. Intervals expand based on ease factor."
              }
            >
              {userAlgorithm === "fsrs" ? (
                <Zap className="h-3 w-3" />
              ) : (
                <Brain className="h-3 w-3" />
              )}
              {userAlgorithm.toUpperCase()}
            </span>
          )}
        </div>
        {allDue.length > 0 && (
          <Link href={`/interview?scenario=${allDue[0].scenario_id}&practice=true`}>
            <Button size="sm" className="bg-white text-black hover:bg-gray-200">
              <Play className="mr-1.5 h-3 w-3" />
              Start Review
            </Button>
          </Link>
        )}
      </div>

      {/* Overdue warning */}
      {overdueCount > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-rose-500/10 bg-rose-500/5 px-3 py-2 text-sm text-rose-400">
          <AlertTriangle className="h-4 w-4" />
          <span>{overdueCount} overdue - review soon to maintain retention</span>
        </div>
      )}

      {/* Overwhelmed banner - shown when due items exceed user's limit */}
      {isOverwhelmed && onBatchDefer && (
        <OverwhelmedBanner
          totalDue={totalDue}
          maxDailyReviews={maxDailyReviews}
          deferCount={deferCount}
          onDeferClick={onBatchDefer}
          isDeferring={isDeferring}
        />
      )}

      {/* FSRS Learning Steps - Due in Minutes */}
      <CollapsibleSection
        title="Learning Steps"
        count={dueInMinutes.length}
        icon={Zap}
        iconColor="text-purple-400"
        badge={
          <span className="ml-1 text-[10px] font-normal text-purple-400 normal-case">
            Review now
          </span>
        }
      >
        <p className="-mt-1 mb-3 text-xs text-gray-600">
          Complete these quick reviews to progress through the learning phase
        </p>
        {dueInMinutes.map((item) => (
          <ReviewCard
            key={item.problem_id}
            item={item}
            onSkip={handleSkip}
            onMarkReviewed={handleMarkReviewed}
            isSkipping={skippingId === item.problem_id}
            isMarkingReviewed={markingReviewedId === item.problem_id}
          />
        ))}
      </CollapsibleSection>

      {/* Overdue */}
      <CollapsibleSection
        title="Overdue"
        count={dueNow.length}
        icon={AlertTriangle}
        iconColor="text-rose-400"
      >
        {dueNow.map((item) => (
          <ReviewCard
            key={item.problem_id}
            item={item}
            onSkip={handleSkip}
            onMarkReviewed={handleMarkReviewed}
            isSkipping={skippingId === item.problem_id}
            isMarkingReviewed={markingReviewedId === item.problem_id}
            showOverdue
          />
        ))}
      </CollapsibleSection>

      {/* Due Today */}
      <CollapsibleSection
        title="Due Today"
        count={dueToday.length}
        icon={Clock}
        iconColor="text-amber-400"
      >
        {dueToday.map((item) => (
          <ReviewCard
            key={item.problem_id}
            item={item}
            onSkip={handleSkip}
            onMarkReviewed={handleMarkReviewed}
            isSkipping={skippingId === item.problem_id}
            isMarkingReviewed={markingReviewedId === item.problem_id}
          />
        ))}
      </CollapsibleSection>

      {/* Coming Up Section - Separate from Due for Review */}
      {(dueSoon.length > 0 || dueLater.length > 0) && (
        <div className="mt-6 border-t border-white/10 pt-6">
          <div className="mb-4 flex items-center gap-3">
            <h3 className="text-lg font-medium text-white">Coming Up</h3>
            <span className="text-sm text-gray-500">{totalUpcoming} scheduled</span>
          </div>

          {/* Due Soon (Within 7 days) */}
          <CollapsibleSection
            title="Next 7 Days"
            count={dueSoon.length}
            icon={Calendar}
            iconColor="text-blue-400"
            defaultExpanded={isUpcomingExpanded}
          >
            {dueSoon.map((item) => (
              <ReviewCard key={item.problem_id} item={item} showUpcomingDate isUpcoming />
            ))}
          </CollapsibleSection>

          {/* All Scheduled (Everything including 1 year out) */}
          {dueLater.length > 0 && (
            <div className="mt-2">
              <button
                onClick={() => setShowAllScheduled(!showAllScheduled)}
                className="mb-2 flex w-full items-center gap-2 text-xs font-medium tracking-wider uppercase transition-colors hover:text-gray-300"
              >
                {showAllScheduled ? (
                  <ChevronDown className="h-3 w-3 text-gray-500" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-gray-500" />
                )}
                <Archive className="h-3 w-3 text-gray-500" />
                <span className="text-gray-400">Later</span>
                <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                  {dueLater.length}
                </span>
                <span className="ml-1 text-[10px] font-normal text-gray-600 normal-case">
                  Beyond 7 days
                </span>
                <span className="flex-1" />
              </button>

              {showAllScheduled && (
                <div className="divide-y divide-white/5">
                  {dueLater.map((item) => (
                    <ReviewCard key={item.problem_id} item={item} showUpcomingDate isUpcoming />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {allDue.length === 0 && dueSoon.length === 0 && dueLater.length === 0 && (
        <div className="rounded-lg border border-white/5 bg-white/5 p-8 text-center">
          <Calendar className="mx-auto mb-3 h-8 w-8 text-gray-600" />
          <p className="text-sm text-gray-400">No problems scheduled for review</p>
          <p className="mt-1 text-xs text-gray-600">
            Complete some practice sessions to build your review queue
          </p>
        </div>
      )}
    </div>
  )
}
