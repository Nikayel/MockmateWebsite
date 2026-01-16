"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useRoadmapStore } from "@/lib/stores/roadmap-store"
import { useInterviewStore } from "@/lib/stores"
import { useVoiceInput } from "@/lib/voice"
import { getScenarioById, type Scenario } from "@/lib/scenarios"
import {
  type InterviewPhase,
  type ConversationTracker,
  createEmptyTracker,
  updateTrackerFromMessage,
  detectInterviewPhase,
} from "@/lib/interview/interview-phases"
import {
  extractTopicsFromMessage,
  extractUserAnsweredTopics,
  analyzeCodeEfficiency,
} from "@/lib/interview"
import { extractProtectedElements } from "@/lib/code-protection"
import {
  checkUsageLimit,
  saveSessionState,
  getSessionState,
  findLatestSubmittedSession,
} from "@/lib/firestore-helpers"
import { getOrCreateGuestId, canStartFreeTrial } from "@/lib/guest-session"
import { toast } from "sonner"
import type { ConsoleOutput } from "@/components/interview/CodeConsole"

// ============================================================================
// Types
// ============================================================================

export interface ChatMessage {
  type: "user" | "ai"
  message: string
  timestamp?: number
}

export interface TestResult {
  description: string
  passed: boolean
  input: unknown
  expected: unknown
  actual: unknown
  error: string | null
}

export interface TestSummary {
  total: number
  passed: number
  failed: number
  passRate: number
}

export interface EfficiencyMetrics {
  linesOfCode: number
  complexity: string
  estimatedTimeComplexity: string
  estimatedSpaceComplexity: string
  optimalTimeComplexity: string
  optimalSpaceComplexity: string
  efficiencyScore: number
}

export interface ScoreBreakdown {
  understandingScore?: number
  problemSolvingScore?: number
  codeQualityScore?: number
  communicationScore?: number
}

export type SupportedLanguage =
  | "javascript"
  | "typescript"
  | "python"
  | "java"
  | "cpp"
  | "csharp"
  | "go"
  | "rust"

export type PanelType = "problem" | "editor" | "chat"

// ============================================================================
// Context State Interface
// ============================================================================

export interface InterviewContextState {
  // Session
  selectedScenario: Scenario | null
  isInterviewStarted: boolean
  currentSessionId: string | null
  isFromRoadmap: boolean

  // Loading/Auth
  isLoading: boolean
  authCheckComplete: boolean
  showScenarioBrowser: boolean

  // Guest Mode
  isGuestMode: boolean
  guestId: string | null
  showSignupPrompt: boolean

  // Interviewer Chat
  interviewerMessages: ChatMessage[]
  interviewerInput: string
  isRecordingInterviewer: boolean

  // Partner Chat
  chatMessages: ChatMessage[]
  chatInput: string

  // Phase Tracking
  conversationTracker: ConversationTracker
  currentInterviewPhase: InterviewPhase
  recentNudgeTopics: string[]
  userAnsweredTopics: string[]

  // Test Results
  testResults: TestResult[]
  consoleLogs: ConsoleOutput[]
  isRunningTests: boolean
  testSummary: TestSummary
  efficiencyMetrics: EfficiencyMetrics | null

  // Feedback
  showFeedback: boolean
  showPostInterviewDiscussion: boolean
  comprehensiveFeedback: string
  performanceScore: number | null
  technicalScore: number | null
  scoreBreakdown: ScoreBreakdown | null
  constitutionalAICritique: Record<string, unknown> | null
  isGeneratingFeedback: boolean
  isGeneratingDiscussion: boolean
  showCodeInDiscussion: boolean

  // Hints
  ragHints: { level: number; hint: string; id?: string }[]
  isLoadingHints: boolean
  revealedAIHintIndices: Set<number>
  hintFeedback: Map<string, "helpful" | "unhelpful">
  revealedHintIndices: Set<number>
  revealedHints: number
  isAIPartnerExpanded: boolean

  // Editor
  code: string
  selectedLanguage: SupportedLanguage
  protectedElements: ReturnType<typeof extractProtectedElements> | null
  starterCode: string

  // UI Panels
  activePanel: PanelType
  showProblemPeek: boolean
  selectedFile: { path: string; content: string } | null
  isCodeViewerOpen: boolean

