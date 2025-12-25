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
 */
function getReviewReason(item: DueItem): string {
  const daysUntil = item.days_until_review;
  const retention = item.retention_estimate;

  // Overdue items
  if (daysUntil < 0) {
    if (retention < 50) {
      return "Memory fading quickly";
    }
    return "Review to strengthen memory";
  }

  // Based on mastery level and retention
  if (item.mastery_level === "new" || item.mastery_level === "learning") {
    if (daysUntil <= 1) {
      return "Early stage: short intervals build foundation";
    }
    if (daysUntil <= 3) {
      return "Building neural pathways";
    }
  }

  if (item.mastery_level === "reviewing") {
    if (retention >= 80) {
      return "Retention high, extending interval";
    }
    return "Optimal spacing for long-term memory";
  }

  if (item.mastery_level === "mastered") {
    return "Maintenance review to prevent decay";
  }

  // Default based on difficulty
  if (item.difficulty === "hard") {
    return "Harder problems need more practice";
  }

  return "Spaced review for optimal retention";
}

function formatReviewDate(item: DueItem): string {
  const daysUntil = item.days_until_review;
  if (daysUntil < 0) {
    return `${Math.abs(daysUntil)}d overdue`;
  }
  if (daysUntil === 0) {
    return "Today";
  }
  if (daysUntil === 1) {
    return "Tomorrow";
  }
  if (daysUntil <= 7) {
    return `in ${daysUntil} days`;
  }
  // Format as date for items more than a week away
  const date = new Date(item.next_review_at);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
  return (
    <div className="group flex items-center justify-between py-3 px-4 -mx-4 hover:bg-white/[0.02] rounded-lg transition-colors">
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium truncate">{item.title}</span>
            {showOverdue && item.days_overdue > 0 && (
              <span className="text-xs text-rose-400 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {item.days_overdue}d overdue
              </span>
            )}
            {showUpcomingDate && item.days_until_review > 0 && (
              <span className="text-xs text-gray-500 flex items-center gap-1" title={getReviewReason(item)}>
                <Clock className="h-3 w-3" />
                {formatReviewDate(item)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm">
            <span className={difficultyStyles[item.difficulty]}>
              {item.difficulty}
            </span>
            <span className="text-gray-500">{formatPattern(item.pattern)}</span>
            <span className="text-gray-600">{item.estimated_minutes}m</span>
            {showUpcomingDate && (
              <span className="text-gray-600 italic">· {getReviewReason(item)}</span>
            )}
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
            className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 hover:text-gray-400 transition-colors"
          >
            <span>Upcoming ({upcoming.length})</span>
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
