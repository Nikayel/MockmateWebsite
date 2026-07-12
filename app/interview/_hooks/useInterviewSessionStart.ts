import { useRef, useState } from "react"
import type { Dispatch, SetStateAction } from "react"
import type { User as FirebaseUser } from "firebase/auth"
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"
import { toast } from "sonner"
import type { User } from "@/lib/types"
import type { CompanyId } from "@/lib/data/company-questions/types"
import type { InterviewTargetCompany } from "@/lib/stores"
import type { Scenario } from "@/lib/scenarios"
import { createInterviewSession, recordSessionStart } from "@/lib/firestore-helpers"
import { markFreeTrialUsed, saveGuestSessionData } from "@/lib/guest-session"
import { extractProtectedElements } from "@/lib/code-protection"
import { createBugfixEvidenceEvent, type BugfixEvidenceEvent } from "@/lib/bugfix"
import { getBugfixScenarioLanguage, type EditorLanguage } from "../_utils/language"
import {
  isWorkspaceScenario,
  toWorkspaceContextFiles,
  toWorkspaceScenarioFiles,
} from "../_utils/workspace"
import {
  getInitialInterviewerMessage,
  getInitialPartnerMessage,
  getProblemTypeLabel,
} from "../_utils/interview-messages"
import type {
  ChatMessage,
  EfficiencyMetrics,
  TestResult,
  TestSummary,
  WorkspaceContextFile,
} from "../_types"
import { isUsageBlocked } from "./useGuestQuota"
import type { UsageLimit } from "./useGuestQuota"
import type { HintFeedbackValue } from "./useInterviewMetrics"

type ScoreBreakdown = {
  understandingScore?: number
  problemSolvingScore?: number
  codeQualityScore?: number
  communicationScore?: number
} | null

export interface UseInterviewSessionStartOptions {
  // Navigation + auth + entitlement
  router: AppRouterInstance
  user: User | null
  firebaseUser: FirebaseUser | null
  isGuestMode: boolean
  guestId: string | null
  usageLimit: UsageLimit | null
  refreshUsageLimit: (uid: string) => Promise<void>

  // Page state reads
  selectedScenario: Scenario | null
  targetCompany: InterviewTargetCompany
  activeRoadmap: { targetCompany?: InterviewTargetCompany } | null
  selectedLanguage: EditorLanguage

  // Page state setters
  setSelectedScenario: Dispatch<SetStateAction<Scenario | null>>
  setShowOptimalApproach: Dispatch<SetStateAction<boolean>>
  setTargetCompany: (value: InterviewTargetCompany) => void
  setLockedCompanyForPicker: Dispatch<SetStateAction<InterviewTargetCompany>>
  setShowCompanyPicker: (value: boolean) => void
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
  setSelectedLanguage: Dispatch<SetStateAction<EditorLanguage>>
  setCode: Dispatch<SetStateAction<string>>
  setStarterCode: Dispatch<SetStateAction<string>>
  setBugfixEvidenceEvents: Dispatch<SetStateAction<BugfixEvidenceEvent[]>>
  setProtectedElements: Dispatch<SetStateAction<ReturnType<typeof extractProtectedElements> | null>>
  setInterviewerMessages: Dispatch<SetStateAction<ChatMessage[]>>
  setRecentNudgeTopics: Dispatch<SetStateAction<string[]>>
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>

  // Refs / callbacks / controllers
  hintAgent: { resetHints: () => void }
  resetBugfixSessionState: () => void
}