  // Focus Modes
  focusMode: boolean
  calmMode: boolean
  hideTimer: boolean

  // Timer
  startTime: number | null
  elapsedTime: number

  // Workspace
  workspaceContext: Array<{ path: string; content: string }>
  usageLimit: { used: number; limit: number; allowed: boolean } | null
  showCloseDialog: boolean
  completedProblems: string[]
}

// ============================================================================
// Context Actions Interface
// ============================================================================

export interface InterviewContextActions {
  // Session Actions
  setSelectedScenario: (scenario: Scenario | null) => void
  setIsInterviewStarted: (started: boolean) => void
  setCurrentSessionId: (sessionId: string | null) => void
  setShowScenarioBrowser: (show: boolean) => void

  // Loading/Auth Actions
  setIsLoading: (loading: boolean) => void
  setAuthCheckComplete: (complete: boolean) => void

  // Chat Actions
  setInterviewerMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  setInterviewerInput: (input: string) => void
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  setChatInput: (input: string) => void

  // Phase Actions
  setConversationTracker: React.Dispatch<React.SetStateAction<ConversationTracker>>
  setCurrentInterviewPhase: (phase: InterviewPhase) => void
  setRecentNudgeTopics: React.Dispatch<React.SetStateAction<string[]>>
  setUserAnsweredTopics: React.Dispatch<React.SetStateAction<string[]>>

  // Test Actions
  setTestResults: React.Dispatch<React.SetStateAction<TestResult[]>>
  setConsoleLogs: React.Dispatch<React.SetStateAction<ConsoleOutput[]>>
  setIsRunningTests: (running: boolean) => void
  setTestSummary: (summary: TestSummary) => void
  setEfficiencyMetrics: (metrics: EfficiencyMetrics | null) => void

  // Feedback Actions
  setShowFeedback: (show: boolean) => void
  setShowPostInterviewDiscussion: (show: boolean) => void
  setComprehensiveFeedback: (feedback: string) => void
  setPerformanceScore: (score: number | null) => void
  setTechnicalScore: (score: number | null) => void
  setScoreBreakdown: (breakdown: ScoreBreakdown | null) => void
  setConstitutionalAICritique: (critique: Record<string, unknown> | null) => void
  setIsGeneratingFeedback: (generating: boolean) => void
  setIsGeneratingDiscussion: (generating: boolean) => void
  setShowCodeInDiscussion: (show: boolean) => void

  // Hints Actions
  setRagHints: React.Dispatch<React.SetStateAction<{ level: number; hint: string; id?: string }[]>>
  setIsLoadingHints: (loading: boolean) => void
  setRevealedAIHintIndices: React.Dispatch<React.SetStateAction<Set<number>>>
  setHintFeedback: React.Dispatch<React.SetStateAction<Map<string, "helpful" | "unhelpful">>>
  setRevealedHintIndices: React.Dispatch<React.SetStateAction<Set<number>>>
  setRevealedHints: (hints: number) => void
  setIsAIPartnerExpanded: (expanded: boolean) => void

  // Editor Actions
  setCode: (code: string) => void
  setSelectedLanguage: (language: SupportedLanguage) => void
  setProtectedElements: (elements: ReturnType<typeof extractProtectedElements> | null) => void
  setStarterCode: (code: string) => void

  // UI Actions
  setActivePanel: (panel: PanelType) => void
  setShowProblemPeek: (show: boolean) => void
  setSelectedFile: (file: { path: string; content: string } | null) => void
  setIsCodeViewerOpen: (open: boolean) => void
  setFocusMode: (mode: boolean) => void
  setCalmMode: (mode: boolean) => void
  setHideTimer: (hide: boolean) => void
  setShowCloseDialog: (show: boolean) => void

  // Timer Actions
  setStartTime: (time: number | null) => void
  setElapsedTime: (time: number) => void

  // Workspace Actions
  setWorkspaceContext: React.Dispatch<
    React.SetStateAction<Array<{ path: string; content: string }>>
  >
  setUsageLimit: (limit: { used: number; limit: number; allowed: boolean } | null) => void
  setCompletedProblems: React.Dispatch<React.SetStateAction<string[]>>

