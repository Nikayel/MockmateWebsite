/**
 * RAG Integration for Smart Recommendations
 *
 * Uses the advanced RAG system to provide personalized problem recommendations
 * based on user's weak areas, failed problems, and roadmap goals.
 */

import { advancedRetrieve } from "../rag/retrieval/advanced-retrieval"
import { adminDb } from "../firebase-admin"
import { getScenarioById, scenarios } from "../scenarios"
import type { DSAPattern } from "../types/dsa-patterns"
import type { Difficulty } from "./sm2-algorithm"
import { getWeakPatterns, getUserMasteryStats } from "./mastery-calculator"
import { getAllUserProblems, getCompletedProblemIds, type ProblemMastery } from "./scheduler"

/**
 * Get canonical difficulty from scenario definition
 */
function getCanonicalDifficulty(scenarioId: string, fallback: Difficulty): Difficulty {
  const scenario = getScenarioById(scenarioId)
  return (scenario?.difficulty as Difficulty) || fallback
}

export type RecommendationType =
  | "review"
  | "practice_weakness"
  | "similar_to_failed"
  | "company_relevant"
  | "next_in_roadmap"
  | "strengthen_pattern"

export interface SmartRecommendation {
  type: RecommendationType
  scenario_id: string
  title: string
  pattern: DSAPattern
  difficulty: Difficulty
  reason: string
  priority: number // 0-100, higher = more important
  estimated_minutes: number
  companies?: string[]
}

interface RecentlyFailedProblem {
  problem_id: string
  title: string
  pattern: DSAPattern
  score: number
}

/**
 * Get recently failed problems (score < 60 in last 7 days)
 */
async function getRecentlyFailedProblems(
  userId: string,
  limit: number = 5
): Promise<RecentlyFailedProblem[]> {
  const problems = await getAllUserProblems(userId)

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const failed = problems
    .filter((p) => {
      const reviewedAt = new Date(p.last_reviewed_at)
      return reviewedAt >= sevenDaysAgo && p.last_score < 60
    })
    .sort((a, b) => a.last_score - b.last_score) // Worst first
    .slice(0, limit)
    .map((p) => ({
      problem_id: p.problem_id,
      title: p.title,
      pattern: p.pattern,
      score: p.last_score,
    }))

  return failed
}

/**
 * Get user's active roadmap target company
 */
async function getActiveRoadmap(
  userId: string
): Promise<{ targetCompany?: string; targetRole?: string } | null> {
  try {
    // A roadmap document is keyed by a GENERATED id and carries `userId` as a
    // field, which is how every other reader finds it (app/api/roadmap/*, the
    // email cron, the admin user view, the deletion map). This function used
    // `.doc(userId)`, so `doc.exists` was false for every user who has ever had
    // a roadmap and it returned null unconditionally. Its field names were wrong
    // too: the writer nests the answers under `assessment` in camelCase, never
    // `target_company` at the top level.
    const snapshot = await adminDb
      .collection("user_roadmaps")
      .where("userId", "==", userId)
      .where("status", "==", "active")
      .limit(1)
      .get()

    if (snapshot.empty) return null

    const data = snapshot.docs[0].data()
    const assessment = data?.assessment ?? {}
    return {
      targetCompany: assessment.targetCompany,
      // The assessment records the track the candidate is preparing for; there
      // is no separate role field on the document.
      targetRole: assessment.targetTrack,
    }
  } catch {
    return null
  }
}

/**
 * Find similar problems to ones the user struggled with
 */
async function getSimilarProblems(
  failedProblem: RecentlyFailedProblem,
  excludeIds: string[],
  limit: number = 3
): Promise<SmartRecommendation[]> {
  const scenario = getScenarioById(failedProblem.problem_id)

  if (!scenario) return []

  // Use RAG to find similar problems
  const results = await advancedRetrieve({
    query: `${scenario.title} ${scenario.description}`,
    limit,
    types: ["problem"],
    patterns: [failedProblem.pattern],
    excludeIds: [failedProblem.problem_id, ...excludeIds],
    enableQueryExpansion: true,
    enableReranking: true,
  })

  return results.map((result, index) => {
    const matchedScenario = scenarios.find(
      (s) => s.id === result.id || s.title === result.metadata?.title
    )

    // Use canonical difficulty from scenario definition
    const canonicalDifficulty = getCanonicalDifficulty(
      result.id,
      (result.metadata?.difficulty as Difficulty) || "medium"
    )

    return {
      type: "similar_to_failed" as RecommendationType,
      scenario_id: result.id,
      title: (result.metadata?.title as string) || result.id,
      pattern: failedProblem.pattern,
      difficulty: canonicalDifficulty,
      reason: `Similar to "${failedProblem.title}" which you scored ${failedProblem.score}%`,
      priority: 80 - index * 5, // Decrease priority for each subsequent result
      estimated_minutes: matchedScenario?.estimatedTime || 20,
      companies: result.metadata?.companies as string[],
    }
  })
}