export function useInterviewSessionStart(opts: UseInterviewSessionStartOptions) {
  // Re-entrancy guard. A ref updates synchronously, so a rapid second call (for
  // example a double-click on "Start practice") is rejected before it can create a
  // second session and consume quota twice. `isStarting` mirrors it for the UI so
  // the button can show a loading and disabled state while the start is in flight.
  const startingRef = useRef(false)
  const [isStarting, setIsStarting] = useState(false)

  const runStartSequence = async (
    scenarioOverride?: Scenario,
    companyOverride?: InterviewTargetCompany
  ) => {
    // Use passed scenario if provided, otherwise use state (handles race condition)
    const scenario = scenarioOverride || opts.selectedScenario

    if (!scenario) {
      toast.error("Please select a scenario first")
      return
    }

    // If we received a scenario override, update state
    if (scenarioOverride) {
      opts.setSelectedScenario(scenarioOverride)
      opts.setShowOptimalApproach(false) // Reset optimal approach visibility for new scenario
    }

    // Determine target company:
    // 1. If override provided (from company picker), use it
    // 2. If from roadmap, use roadmap's target company (but show picker if fuzzy)
    // 3. If freeball with multiple companies and no selection, show picker
    // 4. If freeball with single company, use that company
    // 5. Otherwise, use "freeball" (generic)
    let effectiveTargetCompany: InterviewTargetCompany = companyOverride ?? opts.targetCompany
    const hasFuzzyMode = !!(scenario as any).fuzzyStatement

    if (!effectiveTargetCompany) {
      // Check if coming from roadmap
      if (opts.activeRoadmap?.targetCompany) {
        // If scenario has fuzzy mode, show picker to ask about Real Interview Mode
        // Company is pre-selected/locked from roadmap
        if (hasFuzzyMode) {
          opts.setLockedCompanyForPicker(opts.activeRoadmap.targetCompany)
          opts.setShowCompanyPicker(true)
          return // Wait for user to choose Real Interview Mode
        }
        effectiveTargetCompany = opts.activeRoadmap.targetCompany
      }
      // Check if scenario has companies tagged
      else if (scenario.companies && scenario.companies.length > 0) {
        if (scenario.companies.length === 1) {
          // Single company - auto-select it
          effectiveTargetCompany = scenario.companies[0].toLowerCase() as CompanyId
        } else {
          // Multiple companies - show picker
          opts.setLockedCompanyForPicker(null) // Not locked, let user choose
          opts.setShowCompanyPicker(true)
          return // Wait for user to pick
        }
      } else {
        // No companies tagged - freeball
        effectiveTargetCompany = "freeball"
      }
    }

    // Store the target company in state
    opts.setTargetCompany(effectiveTargetCompany)

    // Check usage limit before starting - redirect to limit page (skip for DSA questions)
    if (isUsageBlocked(!!opts.user, opts.usageLimit, scenario.type)) {
      opts.router.push("/limit-reached")
      return
    }

    // Create session and increment usage when starting interview
    // DSA questions don't count against session limit
    if (opts.user) {
      try {
        // Create session document first
        // Include pattern for stats aggregation (used by dashboard Performance Insights)
        const scenarioPattern =
          ("pattern" in scenario ? scenario.pattern : scenario.type) || "unknown"
        const sessionId = await createInterviewSession(
          opts.user.id,
          scenario.title,
          scenario.type,
          scenario.difficulty,
          scenario.id,
          scenarioPattern,
          effectiveTargetCompany // Pass target company for RAG + analytics
        )
        opts.setCurrentSessionId(sessionId)

        // Initialize session metrics tracking (required for completion tracking)
        const token = await opts.firebaseUser?.getIdToken()
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
        const result = await recordSessionStart(opts.user.id)
        if (result.usedPaidSession) {
          toast.success(`Session started! You now have ${result.freeOpensRemaining} free opens.`)
        }
        // Refresh usage limit
        await opts.refreshUsageLimit(opts.user.id)
      } catch (error) {
        console.error("Error creating session:", error)
        toast.error("Session tracking error", {
          description: "Your progress will still be saved locally. You can continue the interview.",
        })
      }
    } else if (opts.isGuestMode && opts.guestId) {
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
            guestId: opts.guestId,
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
            opts.router.push("/login?redirect=interview")
            return
          }
          throw new Error(data.error || "Failed to create session")
        }

        opts.setCurrentSessionId(data.sessionId)

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

    opts.setIsInterviewStarted(true)
    opts.setShowScenarioBrowser(false)
    opts.setStartTime(Date.now())

    // Clear previous session's test results and metrics (fixes terminal persistence bug)
    opts.setTestResults([])
    opts.setTestSummary({ total: 0, passed: 0, failed: 0, passRate: 0 })
    opts.setEfficiencyMetrics(null)
    opts.setElapsedTime(0)
    opts.setRevealedHints(0)
    opts.setRevealedHintIndices(new Set())
    opts.hintAgent.resetHints()
    opts.setRevealedAIHintIndices(new Set())
    opts.setHintFeedback(new Map())
    opts.setWorkspaceContext([])
    opts.setActiveWorkspacePath(null)
    opts.resetBugfixSessionState()
    opts.setComprehensiveFeedback("")
    opts.setPerformanceScore(null)
    opts.setTechnicalScore(null)
    opts.setScoreBreakdown(null)

    // Initialize code based on scenario type
    let initialCode: string
    let activeLanguage = opts.selectedLanguage
    let initialBugfixFileEvent: BugfixEvidenceEvent | null = null
    if (isWorkspaceScenario(scenario)) {
      // SQL workspace lessons are tutorial-only and never enter the interview editor.
      if (scenario.workspace.language !== "sql") {
        activeLanguage = scenario.workspace.language
        if (activeLanguage !== opts.selectedLanguage) {
          opts.setSelectedLanguage(activeLanguage)
        }
      }
      const contextFiles = toWorkspaceScenarioFiles(scenario)
      const primaryFile = contextFiles.find(
        (file) => file.path === scenario.workspace.primaryFilePath
      )
      initialCode = primaryFile?.content || ""
      opts.setWorkspaceContext(contextFiles)
      opts.setActiveWorkspacePath(primaryFile?.path || scenario.workspace.primaryFilePath)
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
      activeLanguage = getBugfixScenarioLanguage(scenario, opts.selectedLanguage)
      if (activeLanguage !== opts.selectedLanguage) {
        opts.setSelectedLanguage(activeLanguage)
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
        opts.setWorkspaceContext(contextFiles)
        toast.success(`Loaded ${contextFiles.length} codebase file(s) for review`)
      }
    } else if (scenario.type === "add-functionality") {
      // For Add Functionality scenarios, load existing code to extend
      initialCode =
        (scenario as any).existingCode?.[opts.selectedLanguage] ||
        `// Add functionality to the existing codebase`

      // Auto-load codebase files into workspace context
      const codebaseFiles = (scenario as any).codebaseFiles?.[opts.selectedLanguage] || []
      if (codebaseFiles.length > 0) {
        const contextFiles = toWorkspaceContextFiles(codebaseFiles)
        opts.setWorkspaceContext(contextFiles)
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
        (scenario as any).starterCode?.[opts.selectedLanguage] ||
        `function solution() {
  // Write your solution here

}`
    }
    opts.setCode(initialCode)
    opts.setStarterCode(initialCode)

    if (scenario.type === "bugfix") {
      const startedAt = Date.now()
      opts.setBugfixEvidenceEvents([
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
    opts.setProtectedElements(protectedElementsData)

    // Initialize interviewer with welcome message (problem details are now in left panel)
    const problemType = getProblemTypeLabel(scenario.type)
    const initialMessage = getInitialInterviewerMessage(
      scenario.title,
      scenario.difficulty,
      problemType
    )

    opts.setInterviewerMessages([{ type: "ai", message: initialMessage }])
    opts.setRecentNudgeTopics([]) // Reset tracked topics for new interview
    // Only set chat messages for non-DSA scenarios (DSA has no AI partner)
    const partnerMessage = getInitialPartnerMessage(scenario)
    if (partnerMessage) {
      opts.setChatMessages([{ type: "ai", message: partnerMessage }])
    } else {
      opts.setChatMessages([]) // Clear chat messages for DSA
    }

    // Don't fetch hints immediately - wait for user to write code
    // Hints will be fetched when user has written meaningful code (see useEffect below)
  }

  const startInterview = async (
    scenarioOverride?: Scenario,
    companyOverride?: InterviewTargetCompany
  ) => {
    // Reject a duplicate invocation while a start is already in flight.
    if (startingRef.current) return
    startingRef.current = true
    setIsStarting(true)
    try {
      await runStartSequence(scenarioOverride, companyOverride)
    } finally {
      // Release on every exit path: session created, an error, or an early return
      // that hands off to the company picker. The guard must never stay stuck.
      startingRef.current = false
      setIsStarting(false)
    }
  }

  return { startInterview, isStarting }
}
