import { useCallback } from "react"
import type { Dispatch, SetStateAction } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { extractTopicsFromMessage } from "@/lib/interview"
import {
  REFUSAL_TITLES,
  UPGRADE_PATH,
  UPGRADE_RESOLVES,
  isKnownRefusalCode,
} from "@/lib/interview/refusal-copy"
import { trackUserMessage, trackAIMessage } from "@/lib/scoring/track-chat"
import { getGuidedChatState } from "@/lib/stores/guided-lab-store"
import type { Scenario } from "@/lib/scenarios"
import type { BugfixEvidenceEvent } from "@/lib/bugfix"
import type { ChatMessage } from "../_types"

/**
 * Fixed id shared by both "session complete" toasts so they never stack (a
 * later toast with the same id replaces the earlier one) and can be dismissed
 * the moment feedback generation starts.
 */
const SESSION_COMPLETE_TOAST_ID = "interview-session-complete"

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
 * Short or ambiguous signals that only conclude the session when they are the
 * entire message. A substring match misfires on ordinary debrief prose: "I could
 * have done better on edge cases" or "all good on the loop, but recursion tripped
 * me up" must NOT end the session.
 */
const WHOLE_MESSAGE_CONCLUSION_SIGNALS = ["done", "all good", "i'm good", "im good"]

/**
 * Single-word signals matched on word boundaries so a real request ("let's
 * conclude") ends the session while "concluded" / "conclusion" inside reflective
 * prose does not.
 */
const WORD_CONCLUSION_SIGNALS = ["conclude"]

/**
 * Unambiguous multi-word phrases that conclude the session wherever they appear
 * in the message.
 */
const PHRASE_CONCLUSION_SIGNALS = [
  "no thanks",
  "no thank",
  "no, thanks",
  "i'm done",
  "im done",
  "end session",
  "that's all",
  "thats all",
  "nothing else",
  "no questions",
  "let's wrap",
  "lets wrap",
]

/**
 * True when the candidate's message asks to end the session. Short or ambiguous
 * signals require a whole-message or word-boundary match so a passing mention in
 * a debrief does not prematurely conclude it; unambiguous multi-word phrases
 * still match anywhere (EDGE-16).
 */
export function isSessionConclusionMessage(message: string): boolean {
  const normalized = message.toLowerCase().trim()
  // Strip surrounding punctuation so "Done." and "all good!" still count as exact.
  const core = normalized.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "")
  if (WHOLE_MESSAGE_CONCLUSION_SIGNALS.includes(core)) return true
  if (WORD_CONCLUSION_SIGNALS.some((signal) => new RegExp(`\\b${signal}\\b`).test(normalized))) {
    return true
  }
  return PHRASE_CONCLUSION_SIGNALS.some((signal) => normalized.includes(signal))
}

// =============================================================================
// Chat error presentation
// =============================================================================
// lib/quota-enforcement.ts already does the hard part: it returns a machine
// readable `code` and a message written for the person reading it ("You've used
// all 8 free sessions for this month. Upgrade to Pro for 35 sessions per month,
// a personalized roadmap, and spaced repetition."). The chat hook then threw the
// code away and rendered every failure as a red toast titled "Rate limit
// reached", with no link anywhere.
//
// That toast fired at the exact moment a user is most willing to pay, and told
// them they had done something wrong. It also only fired on 429, so the 403
// codes (free trial exhausted, subscription lapsed, Pro-only feature) produced
// no toast at all.

// The titles and the upgrade-resolves set now live in lib/interview/refusal-copy.ts,
// shared with the post-interview feedback toast. This file used to own its own
// copy, and it was already missing DAILY_BUDGET_EXCEEDED: that refusal fell
// through to the plain-429 branch and was titled "Too many requests", telling a
// user who had spent their daily AI allowance that they were clicking too fast.

export interface ChatErrorToast {
  title: string
  description: string
  /** True when the toast should carry a link to the upgrade page. */
  showUpgradeAction: boolean
}

/**
 * Turns a failed /api/chat response into the toast a user should see, or null
 * when the failure needs no toast (the message already lands in the transcript).
 *
 * Pure and exported so the mapping can be tested without a rendered chat.
 */
export function buildChatErrorToast(
  status: number,
  data: { code?: unknown; message?: unknown; error?: unknown } | null | undefined
): ChatErrorToast | null {
  const code = typeof data?.code === "string" ? data.code : undefined
  const message = typeof data?.message === "string" ? data.message : undefined
  const error = typeof data?.error === "string" ? data.error : undefined

  // Anything the entitlement layer labelled gets its real message surfaced.
  if (isKnownRefusalCode(code)) {
    return {
      title: REFUSAL_TITLES[code] ?? "We couldn't continue",
      description: message ?? error ?? "Please try again in a moment.",
      showUpgradeAction: UPGRADE_RESOLVES.has(code),
    }
  }

  // Unlabelled 429s are ordinary request-rate throttling, which really is a
  // "slow down" and really does resolve on its own.
  if (status === 429) {
    return {
      title: "Too many requests",
      description: message ?? error ?? "Give it a few seconds and try again.",
      showUpgradeAction: false,
    }
  }

  return null
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
  const router = useRouter()
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
      const isEndingSession = isSessionConclusionMessage(userMessage)

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

          const errorToast = buildChatErrorToast(response.status, data)
          if (errorToast) {
            toast.error(errorToast.title, {
              description: errorToast.description,
              // Longer than the usual 6s: these carry a decision, not just news.
              duration: errorToast.showUpgradeAction ? 12000 : 6000,
              action: errorToast.showUpgradeAction
                ? {
                    label: "See Pro plans",
                    onClick: () => router.push(UPGRADE_PATH),
                  }
                : undefined,
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
              id: SESSION_COMPLETE_TOAST_ID,
              duration: 5000,
              action: {
                label: "See Full Interview Score",
                onClick: () => {
                  toast.dismiss(SESSION_COMPLETE_TOAST_ID)
                  proceedToFinalFeedback()
                },
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
                  id: SESSION_COMPLETE_TOAST_ID,
                  duration: 8000,
                  action: {
                    label: "See Full Interview Score",
                    onClick: () => {
                      toast.dismiss(SESSION_COMPLETE_TOAST_ID)
                      proceedToFinalFeedback()
                    },
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
