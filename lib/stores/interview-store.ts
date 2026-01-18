import { create } from "zustand"
import { devtools } from "zustand/middleware"
import type { Scenario, ScenarioType, DifficultyLevel, Company } from "@/lib/scenarios"
import type { CompanyId } from "@/lib/data/company-questions/types"
import type { ProtectedCodeElements } from "@/lib/code-protection"

// Types
export type InterviewTargetCompany = CompanyId | "freeball" | null
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

export interface WorkspaceFile {
  path: string
  content: string
}

export interface UsageLimit {
  used: number
  limit: number
  allowed: boolean
}

export type Language =
  | "javascript"
  | "typescript"
  | "python"
  | "java"
  | "cpp"
  | "csharp"
  | "go"
  | "rust"

// Interview State Interface
interface InterviewState {
  // Scenario Selection
  selectedScenario: Scenario | null
  showScenarioBrowser: boolean

  // Filters
  filterType: ScenarioType[]
  filterDifficulty: DifficultyLevel[]
  filterCompanies: Company[]
  searchQuery: string

  // Interview Status
  isInterviewStarted: boolean
  showFeedback: boolean
  showPostInterviewDiscussion: boolean
  currentSessionId: string | null

  // Code Editor
  code: string
  selectedLanguage: Language
  starterCode: string
  protectedElements: ProtectedCodeElements | null

  // Chat
  interviewerMessages: ChatMessage[]
  chatMessages: ChatMessage[]

  // Rate Limiting
  rateLimitInfo: {
    isLimited: boolean
    resetTime?: number // Timestamp when limit resets
    tier: "free" | "pro" | "enterprise"
  } | null

  // Test Results
  testResults: TestResult[]
  testSummary: TestSummary
  efficiencyMetrics: EfficiencyMetrics | null

  // Timer
  startTime: number | null
  elapsedTime: number

  // Hints
  revealedHints: number

  // Workspace
  workspaceContext: WorkspaceFile[]
  selectedFile: WorkspaceFile | null
  isCodeViewerOpen: boolean

  // Feedback
  comprehensiveFeedback: string
  performanceScore: number | null

  // Usage
  usageLimit: UsageLimit | null

  // Loading States
  isLoadingChat: boolean
  isLoadingInterviewer: boolean
  isRunningTests: boolean
  isGeneratingDiscussion: boolean

  // Proactive Interviewer Tracking
  lastCodeHash: string
  lastCodeChangeTime: number
  lastInterviewerMessageTime: number
  hasTriggeredInactivity: boolean
  hasTriggeredSilence: boolean

  // Company Picker (for freeball sessions)
  showCompanyPicker: boolean
  targetCompany: InterviewTargetCompany

  // Real Interview Mode (fuzzy problem statements + clarifying questions)
  realInterviewMode: boolean

  // Strict Time Limit (in seconds) - e.g., 25*60 for Meta
  strictTimeLimit: number | null
}

// Actions Interface
interface InterviewActions {
  // Scenario Actions
  setSelectedScenario: (scenario: Scenario | null) => void
  setShowScenarioBrowser: (show: boolean) => void

  // Filter Actions
  setFilterType: (types: ScenarioType[]) => void
  setFilterDifficulty: (difficulties: DifficultyLevel[]) => void
  setFilterCompanies: (companies: Company[]) => void
  setSearchQuery: (query: string) => void
  clearFilters: () => void

  // Interview Actions
  startInterview: (scenario: Scenario, sessionId: string, initialCode: string) => void
  endInterview: () => void
  resetInterview: () => void

  // Code Actions
  setCode: (code: string) => void
  setSelectedLanguage: (language: Language) => void
  setStarterCode: (code: string) => void
  setProtectedElements: (elements: ProtectedCodeElements | null) => void

  // Chat Actions
  addInterviewerMessage: (message: ChatMessage) => void
  addChatMessage: (message: ChatMessage) => void
  setInterviewerMessages: (messages: ChatMessage[]) => void
  setChatMessages: (messages: ChatMessage[]) => void
  setRateLimitInfo: (
    info: { isLimited: boolean; resetTime?: number; tier: "free" | "pro" | "enterprise" } | null
  ) => void
  clearRateLimit: () => void

  // Test Actions
  setTestResults: (results: TestResult[]) => void
  setTestSummary: (summary: TestSummary) => void
  setEfficiencyMetrics: (metrics: EfficiencyMetrics | null) => void

  // Timer Actions
  setStartTime: (time: number | null) => void
  setElapsedTime: (time: number) => void
  incrementElapsedTime: () => void

  // Hints Actions
  setRevealedHints: (count: number) => void
  revealNextHint: () => void

  // Workspace Actions
  setWorkspaceContext: (files: WorkspaceFile[]) => void
  addWorkspaceFile: (file: WorkspaceFile) => void
  setSelectedFile: (file: WorkspaceFile | null) => void
  setIsCodeViewerOpen: (isOpen: boolean) => void

  // Feedback Actions
  setShowFeedback: (show: boolean) => void
  setShowPostInterviewDiscussion: (show: boolean) => void
  setComprehensiveFeedback: (feedback: string) => void
  setPerformanceScore: (score: number | null) => void

