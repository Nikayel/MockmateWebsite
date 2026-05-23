/**
 * Compatibility facade for the consolidated hint agent.
 *
 * New code should import from "@/lib/agents/hints". This file keeps older
 * imports working while avoiding a second hint orchestration implementation.
 */

export {
  calculateStruggleLevel,
  generateHints,
  getHintAgent,
  getNextHint,
  getRecommendedRevealLevel,
} from "./hints"

export type {
  GeneratedHint,
  HintCategory,
  HintGenerationRequest,
  HintGenerationResponse,
  HintLevel,
  HintTrigger,
  StruggleMetrics,
} from "./hints"
