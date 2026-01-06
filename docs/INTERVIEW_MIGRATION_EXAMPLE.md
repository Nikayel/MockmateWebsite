# Interview Page Migration Example

This document shows concrete before/after examples for migrating the interview page to use the new hooks and services.

## State Management

### Before (page.tsx - Lines 166-296)

```typescript
function InterviewPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, firebaseUser, loading: authLoading, initialized } = useAuth()
  const { markQuestionCompleted, addActualTime, activeRoadmap } = useRoadmapStore()

  const [isLoading, setIsLoading] = useState(true)
  const [authCheckComplete, setAuthCheckComplete] = useState(false)
  const [showScenarioBrowser, setShowScenarioBrowser] = useState(true)
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null)
  const [isInterviewStarted, setIsInterviewStarted] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [showPostInterviewDiscussion, setShowPostInterviewDiscussion] = useState(false)
  const [comprehensiveFeedback, setComprehensiveFeedback] = useState<string>("")
  const [performanceScore, setPerformanceScore] = useState<number | null>(null)
  const [constitutionalAICritique, setConstitutionalAICritique] = useState<any>(null)
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false)
  const [isGeneratingDiscussion, setIsGeneratingDiscussion] = useState(false)
  const [showCodeInDiscussion, setShowCodeInDiscussion] = useState(false)
  const [code, setCode] = useState("")
  const [selectedLanguage, setSelectedLanguage] = useState<"javascript" | "typescript" | "python" | "java" | "cpp" | "csharp" | "go" | "rust">("javascript")
  const [completedProblems, setCompletedProblems] = useState<string[]>([])
  const [isGuestMode, setIsGuestMode] = useState(false)
  const [guestId, setGuestId] = useState<string | null>(null)
  const [showSignupPrompt, setShowSignupPrompt] = useState(false)
  const [interviewerMessages, setInterviewerMessages] = useState<ChatMessage[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [interviewerInput, setInterviewerInput] = useState("")
  const [isLoadingChat, setIsLoadingChat] = useState(false)
  const [isLoadingInterviewer, setIsLoadingInterviewer] = useState(false)
  const [showAITips, setShowAITips] = useState(false)
  const [isAIPartnerExpanded, setIsAIPartnerExpanded] = useState(false)
  const [ragHints, setRagHints] = useState<{ level: number; hint: string }[]>([])
  const [isLoadingHints, setIsLoadingHints] = useState(false)
  const [revealedHintIndices, setRevealedHintIndices] = useState<Set<number>>(new Set())
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [consoleLogs, setConsoleLogs] = useState<Array<{ type: string; message: string; timestamp: number }>>([])
  const [isRunningTests, setIsRunningTests] = useState(false)
  const [testSummary, setTestSummary] = useState({ total: 0, passed: 0, failed: 0, passRate: 0 })
  const [efficiencyMetrics, setEfficiencyMetrics] = useState<EfficiencyMetrics | null>(null)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [revealedHints, setRevealedHints] = useState<number>(0)
  const [hintTimers, setHintTimers] = useState<number[]>([])
  const [workspaceContext, setWorkspaceContext] = useState<Array<{ path: string; content: string }>>([])
  const [usageLimit, setUsageLimit] = useState<{ used: number; limit: number; allowed: boolean } | null>(null)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<{ path: string; content: string } | null>(null)
  const [isCodeViewerOpen, setIsCodeViewerOpen] = useState(false)
  const [showCloseDialog, setShowCloseDialog] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [calmMode, setCalmMode] = useState(false)
  const [hideTimer, setHideTimer] = useState(false)
  const [activePanel, setActivePanel] = useState<'problem' | 'editor' | 'chat'>('editor')
  const [showProblemPeek, setShowProblemPeek] = useState(false)
  const [protectedElements, setProtectedElements] = useState<any>(null)
  const [starterCode, setStarterCode] = useState<string>("")

  // ... 50+ useState calls total!
}
```

### After (with hooks)

