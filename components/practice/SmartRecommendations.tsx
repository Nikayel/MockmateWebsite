"use client"

import Link from "next/link"
import { Play, RefreshCw, Target, TrendingUp, Building2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatPatternLabel } from "@/lib/pattern-labels"
import { difficultyColorClass } from "@/lib/ui/difficulty-colors"

type RecommendationType =
  | "review"
  | "practice_weakness"
  | "similar_to_failed"
  | "company_relevant"
  | "next_in_roadmap"
  | "strengthen_pattern"

interface Recommendation {
  type: RecommendationType
  scenario_id: string
  title: string
  pattern: string
  difficulty: "easy" | "medium" | "hard"
  reason: string
  priority: number
  estimated_minutes: number
  companies?: string[]
}

interface SmartRecommendationsProps {
  recommendations: Recommendation[]
  onRefresh?: () => void
  isLoading?: boolean
  isRefreshing?: boolean
}

const typeLabels: Record<RecommendationType, { label: string; color: string }> = {
  review: { label: "Review", color: "text-blue-400" },
  practice_weakness: { label: "Weak Area", color: "text-amber-400" },
  similar_to_failed: { label: "Practice", color: "text-purple-400" },
  company_relevant: { label: "Company", color: "text-emerald-400" },
  next_in_roadmap: { label: "Roadmap", color: "text-cyan-400" },
  strengthen_pattern: { label: "Pattern", color: "text-rose-400" },
}


function RecommendationRow({ rec }: { rec: Recommendation }) {
  const typeInfo = typeLabels[rec.type]

  return (
    <Link
      href={`/interview?scenario=${rec.scenario_id}`}
      className="group -mx-4 flex items-center justify-between rounded-lg px-4 py-3 transition-colors hover:bg-card/[0.02]"
    >
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className={`text-xs font-medium ${typeInfo.color}`}>{typeInfo.label}</span>
          <span className="text-muted-foreground">·</span>
          <span className={`text-xs ${difficultyColorClass(rec.difficulty, "text")}`}>{rec.difficulty}</span>
        </div>
        <div className="truncate font-medium text-foreground">{rec.title}</div>
        <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          <span>{formatPatternLabel(rec.pattern)}</span>
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
      <ArrowRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
    </Link>
  )
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
          <div key={i} className="h-20 animate-pulse rounded-lg bg-foreground/5" />
        ))}
      </div>
    )
  }

  if (recommendations.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Target className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="mb-1 text-lg font-medium text-foreground">No recommendations yet</h3>
        <p className="text-sm text-muted-foreground">
          Complete some problems to get personalized suggestions.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-medium text-foreground">Recommended</h3>
        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-muted-foreground"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        )}
      </div>

      <p className="mb-4 text-sm text-muted-foreground">Based on your progress and weak areas</p>

      {/* Recommendations */}
      <div className="divide-y divide-white/5">
        {recommendations.map((rec, index) => (
          <RecommendationRow key={`${rec.scenario_id}-${index}`} rec={rec} />
        ))}
      </div>
    </div>
  )
}