  // Guest Mode Actions
  setIsGuestMode: (mode: boolean) => void
  setGuestId: (id: string | null) => void
  setShowSignupPrompt: (show: boolean) => void

  // Voice Actions
  toggleVoiceRecording: (isInterviewer: boolean) => Promise<void>

  // Refs
  interviewerEndRef: React.RefObject<HTMLDivElement | null>
  chatEndRef: React.RefObject<HTMLDivElement | null>
  editorContainerRef: React.RefObject<HTMLDivElement | null>
}

// Combined type for context value
export type InterviewContextValue = InterviewContextState & InterviewContextActions

// ============================================================================
// Context Creation
// ============================================================================

const InterviewContext = createContext<InterviewContextValue | null>(null)

// ============================================================================
// Provider Component
// ============================================================================

interface InterviewProviderProps {
  children: ReactNode
}

export function InterviewProvider({ children }: InterviewProviderProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, firebaseUser, loading: authLoading, initialized } = useAuth()
  const { activeRoadmap, setActiveRoadmap } = useRoadmapStore()
  const {
    isLoadingChat,
    isLoadingInterviewer,
    setIsLoadingChat,
    setIsLoadingInterviewer,
    targetCompany,
    setTargetCompany,
    showCompanyPicker,
    setShowCompanyPicker,
  } = useInterviewStore()

  // ============================================================================
  // State Declarations (organized by category)
  // ============================================================================

  // Session
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null)
  const [isInterviewStarted, setIsInterviewStarted] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const isFromRoadmap = searchParams?.get("roadmap") === "true"

  // Loading/Auth
  const [isLoading, setIsLoading] = useState(true)
  const [authCheckComplete, setAuthCheckComplete] = useState(false)
  const [showScenarioBrowser, setShowScenarioBrowser] = useState(true)

  // Guest Mode
  const [isGuestMode, setIsGuestMode] = useState(false)
  const [guestId, setGuestId] = useState<string | null>(null)
  const [showSignupPrompt, setShowSignupPrompt] = useState(false)

  // Interviewer Chat
  const [interviewerMessages, setInterviewerMessages] = useState<ChatMessage[]>([])
  const [interviewerInput, setInterviewerInput] = useState("")

  // Partner Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")

  // Phase Tracking
  const [conversationTracker, setConversationTracker] =
    useState<ConversationTracker>(createEmptyTracker())
  const [currentInterviewPhase, setCurrentInterviewPhase] = useState<InterviewPhase>("intro")
  const [recentNudgeTopics, setRecentNudgeTopics] = useState<string[]>([])
  const [userAnsweredTopics, setUserAnsweredTopics] = useState<string[]>([])

  // Test Results
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [consoleLogs, setConsoleLogs] = useState<ConsoleOutput[]>([])
  const [isRunningTests, setIsRunningTests] = useState(false)
  const [testSummary, setTestSummary] = useState<TestSummary>({
    total: 0,
    passed: 0,
    failed: 0,
    passRate: 0,
  })
  const [efficiencyMetrics, setEfficiencyMetrics] = useState<EfficiencyMetrics | null>(null)

  // Feedback
  const [showFeedback, setShowFeedback] = useState(false)
  const [showPostInterviewDiscussion, setShowPostInterviewDiscussion] = useState(false)
  const [comprehensiveFeedback, setComprehensiveFeedback] = useState("")
  const [performanceScore, setPerformanceScore] = useState<number | null>(null)
  const [technicalScore, setTechnicalScore] = useState<number | null>(null)
  const [scoreBreakdown, setScoreBreakdown] = useState<ScoreBreakdown | null>(null)
  const [constitutionalAICritique, setConstitutionalAICritique] = useState<Record<
    string,
    unknown
  > | null>(null)
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false)
  const [isGeneratingDiscussion, setIsGeneratingDiscussion] = useState(false)
  const [showCodeInDiscussion, setShowCodeInDiscussion] = useState(false)

  // Hints
  const [ragHints, setRagHints] = useState<{ level: number; hint: string; id?: string }[]>([])
  const [isLoadingHints, setIsLoadingHints] = useState(false)
  const [revealedAIHintIndices, setRevealedAIHintIndices] = useState<Set<number>>(new Set())
  const [hintFeedback, setHintFeedback] = useState<Map<string, "helpful" | "unhelpful">>(new Map())
  const [revealedHintIndices, setRevealedHintIndices] = useState<Set<number>>(new Set())
  const [revealedHints, setRevealedHints] = useState(0)
  const [isAIPartnerExpanded, setIsAIPartnerExpanded] = useState(false)

  // Editor
  const [code, setCode] = useState("")
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("mockmate_preferred_language")
      if (
        saved &&
        ["javascript", "typescript", "python", "java", "cpp", "csharp", "go", "rust"].includes(
          saved
        )
      ) {
        return saved as SupportedLanguage
      }
    }
    return "javascript"
  })
  const [protectedElements, setProtectedElements] = useState<ReturnType<
    typeof extractProtectedElements
  > | null>(null)
  const [starterCode, setStarterCode] = useState("")

  // UI Panels
  const [activePanel, setActivePanel] = useState<PanelType>("editor")
  const [showProblemPeek, setShowProblemPeek] = useState(false)
  const [selectedFile, setSelectedFile] = useState<{ path: string; content: string } | null>(null)
  const [isCodeViewerOpen, setIsCodeViewerOpen] = useState(false)

  // Focus Modes
  const [focusMode, setFocusMode] = useState(false)
  const [calmMode, setCalmMode] = useState(false)
  const [hideTimer, setHideTimer] = useState(false)

  // Timer
  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)

  // Workspace
  const [workspaceContext, setWorkspaceContext] = useState<
    Array<{ path: string; content: string }>
  >([])
  const [usageLimit, setUsageLimit] = useState<{
    used: number
    limit: number
    allowed: boolean
  } | null>(null)
  const [showCloseDialog, setShowCloseDialog] = useState(false)
  const [completedProblems, setCompletedProblems] = useState<string[]>([])

  // ============================================================================
  // Refs
  // ============================================================================

  const interviewerEndRef = useRef<HTMLDivElement | null>(null)
  const chatEndRef = useRef<HTMLDivElement | null>(null)
  const editorContainerRef = useRef<HTMLDivElement | null>(null)
  const pendingAutoSendRef = useRef<{ interviewer: boolean; partner: boolean }>({
    interviewer: false,
    partner: false,
  })
  const voiceModeLiveRef = useRef(true)

  // ============================================================================
  // Voice Input
  // ============================================================================

  const interviewerVoice = useVoiceInput({
    fallbackToWebSpeech: true,
    onTranscript: (transcript, _isFinal) => {
      setInterviewerInput(transcript)
    },
    onUtteranceEnd: (transcript) => {
      if (
        voiceModeLiveRef.current &&
        transcript.trim() &&
        !pendingAutoSendRef.current.interviewer
      ) {
        pendingAutoSendRef.current.interviewer = true
        setInterviewerInput(transcript)
        setTimeout(() => {
          // handleSendMessage will be called from component
          pendingAutoSendRef.current.interviewer = false
          interviewerVoice.clearSentTracker()
        }, 100)
      }
    },
  })

  const partnerVoice = useVoiceInput({
    fallbackToWebSpeech: true,
    onTranscript: (transcript, _isFinal) => {
      setChatInput(transcript)
    },
    onUtteranceEnd: (transcript) => {
      if (voiceModeLiveRef.current && transcript.trim() && !pendingAutoSendRef.current.partner) {
        pendingAutoSendRef.current.partner = true
        setChatInput(transcript)
        setTimeout(() => {
          pendingAutoSendRef.current.partner = false
          partnerVoice.clearSentTracker()
        }, 100)
      }
    },
  })

  const isRecordingInterviewer = interviewerVoice.isRecording

  const toggleVoiceRecording = useCallback(
    async (isInterviewer: boolean) => {
      const voice = isInterviewer ? interviewerVoice : partnerVoice
      if (voice.isRecording) {
        voice.stopRecording()
      } else {
        await voice.startRecording()
      }
    },
    [interviewerVoice, partnerVoice]
  )

  // ============================================================================
  // Effects
  // ============================================================================

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isInterviewStarted && !showFeedback && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isInterviewStarted, showFeedback, startTime])

  // Calm mode class toggle
  useEffect(() => {
    if (calmMode) {
      document.documentElement.classList.add("calm")
    } else {
      document.documentElement.classList.remove("calm")
    }
    return () => document.documentElement.classList.remove("calm")
  }, [calmMode])

  // Focus mode class toggle
  useEffect(() => {
    if (focusMode) {
      document.documentElement.classList.add("focus-mode-active")
    } else {
      document.documentElement.classList.remove("focus-mode-active")
      setShowProblemPeek(false)
    }
    return () => document.documentElement.classList.remove("focus-mode-active")
  }, [focusMode])

  // Auto-scroll chat
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

  // ============================================================================
  // Context Value
  // ============================================================================

  const contextValue: InterviewContextValue = {
    // State
    selectedScenario,
    isInterviewStarted,
    currentSessionId,
    isFromRoadmap,
    isLoading,
    authCheckComplete,
    showScenarioBrowser,
    isGuestMode,
    guestId,
    showSignupPrompt,
    interviewerMessages,
    interviewerInput,
    isRecordingInterviewer,
    chatMessages,
    chatInput,
    conversationTracker,
    currentInterviewPhase,
    recentNudgeTopics,
    userAnsweredTopics,
    testResults,
    consoleLogs,
    isRunningTests,
    testSummary,
    efficiencyMetrics,
    showFeedback,
    showPostInterviewDiscussion,
    comprehensiveFeedback,
    performanceScore,
    technicalScore,
    scoreBreakdown,
    constitutionalAICritique,
    isGeneratingFeedback,
    isGeneratingDiscussion,
    showCodeInDiscussion,
    ragHints,
    isLoadingHints,
    revealedAIHintIndices,
    hintFeedback,
    revealedHintIndices,
    revealedHints,
    isAIPartnerExpanded,
    code,
    selectedLanguage,
    protectedElements,
    starterCode,
    activePanel,
    showProblemPeek,
    selectedFile,
    isCodeViewerOpen,
    focusMode,
    calmMode,
    hideTimer,
    startTime,
    elapsedTime,
    workspaceContext,
    usageLimit,
    showCloseDialog,
    completedProblems,

    // Actions
    setSelectedScenario,
    setIsInterviewStarted,
    setCurrentSessionId,
    setShowScenarioBrowser,
    setIsLoading,
    setAuthCheckComplete,
    setInterviewerMessages,
    setInterviewerInput,
    setChatMessages,
    setChatInput,
    setConversationTracker,
    setCurrentInterviewPhase,
    setRecentNudgeTopics,
    setUserAnsweredTopics,
    setTestResults,
    setConsoleLogs,
    setIsRunningTests,
    setTestSummary,
    setEfficiencyMetrics,
    setShowFeedback,
    setShowPostInterviewDiscussion,
    setComprehensiveFeedback,
    setPerformanceScore,
    setTechnicalScore,
    setScoreBreakdown,
    setConstitutionalAICritique,
    setIsGeneratingFeedback,
    setIsGeneratingDiscussion,
    setShowCodeInDiscussion,
    setRagHints,
    setIsLoadingHints,
    setRevealedAIHintIndices,
    setHintFeedback,
    setRevealedHintIndices,
    setRevealedHints,
    setIsAIPartnerExpanded,
    setCode,
    setSelectedLanguage,
    setProtectedElements,
    setStarterCode,
    setActivePanel,
    setShowProblemPeek,
    setSelectedFile,
    setIsCodeViewerOpen,
    setFocusMode,
    setCalmMode,
    setHideTimer,
    setShowCloseDialog,
    setStartTime,
    setElapsedTime,
    setWorkspaceContext,
    setUsageLimit,
    setCompletedProblems,
    setIsGuestMode,
    setGuestId,
    setShowSignupPrompt,
    toggleVoiceRecording,

    // Refs
    interviewerEndRef,
    chatEndRef,
    editorContainerRef,
  }

  return <InterviewContext.Provider value={contextValue}>{children}</InterviewContext.Provider>
}

// ============================================================================
// Hook Export
// ============================================================================

export function useInterview(): InterviewContextValue {
  const context = useContext(InterviewContext)
  if (!context) {
    throw new Error("useInterview must be used within an InterviewProvider")
  }
  return context
}
