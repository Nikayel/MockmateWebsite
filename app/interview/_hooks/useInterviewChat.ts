/**
 * useInterviewChat Hook
 *
 * Handles all chat-related functionality: sending messages, voice input,
 * proactive interviewer, post-interview discussion.
 * ~400 lines - focused on chat/message handling only.
 */

import { useCallback, useRef, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useInterviewStore } from "@/lib/stores"
import { useRoadmapStore } from "@/lib/stores/roadmap-store"
import { getUserProfile } from "@/lib/firestore-helpers"
import { trackUserMessage, trackAIMessage } from "@/lib/scoring/track-chat"
import { toast } from "sonner"
import {
  type InterviewPhase,
  type ConversationTracker,
  updateTrackerFromMessage,
} from "@/lib/interview/interview-phases"
import { extractTopicsFromMessage, analyzeCodeEfficiency } from "@/lib/interview"
import type { ChatMessage, TestResult, TestSummary, EfficiencyMetrics } from "../_providers"

interface UseInterviewChatProps {
  // State
  selectedScenario: { id: string; title: string; type: string } | null
  currentSessionId: string | null
  code: string
  interviewerMessages: ChatMessage[]
  chatMessages: ChatMessage[]
  interviewerInput: string
  chatInput: string
  testResults: TestResult[]
  consoleLogs: Array<{ type: string; message: string }>
  efficiencyMetrics: EfficiencyMetrics | null
  conversationTracker: ConversationTracker
  showPostInterviewDiscussion: boolean
  recentNudgeTopics: string[]
  elapsedTime: number
  workspaceContext: Array<{ path: string; content: string }>
  // Setters
  setInterviewerMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  setInterviewerInput: (input: string) => void
  setChatInput: (input: string) => void
  setConversationTracker: React.Dispatch<React.SetStateAction<ConversationTracker>>
  setRecentNudgeTopics: React.Dispatch<React.SetStateAction<string[]>>
  setShowPostInterviewDiscussion: (show: boolean) => void
  setIsGeneratingDiscussion: (generating: boolean) => void
  // Phase
  getCurrentInterviewPhase: () => InterviewPhase
}