```typescript
import { useInterviewState, useInterviewUI, useTestExecution } from "@/lib/hooks"

function InterviewPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, firebaseUser, loading: authLoading, initialized } = useAuth()
  const { markQuestionCompleted, addActualTime, activeRoadmap } = useRoadmapStore()

  // All state consolidated into 3 hooks
  const state = useInterviewState({
    firebaseUser,
    userId: user?.id || null,
  })

  const ui = useInterviewUI({
    isInterviewStarted: state.isInterviewStarted,
  })

  const tests = useTestExecution({
    selectedScenario: state.selectedScenario,
    code: state.code,
    selectedLanguage: state.selectedLanguage,
    onTestComplete: handleTestComplete,
    onTestError: handleTestError,
    playSound,
  })

  const [isLoading, setIsLoading] = useState(true)
  const [authCheckComplete, setAuthCheckComplete] = useState(false)
  const [usageLimit, setUsageLimit] = useState<{ used: number; limit: number; allowed: boolean } | null>(null)

  // Just 3 local useState calls + 3 powerful hooks!
}
```

**Lines saved**: ~130 useState lines → ~30 lines

---

## Session Start Logic

### Before (page.tsx - Lines 1652-1779)

```typescript
const startInterview = async (scenarioOverride?: Scenario) => {
  const scenario = scenarioOverride || selectedScenario

  if (!scenario) {
    toast.error("Please select a scenario first")
    return
  }

  if (scenarioOverride) {
    setSelectedScenario(scenarioOverride)
  }

  // Check usage limit - redirect to limit page (skip for DSA)
  if (user && usageLimit && !usageLimit.allowed && scenario.type !== 'dsa') {
    router.push("/limit-reached")
    return
  }

  // Create session and increment usage when starting interview
  if (user) {
    try {
      const scenarioPattern = ('pattern' in scenario ? scenario.pattern : scenario.type) || 'unknown'
      const sessionId = await createInterviewSession(
        user.id,
        scenario.title,
        scenario.type,
        scenario.difficulty,
        scenario.id,
        scenarioPattern
      )
      setCurrentSessionId(sessionId)

      // Initialize session metrics
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
              pattern: scenarioPattern,
              difficulty: scenario.difficulty,
              scenarioType: scenario.type,
              hintsTotal: (scenario as any).hints?.length || 3,
            },
          }),
        }).catch(err => console.error("Session metrics init failed:", err))
      }

      // Record session start
      const result = await recordSessionStart(user.id)
      if (result.usedPaidSession) {
        toast.success(`Session started! You now have ${result.freeOpensRemaining} free opens.`)
      }

      // Refresh usage limit
      const updatedUsage = await checkUsageLimit(user.id)
      setUsageLimit(updatedUsage)
    } catch (error) {
      console.error("Error creating session:", error)
      toast.error("Session tracking error", {
        description: "Your progress will still be saved locally.",
      })
    }
  } else if (isGuestMode && guestId) {
    // Guest user logic... (another 50 lines)
  }

  setIsInterviewStarted(true)
  setShowScenarioBrowser(false)
  setStartTime(Date.now())

  // Clear previous session's data
  setTestResults([])
  setTestSummary({ total: 0, passed: 0, failed: 0, passRate: 0 })
  setEfficiencyMetrics(null)
  setElapsedTime(0)
  setRevealedHints(0)
  setRevealedHintIndices(new Set())
  setRagHints([])
  setWorkspaceContext([])
  setComprehensiveFeedback("")
  setPerformanceScore(null)

  // Initialize code... (another 50 lines)
}
```

### After (with session-manager service)

```typescript
import { startInterviewSession } from "@/lib/interview"

const startInterview = async (scenarioOverride?: Scenario) => {
  const scenario = scenarioOverride || state.selectedScenario

  if (!scenario) {
    toast.error("Please select a scenario first")
    return
  }

  if (scenarioOverride) {
    state.setSelectedScenario(scenarioOverride)
  }

  // Start session using service
  const result = await startInterviewSession({
    scenario,
    userId: user?.id,
    firebaseUser,
    isGuestMode: state.isGuestMode,
    guestId: state.guestId,
    usageLimit,
    onSessionCreated: (sessionId) => {
      state.setCurrentSessionId(sessionId)
    },
  })

  // Handle result
  if (result.shouldRedirect) {
    router.push(result.redirectUrl!)
    return
  }

  if (!result.success) {
    // Error already toasted by service
    return
  }

  // Update UI state
  state.setIsInterviewStarted(true)
  ui.setShowScenarioBrowser(false)
  state.setStartTime(Date.now())

  // Reset is handled by hook
  state.resetAllState()

  // Initialize code for scenario
  initializeCodeForScenario(scenario)

  // Refresh usage limit
  if (user) {
    const updatedUsage = await checkUsageLimit(user.id)
    setUsageLimit(updatedUsage)
  }
}
```

