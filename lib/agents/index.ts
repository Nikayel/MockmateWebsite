/**
 * AI Agents Index
 *
 * Central export for all AI agents in the system.
 */

// Hint Agent
export {
  getHintAgent,
  generateHints,
  getNextHint,
  type GeneratedHint,
  type HintLevel,
  type HintCategory,
  type HintGenerationRequest,
  type HintGenerationResponse,
  type StruggleMetrics,
} from './hint-agent'

// Recommendation Agent
export {
  getRecommendationAgent,
  generateRecommendations,
  getNextProblemRecommendation,
  type RecommendedProblem,
  type RecommendationRequest,
  type RecommendationResponse,
  type CatalogProblem,
  type ProblemScore,
  type RecommendationPriority,
  type RecommendationReason,
} from './recommendation-agent'
