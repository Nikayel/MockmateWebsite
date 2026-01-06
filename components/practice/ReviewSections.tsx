"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Play,
  Zap,
  Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DueItem, Algorithm } from "@/lib/hooks";
import { ReviewCard } from "./ReviewCard";

interface ReviewSectionsProps {
  dueInMinutes: DueItem[];
  dueNow: DueItem[];
  dueToday: DueItem[];
  upcoming: DueItem[];
  allDue: DueItem[];
  overdueCount: number;
  totalDue: number;
  userAlgorithm?: Algorithm;
  isUpcomingExpanded: boolean;
  onToggleUpcoming: () => void;
  onSkip?: (problemId: string) => void;
  onMarkReviewed?: (problemId: string, scenarioId: string) => void;
  skippingId: string | null;
  markingReviewedId: string | null;
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
  onToggleUpcoming,
  onSkip,
  onMarkReviewed,
  skippingId,
  markingReviewedId,
}: ReviewSectionsProps) {
  return (
    <div>
      {/* Header with Algorithm Indicator */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-medium text-white">Due for Review</h3>
          {totalDue > 0 && (
            <span className="text-sm text-gray-500">{totalDue} problems</span>
          )}
          {/* Algorithm transparency indicator */}
          {userAlgorithm && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium cursor-help ${
                userAlgorithm === "fsrs"
                  ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                  : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
              }`}
              title={
                userAlgorithm === "fsrs"
                  ? "FSRS: ML-optimized algorithm with 90% retention target. Uses learning steps (1min → 10min → 1day) for new items."
                  : "SM-2: Classic spaced repetition algorithm. Intervals: 1d → 3d → expanding based on ease factor."
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
          <Link href={`/interview?scenario=${allDue[0].scenario_id}`}>
            <Button size="sm" className="bg-white text-black hover:bg-gray-200">
              <Play className="h-3 w-3 mr-1.5" />
              Start Review
            </Button>
          </Link>
        )}
      </div>

      {/* Overdue warning */}
      {overdueCount > 0 && (
        <div className="flex items-center gap-2 mb-4 py-2 px-3 bg-rose-500/5 border border-rose-500/10 rounded-lg text-rose-400 text-sm">
          <AlertTriangle className="h-4 w-4" />
          <span>{overdueCount} overdue - review soon to maintain retention</span>
        </div>
      )}

      {/* FSRS Learning Steps - Due in Minutes (Critical for FSRS users) */}
      {dueInMinutes.length > 0 && (
        <div className="mb-6">
          <h4 className="text-xs font-medium text-purple-400 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Zap className="h-3 w-3" />
            Learning Steps - Review Now
          </h4>
          <p className="text-xs text-gray-500 mb-3">
            Complete these quick reviews to progress through the learning phase
          </p>
          <div className="divide-y divide-white/5">
            {dueInMinutes.map((item) => (
              <ReviewCard
                key={item.problem_id}
                item={item}
                onSkip={onSkip}
                onMarkReviewed={onMarkReviewed}
                isSkipping={skippingId === item.problem_id}
                isMarkingReviewed={markingReviewedId === item.problem_id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Overdue */}
      {dueNow.length > 0 && (
        <div className="mb-6">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            Overdue
          </h4>
          <div className="divide-y divide-white/5">
            {dueNow.map((item) => (
              <ReviewCard
                key={item.problem_id}
                item={item}
                onSkip={onSkip}
                onMarkReviewed={onMarkReviewed}
                isSkipping={skippingId === item.problem_id}
                isMarkingReviewed={markingReviewedId === item.problem_id}
                showOverdue
              />
            ))}
          </div>
        </div>
      )}

      {/* Due Today */}
      {dueToday.length > 0 && (
        <div className="mb-6">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            Due Today
          </h4>
          <div className="divide-y divide-white/5">
            {dueToday.map((item) => (
              <ReviewCard
                key={item.problem_id}
                item={item}
                onSkip={onSkip}
                onMarkReviewed={onMarkReviewed}
                isSkipping={skippingId === item.problem_id}
                isMarkingReviewed={markingReviewedId === item.problem_id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming - Show exact dates */}
      {upcoming.length > 0 && (
        <div>
          <button
            onClick={onToggleUpcoming}
            className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 hover:text-gray-400 transition-colors w-full"
          >
            <span>
              Coming Up ({upcoming.length})
              {upcoming.length > 0 && (
                <span className="text-gray-400 font-normal normal-case ml-1">
                  · {(() => {
                    // Show date range for upcoming reviews
                    const dates = upcoming.map(item => new Date(item.next_review_at));
                    const earliest = new Date(Math.min(...dates.map(d => d.getTime())));
                    const latest = new Date(Math.max(...dates.map(d => d.getTime())));
                    const formatDate = (d: Date) => d.toLocaleDateString("en-US", { weekday: 'short', month: "short", day: "numeric" });

                    if (earliest.toDateString() === latest.toDateString()) {
                      return formatDate(earliest);
                    }
                    return `${formatDate(earliest)} – ${formatDate(latest)}`;
                  })()}
                </span>
              )}
            </span>
            <span className="flex-1" />
            {isUpcomingExpanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>
          {!isUpcomingExpanded && (
            <p className="text-xs text-gray-600 -mt-1 mb-2">
              Intervals based on your performance — expand for details
            </p>
          )}
          {isUpcomingExpanded && (
            <div className="divide-y divide-white/5">
              {upcoming.map((item) => (
                <ReviewCard
                  key={item.problem_id}
                  item={item}
                  showUpcomingDate
                  isUpcoming
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
