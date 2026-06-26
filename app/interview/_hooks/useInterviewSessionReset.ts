import type { Dispatch, SetStateAction } from "react"
import type { User as FirebaseUser } from "firebase/auth"
import type { User } from "@/lib/types"
import type { Scenario } from "@/lib/scenarios"
import { updateInterviewSession } from "@/lib/firestore-helpers"
import { extractProtectedElements } from "@/lib/code-protection"
import type { EditorLanguage } from "../_utils/language"
import type {
  ChatMessage,
  EfficiencyMetrics,
  TestResult,
  TestSummary,
  WorkspaceContextFile,
} from "../_types"
import type { HintFeedbackValue } from "./useInterviewMetrics"

type ScoreBreakdown = {
  understandingScore?: number
  problemSolvingScore?: number
  codeQualityScore?: number
  communicationScore?: number
} | null

type StructuredFeedback = {
  whatWorked?: string[]
  fixNext?: string[]
  actionPlan?: string[]
  tldr?: string
} | null

type ClarifyingQuestionsAssessment = {
  score: number
  totalExpected: number
  totalAsked: number
  requiredAsked: number
  requiredTotal: number
  results: Array<{
    question: string
    required: boolean
    asked: boolean
    matchedPhrase?: string
  }>
} | null

interface VoiceController {
  isRecording: boolean
  stopRecording: () => string
  cancelCountdown: () => void
}

export interface UseInterviewSessionResetOptions {
  // Auth
  user: User | null
  firebaseUser: FirebaseUser | null

  // Page state reads
  selectedScenario: Scenario | null
  selectedLanguage: EditorLanguage
  currentSessionId: string | null
  showFeedback: boolean
  showPostInterviewDiscussion: boolean
  testSummary: TestSummary
  performanceScore: number | null
  comprehensiveFeedback: string
  code: string
  testResults: TestResult[]
  efficiencyMetrics: EfficiencyMetrics | null
  technicalScore: number | null
  scoreBreakdown: ScoreBreakdown
  structuredFeedback: StructuredFeedback
  clarifyingQuestionsAssessment: ClarifyingQuestionsAssessment
  streamingFeedback: { state: { isPersisted: boolean } }

  // Page state setters
  setCurrentSessionId: Dispatch<SetStateAction<string | null>>
  setIsInterviewStarted: Dispatch<SetStateAction<boolean>>
  setShowScenarioBrowser: Dispatch<SetStateAction<boolean>>
  setStartTime: (value: number | null) => void
  setTestResults: Dispatch<SetStateAction<TestResult[]>>
  setTestSummary: Dispatch<SetStateAction<TestSummary>>
  setEfficiencyMetrics: Dispatch<SetStateAction<EfficiencyMetrics | null>>
  setElapsedTime: (value: number) => void
  setRevealedHints: Dispatch<SetStateAction<number>>
  setRevealedHintIndices: Dispatch<SetStateAction<Set<number>>>
  setRevealedAIHintIndices: Dispatch<SetStateAction<Set<number>>>
  setHintFeedback: Dispatch<SetStateAction<Map<string, HintFeedbackValue>>>
  setWorkspaceContext: Dispatch<SetStateAction<WorkspaceContextFile[]>>
  setActiveWorkspacePath: Dispatch<SetStateAction<string | null>>
  setComprehensiveFeedback: Dispatch<SetStateAction<string>>
  setPerformanceScore: Dispatch<SetStateAction<number | null>>
  setTechnicalScore: Dispatch<SetStateAction<number | null>>
  setScoreBreakdown: Dispatch<SetStateAction<ScoreBreakdown>>
  setCode: Dispatch<SetStateAction<string>>
  setStarterCode: Dispatch<SetStateAction<string>>
  setProtectedElements: Dispatch<SetStateAction<ReturnType<typeof extractProtectedElements> | null>>
  setInterviewerMessages: Dispatch<SetStateAction<ChatMessage[]>>
  setRecentNudgeTopics: Dispatch<SetStateAction<string[]>>
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>
  setShowFeedback: Dispatch<SetStateAction<boolean>>
  setShowPostInterviewDiscussion: Dispatch<SetStateAction<boolean>>
  setIsGeneratingDiscussion: Dispatch<SetStateAction<boolean>>

