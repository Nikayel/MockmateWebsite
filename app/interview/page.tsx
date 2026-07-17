"use client"

import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import nextDynamic from "next/dynamic"
import { useShallow } from "zustand/react/shallow"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useVoiceInput } from "@/lib/voice"
import { getDbLazy } from "@/lib/firebase-lazy"
import { collection, getDocs, query, where } from "firebase/firestore"
import { useAuth } from "@/lib/auth-context"
import type { Profile } from "@/lib/types"
import { getUserProfile } from "@/lib/firestore-helpers"
import { SignupPrompt } from "@/components/SignupPrompt"
import { useRoadmapStore } from "@/lib/stores/roadmap-store"
import { useInterviewStore, type InterviewTargetCompany } from "@/lib/stores"
import type { CompanyId } from "@/lib/data/company-questions/types"
import { type Scenario } from "@/lib/scenarios"
import type { PackRunView } from "@/lib/workspace-execution"
import { extractProtectedElements, validateCodeProtection } from "@/lib/code-protection"
import { toast } from "sonner"
// Interview phase tracking
import {
  type InterviewPhase,
  type ConversationTracker,
  createEmptyTracker,
} from "@/lib/interview/interview-phases"
// Extracted utilities
import { extractTopicsFromMessage } from "@/lib/interview"
// Local page components
import { GuestModeBanner, InterviewLayoutGrid, InterviewFeedbackView } from "./_components"
import { InterviewDialogs } from "./_components/InterviewDialogs"
import { InterviewTopBar } from "./_components/InterviewTopBar"
import type { ProblemColumnCtx } from "./_components/ProblemColumn"
// Streaming feedback - Edge function with no timeout
import { useStreamingFeedback } from "@/lib/hooks/use-streaming-feedback"
import { useHintAgent } from "@/lib/hooks/useHintAgent"
import { getInitialPartnerMessage, getProblemTypeLabel } from "./_utils/interview-messages"
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
import { useInterviewTimer } from "./_hooks/useInterviewTimer"
import { useInterviewModes } from "./_hooks/useInterviewModes"
import { useGuestQuota, isUsageBlocked } from "./_hooks/useGuestQuota"
import { useCodeExecution } from "./_hooks/useCodeExecution"
import { useInterviewPhaseTracking } from "./_hooks/useInterviewPhaseTracking"
import { useInterviewChat } from "./_hooks/useInterviewChat"
import { useInterviewProactiveAI } from "./_hooks/useInterviewProactiveAI"
import { useInterviewMetrics } from "./_hooks/useInterviewMetrics"
import { useInterviewSessionStart } from "./_hooks/useInterviewSessionStart"
import { useInterviewSessionReset } from "./_hooks/useInterviewSessionReset"
import { useSessionReopen } from "./_hooks/useSessionReopen"
import { useInterviewAutosave } from "./_hooks/useInterviewAutosave"
import { useSessionRestore } from "./_hooks/useSessionRestore"
import { usePostInterviewDiscussion } from "./_hooks/usePostInterviewDiscussion"
import { useFeedbackStreaming } from "./_hooks/useFeedbackStreaming"
import { useInterviewFeedback } from "./_hooks/useInterviewFeedback"
import { useSystemDesignFeedback } from "./_hooks/useSystemDesignFeedback"
import { useSystemDesignSubmit } from "./_hooks/useSystemDesignSubmit"

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
  // Memoized so the 1s interview clock re-render does not hand a fresh array to
  // useInterviewMetrics / the ProblemColumn ctx every tick. hintAgent.hints is
  // useState-backed and only changes when hints are (re)generated.
  const ragHints = useMemo(
    () => hintAgent.hints.map((h) => ({ level: h.level, hint: h.content, id: h.id })),
    [hintAgent.hints]
  )
  const isLoadingHints = hintAgent.isLoading
  const hintFetchStatus: "idle" | "loading" | "success" | "error" = isLoadingHints
    ? "loading"
    : hintAgent.error
      ? "error"
      : ragHints.length > 0
        ? "success"
        : "idle"
  const [revealedAIHintIndices, setRevealedAIHintIndices] = useState<Set<number>>(new Set())

  // Voice mode - always auto-send on pause (research-backed simplification)
  const voiceAutoSend = true // Always enabled now
  const voiceModeLiveRef = useRef(true) // Keep ref for callbacks
  const [revealedHintIndices, setRevealedHintIndices] = useState<Set<number>>(new Set()) // Track which hints are revealed

  // Test states
  const [testResults, setTestResults] = useState<TestResult[]>([])
  // Set only by stdout-oracle pack runs; drives the terminal console surface.
  const [packRun, setPackRun] = useState<PackRunView | null>(null)
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

  /**
   * Open a workspace file in the editor from the problem column's file tree.
   *
   * Memoized deliberately: it is a `problemCtx` dependency, and a fresh identity
   * each render would rebuild the ctx every render and defeat ProblemColumn's memo.
   * Opening a file is also how bugfix inspection evidence is recorded, which feeds
   * the codebaseNavigation and evidenceGathering scores.
   */
  const handleEditorFileSelect = useCallback(
    (file: WorkspaceContextFile) => {
      if (file.path !== activeWorkspacePath) {
        setActiveWorkspacePath(file.path)
        setCode(file.content || "")
      }
      if (selectedScenario?.type === "bugfix") {
        recordBugfixEvidence({
          type: file.role === "test" || file.role === "docs" ? "test_or_doc_opened" : "file_opened",
          filePath: file.path,
          fileRole: file.role,
        })
      }
    },
    [activeWorkspacePath, recordBugfixEvidence, selectedScenario?.type]
  )

  const buildBugfixEvidencePayload = useCallback((): BugfixEvidenceEvent[] => {
    if (selectedScenario?.type !== "bugfix") return []
    return bugfixEvidenceEvents
  }, [bugfixEvidenceEvents, selectedScenario])

  const resetBugfixSessionState = useCallback(() => {
    setBugfixEvidenceEvents([])
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

  // The streaming-feedback → page-state mapping effect lives in useInterviewFeedback.

  // Code protection state
  const [protectedElements, setProtectedElements] = useState<ReturnType<
    typeof extractProtectedElements
  > | null>(null)
  const [starterCode, setStarterCode] = useState("")

  // The last-feedback-request ref + applyFallbackFeedback live in useInterviewFeedback.

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
        if (
          selectedScenario.workspace.language !== "sql" &&
          selectedScenario.workspace.language !== selectedLanguage
        ) {
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
        if (
          selectedScenario.workspace.language !== "sql" &&
          selectedLanguage !== selectedScenario.workspace.language
        ) {
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
    // Depend on the specific stable hintAgent methods (both are useCallback([])
    // inside useHintAgent) rather than the whole hintAgent object, which
    // useHintAgent returns fresh every render and would make fetchRAGHints, and
    // anything memoized on it, churn on every 1s clock tick. exhaustive-deps only
    // recognizes the whole-object form, so its warning is suppressed here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedScenario,
    user?.id,
    firebaseUser,
    hintAgent.updateCode,
    hintAgent.regenerateHints,
    code,
  ])

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

  // Track when code value changes
  useEffect(() => {
    if (previousCodeRef.current !== code) {
      previousCodeRef.current = code
    }
  }, [code])

  const {
    trackSessionCompletion,
    updateSpacedRepetition,
    submitHintFeedback,
    hintFeedback,
    setHintFeedback,
  } = useInterviewMetrics({
    firebaseUser,
    selectedScenarioId: selectedScenario?.id,
    userId: user?.id,
    guestId,
    currentSessionId,
    ragHints,
  })

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

  const { startInterview, isStarting } = useInterviewSessionStart({
    router,
    user,
    firebaseUser,
    isGuestMode,
    guestId,
    usageLimit,
    refreshUsageLimit,
    selectedScenario,
    targetCompany,
    activeRoadmap,
    selectedLanguage,
    setSelectedScenario,
    setShowOptimalApproach,
    setTargetCompany,
    setLockedCompanyForPicker,
    setShowCompanyPicker,
    setCurrentSessionId,
    setIsInterviewStarted,
    setShowScenarioBrowser,
    setStartTime,
    setTestResults,
    setTestSummary,
    setEfficiencyMetrics,
    setElapsedTime,
    setRevealedHints,
    setRevealedHintIndices,
    setRevealedAIHintIndices,
    setHintFeedback,
    setWorkspaceContext,
    setActiveWorkspacePath,
    setComprehensiveFeedback,
    setPerformanceScore,
    setTechnicalScore,
    setScoreBreakdown,
    setSelectedLanguage,
    setCode,
    setStarterCode,
    setBugfixEvidenceEvents,
    setProtectedElements,
    setInterviewerMessages,
    setRecentNudgeTopics,
    setChatMessages,
    hintAgent,
    resetBugfixSessionState,
  })

  const { resetInterview } = useInterviewSessionReset({
    user,
    firebaseUser,
    selectedScenario,
    selectedLanguage,
    currentSessionId,
    showFeedback,
    showPostInterviewDiscussion,
    testSummary,
    performanceScore,
    comprehensiveFeedback,
    code,
    testResults,
    efficiencyMetrics,
    technicalScore,
    scoreBreakdown,
    structuredFeedback,
    clarifyingQuestionsAssessment,
    streamingFeedback,
    setCurrentSessionId,
    setIsInterviewStarted,
    setShowScenarioBrowser,
    setStartTime,
    setTestResults,
    setTestSummary,
    setEfficiencyMetrics,
    setElapsedTime,
    setRevealedHints,
    setRevealedHintIndices,
    setRevealedAIHintIndices,
    setHintFeedback,
    setWorkspaceContext,
    setActiveWorkspacePath,
    setComprehensiveFeedback,
    setPerformanceScore,
    setTechnicalScore,
    setScoreBreakdown,
    setCode,
    setStarterCode,
    setProtectedElements,
    setInterviewerMessages,
    setRecentNudgeTopics,
    setChatMessages,
    setShowFeedback,
    setShowPostInterviewDiscussion,
    setIsGeneratingDiscussion,
    hintAgent,
    resetBugfixSessionState,
    interviewerVoice,
    partnerVoice,
    proactiveTimer,
    setProactiveTimer,
    inactivityTimerRef,
    hasTriggeredInactivityRef,
    hasFetchedHintsRef,
    lastCodeChangeRef,
    lastCodeHashRef,
    resetProactiveState,
  })

  useSessionReopen({
    router,
    searchParams,
    firebaseUser,
    authLoading,
    initialized,
    authCheckComplete,
    user,
    selectedLanguage,
    consoleLogs,
    canStartGuestTrial,
    enterGuestMode,
    exitGuestMode,
    refreshUsageLimit,
    startInterview,
    resetBugfixSessionState,
    setIsLoading,
    setSelectedScenario,
    setShowOptimalApproach,
    setCurrentSessionId,
    setShowScenarioBrowser,
    setIsInterviewStarted,
    setStartTime,
    setSelectedLanguage,
    setWorkspaceContext,
    setActiveWorkspacePath,
    setCode,
    setInterviewerMessages,
    setChatMessages,
    setElapsedTime,
    setTestResults,
    setTestSummary,
    setConsoleLogs,
    setBugfixEvidenceEvents,
    setShowPostInterviewDiscussion,
    recordedBugfixEditPathsRef,
  })

  useInterviewAutosave({
    isInterviewStarted,
    selectedScenario,
    firebaseUser,
    isGuestMode,
    guestId,
    currentSessionId,
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
    showPostInterviewDiscussion,
    realInterviewMode,
    strictTimeLimit,
  })

  useSessionRestore({
    firebaseUser,
    isGuestMode,
    guestId,
    selectedScenario,
    searchParams,
    isInterviewStarted,
    router,
    selectedLanguage,
    setCurrentSessionId,
    setCode,
    setChatMessages,
    setInterviewerMessages,
    setSelectedLanguage,
    setTestResults,
    setWorkspaceContext,
    setActiveWorkspacePath,
    setConsoleLogs,
    setBugfixEvidenceEvents,
    setElapsedTime,
    setTestSummary,
    setShowPostInterviewDiscussion,
    setIsInterviewStarted,
    setShowScenarioBrowser,
    recordedBugfixEditPathsRef,
  })

  const { triggerPostInterviewDiscussion } = usePostInterviewDiscussion({
    user,
    usageLimit,
    experienceLevel,
    selectedScenario,
    code,
    selectedLanguage,
    elapsedTime,
    interviewerMessages,
    consoleLogs,
    conversationTracker,
    recentNudgeTopics,
    targetCompany,
    chatWorkspaceContext,
    setIsGeneratingDiscussion,
    setEfficiencyMetrics,
    setInterviewerMessages,
    getCachedUserProfile,
    getEdgeCasesForInterviewer,
    updateTrackerOnMessage,
  })

  const { applyFallbackFeedback, lastFeedbackRequestRef } = useFeedbackStreaming({
    currentSessionId,
    streamingFeedback,
    setScoreBreakdown,
    setPerformanceScore,
    setTechnicalScore,
    setComprehensiveFeedback,
    setStructuredFeedback,
    setIsGeneratingFeedback,
  })

  const { proceedToFinalFeedback } = useInterviewFeedback({
    user,
    isGuestMode,
    guestId,
    selectedScenario,
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
    conversationTracker,
    revealedHints,
    revealedHintIndices,
    revealedAIHintIndices,
    isFromRoadmap,
    activeRoadmap,
    currentSessionId,
    streamingFeedback,
    setScoreBreakdown,
    setPerformanceScore,
    setTechnicalScore,
    setComprehensiveFeedback,
    setStructuredFeedback,
    setIsGeneratingFeedback,
    setShowFeedback,
    setShowPostInterviewDiscussion,
    setShowSignupPrompt,
    buildBugfixEvidencePayload,
    getBugfixExpectedTouchedFiles,
    getCurrentInterviewPhase,
    trackSessionCompletion,
    markQuestionCompleted,
    addActualTime,
    applyFallbackFeedback,
    lastFeedbackRequestRef,
  })

  const { triggerSystemDesignFeedback } = useSystemDesignFeedback({
    user,
    isGuestMode,
    guestId,
    experienceLevel,
    searchParams,
    activeRoadmap,
    selectedScenario,
    code,
    elapsedTime,
    chatMessages,
    interviewerMessages,
    testResults,
    consoleLogs,
    conversationTracker,
    recentNudgeTopics,
    revealedHints,
    revealedHintIndices,
    revealedAIHintIndices,
    targetCompany,
    realInterviewMode,
    currentSessionId,
    setIsGeneratingDiscussion,
    setStructuredFeedback,
    setTechnicalScore,
    setScoreBreakdown,
    setComprehensiveFeedback,
    setPerformanceScore,
    setShowPostInterviewDiscussion,
    setInterviewerMessages,
    markQuestionCompleted,
    addActualTime,
    trackSessionCompletion,
    updateSpacedRepetition,
    getEdgeCasesForInterviewer,
    updateTrackerOnMessage,
  })

  const { submitSystemDesign } = useSystemDesignSubmit({
    firebaseUser,
    isGuestMode,
    isFromRoadmap,
    activeRoadmap,
    selectedScenario,
    setIsRunningTests,
    playSound,
    markQuestionEvaluating,
    triggerSystemDesignFeedback,
  })

  // useCallback so this stays referentially stable across the 1s clock re-render
  // (it feeds the memoized ProblemColumn ctx). Only touches the stable
  // setWorkspaceContext setter and the module-level toast helper.
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
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
  }, [])

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
    realInterviewMode,
    strictTimeLimit,
    currentSessionId,
    user,
    firebaseUser,
    isGuestMode,
    isFromRoadmap,
    activeRoadmap,
    setTestResults,
    setPackRun,
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
    setPackRun(null)
    setTestSummary({ total: 0, passed: 0, failed: 0, passRate: 0 })
  }, [])

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

  // ProblemColumn context (memoized). The interview clock re-renders this page
  // every second; without memoization this object was recreated each tick, which
  // busted ProblemColumn's React.memo and forced MarkdownRenderer to re-parse the
  // problem markdown every second (PERF-C6). elapsedTime is deliberately excluded
  // from the deps: it is only read by the pre-interview "Next hint in Xm" label
  // (rendered when !isInterviewStarted, where the timer is not running), so a
  // stale value has no visible effect, and including it would defeat the memo on
  // every tick. Only hintAgent.revealHint is passed (the sole method ProblemColumn
  // uses) because useHintAgent returns a fresh object each render.
  // Declared before the early returns below so the hook runs unconditionally.
  const problemCtx = useMemo<ProblemColumnCtx>(() => {
    return {
      activePanel,
      activeWorkspacePath,
      onWorkspaceFileSelect: handleEditorFileSelect,
      elapsedTime,
      fetchRAGHints,
      fileInputRef,
      focusMode,
      handleFileUpload,
      hintAgent: { revealHint: hintAgent.revealHint },
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
      setRevealedAIHintIndices,
      setRevealedHintIndices,
      setSelectedFile,
      setShowOptimalApproach,
      showOptimalApproach,
      submitHintFeedback,
      workspaceContext,
    }
    // elapsedTime is intentionally omitted (see comment above). Every other value
    // the object reads is listed so a real change re-derives the ctx.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activePanel,
    activeWorkspacePath,
    handleEditorFileSelect,
    fetchRAGHints,
    fileInputRef,
    focusMode,
    handleFileUpload,
    hintAgent.revealHint,
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
    setRevealedAIHintIndices,
    setRevealedHintIndices,
    setSelectedFile,
    setShowOptimalApproach,
    showOptimalApproach,
    submitHintFeedback,
    workspaceContext,
  ])

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

  // Guest banner visibility guard (kept in page).
  const hasGuestBanner = isGuestMode && !showFeedback

  // Feedback loading condition (kept in page so streamingFeedback need not be
  // passed into InterviewFeedbackView).
  const isFeedbackLoading =
    isGeneratingFeedback ||
    (streamingFeedback.state.isConnected && !streamingFeedback.state.isPersisted) ||
    (streamingFeedback.state.phase !== "idle" &&
      streamingFeedback.state.phase !== "complete" &&
      streamingFeedback.state.phase !== "error")

  // Bugfix onboarding tour enabled condition (kept in page).
  const bugfixTourEnabled =
    selectedScenario?.type === "bugfix" &&
    isInterviewStarted &&
    workspaceContext.length > 0 &&
    !showFeedback &&
    !showPostInterviewDiscussion

  // Inline closures pre-built in page (recreated each render today — preserved
  // verbatim; intentionally NOT wrapped in useCallback).
  const onStartInterviewClick = () => startInterview()
  const onSendPartnerMessage = () => handleSendMessage(false)
  const onToggleInterviewerRecording = () => toggleVoiceRecording(true)
  const onCancelInterviewerRecording = () => {
    interviewerVoice.cancelCountdown()
    interviewerVoice.stopRecording()
    interviewerVoice.resetTranscript()
    setInterviewerInput("")
  }
  const onCancelInterviewerCountdown = () => interviewerVoice.cancelCountdown()
  const onSendInterviewerMessage = () => handleSendMessage(true)

  return (
    <main className="bg-background min-h-screen">
      <h1 className="sr-only">Mock Interview Environment</h1>
      {!isInterviewMode && <Header />}

      {/* Guest Mode Banner - Sticky below header */}
      {hasGuestBanner && (
        <GuestModeBanner onSignUp={() => router.push("/login?redirect=interview")} />
      )}

      {/* Scenario Browser (Pattern / basket style) */}
      {showScenarioBrowser && (
        <ScenarioBrowser
          onStartInterview={async (scenario) => {
            // Pass scenario directly to avoid race condition with state update
            await startInterview(scenario)
          }}
          isStarting={isStarting}
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
                <InterviewLayoutGrid
                  focusMode={focusMode}
                  selectedScenario={selectedScenario}
                  realInterviewMode={realInterviewMode}
                  showProblemPeek={showProblemPeek}
                  onShowProblemPeekChange={setShowProblemPeek}
                  problemCtx={problemCtx}
                  activePanel={activePanel}
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
                  onStartInterview={onStartInterviewClick}
                  editorConsoleOutputs={editorConsoleOutputs}
                  testResults={testResults}
                  testSummary={testSummary}
                  packRun={packRun}
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
                  onSendPartnerMessage={onSendPartnerMessage}
                  workspaceContext={workspaceContext}
                  interviewerMessages={interviewerMessages}
                  isLoadingInterviewer={isLoadingInterviewer}
                  isGeneratingDiscussion={isGeneratingDiscussion}
                  interviewerEndRef={interviewerEndRef}
                  isRecordingInterviewer={isRecordingInterviewer}
                  onToggleInterviewerRecording={onToggleInterviewerRecording}
                  onCancelInterviewerRecording={onCancelInterviewerRecording}
                  onCancelInterviewerCountdown={onCancelInterviewerCountdown}
                  onSendInterviewerMessage={onSendInterviewerMessage}
                  countdownActive={interviewerVoice.countdownActive}
                  interviewerInput={interviewerInput}
                  onInterviewerInputChange={setInterviewerInput}
                  bugfixTourEnabled={bugfixTourEnabled}
                  bugfixScenarioId={selectedScenario?.id}
                  testResultsCount={testResults.length}
                  userId={user?.id}
                  userProfile={cachedUserProfile}
                  onActivePanelChange={setActivePanel}
                />
              ) : (
                <InterviewFeedbackView
                  showPostInterviewDiscussion={showPostInterviewDiscussion}
                  isFeedbackLoading={isFeedbackLoading}
                  isFromRoadmap={isFromRoadmap}
                  activeRoadmap={activeRoadmap}
                  onGoToDashboard={() => router.push("/dashboard")}
                  onBackToRoadmap={() => router.push("/roadmap")}
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
                  isGeneratingFeedback={isGeneratingFeedback}
                  feedbackStats={{
                    testsPassed: testSummary.passed,
                    totalTests: testSummary.total,
                    timeSpentMinutes: Math.round(elapsedTime / 60),
                    messagesExchanged: interviewerMessages.length,
                    codeLines: code.split("\n").filter((line) => line.trim()).length,
                  }}
                  streamingPhase={streamingFeedback.state.phase}
                  phaseMessage={streamingFeedback.state.phaseMessage}
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
                  language={selectedLanguage}
                  onNewProblem={resetInterview}
                  clarifyingQuestionsAssessment={clarifyingQuestionsAssessment}
                />
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
