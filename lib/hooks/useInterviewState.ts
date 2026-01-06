/**
 * useInterviewState Hook
 *
 * Manages the core interview state including:
 * - Session state (code, language, messages)
 * - Timer state
 * - Test results and metrics
 * - Guest mode state
 * - Workspace context
 */

import { useState, useEffect, useRef } from "react"
import { User as FirebaseUser } from "firebase/auth"
import { Scenario } from "@/lib/scenarios"
import { toast } from "sonner"
import { getOrCreateGuestId, canStartFreeTrial } from "@/lib/guest-session"

export interface ChatMessage {
  type: "user" | "ai"
  message: string
  timestamp?: number
}

export interface TestResult {
  description: string
  passed: boolean
  input: any
  expected: any
  actual: any
  error: string | null
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

export interface UseInterviewStateOptions {
  firebaseUser: FirebaseUser | null
  userId: string | null
}

export interface UseInterviewStateReturn {
  // Session state
  selectedScenario: Scenario | null
  setSelectedScenario: (scenario: Scenario | null) => void
  isInterviewStarted: boolean
  setIsInterviewStarted: (started: boolean) => void
  currentSessionId: string | null
  setCurrentSessionId: (id: string | null) => void

  // Code state
  code: string
  setCode: (code: string) => void
  selectedLanguage: "javascript" | "typescript" | "python" | "java" | "cpp" | "csharp" | "go" | "rust"
  setSelectedLanguage: (lang: "javascript" | "typescript" | "python" | "java" | "cpp" | "csharp" | "go" | "rust") => void
  starterCode: string
  setStarterCode: (code: string) => void
  protectedElements: any
  setProtectedElements: (elements: any) => void

  // Timer state
  startTime: number | null
  setStartTime: (time: number | null) => void
  elapsedTime: number
  setElapsedTime: (time: number) => void

  // Chat state
  interviewerMessages: ChatMessage[]
  setInterviewerMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  chatMessages: ChatMessage[]
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  chatInput: string
  setChatInput: (input: string) => void
  interviewerInput: string
  setInterviewerInput: (input: string) => void
  isLoadingChat: boolean
  setIsLoadingChat: (loading: boolean) => void
  isLoadingInterviewer: boolean
  setIsLoadingInterviewer: (loading: boolean) => void

  // Test state
  testResults: TestResult[]
  setTestResults: (results: TestResult[]) => void
  consoleLogs: Array<{ type: string; message: string; timestamp: number }>
  setConsoleLogs: (logs: Array<{ type: string; message: string; timestamp: number }>) => void
  isRunningTests: boolean
  setIsRunningTests: (running: boolean) => void
  testSummary: { total: number; passed: number; failed: number; passRate: number }
  setTestSummary: (summary: { total: number; passed: number; failed: number; passRate: number }) => void
  efficiencyMetrics: EfficiencyMetrics | null
  setEfficiencyMetrics: (metrics: EfficiencyMetrics | null) => void

  // Feedback state
  showFeedback: boolean
  setShowFeedback: (show: boolean) => void
  showPostInterviewDiscussion: boolean
  setShowPostInterviewDiscussion: (show: boolean) => void
  comprehensiveFeedback: string
  setComprehensiveFeedback: (feedback: string) => void
  performanceScore: number | null
  setPerformanceScore: (score: number | null) => void
  constitutionalAICritique: any
  setConstitutionalAICritique: (critique: any) => void
  isGeneratingFeedback: boolean
  setIsGeneratingFeedback: (generating: boolean) => void
  isGeneratingDiscussion: boolean
  setIsGeneratingDiscussion: (generating: boolean) => void

  // Hints state
  revealedHints: number
  setRevealedHints: (hints: number) => void
  revealedHintIndices: Set<number>
  setRevealedHintIndices: (indices: Set<number>) => void
  ragHints: Array<{ level: number; hint: string }>
  setRagHints: (hints: Array<{ level: number; hint: string }>) => void
  isLoadingHints: boolean
  setIsLoadingHints: (loading: boolean) => void

