import { useCallback } from "react"
import type { Dispatch, SetStateAction } from "react"
import {
  type ConversationTracker,
  type InterviewPhase,
  updateTrackerFromMessage,
} from "@/lib/interview/interview-phases"
import type { Scenario } from "@/lib/scenarios"
import type { ChatMessage, EfficiencyMetrics, TestResult } from "../_types"
import { detectDebuggingPhase } from "@/lib/interview/phases/debugging"
import type { SessionContext } from "@/lib/interview/session-context/schema"

export interface PhaseDerivationInput {
  scenarioType?: string
  hasCodeChanges?: boolean
  testsAreCurrent?: boolean
  showPostInterviewDiscussion: boolean
  showFeedback: boolean
  testResultsLength: number
  codeLength: number
  approachExplained: boolean
  interviewerMessagesLength: number
}

/**
 * Pure derivation of the current interview phase from observable state. Mirrors
 * the inline if-ladder exactly; extracted so the phase logic is unit-testable
 * without a DOM.
 */
export function deriveInterviewPhase({
  scenarioType,
  hasCodeChanges = false,
  testsAreCurrent,
  showPostInterviewDiscussion,
  showFeedback,
  testResultsLength,
  codeLength,
  approachExplained,
  interviewerMessagesLength,
}: PhaseDerivationInput): InterviewPhase {
  // If in post-interview discussion, they've submitted
  if (showPostInterviewDiscussion) return "post_interview"
  // If showing feedback, complete
  if (showFeedback) return "complete"
  if (scenarioType === "bugfix") {
    return detectDebuggingPhase({
      hasSubmitted: false,
      hasCodeChanges,
      hasTestResults: testResultsLength > 0,
      testsAreCurrent: testsAreCurrent ?? testResultsLength > 0,
      approachExplained,
    })
  }
  // If tests have run, testing phase
  if (testResultsLength > 0) return "testing"
  // If code has been written, coding phase
  if (codeLength > 50) return "coding"
  // If they've explained approach (based on tracker), discussion phase
  if (approachExplained) return "discussion"
  // If few messages, still intro
  if (interviewerMessagesLength <= 2) return "intro"
  // Default to discussion
  return "discussion"
}

export interface UseInterviewPhaseTrackingOptions {
  sessionContext?: Pick<SessionContext, "files" | "testsMatchCurrentRevision">
  showPostInterviewDiscussion: boolean
  showFeedback: boolean
  testResults: TestResult[]
  code: string
  conversationTracker: ConversationTracker
  interviewerMessages: ChatMessage[]
  starterCode: string
  efficiencyMetrics: EfficiencyMetrics | null
  realInterviewMode: boolean
  selectedScenario: Scenario | null
  setConversationTracker: Dispatch<SetStateAction<ConversationTracker>>
}

/**
 * Owns the interview's phase derivation + conversation-tracker updates. The
 * `conversationTracker` STATE stays in the page (it is read by the submit/feedback
 * payloads and is never persisted), so the setter is injected. The updater
 * functions are returned so the page can keep wiring them to their existing
 * consumers: `updateTrackerOnTestsRun` → useCodeExecution, `updateTrackerOnCodeChange`
 * → the editor, and `updateTrackerOnMessage` → the chat send flow + the proactive
 * / feedback call sites. Lifted verbatim from the inline definitions in
 * `app/interview/page.tsx` (getCurrentInterviewPhase / updateTrackerOn* /
 * getInterviewerChatParams).
 */
export function useInterviewPhaseTracking({
  sessionContext,
  showPostInterviewDiscussion,
  showFeedback,
  testResults,
  code,
  conversationTracker,
  interviewerMessages,
  starterCode,
  efficiencyMetrics,
  realInterviewMode,
  selectedScenario,
  setConversationTracker,
}: UseInterviewPhaseTrackingOptions) {
  // Get current interview phase based on state
  const getCurrentInterviewPhase = useCallback(
    (): InterviewPhase =>
      deriveInterviewPhase({
        scenarioType: selectedScenario?.type,
        hasCodeChanges: sessionContext
          ? sessionContext.files.some((file) => file.status === "modified")
          : code !== starterCode,
        testsAreCurrent: sessionContext?.testsMatchCurrentRevision,
        showPostInterviewDiscussion,
        showFeedback,
        testResultsLength: testResults.length,
        codeLength: code.length,
        approachExplained: conversationTracker.approachExplained,
        interviewerMessagesLength: interviewerMessages.length,
      }),
    [
      showPostInterviewDiscussion,
      showFeedback,
      testResults.length,
      code,
      starterCode,
      selectedScenario?.type,
      sessionContext,
      conversationTracker.approachExplained,
      interviewerMessages.length,
    ]
  )

  // Update tracker when user sends a message
  const updateTrackerOnMessage = useCallback(
    (message: string, role: "user" | "interviewer") => {
      setConversationTracker((prev) => updateTrackerFromMessage(prev, message, role))
    },
    [setConversationTracker]
  )

  // Update tracker when code changes to detect coding phase
  const updateTrackerOnCodeChange = useCallback(
    (newCode: string) => {
      const hasEdited =
        selectedScenario?.type === "bugfix" ? newCode !== starterCode : newCode.length > 50
      if (hasEdited && !conversationTracker.hasStartedCoding) {
        setConversationTracker((prev) => ({ ...prev, hasStartedCoding: true }))
      }
    },
    [
      conversationTracker.hasStartedCoding,
      selectedScenario?.type,
      starterCode,
      setConversationTracker,
    ]
  )

  // Update tracker when tests run
  const updateTrackerOnTestsRun = useCallback(() => {
    setConversationTracker((prev) => ({ ...prev, hasRunTests: true }))
  }, [setConversationTracker])

  // Build common params for interviewer chat API calls
  const getInterviewerChatParams = useCallback(
    () => ({
      interviewPhase: getCurrentInterviewPhase(),
      conversationTracker,
      hasSubmitted: showPostInterviewDiscussion,
      // Pass starterCodeLength for accurate phase detection (systemic fix)
      starterCodeLength: starterCode.trim().length,
      // Real Interview Mode (fuzzy problem statements)
      realInterviewMode,
      hasFuzzyStatement: !!(selectedScenario as any)?.fuzzyStatement,
      // Pass clarifying questions for fuzzy mode context
      scenarioClarifyingQuestions: (selectedScenario as any)?.clarifyingQuestions,
      scenarioFuzzyStatement: (selectedScenario as any)?.fuzzyStatement,
      // Pass efficiency metrics so interviewer knows if solution is already optimal
      solutionComplexity: efficiencyMetrics
        ? {
            estimated: efficiencyMetrics.estimatedTimeComplexity,
            optimal: efficiencyMetrics.optimalTimeComplexity,
            isOptimal:
              efficiencyMetrics.estimatedTimeComplexity === efficiencyMetrics.optimalTimeComplexity,
            // Include space complexity for real-time validation of user claims
            estimatedSpace: efficiencyMetrics.estimatedSpaceComplexity,
            optimalSpace: efficiencyMetrics.optimalSpaceComplexity,
          }
        : null,
    }),
    [
      getCurrentInterviewPhase,
      conversationTracker,
      showPostInterviewDiscussion,
      starterCode,
      efficiencyMetrics,
      realInterviewMode,
      selectedScenario,
    ]
  )

  return {
    getCurrentInterviewPhase,
    updateTrackerOnMessage,
    updateTrackerOnCodeChange,
    updateTrackerOnTestsRun,
    getInterviewerChatParams,
  }
}