**Lines saved**: ~130 lines → ~40 lines

---

## Test Execution

### Before (page.tsx - Lines 2622-2738)

```typescript
const runCode = async () => {
  if (!selectedScenario) return

  setIsRunningTests(true)
  setTestResults([])
  setConsoleLogs([])

  // Analyze code efficiency
  const metrics = analyzeCodeEfficiency(code)
  setEfficiencyMetrics(metrics)

  try {
    const response = await fetch("/api/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        scenarioId: selectedScenario.id,
        language: selectedLanguage,
      }),
    })

    const data = await response.json()

    // Handle errors
    if (!response.ok || data.error) {
      const errorMessage = data.error || `Server error (${response.status})`
      setConsoleLogs([{
        type: 'error',
        message: `❌ Execution Error: ${errorMessage}`,
        timestamp: Date.now()
      }])
      setTestResults([{
        description: "Execution Error",
        passed: false,
        error: errorMessage,
        input: "",
        expected: "",
        actual: ""
      }])
      playSound('fail')
      setIsRunningTests(false)
      return
    }

    if (data.results) {
      setTestResults(data.results)
      setTestSummary(data.summary)

      if (data.consoleLogs && data.consoleLogs.length > 0) {
        setConsoleLogs(data.consoleLogs)
      }

      // Check for syntax errors
      const errorResults = data.results.filter((r: TestResult) => r.error)
      const allFailed = data.summary.passRate === 0

      if (allFailed && errorResults.length > 0) {
        const firstError = errorResults[0].error
        const isSyntaxError = firstError && (
          firstError.includes('SyntaxError') ||
          firstError.includes('Compilation error') ||
          firstError.includes('Unexpected token')
        )

        playSound('fail')
        setIsRunningTests(false)

        setInterviewerMessages(prev => [...prev, {
          type: 'ai',
          message: `I see there's ${isSyntaxError ? 'a syntax error' : 'an error'} in your code...`
        }])

        return
      }

      // Play sounds
      if (data.summary.passRate === 100) {
        playSound('success')
      } else if (data.summary.passRate >= 50) {
        playSound('milestone')
      } else {
        playSound('fail')
      }

      setIsRunningTests(false)
    }
  } catch (error) {
    console.error("Code execution error:", error)
    toast.error("Failed to run tests")
  } finally {
    setIsRunningTests(false)
  }
}
```

### After (with useTestExecution hook)

```typescript
// Hook setup
const tests = useTestExecution({
  selectedScenario: state.selectedScenario,
  code: state.code,
  selectedLanguage: state.selectedLanguage,
  onTestComplete: (results, summary) => {
    // Handle test completion
    if (summary.passRate === 0 && results.some(r => r.error)) {
      const firstError = results[0].error
      const isSyntaxError = firstError?.includes('SyntaxError')

      state.setInterviewerMessages(prev => [...prev, {
        type: 'ai',
        message: `I see there's ${isSyntaxError ? 'a syntax error' : 'an error'} in your code...`
      }])
    }
  },
  onTestError: (error) => {
    state.setInterviewerMessages(prev => [...prev, {
      type: 'ai',
      message: `There was a problem running your code: ${error}...`
    }])
  },
  playSound,
})

// Running tests is now just:
const runCode = () => {
  tests.runTests()
}

