import type { RecommendationResponse, RecommendedProblem } from "./types"

export function buildSessionPlan(
  recommendations: RecommendedProblem[]
): RecommendationResponse["sessionPlan"] | undefined {
  if (recommendations.length < 3) {
    return undefined
  }

  const easyWarmup = recommendations.find((p) => p.difficulty === "easy")
  const mainProblems = recommendations
    .filter((p) => p.difficulty !== "easy" || !easyWarmup || p.id !== easyWarmup.id)
    .slice(0, 3)
  const hardChallenge = recommendations.find(
    (p) => p.difficulty === "hard" && !mainProblems.includes(p)
  )

  return {
    warmup: easyWarmup,
    main: mainProblems,
    challenge: hardChallenge,
    estimatedTotalMinutes:
      (easyWarmup?.estimatedTimeMinutes || 0) +
      mainProblems.reduce((sum, p) => sum + p.estimatedTimeMinutes, 0) +
      (hardChallenge?.estimatedTimeMinutes || 0),
  }
}
