import type { DifficultyLevel, ScenarioType } from "@/lib/scenarios/types"

export interface NextPracticeRecommendation {
  scenarioId: string
  title: string
  type: ScenarioType
  difficulty: DifficultyLevel
  estimatedMinutes: number
  href: string
  reason: string
  focus: string
  focusSource: "bugfix-evidence" | "score-breakdown" | "transfer"
  feedbackNote?: string
}

export type NextPracticeResponse =
  | { status: "ready"; recommendation: NextPracticeRecommendation }
  | { status: "not_ready" | "not_found" | "no_match" }
  | { status: "unavailable" }
