import {
  type InterviewPhase,
  type ConversationTracker,
  type PhaseDetectionContext,
  detectInterviewPhase,
} from "@/lib/interview/interview-phases"
import type { TestResultItem } from "@/lib/interview/chat-request-schema"
import { phaseService } from "@/lib/services/phase-service"
import { getFlag } from "@/lib/feature-flags"
import { logger } from "@/lib/logger"
import { detectDebuggingPhase } from "@/lib/interview/phases/debugging"
import type { ChatRequestContext } from "./request-context"

export interface ChatInterviewState {
  currentPhase: InterviewPhase
  phaseContext: PhaseDetectionContext
  tracker: ConversationTracker | undefined
  testsHaveRunNow: boolean
  testResultsArray: TestResultItem[] | undefined
  currentCodeLen: number
  starterLen: number
}

export function resolveChatInterviewState(request: ChatRequestContext): ChatInterviewState {
  const {
    sessionContext,
    scenarioType,
    testsHaveRun,
    currentCodeLength,
    starterCodeLength,
    conversationTracker,
    hasSubmitted,
    messageCount,
    testResults,
  } = request
  const tracker = conversationTracker as unknown as ConversationTracker | undefined
  const isBugFix = scenarioType === "bugfix"
  const testResultsArray =
    sessionContext && !sessionContext.testsMatchCurrentRevision ? [] : testResults
  // Build phase-specific context using DETERMINISTIC signals
  // No longer relies on frontend-passed interviewPhase - we compute it here
  const testsHaveRunNow =
    testsHaveRun && (!sessionContext || sessionContext.testsMatchCurrentRevision)
  const currentCodeLen = currentCodeLength
  const starterLen = starterCodeLength

  const phaseContext: PhaseDetectionContext = {
    hasSubmitted: hasSubmitted || false,
    testsHaveRun: testsHaveRunNow || false,
    currentCodeLength: currentCodeLen,
    starterCodeLength: starterLen,
    approachExplained: tracker?.approachExplained,
    messageCount,
  }

  // Feature flag: Use phase service or direct call
  let currentPhase: InterviewPhase
  if (getFlag("USE_PHASE_SERVICE")) {
    const phaseResult = phaseService({
      hasSubmitted: hasSubmitted || false,
      testsHaveRun: testsHaveRunNow || false,
      currentCodeLength: currentCodeLen,
      starterCodeLength: starterLen,
      approachExplained: tracker?.approachExplained || false,
      messageCount,
    })
    currentPhase = phaseResult.phase
    logger.debug("[Chat API] Phase detected via service", {
      phase: currentPhase,
      codeWritten: phaseResult.metadata.codeWritten,
    })
  } else {
    // Original code path
    currentPhase = detectInterviewPhase(phaseContext)
  }

  if (isBugFix && sessionContext) {
    currentPhase = detectDebuggingPhase({
      hasSubmitted: hasSubmitted || false,
      hasCodeChanges: sessionContext.files.some((file) => file.status === "modified"),
      testsAreCurrent: Boolean(testsHaveRunNow),
      hasTestResults: Boolean(testResults?.length),
      approachExplained: Boolean(phaseContext.approachExplained),
    })
  }

  // Debug logging for phase detection
  logger.info("[Chat API] Phase detection", {
    currentPhase,
    messageCount,
    approachExplained: phaseContext.approachExplained,
  })

  return {
    currentPhase,
    phaseContext,
    tracker,
    testsHaveRunNow,
    testResultsArray,
    currentCodeLen,
    starterLen,
  }
}
