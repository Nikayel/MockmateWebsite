import { useCallback } from "react"
import type { Dispatch, SetStateAction } from "react"
import { toast } from "sonner"
import { extractTopicsFromMessage } from "@/lib/interview"
import { trackUserMessage, trackAIMessage } from "@/lib/scoring/track-chat"
import { getGuidedChatState } from "@/lib/stores/guided-lab-store"
import type { Scenario } from "@/lib/scenarios"
import type { BugfixEvidenceEvent } from "@/lib/bugfix"
import type { ChatMessage } from "../_types"

/** Minimal structural shape of the voice controller used by the send flow. */
interface VoiceController {
  isRecording: boolean
  stopRecording: () => void
  resetTranscript: () => void
  clearSentTracker: () => void
}

interface ChatUserProfile {
  full_name?: string
  subscription_tier?: string
}

export interface UseInterviewChatOptions {
  // ---- live inputs read inside handleSendMessage ----
  chatInput: string
  interviewerInput: string
  chatMessages: ChatMessage[]
  interviewerMessages: ChatMessage[]
  interviewerVoice: VoiceController
  partnerVoice: VoiceController
  selectedScenario: Scenario | null
  code: string
  chatWorkspaceContext: unknown
  recentNudgeTopics: string[]
  userAnsweredTopics: string[]
  testResults: unknown[]
  consoleLogs: unknown[]
  currentSessionId: string | null
  firebaseUser: { getIdToken: () => Promise<string> } | null
  user: { id: string; email?: string; user_metadata?: { full_name?: string } } | null
  usageLimit: { used?: number } | null
  experienceLevel: string
  showPostInterviewDiscussion: boolean
  targetCompany: string | null
  bugfixHypothesis: string
  bugfixRootCause: string
  bugfixPrevention: string

  // ---- state setters (page owns the state) ----
  setChatInput: Dispatch<SetStateAction<string>>
  setInterviewerInput: Dispatch<SetStateAction<string>>
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>
  setInterviewerMessages: Dispatch<SetStateAction<ChatMessage[]>>
  setIsLoadingChat: (v: boolean) => void
  setIsLoadingInterviewer: (v: boolean) => void
  setRecentNudgeTopics: Dispatch<SetStateAction<string[]>>

  // ---- injected cross-cutting effects (other slices) ----
  updateTrackerOnMessage: (message: string, role: "user" | "interviewer") => void
  getInterviewerChatParams: () => Record<string, unknown>
  getEdgeCasesForInterviewer: () => { description: string; input: unknown }[]
  getCachedUserProfile: () => Promise<ChatUserProfile | null>
  recordBugfixEvidence: (
    event: Omit<BugfixEvidenceEvent, "timestamp"> & { timestamp?: number }
  ) => void
  classifyBugfixAIHelpKind: (message: string) => NonNullable<BugfixEvidenceEvent["aiHelpKind"]>
  proceedToFinalFeedback: () => void
}

export interface UseInterviewChatReturn {
  handleSendMessage: (isInterviewer?: boolean, messageOverride?: string) => Promise<void>
  handleAutoSend: (isInterviewer: boolean, transcript: string) => Promise<void>
}

/**
 * Owns the interview chat-send flow: `handleSendMessage` (interviewer + partner
 * chat, POST /api/chat) and the voice `handleAutoSend`. Lifted verbatim from the
 * inline implementation in `app/interview/page.tsx`; behavior — request body
 * (incl. the interviewer-only phase/tracker params spread), state writes,
 * side-effect order, error/conclusion branches, and retry — is preserved exactly.
 * Message/input/topic state stays in the page (injected setters); cross-cutting
 * effects owned by other slices are injected as callbacks.
 */
