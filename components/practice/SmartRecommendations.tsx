"use client";

import Link from "next/link";
import {
  Play,
  RefreshCw,
  Target,
  TrendingUp,
  Building2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type RecommendationType =
  | "review"
  | "practice_weakness"
  | "similar_to_failed"
  | "company_relevant"
  | "next_in_roadmap"
  | "strengthen_pattern";

interface Recommendation {
  type: RecommendationType;
  scenario_id: string;
  title: string;
  pattern: string;
  difficulty: "easy" | "medium" | "hard";
  reason: string;
  priority: number;
  estimated_minutes: number;
  companies?: string[];
}

interface SmartRecommendationsProps {
  recommendations: Recommendation[];
  onRefresh?: () => void;
  isLoading?: boolean;
  isRefreshing?: boolean;
}

const typeLabels: Record<RecommendationType, { label: string; color: string }> = {
  review: { label: "Review", color: "text-blue-400" },
  practice_weakness: { label: "Weak Area", color: "text-amber-400" },
  similar_to_failed: { label: "Practice", color: "text-purple-400" },
  company_relevant: { label: "Company", color: "text-emerald-400" },
  next_in_roadmap: { label: "Roadmap", color: "text-cyan-400" },
  strengthen_pattern: { label: "Pattern", color: "text-rose-400" },
};

const difficultyStyles = {
  easy: "text-emerald-400",
  medium: "text-amber-400",
  hard: "text-rose-400",
};

function formatPattern(pattern: string): string {
  return pattern.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function RecommendationRow({ rec }: { rec: Recommendation }) {
  const typeInfo = typeLabels[rec.type];

  return (
    <Link
      href={`/interview?scenario=${rec.scenario_id}`}
      className="group flex items-center justify-between py-3 px-4 -mx-4 hover:bg-white/[0.02] rounded-lg transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs font-medium ${typeInfo.color}`}>
            {typeInfo.label}
          </span>
          <span className="text-gray-600">·</span>
          <span className={`text-xs ${difficultyStyles[rec.difficulty]}`}>
            {rec.difficulty}
          </span>
        </div>
        <div className="text-white font-medium truncate">{rec.title}</div>
        <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
          <span>{formatPattern(rec.pattern)}</span>
          <span>·</span>
          <span>{rec.estimated_minutes}m</span>
          {rec.companies && rec.companies.length > 0 && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {rec.companies.slice(0, 2).join(", ")}
              </span>
            </>
          )}
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-gray-600 group-hover:text-white transition-colors" />
    </Link>
  );
}

export function SmartRecommendations({
  recommendations,
  onRefresh,
  isLoading = false,
  isRefreshing = false,
}: SmartRecommendationsProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-white/5 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
          <Target className="h-6 w-6 text-gray-500" />
        </div>
        <h3 className="text-lg font-medium text-white mb-1">No recommendations yet</h3>
        <p className="text-gray-500 text-sm">
          Complete some problems to get personalized suggestions.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-white">Recommended</h3>
        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="text-gray-500 hover:text-gray-300 h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        )}
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Based on your progress and weak areas
      </p>

      {/* Recommendations */}
      <div className="divide-y divide-white/5">
        {recommendations.map((rec, index) => (
          <RecommendationRow key={`${rec.scenario_id}-${index}`} rec={rec} />
        ))}
      </div>
    </div>
  );
}
