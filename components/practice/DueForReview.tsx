"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Clock,
  Play,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Check,
  SkipForward,
  Zap,
  Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export type Priority = "critical" | "high" | "medium" | "low";
export type MasteryLevel = "new" | "learning" | "reviewing" | "mastered";
export type Algorithm = "sm2" | "fsrs";

export interface DueItem {
  problem_id: string;
  scenario_id: string;
  title: string;
  pattern: string;
  difficulty: "easy" | "medium" | "hard";
  last_score: number;
  days_overdue: number;
  days_until_review: number; // Days until next review (negative if overdue)
  minutes_until_review?: number; // Minutes until review (for FSRS learning steps)
  next_review_at: string; // ISO date string
  priority: Priority;
  priority_score: number;
  estimated_minutes: number;
  mastery_level: MasteryLevel;
  retention_estimate: number;
  algorithm?: Algorithm; // User's assigned algorithm
  fsrs_state?: "new" | "learning" | "review" | "relearning"; // FSRS-specific state
}

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

const difficultyStyles = {
  easy: "text-emerald-400",
  medium: "text-amber-400",
  hard: "text-rose-400",
};

function formatPattern(pattern: string): string {
  return pattern.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

/**
 * Get algorithm-aware reasoning for why review is scheduled at this time.
 * Adapts messaging based on SM-2 vs FSRS algorithm.
 * Returns both a short reason and an educational tooltip.
 */
function getReviewReason(item: DueItem): { short: string; tooltip: string } {
  const daysUntil = item.days_until_review;
  const minutesUntil = item.minutes_until_review;
  const retention = item.retention_estimate;
  const interval = Math.abs(daysUntil);
  const isFSRS = item.algorithm === "fsrs";
  const algorithmName = isFSRS ? "FSRS" : "SM-2";

  // FSRS learning phase - due in minutes
  if (isFSRS && minutesUntil !== undefined && minutesUntil <= 60 && minutesUntil > 0) {
    if (minutesUntil <= 1) {
      return {
        short: "Learning step — review now!",
        tooltip: `FSRS uses graduated learning steps (1min → 10min → 1day). Complete this step to progress. Missing it resets progress.`
      };
    }
    if (minutesUntil <= 10) {
      return {
        short: `Learning step — ${minutesUntil}min`,
        tooltip: `FSRS learning phase uses short intervals to establish initial memory. Review within ${minutesUntil} minutes for best results.`
      };
    }
    return {
      short: `Due in ${minutesUntil}min`,
      tooltip: `You're in the learning phase. FSRS schedules quick reviews to build memory before moving to longer intervals.`
    };
  }

  // FSRS relearning phase
  if (isFSRS && item.fsrs_state === "relearning") {
    return {
      short: "Relearning — needs reinforcement",
      tooltip: `You struggled with this last time. FSRS has moved it to relearning phase with shorter intervals until you demonstrate recall.`
    };
  }

  // Overdue items
  if (daysUntil < 0) {
    if (retention < 50) {
      return {
        short: "Memory fading — review now",
        tooltip: `Your retention dropped to ~${Math.round(retention)}%. The forgetting curve shows memory decays exponentially without review.`
      };
    }
    return {
      short: "Due for review",
      tooltip: `Reviewing now strengthens the memory trace. Each review extends how long you'll remember.`
    };
  }

  // Based on mastery level and retention
  if (item.mastery_level === "new" || item.mastery_level === "learning") {
    if (daysUntil <= 1) {
      return {
        short: "Short interval — building foundation",
        tooltip: isFSRS
          ? `FSRS uses ML-optimized intervals. After passing learning steps, you get a 1-day review to confirm retention.`
          : `New memories need frequent reinforcement. SM-2 starts with 1-day intervals, then 3 days, then expands based on performance.`
      };
    }
    if (daysUntil <= 3) {
      return {
        short: "Strengthening neural pathways",
        tooltip: `Spaced practice creates stronger synaptic connections. Your ${interval}-day interval is optimal for consolidating this pattern.`
      };
    }
    return {
      short: "Learning phase — regular review",
      tooltip: `You're in the learning phase. Consistent review at ${interval}-day intervals builds lasting memory.`
    };
  }

  if (item.mastery_level === "reviewing") {
    if (retention >= 80) {
      return {
        short: "Retention strong — interval extended",
        tooltip: `Your ~${Math.round(retention)}% retention shows solid recall. ${algorithmName} extended your interval to ${interval} days to maximize efficiency.`
      };
    }
    return {
      short: "Optimal spacing for retention",
      tooltip: isFSRS
        ? `FSRS calculates intervals to maintain 90% target retention. Your ${interval}-day interval balances efficiency with memory strength.`
        : `Reviewing at ${interval}-day intervals balances efficiency with retention. Too soon wastes time; too late risks forgetting.`
    };
  }

  if (item.mastery_level === "mastered") {
    return {
      short: "Maintenance review",
      tooltip: `Even mastered material needs occasional review to prevent decay. Your ${interval}-day interval maintains long-term retention with minimal effort.`
    };
  }

  // Default based on difficulty
  if (item.difficulty === "hard") {
    return {
      short: "Harder problems need more practice",
      tooltip: `Complex problems require more repetitions to reach automaticity. ${algorithmName} adjusts intervals based on problem difficulty.`
    };
  }

  return {
    short: "Spaced review for retention",
    tooltip: `Spaced repetition is proven to be 2-3x more effective than massed practice. Your next review is optimally timed.`
  };
}

/**
 * Format the next review timing with context
 */
function getNextReviewDisplay(item: DueItem): { timing: string; context: string } {
  const daysUntil = item.days_until_review;

  if (daysUntil < 0) {
    const daysOverdue = Math.abs(daysUntil);
    return {
      timing: daysOverdue === 1 ? "1 day overdue" : `${daysOverdue} days overdue`,
      context: "Review soon to maintain progress"
    };
  }

  if (daysUntil === 0) {
    return { timing: "Due today", context: "Review to maintain streak" };
  }

  if (daysUntil === 1) {
    return { timing: "Review tomorrow", context: "Based on your performance" };
  }

  if (daysUntil <= 7) {
    return {
      timing: `In ${daysUntil} day${daysUntil === 1 ? '' : 's'}`,
      context: `${daysUntil}-day interval from last review`
    };
  }

  if (daysUntil <= 30) {
    return {
      timing: `Review in ${daysUntil} days`,
      context: "Extended interval — you're progressing well"
    };
  }

  // Format as date for items more than a month away
  const date = new Date(item.next_review_at);
  return {
    timing: `Review ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
    context: "Mastery maintenance interval"
  };
}

/**
 * Info icon with proper hover tooltip for showing science behind spaced repetition
 */
function InfoTooltip({ text }: { text: string }) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onClick={() => setIsVisible(!isVisible)}
    >
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-700/50 text-gray-400 text-[10px] cursor-help ml-1 hover:bg-gray-600/50 hover:text-gray-300 transition-colors">
        ?
      </span>
      {isVisible && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-800 border border-gray-700 rounded-lg shadow-xl text-xs text-gray-300 leading-relaxed z-50">
          <span className="block font-medium text-white mb-1">Why this interval?</span>
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-700" />
        </span>
      )}
    </span>
  );
}

function DueItemRow({
  item,
  onSkip,
  onMarkReviewed,
  isSkipping,
  isMarkingReviewed,
  showOverdue = false,
  showUpcomingDate = false,
}: {
  item: DueItem;
  onSkip?: (problemId: string) => Promise<void>;
  onMarkReviewed?: (problemId: string, scenarioId: string) => Promise<void>;
  isSkipping?: boolean;
  isMarkingReviewed?: boolean;
  showOverdue?: boolean;
  showUpcomingDate?: boolean;
}) {
  const reviewReason = getReviewReason(item);
  const nextReview = getNextReviewDisplay(item);

  return (
    <div className="group flex items-center justify-between py-3 px-4 -mx-4 hover:bg-white/[0.02] rounded-lg transition-colors">
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-medium truncate">{item.title}</span>
            {showOverdue && item.days_overdue > 0 && (
              <span className="text-xs text-rose-400 flex items-center gap-1 bg-rose-500/10 px-2 py-0.5 rounded-full">
                <AlertTriangle className="h-3 w-3" />
                {item.days_overdue}d overdue
              </span>
            )}
            {showUpcomingDate && item.days_until_review > 0 && (
              <span
                className="text-xs text-blue-400 flex items-center gap-1 bg-blue-500/10 px-2 py-0.5 rounded-full cursor-help"
                title={`Scheduled for review in ${item.days_until_review} day${item.days_until_review === 1 ? '' : 's'} based on your last score of ${item.last_score}%`}
              >
                <Clock className="h-3 w-3" />
                {nextReview.timing}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-sm flex-wrap">
            <span className={difficultyStyles[item.difficulty]}>
              {item.difficulty}
            </span>
            <span className="text-gray-500">{formatPattern(item.pattern)}</span>
            <span className="text-gray-600">{item.estimated_minutes}m</span>
            {item.last_score > 0 && (
              <span className={`${item.last_score >= 70 ? 'text-emerald-500' : item.last_score >= 50 ? 'text-amber-500' : 'text-rose-400'}`}>
                Last: {item.last_score}%
              </span>
            )}
            {/* Show review reason with science tooltip */}
            <span className="text-gray-500 flex items-center">
              <span className="text-gray-600">·</span>
              <span className="ml-2 text-gray-400 italic">{reviewReason.short}</span>
              <InfoTooltip text={reviewReason.tooltip} />
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {onSkip && (
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-gray-300 h-8 w-8 p-0"
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
            className="text-emerald-500 hover:text-emerald-400 h-8 px-2"
            onClick={() => onMarkReviewed(item.problem_id, item.scenario_id)}
            disabled={isMarkingReviewed}
            title="Mark as reviewed (practiced elsewhere)"
          >
            <Check className="h-4 w-4 mr-1" />
            Done
          </Button>
        )}
        <Link href={`/interview?scenario=${item.scenario_id}`}>
          <Button size="sm" className="h-8 bg-white text-black hover:bg-gray-200">
            <Play className="h-3 w-3 mr-1" />
            Start
          </Button>
        </Link>
      </div>
    </div>
  );
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
  const [isUpcomingExpanded, setIsUpcomingExpanded] = useState(false);
  const [skippingId, setSkippingId] = useState<string | null>(null);
  const [markingReviewedId, setMarkingReviewedId] = useState<string | null>(null);

  const handleSkip = async (problemId: string) => {
    if (!onSkip) return;
    setSkippingId(problemId);
    try {
      await onSkip(problemId);
    } finally {
      setSkippingId(null);
    }
  };

  const handleMarkReviewed = async (problemId: string, scenarioId: string) => {
    if (!onMarkReviewed) return;
    setMarkingReviewedId(problemId);
    try {
      await onMarkReviewed(problemId, scenarioId);
    } finally {
      setMarkingReviewedId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  const allDue = [...dueInMinutes, ...dueNow, ...dueToday];

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
              <DueItemRow
                key={item.problem_id}
                item={item}
                onSkip={onSkip ? handleSkip : undefined}
                onMarkReviewed={onMarkReviewed ? handleMarkReviewed : undefined}
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
              <DueItemRow
                key={item.problem_id}
                item={item}
                onSkip={onSkip ? handleSkip : undefined}
                onMarkReviewed={onMarkReviewed ? handleMarkReviewed : undefined}
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
              <DueItemRow
                key={item.problem_id}
                item={item}
                onSkip={onSkip ? handleSkip : undefined}
                onMarkReviewed={onMarkReviewed ? handleMarkReviewed : undefined}
                isSkipping={skippingId === item.problem_id}
                isMarkingReviewed={markingReviewedId === item.problem_id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div>
          <button
            onClick={() => setIsUpcomingExpanded(!isUpcomingExpanded)}
            className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 hover:text-gray-400 transition-colors w-full"
          >
            <span>Scheduled Soon ({upcoming.length})</span>
            <span className="flex-1" />
            {isUpcomingExpanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>
          {!isUpcomingExpanded && (
            <p className="text-xs text-gray-600 -mt-1 mb-2">
              Each problem has its own interval based on your performance
            </p>
          )}
          {isUpcomingExpanded && (
            <div className="divide-y divide-white/5">
              {upcoming.map((item) => (
                <DueItemRow key={item.problem_id} item={item} showUpcomingDate />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