  // Workspace state
  workspaceContext: Array<{ path: string; content: string; description?: string }>
  setWorkspaceContext: (context: Array<{ path: string; content: string; description?: string }>) => void

  // Guest mode state
  isGuestMode: boolean
  setIsGuestMode: (guest: boolean) => void
  guestId: string | null
  setGuestId: (id: string | null) => void

  // Refs
  lastCodeHashRef: React.MutableRefObject<string>
  previousCodeRef: React.MutableRefObject<string>
  lastCodeChangeRef: React.MutableRefObject<number>
  lastInterviewerMessageRef: React.MutableRefObject<number>
  hasTriggeredInactivityRef: React.MutableRefObject<boolean>
  hasTriggeredSilenceRef: React.MutableRefObject<boolean>

  // Completed problems
  completedProblems: string[]
  setCompletedProblems: (problems: string[]) => void

  // Utility
  resetAllState: () => void
}

export function useInterviewState({
  firebaseUser,
  userId,
}: UseInterviewStateOptions): UseInterviewStateReturn {
  // Session state
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null)
  const [isInterviewStarted, setIsInterviewStarted] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)

  // Code state
  const [code, setCode] = useState("")
  const [selectedLanguage, setSelectedLanguage] = useState<"javascript" | "typescript" | "python" | "java" | "cpp" | "csharp" | "go" | "rust">("javascript")
  const [starterCode, setStarterCode] = useState<string>("")
  const [protectedElements, setProtectedElements] = useState<any>(null)

  // Timer state
  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)

  // Chat state
  const [interviewerMessages, setInterviewerMessages] = useState<ChatMessage[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [interviewerInput, setInterviewerInput] = useState("")
  const [isLoadingChat, setIsLoadingChat] = useState(false)
  const [isLoadingInterviewer, setIsLoadingInterviewer] = useState(false)

  // Test state
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [consoleLogs, setConsoleLogs] = useState<Array<{ type: string; message: string; timestamp: number }>>([])
  const [isRunningTests, setIsRunningTests] = useState(false)
  const [testSummary, setTestSummary] = useState({ total: 0, passed: 0, failed: 0, passRate: 0 })
  const [efficiencyMetrics, setEfficiencyMetrics] = useState<EfficiencyMetrics | null>(null)

  // Feedback state
  const [showFeedback, setShowFeedback] = useState(false)
  const [showPostInterviewDiscussion, setShowPostInterviewDiscussion] = useState(false)
  const [comprehensiveFeedback, setComprehensiveFeedback] = useState<string>("")
  const [performanceScore, setPerformanceScore] = useState<number | null>(null)
  const [constitutionalAICritique, setConstitutionalAICritique] = useState<any>(null)
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false)
  const [isGeneratingDiscussion, setIsGeneratingDiscussion] = useState(false)

  // Hints state
  const [revealedHints, setRevealedHints] = useState<number>(0)
  const [revealedHintIndices, setRevealedHintIndices] = useState<Set<number>>(new Set())
  const [ragHints, setRagHints] = useState<Array<{ level: number; hint: string }>>([])
  const [isLoadingHints, setIsLoadingHints] = useState(false)

  // Workspace state
  const [workspaceContext, setWorkspaceContext] = useState<Array<{ path: string; content: string; description?: string }>>([])

  // Guest mode state
  const [isGuestMode, setIsGuestMode] = useState(false)
  const [guestId, setGuestId] = useState<string | null>(null)

  // Completed problems
  const [completedProblems, setCompletedProblems] = useState<string[]>([])

  // Refs
  const lastCodeHashRef = useRef<string>("")
  const previousCodeRef = useRef<string>(code)
  const lastCodeChangeRef = useRef<number>(Date.now())
  const lastInterviewerMessageRef = useRef<number>(Date.now())
  const hasTriggeredInactivityRef = useRef<boolean>(false)
  const hasTriggeredSilenceRef = useRef<boolean>(false)

  // Initialize guest mode if needed
  useEffect(() => {
    if (!firebaseUser) {
      const canTrial = canStartFreeTrial()
      if (canTrial) {
        const gId = getOrCreateGuestId()
        setGuestId(gId)
        setIsGuestMode(true)
      }
    } else {
      // Authenticated user - disable guest mode
      setIsGuestMode(false)
      setGuestId(null)
    }
  }, [firebaseUser])

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

  // Track code changes
  useEffect(() => {
    if (previousCodeRef.current !== code) {
      previousCodeRef.current = code
    }
  }, [code])

  // Reset all state
  const resetAllState = () => {
    setIsInterviewStarted(false)
    setShowFeedback(false)
    setShowPostInterviewDiscussion(false)
    setComprehensiveFeedback("")
    setPerformanceScore(null)
    setIsGeneratingDiscussion(false)
    setCode("")
    setInterviewerMessages([])
    setChatMessages([])
    setTestResults([])
    setTestSummary({ total: 0, passed: 0, failed: 0, passRate: 0 })
    setStartTime(null)
    setElapsedTime(0)
    lastCodeHashRef.current = ""
    setCurrentSessionId(null)
    setRevealedHints(0)
    setRevealedHintIndices(new Set())
    setRagHints([])
    setWorkspaceContext([])
    setEfficiencyMetrics(null)
    setProtectedElements(null)
    setStarterCode("")
    hasTriggeredInactivityRef.current = false
    hasTriggeredSilenceRef.current = false
    lastCodeChangeRef.current = Date.now()
    lastInterviewerMessageRef.current = Date.now()
  }

  return {
    selectedScenario,
    setSelectedScenario,
    isInterviewStarted,
    setIsInterviewStarted,
    currentSessionId,
    setCurrentSessionId,
    code,
    setCode,
    selectedLanguage,
    setSelectedLanguage,
    starterCode,
    setStarterCode,
    protectedElements,
    setProtectedElements,
    startTime,
    setStartTime,
    elapsedTime,
    setElapsedTime,
    interviewerMessages,
    setInterviewerMessages,
    chatMessages,
    setChatMessages,
    chatInput,
    setChatInput,
    interviewerInput,
    setInterviewerInput,
    isLoadingChat,
    setIsLoadingChat,
    isLoadingInterviewer,
    setIsLoadingInterviewer,
    testResults,
    setTestResults,
    consoleLogs,
    setConsoleLogs,
    isRunningTests,
    setIsRunningTests,
    testSummary,
    setTestSummary,
    efficiencyMetrics,
    setEfficiencyMetrics,
    showFeedback,
    setShowFeedback,
    showPostInterviewDiscussion,
    setShowPostInterviewDiscussion,
    comprehensiveFeedback,
    setComprehensiveFeedback,
    performanceScore,
    setPerformanceScore,
    constitutionalAICritique,
    setConstitutionalAICritique,
    isGeneratingFeedback,
    setIsGeneratingFeedback,
    isGeneratingDiscussion,
    setIsGeneratingDiscussion,
    revealedHints,
    setRevealedHints,
    revealedHintIndices,
    setRevealedHintIndices,
    ragHints,
    setRagHints,
    isLoadingHints,
    setIsLoadingHints,
    workspaceContext,
    setWorkspaceContext,
    isGuestMode,
    setIsGuestMode,
    guestId,
    setGuestId,
    lastCodeHashRef,
    previousCodeRef,
    lastCodeChangeRef,
    lastInterviewerMessageRef,
    hasTriggeredInactivityRef,
    hasTriggeredSilenceRef,
    completedProblems,
    setCompletedProblems,
    resetAllState,
  }
}
