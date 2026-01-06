"use client";

import { Check } from "lucide-react";
import { useSpacedRepetition } from "@/lib/hooks";
import { ReviewSections } from "./ReviewSections";
import type {
  DueItem,
  Priority,
  MasteryLevel,
  Algorithm,
} from "@/lib/hooks/useSpacedRepetition";

// Re-export types for backward compatibility
export type { DueItem, Priority, MasteryLevel, Algorithm };

interface DueForReviewProps {
  dueNow: DueItem[];
  dueToday: DueItem[];
  dueInMinutes?: DueItem[]; // FSRS learning steps - due within the hour
  upcoming: DueItem[];
  totalDue: number;
  overdueCount: number;
  userAlgorithm?: Algorithm; // User's assigned algorithm for transparency
  onSkip?: (problemId: string) => Promise<void>;
  onMarkReviewed?: (problemId: string, scenarioId: string) => Promise<void>;
  isLoading?: boolean;
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
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (allDue.length === 0 && upcoming.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
          <Check className="h-6 w-6 text-emerald-400" />
        </div>
        <h3 className="text-lg font-medium text-white mb-1">All caught up</h3>
        <p className="text-gray-500 text-sm">
          No reviews due. Check back later or practice new problems.
        </p>
      </div>
    );
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
    />
  );
}
