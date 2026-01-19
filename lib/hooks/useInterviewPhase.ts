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
  type PhaseDetectionContext,
  createEmptyTracker,
  updateTrackerFromMessage,
  detectInterviewPhase,
  buildTrackingContext,
  getHintGuidance,
} from "@/lib/interview/interview-phases"
import { PHASE_PROMPTS } from "@/lib/interview/interviewer-prompts"
import {
  extractTopicsFromMessage,
  extractUserAnsweredTopics,
} from "@/lib/interview/topic-extraction"

export interface UseInterviewPhaseOptions {
  // Starter code length for comparison (passed from page)
  starterCodeLength?: number
}

export interface UseInterviewPhaseReturn {
  // State
  currentPhase: InterviewPhase
  conversationTracker: ConversationTracker
  recentNudgeTopics: string[]
  userAnsweredTopics: string[]
  testsHaveRun: boolean
  hasSubmitted: boolean

  // Derived values
  phasePrompt: string
  trackingContext: string
  hintGuidance: string

  // Actions
  updateFromUserMessage: (message: string) => void
  updateFromInterviewerMessage: (message: string) => void
  markTestsRun: (allPassed: boolean) => void
  markSubmitted: () => void
  updateCodeLength: (length: number) => void
  reset: () => void
}

export function useInterviewPhase(options: UseInterviewPhaseOptions = {}): UseInterviewPhaseReturn {
  const { starterCodeLength = 0 } = options

  const [conversationTracker, setConversationTracker] =
    useState<ConversationTracker>(createEmptyTracker())
  const [recentNudgeTopics, setRecentNudgeTopics] = useState<string[]>([])
  const [userAnsweredTopics, setUserAnsweredTopics] = useState<string[]>([])
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [testsHaveRun, setTestsHaveRun] = useState(false)
  const [currentCodeLength, setCurrentCodeLength] = useState(starterCodeLength)
  const [messageCount, setMessageCount] = useState(0)

  // Derive current phase using DETERMINISTIC signals
  // No regex - just button clicks, code length, and LLM extraction results
  const currentPhase = useMemo(() => {
    const context: PhaseDetectionContext = {
      hasSubmitted,
      testsHaveRun,
      currentCodeLength,
      starterCodeLength,
      approachExplained: conversationTracker.approachExplained,
      messageCount,
    }
    return detectInterviewPhase(context)
  }, [
    hasSubmitted,
    testsHaveRun,
    currentCodeLength,
    starterCodeLength,
    conversationTracker.approachExplained,
    messageCount,
  ])

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
    setTestsHaveRun(true)
    // Also update tracker for compatibility
    setConversationTracker((prev) => ({
      ...prev,
      hasRunTests: true,
    }))
  }, [])

  const markSubmitted = useCallback(() => {
    setHasSubmitted(true)
  }, [])

  const updateCodeLength = useCallback((length: number) => {
    setCurrentCodeLength(length)
  }, [])

  const reset = useCallback(() => {
    setConversationTracker(createEmptyTracker())
    setRecentNudgeTopics([])
    setUserAnsweredTopics([])
    setHasSubmitted(false)
    setTestsHaveRun(false)
    setCurrentCodeLength(starterCodeLength)
    setMessageCount(0)
  }, [starterCodeLength])

  return {
    currentPhase,
    conversationTracker,
    recentNudgeTopics,
    userAnsweredTopics,
    testsHaveRun,
    hasSubmitted,
    phasePrompt,
    trackingContext,
    hintGuidance,
    updateFromUserMessage,
    updateFromInterviewerMessage,
    markTestsRun,
    markSubmitted,
    updateCodeLength,
    reset,
  }
}