// Access results from hook
console.log(tests.testResults)
console.log(tests.testSummary)
console.log(tests.efficiencyMetrics)
console.log(tests.isRunning)
```

**Lines saved**: ~120 lines → ~25 lines

---

## Feedback Generation

### Before (page.tsx - Lines 1325-1620)

```typescript
const triggerPostInterviewDiscussion = async (testResults: TestResult[], summary: any) => {
  setIsGeneratingDiscussion(true)

  try {
    if (!selectedScenario) return

    // Calculate metrics
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
    const proactiveInteractions = interviewerQuestionsAnswered > 0 || partnerMessagesSent > 0 ? 1 : 0

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

    let comprehensiveFeedback = `Completed ${selectedScenario?.title} with ${summary.passed}/${summary.total} tests passing`
    let calculatedPerformanceScore = summary.passRate

    const efficiencyData = analyzeCodeEfficiency(code)
    setIsGeneratingFeedback(true)

    if (currentSessionId && user && code.trim()) {
      try {
        const conversationTranscript = [
          ...interviewerMessages.map(m => ({
            role: m.type === 'user' ? 'candidate' : 'interviewer',
            content: m.message,
            timestamp: m.timestamp
          })),
          ...chatMessages.map(m => ({
            role: m.type === 'user' ? 'candidate' : 'ai_partner',
            content: m.message,
            timestamp: m.timestamp
          }))
        ].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))

        const feedbackResponse = await fetch("/api/generate-feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            scenarioTitle: selectedScenario?.title,
            scenarioType: selectedScenario?.type,
            scenarioId: selectedScenario?.id,
            scenarioDifficulty: selectedScenario?.difficulty,
            scenarioPattern: (selectedScenario as any)?.pattern,
            testResults: testResults,
            language: selectedLanguage,
            timeSpent: elapsedTime,
            aiCollaborationMetrics,
            interactionMetrics,
            efficiencyMetrics: efficiencyData,
            conversationTranscript,
            sessionId: currentSessionId,
            userId: user.id,
          }),
        })

        if (feedbackResponse.ok) {
          const feedbackData = await feedbackResponse.json()
          comprehensiveFeedback = feedbackData.feedback || comprehensiveFeedback
          calculatedPerformanceScore = feedbackData.performanceScore || calculatedPerformanceScore
          if (feedbackData.constitutionalAICritique) {
            setConstitutionalAICritique(feedbackData.constitutionalAICritique)
          }
        }
      } catch (feedbackError) {
        console.error("Error generating feedback:", feedbackError)
        toast.warning("Feedback generation delayed")
      }
    }

    setComprehensiveFeedback(comprehensiveFeedback)
    setPerformanceScore(calculatedPerformanceScore)
    setIsGeneratingFeedback(false)

    // Trigger interviewer discussion... (another 50 lines)

  } catch (error) {
    console.error("Error:", error)
    toast.error("Failed to start discussion")
  } finally {
    setIsGeneratingDiscussion(false)
  }
}
```

### After (with feedback-generator service)

```typescript
import { generateFeedback, triggerPostInterviewDiscussion } from "@/lib/interview"

