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
} from "lucide-react";
import { Button } from "@/components/ui/button";

export type Priority = "critical" | "high" | "medium" | "low";
export type MasteryLevel = "new" | "learning" | "reviewing" | "mastered";

export interface DueItem {
  problem_id: string;
  scenario_id: string;
  title: string;
  pattern: string;
  difficulty: "easy" | "medium" | "hard";
  last_score: number;
  days_overdue: number;
  days_until_review: number; // Days until next review (negative if overdue)
  next_review_at: string; // ISO date string
  priority: Priority;
  priority_score: number;
  estimated_minutes: number;
  mastery_level: MasteryLevel;
  retention_estimate: number;
}

interface DueForReviewProps {
  dueNow: DueItem[];
  dueToday: DueItem[];
  upcoming: DueItem[];
  totalDue: number;
  overdueCount: number;
  onSkip?: (problemId: string) => Promise<void>;
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
 * Get SM-2 based reasoning for why review is scheduled at this time.
 * Based on Ebbinghaus forgetting curve and spaced repetition science.
 * Returns both a short reason and an educational tooltip.
 */
function getReviewReason(item: DueItem): { short: string; tooltip: string } {
  const daysUntil = item.days_until_review;
  const retention = item.retention_estimate;
  const interval = Math.abs(daysUntil);

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
        tooltip: `New memories need frequent reinforcement. SM-2 algorithm starts with 1-day intervals, then 3 days, then expands based on performance.`
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
        tooltip: `Your ~${Math.round(retention)}% retention shows solid recall. The algorithm extended your interval to ${interval} days to maximize efficiency.`
      };
    }
    return {
      short: "Optimal spacing for retention",
      tooltip: `Reviewing at ${interval}-day intervals balances efficiency with retention. Too soon wastes time; too late risks forgetting.`
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
      tooltip: `Complex problems require more repetitions to reach automaticity. The algorithm adjusts intervals based on problem difficulty.`
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
      timing: `Review in ${daysUntil} days`,
      context: `Interval based on SM-2 algorithm`
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
 * Info icon with tooltip for showing science behind spaced repetition
 */
function InfoTooltip({ text }: { text: string }) {
  return (
    <span
      className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-700/50 text-gray-400 text-[10px] cursor-help ml-1"
      title={text}
    >
      ?
    </span>
  );
}

function DueItemRow({
  item,
  onSkip,
  isSkipping,
  showOverdue = false,
  showUpcomingDate = false,
}: {
  item: DueItem;
  onSkip?: (problemId: string) => Promise<void>;
  isSkipping?: boolean;
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
                className="text-xs text-blue-400 flex items-center gap-1 bg-blue-500/10 px-2 py-0.5 rounded-full"
                title={nextReview.context}
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
          >
            <SkipForward className="h-4 w-4" />
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
  upcoming,
  totalDue,
  overdueCount,
  onSkip,
  isLoading = false,
}: DueForReviewProps) {
  const [isUpcomingExpanded, setIsUpcomingExpanded] = useState(false);
  const [skippingId, setSkippingId] = useState<string | null>(null);

  const handleSkip = async (problemId: string) => {
    if (!onSkip) return;
    setSkippingId(problemId);
    try {
      await onSkip(problemId);
    } finally {
      setSkippingId(null);
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

  const allDue = [...dueNow, ...dueToday];

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
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-medium text-white">Due for Review</h3>
          {totalDue > 0 && (
            <span className="text-sm text-gray-500">{totalDue} problems</span>
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
                isSkipping={skippingId === item.problem_id}
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
                isSkipping={skippingId === item.problem_id}
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
            <span>Upcoming ({upcoming.length})</span>
            <span
              className="text-gray-600 font-normal normal-case ml-1"
              title="Spaced repetition schedules reviews at optimal intervals based on your performance and the forgetting curve"
            >
              — next 7 days
            </span>
            <span className="flex-1" />
            {isUpcomingExpanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>
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