/**
 * Get company-relevant problems for user's target company
 */
async function getCompanyRelevantProblems(
  targetCompany: string,
  weakPatterns: DSAPattern[],
  excludeIds: string[],
  limit: number = 3
): Promise<SmartRecommendation[]> {
  // Find problems commonly asked at the target company
  const relevantScenarios = scenarios
    .filter((s) => {
      if (excludeIds.includes(s.id)) return false
      if (!s.companies.includes(targetCompany as any)) return false
      if (s.type !== "dsa") return false
      // Prefer problems from weak patterns
      if (weakPatterns.length > 0 && "pattern" in s) {
        return weakPatterns.includes((s as any).pattern)
      }
      return true
    })
    .slice(0, limit)

  return relevantScenarios.map((scenario, index) => ({
    type: "company_relevant" as RecommendationType,
    scenario_id: scenario.id,
    title: scenario.title,
    pattern: (scenario as any).pattern || "arrays-hashing",
    difficulty: scenario.difficulty,
    reason: `Commonly asked at ${targetCompany}${
      weakPatterns.includes((scenario as any).pattern) ? " and matches your weak pattern" : ""
    }`,
    priority: 70 - index * 5,
    estimated_minutes: scenario.estimatedTime,
    companies: scenario.companies,
  }))
}

/**
 * Get problems to strengthen weak patterns
 */
async function getPatternStrengtheningProblems(
  weakPatterns: { pattern: DSAPattern; average_score: number }[],
  completedIds: string[],
  limit: number = 3
): Promise<SmartRecommendation[]> {
  const recommendations: SmartRecommendation[] = []

  for (const weak of weakPatterns.slice(0, 2)) {
    // Find unseen problems for this pattern, sorted by difficulty (start easier)
    const patternProblems = scenarios
      .filter((s) => {
        if (completedIds.includes(s.id)) return false
        if (s.type !== "dsa") return false
        return (s as any).pattern === weak.pattern
      })
      .sort((a, b) => {
        const diffOrder = { easy: 0, medium: 1, hard: 2 }
        return diffOrder[a.difficulty] - diffOrder[b.difficulty]
      })
      .slice(0, 2)

    patternProblems.forEach((scenario, index) => {
      recommendations.push({
        type: "strengthen_pattern",
        scenario_id: scenario.id,
        title: scenario.title,
        pattern: weak.pattern,
        difficulty: scenario.difficulty,
        reason: `Practice ${weak.pattern} - your average score is ${weak.average_score}%`,
        priority: 75 - index * 5,
        estimated_minutes: scenario.estimatedTime,
        companies: scenario.companies,
      })
    })
  }

  return recommendations.slice(0, limit)
}

/**
 * Get the next recommended problem in user's learning roadmap
 */
