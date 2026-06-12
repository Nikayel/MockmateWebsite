import type {
  BugfixPracticeTrack,
  BugfixReadinessProfile,
  BugfixScoreBreakdown,
  BugfixSkillCategory,
} from "./types"

const TRACK_BY_WEAKNESS: Record<BugfixSkillCategory, BugfixPracticeTrack> = {
  "async-race": "frontend-regression-debugging",
  "null-safety": "backend-api-debugging",
  idempotency: "distributed-systems-debugging",
  "mutation-reference": "frontend-regression-debugging",
  "numerical-precision": "data-date-time-bugs",
  "auth-permissions": "backend-api-debugging",
  caching: "distributed-systems-debugging",
  retries: "distributed-systems-debugging",
  "state-sync": "frontend-regression-debugging",
  "data-validation": "backend-api-debugging",
  "date-time": "data-date-time-bugs",
  "database-consistency": "distributed-systems-debugging",
  observability: "distributed-systems-debugging",
  "frontend-state": "frontend-regression-debugging",
  "ai-collaboration": "ai-assisted-debugging",
}

export function buildBugfixReadinessProfile(params: {
  score: BugfixScoreBreakdown
  weaknessTags?: BugfixSkillCategory[]
}): BugfixReadinessProfile {
  const score = params.score
  const weaknessTags = params.weaknessTags || []
  const weaknesses = new Set<BugfixSkillCategory>(weaknessTags)
  const strengths = new Set<BugfixSkillCategory>()

  if (score.reproductionDiscipline < 70) weaknesses.add("observability")
  if (score.codebaseNavigation < 70) weaknesses.add("frontend-state")
  if (score.verificationDiscipline < 70) weaknesses.add("data-validation")
  if (score.aiCollaborationQuality < 70) weaknesses.add("ai-collaboration")

  if (score.reproductionDiscipline >= 85) strengths.add("observability")
  if (score.minimalFixQuality >= 85) strengths.add("mutation-reference")
  if (score.verificationDiscipline >= 85) strengths.add("data-validation")
  if (score.aiCollaborationQuality >= 85) strengths.add("ai-collaboration")

  const primaryWeakness = Array.from(weaknesses)[0]
  const track =
    score.overall < 55
      ? "beginner-debugger"
      : primaryWeakness
        ? TRACK_BY_WEAKNESS[primaryWeakness]
        : "ai-assisted-debugging"

  return {
    readinessScore: score.overall,
    strengths: Array.from(strengths),
    weaknesses: Array.from(weaknesses),
    track,
    modeRecommendation: score.overall >= 75 ? "interview" : "practice",
  }
}
