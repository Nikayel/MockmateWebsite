"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, ArrowRight } from "lucide-react";
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
  return pattern.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function getMasteryColor(percentage: number): string {
  if (percentage >= 80) return "bg-emerald-400";
  if (percentage >= 60) return "bg-amber-400";
  if (percentage >= 40) return "bg-orange-400";
  return "bg-rose-400";
}

function getMasteryLabel(pattern: PatternStats): string {
  if (pattern.total === 0) {
    return "No problems yet";
  }
  if (pattern.mastered === pattern.total) {
    return `${pattern.total} mastered`;
  }
  if (pattern.mastered === 0) {
    return `${pattern.total} problem${pattern.total > 1 ? "s" : ""} · 0 mastered`;
  }
  return `${pattern.mastered} of ${pattern.total} mastered`;
}

function PatternRow({ pattern }: { pattern: PatternStats }) {
  const colorClass = getMasteryColor(pattern.mastery_percentage);

  return (
    <div className="group py-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="text-white font-medium">{formatPattern(pattern.pattern)}</span>
          <span className="text-xs text-gray-500">
            {getMasteryLabel(pattern)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">{pattern.mastery_percentage}%</span>
          {pattern.weakest_problem_id && (
            <Link
              href={`/interview?scenario=${pattern.weakest_problem_id}`}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-gray-500 hover:text-white flex items-center gap-1"
            >
              Practice
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>
      <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${colorClass} transition-all duration-500`}
          style={{ width: `${pattern.mastery_percentage}%` }}
        />
      </div>
    </div>
  );
}

export function PatternMastery({ patterns, isLoading = false }: PatternMasteryProps) {
  const [showAll, setShowAll] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (patterns.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Start practicing to see pattern mastery.</p>
      </div>
    );
  }

  // Sort by mastery percentage (lowest first)
  const sortedPatterns = [...patterns].sort(
    (a, b) => a.mastery_percentage - b.mastery_percentage
  );

  const displayPatterns = showAll ? sortedPatterns : sortedPatterns.slice(0, 6);

  // Overall mastery
  const overallMastery = patterns.length > 0
    ? Math.round(patterns.reduce((sum, p) => sum + p.mastery_percentage, 0) / patterns.length)
    : 0;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium text-white">Pattern Mastery</h3>
          <p className="text-sm text-gray-500 mt-1">
            {sortedPatterns.length > 0 && sortedPatterns[0].mastery_percentage < 50 && (
              <>Focus on <span className="text-white">{formatPattern(sortedPatterns[0].pattern)}</span></>
            )}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white">{overallMastery}%</div>
          <p className="text-xs text-gray-500">overall</p>
        </div>
      </div>

      {/* Pattern list */}
      <div className="divide-y divide-white/5">
        {displayPatterns.map((pattern) => (
          <PatternRow key={pattern.pattern} pattern={pattern} />
        ))}
      </div>

      {/* Show more */}
      {patterns.length > 6 && (
        <div className="mt-4">
          <Button
            variant="ghost"
            onClick={() => setShowAll(!showAll)}
            className="text-gray-500 hover:text-gray-300 p-0 h-auto"
          >
            {showAll ? "Show less" : `Show all ${patterns.length} patterns`}
            <ChevronRight className={`h-4 w-4 ml-1 transition-transform ${showAll ? "rotate-90" : ""}`} />
          </Button>
        </div>
      )}
    </div>
  );
}
