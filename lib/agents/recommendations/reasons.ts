import type { UserPerformanceProfile } from "@/lib/rag/user-performance-rag"
import type { CatalogProblem, RecommendationReason, RecommendationRequest } from "./types"
import { estimateProblemTime } from "./scoring"

export function getReasonText(reason: RecommendationReason, problem: CatalogProblem): string {
  switch (reason) {
    case "weakness-practice":
      return `Your ${problem.pattern} skills need work. This ${problem.difficulty} problem is a good practice opportunity.`
    case "strength-challenge":
      return `You're strong at ${problem.pattern}! Challenge yourself with this harder problem.`
    case "new-pattern":
      return `You haven't practiced ${problem.pattern} yet. This is a good introduction.`
    case "spaced-repetition":
      return `It's been a while since you practiced ${problem.pattern}. Time for a refresher!`
    case "difficulty-progression":
      return `Based on your recent progress, you're ready for this ${problem.difficulty} challenge.`
    case "similar-to-solved":
      return `This is similar to problems you've solved before. Apply your knowledge!`
    case "interview-prep":
      return `Frequently asked in interviews${problem.company ? ` at ${problem.company}` : ""}. Great for preparation.`
    case "daily-goal":
      return `Perfect for your daily practice goal. Estimated ${estimateProblemTime(problem.difficulty, problem.pattern)} minutes.`
    default:
      return "Recommended based on your learning profile."
  }
}

export function determineReason(
  problem: CatalogProblem,
  profile: UserPerformanceProfile,
  request: RecommendationRequest
): RecommendationReason {
  const patternProf = profile.patternProficiency.find((p) => p.pattern === problem.pattern)

  if (!patternProf) {
    return "new-pattern"
  }

  if (profile.weaknesses.includes(problem.pattern)) {
    return "weakness-practice"
  }

  if (patternProf.lastPracticed) {
    const daysSince = (Date.now() - patternProf.lastPracticed.getTime()) / (24 * 60 * 60 * 1000)
    if (daysSince > 7 && patternProf.proficiencyLevel !== "expert") {
      return "spaced-repetition"
    }
  }

  if (profile.strengths.includes(problem.pattern) && problem.difficulty === "hard") {
    return "strength-challenge"
  }

  if (problem.company && request.targetCompany === problem.company) {
    return "interview-prep"
  }

  switch (request.sessionGoal) {
    case "challenge":
      return "difficulty-progression"
    case "review":
      return "spaced-repetition"
    case "learn-new":
      return "new-pattern"
    default:
      return "daily-goal"
  }
}
