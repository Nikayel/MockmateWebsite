import { getPatternKnowledge } from "@/lib/rag/knowledge-base/dsa-knowledge"
import type { UserPerformanceProfile } from "@/lib/rag/user-performance-rag"
import type { DSAPattern } from "@/lib/types/dsa-patterns"
import type {
  CatalogProblem,
  ProblemScore,
  RecommendationPriority,
  RecommendationReason,
  RecommendationRequest,
} from "./types"

export function estimateProblemTime(difficulty: string, pattern: DSAPattern): number {
  const baseTime =
    {
      easy: 15,
      medium: 30,
      hard: 45,
    }[difficulty] || 30

  const complexPatterns = ["dp-2d", "backtracking", "graphs", "trie"]
  if (complexPatterns.includes(pattern)) {
    return baseTime * 1.3
  }

  return baseTime
}

export function getAdaptiveDifficulty(
  profile: UserPerformanceProfile,
  pattern: DSAPattern
): "easy" | "medium" | "hard" {
  const patternProf = profile.patternProficiency.find((p) => p.pattern === pattern)

  if (!patternProf || patternProf.proficiencyLevel === "novice") {
    return "easy"
  }

  if (
    patternProf.proficiencyLevel === "learning" ||
    patternProf.proficiencyLevel === "practicing"
  ) {
    if (patternProf.improvementTrend === "improving") {
      return "medium"
    }
    return "easy"
  }

  if (patternProf.proficiencyLevel === "proficient") {
    return "medium"
  }

  return profile.difficultyPerformance.hard.avgScore > 70 ? "hard" : "medium"
}

export function scoreProblem(
  problem: CatalogProblem,
  profile: UserPerformanceProfile,
  request: RecommendationRequest
): ProblemScore {
  let relevance = 50
  let difficulty = 50
  let freshness = 100
  let patternValue = 50
  let progression = 50

  if (request.targetPatterns?.includes(problem.pattern)) {
    relevance += 30
  }
  if (request.targetCompany && problem.company === request.targetCompany) {
    relevance += 20
  }
  if (problem.frequency && problem.frequency > 50) {
    relevance += 10
  }

  const adaptiveDifficulty = getAdaptiveDifficulty(profile, problem.pattern)
  if (request.preferredDifficulty === "adaptive") {
    difficulty = problem.difficulty === adaptiveDifficulty ? 100 : 60
  } else if (request.preferredDifficulty === problem.difficulty) {
    difficulty = 100
  } else {
    const diffMap: Record<string, number> = { easy: 0, medium: 1, hard: 2 }
    const preferredDiffValue = diffMap[request.preferredDifficulty || "medium"] ?? 1
    const actualDiffValue = diffMap[problem.difficulty] ?? 1
    const diff = Math.abs(actualDiffValue - preferredDiffValue)
    difficulty = 100 - diff * 30
  }

  const patternProf = profile.patternProficiency.find((p) => p.pattern === problem.pattern)
  if (!patternProf) {
    patternValue = request.sessionGoal === "learn-new" ? 90 : 60
  } else if (
    patternProf.proficiencyLevel === "novice" ||
    patternProf.proficiencyLevel === "learning"
  ) {
    patternValue = request.sessionGoal === "practice" ? 90 : 70
  } else if (patternProf.improvementTrend === "declining") {
    patternValue = request.sessionGoal === "review" ? 95 : 75
  } else if (patternProf.proficiencyLevel === "expert") {
    patternValue = request.sessionGoal === "challenge" ? 60 : 30
  }

  if (patternProf?.lastPracticed) {
    const daysSince = (Date.now() - patternProf.lastPracticed.getTime()) / (24 * 60 * 60 * 1000)
    if (daysSince < 1) freshness = 30
    else if (daysSince < 3) freshness = 60
    else if (daysSince < 7) freshness = 80
    else freshness = 100
  }

  const knowledge = getPatternKnowledge(problem.pattern)
  if (knowledge) {
    const prereqsMet = knowledge.prerequisites.every((prereq) =>
      profile.patternProficiency.some(
        (p) =>
          p.pattern === prereq &&
          ["practicing", "proficient", "expert"].includes(p.proficiencyLevel)
      )
    )
    progression = prereqsMet ? 80 : 40
  }

  const overall = Math.round(
    relevance * 0.25 +
      difficulty * 0.2 +
      freshness * 0.15 +
      patternValue * 0.25 +
      progression * 0.15
  )

  return {
    overall,
    relevance,
    difficulty,
    freshness,
    patternValue,
    progression,
  }
}

export function getPriority(
  score: ProblemScore,
  reason: RecommendationReason
): RecommendationPriority {
  if (reason === "weakness-practice" && score.overall > 70) return "critical"
  if (reason === "spaced-repetition" && score.freshness > 90) return "high"
  if (score.overall > 80) return "high"
  if (score.overall > 60) return "medium"
  return "low"
}
