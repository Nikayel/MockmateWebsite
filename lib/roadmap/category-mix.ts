/**
 * Category mix allocation and non-DSA question scoring.
 *
 * Turns category weights into per-category target counts capped by the real
 * (thin) non-DSA inventory, and scores/prioritizes non-DSA scenarios without any
 * DSA pattern coupling. Shared by the roadmap generator so composition rules
 * live in one place.
 */

import type {
  Scenario,
  BugFixScenario,
  AddFunctionalityScenario,
  SystemDesignScenario,
  Company,
} from "@/lib/scenarios"
import type {
  RoadmapCategory,
  UserRoadmapAssessment,
  CompanyQuestionData,
} from "@/lib/data/company-questions/types"
import { SCENARIO_TYPE_TO_CATEGORY, CATEGORY_LABELS } from "./category-weights"

export interface NonDsaPrioritizedQuestion {
  scenarioId: string
  title: string
  category: RoadmapCategory
  scenarioType: "bugfix" | "system-design" | "add-functionality"
  topic: string
  difficulty: "easy" | "medium" | "hard"
  priorityScore: number
  estimatedMinutes: number
  reasons: string[]
  isRequired: boolean
}

export type CategoryCounts = Record<RoadmapCategory, number>

export interface CategoryGap {
  category: RoadmapCategory
  wanted: number
  available: number
}

export function emptyCounts(): CategoryCounts {
  return { dsa: 0, bugfix: 0, decomposition: 0, "system-design": 0 }
}

export function categoryOf(scenario: Scenario): RoadmapCategory {
  return SCENARIO_TYPE_TO_CATEGORY[scenario.type] ?? "dsa"
}

/**
 * Convert weights (0-100) + total available slots into per-category target
 * counts, capped by real inventory. Any shortfall from a thin category is
 * redistributed to categories that still have headroom (DSA, the deepest pool,
 * absorbs the remainder) so the roadmap fills up instead of collapsing.
 */
export function allocateCategoryCounts(
  weights: CategoryCounts,
  totalSlots: number,
  available: CategoryCounts
): { targetCounts: CategoryCounts; gaps: CategoryGap[] } {
  const cats = Object.keys(weights) as RoadmapCategory[]
  const target = emptyCounts()
  const gaps: CategoryGap[] = []
  let shortfall = 0

  for (const c of cats) {
    const raw = Math.round((totalSlots * weights[c]) / 100)
    const capped = Math.min(raw, available[c])
    if (raw > available[c]) {
      gaps.push({ category: c, wanted: raw, available: available[c] })
      shortfall += raw - available[c]
    }
    target[c] = capped
  }

  // Redistribute the shortfall to categories with remaining inventory. DSA is
  // the last-resort absorber because it has the deepest pool.
  const order: RoadmapCategory[] = ["decomposition", "bugfix", "system-design", "dsa"]
  for (const c of order) {
    if (shortfall <= 0) break
    if (weights[c] === 0 && c !== "dsa") continue // don't schedule categories the user excluded
    const room = available[c] - target[c]
    if (room <= 0) continue
    const add = Math.min(room, shortfall)
    target[c] += add
    shortfall -= add
  }

  return { targetCounts: target, gaps }
}

/**
 * Pattern-free score for a non-DSA scenario: company relevance + must-know +
 * difficulty fit for the user's level. Non-DSA scenarios carry no DSA pattern,
 * so none of the pattern/familiarity scoring applies.
 */
function scoreNonDsaScenario(
  scenario: BugFixScenario | AddFunctionalityScenario | SystemDesignScenario,
  assessment: UserRoadmapAssessment,
  company: CompanyQuestionData
): { score: number; reasons: string[] } {
  let score = 40
  const reasons: string[] = []

  if (scenario.companies?.includes(company.name as Company)) {
    score += 25
    reasons.push(`Asked at ${company.name}`)
  }
  if (company.mustKnowQuestions.some((q) => q.scenarioId === scenario.id)) {
    score += 20
    reasons.push(`Must-know for ${company.name}`)
  }

  const wantsEasier =
    assessment.experienceLevel === "intern" || assessment.experienceLevel === "beginner"
  if (wantsEasier && scenario.difficulty === "hard") {
    score -= 20
  } else if (!wantsEasier && scenario.difficulty !== "easy") {
    score += 8
  }

  return { score: Math.max(0, Math.min(100, Math.round(score))), reasons }
}

export function prioritizeNonDsaQuestions(
  scenarios: Scenario[],
  assessment: UserRoadmapAssessment,
  company: CompanyQuestionData
): NonDsaPrioritizedQuestion[] {
  return scenarios
    .filter(
      (s): s is BugFixScenario | AddFunctionalityScenario | SystemDesignScenario => s.type !== "dsa"
    )
    .map((scenario) => {
      const category = categoryOf(scenario)
      const { score, reasons } = scoreNonDsaScenario(scenario, assessment, company)
      return {
        scenarioId: scenario.id,
        title: scenario.title,
        category,
        scenarioType: scenario.type as "bugfix" | "system-design" | "add-functionality",
        topic: CATEGORY_LABELS[category],
        difficulty: scenario.difficulty,
        priorityScore: score,
        estimatedMinutes: scenario.estimatedTime || 40,
        reasons,
        isRequired: company.mustKnowQuestions.some((q) => q.scenarioId === scenario.id),
      }
    })
    .sort((a, b) => b.priorityScore - a.priorityScore)
}

/** Count available non-DSA questions per category. */
export function countByCategory(questions: NonDsaPrioritizedQuestion[]): CategoryCounts {
  const counts = emptyCounts()
  for (const q of questions) counts[q.category]++
  return counts
}
