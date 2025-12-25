"use client";

import { useState } from "react";
import Link from "next/link";
import { BarChart3, ChevronRight, TrendingDown, Award } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PatternStats {
  pattern: string;
  total: number;
  mastered: number;
  reviewing?: number;
  learning?: number;
  new_count?: number;
  average_score: number;
  mastery_percentage: number;
  weakest_problem_id?: string;
  weakest_problem_title?: string;
}

interface PatternMasteryProps {
  patterns: PatternStats[];
  isLoading?: boolean;
}

function formatPattern(pattern: string): string {
  return pattern
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getMasteryColor(percentage: number): string {
  if (percentage >= 80) return "from-green-500 to-emerald-400";
  if (percentage >= 60) return "from-yellow-500 to-amber-400";
  if (percentage >= 40) return "from-orange-500 to-orange-400";
  return "from-red-500 to-red-400";
}

function getMasteryBadge(percentage: number): { label: string; color: string } {
  if (percentage >= 80) return { label: "Strong", color: "text-green-400 bg-green-500/10" };
  if (percentage >= 60) return { label: "Good", color: "text-yellow-400 bg-yellow-500/10" };
  if (percentage >= 40) return { label: "Developing", color: "text-orange-400 bg-orange-500/10" };
  return { label: "Needs Work", color: "text-red-400 bg-red-500/10" };
}

function PatternCard({ pattern }: { pattern: PatternStats }) {
  const badge = getMasteryBadge(pattern.mastery_percentage);
  const colorGradient = getMasteryColor(pattern.mastery_percentage);

  return (
    <div className="p-4 rounded-lg border border-white/10 hover:border-accent/30 transition-all bg-white/5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-medium text-white">{formatPattern(pattern.pattern)}</h4>
          <div className="flex items-center gap-2 mt-1">
            <span className={`px-2 py-0.5 rounded-full text-xs ${badge.color}`}>
              {badge.label}
            </span>
            <span className="text-xs text-gray-500">
              {pattern.mastered}/{pattern.total} mastered
            </span>
          </div>
        </div>
        <span className="text-2xl font-bold text-white">
          {pattern.mastery_percentage}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${colorGradient} transition-all duration-500`}
          style={{ width: `${pattern.mastery_percentage}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400">
          Avg Score: <span className="text-white">{pattern.average_score}%</span>
        </span>
        {pattern.weakest_problem_id && (
          <Link
            href={`/interview?scenario=${pattern.weakest_problem_id}`}
            className="flex items-center gap-1 text-accent hover:underline"
          >
            <TrendingDown className="h-3 w-3" />
            <span>Practice weak area</span>
          </Link>
        )}
      </div>
    </div>
  );
}

export function PatternMastery({ patterns, isLoading = false }: PatternMasteryProps) {
  const [showAll, setShowAll] = useState(false);

  if (isLoading) {
    return (
      <div className="glass-card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-white/10 rounded w-48" />
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-white/5 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (patterns.length === 0) {
    return (
      <div className="glass-card p-6 text-center">
        <Award className="h-12 w-12 text-gray-500 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-white mb-1">No patterns yet</h3>
        <p className="text-gray-400">
          Start practicing problems to see your pattern mastery progress.
        </p>
      </div>
    );
  }

  // Sort by mastery percentage (lowest first to show weak areas)
  const sortedPatterns = [...patterns].sort(
    (a, b) => a.mastery_percentage - b.mastery_percentage
  );

  const displayPatterns = showAll ? sortedPatterns : sortedPatterns.slice(0, 6);

  // Calculate overall mastery
  const overallMastery =
    patterns.length > 0
      ? Math.round(
          patterns.reduce((sum, p) => sum + p.mastery_percentage, 0) /
            patterns.length
        )
      : 0;

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-5 w-5 text-accent" />
          <h3 className="text-lg font-medium text-white">Pattern Mastery</h3>
        </div>
        <div className="text-right">
          <span className="text-sm text-gray-400">Overall</span>
          <div className="text-2xl font-bold text-accent">{overallMastery}%</div>
        </div>
      </div>

      {/* Weak areas callout */}
      {sortedPatterns.length > 0 && sortedPatterns[0].mastery_percentage < 50 && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <TrendingDown className="h-4 w-4 text-yellow-400" />
          <span className="text-yellow-400 text-sm">
            Focus on <strong>{formatPattern(sortedPatterns[0].pattern)}</strong> -
            your weakest pattern at {sortedPatterns[0].mastery_percentage}% mastery
          </span>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {displayPatterns.map((pattern) => (
          <PatternCard key={pattern.pattern} pattern={pattern} />
        ))}
      </div>

      {patterns.length > 6 && (
        <div className="mt-4 text-center">
          <Button
            variant="ghost"
            onClick={() => setShowAll(!showAll)}
            className="text-accent hover:text-accent/80"
          >
            {showAll ? "Show Less" : `Show All ${patterns.length} Patterns`}
            <ChevronRight
              className={`h-4 w-4 ml-1 transition-transform ${
                showAll ? "rotate-90" : ""
              }`}
            />
          </Button>
        </div>
      )}
    </div>
  );
}