const handlePostInterview = async (testResults: TestResult[], summary: any) => {
  state.setIsGeneratingDiscussion(true)

  try {
    if (!state.selectedScenario) return

    // Generate feedback using service
    state.setIsGeneratingFeedback(true)
    const feedbackResult = await generateFeedback({
      code: state.code,
      scenario: state.selectedScenario,
      testResults,
      selectedLanguage: state.selectedLanguage,
      elapsedTime: state.elapsedTime,
      chatMessages: state.chatMessages,
      interviewerMessages: state.interviewerMessages,
      revealedHints: state.revealedHints,
      efficiencyMetrics: tests.efficiencyMetrics,
      sessionId: state.currentSessionId,
      userId: user?.id,
    })

    state.setComprehensiveFeedback(feedbackResult.feedback)
    state.setPerformanceScore(feedbackResult.performanceScore)
    state.setConstitutionalAICritique(feedbackResult.constitutionalAICritique)
    state.setIsGeneratingFeedback(false)

    // Trigger interviewer discussion
    const reply = await triggerPostInterviewDiscussion({
      scenario: state.selectedScenario,
      testSummary: summary,
      elapsedTime: state.elapsedTime,
      code: state.code,
      efficiencyMetrics: tests.efficiencyMetrics!,
      interviewerMessages: state.interviewerMessages,
      workspaceContext: state.workspaceContext,
      user,
      usageLimit,
    })

    if (reply) {
      state.setInterviewerMessages(prev => [...prev, { type: 'ai', message: reply }])
    }
  } catch (error) {
    console.error("Error:", error)
    toast.error("Failed to start discussion")
  } finally {
    state.setIsGeneratingDiscussion(false)
  }
}
```

**Lines saved**: ~300 lines → ~50 lines

---

## Auto-Save Logic

### Before (page.tsx - Lines 866-936)

```typescript
// Auto-save every 30 seconds
useEffect(() => {
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
        workspaceContext,
        timestamp: Date.now(),
      }

      if (firebaseUser) {
        const storageKey = `interview_autosave_${firebaseUser.uid}_${selectedScenario.id}`
        localStorage.setItem(storageKey, JSON.stringify(sessionData))

        if (currentSessionId) {
          await saveSessionState(currentSessionId, {
            code,
            selectedLanguage,
            elapsedTime,
            chatMessages,
            interviewerMessages,
            testResults,
          })
        }
      } else if (isGuestMode && guestId) {
        const storageKey = `interview_autosave_guest_${selectedScenario.id}`
        localStorage.setItem(storageKey, JSON.stringify(sessionData))

        if (currentSessionId) {
          await fetch('/api/guest-session', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: currentSessionId,
              guestId,
              sessionState: {
                code,
                language: selectedLanguage,
                elapsedTime,
                chatMessages: chatMessages.slice(-20),
                interviewerMessages: interviewerMessages.slice(-20),
                testResults: testResults.slice(-10),
              },
            }),
          })
        }
      }
    } catch (error) {
      console.error("Auto-save failed:", error)
    }
  }, 30000)

  return () => clearInterval(autoSaveInterval)
}, [isInterviewStarted, selectedScenario, firebaseUser, isGuestMode, guestId, code, chatMessages, interviewerMessages, selectedLanguage, elapsedTime, testResults, workspaceContext, currentSessionId])
```

### After (with session-manager service)

```typescript
import { autoSaveSession } from "@/lib/interview"

useEffect(() => {
  if (!state.isInterviewStarted || !state.selectedScenario) return

  const interval = setInterval(async () => {
    await autoSaveSession({
      sessionState: {
        scenarioId: state.selectedScenario!.id,
        code: state.code,
        chatMessages: state.chatMessages,
        interviewerMessages: state.interviewerMessages,
        selectedLanguage: state.selectedLanguage,
        elapsedTime: state.elapsedTime,
        testResults: state.testResults,
        workspaceContext: state.workspaceContext,
        timestamp: Date.now(),
      },
      currentSessionId: state.currentSessionId,
      firebaseUser,
      isGuestMode: state.isGuestMode,
      guestId: state.guestId,
    })
  }, 30000)

  return () => clearInterval(interval)
}, [state.isInterviewStarted, state.selectedScenario, /* ... deps */])
```

**Lines saved**: ~70 lines → ~25 lines

---

## Summary

### Total Lines Saved

| Section | Before | After | Saved |
|---------|--------|-------|-------|
| State declarations | ~130 | ~30 | ~100 |
| Session start | ~130 | ~40 | ~90 |
| Test execution | ~120 | ~25 | ~95 |
| Feedback generation | ~300 | ~50 | ~250 |
| Auto-save | ~70 | ~25 | ~45 |
| **TOTAL** | **~750** | **~170** | **~580 lines** |

### Benefits

1. **Readability**: Clear separation of concerns
2. **Testability**: Each hook/service can be tested in isolation
3. **Reusability**: Logic can be used in other pages
4. **Maintainability**: Bugs easier to find and fix
5. **Type Safety**: Full TypeScript support
6. **DRY**: No code duplication

### Migration Strategy

1. Create feature branch
2. Import hooks and services
3. Replace state declarations with hooks
4. Replace business logic with service calls
5. Test thoroughly
6. Create PR
7. Review and merge

The refactored code is cleaner, more maintainable, and follows React best practices.
