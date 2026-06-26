# Interview Page Refactoring Guide

## Quick Reference

This guide explains the refactored interview page architecture and how to use the new hooks and services.

## File Locations

### Hooks (State Management)
- `/lib/hooks/useInterviewState.ts` - Core interview state (code, timer, messages, tests)
- `/lib/hooks/useInterviewUI.ts` - UI state (panels, dialogs, modes)
- `/lib/hooks/useTestExecution.ts` - Test execution and code analysis

### Services (Business Logic)
- `/lib/interview/session-manager.ts` - Session lifecycle management
- `/lib/interview/feedback-generator.ts` - AI feedback generation

### Imports
```typescript
import { useInterviewState, useInterviewUI, useTestExecution } from "@/lib/hooks"
import { startInterviewSession, generateFeedback, autoSaveSession } from "@/lib/interview"
```

## Hook Usage Examples

### useInterviewState

```typescript
import { useInterviewState } from "@/lib/hooks"

function InterviewPage() {
  const { user, firebaseUser } = useAuth()

  const state = useInterviewState({
    firebaseUser,
    userId: user?.id || null,
  })

  // Access state
  console.log(state.code)
  console.log(state.isInterviewStarted)
  console.log(state.elapsedTime) // Auto-updates every second

  // Update state
  state.setCode("function solution() { ... }")
  state.setSelectedLanguage("python")
  state.setIsInterviewStarted(true)

  // Reset everything
  const handleClose = () => {
    state.resetAllState()
  }
}
```

### useInterviewUI

```typescript
import { useInterviewUI } from "@/lib/hooks"

function InterviewPage() {
  const ui = useInterviewUI({
    isInterviewStarted: state.isInterviewStarted,
  })

  // Toggle modes
  const toggleFocusMode = () => ui.setFocusMode(!ui.focusMode)
  const toggleCalmMode = () => ui.setCalmMode(!ui.calmMode)

  // Mobile panel switching
  const showEditor = () => ui.setActivePanel("editor")

  // Dialogs
  const openCodeViewer = (file) => {
    ui.setSelectedFile(file)
    ui.setIsCodeViewerOpen(true)
  }
}
```

### useTestExecution

```typescript
import { useTestExecution } from "@/lib/hooks"

function InterviewPage() {
  const tests = useTestExecution({
    selectedScenario: state.selectedScenario,
    code: state.code,
    selectedLanguage: state.selectedLanguage,
    onTestComplete: (results, summary) => {
      console.log(`${summary.passed}/${summary.total} tests passed`)
      // Trigger post-interview discussion
    },
    onTestError: (error) => {
      toast.error(`Execution error: ${error}`)
    },
    playSound: (type) => {
      // Play sound effect
    },
  })

  // Run tests
  const handleRunTests = () => {
    tests.runTests()
  }

  // Access results
  console.log(tests.testResults)
  console.log(tests.efficiencyMetrics)
  console.log(tests.isRunning)
}
```

## Service Usage Examples

### Session Manager

```typescript
import { startInterviewSession, autoSaveSession, restoreSession } from "@/lib/interview"

// Start session
const startInterview = async (scenario: Scenario) => {
  const result = await startInterviewSession({
    scenario,
    userId: user?.id,
    firebaseUser,
    isGuestMode,
    guestId,
    usageLimit,
    onSessionCreated: (sessionId) => {
      state.setCurrentSessionId(sessionId)
    },
  })

  if (result.shouldRedirect) {
    router.push(result.redirectUrl!)
    return
  }

  if (result.success) {
    state.setIsInterviewStarted(true)
    ui.setShowScenarioBrowser(false)
  }
}

// Auto-save (call every 30 seconds)
useEffect(() => {
  if (!state.isInterviewStarted || !state.selectedScenario) return

  const interval = setInterval(async () => {
    await autoSaveSession({
      sessionState: {
        scenarioId: state.selectedScenario.id,
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
}, [state.isInterviewStarted, state.selectedScenario, /* ... */])

// Restore session
useEffect(() => {
  const loadSession = async () => {
    const restored = await restoreSession({
      scenarioId: searchParams.get("scenario")!,
      sessionId: searchParams.get("session"),
      firebaseUser,
      isGuestMode: state.isGuestMode,
      guestId: state.guestId,
    })

    if (restored) {
      state.setCode(restored.code)
      state.setChatMessages(restored.chatMessages)
      state.setInterviewerMessages(restored.interviewerMessages)
      // ... set other state
    }
  }

  loadSession()
}, [/* deps */])
```

