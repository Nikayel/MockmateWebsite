"use client";

import { Flame, Target } from "lucide-react";

interface StreakBannerProps {
  streakDays: number;
  dailyGoal: number;
  dailyProgress: number;
  longestStreak?: number;
  isLoading?: boolean;
}

export function StreakBanner({
  streakDays,
  dailyGoal,
  dailyProgress,
  longestStreak = 0,
  isLoading = false,
}: StreakBannerProps) {
  const progressPercentage = Math.min((dailyProgress / dailyGoal) * 100, 100);
  const isGoalComplete = dailyProgress >= dailyGoal;

  if (isLoading) {
    return (
      <div className="flex items-center justify-between py-4 animate-pulse">
        <div className="h-8 bg-foreground/5 rounded w-24" />
        <div className="h-8 bg-foreground/5 rounded w-32" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between flex-wrap gap-4">
      {/* Streak */}
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${streakDays > 0 ? "bg-orange-500/10" : "bg-muted"}`}>
          <Flame className={`h-5 w-5 ${streakDays > 0 ? "text-orange-400" : "text-muted-foreground"}`} />
        </div>
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-foreground">{streakDays}</span>
            <span className="text-sm text-muted-foreground">day streak</span>
          </div>
          {longestStreak > streakDays && (
            <p className="text-xs text-muted-foreground">Best: {longestStreak} days</p>
          )}
        </div>
      </div>

      {/* Daily Goal */}
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${isGoalComplete ? "bg-emerald-500/10" : "bg-muted"}`}>
          <Target className={`h-5 w-5 ${isGoalComplete ? "text-emerald-400" : "text-muted-foreground"}`} />
        </div>
        <div className="min-w-[100px]">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-sm text-muted-foreground">Today</span>
            <span className="text-sm font-medium text-foreground">{dailyProgress}/{dailyGoal}</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isGoalComplete ? "bg-emerald-400" : "bg-card"
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Streak at risk */}
      {streakDays > 0 && dailyProgress === 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/5 border border-amber-500/10 rounded-lg text-amber-400 text-sm">
          <Flame className="h-4 w-4" />
          <span>Practice now to keep your streak</span>
        </div>
      )}
    </div>
  );
}