export function useInterviewChat(opts: UseInterviewChatOptions): UseInterviewChatReturn {
  const {
    chatInput,
    interviewerInput,
    chatMessages,
    interviewerMessages,
    interviewerVoice,
    partnerVoice,
    selectedScenario,
    code,
    chatWorkspaceContext,
    recentNudgeTopics,
    userAnsweredTopics,
    testResults,
    consoleLogs,
    currentSessionId,
    firebaseUser,
    user,
    usageLimit,
    experienceLevel,
    showPostInterviewDiscussion,
    targetCompany,
    bugfixHypothesis,
    bugfixRootCause,
    bugfixPrevention,
    setChatInput,
    setInterviewerInput,
    setChatMessages,
    setInterviewerMessages,
    setIsLoadingChat,
    setIsLoadingInterviewer,
    setRecentNudgeTopics,
    updateTrackerOnMessage,
    getInterviewerChatParams,
    getEdgeCasesForInterviewer,
    getCachedUserProfile,
    recordBugfixEvidence,
    classifyBugfixAIHelpKind,
    proceedToFinalFeedback,
  } = opts

  const handleSendMessage = async (isInterviewer = false, messageOverride?: string) => {
    const input = messageOverride ?? (isInterviewer ? interviewerInput : chatInput)
    const setInput = isInterviewer ? setInterviewerInput : setChatInput
    const messages = isInterviewer ? interviewerMessages : chatMessages
    const setMessages = isInterviewer ? setInterviewerMessages : setChatMessages
    const setLoading = isInterviewer ? setIsLoadingInterviewer : setIsLoadingChat

    const userMessage = input.trim()

    if (userMessage) {
      const newUserMessage: ChatMessage = { type: "user", message: userMessage }
      setMessages((prev) => [...prev, newUserMessage])
      setLoading(true)

      // Reset voice state first so late WS/onTranscript callbacks don't repopulate input
      const voice = isInterviewer ? interviewerVoice : partnerVoice
      if (voice.isRecording) {
        voice.stopRecording()
      }
      voice.resetTranscript()
      voice.clearSentTracker()

      setInput("")
      // Deferred clear wins over any in-flight onTranscript from queued WebSocket messages
      const clearInput = setInput
      setTimeout(() => clearInput(""), 0)

      // Track user message for conversation context (phase tracking)
      if (isInterviewer) {
        updateTrackerOnMessage(userMessage, "user")
      }

      if (!isInterviewer && selectedScenario?.type === "bugfix") {
        recordBugfixEvidence({
          type: "ai_help_requested",
          aiHelpKind: classifyBugfixAIHelpKind(userMessage),
          text: userMessage.slice(0, 240),
        })
      }

      // Track user message for scoring (fire-and-forget)
      if (currentSessionId && firebaseUser) {
        firebaseUser
          .getIdToken()
          .then((token) => {
            trackUserMessage(
              currentSessionId,
              userMessage,
              isInterviewer ? "interviewer" : "partner",
              token
            )
          })
          .catch(() => {}) // Silently ignore tracking errors
      }

      // Check if user wants to end the session
      const conclusionSignals = [
        "no thanks",
        "no thank",
        "no, thanks",
        "i'm done",
        "im done",
        "done",
        "conclude",
        "end session",
        "that's all",
        "thats all",
        "nothing else",
        "no questions",
        "i'm good",
        "im good",
        "all good",
        "let's wrap",
        "lets wrap",
      ]
      const isEndingSession = conclusionSignals.some((signal) =>
        userMessage.toLowerCase().includes(signal)
      )

      try {
        // Get user profile for context
        const userProfile = await getCachedUserProfile()

        // Extract name for personalization
        const userName =
          user?.user_metadata?.full_name ||
          userProfile?.full_name ||
          user?.email?.split("@")[0] ||
          ""

        // Add post-interview context if in that phase
        let additionalContext = ""
        if (showPostInterviewDiscussion && isInterviewer) {
          additionalContext = isEndingSession
            ? "\n\n[IMPORTANT: The candidate wants to end the session. Respond with a brief, graceful conclusion. Thank them, give a quick summary of their performance, and wish them luck. Do NOT ask more questions.]"
            : "\n\n[POST-INTERVIEW DISCUSSION: Continue discussing their solution. If they indicate they're done or have no questions, wrap up gracefully.]"
        }

        if (!firebaseUser) {
          setMessages((prev) => [...prev, { type: "ai", message: "Please sign in to continue." }])
          return
        }
        const idToken = await firebaseUser.getIdToken()
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            message: userMessage + additionalContext,
            context: messages,
            role: isInterviewer ? "interviewer" : "partner",
            userContext: userProfile
              ? {
                  email: user?.email,
                  full_name: userName,
                  subscription_tier: userProfile.subscription_tier,
                  sessions_used: usageLimit?.used || 0,
                  skill_level: experienceLevel,
                }
              : { skill_level: experienceLevel },
            workspaceContext: chatWorkspaceContext,
            currentCode: code,
            scenarioTitle: selectedScenario?.title,
            scenarioType: selectedScenario?.type,
            guidedLab: getGuidedChatState(selectedScenario?.id),
            bugfixReflection:
              selectedScenario?.type === "bugfix"
                ? {
                    hypothesis: bugfixHypothesis,
                    rootCause: bugfixRootCause,
                    prevention: bugfixPrevention,
                  }
                : undefined,
            scenarioCompany: targetCompany, // Target company for RAG context
            isProactive: false,
            isPostInterview: showPostInterviewDiscussion,
            isEndingSession: isEndingSession,
            edgeCases: isInterviewer ? getEdgeCasesForInterviewer() : undefined,
            // Pass recent topics to prevent repetitive questions
            recentNudgeTopics: isInterviewer ? recentNudgeTopics : undefined,
            // Pass topics the user has already answered to prevent re-asking
            userAnsweredTopics: isInterviewer ? userAnsweredTopics : undefined,
            // Pass test results and console logs for interviewer awareness
            testResults: isInterviewer ? testResults : undefined,
            consoleLogs: isInterviewer ? consoleLogs : undefined,
            // Phase-aware interview tracking (only for interviewer)
            ...(isInterviewer ? getInterviewerChatParams() : {}),
          }),
        })

        const data = await response.json()
        if (!response.ok) {
          console.warn("[API] Request failed:", response.status, response.url, data)
          const errorMsg = data?.message || data?.error || "Something went wrong. Please try again."
          setMessages((prev) => [...prev, { type: "ai", message: errorMsg }])
          if (response.status === 429) {
            toast.error("Rate limit reached", {
              description: errorMsg,
              duration: 6000,
            })
          }
          return
        }

        // Check if conversation has ended (AI already said goodbye)
        if (data.conversationEnded) {
          // Show end session prompt instead of continuing conversation
          toast.info(
            data.endMessage ||
              "Session complete! Click 'See Full Interview Score' to see your results.",
            {
              duration: 5000,
              action: {
                label: "See Full Interview Score",
                onClick: proceedToFinalFeedback,
              },
            }
          )
          // Don't add any message - just prompt to end
          return
        }

        if (data.reply) {
          setMessages((prev) => [...prev, { type: "ai", message: data.reply }])

          // Track topics from interviewer messages to avoid repetitive questions
          if (isInterviewer) {
            const newTopics = extractTopicsFromMessage(data.reply)
            if (newTopics.length > 0) {
              setRecentNudgeTopics((prev) => {
                const updated = [...prev, ...newTopics]
                // Keep only last 10 topics to avoid memory bloat
                return updated.slice(-10)
              })
            }
            // Track interviewer response for conversation context (phase tracking)
            updateTrackerOnMessage(data.reply, "interviewer")
          }

          // Track AI response for scoring (fire-and-forget)
          if (currentSessionId && firebaseUser) {
            firebaseUser
              .getIdToken()
              .then((token) => {
                trackAIMessage(
                  currentSessionId,
                  data.reply,
                  isInterviewer ? "interviewer" : "partner",
                  token
                )
              })
              .catch(() => {}) // Silently ignore tracking errors
          }

          // Check if this is the final farewell response
          if (data.conversationEnded === true) {
            // Show prompt to end session after the final message
            setTimeout(() => {
              toast.info(
                "Click 'See Full Interview Score' to see your score breakdown and analysis.",
                {
                  duration: 8000,
                  action: {
                    label: "See Full Interview Score",
                    onClick: proceedToFinalFeedback,
                  },
                }
              )
            }, 1500) // Wait for message to appear first
          }

          // For system design interviews, store design notes when session ends
          const isSystemDesign = selectedScenario?.type === "system-design"
          if (isSystemDesign && isEndingSession && selectedScenario?.id && user) {
            // Store design notes (even if empty - chat-only submission)
            fetch("/api/rag", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "store-solution",
                userId: user.id,
                problemId: selectedScenario.id,
                problemTitle: selectedScenario.title,
                solutionCode: code.trim() || "// Design discussion completed via chat",
                language: "notes",
                passed: true, // System design has no tests
                score: 0, // Will be calculated by feedback system
                problemType: "system-design",
              }),
            }).catch((err) => {
              console.error("System design solution storage error (non-blocking):", err)
            })
          }
        } else {
          setMessages((prev) => [
            ...prev,
            { type: "ai", message: "Sorry, I encountered an error. Please try again." },
          ])
        }
      } catch (error) {
        console.error("Chat error:", error)
        setMessages((prev) => [
          ...prev,
          { type: "ai", message: "Sorry, I couldn't process that. Please try again." },
        ])
        toast.error("Failed to send message", {
          description: "Network error. Please check your connection and try again.",
          duration: 6000,
          action: {
            label: "Retry",
            onClick: () => handleSendMessage(isInterviewer, userMessage),
          },
        })
      } finally {
        setLoading(false)
      }
    }
  }

  // Auto-send handler for voice input - called when user pauses speaking
  const handleAutoSend = useCallback(
    async (isInterviewer: boolean, transcript: string) => {
      const setInput = isInterviewer ? setInterviewerInput : setChatInput
      const voice = isInterviewer ? interviewerVoice : partnerVoice

      // Update input with final transcript
      const userMessage = transcript.trim()
      if (!userMessage) return

      setInput(userMessage)

      // Stop recording
      if (voice.isRecording) {
        voice.stopRecording()
      }

      // Send the message
      await handleSendMessage(isInterviewer, userMessage)
    },
    [interviewerVoice, partnerVoice, handleSendMessage]
  )

  return { handleSendMessage, handleAutoSend }
}