  // Usage Actions
  setUsageLimit: (limit: UsageLimit | null) => void

  // Loading Actions
  setIsLoadingChat: (loading: boolean) => void
  setIsLoadingInterviewer: (loading: boolean) => void
  setIsRunningTests: (running: boolean) => void
  setIsGeneratingDiscussion: (generating: boolean) => void

  // Session Actions
  setCurrentSessionId: (id: string | null) => void

  // Proactive Interviewer Actions
  updateCodeHash: (hash: string) => void
  updateLastCodeChangeTime: () => void
  updateLastInterviewerMessageTime: () => void
  setHasTriggeredInactivity: (triggered: boolean) => void
  setHasTriggeredSilence: (triggered: boolean) => void
  resetProactiveTracking: () => void

  // Company Picker Actions
  setShowCompanyPicker: (show: boolean) => void
  setTargetCompany: (company: InterviewTargetCompany) => void

  // Real Interview Mode Actions
  setRealInterviewMode: (enabled: boolean) => void
  setStrictTimeLimit: (seconds: number | null) => void
}

// Initial State
const initialState: InterviewState = {
  // Scenario Selection
  selectedScenario: null,
  showScenarioBrowser: true,

  // Filters
  filterType: [],
  filterDifficulty: [],
  filterCompanies: [],
  searchQuery: "",

  // Interview Status
  isInterviewStarted: false,
  showFeedback: false,
  showPostInterviewDiscussion: false,
  currentSessionId: null,

  // Code Editor
  code: "",
  selectedLanguage: "javascript",
  starterCode: "",
  protectedElements: null,

  // Chat
  interviewerMessages: [],
  chatMessages: [],

  // Rate Limiting
  rateLimitInfo: null,

  // Test Results
  testResults: [],
  testSummary: { total: 0, passed: 0, failed: 0, passRate: 0 },
  efficiencyMetrics: null,

  // Timer
  startTime: null,
  elapsedTime: 0,

  // Hints
  revealedHints: 0,

  // Workspace
  workspaceContext: [],
  selectedFile: null,
  isCodeViewerOpen: false,

  // Feedback
  comprehensiveFeedback: "",
  performanceScore: null,

  // Usage
  usageLimit: null,

  // Loading States
  isLoadingChat: false,
  isLoadingInterviewer: false,
  isRunningTests: false,
  isGeneratingDiscussion: false,

  // Proactive Interviewer Tracking
  lastCodeHash: "",
  lastCodeChangeTime: Date.now(),
  lastInterviewerMessageTime: Date.now(),
  hasTriggeredInactivity: false,
  hasTriggeredSilence: false,

  // Company Picker (for freeball sessions)
  showCompanyPicker: false,
  targetCompany: null,

  // Real Interview Mode
  realInterviewMode: false,
  strictTimeLimit: null,
}

