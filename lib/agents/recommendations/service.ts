import { getPatternKnowledge, getRelatedPatterns } from "@/lib/rag/knowledge-base/dsa-knowledge"
import type { DSAPattern } from "@/lib/types/dsa-patterns"
import { getRecommendationProfile, getUserLevel } from "./profile"
import { calculateReadiness } from "./readiness"
import { determineReason, getReasonText } from "./reasons"
import {
  estimateProblemTime,
  getPriority,
  scoreCatalogLexicalRelevance,
  scoreProblem,
} from "./scoring"
import { buildSessionPlan } from "./session-plan"
import type {
  CatalogProblem,
  RecommendationRequest,
  RecommendationResponse,
  RecommendedProblem,
} from "./types"

export async function generateRecommendations(
  request: RecommendationRequest,
  catalog: CatalogProblem[]
): Promise<RecommendationResponse> {
  const startTime = Date.now()
  const { profile, personalizationLevel } = await getRecommendationProfile(request.userId)

  let eligibleProblems = catalog.filter((p) => !request.excludeProblemIds?.includes(p.id))

  if (request.availableTimeMinutes) {
    eligibleProblems = eligibleProblems.filter(
      (p) => estimateProblemTime(p.difficulty, p.pattern) <= request.availableTimeMinutes!
    )
  }

  const lexicalScores = scoreCatalogLexicalRelevance(eligibleProblems, request, profile)

  const scoredProblems = eligibleProblems.map((problem) => {
    const score = scoreProblem(problem, profile, request, lexicalScores.get(problem.id) || 0)
    const reason = determineReason(problem, profile, request)

    return {
      ...problem,
      score,
      reason,
      priority: getPriority(score, reason),
      reasonText: getReasonText(reason, problem),
      estimatedTimeMinutes: estimateProblemTime(problem.difficulty, problem.pattern),
      prerequisites: getPatternKnowledge(problem.pattern)?.prerequisites || [],
      userReadiness: calculateReadiness(problem, profile),
    } as RecommendedProblem
  })

  scoredProblems.sort((a, b) => b.score.overall - a.score.overall)

  const recommendations = scoredProblems.slice(0, request.limit || 10)

  return {
    recommendations,
    userProfile: {
      level: getUserLevel(profile),
      strengths: profile.strengths,
      weaknesses: profile.weaknesses,
      recentTrend: profile.recentTrend,
    },
    sessionPlan: buildSessionPlan(recommendations),
    metadata: {
      generationTimeMs: Date.now() - startTime,
      totalProblemsScored: eligibleProblems.length,
      personalizationLevel,
    },
  }
}

export async function getNextProblemRecommendation(
  userId: string,
  currentProblemId: string,
  currentPattern: DSAPattern,
  wasSuccessful: boolean,
  catalog: CatalogProblem[]
): Promise<RecommendedProblem | null> {
  const response = await generateRecommendations(
    {
      userId,
      excludeProblemIds: [currentProblemId],
      targetPatterns: wasSuccessful
        ? getRelatedPatterns(currentPattern).map((k) => k.pattern)
        : [currentPattern],
      preferredDifficulty: "adaptive",
      sessionGoal: wasSuccessful ? "challenge" : "practice",
      limit: 3,
    },
    catalog
  )

  return response.recommendations[0] || null
}

class RecommendationAgent {
  async recommend(
    request: RecommendationRequest,
    catalog: CatalogProblem[]
  ): Promise<RecommendationResponse> {
    return generateRecommendations(request, catalog)
  }

  async getNext(
    userId: string,
    currentProblemId: string,
    currentPattern: DSAPattern,
    wasSuccessful: boolean,
    catalog: CatalogProblem[]
  ): Promise<RecommendedProblem | null> {
    return getNextProblemRecommendation(
      userId,
      currentProblemId,
      currentPattern,
      wasSuccessful,
      catalog
    )
  }
}

let recommendationAgentInstance: RecommendationAgent | null = null

export function getRecommendationAgent(): RecommendationAgent {
  if (!recommendationAgentInstance) {
    recommendationAgentInstance = new RecommendationAgent()
  }
  return recommendationAgentInstance
}
