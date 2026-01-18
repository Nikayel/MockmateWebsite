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

// Agents
export { InterviewerAgent, interviewerAgent } from "./interviewer-agent"
export { StateTrackerAgent, stateTrackerAgent } from "./state-tracker-agent"
export { ResponseValidatorAgent, responseValidatorAgent, quickValidate } from "./response-validator-agent"

// Orchestrator
export {
  InterviewOrchestrator,
  interviewOrchestrator,
  orchestrateInterviewResponse,
} from "./orchestrator"