// Create the store
export const useInterviewStore = create<InterviewState & InterviewActions>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Scenario Actions
      setSelectedScenario: (scenario) =>
        set({
          selectedScenario: scenario,
          // Clear test results when switching scenarios to prevent stale data
          testResults: [],
          testSummary: { total: 0, passed: 0, failed: 0, passRate: 0 },
          efficiencyMetrics: null,
          // Clear hints when switching
          revealedHints: 0,
          // Clear chat messages for new scenario
          interviewerMessages: [],
          chatMessages: [],
        }),
      setShowScenarioBrowser: (show) => set({ showScenarioBrowser: show }),

      // Filter Actions
      setFilterType: (types) => set({ filterType: types }),
      setFilterDifficulty: (difficulties) => set({ filterDifficulty: difficulties }),
      setFilterCompanies: (companies) => set({ filterCompanies: companies }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      clearFilters: () =>
        set({
          filterType: [],
          filterDifficulty: [],
          filterCompanies: [],
          searchQuery: "",
        }),

      // Interview Actions
      startInterview: (scenario, sessionId, initialCode) =>
        set({
          selectedScenario: scenario,
          currentSessionId: sessionId,
          isInterviewStarted: true,
          showScenarioBrowser: false,
          code: initialCode,
          starterCode: initialCode,
          startTime: Date.now(),
          elapsedTime: 0,
          lastCodeChangeTime: Date.now(),
          lastInterviewerMessageTime: Date.now(),
          hasTriggeredInactivity: false,
          hasTriggeredSilence: false,
        }),

      endInterview: () =>
        set({
          showFeedback: true,
          isInterviewStarted: false,
        }),

      resetInterview: () =>
        set({
          ...initialState,
          // Preserve usage limit
          usageLimit: get().usageLimit,
        }),

      // Code Actions
      setCode: (code) => {
        const hash = code.trim().replace(/\s+/g, " ")
        const prevHash = get().lastCodeHash
        set({
          code,
          lastCodeHash: hash,
          lastCodeChangeTime: hash !== prevHash ? Date.now() : get().lastCodeChangeTime,
          hasTriggeredInactivity: hash !== prevHash ? false : get().hasTriggeredInactivity,
        })
      },
      setSelectedLanguage: (language) => set({ selectedLanguage: language }),
      setStarterCode: (code) => set({ starterCode: code }),
      setProtectedElements: (elements) => set({ protectedElements: elements }),

      // Chat Actions
      addInterviewerMessage: (message) =>
        set((state) => ({
          interviewerMessages: [
            ...state.interviewerMessages,
            { ...message, timestamp: Date.now() },
          ],
        })),
      addChatMessage: (message) =>
        set((state) => ({
          chatMessages: [...state.chatMessages, { ...message, timestamp: Date.now() }],
        })),
      setInterviewerMessages: (messages) => set({ interviewerMessages: messages }),
      setChatMessages: (messages) => set({ chatMessages: messages }),
      setRateLimitInfo: (info) => set({ rateLimitInfo: info }),
      clearRateLimit: () => set({ rateLimitInfo: null }),

      // Test Actions
      setTestResults: (results) => set({ testResults: results }),
      setTestSummary: (summary) => set({ testSummary: summary }),
      setEfficiencyMetrics: (metrics) => set({ efficiencyMetrics: metrics }),

      // Timer Actions
      setStartTime: (time) => set({ startTime: time }),
      setElapsedTime: (time) => set({ elapsedTime: time }),
      incrementElapsedTime: () =>
        set((state) => {
          if (state.startTime) {
            return { elapsedTime: Math.floor((Date.now() - state.startTime) / 1000) }
          }
          return {}
        }),

      // Hints Actions
      setRevealedHints: (count) => set({ revealedHints: count }),
      revealNextHint: () => set((state) => ({ revealedHints: state.revealedHints + 1 })),

      // Workspace Actions
      setWorkspaceContext: (files) => set({ workspaceContext: files }),
      addWorkspaceFile: (file) =>
        set((state) => ({
          workspaceContext: [...state.workspaceContext, file],
        })),
      setSelectedFile: (file) => set({ selectedFile: file }),
      setIsCodeViewerOpen: (isOpen) => set({ isCodeViewerOpen: isOpen }),

      // Feedback Actions
      setShowFeedback: (show) => set({ showFeedback: show }),
      setShowPostInterviewDiscussion: (show) => set({ showPostInterviewDiscussion: show }),
      setComprehensiveFeedback: (feedback) => set({ comprehensiveFeedback: feedback }),
      setPerformanceScore: (score) => set({ performanceScore: score }),

      // Usage Actions
      setUsageLimit: (limit) => set({ usageLimit: limit }),

      // Loading Actions
      setIsLoadingChat: (loading) => set({ isLoadingChat: loading }),
      setIsLoadingInterviewer: (loading) => set({ isLoadingInterviewer: loading }),
      setIsRunningTests: (running) => set({ isRunningTests: running }),
      setIsGeneratingDiscussion: (generating) => set({ isGeneratingDiscussion: generating }),

      // Session Actions
      setCurrentSessionId: (id) => set({ currentSessionId: id }),

      // Proactive Interviewer Actions
      updateCodeHash: (hash) => set({ lastCodeHash: hash }),
      updateLastCodeChangeTime: () => set({ lastCodeChangeTime: Date.now() }),
      updateLastInterviewerMessageTime: () =>
        set({ lastInterviewerMessageTime: Date.now(), hasTriggeredSilence: false }),
      setHasTriggeredInactivity: (triggered) => set({ hasTriggeredInactivity: triggered }),
      setHasTriggeredSilence: (triggered) => set({ hasTriggeredSilence: triggered }),
      resetProactiveTracking: () =>
        set({
          lastCodeChangeTime: Date.now(),
          lastInterviewerMessageTime: Date.now(),
          hasTriggeredInactivity: false,
          hasTriggeredSilence: false,
          lastCodeHash: "",
        }),

      // Company Picker Actions
      setShowCompanyPicker: (show) => set({ showCompanyPicker: show }),
      setTargetCompany: (company) => set({ targetCompany: company }),

      // Real Interview Mode Actions
      setRealInterviewMode: (enabled) => set({ realInterviewMode: enabled }),
      setStrictTimeLimit: (seconds) => set({ strictTimeLimit: seconds }),
    }),
    { name: "interview-store" }
  )
)

// Selectors for commonly used combinations
export const selectIsInInterview = (state: InterviewState) =>
  state.isInterviewStarted && !state.showFeedback && !state.showPostInterviewDiscussion

export const selectCanRunTests = (state: InterviewState) =>
  state.isInterviewStarted && !state.showFeedback && !state.isRunningTests

export const selectTestPassRate = (state: InterviewState) =>
  state.testSummary.total > 0 ? state.testSummary.passRate : 0

export const selectFormattedTime = (state: InterviewState) => {
  const mins = Math.floor(state.elapsedTime / 60)
  const secs = state.elapsedTime % 60
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}

export const selectUserMessageCount = (state: InterviewState) =>
  state.interviewerMessages.filter((m) => m.type === "user").length

export const selectHasCollaborated = (state: InterviewState) =>
  state.interviewerMessages.filter((m) => m.type === "user").length > 0 ||
  state.chatMessages.filter((m) => m.type === "user").length > 0
