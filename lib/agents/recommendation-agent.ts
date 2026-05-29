/**
 * Compatibility facade for the consolidated recommendation agent.
 *
 * New code should import from "@/lib/agents/recommendations". This file keeps
 * older imports working while avoiding a second recommendation implementation.
 */

export {
  generateRecommendations,
  getNextProblemRecommendation,
  getRecommendationAgent,
} from "./recommendations"

export type {
  CatalogProblem,
  ProblemScore,
  RecommendationPriority,
  RecommendationReason,
  RecommendationRequest,
  RecommendationResponse,
  RecommendedProblem,
} from "./recommendations"
