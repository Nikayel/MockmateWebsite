import { getPatternKnowledge } from "@/lib/rag/knowledge-base/dsa-knowledge"
import type { UserPerformanceProfile } from "@/lib/rag/user-performance-rag"
import type { CatalogProblem } from "./types"

export function calculateReadiness(
  problem: CatalogProblem,
  profile: UserPerformanceProfile
): number {
  const knowledge = getPatternKnowledge(problem.pattern)
  if (!knowledge) return 50

  let prereqScore = 100
  for (const prereq of knowledge.prerequisites) {
    const prof = profile.patternProficiency.find((p) => p.pattern === prereq)
    if (!prof || prof.proficiencyLevel === "novice") {
      prereqScore -= 30
    } else if (prof.proficiencyLevel === "learning") {
      prereqScore -= 15
    }
  }

  const patternProf = profile.patternProficiency.find((p) => p.pattern === problem.pattern)
  let patternScore = 50
  if (patternProf) {
    switch (patternProf.proficiencyLevel) {
      case "novice":
        patternScore = 30
        break
      case "learning":
        patternScore = 50
        break
      case "practicing":
        patternScore = 70
        break
      case "proficient":
        patternScore = 85
        break
      case "expert":
        patternScore = 100
        break
    }
  }

  let difficultyModifier = 0
  if (problem.difficulty === "hard" && patternScore < 70) difficultyModifier = -20
  if (problem.difficulty === "easy" && patternScore > 80) difficultyModifier = 10

  return Math.max(
    0,
    Math.min(100, Math.round(prereqScore * 0.4 + patternScore * 0.6 + difficultyModifier))
  )
}
