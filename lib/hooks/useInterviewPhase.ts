/**
 * useInterviewPhase Hook
 *
 * Manages interview phase tracking using the conversation tracker
 * from lib/interview/interview-phases.ts
 */

import { useState, useCallback, useMemo } from "react"
import {
  type InterviewPhase,
  type ConversationTracker,
  createEmptyTracker,
  updateTrackerFromMessage,
  detectInterviewPhase,
  buildTrackingContext,
  PHASE_PROMPTS,
  getHintGuidance,
} from "@/lib/interview/interview-phases"
import {
  extractTopicsFromMessage,
  extractUserAnsweredTopics,
} from "@/lib/interview/topic-extraction"

export interface UseInterviewPhaseReturn {
  // State
  currentPhase: InterviewPhase
  conversationTracker: ConversationTracker
  recentNudgeTopics: string[]
  userAnsweredTopics: string[]

  // Derived values
  phasePrompt: string
  trackingContext: string
  hintGuidance: string

  // Actions
  updateFromUserMessage: (message: string) => void
  updateFromInterviewerMessage: (message: string) => void
  markTestsRun: (allPassed: boolean) => void
  markSubmitted: () => void
  markCodingStarted: () => void
  reset: () => void
}

export function useInterviewPhase(): UseInterviewPhaseReturn {
  const [conversationTracker, setConversationTracker] =
    useState<ConversationTracker>(createEmptyTracker())
  const [recentNudgeTopics, setRecentNudgeTopics] = useState<string[]>([])
  const [userAnsweredTopics, setUserAnsweredTopics] = useState<string[]>([])
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [messageCount, setMessageCount] = useState(0)

  // Derive current phase from tracker state
  const currentPhase = useMemo(() => {
    return detectInterviewPhase({
      messageCount,
      hasExplainedApproach: conversationTracker.approachExplained,
      hasStartedCoding: conversationTracker.hasStartedCoding,
      testsHaveRun: conversationTracker.hasRunTests,
      allTestsPassed: false, // This would need test results to determine
      hasSubmitted,
    })
  }, [conversationTracker, hasSubmitted, messageCount])

  // Get phase-specific prompt
  const phasePrompt = useMemo(() => {
    return PHASE_PROMPTS[currentPhase]
  }, [currentPhase])

  // Get tracking context for AI prompt
  const trackingContext = useMemo(() => {
    return buildTrackingContext(conversationTracker)
  }, [conversationTracker])

  // Get hint guidance based on hints given
  const hintGuidance = useMemo(() => {
    return getHintGuidance(conversationTracker.hintsGiven)
  }, [conversationTracker.hintsGiven])

  const updateFromUserMessage = useCallback((message: string) => {
    setMessageCount((prev) => prev + 1)

    // Update conversation tracker
    setConversationTracker((prev) => updateTrackerFromMessage(prev, message, "user"))

    // Extract and track topics the user has answered
    const answeredTopics = extractUserAnsweredTopics(message)
    if (answeredTopics.length > 0) {
      setUserAnsweredTopics((prev) => [...new Set([...prev, ...answeredTopics])])
    }
  }, [])

  const updateFromInterviewerMessage = useCallback((message: string) => {
    setMessageCount((prev) => prev + 1)

    // Update conversation tracker
    setConversationTracker((prev) => updateTrackerFromMessage(prev, message, "interviewer"))

    // Extract topics from interviewer message to track what was asked
    const topics = extractTopicsFromMessage(message)
    if (topics.length > 0) {
      setRecentNudgeTopics((prev) => [...new Set([...prev, ...topics])])
    }
  }, [])

  const markTestsRun = useCallback((allPassed: boolean) => {
    setConversationTracker((prev) => ({
      ...prev,
      hasRunTests: true,
    }))
  }, [])

  const markSubmitted = useCallback(() => {
    setHasSubmitted(true)
  }, [])

  const markCodingStarted = useCallback(() => {
    setConversationTracker((prev) => ({
      ...prev,
      hasStartedCoding: true,
    }))
  }, [])

  const reset = useCallback(() => {
    setConversationTracker(createEmptyTracker())
    setRecentNudgeTopics([])
    setUserAnsweredTopics([])
    setHasSubmitted(false)
    setMessageCount(0)
  }, [])

  return {
    currentPhase,
    conversationTracker,
    recentNudgeTopics,
    userAnsweredTopics,
    phasePrompt,
    trackingContext,
    hintGuidance,
    updateFromUserMessage,
    updateFromInterviewerMessage,
    markTestsRun,
    markSubmitted,
    markCodingStarted,
    reset,
  }
}