### Feedback Generator

```typescript
import { generateFeedback, triggerPostInterviewDiscussion } from "@/lib/interview"

// Generate feedback after tests complete
const handleTestComplete = async (results, summary) => {
  state.setShowPostInterviewDiscussion(true)
  state.setIsGeneratingFeedback(true)

  try {
    // Generate AI feedback
    const feedbackResult = await generateFeedback({
      code: state.code,
      scenario: state.selectedScenario!,
      testResults: results,
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

    // Trigger interviewer discussion
    const reply = await triggerPostInterviewDiscussion({
      scenario: state.selectedScenario!,
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
      state.setInterviewerMessages((prev) => [
        ...prev,
        { type: "ai", message: reply },
      ])
    }
  } finally {
    state.setIsGeneratingFeedback(false)
  }
}
```

## State Structure Reference

### useInterviewState Returns

```typescript
{
  // Session
  selectedScenario: Scenario | null
  setSelectedScenario: (scenario: Scenario | null) => void
  isInterviewStarted: boolean
  setIsInterviewStarted: (started: boolean) => void
  currentSessionId: string | null
  setCurrentSessionId: (id: string | null) => void

  // Code
  code: string
  setCode: (code: string) => void
  selectedLanguage: "javascript" | "typescript" | "python" | ...
  setSelectedLanguage: (lang) => void
  starterCode: string
  setStarterCode: (code: string) => void
  protectedElements: any
  setProtectedElements: (elements: any) => void

  // Timer (auto-updates)
  startTime: number | null
  setStartTime: (time: number | null) => void
  elapsedTime: number
  setElapsedTime: (time: number) => void

  // Chat
  interviewerMessages: ChatMessage[]
  setInterviewerMessages: Dispatch<SetStateAction<ChatMessage[]>>
  chatMessages: ChatMessage[]
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>
  chatInput: string
  setChatInput: (input: string) => void
  interviewerInput: string
  setInterviewerInput: (input: string) => void
  isLoadingChat: boolean
  setIsLoadingChat: (loading: boolean) => void
  isLoadingInterviewer: boolean
  setIsLoadingInterviewer: (loading: boolean) => void

  // Tests
  testResults: TestResult[]
  setTestResults: (results: TestResult[]) => void
  consoleLogs: Array<{ type: string; message: string; timestamp: number }>
  setConsoleLogs: (logs) => void
  isRunningTests: boolean
  setIsRunningTests: (running: boolean) => void
  testSummary: { total: number; passed: number; failed: number; passRate: number }
  setTestSummary: (summary) => void
  efficiencyMetrics: EfficiencyMetrics | null
  setEfficiencyMetrics: (metrics: EfficiencyMetrics | null) => void

  // Feedback
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

  // Hints
  revealedHints: number
  setRevealedHints: (hints: number) => void
  revealedHintIndices: Set<number>
  setRevealedHintIndices: (indices: Set<number>) => void
  ragHints: Array<{ level: number; hint: string }>
  setRagHints: (hints) => void
  isLoadingHints: boolean
  setIsLoadingHints: (loading: boolean) => void

  // Workspace
  workspaceContext: Array<{ path: string; content: string; description?: string }>
  setWorkspaceContext: (context) => void

  // Guest mode
  isGuestMode: boolean
  setIsGuestMode: (guest: boolean) => void
  guestId: string | null
  setGuestId: (id: string | null) => void

  // Refs (for performance tracking)
  lastCodeHashRef: MutableRefObject<string>
  previousCodeRef: MutableRefObject<string>
  lastCodeChangeRef: MutableRefObject<number>
  lastInterviewerMessageRef: MutableRefObject<number>
  hasTriggeredInactivityRef: MutableRefObject<boolean>
  hasTriggeredSilenceRef: MutableRefObject<boolean>

  // Utility
  completedProblems: string[]
  setCompletedProblems: (problems: string[]) => void
  resetAllState: () => void
}
```

