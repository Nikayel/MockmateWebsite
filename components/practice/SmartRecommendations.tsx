"use client";

import Link from "next/link";
import {
  Lightbulb,
  PlayCircle,
  Building2,
  Target,
  TrendingUp,
  RefreshCw,
  BookOpen,
  Sparkles,
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

const typeIcons: Record<RecommendationType, typeof Target> = {
  review: RefreshCw,
  practice_weakness: Target,
  similar_to_failed: TrendingUp,
  company_relevant: Building2,
  next_in_roadmap: BookOpen,
  strengthen_pattern: Sparkles,
};

const typeLabels: Record<RecommendationType, string> = {
  review: "Review",
  practice_weakness: "Weakness",
  similar_to_failed: "Similar Practice",
  company_relevant: "Company Prep",
  next_in_roadmap: "Roadmap",
  strengthen_pattern: "Strengthen",
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

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const Icon = typeIcons[rec.type];

  return (
    <div className="p-4 rounded-lg border border-white/10 hover:border-accent/30 transition-all bg-white/5 group">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-accent/10 text-accent group-hover:bg-accent/20 transition-colors">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-accent bg-accent/10 px-2 py-0.5 rounded-full">
              {typeLabels[rec.type]}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${difficultyColors[rec.difficulty]}`}>
              {rec.difficulty.charAt(0).toUpperCase() + rec.difficulty.slice(1)}
            </span>
          </div>
          <h4 className="font-medium text-white truncate">{rec.title}</h4>
          <p className="text-sm text-gray-400 mt-1">{rec.reason}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            <span>{formatPattern(rec.pattern)}</span>
            <span>~{rec.estimated_minutes}min</span>
            {rec.companies && rec.companies.length > 0 && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                {rec.companies.slice(0, 2).join(", ")}
              </span>
            )}
          </div>
        </div>
        <Link href={`/interview?scenario=${rec.scenario_id}`}>
          <Button
            size="sm"
            variant="ghost"
            className="text-accent hover:bg-accent/10 hover:text-accent"
          >
            <PlayCircle className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
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

  if (recommendations.length === 0) {
    return (
      <div className="glass-card p-6 text-center">
        <Lightbulb className="h-12 w-12 text-gray-500 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-white mb-1">
          No recommendations yet
        </h3>
        <p className="text-gray-400">
          Complete some problems to get personalized recommendations.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Lightbulb className="h-5 w-5 text-accent" />
          <h3 className="text-lg font-medium text-white">Recommended Next</h3>
        </div>
        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="text-gray-400 hover:text-white"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </Button>
        )}
      </div>

      <p className="text-sm text-gray-400 mb-4">
        Based on your weak areas, company targets, and learning progress
      </p>

      <div className="space-y-3">
        {recommendations.map((rec, index) => (
          <RecommendationCard key={`${rec.scenario_id}-${index}`} rec={rec} />
        ))}
      </div>
    </div>
  );
}
