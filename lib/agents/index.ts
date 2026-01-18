/**
 * Multi-Agent Interview System
 *
 * This module provides a clean, testable architecture for the AI interviewer.
 *
 * Architecture:
 * ```
 * ┌─────────────────────────────────────────────────────────────┐
 * │                     ORCHESTRATOR                            │
 * │  Coordinates agents, manages retry loops, tracks metrics    │
 * └─────────────────────────────────────────────────────────────┘
 *                              │
 *          ┌──────────────────┼──────────────────┐
 *          ▼                  ▼                  ▼
 * ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
 * │ STATE TRACKER   │ │  INTERVIEWER    │ │   VALIDATOR     │
 * │ (Cheap Model)   │ │  (Smart Model)  │ │ (Deterministic) │
 * │                 │ │                 │ │                 │
 * │ - Phase detect  │ │ - Conversation  │ │ - Hard gates    │
 * │ - State extract │ │ - Few-shot      │ │ - Rule checks   │
 * │ - Topic track   │ │ - Tool results  │ │ - Regeneration  │
 * └─────────────────┘ └─────────────────┘ └─────────────────┘
 * ```
 *
 * Usage:
 * ```typescript
 * import { orchestrateInterviewResponse } from '@/lib/agents'
 *
 * const result = await orchestrateInterviewResponse(
 *   context,
 *   messages,
 *   lastUserMessage
 * )
 *
 * if (result.success) {
 *   console.log(result.data.response)
 *   console.log(result.metrics) // { totalLatencyMs, agentCalls, retries }
 * }
 * ```
 */

// Types
export type {
  AgentType,
  ModelTier,
  AgentConfig,
  InterviewContext,
  ConversationState,
  InterviewPhase,
  ChatMessage,
  TestResult,
  // Agent I/O types
  InterviewerInput,
  InterviewerOutput,
  StateTrackerInput,
  StateTrackerOutput,
  ValidatorInput,
  ValidatorOutput,
  ValidationViolation,
  ScorerInput,
  ScorerOutput,
  InteractionMetrics,
  FeedbackWriterInput,
  FeedbackWriterOutput,
  ExtractedEvidence,
  ConstitutionalInput,
  ConstitutionalOutput,
  FeedbackCorrection,
  // Orchestrator types
  OrchestratorConfig,
  OrchestrationResult,
  Agent,
} from "./types"

// =============================================================================
// INTERVIEW AGENTS (Phase 1: Live Interview)
// =============================================================================

export { InterviewerAgent, interviewerAgent } from "./interviewer-agent"
export { StateTrackerAgent, stateTrackerAgent } from "./state-tracker-agent"
export { ResponseValidatorAgent, responseValidatorAgent, quickValidate } from "./response-validator-agent"

// Interview Orchestrator
export {
  InterviewOrchestrator,
  interviewOrchestrator,
  orchestrateInterviewResponse,
} from "./orchestrator"

// =============================================================================
// FEEDBACK AGENTS (Phase 2 & 3: Post-Submission)
// =============================================================================

export { ScorerAgent, createScorerAgent } from "./scorer-agent"
export type { ScorerAgentInput, ScorerAgentOutput } from "./scorer-agent"

export { FeedbackWriterAgent, createFeedbackWriterAgent } from "./feedback-writer-agent"
export type { FeedbackWriterAgentInput, FeedbackWriterAgentOutput } from "./feedback-writer-agent"

export { ConstitutionalAgent, createConstitutionalAgent } from "./constitutional-agent"
export type { ConstitutionalAgentInput, ConstitutionalAgentOutput } from "./constitutional-agent"

// Feedback Orchestrator
export {
  FeedbackOrchestrator,
  orchestrateFeedbackGeneration,
} from "./feedback-orchestrator"
export type { FeedbackRequest, FeedbackResponse } from "./feedback-orchestrator"