  // Refs / callbacks / controllers
  hintAgent: { resetHints: () => void }
  resetBugfixSessionState: () => void
  interviewerVoice: VoiceController
  partnerVoice: VoiceController
  proactiveTimer: NodeJS.Timeout | null
  setProactiveTimer: Dispatch<SetStateAction<NodeJS.Timeout | null>>
  inactivityTimerRef: React.MutableRefObject<NodeJS.Timeout | null>
  hasTriggeredInactivityRef: React.MutableRefObject<boolean>
  hasFetchedHintsRef: React.MutableRefObject<boolean>
  lastCodeChangeRef: React.MutableRefObject<number>
  lastCodeHashRef: React.MutableRefObject<string>
  resetProactiveState: () => void
}

export function useInterviewSessionReset(opts: UseInterviewSessionResetOptions) {
  const resetInterview = async () => {
    // Update session if it exists and was completed
    const isSystemDesign = opts.selectedScenario?.type === "system-design"
    const hasTests = opts.testSummary.total > 0
    const shouldUpdate =
      opts.currentSessionId &&
      (opts.showFeedback || opts.showPostInterviewDiscussion) &&
      (hasTests || isSystemDesign)

    if (shouldUpdate) {
      try {
        // IMPORTANT: Only update session if feedback has NOT been persisted by the streaming flow
        // The persist endpoint saves the authoritative feedback/scores to Firestore
        // We should NOT overwrite that data with potentially stale React state
        const feedbackWasPersisted = opts.streamingFeedback.state.isPersisted

        if (!feedbackWasPersisted) {
          // Feedback wasn't persisted (maybe user left early or streaming failed)
          // Save whatever we have as a fallback
          const scoreToSave =
            opts.performanceScore !== null
              ? opts.performanceScore
              : hasTests
                ? opts.testSummary.passRate
                : 0
          const feedbackText = isSystemDesign
            ? opts.comprehensiveFeedback ||
              `Completed system design interview: ${opts.selectedScenario?.title}`
            : opts.comprehensiveFeedback ||
              `Completed ${opts.selectedScenario?.title} with ${opts.testSummary.passed}/${opts.testSummary.total} tests passing`

          await updateInterviewSession(opts.currentSessionId!, scoreToSave, feedbackText, {
            code: opts.code || (isSystemDesign ? "// Design notes" : ""),
            language: isSystemDesign ? "notes" : opts.selectedLanguage,
            testResults: hasTests ? opts.testResults : undefined,
            timeComplexity: opts.efficiencyMetrics?.estimatedTimeComplexity,
            spaceComplexity: opts.efficiencyMetrics?.estimatedSpaceComplexity,
            efficiencyScore: opts.efficiencyMetrics?.efficiencyScore,
            feedbackStatus: "complete", // Mark as complete even if fallback
            technicalScore: opts.technicalScore ?? undefined,
            scoreBreakdown: opts.scoreBreakdown
              ? {
                  understanding: opts.scoreBreakdown.understandingScore,
                  problemSolving: opts.scoreBreakdown.problemSolvingScore,
                  codeQuality: opts.scoreBreakdown.codeQualityScore,
                  communication: opts.scoreBreakdown.communicationScore,
                }
              : undefined,
            structuredFeedback: opts.structuredFeedback
              ? {
                  ...opts.structuredFeedback,
                  rawFeedback: feedbackText,
                }
              : undefined,
            clarifyingQuestionsAssessment: opts.clarifyingQuestionsAssessment || undefined,
          })
        }
        // If feedbackWasPersisted is true, the persist endpoint already saved the correct data
        // to Firestore, so we don't need to do anything here

        // Store system design notes if not already stored (this is separate from feedback)
        if (isSystemDesign && opts.selectedScenario?.id && opts.user) {
          const scoreForRag =
            opts.performanceScore !== null
              ? opts.performanceScore
              : hasTests
                ? opts.testSummary.passRate
                : 0
          fetch("/api/rag", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "store-solution",
              userId: opts.user.id,
              problemId: opts.selectedScenario.id,
              problemTitle: opts.selectedScenario.title,
              solutionCode: opts.code.trim() || "// Design discussion completed via chat",
              language: "notes",
              passed: true,
              score: scoreForRag,
              problemType: "system-design",
            }),
          }).catch((err) => {
            console.error("System design solution storage error (non-blocking):", err)
          })
        }
      } catch (error) {
        console.error("Error updating session:", error)
        // Silent failure - session data is also saved locally
      }
    }

    // CodeMirror 6 handles cleanup automatically through React lifecycle

    // Clear URL params when resetting
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      url.searchParams.delete("session")
      url.searchParams.delete("scenario")
      window.history.replaceState({}, "", url.toString())
    }

    // Clear auto-save data to prevent "session restored" toast on next visit
    if (opts.firebaseUser && opts.selectedScenario) {
      const storageKey = `interview_autosave_${opts.firebaseUser.uid}_${opts.selectedScenario.id}`
      try {
        localStorage.removeItem(storageKey)
      } catch (e) {
        // Silent failure - localStorage might be unavailable
      }
    }

    // Stop any active voice recordings and countdowns to prevent Deepgram billing
    opts.interviewerVoice.cancelCountdown()
    opts.partnerVoice.cancelCountdown()
    if (opts.interviewerVoice.isRecording) {
      opts.interviewerVoice.stopRecording()
    }
    if (opts.partnerVoice.isRecording) {
      opts.partnerVoice.stopRecording()
    }

    // Clear all proactive interview timers
    if (opts.proactiveTimer) {
      clearTimeout(opts.proactiveTimer)
      opts.setProactiveTimer(null)
    }
    if (opts.inactivityTimerRef.current) {
      clearInterval(opts.inactivityTimerRef.current)
      opts.inactivityTimerRef.current = null
    }
    // Silence-detection teardown + flag reset is owned by useInterviewProactiveAI
    opts.resetProactiveState()

    // Reset proactive trigger flags
    opts.hasTriggeredInactivityRef.current = false
    opts.hasFetchedHintsRef.current = false
    opts.lastCodeChangeRef.current = Date.now()

    opts.setIsInterviewStarted(false)
    opts.setShowFeedback(false)
    opts.setShowPostInterviewDiscussion(false)
    opts.setComprehensiveFeedback("")
    opts.setPerformanceScore(null)
    opts.setTechnicalScore(null)
    opts.setScoreBreakdown(null)
    opts.setIsGeneratingDiscussion(false)
    opts.setShowScenarioBrowser(true)
    opts.setCode("")
    opts.setInterviewerMessages([])
    opts.setChatMessages([])
    opts.setRecentNudgeTopics([])
    opts.setTestResults([])
    opts.setTestSummary({ total: 0, passed: 0, failed: 0, passRate: 0 })
    opts.setStartTime(null)
    opts.setElapsedTime(0)
    opts.lastCodeHashRef.current = ""
    opts.setCurrentSessionId(null)
    opts.setRevealedHints(0)
    opts.setRevealedHintIndices(new Set())
    opts.hintAgent.resetHints()
    opts.setRevealedAIHintIndices(new Set())
    opts.setHintFeedback(new Map())
    opts.setWorkspaceContext([])
    opts.setActiveWorkspacePath(null)
    opts.resetBugfixSessionState()
    opts.setEfficiencyMetrics(null)
    opts.setProtectedElements(null)
    opts.setStarterCode("")
  }

  return { resetInterview }
}