export function useInterviewChat(props: UseInterviewChatProps) {
  const { user, firebaseUser } = useAuth()
  const { targetCompany } = useInterviewStore()
  const { activeRoadmap } = useRoadmapStore()
  const experienceLevel = activeRoadmap?.assessment?.experienceLevel || "intermediate"

  const lastInterviewerMessageRef = useRef<number>(Date.now())

  // Update tracker when message is sent/received
  const updateTrackerOnMessage = useCallback(
    (message: string, role: "user" | "interviewer") => {
      props.setConversationTracker((prev) => updateTrackerFromMessage(prev, message, role))
    },
    [props.setConversationTracker]
  )

  // Get params for interviewer chat API
  const getInterviewerChatParams = useCallback(() => {
    return {
      interviewPhase: props.getCurrentInterviewPhase(),
      conversationTracker: props.conversationTracker,
      hasSubmitted: props.showPostInterviewDiscussion,
      solutionComplexity: props.efficiencyMetrics
        ? {
            estimated: props.efficiencyMetrics.estimatedTimeComplexity,
            optimal: props.efficiencyMetrics.optimalTimeComplexity,
            isOptimal:
              props.efficiencyMetrics.estimatedTimeComplexity ===
              props.efficiencyMetrics.optimalTimeComplexity,
          }
        : null,
    }
  }, [
    props.getCurrentInterviewPhase,
    props.conversationTracker,
    props.showPostInterviewDiscussion,
    props.efficiencyMetrics,
  ])

  // Send message to interviewer or partner
  const handleSendMessage = useCallback(
    async (isInterviewer = false) => {
      const input = isInterviewer ? props.interviewerInput : props.chatInput
      const setInput = isInterviewer ? props.setInterviewerInput : props.setChatInput
      const messages = isInterviewer ? props.interviewerMessages : props.chatMessages
      const setMessages = isInterviewer ? props.setInterviewerMessages : props.setChatMessages

      if (!input.trim()) return

      const newUserMessage: ChatMessage = { type: "user", message: input }
      setMessages((prev) => [...prev, newUserMessage])
      setInput("")

      // Track for phase system
      if (isInterviewer) {
        updateTrackerOnMessage(input, "user")
      }

      // Track for scoring
      if (props.currentSessionId && firebaseUser) {
        firebaseUser
          .getIdToken()
          .then((token) => {
            trackUserMessage(
              props.currentSessionId!,
              input,
              isInterviewer ? "interviewer" : "partner",
              token
            )
          })
          .catch(() => {})
      }

      // Check for session end signals
      const conclusionSignals = [
        "no thanks",
        "i'm done",
        "done",
        "end session",
        "that's all",
        "nothing else",
        "no questions",
        "i'm good",
        "all good",
      ]
      const isEndingSession = conclusionSignals.some((signal) =>
        input.toLowerCase().includes(signal)
      )

      try {
        const userProfile = user ? await getUserProfile(user.id) : null
        const userName =
          user?.user_metadata?.full_name ||
          userProfile?.full_name ||
          user?.email?.split("@")[0] ||
          ""

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: input,
            context: messages,
            role: isInterviewer ? "interviewer" : "partner",
            userContext: userProfile
              ? {
                  email: user?.email,
                  full_name: userName,
                  subscription_tier: userProfile.subscription_tier,
                  skill_level: experienceLevel,
                }
              : { skill_level: experienceLevel },
            workspaceContext: props.workspaceContext,
            currentCode: props.code,
            scenarioTitle: props.selectedScenario?.title,
            scenarioType: props.selectedScenario?.type,
            scenarioCompany: targetCompany,
            isProactive: false,
            isPostInterview: props.showPostInterviewDiscussion,
            isEndingSession,
            testResults: isInterviewer ? props.testResults : undefined,
            consoleLogs: isInterviewer ? props.consoleLogs : undefined,
            recentNudgeTopics: isInterviewer ? props.recentNudgeTopics : undefined,
            ...(isInterviewer ? getInterviewerChatParams() : {}),
          }),
        })

        const data = await response.json()

        if (data.reply) {
          setMessages((prev) => [...prev, { type: "ai", message: data.reply }])

          if (isInterviewer) {
            lastInterviewerMessageRef.current = Date.now()
            updateTrackerOnMessage(data.reply, "interviewer")

            // Track topics
            const newTopics = extractTopicsFromMessage(data.reply)
            if (newTopics.length > 0) {
              props.setRecentNudgeTopics((prev) => [...prev, ...newTopics].slice(-10))
            }
          }

          // Track for scoring
          if (props.currentSessionId && firebaseUser) {
            firebaseUser
              .getIdToken()
              .then((token) => {
                trackAIMessage(
                  props.currentSessionId!,
                  data.reply,
                  isInterviewer ? "interviewer" : "partner",
                  token
                )
              })
              .catch(() => {})
          }
        }
      } catch (error) {
        console.error("Error sending message:", error)
        toast.error("Failed to send message")
      }
    },
    [
      props.interviewerInput,
      props.chatInput,
      props.interviewerMessages,
      props.chatMessages,
      props.currentSessionId,
      props.code,
      props.selectedScenario,
      props.showPostInterviewDiscussion,
      props.testResults,
      props.consoleLogs,
      props.recentNudgeTopics,
      props.workspaceContext,
      user,
      firebaseUser,
      targetCompany,
      experienceLevel,
      getInterviewerChatParams,
      updateTrackerOnMessage,
    ]
  )

  // Trigger post-interview discussion
  const triggerPostInterviewDiscussion = useCallback(
    async (testResults: TestResult[], summary: TestSummary) => {
      if (!props.selectedScenario) return

      props.setIsGeneratingDiscussion(true)

      try {
        const metrics = analyzeCodeEfficiency(props.code)
        const userProfile = user ? await getUserProfile(user.id) : null

        const discussionPrompt = `[POST-INTERVIEW DISCUSSION] The candidate has submitted their solution.

TEST RESULTS: ${summary.passed}/${summary.total} tests passed (${summary.passRate}% pass rate)
TIME SPENT: ${Math.floor(props.elapsedTime / 60)} minutes
EFFICIENCY: ${metrics.estimatedTimeComplexity} time, ${metrics.estimatedSpaceComplexity} space

Provide a brief summary of their performance. Keep it to 2-3 sentences.`

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: discussionPrompt,
            context: props.interviewerMessages,
            role: "interviewer",
            userContext: userProfile
              ? {
                  email: user?.email,
                  subscription_tier: userProfile.subscription_tier,
                  skill_level: experienceLevel,
                }
              : { skill_level: experienceLevel },
            workspaceContext: props.workspaceContext,
            currentCode: props.code,
            scenarioTitle: props.selectedScenario?.title,
            scenarioType: props.selectedScenario?.type,
            scenarioCompany: targetCompany,
            isProactive: false,
            testResults,
            consoleLogs: props.consoleLogs,
            // Explicit phase params (React state timing issue)
            interviewPhase: "post_interview" as const,
            conversationTracker: props.conversationTracker,
            hasSubmitted: true,
            solutionComplexity: props.efficiencyMetrics
              ? {
                  estimated: props.efficiencyMetrics.estimatedTimeComplexity,
                  optimal: props.efficiencyMetrics.optimalTimeComplexity,
                  isOptimal:
                    props.efficiencyMetrics.estimatedTimeComplexity ===
                    props.efficiencyMetrics.optimalTimeComplexity,
                }
              : null,
          }),
        })

        const data = await response.json()

        if (data.reply) {
          props.setInterviewerMessages((prev) => [...prev, { type: "ai", message: data.reply }])
          updateTrackerOnMessage(data.reply, "interviewer")
        }
      } catch (error) {
        console.error("Error in post-interview discussion:", error)
        toast.error("Failed to start discussion")
      } finally {
        props.setIsGeneratingDiscussion(false)
      }
    },
    [
      props.selectedScenario,
      props.code,
      props.elapsedTime,
      props.interviewerMessages,
      props.consoleLogs,
      props.conversationTracker,
      props.efficiencyMetrics,
      props.workspaceContext,
      user,
      targetCompany,
      experienceLevel,
      updateTrackerOnMessage,
    ]
  )

  // Proactive interviewer (when user is idle)
  const triggerProactiveInterviewer = useCallback(async () => {
    if (!props.selectedScenario || props.showPostInterviewDiscussion) return

    try {
      const userProfile = user ? await getUserProfile(user.id) : null

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "[PROACTIVE] The candidate has been quiet. Check in with them.",
          context: props.interviewerMessages,
          role: "interviewer",
          userContext: userProfile
            ? { email: user?.email, skill_level: experienceLevel }
            : { skill_level: experienceLevel },
          currentCode: props.code,
          scenarioTitle: props.selectedScenario?.title,
          scenarioType: props.selectedScenario?.type,
          scenarioCompany: targetCompany,
          isProactive: true,
          recentNudgeTopics: props.recentNudgeTopics,
          ...getInterviewerChatParams(),
        }),
      })

      const data = await response.json()

      if (data.reply) {
        props.setInterviewerMessages((prev) => [...prev, { type: "ai", message: data.reply }])
        lastInterviewerMessageRef.current = Date.now()
        updateTrackerOnMessage(data.reply, "interviewer")

        const newTopics = extractTopicsFromMessage(data.reply)
        if (newTopics.length > 0) {
          props.setRecentNudgeTopics((prev) => [...prev, ...newTopics].slice(-10))
        }
      }
    } catch (error) {
      console.error("Error in proactive interviewer:", error)
    }
  }, [
    props.selectedScenario,
    props.showPostInterviewDiscussion,
    props.interviewerMessages,
    props.code,
    props.recentNudgeTopics,
    user,
    targetCompany,
    experienceLevel,
    getInterviewerChatParams,
    updateTrackerOnMessage,
  ])

  return {
    handleSendMessage,
    triggerPostInterviewDiscussion,
    triggerProactiveInterviewer,
    updateTrackerOnMessage,
    getInterviewerChatParams,
    lastInterviewerMessageRef,
  }
}

export type UseInterviewChatReturn = ReturnType<typeof useInterviewChat>