### useInterviewUI Returns

```typescript
{
  // Views
  showScenarioBrowser: boolean
  setShowScenarioBrowser: (show: boolean) => void

  // Dialogs
  showCloseDialog: boolean
  setShowCloseDialog: (show: boolean) => void
  showSignupPrompt: boolean
  setShowSignupPrompt: (show: boolean) => void
  showCodeInDiscussion: boolean
  setShowCodeInDiscussion: (show: boolean) => void

  // Code viewer
  selectedFile: { path: string; content: string } | null
  setSelectedFile: (file) => void
  isCodeViewerOpen: boolean
  setIsCodeViewerOpen: (open: boolean) => void

  // AI
  showAITips: boolean
  setShowAITips: (show: boolean) => void
  isAIPartnerExpanded: boolean
  setIsAIPartnerExpanded: (expanded: boolean) => void

  // Accessibility (auto-manages document CSS)
  focusMode: boolean
  setFocusMode: (mode: boolean) => void
  calmMode: boolean
  setCalmMode: (mode: boolean) => void
  hideTimer: boolean
  setHideTimer: (hide: boolean) => void
  showProblemPeek: boolean
  setShowProblemPeek: (show: boolean) => void

  // Mobile
  activePanel: "problem" | "editor" | "chat"
  setActivePanel: (panel) => void
}
```

### useTestExecution Returns

```typescript
{
  isRunning: boolean
  testResults: TestResult[]
  testSummary: { total: number; passed: number; failed: number; passRate: number }
  consoleLogs: Array<{ type: string; message: string; timestamp: number }>
  efficiencyMetrics: EfficiencyMetrics | null
  runTests: () => Promise<void>
  analyzeEfficiency: (code: string) => EfficiencyMetrics
}
```

## Benefits

### Before Refactoring
- 4,063 lines in a single file
- 50+ useState calls scattered throughout
- Complex state dependencies
- Hard to test
- Difficult to navigate

### After Refactoring
- State logic: ~765 lines across 3 hooks
- Business logic: ~827 lines in 2 services
- Clear separation of concerns
- Easy to test each module
- Reusable across pages

## Migration Checklist

When refactoring the main page.tsx to use these hooks:

- [ ] Replace all useState calls with hook usage
- [ ] Move session logic to session-manager service calls
- [ ] Move feedback logic to feedback-generator service calls
- [ ] Extract JSX into components (InterviewLayout, SessionControls, etc.)
- [ ] Test all functionality still works
- [ ] Verify auto-save/restore works
- [ ] Check timer updates correctly
- [ ] Confirm tests run properly
- [ ] Validate feedback generation
- [ ] Test guest mode
- [ ] Test accessibility features (focus mode, calm mode)

## Best Practices

1. **Use hooks for state**: Never bypass the hooks to access raw state
2. **Use services for logic**: Don't duplicate business logic in components
3. **Keep callbacks simple**: Components should just call hook methods
4. **Leverage TypeScript**: All hooks and services are fully typed
5. **Test in isolation**: Write unit tests for each hook and service

## Troubleshooting

### Timer not updating
- Ensure `isInterviewStarted` is true
- Ensure `startTime` is set
- Check that `showFeedback` is false

### Auto-save not working
- Verify `isInterviewStarted` and `selectedScenario` are set
- Check firebaseUser or guestId is available
- Look for errors in console

### Tests not running
- Ensure `selectedScenario` is set
- Verify code is not empty
- Check API endpoint is working

## Support

For questions or issues with the refactored code:
1. Check this guide first
2. Review the JSDoc comments in each file
3. Look at the REFACTORING_TRACK2_SUMMARY.md for detailed information
4. Check existing tests for usage examples
