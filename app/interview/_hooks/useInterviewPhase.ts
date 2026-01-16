/**
 * useInterviewPhase Hook
 *
 * Handles interview phase detection and conversation tracking.
 * ~100 lines - focused on phase management only.
 */

import { useCallback } from "react"
import {
  type InterviewPhase,
  type ConversationTracker,
  createEmptyTracker,
  updateTrackerFromMessage,
} from "@/lib/interview/interview-phases"

interface UseInterviewPhaseProps {
  // State
  showPostInterviewDiscussion: boolean
  showFeedback: boolean
  testResultsCount: number
  codeLength: number
  interviewerMessagesCount: number
  conversationTracker: ConversationTracker
  // Setters
  setConversationTracker: React.Dispatch<React.SetStateAction<ConversationTracker>>
}

export function useInterviewPhase(props: UseInterviewPhaseProps) {
  // Determine current interview phase
  const getCurrentInterviewPhase = useCallback((): InterviewPhase => {
    // If in post-interview discussion, they've submitted
    if (props.showPostInterviewDiscussion) return "post_interview"

    // If showing feedback, complete
    if (props.showFeedback) return "complete"

    // If tests have run, testing phase
    if (props.testResultsCount > 0) return "testing"

    // If code has been written, coding phase
    if (props.codeLength > 50) return "coding"

    // If they've explained approach (based on tracker), discussion phase
    if (props.conversationTracker.approachExplained) return "discussion"

    // If few messages, still intro
    if (props.interviewerMessagesCount <= 2) return "intro"

    // Default to discussion
    return "discussion"
  }, [
    props.showPostInterviewDiscussion,
    props.showFeedback,
    props.testResultsCount,
    props.codeLength,
    props.conversationTracker.approachExplained,
    props.interviewerMessagesCount,
  ])

  // Update tracker when user sends a message
  const updateTrackerOnMessage = useCallback(
    (message: string, role: "user" | "interviewer") => {
      props.setConversationTracker((prev) => updateTrackerFromMessage(prev, message, role))
    },
    [props.setConversationTracker]
  )

  // Update tracker when code changes (detect coding phase)
  const updateTrackerOnCodeChange = useCallback(
    (codeLength: number) => {
      if (codeLength > 50 && !props.conversationTracker.hasStartedCoding) {
        props.setConversationTracker((prev) => ({ ...prev, hasStartedCoding: true }))
      }
    },
    [props.conversationTracker.hasStartedCoding, props.setConversationTracker]
  )

  // Update tracker when tests run
  const updateTrackerOnTestsRun = useCallback(() => {
    props.setConversationTracker((prev) => ({ ...prev, hasRunTests: true }))
  }, [props.setConversationTracker])

  // Reset tracker
  const resetTracker = useCallback(() => {
    props.setConversationTracker(createEmptyTracker())
  }, [props.setConversationTracker])

  return {
    getCurrentInterviewPhase,
    updateTrackerOnMessage,
    updateTrackerOnCodeChange,
    updateTrackerOnTestsRun,
    resetTracker,
  }
}

export type UseInterviewPhaseReturn = ReturnType<typeof useInterviewPhase>