async function getNextInRoadmap(
  userId: string,
  completedIds: string[]
): Promise<SmartRecommendation | null> {
  try {
    // Same two defects as getActiveRoadmap above: the document is keyed by a
    // generated id with `userId` as a field, and the schema this read against
    // never existed. A roadmap has no `phases` or `current_phase`; it has
    // `dailyPlans`, each with a `questions` array. So this returned null for
    // every user, and "next in your roadmap" was silently absent from every
    // recommendation set the product has ever produced.
    const snapshot = await adminDb
      .collection("user_roadmaps")
      .where("userId", "==", userId)
      .where("status", "==", "active")
      .limit(1)
      .get()

    if (snapshot.empty) return null

    const dailyPlans = (snapshot.docs[0].data()?.dailyPlans ?? []) as Array<{
      dayNumber?: number
      theme?: string
      questions?: Array<{ scenarioId?: string }>
    }>

    // Plans are stored in curriculum order, so the first uncompleted question is
    // the next one due. Sorted defensively by dayNumber because "the next
    // problem" is only meaningful if the walk is in day order.
    const orderedPlans = [...dailyPlans].sort((a, b) => (a.dayNumber ?? 0) - (b.dayNumber ?? 0))

    for (const plan of orderedPlans) {
      for (const question of plan.questions ?? []) {
        const scenarioId = question?.scenarioId
        if (!scenarioId || completedIds.includes(scenarioId)) continue

        // The roadmap may still name a scenario that has since been removed, so
        // the registry stays the authority on whether it is offerable.
        const scenario = getScenarioById(scenarioId)
        if (!scenario) continue

        return {
          type: "next_in_roadmap",
          scenario_id: scenario.id,
          title: scenario.title,
          pattern: (scenario as any).pattern || "arrays-hashing",
          difficulty: scenario.difficulty,
          reason: `Next in your roadmap: ${plan.theme || `Day ${plan.dayNumber ?? 1}`}`,
          priority: 85,
          estimated_minutes: scenario.estimatedTime,
          companies: scenario.companies,
        }
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Get smart recommendations for a user
 */
export async function getSmartRecommendations(
  userId: string,
  limit: number = 5
): Promise<SmartRecommendation[]> {
  // Get user's completed/seen problem IDs. Uses an id-only Firestore projection
  // instead of pulling every full mastery document just to read problem_id.
  const completedIds = await getCompletedProblemIds(userId)

  // Stage 1: the four lookups that only depend on completedIds are independent
  // of each other, so run them in parallel instead of sequentially.
  const [nextRoadmap, failedProblems, weakPatterns, roadmap] = await Promise.all([
    getNextInRoadmap(userId, completedIds),
    getRecentlyFailedProblems(userId),
    getWeakPatterns(userId, 3),
    getActiveRoadmap(userId),
  ])

  // Exclude everything the user has already seen, plus the roadmap pick that is
  // already resolved. Overlaps between the stage-2 generators themselves are
  // removed by the de-dup pass after the join below, so the generators do not
  // need to observe each other's output.
  const baseExcludeIds = nextRoadmap ? [...completedIds, nextRoadmap.scenario_id] : completedIds

  // Stage 2: generators that depend on stage 1 also run in parallel, including
  // the per-failed-problem similarity lookups (previously an awaited loop).
  const [similarGroups, patternProblems, companyProblems] = await Promise.all([
    Promise.all(
      failedProblems.slice(0, 2).map((failed) => getSimilarProblems(failed, baseExcludeIds, 2))
    ),
    getPatternStrengtheningProblems(
      weakPatterns.map((p) => ({
        pattern: p.pattern,
        average_score: p.average_score,
      })),
      baseExcludeIds,
      3
    ),
    roadmap?.targetCompany
      ? getCompanyRelevantProblems(
          roadmap.targetCompany,
          weakPatterns.map((p) => p.pattern),
          baseExcludeIds,
          2
        )
      : Promise.resolve<SmartRecommendation[]>([]),
  ])

  // Assemble in the same priority-type order as before: roadmap, similar,
  // pattern, then company.
  const recommendations: SmartRecommendation[] = []
  if (nextRoadmap) {
    recommendations.push(nextRoadmap)
  }
  recommendations.push(...similarGroups.flat())
  recommendations.push(...patternProblems)
  recommendations.push(...companyProblems)

  // Sort by priority and deduplicate. The exclusion of already-recommended
  // scenario IDs is applied here, AFTER the parallel join, so a problem that
  // more than one generator surfaced still appears at most once.
  const seen = new Set<string>()
  const unique = recommendations.filter((r) => {
    if (seen.has(r.scenario_id)) return false
    seen.add(r.scenario_id)
    return true
  })

  return unique.sort((a, b) => b.priority - a.priority).slice(0, limit)
}

/**
 * Get recommendations for a specific pattern
 */
export async function getPatternRecommendations(
  userId: string,
  pattern: DSAPattern,
  limit: number = 5
): Promise<SmartRecommendation[]> {
  const problems = await getAllUserProblems(userId)
  const completedIds = problems.map((p) => p.problem_id)

  // Get problems for this pattern that user hasn't completed
  const patternScenarios = scenarios
    .filter((s) => {
      if (completedIds.includes(s.id)) return false
      if (s.type !== "dsa") return false
      return (s as any).pattern === pattern
    })
    .sort((a, b) => {
      const diffOrder = { easy: 0, medium: 1, hard: 2 }
      return diffOrder[a.difficulty] - diffOrder[b.difficulty]
    })
    .slice(0, limit)

  return patternScenarios.map((scenario, index) => ({
    type: "practice_weakness" as RecommendationType,
    scenario_id: scenario.id,
    title: scenario.title,
    pattern,
    difficulty: scenario.difficulty,
    reason: `Practice ${pattern} pattern`,
    priority: 80 - index * 5,
    estimated_minutes: scenario.estimatedTime,
    companies: scenario.companies,
  }))
}

/**
 * Get recommendations for "what to practice next" based on comprehensive analysis
 */
export async function getNextPracticeRecommendation(
  userId: string
): Promise<SmartRecommendation | null> {
  const recommendations = await getSmartRecommendations(userId, 1)
  return recommendations[0] || null
}
