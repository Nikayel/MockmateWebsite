"use client";

import { Flame, Target, TrendingUp } from "lucide-react";

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
      <div className="glass-card p-4 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-6 bg-white/10 rounded w-32" />
          <div className="h-6 bg-white/10 rounded w-24" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-4 border border-accent/20">
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Streak Counter */}
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${
              streakDays > 0
                ? "bg-orange-500/20 text-orange-400"
                : "bg-gray-500/20 text-gray-400"
            }`}
          >
            <Flame className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">
                {streakDays}
              </span>
              <span className="text-sm text-gray-400">day streak</span>
            </div>
            {longestStreak > streakDays && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <TrendingUp className="h-3 w-3" />
                <span>Best: {longestStreak} days</span>
              </div>
            )}
          </div>
        </div>

        {/* Daily Goal Progress */}
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${
              isGoalComplete
                ? "bg-green-500/20 text-green-400"
                : "bg-accent/20 text-accent"
            }`}
          >
            <Target className="h-6 w-6" />
          </div>
          <div className="min-w-[120px]">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-sm text-gray-400">Daily Goal</span>
              <span className="text-sm font-medium text-white">
                {dailyProgress}/{dailyGoal}
              </span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isGoalComplete
                    ? "bg-gradient-to-r from-green-500 to-emerald-400"
                    : "bg-gradient-to-r from-accent to-accent/70"
                }`}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Streak at risk warning */}
        {streakDays > 0 && dailyProgress === 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            <Flame className="h-4 w-4" />
            <span>Streak at risk! Practice now to keep it going.</span>
          </div>
        )}
      </div>
    </div>
  );
}
