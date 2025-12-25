"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Clock,
  PlayCircle,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  Timer,
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

const priorityColors: Record<Priority, { bg: string; text: string; dot: string }> = {
  critical: {
    bg: "bg-red-500/10 border-red-500/30",
    text: "text-red-400",
    dot: "bg-red-500",
  },
  high: {
    bg: "bg-orange-500/10 border-orange-500/30",
    text: "text-orange-400",
    dot: "bg-orange-500",
  },
  medium: {
    bg: "bg-yellow-500/10 border-yellow-500/30",
    text: "text-yellow-400",
    dot: "bg-yellow-500",
  },
  low: {
    bg: "bg-green-500/10 border-green-500/30",
    text: "text-green-400",
    dot: "bg-green-500",
  },
};

const difficultyColors = {
  easy: "text-green-400 bg-green-500/10",
  medium: "text-yellow-400 bg-yellow-500/10",
  hard: "text-red-400 bg-red-500/10",
};

function formatPattern(pattern: string): string {
  return pattern
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function DueItemCard({
  item,
  onSkip,
  isSkipping,
}: {
  item: DueItem;
  onSkip?: (problemId: string) => Promise<void>;
  isSkipping?: boolean;
}) {
  const priorityStyle = priorityColors[item.priority];

  return (
    <div
      className={`p-4 rounded-lg border transition-all hover:border-accent/40 ${priorityStyle.bg}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-2 h-2 rounded-full ${priorityStyle.dot}`} />
            <h4 className="font-medium text-white">{item.title}</h4>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span
              className={`px-2 py-0.5 rounded-full ${
                difficultyColors[item.difficulty]
              }`}
            >
              {item.difficulty.charAt(0).toUpperCase() + item.difficulty.slice(1)}
            </span>
            <span className="text-gray-400">{formatPattern(item.pattern)}</span>
            <span className="text-gray-500 flex items-center gap-1">
              <Timer className="h-3 w-3" />
              {item.estimated_minutes}m
            </span>
          </div>
          {item.days_overdue > 0 && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${priorityStyle.text}`}>
              <AlertCircle className="h-3 w-3" />
              <span>{item.days_overdue} days overdue</span>
            </div>
          )}
          {item.last_score > 0 && (
            <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
              <span>Last score: {item.last_score}%</span>
              <span className="mx-1">•</span>
              <span>Retention: {item.retention_estimate}%</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onSkip && (
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white"
              onClick={() => onSkip(item.problem_id)}
              disabled={isSkipping}
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          )}
          <Link href={`/interview?scenario=${item.scenario_id}`}>
            <Button
              size="sm"
              className="bg-accent hover:bg-accent/80 text-black"
            >
              <PlayCircle className="h-4 w-4 mr-1" />
              Review
            </Button>
          </Link>
        </div>
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
      <div className="glass-card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-white/10 rounded w-48" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-white/5 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const allDue = [...dueNow, ...dueToday];

  if (allDue.length === 0 && upcoming.length === 0) {
    return (
      <div className="glass-card p-6 text-center">
        <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-white mb-1">All caught up!</h3>
        <p className="text-gray-400">
          No problems due for review. Check back tomorrow or practice new
          problems.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-accent" />
          <h3 className="text-lg font-medium text-white">Due for Review</h3>
          {totalDue > 0 && (
            <span className="px-2 py-0.5 bg-accent/20 text-accent text-sm rounded-full">
              {totalDue}
            </span>
          )}
        </div>
        {allDue.length > 0 && (
          <Link href={`/interview?scenario=${allDue[0].scenario_id}`}>
            <Button className="bg-accent hover:bg-accent/80 text-black">
              <PlayCircle className="h-4 w-4 mr-2" />
              Start Review
            </Button>
          </Link>
        )}
      </div>

      {overdueCount > 0 && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <span className="text-red-400 text-sm">
            {overdueCount} problem{overdueCount !== 1 ? "s" : ""} overdue - review
            soon to maintain retention!
          </span>
        </div>
      )}

      {/* Due Now (Overdue) */}
      {dueNow.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">
            Overdue
          </h4>
          <div className="space-y-3">
            {dueNow.map((item) => (
              <DueItemCard
                key={item.problem_id}
                item={item}
                onSkip={onSkip ? handleSkip : undefined}
                isSkipping={skippingId === item.problem_id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Due Today */}
      {dueToday.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">
            Due Today
          </h4>
          <div className="space-y-3">
            {dueToday.map((item) => (
              <DueItemCard
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
            className="flex items-center gap-2 text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider hover:text-white transition-colors"
          >
            <span>Upcoming ({upcoming.length})</span>
            {isUpcomingExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {isUpcomingExpanded && (
            <div className="space-y-3">
              {upcoming.map((item) => (
                <DueItemCard key={item.problem_id} item={item} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
