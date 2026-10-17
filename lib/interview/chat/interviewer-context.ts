import type { PromptContext } from "@/lib/interview/interviewer-prompts"
import {
  type ConversationTracker,
  buildTrackingContext,
  getHintGuidance,
} from "@/lib/interview/interview-phases"
import {
  buildPreLLMInterviewerPolicy,
  formatPreLLMInterviewerPolicy,
} from "@/lib/interview/interviewer-policy"
import { buildFuzzyModeContext } from "@/lib/interview/fuzzy-mode-context"
import type { ClarifyingQuestion } from "@/lib/scenarios/types"
import { buildComplexityContext, buildEdgeCaseContext } from "./context-builders"
import { buildChatToolContext } from "./tool-context"
import type { ChatRequestContext } from "./request-context"
import type { ChatInterviewState } from "./interview-state"
import type { ChatScenarioContext } from "./scenario-context"

export function buildChatInterviewerContext(
  requestContext: ChatRequestContext,
  interviewState: ChatInterviewState,
  scenario: ChatScenarioContext
): PromptContext {
  const {
    scenarioType,
    edgeCases,
    hasSubmitted,
    solutionComplexity,
    realInterviewMode,
    hasFuzzyStatement,
    scenarioClarifyingQuestions,
    scenarioFuzzyStatement,
  } = requestContext
  const { currentPhase, tracker, testsHaveRunNow, testResultsArray } = interviewState
  const { isBugFix, isSystemDesign } = scenario
  // Evaluation cases are useful once the candidate is discussing an approach,
  // but exposing them while they are still clarifying turns grounding into an
  // answer key. The builder owns that phase boundary.
  const edgeCaseContext =
    isBugFix || isSystemDesign ? "" : buildEdgeCaseContext(edgeCases, currentPhase)

  // Build conversation tracking context if available
  // Use enhanced tracker (with LLM extraction) if available
  let trackingContext = ""
  if (!isBugFix && !isSystemDesign && tracker) {
    trackingContext = buildTrackingContext(tracker as ConversationTracker)
  }

  // Build hint guidance if hints have been given
  const hintsGiven = tracker?.hintsGiven || 0
  const hintGuidance =
    hintsGiven > 0 && !isBugFix && !isSystemDesign ? getHintGuidance(hintsGiven) : ""

  const preLLMPolicy = buildPreLLMInterviewerPolicy({
    scenarioType,
    phase: currentPhase,
    tracker,
    hasSubmitted: hasSubmitted || false,
    testsHaveRun: testsHaveRunNow || false,
    testsPassed: testResultsArray?.filter((t) => t.passed === true).length || 0,
    testsTotal: testResultsArray?.length || 0,
  })
  const enforcedChecklist = formatPreLLMInterviewerPolicy(preLLMPolicy)
  const testingPhaseOverride = ""

  // Build complexity context - tells interviewer if solution is optimal
  const complexityContext =
    isBugFix || isSystemDesign ? "" : buildComplexityContext(solutionComplexity)

  const toolResultsContext = buildChatToolContext(requestContext, interviewState)

  // Few-shot examples are now included in buildInterviewerPrompt()

  // Build Real Interview Mode context (fuzzy problem statements)
  // DRY: Use helper that derives context from scenario clarifying questions
  const fuzzyModeContext =
    realInterviewMode && hasFuzzyStatement
      ? buildFuzzyModeContext(
          Array.isArray(scenarioClarifyingQuestions)
            ? (scenarioClarifyingQuestions as ClarifyingQuestion[])
            : undefined,
          scenarioFuzzyStatement
        )
      : ""

  return {
    ...scenario.prompt,
    phase: currentPhase,
    edgeCaseContext,
    trackingContext,
    hintGuidance,
    enforcedChecklist,
    testingPhaseOverride,
    complexityContext,
    toolResultsContext,
    fuzzyModeContext,
  }
}
