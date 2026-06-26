"use client"

import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import nextDynamic from "next/dynamic"
import { useShallow } from "zustand/react/shallow"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { ErrorBoundary } from "@/components/error-boundary"
import { useVoiceInput } from "@/lib/voice"
import { getDbLazy } from "@/lib/firebase-lazy"
import { collection, getDocs, query, where } from "firebase/firestore"
import { ArrowLeft } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import type { Profile } from "@/lib/types"
import {
  recordSessionStart,
  getUserProfile,
  createInterviewSession,
  updateInterviewSession,
  saveSessionState,
  getSessionState,
  findLatestSubmittedSession,
  markSessionEvaluating,
} from "@/lib/firestore-helpers"
import { markFreeTrialUsed, saveGuestSessionData } from "@/lib/guest-session"
import { SignupPrompt } from "@/components/SignupPrompt"
import { useRoadmapStore } from "@/lib/stores/roadmap-store"
import { useInterviewStore, type InterviewTargetCompany } from "@/lib/stores"
import type { CompanyId } from "@/lib/data/company-questions/types"
import { getScenarioById, type Scenario } from "@/lib/scenarios"
import type { BugFixScenario } from "@/lib/scenarios/types"
import { extractProtectedElements, validateCodeProtection } from "@/lib/code-protection"
import { toast } from "sonner"
// Interview phase tracking
import {
  type InterviewPhase,
  type ConversationTracker,
  createEmptyTracker,
} from "@/lib/interview/interview-phases"
// Extracted utilities
import {
  extractTopicsFromMessage,
  analyzeCodeEfficiency,
  analyzeComplexityWithLLM,
  type LLMComplexityResult,
} from "@/lib/interview"
// Local page components
import { PostInterviewView, FeedbackLoadingState } from "./_components"
import { InterviewDialogs } from "./_components/InterviewDialogs"
import { ChatColumn } from "./_components/ChatColumn"
import { EditorColumn } from "./_components/EditorColumn"
import { ProblemColumn } from "./_components/ProblemColumn"
import { FocusProblemPeek } from "./_components/FocusProblemPeek"
import { InterviewTopBar } from "./_components/InterviewTopBar"
import { BugfixOnboardingTour } from "./_components/BugfixOnboardingTour"
// Streaming feedback - Edge function with no timeout
import { useStreamingFeedback } from "@/lib/hooks/use-streaming-feedback"
import { useHintAgent } from "@/lib/hooks/useHintAgent"
import {
  getInitialInterviewerMessage,
  getInitialPartnerMessage,
  getProblemTypeLabel,
} from "./_utils/interview-messages"
import { EDITOR_LANGUAGES, getBugfixScenarioLanguage, type EditorLanguage } from "./_utils/language"
import {
  isWorkspaceScenario,
  toWorkspaceContextFiles,
  toWorkspaceScenarioFiles,
} from "./_utils/workspace"
import type {
  ChatMessage,
  ConsoleLogEntry,
  EfficiencyMetrics,
  TestResult,
  TestSummary,
  WorkspaceContextFile,
} from "./_types"
import { createBugfixEvidenceEvent, type BugfixEvidenceEvent } from "@/lib/bugfix"
import { computeFallbackScores } from "@/lib/interview/fallback-feedback"
import { useInterviewTimer } from "./_hooks/useInterviewTimer"
import { useInterviewModes } from "./_hooks/useInterviewModes"
import { useGuestQuota, isUsageBlocked } from "./_hooks/useGuestQuota"
import { useCodeExecution } from "./_hooks/useCodeExecution"
import { useInterviewPhaseTracking } from "./_hooks/useInterviewPhaseTracking"
import { useInterviewChat } from "./_hooks/useInterviewChat"
import { useInterviewProactiveAI } from "./_hooks/useInterviewProactiveAI"

// Dynamic imports for heavy components to reduce initial bundle size
const ScenarioBrowser = nextDynamic(
  () => import("@/components/interview").then((mod) => ({ default: mod.ScenarioBrowser })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-muted-foreground">Loading scenarios...</div>
      </div>
    ),
  }
)

const PracticeFeedback = nextDynamic(() => import("@/components/PracticeFeedback"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center p-8">
      <div className="text-muted-foreground text-sm">Loading feedback...</div>
    </div>
  ),
})

function InterviewPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, firebaseUser, loading: authLoading, initialized } = useAuth()
  const {
    markQuestionCompleted,
    markQuestionEvaluating,
    addActualTime,
    activeRoadmap,
    setActiveRoadmap,
  } = useRoadmapStore()
  // Use store for loading states so InterviewerChat component can see them
  const {
    isLoadingChat,
    isLoadingInterviewer,
    setIsLoadingChat,
    setIsLoadingInterviewer,
    targetCompany,
    setTargetCompany,
    showCompanyPicker,
    setShowCompanyPicker,
    realInterviewMode,
    strictTimeLimit,
  } = useInterviewStore(
    useShallow((state) => ({
      isLoadingChat: state.isLoadingChat,
      isLoadingInterviewer: state.isLoadingInterviewer,
      setIsLoadingChat: state.setIsLoadingChat,
      setIsLoadingInterviewer: state.setIsLoadingInterviewer,
      targetCompany: state.targetCompany,
      setTargetCompany: state.setTargetCompany,
      showCompanyPicker: state.showCompanyPicker,
      setShowCompanyPicker: state.setShowCompanyPicker,
      realInterviewMode: state.realInterviewMode,
      strictTimeLimit: state.strictTimeLimit,
    }))
  )
  const [isLoading, setIsLoading] = useState(true)
  const [authCheckComplete, setAuthCheckComplete] = useState(false)
  const [showScenarioBrowser, setShowScenarioBrowser] = useState(true)
  // Locked company for CompanyPicker when coming from roadmap with fuzzy scenario
  const [lockedCompanyForPicker, setLockedCompanyForPicker] = useState<InterviewTargetCompany>(null)
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null)
  const [isInterviewStarted, setIsInterviewStarted] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [showPostInterviewDiscussion, setShowPostInterviewDiscussion] = useState(false)
  const [comprehensiveFeedback, setComprehensiveFeedback] = useState<string>("")
  const [performanceScore, setPerformanceScore] = useState<number | null>(null)
  const [technicalScore, setTechnicalScore] = useState<number | null>(null) // Mastery-based technical score
  const [scoreBreakdown, setScoreBreakdown] = useState<{
    understandingScore?: number
    problemSolvingScore?: number
    codeQualityScore?: number
    communicationScore?: number
  } | null>(null)
  const [constitutionalAICritique, setConstitutionalAICritique] = useState<Record<
    string,
    unknown
  > | null>(null)
  // Structured feedback sections from API (pre-parsed)
  const [structuredFeedback, setStructuredFeedback] = useState<{
    whatWorked?: string[]
    fixNext?: string[]
    actionPlan?: string[]
    tldr?: string
  } | null>(null)
  // Clarifying questions assessment (Real Interview Mode)
  const [clarifyingQuestionsAssessment, setClarifyingQuestionsAssessment] = useState<{
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
  } | null>(null)
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false) // Track AI feedback generation
  const [isGeneratingDiscussion, setIsGeneratingDiscussion] = useState(false)

  // Streaming feedback hook - Edge function with no timeout
  const streamingFeedback = useStreamingFeedback()
  const [showCodeInDiscussion, setShowCodeInDiscussion] = useState(true) // Expanded by default for better UX
  const [code, setCode] = useState("")
  const [selectedLanguage, setSelectedLanguage] = useState<EditorLanguage>(() => {
    // Initialize from localStorage if available (client-side only)
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("mockmate_preferred_language")
      if (saved && EDITOR_LANGUAGES.includes(saved as EditorLanguage)) {
        return saved as EditorLanguage
      }
    }
    return "javascript"
  })

  // Filters (handled inside ScenarioBrowser now)
  const [completedProblems, setCompletedProblems] = useState<string[]>([])

  // Guest-mode + usage-limit entitlement state (see useGuestQuota)
  const {
    isGuestMode,
    guestId,
    usageLimit,
    canStartGuestTrial,
    enterGuestMode,
    exitGuestMode,
    refreshUsageLimit,
  } = useGuestQuota()
  const [showSignupPrompt, setShowSignupPrompt] = useState(false)

  // Chat states
  const [interviewerMessages, setInterviewerMessages] = useState<ChatMessage[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [interviewerInput, setInterviewerInput] = useState("")

  // Interview phase tracking - tracks what candidate has covered to prevent false feedback
  const [conversationTracker, setConversationTracker] =
    useState<ConversationTracker>(createEmptyTracker())
  const [currentInterviewPhase, setCurrentInterviewPhase] = useState<InterviewPhase>("intro")
  // Note: isLoadingChat and isLoadingInterviewer are from useInterviewStore above

  // Track topics the interviewer has already asked about to prevent repetitive questions
  const [recentNudgeTopics, setRecentNudgeTopics] = useState<string[]>([])

  // Track topics the user has already answered to prevent AI from re-asking
  const [userAnsweredTopics, setUserAnsweredTopics] = useState<string[]>([])

  // Note: extractTopicsFromMessage and extractUserAnsweredTopics are now imported from @/lib/interview

  // Track pending auto-send to avoid duplicate sends
  const pendingAutoSendRef = useRef<{ interviewer: boolean; partner: boolean }>({
    interviewer: false,
    partner: false,
  })

  // Voice recording - using Deepgram with Web Speech API fallback
  // Auto-send enabled: sends automatically after 500ms pause
  const interviewerVoice = useVoiceInput({
    fallbackToWebSpeech: true,
    autoSendEnabled: true,
    autoSendDelayMs: 500,
    onTranscript: (transcript, _isFinal) => {
      setInterviewerInput(transcript)
    },
    onUtteranceEnd: (transcript) => {
      // Auto-send on utterance end
      if (transcript.trim()) {
        handleAutoSend(true, transcript)
      }
    },
  })

  const partnerVoice = useVoiceInput({
    fallbackToWebSpeech: true,
    autoSendEnabled: true,
    autoSendDelayMs: 500,
    onTranscript: (transcript, _isFinal) => {
      setChatInput(transcript)
    },
    onUtteranceEnd: (transcript) => {
      // Auto-send on utterance end
      if (transcript.trim()) {
        handleAutoSend(false, transcript)
      }
    },
  })

  // Backwards compatible aliases
  const isRecordingInterviewer = interviewerVoice.isRecording

  // AI hints states
  const [isAIPartnerExpanded, setIsAIPartnerExpanded] = useState(false) // Collapsed by default
  const hintAgent = useHintAgent({
    userId: user?.id || "",
    problemId: selectedScenario?.id || "",
    problemTitle: selectedScenario?.title || "",
    problemText: selectedScenario?.problemStatement || "",
    problemPattern: (selectedScenario as any)?.pattern,
    difficulty: (selectedScenario?.difficulty as "easy" | "medium" | "hard") || "medium",
    autoGenerate: false,
    getAuthToken: async () => {
      if (!firebaseUser) return null
      return firebaseUser.getIdToken()
    },
  })
  const ragHints = hintAgent.hints.map((h) => ({ level: h.level, hint: h.content, id: h.id }))
  const isLoadingHints = hintAgent.isLoading
  const hintFetchStatus: "idle" | "loading" | "success" | "error" = isLoadingHints
    ? "loading"
    : hintAgent.error
      ? "error"
      : ragHints.length > 0
        ? "success"
        : "idle"
  const [revealedAIHintIndices, setRevealedAIHintIndices] = useState<Set<number>>(new Set())
  const [hintFeedback, setHintFeedback] = useState<Map<string, "helpful" | "unhelpful">>(new Map())

  // Voice mode - always auto-send on pause (research-backed simplification)
  const voiceAutoSend = true // Always enabled now
  const voiceModeLiveRef = useRef(true) // Keep ref for callbacks
  const [revealedHintIndices, setRevealedHintIndices] = useState<Set<number>>(new Set()) // Track which hints are revealed

  // Test states
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLogEntry[]>([])
  const [isRunningTests, setIsRunningTests] = useState(false)
  const [testSummary, setTestSummary] = useState<TestSummary>({
    total: 0,
    passed: 0,
    failed: 0,
    passRate: 0,
  })
  const [efficiencyMetrics, setEfficiencyMetrics] = useState<EfficiencyMetrics | null>(null)

  // Timer
  const { startTime, setStartTime, elapsedTime, setElapsedTime } = useInterviewTimer(
    isInterviewStarted && !showFeedback
  )

  // Hints
  const [revealedHints, setRevealedHints] = useState<number>(0)

  // Workspace context
  const [workspaceContext, setWorkspaceContext] = useState<WorkspaceContextFile[]>([])
  const [activeWorkspacePath, setActiveWorkspacePath] = useState<string | null>(null)
  const [bugfixEvidenceEvents, setBugfixEvidenceEvents] = useState<BugfixEvidenceEvent[]>([])
  const [bugfixHypothesis, setBugfixHypothesis] = useState("")
  const [bugfixRootCause, setBugfixRootCause] = useState("")
  const [bugfixPrevention, setBugfixPrevention] = useState("")
  const recordedBugfixEditPathsRef = useRef<Set<string>>(new Set())
  const chatWorkspaceContext = useMemo(
    () =>
      workspaceContext.map((file) => ({
        ...file,
        active: file.path === activeWorkspacePath,
        edited: file.originalContent !== undefined && file.content !== file.originalContent,
      })),
    [activeWorkspacePath, workspaceContext]
  )
  const activeWorkspaceFile =
    activeWorkspacePath && isWorkspaceScenario(selectedScenario)
      ? workspaceContext.find((file) => file.path === activeWorkspacePath) || null
      : null
  const isActiveWorkspaceFileEditable = activeWorkspaceFile?.role === "editable"
  const editorLanguage = isWorkspaceScenario(selectedScenario)
    ? activeWorkspaceFile?.language || selectedScenario.workspace.language
    : selectedLanguage
  const lastCodeHashRef = useRef<string>("")
  const [proactiveTimer, setProactiveTimer] = useState<NodeJS.Timeout | null>(null)
  const [cachedUserProfile, setCachedUserProfile] = useState<Profile | null>(null)
  const userProfileRequestRef = useRef<Promise<Profile | null> | null>(null)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)

  const getBugfixExpectedTouchedFiles = useCallback(
    (scenario: Scenario | null = selectedScenario): string[] => {
      if (!scenario || scenario.type !== "bugfix") return []
      if (scenario.expectedTouchedFiles?.length) return scenario.expectedTouchedFiles
      if (isWorkspaceScenario(scenario)) return scenario.workspace.editableFilePaths
      return []
    },
    [selectedScenario]
  )

  const recordBugfixEvidence = useCallback(
    (event: Omit<BugfixEvidenceEvent, "timestamp"> & { timestamp?: number }) => {
      if (selectedScenario?.type !== "bugfix") return

      const metadata = currentSessionId
        ? { ...(event.metadata || {}), sessionId: currentSessionId }
        : event.metadata

      setBugfixEvidenceEvents((events) => [
        ...events,
        createBugfixEvidenceEvent({ ...event, metadata }),
      ])
    },
    [currentSessionId, selectedScenario?.type]
  )

  const buildBugfixEvidencePayload = useCallback((): BugfixEvidenceEvent[] => {
    if (selectedScenario?.type !== "bugfix") return []

    const events = [...bugfixEvidenceEvents]
    const now = Date.now()
    const hasHypothesisEvent = events.some((event) => event.type === "hypothesis_created")
    const hasPreventionEvent = events.some((event) => event.type === "prevention_explained")

    if (bugfixHypothesis.trim() && !hasHypothesisEvent) {
      events.push(
        createBugfixEvidenceEvent({
          type: "hypothesis_created",
          text: bugfixHypothesis.trim(),
          timestamp: now,
        })
      )
    }

    if (bugfixPrevention.trim() && !hasPreventionEvent) {
      events.push(
        createBugfixEvidenceEvent({
          type: "prevention_explained",
          text: bugfixPrevention.trim(),
          timestamp: now + 1,
        })
      )
    }

    if (bugfixRootCause.trim()) {
      events.push(
        createBugfixEvidenceEvent({
          type: "submission_created",
          text: bugfixRootCause.trim(),
          timestamp: now + 2,
        })
      )
    }

    return events
  }, [bugfixEvidenceEvents, bugfixHypothesis, bugfixPrevention, bugfixRootCause, selectedScenario])

  const resetBugfixSessionState = useCallback(() => {
    setBugfixEvidenceEvents([])
    setBugfixHypothesis("")
    setBugfixRootCause("")
    setBugfixPrevention("")
    recordedBugfixEditPathsRef.current = new Set()
  }, [])

  const classifyBugfixAIHelpKind = useCallback(
    (message: string): NonNullable<BugfixEvidenceEvent["aiHelpKind"]> => {
      const lower = message.toLowerCase()

      if (
        /exact|solution|solve|fix it|write the code|give me code|patch this|tell me the fix/.test(
          lower
        )
      ) {
        return "exact-fix"
      }

      if (/copy|paste|implement for me|full code/.test(lower)) {
        return "solution-like"
      }

      if (/log|error|stack trace|failing|failure|console|test output/.test(lower)) {
        return "log-interpretation"
      }

      if (/hypothesis|root cause|cause|why|theory|is it because/.test(lower)) {
        return "hypothesis-check"
      }

      return "next-file"
    },
    []
  )

  // Code viewer dialog state
  const [selectedFile, setSelectedFile] = useState<WorkspaceContextFile | null>(null)
  const [isCodeViewerOpen, setIsCodeViewerOpen] = useState(false)

  // Close confirmation dialog state
  const [showCloseDialog, setShowCloseDialog] = useState(false)

  // Display modes (focus/calm/hide-timer/panel/peek) + their side effects and
  // the Cmd/Ctrl+K→Z keyboard chord live in useInterviewModes.
  // Focus mode reduces cognitive load by hiding non-essential panels
  // (Broadbent, 1958); calm mode mutes colors for anxiety reduction.
  const {
    focusMode,
    setFocusMode,
    calmMode,
    setCalmMode,
    hideTimer,
    setHideTimer,
    activePanel,
    setActivePanel,
    showProblemPeek,
    setShowProblemPeek,
  } = useInterviewModes()

  // Experience level from roadmap (for level-appropriate interviewer questions)
  // Falls back to "intermediate" if no roadmap (direct practice mode)
  const experienceLevel = activeRoadmap?.assessment?.experienceLevel || "intermediate"

  useEffect(() => {
    setCachedUserProfile(null)
    userProfileRequestRef.current = null
  }, [user?.id])

  const getCachedUserProfile = useCallback(async (): Promise<Profile | null> => {
    if (!user) return null

    if (cachedUserProfile) {
      return cachedUserProfile
    }

    if (!userProfileRequestRef.current) {
      userProfileRequestRef.current = getUserProfile(user.id, false)
        .then((profile) => {
          setCachedUserProfile(profile)
          return profile
        })
        .catch((error) => {
          userProfileRequestRef.current = null
          console.warn("Failed to load cached user profile for chat context:", error)
          return null
        })
    }

    return userProfileRequestRef.current
  }, [cachedUserProfile, user])

  useEffect(() => {
    if (selectedScenario?.type !== "bugfix" || !user || cachedUserProfile) return
    void getCachedUserProfile()
  }, [cachedUserProfile, getCachedUserProfile, selectedScenario?.type, user])

  // State for collapsible optimal approach section (collapsed by default to not give away solution)
  const [showOptimalApproach, setShowOptimalApproach] = useState(false)

  // Handle streaming feedback: update state when feedback arrives and is persisted
  // Track if we've already shown completion toast to prevent duplicates
  const feedbackCompletionToastShown = useRef(false)

  useEffect(() => {
    const feedbackState = streamingFeedback.state

    // IMPORTANT: Only update scores/feedback when fully persisted to avoid showing partial data
    // During streaming, we just track progress via the phase message

    // Wait for feedback to be persisted before showing final scores
    // This prevents the "flickering scores" issue where instant scores show then get replaced
    if (feedbackState.isPersisted && feedbackState.feedback) {
      // Use the final scores from the feedback (which includes refined scores)
      const finalScores = feedbackState.feedback.scores
      if (finalScores) {
        setScoreBreakdown({
          understandingScore: finalScores.understanding,
          problemSolvingScore: finalScores.problemSolving,
          codeQualityScore: finalScores.codeQuality,
          communicationScore: finalScores.communication,
        })
        setPerformanceScore(finalScores.overall)
      }

      // Use mastery/technical scores from persist endpoint (properly calculated)
      if (feedbackState.technicalScore !== null) {
        setTechnicalScore(feedbackState.technicalScore)
      }

      // Update feedback content
      setComprehensiveFeedback(feedbackState.feedback.raw || "")
      setStructuredFeedback({
        whatWorked: feedbackState.feedback.whatWorked || [],
        fixNext: feedbackState.feedback.fixNext || [],
        actionPlan: feedbackState.feedback.actionPlan || [],
        tldr: feedbackState.feedback.tldr || "",
      })
    }

    // Handle completion - only show toast once AND only after persist completes
    if (
      feedbackState.phase === "complete" &&
      feedbackState.isPersisted &&
      !feedbackState.error &&
      !feedbackCompletionToastShown.current
    ) {
      feedbackCompletionToastShown.current = true
      setIsGeneratingFeedback(false)
      toast.success("Feedback ready!", {
        description: "Your personalized analysis is complete.",
      })
    } else if (feedbackState.error && !feedbackCompletionToastShown.current) {
      feedbackCompletionToastShown.current = true
      setIsGeneratingFeedback(false)
      // If we have feedback but persist failed, still show success (feedback is in UI)
      if (feedbackState.feedback) {
        toast.warning("Feedback generated", {
          description: "Results may not be saved to history.",
        })
      } else {
        toast.error("Feedback generation failed", {
          description: "Applying automated fallback scoring.",
        })
        if (lastFeedbackRequestRef.current) {
          applyFallbackFeedback(lastFeedbackRequestRef.current)
        }
      }
    }

    // Reset toast flag when state resets to idle
    if (feedbackState.phase === "idle") {
      feedbackCompletionToastShown.current = false
    }
  }, [streamingFeedback.state])

  // Code protection state
  const [protectedElements, setProtectedElements] = useState<ReturnType<
    typeof extractProtectedElements
  > | null>(null)
  const [starterCode, setStarterCode] = useState("")

  // Track the last feedback request for fallback scoring if streaming fails
  const lastFeedbackRequestRef = useRef<any>(null)

  const applyFallbackFeedback = useCallback(
    async (request: any) => {
      try {
        const { scoreBreakdown: mappedBreakdown, performanceScore } = computeFallbackScores(request)

        setScoreBreakdown(mappedBreakdown)
        setPerformanceScore(performanceScore)

        const fallbackText =
          "Automated scoring applied. Detailed AI feedback is unavailable due to a service error."
        setComprehensiveFeedback(fallbackText)

        if (currentSessionId) {
          await fetch("/api/feedback/persist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: request.sessionId,
              userId: request.userId,
              scores: {
                understanding: mappedBreakdown.understandingScore,
                problemSolving: mappedBreakdown.problemSolvingScore,
                codeQuality: mappedBreakdown.codeQualityScore,
                communication: mappedBreakdown.communicationScore,
                overall: performanceScore,
              },
              feedback: {
                raw: fallbackText,
                tldr: "Service Error",
                whatWorked: [],
                fixNext: [],
                actionPlan: [],
              },
              testsPassed: request.testsPassed,
              testsTotal: request.testsTotal,
              timeSpentMinutes: Math.round((request.elapsedTimeSeconds || 0) / 60),
              hintsUsed: request.hintsUsed || 0,
              difficulty: request.scenarioDifficulty || "medium",
              scenarioType: request.scenarioType || "dsa",
              scenarioTitle: request.scenarioTitle || "Unknown",
              scenarioId: request.scenarioId,
              scenarioPattern: request.scenarioPattern,
            }),
          })
        }
      } catch (e) {
        console.error("Fallback logic failed", e)
      }
    },
    [currentSessionId]
  )

  // Roadmap tracking
  const isFromRoadmap = searchParams?.get("roadmap") === "true"

  const chatEndRef = useRef<HTMLDivElement>(null)
  const interviewerEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const previousCodeRef = useRef<string>(code)

  // Update URL when interview starts (for refresh persistence)
  useEffect(() => {
    if (
      isInterviewStarted &&
      selectedScenario &&
      currentSessionId &&
      typeof window !== "undefined"
    ) {
      const url = new URL(window.location.href)
      url.searchParams.set("session", currentSessionId)
      url.searchParams.set("scenario", selectedScenario.id)
      window.history.replaceState({}, "", url.toString())
    }
  }, [isInterviewStarted, selectedScenario, currentSessionId])

  // Warn user before leaving page during active interview or while feedback is generating
  useEffect(() => {
    // Keep warning active if:
    // 1. Interview is in progress and feedback not shown yet
    // 2. OR we're generating discussion (feedback is being evaluated)
    // 3. OR we're in post-interview discussion (wrap-up phase)
    const shouldWarn =
      (isInterviewStarted && !showFeedback) || isGeneratingDiscussion || showPostInterviewDiscussion

    if (!shouldWarn) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      let message: string
      if (isGeneratingDiscussion) {
        message = "Your solution is being evaluated. Are you sure you want to leave?"
      } else if (showPostInterviewDiscussion) {
        message =
          "You are in the wrap-up discussion. Your session will be saved, but you may lose unsaved chat messages."
      } else {
        message = "You have an active interview session. Are you sure you want to leave?"
      }
      e.returnValue = message
      return message
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [isInterviewStarted, showFeedback, isGeneratingDiscussion, showPostInterviewDiscussion])

  // Separate effect to handle auth check with delay to prevent race condition on refresh
  useEffect(() => {
    if (!initialized || authLoading) return

    // Give Firebase a moment to restore session on page refresh before checking auth
    const timer = setTimeout(() => {
      setAuthCheckComplete(true)
    }, 300)

    return () => clearTimeout(timer)
  }, [initialized, authLoading])

  // Load roadmap from Firebase if coming from roadmap but activeRoadmap is not loaded
  // This handles cases where the page was refreshed or navigated directly
  useEffect(() => {
    const loadRoadmapIfNeeded = async () => {
      // Only load if coming from roadmap, user is authenticated, and no activeRoadmap
      if (!isFromRoadmap || !firebaseUser || activeRoadmap) return

      try {
        const idToken = await firebaseUser.getIdToken()
        const response = await fetch("/api/roadmap", {
          headers: {
            Authorization: `Bearer ${idToken}`,
            "Content-Type": "application/json",
          },
        })

        if (response.ok) {
          const data = await response.json()
          if (data.roadmap) {
            // Convert date strings back to Date objects
            const roadmap = {
              ...data.roadmap,
              interviewDate: new Date(data.roadmap.interviewDate),
              createdAt: data.roadmap.createdAt ? new Date(data.roadmap.createdAt) : new Date(),
              updatedAt: data.roadmap.updatedAt ? new Date(data.roadmap.updatedAt) : new Date(),
              dailyPlans:
                data.roadmap.dailyPlans?.map((plan: any) => ({
                  ...plan,
                  date: new Date(plan.date),
                  questions: plan.questions?.map((q: any) => ({
                    ...q,
                    completedAt: q.completedAt ? new Date(q.completedAt) : undefined,
                  })),
                })) || [],
              milestones:
                data.roadmap.milestones?.map((m: any) => ({
                  ...m,
                  targetDate: new Date(m.targetDate),
                })) || [],
            }
            setActiveRoadmap(roadmap)
          }
        }
      } catch (error) {
        console.error("Error loading roadmap for interview:", error)
      }
    }

    loadRoadmapIfNeeded()
  }, [isFromRoadmap, firebaseUser, activeRoadmap, setActiveRoadmap])

  // Load completed problems for pattern progress (based on interview_sessions)
  useEffect(() => {
    const loadCompletedProblems = async () => {
      if (!firebaseUser) return

      try {
        // Lazy load Firestore
        const db = await getDbLazy()
        const sessionsQuery = query(
          collection(db, "interview_sessions"),
          where("user_id", "==", firebaseUser.uid)
        )
        const sessionsSnap = await getDocs(sessionsQuery)

        const completedSet = new Set<string>()
        sessionsSnap.forEach((doc) => {
          const data = doc.data() as any
          if (!data.scenario_id) return

          const isCompleted = !!data.completed_at || typeof data.performance_score === "number"

          if (isCompleted) {
            completedSet.add(data.scenario_id)
          }
        })

        setCompletedProblems(Array.from(completedSet))
      } catch (error) {
        console.error("Error loading completed problems:", error)
      }
    }

    loadCompletedProblems()
  }, [firebaseUser])

  // Check authentication and usage limit, handle session reopening
  useEffect(() => {
    const checkAuth = async () => {
      if (authLoading || !initialized || !authCheckComplete) return

      if (!firebaseUser) {
        // Check if guest can start free trial
        const canTrial = canStartGuestTrial()
        if (canTrial) {
          // Allow guest mode
          enterGuestMode()
          setIsLoading(false)
          return
        } else {
          // Free trial already used, require signup
          router.push("/login?redirect=interview&message=trial-used")
          return
        }
      }

      // Authenticated user - disable guest mode if it was set
      exitGuestMode()

      // Check usage limit
      await refreshUsageLimit(firebaseUser.uid)

      // Check if we're reopening a session or starting from roadmap
      const sessionId = searchParams?.get("session")
      const scenarioId = searchParams?.get("scenario")
      const fromRoadmap = searchParams?.get("roadmap") === "true"
      const fromPractice = searchParams?.get("practice") === "true"
      const isPostInterviewResume = searchParams?.get("postInterview") === "true"

      // Case 1: Reopening an existing session
      if (sessionId && scenarioId) {
        // Load the scenario and reopen the session
        const scenario = getScenarioById(scenarioId)
        if (scenario) {
          setSelectedScenario(scenario)
          setShowOptimalApproach(false) // Reset optimal approach visibility
          setCurrentSessionId(sessionId)
          setShowScenarioBrowser(false)

          // Check if there's saved session state FIRST before starting interview
          const savedState = await getSessionState(sessionId)

          // Restore Real Interview Mode and strict time limit settings EARLY
          // This needs to happen before rendering so the UI shows the correct problem statement
          if (savedState?.realInterviewMode !== undefined) {
            useInterviewStore.getState().setRealInterviewMode(savedState.realInterviewMode)
          }
          if (savedState?.strictTimeLimit !== undefined) {
            useInterviewStore.getState().setStrictTimeLimit(savedState.strictTimeLimit)
          }

          // Now start the interview with restored state
          setIsInterviewStarted(true)
          setStartTime(Date.now())

          // CRITICAL: If session is completed or evaluating, redirect to results page
          // This prevents users from being put back into interview mode
          if (savedState?.completedAt || savedState?.feedbackStatus === "pending") {
            toast.info(
              savedState?.feedbackStatus === "pending"
                ? "Session is being evaluated"
                : "Session already submitted",
              { description: "Redirecting to your results..." }
            )
            router.push(`/sessions/${sessionId}`)
            return
          }

          const hasExistingProgress =
            savedState &&
            ((savedState.interviewerMessages && savedState.interviewerMessages.length > 1) ||
              (savedState.chatMessages && savedState.chatMessages.length > 1) ||
              (savedState.elapsedTime && savedState.elapsedTime > 60))

          // Initialize code based on scenario type
          let initialCode: string
          if (isWorkspaceScenario(scenario)) {
            const scenarioLanguage = scenario.workspace.language
            if (scenarioLanguage !== selectedLanguage) {
              setSelectedLanguage(scenarioLanguage)
            }
            const contextFiles =
              hasExistingProgress && savedState?.workspaceContext?.length
                ? (savedState.workspaceContext as WorkspaceContextFile[])
                : toWorkspaceScenarioFiles(scenario)
            const activePath =
              savedState?.activeWorkspacePath ||
              scenario.workspace.primaryFilePath ||
              contextFiles[0]?.path
            const activeFile =
              contextFiles.find((file) => file.path === activePath) ||
              contextFiles.find((file) => file.path === scenario.workspace.primaryFilePath) ||
              contextFiles[0]

            initialCode = activeFile?.content || ""
            setWorkspaceContext(contextFiles)
            setActiveWorkspacePath(activeFile?.path || scenario.workspace.primaryFilePath)
          } else if (scenario.type === "bugfix") {
            const scenarioLanguage = getBugfixScenarioLanguage(scenario, selectedLanguage)
            if (scenarioLanguage !== selectedLanguage) {
              setSelectedLanguage(scenarioLanguage)
            }
            initialCode =
              (scenario as any).buggyCode?.[scenarioLanguage] ||
              `// Bug fix code not available for ${scenarioLanguage}`
            const codebaseFiles = (scenario as any).codebaseFiles?.[scenarioLanguage] || []
            if (codebaseFiles.length > 0) {
              setWorkspaceContext(toWorkspaceContextFiles(codebaseFiles))
            }
          } else if (scenario.type === "system-design") {
            // For system design, provide a design notes template
            initialCode = `// DESIGN NOTES: ${scenario.title}
// Use this space to document your design decisions

/* ============================================
   1. REQUIREMENTS CLARIFICATION
   ============================================ */
// Functional:
// -
//
// Non-Functional:
// - Scale:
// - Latency:
// - Availability:

/* ============================================
   2. HIGH-LEVEL ARCHITECTURE
   ============================================ */
// Key Components:
// 1.
// 2.
// 3.

/* ============================================
   3. DATA MODEL
   ============================================ */
// Tables/Collections:
//

/* ============================================
   4. API DESIGN
   ============================================ */
// Endpoints:
// POST /api/...
// GET /api/...

/* ============================================
   5. SCALING & TRADE-OFFS
   ============================================ */
// -
`
          } else {
            initialCode =
              (scenario as any).starterCode?.[selectedLanguage] ||
              `function solution() {
  // Write your solution here

}`
          }

          // If there's saved code, use it; otherwise use starter code
          if (hasExistingProgress && savedState?.code) {
            setCode(savedState.code)
            if (savedState.language) {
              setSelectedLanguage(savedState.language as any)
            }
          } else {
            setCode(initialCode)
          }

          // Initialize interviewer with appropriate message based on progress
          const problemType =
            scenario.type === "bugfix"
              ? "BUG FIX"
              : scenario.type === "add-functionality"
                ? "ADD FUNCTIONALITY"
                : scenario.type.toUpperCase()

          let initialMessage: string
          if (hasExistingProgress) {
            // True resume - user has made progress
            initialMessage = `Welcome back! I'm Sable, your interviewer. You're continuing your practice on **${scenario.title}** - a ${scenario.difficulty} ${problemType} problem.

You can continue where you left off. Feel free to:
- Ask me clarifying questions about the requirements
- Discuss your approach before coding
- Ask for hints if you get stuck

Let's continue!`

            // Restore previous messages if available
            if (savedState?.interviewerMessages && savedState.interviewerMessages.length > 0) {
              setInterviewerMessages(
                savedState.interviewerMessages as Array<{ type: "ai" | "user"; message: string }>
              )
            } else {
              setInterviewerMessages([{ type: "ai", message: initialMessage }])
            }
            if (savedState?.chatMessages && savedState.chatMessages.length > 0) {
              setChatMessages(
                savedState.chatMessages as Array<{ type: "ai" | "user"; message: string }>
              )
            } else {
              setChatMessages([
                {
                  type: "ai",
                  message: `Hi! I'm your AI coding partner. I can help with algorithms, debugging, and hints for ${scenario.title}. Just ask!`,
                },
              ])
            }
            // Restore elapsed time and test results
            if (savedState?.elapsedTime) {
              setElapsedTime(savedState.elapsedTime)
            }
            if (savedState?.testResults && savedState.testResults.length > 0) {
              setTestResults(savedState.testResults)
            }
            if (savedState?.testSummary) {
              setTestSummary(savedState.testSummary)
            }
            if (savedState?.consoleLogs) {
              setConsoleLogs(savedState.consoleLogs as typeof consoleLogs)
            }
            if (scenario.type === "bugfix") {
              setBugfixEvidenceEvents(
                (savedState.bugfixEvidenceEvents as unknown as BugfixEvidenceEvent[]) || []
              )
              setBugfixHypothesis(savedState.bugfixHypothesis || "")
              setBugfixRootCause(savedState.bugfixRootCause || "")
              setBugfixPrevention(savedState.bugfixPrevention || "")
              recordedBugfixEditPathsRef.current = new Set(
                ((savedState.bugfixEvidenceEvents as unknown as BugfixEvidenceEvent[]) || [])
                  .filter((event) => event.type === "file_edited" && event.filePath)
                  .map((event) => event.filePath as string)
              )
            }

            // If resuming post-interview discussion, show that view directly
            if (isPostInterviewResume && savedState?.isPostInterviewDiscussion) {
              setShowPostInterviewDiscussion(true)
              // Restore test summary if available
              if (savedState.testSummary) {
                setTestSummary(savedState.testSummary)
              }
              toast.success("Resuming post-interview discussion")
            } else {
              toast.success("Session resumed")
            }
          } else {
            // Fresh start - no previous progress
            const isDSAScenario = scenario.type === "dsa"
            initialMessage = getInitialInterviewerMessage(
              scenario.title,
              scenario.difficulty,
              problemType
            )

            if (scenario.type === "bugfix") {
              resetBugfixSessionState()
              setBugfixEvidenceEvents([
                createBugfixEvidenceEvent({ type: "session_started", timestamp: Date.now() }),
                createBugfixEvidenceEvent({ type: "incident_read", timestamp: Date.now() + 1 }),
              ])
            }

            setInterviewerMessages([{ type: "ai", message: initialMessage }])
            if (!isDSAScenario) {
              setChatMessages([
                {
                  type: "ai",
                  message: `Hi! I'm your AI coding partner. I can help with algorithms, debugging, and hints for ${scenario.title}. Just ask!`,
                },
              ])
            } else {
              setChatMessages([]) // No AI partner for DSA
            }
          }
        } else {
          toast.error("Scenario not found")
        }
      }
      // Case 2: Starting fresh from roadmap or practice (scenario only, no session)
      else if (scenarioId && !sessionId && (fromRoadmap || fromPractice)) {
        const scenario = getScenarioById(scenarioId)
        if (scenario) {
          // Check if there's already an evaluating session for this scenario
          // Only redirect if evaluating - otherwise let user start a new session
          if (user?.id && !fromPractice) {
            const existingSession = await findLatestSubmittedSession(user.id, scenarioId)
            if (existingSession?.isEvaluating) {
              toast.info("Session is being evaluated", {
                description: "Redirecting to your results...",
              })
              router.push(`/sessions/${existingSession.sessionId}`)
              return
            }
            // If session was completed but not evaluating, allow user to start fresh
          }

          // Select the scenario and hide browser to show the problem view
          setSelectedScenario(scenario)
          setShowOptimalApproach(false) // Reset optimal approach visibility
          setShowScenarioBrowser(false)

          // If from roadmap, call startInterview to trigger proper initialization
          // This will handle company selection, Real Interview Mode, etc.
          if (fromRoadmap) {
            // Small delay to ensure state is set before calling startInterview
            setTimeout(() => {
              startInterview(scenario)
            }, 100)
          }
        } else {
          toast.error("Scenario not found")
          setShowScenarioBrowser(true)
        }
      }

      setIsLoading(false)
    }
    checkAuth()
  }, [router, searchParams, firebaseUser, authLoading, initialized, authCheckComplete])

  // Sound effects - disabled in calm mode for reduced stimulation
  const playSound = (type: "hint" | "success" | "fail" | "milestone") => {
    // Skip sounds in calm mode - reduces anxiety triggers
    if (calmMode) return

    // Use Web Audio API for subtle sound effects
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    // Different frequencies for different events
    const soundConfig = {
      hint: { freq: 800, duration: 0.1, volume: 0.1 },
      success: { freq: 1000, duration: 0.15, volume: 0.15 },
      fail: { freq: 400, duration: 0.2, volume: 0.1 },
      milestone: { freq: 1200, duration: 0.2, volume: 0.15 },
    }

    const config = soundConfig[type]
    oscillator.frequency.value = config.freq
    gainNode.gain.value = config.volume

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + config.duration)
  }

  // Auto-scroll chat - scroll only within container, not the whole page
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" })
    }
  }, [chatMessages])

  useEffect(() => {
    if (interviewerEndRef.current) {
      interviewerEndRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      })
    }
  }, [interviewerMessages])

  // CodeMirror 6 handles layout automatically
  // No manual height tracking needed

  // Initialize code when scenario is selected (before interview starts)
  // This ensures the editor always has a stable value without needing fallbacks
  useEffect(() => {
    if (selectedScenario && !isInterviewStarted && !code) {
      let initialCode: string
      if (isWorkspaceScenario(selectedScenario)) {
        const contextFiles = toWorkspaceScenarioFiles(selectedScenario)
        const primaryFile = contextFiles.find(
          (file) => file.path === selectedScenario.workspace.primaryFilePath
        )
        if (selectedScenario.workspace.language !== selectedLanguage) {
          setSelectedLanguage(selectedScenario.workspace.language)
        }
        setWorkspaceContext(contextFiles)
        setActiveWorkspacePath(primaryFile?.path || selectedScenario.workspace.primaryFilePath)
        initialCode = primaryFile?.content || ""
      } else if (selectedScenario.type === "bugfix") {
        const scenarioLanguage = getBugfixScenarioLanguage(selectedScenario, selectedLanguage)
        if (scenarioLanguage !== selectedLanguage) {
          setSelectedLanguage(scenarioLanguage)
        }
        initialCode =
          (selectedScenario as any).buggyCode?.[scenarioLanguage] ||
          `// Bug fix code not available for ${scenarioLanguage}`
      } else if (selectedScenario.type === "add-functionality") {
        initialCode =
          (selectedScenario as any).existingCode?.[selectedLanguage] ||
          `// Add functionality code not available for ${selectedLanguage}`
      } else if (selectedScenario.type === "system-design") {
        initialCode = `// DESIGN NOTES: ${selectedScenario.title}\n// Use this space to document your design decisions\n`
      } else {
        initialCode =
          (selectedScenario as any).starterCode?.[selectedLanguage] ||
          `function solution() {\n  // Write your solution here\n\n}`
      }
      setCode(initialCode)
    }
  }, [selectedScenario, isInterviewStarted, selectedLanguage, code])

  // Update code and workspace files when language changes during interview
  useEffect(() => {
    if (isInterviewStarted && selectedScenario && !showFeedback) {
      let newCode: string
      let codebaseFiles: any[] = []

      if (isWorkspaceScenario(selectedScenario)) {
        if (selectedLanguage !== selectedScenario.workspace.language) {
          setSelectedLanguage(selectedScenario.workspace.language)
          toast.info(`Workspace scenarios run in ${selectedScenario.workspace.language}`)
        }
        return
      }

      // For bug fix scenarios, use buggyCode
      if (selectedScenario.type === "bugfix") {
        const scenarioLanguage = getBugfixScenarioLanguage(selectedScenario, selectedLanguage)
        if (scenarioLanguage !== selectedLanguage) {
          setSelectedLanguage(scenarioLanguage)
          return
        }
        newCode =
          (selectedScenario as any).buggyCode?.[selectedLanguage] ||
          `// Bug fix code not available for ${selectedLanguage}`
        codebaseFiles = (selectedScenario as any).codebaseFiles?.[selectedLanguage] || []
      } else if (selectedScenario.type === "add-functionality") {
        // For Add Functionality scenarios, use existingCode
        newCode =
          (selectedScenario as any).existingCode?.[selectedLanguage] ||
          `// Add functionality code not available for ${selectedLanguage}`
        codebaseFiles = (selectedScenario as any).codebaseFiles?.[selectedLanguage] || []
      } else {
        // For DSA scenarios, use starterCode
        newCode =
          (selectedScenario as any).starterCode?.[selectedLanguage] ||
          `function solution() {
  // Write your solution here

}`
      }

      // ALWAYS update workspace context files when language changes
      // This ensures codebase files stay in sync with selected language
      if (codebaseFiles.length > 0) {
        const contextFiles = toWorkspaceContextFiles(codebaseFiles)
        setWorkspaceContext(contextFiles)
        toast.success(`Loaded ${contextFiles.length} codebase file(s) for ${selectedLanguage}`)
      } else if (
        selectedScenario.type === "bugfix" ||
        selectedScenario.type === "add-functionality"
      ) {
        // Clear workspace context if no codebase files for this language
        setWorkspaceContext([])
        setActiveWorkspacePath(null)
        toast.warning(
          `No codebase files available for ${selectedLanguage}. Consider using JavaScript or Python.`
        )
      }

      // Only update main code if it's still the starter/default code
      const currentCodeTrimmed = code.trim()
      const isEmptyOrStarter =
        currentCodeTrimmed === "" ||
        currentCodeTrimmed.includes("Write your solution here") ||
        currentCodeTrimmed.includes("BUG:") ||
        currentCodeTrimmed.includes("TODO:") ||
        currentCodeTrimmed.includes("not available for") ||
        currentCodeTrimmed.length < 100

      if (isEmptyOrStarter) {
        setCode(newCode)
        setStarterCode(newCode)

        // Extract protected elements for code protection
        const protectedElementsData = extractProtectedElements(newCode, selectedLanguage)
        setProtectedElements(protectedElementsData)
      }
    }
  }, [selectedLanguage, isInterviewStarted, selectedScenario, showFeedback])

  // Track last activity timestamps for proactive interviewer
  const lastCodeChangeRef = useRef<number>(Date.now())
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null)
  const hasTriggeredInactivityRef = useRef<boolean>(false)
  const hasFetchedHintsRef = useRef<boolean>(false)

  // Proactive interviewer - DISABLED (was too intrusive)
  // The automatic pop-ups were awkward and interrupted user flow
  useEffect(() => {
    if (!isInterviewStarted || showFeedback || showPostInterviewDiscussion) return

    const codeHash = code.trim().replace(/\s+/g, " ")

    // Track code changes (for metrics only, no proactive triggering)
    // Using ref instead of state to avoid re-renders on every keystroke
    if (codeHash !== lastCodeHashRef.current) {
      lastCodeChangeRef.current = Date.now()
      hasTriggeredInactivityRef.current = false
      lastCodeHashRef.current = codeHash
    }

    // DISABLED: Automatic proactive messages were too intrusive
    // Users found them awkward and distracting
    // The interviewer will only respond when the user messages them

    return () => {
      if (proactiveTimer) {
        clearTimeout(proactiveTimer)
      }
    }
  }, [code, isInterviewStarted, showFeedback, showPostInterviewDiscussion, proactiveTimer])

  const fetchRAGHints = useCallback(async () => {
    if (!selectedScenario || !user?.id || !firebaseUser) return
    hintAgent.updateCode(code)
    await hintAgent.regenerateHints("initial")
    setRevealedAIHintIndices(new Set())
  }, [selectedScenario, user?.id, firebaseUser, hintAgent, code])

  const syncHintAgentWithTestOutcome = useCallback(
    (
      summary: { passed: number; total: number; failed: number },
      results: TestResult[] | undefined
    ) => {
      if (!results) return

      hintAgent.updateCode(code)
      hintAgent.updateTestResults({
        passed: summary.passed,
        total: summary.total,
        failingTests: results.filter((r) => !r.passed).map((r) => r.description),
      })

      if (summary.failed > 0) {
        void hintAgent.regenerateHints("test_failed")
      } else if (summary.passed === summary.total) {
        void hintAgent.regenerateHints("test_passed")
      }
    },
    [hintAgent, code]
  )

  // Fetch AI hints only when user has written meaningful code BEYOND starter code
  // This prevents showing hints before user even starts coding
  useEffect(() => {
    if (!isInterviewStarted || !selectedScenario || showFeedback || showPostInterviewDiscussion) {
      return
    }

    // Calculate how much code the user has written beyond the starter code
    const currentCodeLength = code.trim().length
    const starterCodeLength = starterCode.trim().length
    const userWrittenLength = currentCodeLength - starterCodeLength
    // User must write at least 30 meaningful characters beyond starter code
    const hasWrittenCode = userWrittenLength >= 30

    // Reset hint fetching flag when interview resets
    if (!hasWrittenCode) {
      hasFetchedHintsRef.current = false
      return
    }

    // Fetch hints once when user starts writing meaningful code
    if (hasWrittenCode && !hasFetchedHintsRef.current) {
      hasFetchedHintsRef.current = true
      fetchRAGHints()
    }
  }, [
    code,
    starterCode,
    isInterviewStarted,
    selectedScenario,
    showFeedback,
    showPostInterviewDiscussion,
    fetchRAGHints,
  ])

  // Proactive interviewer - INACTIVITY detection - DISABLED
  // Was too intrusive and interrupted user flow
  useEffect(() => {
    // DISABLED: Automatic inactivity prompts were awkward
    // Users prefer to work at their own pace without interruption
    return () => {
      if (inactivityTimerRef.current) {
        clearInterval(inactivityTimerRef.current)
      }
    }
  }, [isInterviewStarted, showFeedback, showPostInterviewDiscussion, code])

  // Cleanup all proactive timers on unmount
  useEffect(() => {
    return () => {
      if (inactivityTimerRef.current) clearInterval(inactivityTimerRef.current)
    }
  }, [])

  // Auto-save session data every 30 seconds (localStorage + Firestore/API)
  useEffect(() => {
    // Allow auto-save for both authenticated users and guests
    if (!isInterviewStarted || !selectedScenario) return
    if (!firebaseUser && !isGuestMode) return

    const autoSaveInterval = setInterval(async () => {
      try {
        const sessionData = {
          scenarioId: selectedScenario.id,
          code,
          chatMessages,
          interviewerMessages,
          selectedLanguage,
          elapsedTime,
          testResults,
          testSummary,
          workspaceContext,
          activeWorkspacePath,
          consoleLogs,
          bugfixEvidenceEvents,
          bugfixHypothesis,
          bugfixRootCause,
          bugfixPrevention,
          isPostInterviewDiscussion: showPostInterviewDiscussion,
          timestamp: Date.now(),
        }

        if (firebaseUser) {
          // Authenticated user - save to localStorage with user-specific key
          const storageKey = `interview_autosave_${firebaseUser.uid}_${selectedScenario.id}`
          localStorage.setItem(storageKey, JSON.stringify(sessionData))

          // Also save to Firestore if we have a session ID (for cross-device recovery)
          if (currentSessionId) {
            await saveSessionState(currentSessionId, {
              code,
              selectedLanguage,
              elapsedTime,
              chatMessages,
              interviewerMessages,
              testResults,
              testSummary,
              workspaceContext,
              activeWorkspacePath,
              consoleLogs,
              bugfixEvidenceEvents,
              bugfixHypothesis,
              bugfixRootCause,
              bugfixPrevention,
              isPostInterviewDiscussion: showPostInterviewDiscussion,
              realInterviewMode,
              strictTimeLimit,
            })
          }
        } else if (isGuestMode && guestId) {
          // Guest user - save to localStorage with guest-specific key
          const storageKey = `interview_autosave_guest_${selectedScenario.id}`
          localStorage.setItem(storageKey, JSON.stringify(sessionData))

          // Also save state to Firestore via API (for session recovery)
          if (currentSessionId) {
            await fetch("/api/guest-session", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sessionId: currentSessionId,
                guestId,
                sessionState: {
                  code,
                  language: selectedLanguage,
                  elapsedTime,
                  chatMessages: chatMessages.slice(-20), // Limit messages
                  interviewerMessages: interviewerMessages.slice(-20),
                  testResults: testResults.slice(-10),
                  testSummary,
                  workspaceContext,
                  activeWorkspacePath,
                  consoleLogs,
                  bugfixEvidenceEvents,
                  bugfixHypothesis,
                  bugfixRootCause,
                  bugfixPrevention,
                  isPostInterviewDiscussion: showPostInterviewDiscussion,
                  realInterviewMode,
                  strictTimeLimit,
                },
              }),
            })
          }
        }
      } catch (error) {
        console.error("Auto-save failed:", error)
      }
    }, 30000) // 30 seconds

    // Cleanup on unmount
    return () => {
      clearInterval(autoSaveInterval)
    }
  }, [
    isInterviewStarted,
    selectedScenario,
    firebaseUser,
    isGuestMode,
    guestId,
    code,
    chatMessages,
    interviewerMessages,
    selectedLanguage,
    elapsedTime,
    testResults,
    testSummary,
    workspaceContext,
    activeWorkspacePath,
    consoleLogs,
    bugfixEvidenceEvents,
    bugfixHypothesis,
    bugfixRootCause,
    bugfixPrevention,
    currentSessionId,
    showPostInterviewDiscussion,
  ])

  // Track when code value changes
  useEffect(() => {
    if (previousCodeRef.current !== code) {
      previousCodeRef.current = code
    }
  }, [code])

  // Restore auto-saved session on mount (check both localStorage and Firestore/API)
  useEffect(() => {
    // Allow restoration for both authenticated users and guests
    if (!selectedScenario || isInterviewStarted) return
    if (!firebaseUser && !isGuestMode) return

    const restoreSession = async () => {
      try {
        const sessionIdFromUrl = searchParams?.get("session")

        // Check if there's already a completed session for this scenario
        // This prevents old chat history from bleeding into new sessions
        if (firebaseUser && !sessionIdFromUrl) {
          const existingSession = await findLatestSubmittedSession(
            firebaseUser.uid,
            selectedScenario.id
          )
          if (existingSession) {
            // There's an existing session - handle based on state
            if (existingSession.isEvaluating) {
              // Session is being evaluated - redirect to results
              toast.info("Session is being evaluated", {
                description: "Redirecting to your results...",
              })
              router.push(`/sessions/${existingSession.sessionId}`)
              return
            }
            // Session is completed - clear old autosave and start fresh
            // This is critical: when a user opens a problem they've already completed,
            // we must NOT restore old chat messages from the previous session
            const storageKey = `interview_autosave_${firebaseUser.uid}_${selectedScenario.id}`
            localStorage.removeItem(storageKey)
            // Don't restore anything - let user start fresh
            return
          }
        }

        let localData = null
        let localTimestamp = 0
        let remoteData = null
        let remoteTimestamp = 0

        if (firebaseUser) {
          // Authenticated user - check localStorage with user-specific key
          const storageKey = `interview_autosave_${firebaseUser.uid}_${selectedScenario.id}`
          const savedData = localStorage.getItem(storageKey)

          if (savedData) {
            const parsed = JSON.parse(savedData)
            const timeSinceLastSave = Date.now() - parsed.timestamp
            if (timeSinceLastSave < 24 * 60 * 60 * 1000) {
              localData = parsed
              localTimestamp = parsed.timestamp
            } else {
              localStorage.removeItem(storageKey)
            }
          }

          // Check Firestore if we have a session ID in URL
          if (sessionIdFromUrl) {
            const firestoreState = await getSessionState(sessionIdFromUrl)

            // If session was already submitted, redirect to results page
            if (firestoreState?.completedAt) {
              toast.info("Session already submitted", {
                description: "Redirecting to your results...",
              })
              router.push(`/sessions/${sessionIdFromUrl}`)
              return
            }

            // If session is being evaluated (submitted but feedback pending), redirect to session page
            // This prevents users from being put back into interview mode during evaluation
            if (firestoreState?.feedbackStatus === "pending") {
              toast.info("Session is being evaluated", {
                description: "Redirecting to your results page...",
              })
              router.push(`/sessions/${sessionIdFromUrl}`)
              return
            }

            if (firestoreState?.savedAt) {
              remoteData = firestoreState
              remoteTimestamp = new Date(firestoreState.savedAt).getTime()
              setCurrentSessionId(sessionIdFromUrl)
            }
          }
        } else if (isGuestMode && guestId) {
          // Guest user - check localStorage with guest-specific key
          const storageKey = `interview_autosave_guest_${selectedScenario.id}`
          const savedData = localStorage.getItem(storageKey)

          if (savedData) {
            const parsed = JSON.parse(savedData)
            const timeSinceLastSave = Date.now() - parsed.timestamp
            // Guest sessions expire after 24 hours
            if (timeSinceLastSave < 24 * 60 * 60 * 1000) {
              localData = parsed
              localTimestamp = parsed.timestamp
            } else {
              localStorage.removeItem(storageKey)
            }
          }

          // Check API for saved session state (guest sessions)
          if (sessionIdFromUrl) {
            try {
              const response = await fetch(
                `/api/guest-session?sessionId=${sessionIdFromUrl}&guestId=${guestId}`
              )
              if (response.ok) {
                const data = await response.json()

                // If session was already submitted, redirect to results page
                if (data.session?.completed_at) {
                  toast.info("Session already submitted", {
                    description: "Redirecting to your results...",
                  })
                  router.push(`/sessions/${sessionIdFromUrl}`)
                  return
                }

                // If session is being evaluated, redirect to session page
                if (data.session?.feedback_status === "pending") {
                  toast.info("Session is being evaluated", {
                    description: "Redirecting to your results page...",
                  })
                  router.push(`/sessions/${sessionIdFromUrl}`)
                  return
                }

                if (data.session?.session_state) {
                  remoteData = {
                    code: data.session.session_state.code,
                    chatMessages: data.session.session_state.chat_messages,
                    interviewerMessages: data.session.session_state.interviewer_messages,
                    language: data.session.session_state.language,
                    elapsedTime: data.session.session_state.elapsed_time,
                    testResults: data.session.session_state.test_results,
                    testSummary: data.session.session_state.test_summary,
                    workspaceContext: data.session.session_state.workspace_context,
                    activeWorkspacePath: data.session.session_state.active_workspace_path,
                    consoleLogs: data.session.session_state.console_logs,
                    bugfixEvidenceEvents: data.session.session_state.bugfix_evidence_events,
                    bugfixHypothesis: data.session.session_state.bugfix_hypothesis,
                    bugfixRootCause: data.session.session_state.bugfix_root_cause,
                    bugfixPrevention: data.session.session_state.bugfix_prevention,
                    isPostInterviewDiscussion:
                      data.session.session_state.is_post_interview_discussion,
                    savedAt: data.session.session_state.saved_at,
                  }
                  remoteTimestamp = new Date(data.session.session_state.saved_at).getTime()
                  setCurrentSessionId(sessionIdFromUrl)
                }
              }
            } catch (err) {
              console.error("Failed to fetch guest session state:", err)
            }
          }
        }

        // Use the most recent save (prefer remote if same time for cross-device)
        const useRemote = remoteData && (!localData || remoteTimestamp >= localTimestamp)

        if (useRemote && remoteData) {
          setCode(remoteData.code || "")
          setChatMessages((remoteData.chatMessages as ChatMessage[]) || [])
          setInterviewerMessages((remoteData.interviewerMessages as ChatMessage[]) || [])
          setSelectedLanguage((remoteData.language as typeof selectedLanguage) || "javascript")
          setTestResults(remoteData.testResults || [])
          setWorkspaceContext(remoteData.workspaceContext || [])
          if (remoteData.workspaceContext?.length) {
            setActiveWorkspacePath(
              remoteData.activeWorkspacePath || remoteData.workspaceContext[0].path
            )
          }
          setConsoleLogs(remoteData.consoleLogs || [])
          setBugfixEvidenceEvents((remoteData.bugfixEvidenceEvents as BugfixEvidenceEvent[]) || [])
          setBugfixHypothesis(remoteData.bugfixHypothesis || "")
          setBugfixRootCause(remoteData.bugfixRootCause || "")
          setBugfixPrevention(remoteData.bugfixPrevention || "")
          recordedBugfixEditPathsRef.current = new Set(
            ((remoteData.bugfixEvidenceEvents as BugfixEvidenceEvent[]) || [])
              .filter((event) => event.type === "file_edited" && event.filePath)
              .map((event) => event.filePath as string)
          )
          if (remoteData.elapsedTime) {
            setElapsedTime(remoteData.elapsedTime)
          }
          // Restore test summary if available
          if (remoteData.testSummary) {
            setTestSummary(remoteData.testSummary)
          }
          // Restore post-interview discussion state
          if (remoteData.isPostInterviewDiscussion) {
            setShowPostInterviewDiscussion(true)
            setIsInterviewStarted(true)
            setShowScenarioBrowser(false)
            toast.info("Post-interview discussion restored", {
              description: "Continue your discussion with the interviewer.",
            })
          } else {
            toast.info("Session restored from cloud backup", {
              description: "Your progress was saved. Continue where you left off!",
            })
          }
        } else if (localData) {
          setCode(localData.code || "")
          setChatMessages(localData.chatMessages || [])
          setInterviewerMessages(localData.interviewerMessages || [])
          setSelectedLanguage(localData.selectedLanguage || "javascript")
          setTestResults(localData.testResults || [])
          setWorkspaceContext(localData.workspaceContext || [])
          if (localData.workspaceContext?.length) {
            const restoredPrimary =
              isWorkspaceScenario(selectedScenario) &&
              localData.workspaceContext.find(
                (file: WorkspaceContextFile) =>
                  file.path === selectedScenario.workspace.primaryFilePath
              )
            setActiveWorkspacePath(
              localData.activeWorkspacePath ||
                restoredPrimary?.path ||
                localData.workspaceContext[0].path
            )
          }
          setConsoleLogs(localData.consoleLogs || [])
          setBugfixEvidenceEvents(localData.bugfixEvidenceEvents || [])
          setBugfixHypothesis(localData.bugfixHypothesis || "")
          setBugfixRootCause(localData.bugfixRootCause || "")
          setBugfixPrevention(localData.bugfixPrevention || "")
          recordedBugfixEditPathsRef.current = new Set(
            (localData.bugfixEvidenceEvents || [])
              .filter(
                (event: BugfixEvidenceEvent) => event.type === "file_edited" && event.filePath
              )
              .map((event: BugfixEvidenceEvent) => event.filePath as string)
          )
          if (localData.elapsedTime) {
            setElapsedTime(localData.elapsedTime)
          }
          // Restore test summary if available
          if (localData.testSummary) {
            setTestSummary(localData.testSummary)
          }
          // Restore post-interview discussion state
          if (localData.isPostInterviewDiscussion) {
            setShowPostInterviewDiscussion(true)
            setIsInterviewStarted(true)
            setShowScenarioBrowser(false)
            toast.info("Post-interview discussion restored", {
              description: "Continue your discussion with the interviewer.",
            })
          } else {
            toast.info("Session restored from auto-save", {
              description: "Your local progress was recovered.",
            })
          }
        }
      } catch (error) {
        console.error("Failed to restore auto-saved session:", error)
        toast.error("Could not restore session", {
          description: "Starting fresh. Previous progress may be lost.",
        })
      }
    }

    restoreSession()
  }, [
    firebaseUser,
    isGuestMode,
    guestId,
    selectedScenario,
    searchParams,
    isInterviewStarted,
    router,
  ])

  // Track session completion through metrics API for proper stats tracking
  const trackSessionCompletion = async (params: {
    sessionId: string
    finalCode: string
    language: string
    testsPassed: number
    testsTotal: number
    efficiencyScore: number
    communicationScore?: number
  }) => {
    try {
      const token = await firebaseUser?.getIdToken()
      if (!token) return

      await fetch("/api/session/metrics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          event: "session_complete",
          sessionId: params.sessionId,
          data: {
            finalCode: params.finalCode,
            language: params.language,
            testsPassed: params.testsPassed,
            testsTotal: params.testsTotal,
            efficiencyScore: params.efficiencyScore,
            communicationScore: params.communicationScore,
          },
        }),
      })
    } catch (error) {
      console.error("[Session Metrics] Failed to track completion:", error)
    }
  }

  // Update spaced repetition state after completing a problem
  // This updates the due dates and streak for the user
  const updateSpacedRepetition = async (params: {
    problemId: string
    performanceScore: number
    masteryScore?: number
    timeSpentMinutes: number
    hintsUsed: number
    testCasesPassed: number
    testCasesTotal: number
  }) => {
    try {
      const token = await firebaseUser?.getIdToken()
      if (!token) return

      const response = await fetch("/api/spaced-repetition/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          problem_id: params.problemId,
          performance_score: params.performanceScore,
          mastery_score: params.masteryScore,
          time_spent_minutes: params.timeSpentMinutes,
          hints_used: params.hintsUsed,
          test_cases_passed: params.testCasesPassed,
          test_cases_total: params.testCasesTotal,
        }),
      })

      if (!response.ok) {
        console.error("[Spaced Repetition] Failed to update:", await response.text())
      }
    } catch (error) {
      console.error("[Spaced Repetition] Failed to update:", error)
    }
  }

  // Extract edge cases from scenario for interviewer to ask about
  const getEdgeCasesForInterviewer = (): { description: string; input: unknown }[] => {
    if (!selectedScenario) return []
    const testCases = (selectedScenario as any).testCases || []
    // Filter for edge cases (those with "edge" in description)
    return testCases
      .filter((tc: { description?: string }) => tc.description?.toLowerCase().includes("edge"))
      .map((tc: { description: string; input: unknown }) => ({
        description: tc.description,
        input: tc.input,
      }))
  }

  const {
    getCurrentInterviewPhase,
    updateTrackerOnMessage,
    updateTrackerOnCodeChange,
    updateTrackerOnTestsRun,
    getInterviewerChatParams,
  } = useInterviewPhaseTracking({
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
  })

  const { resetProactiveState } = useInterviewProactiveAI({
    isInterviewStarted,
    showFeedback,
    showPostInterviewDiscussion,
    isLoadingInterviewer,
    interviewerMessages,
    elapsedTime,
    code,
    chatWorkspaceContext,
    selectedScenario,
    targetCompany,
    recentNudgeTopics,
    userAnsweredTopics,
    testResults,
    consoleLogs,
    experienceLevel,
    usageLimit,
    user,
    setInterviewerMessages,
    setIsLoadingInterviewer,
    setRecentNudgeTopics,
    updateTrackerOnMessage,
    getInterviewerChatParams,
    getEdgeCasesForInterviewer,
    getCachedUserProfile,
  })

  const triggerPostInterviewDiscussion = async (testResults: TestResult[], summary: any) => {
    setIsGeneratingDiscussion(true)

    try {
      if (!selectedScenario) {
        return
      }

      const optimalComplexity = (selectedScenario as any)?.optimalComplexity

      // Use LLM-based complexity analysis for accurate semantic understanding
      // Falls back to regex-based analysis if LLM fails
      let llmComplexity: LLMComplexityResult | null = null
      try {
        llmComplexity = await analyzeComplexityWithLLM({
          code,
          language: selectedLanguage,
          problemTitle: selectedScenario.title,
          problemDescription: selectedScenario.description,
          optimalTimeComplexity: optimalComplexity?.time,
          optimalSpaceComplexity: optimalComplexity?.space,
        })
      } catch (llmError) {
        console.warn("LLM complexity analysis failed, using regex fallback:", llmError)
      }

      // Build metrics: prefer LLM results, fall back to regex for missing values
      const regexMetrics = analyzeCodeEfficiency(code, optimalComplexity)

      // Use LLM complexity if available and confident, otherwise use regex
      let finalTimeComplexity = regexMetrics.estimatedTimeComplexity
      let finalSpaceComplexity = regexMetrics.estimatedSpaceComplexity

      if (llmComplexity && llmComplexity.confidence !== "low") {
        if (llmComplexity.timeComplexity !== "Unknown") {
          finalTimeComplexity = llmComplexity.timeComplexity
        }
        if (llmComplexity.spaceComplexity !== "Unknown") {
          finalSpaceComplexity = llmComplexity.spaceComplexity
        }
      }

      const metrics = {
        ...regexMetrics,
        estimatedTimeComplexity: finalTimeComplexity,
        estimatedSpaceComplexity: finalSpaceComplexity,
      }

      // Update state so PostInterviewView shows accurate complexity
      setEfficiencyMetrics(metrics)

      // Trigger interviewer to discuss the solution
      // NOTE: Feedback generation is now DEFERRED until user clicks "View Detailed Feedback"
      // This allows post-interview discussion to be included in the final scoring
      const userProfile = await getCachedUserProfile()

      const discussionPrompt = `[POST-INTERVIEW DISCUSSION - CONTINUE CONVERSATION] This is a continuation of our interview conversation. The candidate has just completed their coding solution.

TEST RESULTS: ${summary.passed}/${summary.total} tests passed (${summary.passRate}% pass rate)
TIME SPENT: ${Math.floor(elapsedTime / 60)} minutes ${elapsedTime % 60} seconds
EFFICIENCY METRICS:
- Time Complexity: ${metrics.estimatedTimeComplexity} (Optimal: ${metrics.optimalTimeComplexity})
- Space Complexity: ${metrics.estimatedSpaceComplexity} (Optimal: ${metrics.optimalSpaceComplexity})
- Efficiency Score: ${metrics.efficiencyScore}/100
- Code Complexity: ${metrics.complexity}
- Lines of Code: ${metrics.linesOfCode}

IMPORTANT: This is a POST-INTERVIEW DISCUSSION phase. You should:
1. Continue the conversation naturally - reference previous discussion points if relevant
2. Discuss the results and solution quality
3. Ask about edge cases, optimizations, or alternative approaches
4. Probe their understanding of time/space complexity
5. Be conversational - this is a debrief, not a restart

Do NOT reintroduce yourself. Continue as if we're in the middle of a discussion about their completed solution.

Be conversational and thorough - like a real interviewer debriefing after a coding interview. The candidate's responses during this discussion will be factored into their final score.`

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: discussionPrompt,
          context: interviewerMessages,
          role: "interviewer",
          userContext: userProfile
            ? {
                email: user?.email,
                subscription_tier: userProfile.subscription_tier,
                sessions_used: usageLimit?.used || 0,
                skill_level: experienceLevel,
              }
            : { skill_level: experienceLevel },
          workspaceContext: chatWorkspaceContext,
          currentCode: code,
          scenarioTitle: selectedScenario?.title,
          scenarioType: selectedScenario?.type,
          scenarioCompany: targetCompany,
          isProactive: false,
          edgeCases: getEdgeCasesForInterviewer(),
          recentNudgeTopics: recentNudgeTopics,
          // Pass test results and console logs for interviewer awareness
          testResults: testResults,
          consoleLogs: consoleLogs,
          // Phase-aware interview tracking
          // NOTE: Explicitly set hasSubmitted=true and interviewPhase='post_interview'
          // because React state may not have updated yet when this is called
          interviewPhase: "post_interview" as const,
          conversationTracker,
          hasSubmitted: true, // Explicit - don't rely on state timing
          // Use freshly computed metrics (not stale state)
          solutionComplexity: {
            estimated: metrics.estimatedTimeComplexity,
            optimal: metrics.optimalTimeComplexity,
            isOptimal: metrics.estimatedTimeComplexity === metrics.optimalTimeComplexity,
            // Include space complexity for real-time validation of user claims
            estimatedSpace: metrics.estimatedSpaceComplexity,
            optimalSpace: metrics.optimalSpaceComplexity,
          },
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        console.warn("[API] Request failed:", response.status, response.url, data)
      }

      if (data.reply) {
        setInterviewerMessages((prev) => [...prev, { type: "ai", message: data.reply }])
        // Track interviewer response for conversation context
        updateTrackerOnMessage(data.reply, "interviewer")
      }
    } catch (error) {
      console.error("Error in post-interview discussion:", error)
      toast.error("Failed to start discussion")
    } finally {
      setIsGeneratingDiscussion(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const newFiles: Array<{ path: string; content: string }> = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (
        file.type.startsWith("text/") ||
        file.name.match(/\.(js|ts|jsx|tsx|py|java|cpp|c|h|json|md|txt)$/i)
      ) {
        try {
          const content = await file.text()
          if (content.length < 50000) {
            newFiles.push({
              path: file.name,
              content: content,
            })
          }
        } catch (error) {
          console.error(`Error reading file ${file.name}:`, error)
        }
      }
    }

    if (newFiles.length > 0) {
      setWorkspaceContext((prev) => [...prev, ...newFiles])
      toast.success(`Added ${newFiles.length} file(s) to workspace context`)
    }
  }

  const startInterview = async (
    scenarioOverride?: Scenario,
    companyOverride?: InterviewTargetCompany
  ) => {
    // Use passed scenario if provided, otherwise use state (handles race condition)
    const scenario = scenarioOverride || selectedScenario

    if (!scenario) {
      toast.error("Please select a scenario first")
      return
    }

    // If we received a scenario override, update state
    if (scenarioOverride) {
      setSelectedScenario(scenarioOverride)
      setShowOptimalApproach(false) // Reset optimal approach visibility for new scenario
    }

    // Determine target company:
    // 1. If override provided (from company picker), use it
    // 2. If from roadmap, use roadmap's target company (but show picker if fuzzy)
    // 3. If freeball with multiple companies and no selection, show picker
    // 4. If freeball with single company, use that company
    // 5. Otherwise, use "freeball" (generic)
    let effectiveTargetCompany: InterviewTargetCompany = companyOverride ?? targetCompany
    const hasFuzzyMode = !!(scenario as any).fuzzyStatement

    if (!effectiveTargetCompany) {
      // Check if coming from roadmap
      if (activeRoadmap?.targetCompany) {
        // If scenario has fuzzy mode, show picker to ask about Real Interview Mode
        // Company is pre-selected/locked from roadmap
        if (hasFuzzyMode) {
          setLockedCompanyForPicker(activeRoadmap.targetCompany)
          setShowCompanyPicker(true)
          return // Wait for user to choose Real Interview Mode
        }
        effectiveTargetCompany = activeRoadmap.targetCompany
      }
      // Check if scenario has companies tagged
      else if (scenario.companies && scenario.companies.length > 0) {
        if (scenario.companies.length === 1) {
          // Single company - auto-select it
          effectiveTargetCompany = scenario.companies[0].toLowerCase() as CompanyId
        } else {
          // Multiple companies - show picker
          setLockedCompanyForPicker(null) // Not locked, let user choose
          setShowCompanyPicker(true)
          return // Wait for user to pick
        }
      } else {
        // No companies tagged - freeball
        effectiveTargetCompany = "freeball"
      }
    }

    // Store the target company in state
    setTargetCompany(effectiveTargetCompany)

    // Check usage limit before starting - redirect to limit page (skip for DSA questions)
    if (isUsageBlocked(!!user, usageLimit, scenario.type)) {
      router.push("/limit-reached")
      return
    }

    // Create session and increment usage when starting interview
    // DSA questions don't count against session limit
    if (user) {
      try {
        // Create session document first
        // Include pattern for stats aggregation (used by dashboard Performance Insights)
        const scenarioPattern =
          ("pattern" in scenario ? scenario.pattern : scenario.type) || "unknown"
        const sessionId = await createInterviewSession(
          user.id,
          scenario.title,
          scenario.type,
          scenario.difficulty,
          scenario.id,
          scenarioPattern,
          effectiveTargetCompany // Pass target company for RAG + analytics
        )
        setCurrentSessionId(sessionId)

        // Initialize session metrics tracking (required for completion tracking)
        const token = await firebaseUser?.getIdToken()
        if (token) {
          fetch("/api/session/metrics", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              event: "session_start",
              sessionId,
              data: {
                scenarioId: scenario.id,
                scenarioTitle: scenario.title,
                pattern: ("pattern" in scenario ? scenario.pattern : scenario.type) || "unknown",
                difficulty: scenario.difficulty,
                scenarioType: scenario.type,
                hintsTotal: (scenario as any).hints?.length || 3,
              },
            }),
          }).catch((err) => console.error("Session metrics init failed:", err))
        }

        // Record session start (uses free opens or consumes 1 usage)
        const result = await recordSessionStart(user.id)
        if (result.usedPaidSession) {
          toast.success(`Session started! You now have ${result.freeOpensRemaining} free opens.`)
        }
        // Refresh usage limit
        await refreshUsageLimit(user.id)
      } catch (error) {
        console.error("Error creating session:", error)
        toast.error("Session tracking error", {
          description: "Your progress will still be saved locally. You can continue the interview.",
        })
      }
    } else if (isGuestMode && guestId) {
      // Guest user - create session via API
      try {
        const scenarioPattern =
          ("pattern" in scenario ? scenario.pattern : scenario.type) || "unknown"
        const response = await fetch("/api/guest-session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            guestId,
            scenarioTitle: scenario.title,
            scenarioType: scenario.type,
            scenarioId: scenario.id,
            difficulty: scenario.difficulty,
            pattern: scenarioPattern,
            targetCompany: effectiveTargetCompany, // Pass target company for RAG + analytics
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          if (data.code === "FREE_TRIAL_EXHAUSTED") {
            toast.error("Free trial already used", {
              description: "Sign up to continue practicing!",
            })
            markFreeTrialUsed()
            router.push("/login?redirect=interview")
            return
          }
          throw new Error(data.error || "Failed to create session")
        }

        setCurrentSessionId(data.sessionId)

        // Save initial guest session data to localStorage
        saveGuestSessionData({
          sessionId: data.sessionId,
          scenarioId: scenario.id,
          scenarioTitle: scenario.title,
          startedAt: new Date().toISOString(),
        })

        toast.success("Free trial session started!", {
          description: "Complete the interview to see your personalized feedback.",
        })
      } catch (error) {
        console.error("Error creating guest session:", error)
        toast.error("Session tracking error", {
          description: "Your progress will still be saved locally. You can continue the interview.",
        })
      }
    }

    setIsInterviewStarted(true)
    setShowScenarioBrowser(false)
    setStartTime(Date.now())

    // Clear previous session's test results and metrics (fixes terminal persistence bug)
    setTestResults([])
    setTestSummary({ total: 0, passed: 0, failed: 0, passRate: 0 })
    setEfficiencyMetrics(null)
    setElapsedTime(0)
    setRevealedHints(0)
    setRevealedHintIndices(new Set())
    hintAgent.resetHints()
    setRevealedAIHintIndices(new Set())
    setHintFeedback(new Map())
    setWorkspaceContext([])
    setActiveWorkspacePath(null)
    resetBugfixSessionState()
    setComprehensiveFeedback("")
    setPerformanceScore(null)
    setTechnicalScore(null)
    setScoreBreakdown(null)

    // Initialize code based on scenario type
    let initialCode: string
    let activeLanguage = selectedLanguage
    let initialBugfixFileEvent: BugfixEvidenceEvent | null = null
    if (isWorkspaceScenario(scenario)) {
      activeLanguage = scenario.workspace.language
      if (activeLanguage !== selectedLanguage) {
        setSelectedLanguage(activeLanguage)
      }
      const contextFiles = toWorkspaceScenarioFiles(scenario)
      const primaryFile = contextFiles.find(
        (file) => file.path === scenario.workspace.primaryFilePath
      )
      initialCode = primaryFile?.content || ""
      setWorkspaceContext(contextFiles)
      setActiveWorkspacePath(primaryFile?.path || scenario.workspace.primaryFilePath)
      if (scenario.type === "bugfix" && primaryFile) {
        initialBugfixFileEvent = createBugfixEvidenceEvent({
          type:
            primaryFile.role === "test" || primaryFile.role === "docs"
              ? "test_or_doc_opened"
              : "file_opened",
          filePath: primaryFile.path,
          fileRole: primaryFile.role,
          timestamp: Date.now() + 2,
        })
      }
      toast.success(`Loaded ${contextFiles.length} codebase file(s) for review`)
    } else if (scenario.type === "bugfix") {
      activeLanguage = getBugfixScenarioLanguage(scenario, selectedLanguage)
      if (activeLanguage !== selectedLanguage) {
        setSelectedLanguage(activeLanguage)
        toast.info(`Switched to ${activeLanguage} for this bugfix codebase`)
      }

      // For bug fixes, load buggy code
      initialCode =
        (scenario as any).buggyCode?.[activeLanguage] ||
        `// Bug fix code not available for ${activeLanguage}`

      // Auto-load codebase files into workspace context for bug fixes
      const codebaseFiles = (scenario as any).codebaseFiles?.[activeLanguage] || []
      if (codebaseFiles.length > 0) {
        const contextFiles = toWorkspaceContextFiles(codebaseFiles)
        setWorkspaceContext(contextFiles)
        toast.success(`Loaded ${contextFiles.length} codebase file(s) for review`)
      }
    } else if (scenario.type === "add-functionality") {
      // For Add Functionality scenarios, load existing code to extend
      initialCode =
        (scenario as any).existingCode?.[selectedLanguage] ||
        `// Add functionality to the existing codebase`

      // Auto-load codebase files into workspace context
      const codebaseFiles = (scenario as any).codebaseFiles?.[selectedLanguage] || []
      if (codebaseFiles.length > 0) {
        const contextFiles = toWorkspaceContextFiles(codebaseFiles)
        setWorkspaceContext(contextFiles)
        toast.success(
          `Loaded ${contextFiles.length} codebase file(s) - review them to understand the existing code`
        )
      }
    } else if (scenario.type === "system-design") {
      // For system design, provide a design notes template
      initialCode = `// DESIGN NOTES: ${scenario.title}
// Use this space to document your design decisions

/* ============================================
   1. REQUIREMENTS CLARIFICATION
   ============================================ */
// Functional:
// -
//
// Non-Functional:
// - Scale:
// - Latency:
// - Availability:

/* ============================================
   2. HIGH-LEVEL ARCHITECTURE
   ============================================ */
// Key Components:
// 1.
// 2.
// 3.

/* ============================================
   3. DATA MODEL
   ============================================ */
// Tables/Collections:
//

/* ============================================
   4. API DESIGN
   ============================================ */
// Endpoints:
// POST /api/...
// GET /api/...

/* ============================================
   5. SCALING & TRADE-OFFS
   ============================================ */
// -
`
    } else {
      // For DSA problems, load starter code
      initialCode =
        (scenario as any).starterCode?.[selectedLanguage] ||
        `function solution() {
  // Write your solution here

}`
    }
    setCode(initialCode)
    setStarterCode(initialCode)

    if (scenario.type === "bugfix") {
      const startedAt = Date.now()
      setBugfixEvidenceEvents([
        createBugfixEvidenceEvent({
          type: "session_started",
          timestamp: startedAt,
        }),
        createBugfixEvidenceEvent({
          type: "incident_read",
          timestamp: startedAt + 1,
        }),
        ...(initialBugfixFileEvent ? [initialBugfixFileEvent] : []),
      ])
    }

    // Extract protected elements for code protection
    const protectedElementsData = extractProtectedElements(initialCode, activeLanguage)
    setProtectedElements(protectedElementsData)

    // Initialize interviewer with welcome message (problem details are now in left panel)
    const problemType = getProblemTypeLabel(scenario.type)
    const initialMessage = getInitialInterviewerMessage(
      scenario.title,
      scenario.difficulty,
      problemType
    )

    setInterviewerMessages([{ type: "ai", message: initialMessage }])
    setRecentNudgeTopics([]) // Reset tracked topics for new interview
    // Only set chat messages for non-DSA scenarios (DSA has no AI partner)
    const partnerMessage = getInitialPartnerMessage(scenario)
    if (partnerMessage) {
      setChatMessages([{ type: "ai", message: partnerMessage }])
    } else {
      setChatMessages([]) // Clear chat messages for DSA
    }

    // Don't fetch hints immediately - wait for user to write code
    // Hints will be fetched when user has written meaningful code (see useEffect below)
  }

  const resetInterview = async () => {
    // Update session if it exists and was completed
    const isSystemDesign = selectedScenario?.type === "system-design"
    const hasTests = testSummary.total > 0
    const shouldUpdate =
      currentSessionId &&
      (showFeedback || showPostInterviewDiscussion) &&
      (hasTests || isSystemDesign)

    if (shouldUpdate) {
      try {
        // IMPORTANT: Only update session if feedback has NOT been persisted by the streaming flow
        // The persist endpoint saves the authoritative feedback/scores to Firestore
        // We should NOT overwrite that data with potentially stale React state
        const feedbackWasPersisted = streamingFeedback.state.isPersisted

        if (!feedbackWasPersisted) {
          // Feedback wasn't persisted (maybe user left early or streaming failed)
          // Save whatever we have as a fallback
          const scoreToSave =
            performanceScore !== null ? performanceScore : hasTests ? testSummary.passRate : 0
          const feedbackText = isSystemDesign
            ? comprehensiveFeedback ||
              `Completed system design interview: ${selectedScenario?.title}`
            : comprehensiveFeedback ||
              `Completed ${selectedScenario?.title} with ${testSummary.passed}/${testSummary.total} tests passing`

          await updateInterviewSession(currentSessionId, scoreToSave, feedbackText, {
            code: code || (isSystemDesign ? "// Design notes" : ""),
            language: isSystemDesign ? "notes" : selectedLanguage,
            testResults: hasTests ? testResults : undefined,
            timeComplexity: efficiencyMetrics?.estimatedTimeComplexity,
            spaceComplexity: efficiencyMetrics?.estimatedSpaceComplexity,
            efficiencyScore: efficiencyMetrics?.efficiencyScore,
            feedbackStatus: "complete", // Mark as complete even if fallback
            technicalScore: technicalScore ?? undefined,
            scoreBreakdown: scoreBreakdown
              ? {
                  understanding: scoreBreakdown.understandingScore,
                  problemSolving: scoreBreakdown.problemSolvingScore,
                  codeQuality: scoreBreakdown.codeQualityScore,
                  communication: scoreBreakdown.communicationScore,
                }
              : undefined,
            structuredFeedback: structuredFeedback
              ? {
                  ...structuredFeedback,
                  rawFeedback: feedbackText,
                }
              : undefined,
            clarifyingQuestionsAssessment: clarifyingQuestionsAssessment || undefined,
          })
        }
        // If feedbackWasPersisted is true, the persist endpoint already saved the correct data
        // to Firestore, so we don't need to do anything here

        // Store system design notes if not already stored (this is separate from feedback)
        if (isSystemDesign && selectedScenario?.id && user) {
          const scoreForRag =
            performanceScore !== null ? performanceScore : hasTests ? testSummary.passRate : 0
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
    if (firebaseUser && selectedScenario) {
      const storageKey = `interview_autosave_${firebaseUser.uid}_${selectedScenario.id}`
      try {
        localStorage.removeItem(storageKey)
      } catch (e) {
        // Silent failure - localStorage might be unavailable
      }
    }

    // Stop any active voice recordings and countdowns to prevent Deepgram billing
    interviewerVoice.cancelCountdown()
    partnerVoice.cancelCountdown()
    if (interviewerVoice.isRecording) {
      interviewerVoice.stopRecording()
    }
    if (partnerVoice.isRecording) {
      partnerVoice.stopRecording()
    }

    // Clear all proactive interview timers
    if (proactiveTimer) {
      clearTimeout(proactiveTimer)
      setProactiveTimer(null)
    }
    if (inactivityTimerRef.current) {
      clearInterval(inactivityTimerRef.current)
      inactivityTimerRef.current = null
    }
    // Silence-detection teardown + flag reset is owned by useInterviewProactiveAI
    resetProactiveState()

    // Reset proactive trigger flags
    hasTriggeredInactivityRef.current = false
    hasFetchedHintsRef.current = false
    lastCodeChangeRef.current = Date.now()

    setIsInterviewStarted(false)
    setShowFeedback(false)
    setShowPostInterviewDiscussion(false)
    setComprehensiveFeedback("")
    setPerformanceScore(null)
    setTechnicalScore(null)
    setScoreBreakdown(null)
    setIsGeneratingDiscussion(false)
    setShowScenarioBrowser(true)
    setCode("")
    setInterviewerMessages([])
    setChatMessages([])
    setRecentNudgeTopics([])
    setTestResults([])
    setTestSummary({ total: 0, passed: 0, failed: 0, passRate: 0 })
    setStartTime(null)
    setElapsedTime(0)
    lastCodeHashRef.current = ""
    setCurrentSessionId(null)
    setRevealedHints(0)
    setRevealedHintIndices(new Set())
    hintAgent.resetHints()
    setRevealedAIHintIndices(new Set())
    setHintFeedback(new Map())
    setWorkspaceContext([])
    setActiveWorkspacePath(null)
    resetBugfixSessionState()
    setEfficiencyMetrics(null)
    setProtectedElements(null)
    setStarterCode("")
  }

  const proceedToFinalFeedback = async () => {
    const bugfixEvidencePayload = buildBugfixEvidencePayload()
    const bugfixExpectedTouchedFiles = getBugfixExpectedTouchedFiles()

    setShowPostInterviewDiscussion(false)
    setIsGeneratingFeedback(true)
    setShowFeedback(true)

    // CRITICAL: Mark session as evaluating FIRST, before generating feedback
    // This ensures if user navigates away, the session shows as "evaluating" not "in progress"
    if (currentSessionId && user) {
      try {
        await markSessionEvaluating(currentSessionId, {
          code,
          language: selectedLanguage,
          elapsedTime,
          chatMessages,
          interviewerMessages,
          testResults,
          testSummary,
          isPostInterviewDiscussion: true,
          workspaceContext,
          activeWorkspacePath,
          consoleLogs,
          bugfixEvidenceEvents: bugfixEvidencePayload,
          bugfixHypothesis,
          bugfixRootCause,
          bugfixPrevention,
        })
      } catch (markError) {
        console.error("Failed to mark session as evaluating:", markError)
        // Continue anyway - feedback generation should still proceed
      }
    }

    // Now generate feedback - includes ALL conversation including post-interview discussion
    try {
      if (!selectedScenario) {
        setIsGeneratingFeedback(false)
        return
      }

      const partnerMessagesSent = chatMessages.filter((msg) => msg.type === "user").length
      const partnerMessagesReceived = chatMessages.filter((msg) => msg.type === "ai").length
      const interviewerUserMessages = interviewerMessages.filter((msg) => msg.type === "user")
      const interviewerQuestionsAnswered = interviewerUserMessages.length
      const interviewerClarificationsRequested = interviewerUserMessages.filter((msg) =>
        msg.message.includes("?")
      ).length
      const interviewerFeedbackAcknowledged = interviewerUserMessages.filter((msg) =>
        /thanks|got it|understand|cool|okay|ok/i.test(msg.message)
      ).length
      const proactiveInteractions =
        interviewerQuestionsAnswered > 0 || partnerMessagesSent > 0 ? 1 : 0

      const aiCollaborationMetrics = {
        partnerMessagesSent,
        partnerMessagesReceived,
        partnerHintsRequested: revealedHints,
      }

      const interactionMetrics = {
        interviewerQuestionsAnswered,
        interviewerClarificationsRequested,
        interviewerFeedbackAcknowledged,
        proactiveInteractions,
        problemDifficulty: selectedScenario?.difficulty,
        problemType: selectedScenario?.type,
        skillsDemonstrated: selectedScenario?.tags || [],
      }

      const feedbackText = `Completed ${selectedScenario?.title} with ${testSummary.passed}/${testSummary.total} tests passing`
      let calculatedPerformanceScore = testSummary.passRate
      const localTechnicalScore: number | undefined = undefined
      let scoreBreakdownData: {
        understanding?: number
        problemSolving?: number
        codeQuality?: number
        communication?: number
      } | null = null
      let aiFeedbackSucceeded = false
      const localConstitutionalAICritique: Record<string, unknown> | null = null
      const localClarifyingQuestionsAssessment: {
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
      } | null = null

      const efficiencyData = analyzeCodeEfficiency(
        code,
        (selectedScenario as any)?.optimalComplexity
      )

      if (currentSessionId && user && code.trim()) {
        try {
          // Prepare conversation transcript - NOW includes ALL messages including post-interview discussion
          const conversationTranscript = [
            ...interviewerMessages.map((m) => ({
              role: m.type === "user" ? "candidate" : "interviewer",
              content: m.message,
              timestamp: m.timestamp,
            })),
            ...chatMessages.map((m) => ({
              role: m.type === "user" ? "candidate" : "ai_partner",
              content: m.message,
              timestamp: m.timestamp,
            })),
          ].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))

          // Build phase tracking info for scoring
          const phaseTracking = {
            submittedFromPhase: getCurrentInterviewPhase(),
            testsRanBeforeSubmit: testResults.length > 0,
            hadDiscussionPhase: conversationTracker.approachExplained,
            conversationTracker: {
              approachExplained: conversationTracker.approachExplained,
              approachType: conversationTracker.approachType,
              timeComplexityMentioned: conversationTracker.timeComplexityMentioned,
              spaceComplexityMentioned: conversationTracker.spaceComplexityMentioned,
              complexityExplanationGiven: conversationTracker.complexityExplanationGiven,
              edgeCasesMentioned: conversationTracker.edgeCasesMentioned,
              hintsGiven: conversationTracker.hintsGiven,
            },
          }

          // ================================================================
          // TWO-PHASE FEEDBACK: Get instant scores, then poll for rich feedback
          // Phase 1: Instant algorithmic scores (< 3 seconds)
          // Phase 2: Rich AI-generated narrative (background, polled)
          // ================================================================
          // ================================================================
          // STREAMING FEEDBACK: Edge function with NO TIMEOUT
          // Scores stream in immediately, then rich feedback follows
          // ================================================================
          const hintsUsedCount = revealedHintIndices.size + revealedAIHintIndices.size
          const feedbackRequest = {
            sessionId: currentSessionId,
            userId: user.id,
            code,
            language: selectedLanguage,
            testsPassed: testSummary.passed,
            testsTotal: testSummary.total,
            scenarioType: selectedScenario?.type,
            scenarioTitle: selectedScenario?.title,
            scenarioId: selectedScenario?.id,
            scenarioDifficulty: selectedScenario?.difficulty,
            scenarioPattern: (selectedScenario as any)?.pattern,
            conversationTranscript,
            partnerMessages: chatMessages.filter((m) => m.type === "ai").map((m) => m.message),
            phaseTracking,
            silentNotes: conversationTracker.silentNotes || [],
            efficiencyMetrics: efficiencyData,
            submittedFromPhase: getCurrentInterviewPhase(),
            testsRanBeforeSubmit: testResults.length > 0,
            // For mastery score calculation in persist endpoint
            hintsUsed: hintsUsedCount,
            elapsedTimeSeconds: elapsedTime,
            bugfixEvidenceEvents: bugfixEvidencePayload,
            bugfixExpectedTouchedFiles,
            bugfixHypothesis,
            bugfixRootCause,
            bugfixPrevention,
            bugfixRootCauseRubric:
              selectedScenario?.type === "bugfix"
                ? (selectedScenario as BugFixScenario).rootCauseRubric
                : [],
            bugfixGroundTruth:
              selectedScenario?.type === "bugfix"
                ? (selectedScenario as BugFixScenario).bugDescription
                : "",
          }

          // Start streaming feedback - scores come first, then rich feedback
          // The useEffect above handles updating state as events stream in
          lastFeedbackRequestRef.current = feedbackRequest
          streamingFeedback.startStreaming(feedbackRequest)

          // Set initial values while streaming
          aiFeedbackSucceeded = true
          calculatedPerformanceScore = testSummary.passRate // Will be updated by stream
          scoreBreakdownData = {
            understanding: 50,
            problemSolving: 50,
            codeQuality: 50,
            communication: 50,
          }
        } catch (feedbackError) {
          console.error("Error generating feedback:", feedbackError)
          toast.error("Feedback generation failed", {
            description: "Applying automated fallback scoring.",
          })
          if (lastFeedbackRequestRef.current) {
            applyFallbackFeedback(lastFeedbackRequestRef.current)
          }
        }
      }

      // Don't set placeholder feedback - wait for streaming to complete
      // The useEffect watching streamingFeedback.state will update these
      // Only set initial performance score based on test results (will be updated by streaming)
      setPerformanceScore(calculatedPerformanceScore)

      // Save basic session completion data (code, test results, etc.)
      // NOTE: The persist endpoint will handle saving the AI-generated feedback and scores
      // We only save basic data here with feedbackStatus: "processing"
      if (currentSessionId && user) {
        try {
          // Save basic session data - feedback and scores will be updated by /api/feedback/persist
          await updateInterviewSession(currentSessionId, undefined, undefined, {
            code,
            language: selectedLanguage,
            testResults,
            timeComplexity: efficiencyData?.estimatedTimeComplexity,
            spaceComplexity: efficiencyData?.estimatedSpaceComplexity,
            efficiencyScore: efficiencyData?.efficiencyScore,
            // Mark as processing - persist endpoint will update to "complete"
            feedbackStatus: "processing",
            bugfixEvidenceEvents: bugfixEvidencePayload,
            bugfixHypothesis,
            bugfixRootCause,
            bugfixPrevention,
          })

          trackSessionCompletion({
            sessionId: currentSessionId,
            finalCode: code,
            language: selectedLanguage,
            testsPassed: testSummary.passed,
            testsTotal: testSummary.total,
            efficiencyScore: efficiencyData?.efficiencyScore || 50,
          }).catch((err) => console.error("Session metrics tracking failed:", err))

          // Note: Spaced repetition update will be triggered by persist endpoint
          // after mastery score is properly calculated

          if (isFromRoadmap && selectedScenario && activeRoadmap) {
            markQuestionCompleted(selectedScenario.id, calculatedPerformanceScore)
            const minutesSpent = Math.round(elapsedTime / 60)
            if (minutesSpent > 0) {
              addActualTime(minutesSpent)
            }
            sessionStorage.setItem(
              "roadmap-question-just-completed",
              JSON.stringify({
                scenarioId: selectedScenario.id,
                roadmapId: activeRoadmap.id,
                timestamp: Date.now(),
              })
            )
            toast.success("Progress saved to your roadmap!")
          }

          const isSystemDesign = selectedScenario?.type === "system-design"
          const shouldStore = selectedScenario?.id && (code.trim() || isSystemDesign)

          if (shouldStore) {
            fetch("/api/rag", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "store-solution",
                userId: user.id,
                problemId: selectedScenario.id,
                problemTitle: selectedScenario.title,
                solutionCode:
                  code || (isSystemDesign ? "// Design discussion completed via chat" : ""),
                language: selectedLanguage,
                passed: isSystemDesign ? true : testSummary.passed === testSummary.total,
                score: calculatedPerformanceScore,
                problemType: selectedScenario.type,
              }),
            }).catch((err) => console.error("Solution storage error:", err))
          }

          fetch("/api/vectorize-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: user.id,
              sessionId: currentSessionId,
              scenarioId: selectedScenario?.id,
              scenarioTitle: selectedScenario?.title,
              language: selectedLanguage,
              code,
              testResults,
              timeSpent: elapsedTime,
              aiCollaborationMetrics,
              interactionMetrics,
              efficiencyMetrics: efficiencyData,
              scores: {
                correctness:
                  testResults.length > 0
                    ? (testResults.filter((t: TestResult) => t.passed).length /
                        testResults.length) *
                      100
                    : 0,
                efficiency: efficiencyData.efficiencyScore,
                codeQuality: 70,
                reasoningExplanation: aiCollaborationMetrics.partnerMessagesSent > 0 ? 50 : 0,
                aiCollaboration: aiCollaborationMetrics.partnerMessagesSent > 0 ? 50 : 0,
                overall: calculatedPerformanceScore,
              },
            }),
          }).catch((err) => console.error("Vectorization error:", err))
        } catch (error) {
          console.error("Error updating session on completion:", error)
          toast.warning("Session progress may not be fully saved", {
            description:
              "Your feedback is still available, but progress tracking may be incomplete.",
          })
        }
      } else if (currentSessionId && isGuestMode && guestId) {
        try {
          await fetch("/api/guest-session", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: currentSessionId,
              guestId,
              performanceScore: calculatedPerformanceScore,
              feedback: feedbackText,
              finalCode: code,
              language: selectedLanguage,
              testResults,
              timeComplexity: efficiencyData?.estimatedTimeComplexity,
              spaceComplexity: efficiencyData?.estimatedSpaceComplexity,
              efficiencyScore: efficiencyData?.efficiencyScore,
            }),
          })
        } catch (error) {
          console.error("Error saving guest session completion:", error)
        }
      }

      // Show signup prompt for guest users
      if (isGuestMode && guestId) {
        setTimeout(() => setShowSignupPrompt(true), 2000)
        markFreeTrialUsed()
        if (currentSessionId && selectedScenario) {
          saveGuestSessionData({
            sessionId: currentSessionId,
            scenarioId: selectedScenario.id,
            scenarioTitle: selectedScenario.title,
            startedAt: new Date().toISOString(),
            feedback: {
              score: calculatedPerformanceScore || 0,
              summary: feedbackText,
              feedbackData: null,
            },
          })
        }
      }
    } catch (error) {
      console.error("Error generating final feedback:", error)
      toast.error("Failed to generate feedback")
    } finally {
      setIsGeneratingFeedback(false)
    }
  }

  // Submit feedback for a hint (async, non-blocking)
  const submitHintFeedback = async (hintIndex: number, feedbackType: "helpful" | "unhelpful") => {
    const hintId = `hint-${selectedScenario?.id}-${hintIndex}`

    // Update local state immediately for responsive UI
    setHintFeedback((prev) => {
      const newMap = new Map(prev)
      newMap.set(hintId, feedbackType)
      return newMap
    })

    // Send feedback to API (non-blocking)
    try {
      await fetch("/api/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "record-feedback",
          hintId,
          feedbackType,
          userId: user?.id || guestId,
          sessionId: currentSessionId,
          problemId: selectedScenario?.id,
          hintText: ragHints[hintIndex]?.hint,
          source: "ai-hint",
        }),
      })
    } catch (error) {
      console.error("Error submitting hint feedback:", error)
      // Don't revert - feedback is stored locally anyway
    }
  }

  // AI Usage Tips content
  const aiUsageTips = [
    {
      title: "Ask Strategic Questions",
      description:
        "Don't ask the AI to solve the problem. Instead, ask about specific concepts: 'What data structure is best for O(1) lookups?' or 'How does the two-pointer technique work?'",
      good: "What's the time complexity of using a hash map vs array for lookups?",
      bad: "Can you solve this two-sum problem for me?",
    },
    {
      title: "Explain Your Thinking",
      description:
        "Share your approach before asking for help. This shows the interviewer you're thinking, and helps the AI give more relevant hints.",
      good: "I'm thinking of using nested loops but worried about O(n²). Is there a better approach?",
      bad: "What should I do?",
    },
    {
      title: "Debug with Context",
      description:
        "When debugging, provide specific context about what's failing and what you've tried.",
      good: "My code returns [1,2] but expected [2,1]. I think the issue is in my sorting logic. Can you help me trace through it?",
      bad: "Why isn't my code working?",
    },
    {
      title: "Verify Understanding",
      description:
        "After getting a hint, explain it back in your own words. This shows the interviewer you understand, not just copy.",
      good: "So you're suggesting I use a hash map because lookup is O(1)? Let me implement that.",
      bad: "*copies suggestion without explanation*",
    },
  ]

  // Voice recording with Deepgram (or Web Speech API fallback)
  const toggleVoiceRecording = async (isInterviewer: boolean) => {
    const voice = isInterviewer ? interviewerVoice : partnerVoice
    const setInput = isInterviewer ? setInterviewerInput : setChatInput

    try {
      if (voice.isRecording) {
        // Stop recording - DON'T auto-send, let user click send button
        stopVoiceRecording(isInterviewer)
      } else {
        // Start recording
        // Reset the transcript before starting
        voice.resetTranscript()
        setInput("")
        await voice.startRecording()
        toast.success("Recording... click Send when ready", {
          duration: 2000,
          icon: "🎙️",
        })
      }
    } catch (err: any) {
      console.error("Voice recording error:", err)
      const errorMessage = err.message || String(err)

      // Permission errors
      if (
        errorMessage.includes("denied") ||
        errorMessage.includes("NotAllowed") ||
        errorMessage.includes("Permission")
      ) {
        toast.error(
          "Microphone access denied. Please allow microphone access in your browser settings."
        )
      }
      // Device not found
      else if (
        errorMessage.includes("NotFound") ||
        errorMessage.includes("No microphone detected")
      ) {
        toast.error("No microphone found. Please connect a microphone and try again.")
      }
      // Deepgram configuration
      else if (errorMessage.includes("API key not configured")) {
        toast.error("Voice service not configured. Please contact support.")
      }
      // WebSocket/connection errors
      else if (errorMessage.includes("WebSocket") || errorMessage.includes("connection error")) {
        toast.error("Connection error. Please check your internet and try again.")
      }
      // Microphone disconnected mid-recording
      else if (errorMessage.includes("disconnected") || errorMessage.includes("inactive")) {
        toast.error("Microphone disconnected. Please reconnect and try again.")
      }
      // Browser compatibility
      else if (errorMessage.includes("MediaRecorder") || errorMessage.includes("not supported")) {
        toast.error("Voice recording not supported in this browser. Try Chrome or Edge.")
      }
      // Audio format issues
      else if (errorMessage.includes("mime type")) {
        toast.error("Audio format not supported. Try a different browser.")
      }
      // Web Speech API fallback error
      else if (errorMessage.includes("Speech recognition")) {
        toast.error("Speech recognition not available. Try Chrome or Edge browser.")
      }
      // Generic fallback with actual error for debugging
      else {
        console.error("Unhandled voice error type:", errorMessage)
        toast.error(
          `Voice input error: ${errorMessage.substring(0, 50)}${errorMessage.length > 50 ? "..." : ""}`
        )
      }
    }
  }

  // Stop recording without auto-sending - user will click send button
  const stopVoiceRecording = (isInterviewer: boolean) => {
    const voice = isInterviewer ? interviewerVoice : partnerVoice
    const setInput = isInterviewer ? setInterviewerInput : setChatInput

    if (voice.isRecording) {
      const finalTranscript = voice.stopRecording()
      if (finalTranscript?.trim()) {
        setInput(finalTranscript)
        toast.success("Recording stopped - click Send to submit", { duration: 2000 })
      } else {
        toast.success("Recording stopped", { duration: 1500 })
      }
    }
  }

  const { handleSendMessage, handleAutoSend } = useInterviewChat({
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
  })

  // Note: analyzeCodeEfficiency is now imported from @/lib/interview
  // Usage: analyzeCodeEfficiency(code, (selectedScenario as any)?.optimalComplexity)

  const submitSystemDesign = async () => {
    if (!selectedScenario || selectedScenario.type !== "system-design") return

    setIsRunningTests(true) // Reuse this state for loading indicator

    // Clear auto-save data immediately on submission to prevent session restoration
    if (firebaseUser && selectedScenario) {
      const storageKey = `interview_autosave_${firebaseUser.uid}_${selectedScenario.id}`
      try {
        localStorage.removeItem(storageKey)
      } catch (e) {
        // Silent failure - localStorage might be unavailable
      }
    } else if (isGuestMode && selectedScenario) {
      const storageKey = `interview_autosave_guest_${selectedScenario.id}`
      try {
        localStorage.removeItem(storageKey)
      } catch (e) {
        // Silent failure
      }
    }

    try {
      // Mark question as evaluating in roadmap (if from roadmap)
      if (isFromRoadmap && selectedScenario && activeRoadmap) {
        markQuestionEvaluating(selectedScenario.id)
      }

      // Generate feedback for system design based on conversation and design notes
      await triggerSystemDesignFeedback()

      // Show success feedback
      playSound("success")
      toast.success("Design submitted!", {
        description: "Your design notes have been saved. Review your feedback below.",
      })
    } catch (error) {
      console.error("System design submission error:", error)
      toast.error("Failed to submit design", {
        description: "There was a problem submitting your design. Please try again.",
        duration: 6000,
        action: {
          label: "Retry",
          onClick: () => submitSystemDesign(),
        },
      })
    } finally {
      setIsRunningTests(false)
    }
  }

  const triggerSystemDesignFeedback = async () => {
    setIsGeneratingDiscussion(true)

    try {
      if (!selectedScenario || selectedScenario.type !== "system-design") {
        return
      }

      const partnerMessagesSent = chatMessages.filter((msg) => msg.type === "user").length
      const partnerMessagesReceived = chatMessages.filter((msg) => msg.type === "ai").length
      const interviewerUserMessages = interviewerMessages.filter((msg) => msg.type === "user")
      const interviewerQuestionsAnswered = interviewerUserMessages.length
      const interviewerClarificationsRequested = interviewerUserMessages.filter((msg) =>
        msg.message.includes("?")
      ).length
      const interviewerFeedbackAcknowledged = interviewerUserMessages.filter((msg) =>
        /thanks|got it|understand|cool|okay|ok/i.test(msg.message)
      ).length
      const proactiveInteractions =
        interviewerQuestionsAnswered > 0 || partnerMessagesSent > 0 ? 1 : 0

      const aiCollaborationMetrics = {
        partnerMessagesSent,
        partnerMessagesReceived,
        partnerHintsRequested: revealedHints,
      }

      const interactionMetrics = {
        interviewerQuestionsAnswered,
        interviewerClarificationsRequested,
        interviewerFeedbackAcknowledged,
        proactiveInteractions,
        problemDifficulty: selectedScenario?.difficulty,
        problemType: selectedScenario?.type,
        skillsDemonstrated: selectedScenario?.tags || [],
      }

      // For system design, generate feedback based on conversation and design notes
      // Create a mock summary for system design (no tests, but we need the structure)
      const mockSummary = {
        passed: 0,
        failed: 0,
        total: 0,
        passRate: 0, // Will be calculated by feedback system based on conversation
      }

      // Generate comprehensive feedback
      let comprehensiveFeedback = `Completed system design interview: ${selectedScenario?.title}`
      let calculatedPerformanceScore = 0

      // Mark session as evaluating BEFORE feedback generation starts
      // This prevents the session from being reopened if user refreshes
      if (currentSessionId && user) {
        try {
          await markSessionEvaluating(currentSessionId, {
            code: code || "// Design notes completed via discussion",
            language: "notes",
            elapsedTime,
            chatMessages,
            interviewerMessages,
            testResults: [],
            testSummary: mockSummary,
            isPostInterviewDiscussion: true,
          })
        } catch (markError) {
          console.error("Failed to mark session as evaluating:", markError)
          // Continue anyway - this is non-critical
        }
      }

      // Prepare conversation transcript for content-based evaluation
      // This allows the AI to evaluate WHAT was said, not just message counts
      const conversationTranscript = [
        ...interviewerMessages.map((m) => ({
          role: m.type === "user" ? "candidate" : "interviewer",
          content: m.message,
          timestamp: m.timestamp,
        })),
        ...chatMessages.map((m) => ({
          role: m.type === "user" ? "candidate" : "ai_partner",
          content: m.message,
          timestamp: m.timestamp,
        })),
      ].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))

      // Generate feedback using the feedback API
      const feedbackResponse = await fetch("/api/generate-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code || "// Design notes completed via discussion",
          scenarioTitle: selectedScenario.title,
          scenarioType: selectedScenario.type,
          scenarioId: selectedScenario.id,
          scenarioDifficulty: selectedScenario.difficulty,
          scenarioPattern: (selectedScenario as any)?.pattern,
          scenarioCompany: targetCompany, // Target company for company-specific feedback
          testResults: [], // No tests for system design
          language: "notes",
          timeSpent: elapsedTime,
          aiCollaborationMetrics,
          interactionMetrics,
          efficiencyMetrics: null, // No code efficiency for system design
          conversationTranscript, // Pass actual conversation for AI analysis
          sessionId: currentSessionId,
          userId: user?.id,
          // Real Interview Mode (clarifying questions)
          scenarioClarifyingQuestions: (selectedScenario as any)?.clarifyingQuestions,
          realInterviewMode,
          // Pass silent notes from real-time tracking (systemic fix)
          silentNotes: conversationTracker.silentNotes || [],
        }),
      })

      let systemDesignScoreBreakdown: {
        understanding?: number
        problemSolving?: number
        codeQuality?: number
        communication?: number
      } | null = null
      let systemDesignTechnicalScore: number | undefined = undefined
      let systemDesignStructuredFeedback:
        | {
            scores?: Record<string, number>
            tldr?: string
            whatWorked?: string[]
            fixNext?: string[]
            actionPlan?: string[]
            rawFeedback?: string
          }
        | undefined
      if (feedbackResponse.ok) {
        const feedbackData = await feedbackResponse.json()
        comprehensiveFeedback = feedbackData.feedback || comprehensiveFeedback
        calculatedPerformanceScore = feedbackData.scores?.overall || 0
        if (feedbackData.structured) {
          systemDesignStructuredFeedback = feedbackData.structured
          setStructuredFeedback({
            whatWorked: feedbackData.structured.whatWorked || [],
            fixNext: feedbackData.structured.fixNext || [],
            actionPlan: feedbackData.structured.actionPlan || [],
            tldr: feedbackData.structured.tldr || "",
          })
        }
        // Store technical score (mastery-based) for Overall/Technical toggle
        if (feedbackData.technicalScore !== undefined) {
          systemDesignTechnicalScore = feedbackData.technicalScore
          setTechnicalScore(feedbackData.technicalScore)
        }
        // Store score breakdown for technical score calculations and display
        if (feedbackData.scores) {
          systemDesignScoreBreakdown = feedbackData.scores
          // Also set state for PracticeFeedback component
          // Ensure all scores are defined numbers before setting state
          if (feedbackData.scores) {
            const scores = feedbackData.scores
            setScoreBreakdown({
              understandingScore:
                scores.understanding !== undefined && scores.understanding !== null
                  ? scores.understanding
                  : undefined,
              problemSolvingScore:
                scores.problemSolving !== undefined && scores.problemSolving !== null
                  ? scores.problemSolving
                  : undefined,
              codeQualityScore:
                scores.codeQuality !== undefined && scores.codeQuality !== null
                  ? scores.codeQuality
                  : undefined,
              communicationScore:
                scores.communication !== undefined && scores.communication !== null
                  ? scores.communication
                  : undefined,
            })
          }
        }
      }

      setComprehensiveFeedback(comprehensiveFeedback)
      setPerformanceScore(calculatedPerformanceScore)

      // Update session with completion data
      if (currentSessionId && user) {
        try {
          await updateInterviewSession(
            currentSessionId,
            calculatedPerformanceScore,
            comprehensiveFeedback,
            {
              code: code || "// Design notes",
              language: "notes",
              testResults: [],
              feedbackStatus: "complete", // Feedback generation is done
              // Pass pre-calculated technical score from API for consistency
              technicalScore: systemDesignTechnicalScore,
              scoreBreakdown: systemDesignScoreBreakdown || undefined,
              structuredFeedback: systemDesignStructuredFeedback,
            }
          )

          // Track session completion for user stats (async, non-blocking)
          trackSessionCompletion({
            sessionId: currentSessionId,
            finalCode: code || "// Design notes",
            language: "notes",
            testsPassed: 1, // System design counts as passed
            testsTotal: 1,
            efficiencyScore: 50, // Not applicable for system design
            communicationScore: calculatedPerformanceScore,
          }).catch((err) => console.error("Session metrics tracking failed:", err))

          // Update spaced repetition state (due dates and streak)
          if (selectedScenario) {
            const hintsUsedCount = revealedHintIndices.size + revealedAIHintIndices.size
            updateSpacedRepetition({
              problemId: selectedScenario.id,
              performanceScore: calculatedPerformanceScore,
              masteryScore: systemDesignScoreBreakdown
                ? Math.round(
                    (systemDesignScoreBreakdown.understanding || 0) * 0.3 +
                      (systemDesignScoreBreakdown.problemSolving || 0) * 0.4 +
                      (systemDesignScoreBreakdown.codeQuality || 0) * 0.3
                  )
                : undefined,
              timeSpentMinutes: Math.round(elapsedTime / 60),
              hintsUsed: hintsUsedCount,
              testCasesPassed: 1, // System design counts as passed
              testCasesTotal: 1,
            }).catch((err) => console.error("Spaced repetition update failed:", err))
          }

          // Mark question complete in roadmap if user came from roadmap
          // Note: Check both param patterns for compatibility
          const isFromRoadmapHere =
            searchParams.get("from") === "roadmap" || searchParams.get("roadmap") === "true"
          if (isFromRoadmapHere && selectedScenario && activeRoadmap) {
            markQuestionCompleted(selectedScenario.id, calculatedPerformanceScore)
            const minutesSpent = Math.round(elapsedTime / 60)
            if (minutesSpent > 0) {
              addActualTime(minutesSpent)
            }
            // Signal to roadmap page that a question was just completed (for day completion modal)
            sessionStorage.setItem(
              "roadmap-question-just-completed",
              JSON.stringify({
                scenarioId: selectedScenario.id,
                roadmapId: activeRoadmap.id,
                timestamp: Date.now(),
              })
            )
            toast.success("Progress saved to your roadmap!")
          }

          // Store solution for RAG (async, non-blocking)
          if (selectedScenario?.id) {
            fetch("/api/rag", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "store-solution",
                userId: user.id,
                problemId: selectedScenario.id,
                problemTitle: selectedScenario.title,
                solutionCode: code.trim() || "// Design discussion completed",
                language: "notes",
                passed: true,
                score: calculatedPerformanceScore,
                problemType: "system-design",
              }),
            }).catch((err) => {
              console.error("Solution storage error (non-blocking):", err)
            })
          }
        } catch (error) {
          console.error("Error updating session:", error)
        }
      } else if (currentSessionId && isGuestMode && guestId) {
        // Guest user - save completion data via API
        try {
          await fetch("/api/guest-session", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: currentSessionId,
              guestId,
              performanceScore: calculatedPerformanceScore,
              feedback: comprehensiveFeedback,
              finalCode: code || "// Design notes",
              language: "notes",
              testResults: [],
            }),
          })
        } catch (error) {
          console.error("Error saving guest session completion:", error)
        }
      }

      // Start post-interview discussion phase
      setShowPostInterviewDiscussion(true)

      // Trigger interviewer to provide final feedback
      const finalMessage = `The candidate has submitted their design. Please provide a brief summary of their performance, highlighting strengths and areas for improvement. Keep it concise (2-3 sentences).`

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: finalMessage,
          context: interviewerMessages,
          role: "interviewer",
          userContext: user
            ? {
                email: user.email,
                full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "",
                skill_level: experienceLevel,
              }
            : { skill_level: experienceLevel },
          currentCode: code,
          scenarioTitle: selectedScenario?.title,
          scenarioType: selectedScenario?.type,
          scenarioCompany: targetCompany, // Target company for RAG context
          isProactive: false,
          isPostInterview: true,
          isEndingSession: false,
          edgeCases: getEdgeCasesForInterviewer(),
          // Pass recent topics to prevent repetitive questions
          recentNudgeTopics: recentNudgeTopics,
          // Pass test results and console logs for interviewer awareness
          testResults: testResults,
          consoleLogs: consoleLogs,
          // Phase-aware interview tracking
          // NOTE: Explicitly set phase params because React state may not have updated yet
          interviewPhase: "post_interview" as const,
          conversationTracker,
          hasSubmitted: true,
          solutionComplexity: null, // System design doesn't have complexity metrics
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        console.warn("[API] Request failed:", response.status, response.url, data)
      }
      if (data.reply) {
        setInterviewerMessages((prev) => [...prev, { type: "ai", message: data.reply }])
        // Track interviewer response for conversation context
        updateTrackerOnMessage(data.reply, "interviewer")
      }
    } catch (error) {
      console.error("Error generating system design feedback:", error)
      toast.error("Failed to generate feedback", {
        description: "There was a problem generating your feedback. Please try again.",
      })
    } finally {
      setIsGeneratingDiscussion(false)
    }
  }

  const { runCode, submitCode } = useCodeExecution({
    selectedScenario,
    code,
    selectedLanguage,
    workspaceContext,
    activeWorkspacePath,
    elapsedTime,
    chatMessages,
    interviewerMessages,
    consoleLogs,
    bugfixHypothesis,
    bugfixRootCause,
    bugfixPrevention,
    realInterviewMode,
    strictTimeLimit,
    currentSessionId,
    user,
    firebaseUser,
    isGuestMode,
    isFromRoadmap,
    activeRoadmap,
    setTestResults,
    setConsoleLogs,
    setIsRunningTests,
    setTestSummary,
    setEfficiencyMetrics,
    setInterviewerMessages,
    setShowPostInterviewDiscussion,
    playSound,
    updateTrackerOnTestsRun,
    recordBugfixEvidence,
    buildBugfixEvidencePayload,
    syncHintAgentWithTestOutcome,
    triggerPostInterviewDiscussion,
    markQuestionEvaluating,
  })

  const editorConsoleOutputs = useMemo(
    () =>
      consoleLogs.map((log) => ({
        type: log.type as "log" | "error" | "warn" | "info",
        message: log.message,
        timestamp: log.timestamp,
      })),
    [consoleLogs]
  )

  const handleClearConsole = useCallback(() => {
    setConsoleLogs([])
    setTestResults([])
    setTestSummary({ total: 0, passed: 0, failed: 0, passRate: 0 })
  }, [])

  const handleBugfixReflectionChange = useCallback(
    (field: "hypothesis" | "rootCause" | "prevention", value: string) => {
      if (field === "hypothesis") setBugfixHypothesis(value)
      if (field === "rootCause") setBugfixRootCause(value)
      if (field === "prevention") setBugfixPrevention(value)
    },
    []
  )

  const handleBugfixReflectionCommit = useCallback(
    (field: "hypothesis" | "rootCause" | "prevention") => {
      if (selectedScenario?.type !== "bugfix") return

      if (field === "hypothesis" && bugfixHypothesis.trim()) {
        recordBugfixEvidence({
          type: "hypothesis_created",
          text: bugfixHypothesis.trim(),
        })
      }

      if (field === "rootCause" && bugfixRootCause.trim()) {
        recordBugfixEvidence({
          type: "submission_created",
          text: bugfixRootCause.trim(),
        })
      }

      if (field === "prevention" && bugfixPrevention.trim()) {
        recordBugfixEvidence({
          type: "prevention_explained",
          text: bugfixPrevention.trim(),
        })
      }
    },
    [
      bugfixHypothesis,
      bugfixPrevention,
      bugfixRootCause,
      recordBugfixEvidence,
      selectedScenario?.type,
    ]
  )

  const resetActiveWorkspaceFile = useCallback(() => {
    if (!activeWorkspacePath || !isWorkspaceScenario(selectedScenario)) return

    const file = workspaceContext.find((candidate) => candidate.path === activeWorkspacePath)
    if (!file || file.role !== "editable" || file.originalContent === undefined) return

    setWorkspaceContext((files) =>
      files.map((candidate) =>
        candidate.path === activeWorkspacePath
          ? { ...candidate, content: candidate.originalContent || "" }
          : candidate
      )
    )
    setCode(file.originalContent)
  }, [activeWorkspacePath, selectedScenario, workspaceContext])

  const resetEditableWorkspaceFiles = useCallback(() => {
    if (!isWorkspaceScenario(selectedScenario)) return

    setWorkspaceContext((files) =>
      files.map((file) =>
        file.role === "editable" && file.originalContent !== undefined
          ? { ...file, content: file.originalContent }
          : file
      )
    )

    const activeFile = workspaceContext.find((file) => file.path === activeWorkspacePath)
    if (activeFile?.role === "editable" && activeFile.originalContent !== undefined) {
      setCode(activeFile.originalContent)
    }
  }, [activeWorkspacePath, selectedScenario, workspaceContext])

  const handleEditorChange = useCallback(
    (newCode: string) => {
      // Enforce code protection if enabled
      if (protectedElements && starterCode && isInterviewStarted && !showFeedback) {
        const validation = validateCodeProtection(newCode, protectedElements, selectedLanguage)
        if (!validation.valid) {
          toast.error(`Cannot remove required code: ${validation.errors[0]}`)
          return
        }
      }
      updateTrackerOnCodeChange(newCode)
      if (selectedScenario?.type === "bugfix") {
        const filePath = activeWorkspacePath || "solution"
        const activeRole = activeWorkspaceFile?.role || "editable"
        if (!recordedBugfixEditPathsRef.current.has(filePath)) {
          recordedBugfixEditPathsRef.current.add(filePath)
          recordBugfixEvidence({
            type: "file_edited",
            filePath,
            fileRole: activeRole,
          })
        }
      }
      setCode(newCode)
      if (activeWorkspacePath && isWorkspaceScenario(selectedScenario)) {
        setWorkspaceContext((files) =>
          files.map((file) =>
            file.path === activeWorkspacePath ? { ...file, content: newCode } : file
          )
        )
      }
    },
    [
      activeWorkspacePath,
      activeWorkspaceFile?.role,
      isInterviewStarted,
      protectedElements,
      recordBugfixEvidence,
      selectedLanguage,
      selectedScenario,
      showFeedback,
      starterCode,
      updateTrackerOnCodeChange,
    ]
  )

  if (isLoading) {
    return (
      <main className="bg-background flex min-h-screen items-center justify-center">
        <div className="text-foreground text-xl">Loading...</div>
      </main>
    )
  }

  // Allow both authenticated users and guest mode
  if (!user && !isGuestMode) {
    return null
  }

  // Determine if we should hide the header (during interview mode)
  const isInterviewMode = !showScenarioBrowser && (isInterviewStarted || selectedScenario !== null)
  const isResultView = showFeedback || showPostInterviewDiscussion

  return (
    <main className="bg-background min-h-screen">
      <h1 className="sr-only">Mock Interview Environment</h1>
      {!isInterviewMode && <Header />}

      {/* Guest Mode Banner - Sticky below header */}
      {isGuestMode && !showFeedback && (
        <div className="from-accent/20 border-accent/30 to-accent/5 fixed top-[64px] right-0 left-0 z-40 border-b bg-gradient-to-r backdrop-blur-sm">
          <div className="container mx-auto flex items-center justify-between px-4 py-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-accent font-medium">Free Trial</span>
              <span className="text-muted-foreground hidden sm:inline">
                Complete this interview to see your AI-powered feedback
              </span>
            </div>
            <button
              onClick={() => router.push("/login?redirect=interview")}
              className="text-accent hover:text-accent/80 font-medium transition-colors"
            >
              Sign up for unlimited access
            </button>
          </div>
        </div>
      )}

      {/* Scenario Browser (Pattern / basket style) */}
      {showScenarioBrowser && (
        <ScenarioBrowser
          onStartInterview={async (scenario) => {
            // Pass scenario directly to avoid race condition with state update
            await startInterview(scenario)
          }}
          usageLimit={usageLimit}
          completedProblems={completedProblems}
          hasGuestBanner={isGuestMode && !showFeedback}
        />
      )}

      {/* Interview Interface */}
      {!showScenarioBrowser && (
        <section
          className={`from-card to-background flex flex-col bg-gradient-to-b pt-1.5 pb-1.5 ${
            isResultView
              ? "min-h-screen overflow-x-hidden overflow-y-auto"
              : "h-screen overflow-hidden"
          }`}
        >
          <div
            className={`flex w-full flex-1 flex-col px-2 lg:px-3 ${isResultView ? "overflow-visible" : "overflow-hidden"}`}
          >
            <div
              className={`flex w-full flex-1 flex-col gap-1 ${isResultView ? "overflow-visible" : "overflow-hidden"}`}
            >
              <InterviewTopBar
                selectedScenario={selectedScenario}
                selectedLanguage={selectedLanguage}
                onLanguageChange={setSelectedLanguage}
                activePanel={activePanel}
                onActivePanelChange={setActivePanel}
                focusMode={focusMode}
                onFocusModeChange={setFocusMode}
                calmMode={calmMode}
                onCalmModeChange={setCalmMode}
                isInterviewStarted={isInterviewStarted}
                hideTimer={hideTimer}
                onHideTimerChange={setHideTimer}
                elapsedTime={elapsedTime}
                strictTimeLimit={strictTimeLimit}
                onReplayBugfixTour={
                  selectedScenario?.type === "bugfix" &&
                  isInterviewStarted &&
                  workspaceContext.length > 0
                    ? () => {
                        if (typeof window !== "undefined") {
                          window.dispatchEvent(new Event("codesparring:bugfix-tour-replay"))
                        }
                      }
                    : undefined
                }
                onCloseClick={() => setShowCloseDialog(true)}
              />

              {/* ═══════════════════════════════════════════════════════════════
                  MAIN INTERFACE - Cognitive Load Optimized

                  Desktop (lg+):
                  - Default: 3 columns (Problem | Editor | Chat)
                  - Focus Mode: Editor only, with floating mini-buttons

                  Mobile/Tablet (<lg):
                  - Tab-based: One panel at a time (Miller's Law)
                  - Reduces simultaneous information processing
              ═══════════════════════════════════════════════════════════════ */}
              {!showFeedback && !showPostInterviewDiscussion ? (
                <div
                  className={`relative grid min-h-0 flex-1 gap-1.5 overflow-hidden transition-all duration-300 sm:gap-2 ${
                    focusMode
                      ? "grid-cols-1" // Focus mode: editor only
                      : "grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)_240px] xl:grid-cols-[360px_minmax(0,1fr)_260px] 2xl:grid-cols-[400px_minmax(0,1fr)_280px]"
                  }`}
                >
                  {focusMode && (
                    <FocusProblemPeek
                      scenario={selectedScenario}
                      realInterviewMode={realInterviewMode}
                      showProblemPeek={showProblemPeek}
                      onShowProblemPeekChange={setShowProblemPeek}
                    />
                  )}
                  <ProblemColumn
                    ctx={{
                      activePanel,
                      bugfixReflection: {
                        hypothesis: bugfixHypothesis,
                        rootCause: bugfixRootCause,
                        prevention: bugfixPrevention,
                      },
                      elapsedTime,
                      fetchRAGHints,
                      fileInputRef,
                      focusMode,
                      handleFileUpload,
                      hintAgent,
                      hintFeedback,
                      hintFetchStatus,
                      isInterviewStarted,
                      ragHints,
                      realInterviewMode,
                      revealedAIHintIndices,
                      revealedHintIndices,
                      revealedHints,
                      selectedScenario,
                      setIsCodeViewerOpen,
                      onBugfixReflectionChange: handleBugfixReflectionChange,
                      onBugfixReflectionCommit: handleBugfixReflectionCommit,
                      setRevealedAIHintIndices,
                      setRevealedHintIndices,
                      setSelectedFile,
                      setShowOptimalApproach,
                      showOptimalApproach,
                      submitHintFeedback,
                      workspaceContext,
                    }}
                  />

                  <EditorColumn
                    activePanel={activePanel}
                    selectedScenario={selectedScenario}
                    activeWorkspaceFile={activeWorkspaceFile}
                    selectedLanguage={selectedLanguage}
                    editorLanguage={editorLanguage}
                    code={code}
                    onCodeChange={handleEditorChange}
                    isInterviewStarted={isInterviewStarted}
                    showScenarioBrowser={showScenarioBrowser}
                    showFeedback={showFeedback}
                    showPostInterviewDiscussion={showPostInterviewDiscussion}
                    isActiveWorkspaceFileEditable={isActiveWorkspaceFileEditable}
                    onStartInterview={() => startInterview()}
                    editorConsoleOutputs={editorConsoleOutputs}
                    testResults={testResults}
                    testSummary={testSummary}
                    isRunningTests={isRunningTests}
                    onClearConsole={handleClearConsole}
                    onSubmitSystemDesign={submitSystemDesign}
                    onRunCode={runCode}
                    onSubmitCode={submitCode}
                    onSelectedLanguageChange={setSelectedLanguage}
                    onResetActiveFile={resetActiveWorkspaceFile}
                    onResetWorkspace={resetEditableWorkspaceFiles}
                    isAIPartnerExpanded={isAIPartnerExpanded}
                    onAIPartnerExpandedChange={setIsAIPartnerExpanded}
                    chatMessages={chatMessages}
                    chatEndRef={chatEndRef}
                    chatInput={chatInput}
                    onChatInputChange={setChatInput}
                    isLoadingChat={isLoadingChat}
                    onSendPartnerMessage={() => handleSendMessage(false)}
                    workspaceContext={workspaceContext}
                    onFileSelect={(file) => {
                      if (file.path !== activeWorkspacePath) {
                        setActiveWorkspacePath(file.path)
                        setCode(file.content || "")
                      }
                      if (selectedScenario?.type === "bugfix") {
                        recordBugfixEvidence({
                          type:
                            file.role === "test" || file.role === "docs"
                              ? "test_or_doc_opened"
                              : "file_opened",
                          filePath: file.path,
                          fileRole: file.role,
                        })
                      }
                    }}
                  />

                  <ChatColumn
                    focusMode={focusMode}
                    activePanel={activePanel}
                    interviewerMessages={interviewerMessages}
                    isLoadingInterviewer={isLoadingInterviewer}
                    isGeneratingDiscussion={isGeneratingDiscussion}
                    interviewerEndRef={interviewerEndRef}
                    isInterviewStarted={isInterviewStarted}
                    showPostInterviewDiscussion={showPostInterviewDiscussion}
                    isRecordingInterviewer={isRecordingInterviewer}
                    onToggleRecording={() => toggleVoiceRecording(true)}
                    onCancelRecording={() => {
                      interviewerVoice.cancelCountdown()
                      interviewerVoice.stopRecording()
                      interviewerVoice.resetTranscript()
                      setInterviewerInput("")
                    }}
                    onCancelCountdown={() => interviewerVoice.cancelCountdown()}
                    onSendMessage={() => handleSendMessage(true)}
                    countdownActive={interviewerVoice.countdownActive}
                    interviewerInput={interviewerInput}
                    onInterviewerInputChange={setInterviewerInput}
                  />
                  <BugfixOnboardingTour
                    activePanel={activePanel}
                    enabled={
                      selectedScenario?.type === "bugfix" &&
                      isInterviewStarted &&
                      workspaceContext.length > 0 &&
                      !showFeedback &&
                      !showPostInterviewDiscussion
                    }
                    hypothesis={bugfixHypothesis}
                    isAIPartnerExpanded={isAIPartnerExpanded}
                    onAIPartnerExpandedChange={setIsAIPartnerExpanded}
                    onActivePanelChange={setActivePanel}
                    scenarioId={selectedScenario?.id}
                    testResultsCount={testResults.length}
                    userId={user?.id}
                    userProfile={cachedUserProfile}
                  />
                </div>
              ) : showPostInterviewDiscussion ? (
                <PostInterviewView
                  testSummary={testSummary}
                  efficiencyMetrics={efficiencyMetrics}
                  code={code}
                  selectedLanguage={selectedLanguage}
                  testResults={testResults}
                  interviewerMessages={interviewerMessages}
                  isLoadingInterviewer={isLoadingInterviewer}
                  isGeneratingDiscussion={isGeneratingDiscussion}
                  interviewerInput={interviewerInput}
                  setInterviewerInput={setInterviewerInput}
                  handleSendMessage={handleSendMessage}
                  isRecordingInterviewer={isRecordingInterviewer}
                  toggleVoiceRecording={toggleVoiceRecording}
                  interviewerEndRef={interviewerEndRef}
                  showCodeInDiscussion={showCodeInDiscussion}
                  setShowCodeInDiscussion={setShowCodeInDiscussion}
                  setShowPostInterviewDiscussion={setShowPostInterviewDiscussion}
                  proceedToFinalFeedback={proceedToFinalFeedback}
                  onClose={() => router.push("/dashboard")}
                />
              ) : isGeneratingFeedback ||
                (streamingFeedback.state.isConnected && !streamingFeedback.state.isPersisted) ||
                (streamingFeedback.state.phase !== "idle" &&
                  streamingFeedback.state.phase !== "complete" &&
                  streamingFeedback.state.phase !== "error") ? (
                <FeedbackLoadingState
                  onGoToDashboard={() => router.push("/dashboard")}
                  interviewStats={{
                    testsPassed: testSummary.passed,
                    totalTests: testSummary.total,
                    timeSpentMinutes: Math.round(elapsedTime / 60),
                    messagesExchanged: interviewerMessages.length,
                    codeLines: code.split("\n").filter((line) => line.trim()).length,
                  }}
                  // Pass streaming phase for better UX messaging
                  streamingPhase={streamingFeedback.state.phase}
                  phaseMessage={streamingFeedback.state.phaseMessage}
                />
              ) : (
                <>
                  <ErrorBoundary>
                    <PracticeFeedback
                      feedback={comprehensiveFeedback || ""}
                      performanceScore={performanceScore ?? 0}
                      technicalScore={technicalScore ?? undefined}
                      scoreBreakdown={scoreBreakdown || undefined}
                      constitutionalAICritique={constitutionalAICritique}
                      structuredFeedback={structuredFeedback || undefined}
                      testsPassed={testSummary.passed}
                      testsTotal={testSummary.total}
                      timeComplexity={efficiencyMetrics?.estimatedTimeComplexity}
                      spaceComplexity={efficiencyMetrics?.estimatedSpaceComplexity}
                      efficiencyScore={efficiencyMetrics?.efficiencyScore}
                      elapsedTime={elapsedTime}
                      userId={user?.id}
                      problemType={selectedScenario?.type}
                      difficulty={selectedScenario?.difficulty}
                      problemTitle={selectedScenario?.title}
                      code={code}
                      language={selectedLanguage}
                      onNewProblem={resetInterview}
                      onClose={() => router.push("/dashboard")}
                      clarifyingQuestionsAssessment={clarifyingQuestionsAssessment}
                    />
                  </ErrorBoundary>
                  {isFromRoadmap && activeRoadmap && (
                    <div className="mt-6 flex justify-center">
                      <Button
                        onClick={() => router.push("/roadmap")}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Roadmap
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Guest User Signup Prompt - shown after feedback */}
      {isGuestMode && showFeedback && performanceScore !== null && showSignupPrompt && (
        <SignupPrompt
          score={performanceScore}
          sessionId={currentSessionId || ""}
          scenarioTitle={selectedScenario?.title || ""}
          feedbackSummary={comprehensiveFeedback}
          onDismiss={() => {
            setShowSignupPrompt(false)
            // Note: markFreeTrialUsed() is already called in SignupPrompt component
          }}
        />
      )}

      <InterviewDialogs
        selectedFile={selectedFile}
        isCodeViewerOpen={isCodeViewerOpen}
        onCodeViewerOpenChange={setIsCodeViewerOpen}
        onSelectedFileChange={setSelectedFile}
        selectedScenario={selectedScenario}
        showCompanyPicker={showCompanyPicker}
        onCompanyPickerOpenChange={setShowCompanyPicker}
        lockedCompanyForPicker={lockedCompanyForPicker}
        onLockedCompanyChange={setLockedCompanyForPicker}
        onCompanySelected={(company, realInterviewMode, strictTimeLimit) => {
          useInterviewStore.getState().setRealInterviewMode(realInterviewMode)
          useInterviewStore.getState().setStrictTimeLimit(strictTimeLimit)
          if (selectedScenario) {
            startInterview(selectedScenario, company)
          }
        }}
        showCloseDialog={showCloseDialog}
        onShowCloseDialogChange={setShowCloseDialog}
        onCloseInterview={resetInterview}
      />

      {!isInterviewMode && <Footer />}
    </main>
  )
}

// Loading fallback for Suspense boundary
function InterviewPageLoading() {
  return (
    <main className="from-card via-background to-card flex min-h-screen flex-1 items-center justify-center bg-gradient-to-b">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-[#c4703f]"></div>
        <p className="text-muted-foreground">Loading interview...</p>
      </div>
    </main>
  )
}

// Wrapper component with Suspense boundary for useSearchParams
export default function InterviewPage() {
  return (
    <Suspense fallback={<InterviewPageLoading />}>
      <InterviewPageContent />
    </Suspense>
  )
}
