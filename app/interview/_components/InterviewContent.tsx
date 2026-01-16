"use client"

/**
 * InterviewContent Component
 *
 * Main content component that uses InterviewContext for state
 * and composed hooks for business logic. ~400 lines max.
 */

import { useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import nextDynamic from "next/dynamic"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { SignupPrompt } from "@/components/SignupPrompt"
import { useInterviewStore } from "@/lib/stores"
import { useInterview } from "../_providers"
import { useInterviewSession } from "../_hooks/useInterviewSession"
import { useInterviewChat } from "../_hooks/useInterviewChat"
import { useInterviewCode } from "../_hooks/useInterviewCode"
import { useInterviewHints } from "../_hooks/useInterviewHints"
import { useInterviewTimers } from "../_hooks/useInterviewTimers"
import { useInterviewPhase } from "../_hooks/useInterviewPhase"
import {
  InterviewTopBar,
  InterviewPanels,
  PostInterviewView,
  FeedbackLoadingState,
  FeedbackView,
} from "./index"

// Dynamic imports for heavy components
const ScenarioBrowser = nextDynamic(
  () => import("@/components/interview").then((mod) => ({ default: mod.ScenarioBrowser })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-gray-400">Loading scenarios...</div>
      </div>
    ),
  }
)

const CodeViewerSidePanel = nextDynamic(
  () =>
    import("@/components/CodeViewerSidePanel").then((mod) => ({
      default: mod.CodeViewerSidePanel,
    })),
  { ssr: false }
)

const CompanyPicker = nextDynamic(
  () => import("@/components/interview").then((mod) => ({ default: mod.CompanyPicker })),
  { ssr: false }
)

export function InterviewContent() {
  const router = useRouter()
  const ctx = useInterview()
  const { showCompanyPicker, setShowCompanyPicker, setTargetCompany } = useInterviewStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Use phase hook for phase detection
  const {
    getCurrentInterviewPhase,
    updateTrackerOnMessage,
    updateTrackerOnCodeChange,
    updateTrackerOnTestsRun,
    resetTracker,
  } = useInterviewPhase({
    showPostInterviewDiscussion: ctx.showPostInterviewDiscussion,
    showFeedback: ctx.showFeedback,
    testResultsCount: ctx.testResults.length,
    codeLength: ctx.code.length,
    interviewerMessagesCount: ctx.interviewerMessages.length,
    conversationTracker: ctx.conversationTracker,
    setConversationTracker: ctx.setConversationTracker,
  })

  // Use chat hook for messaging
  const { handleSendMessage, triggerPostInterviewDiscussion, triggerProactiveInterviewer } =
    useInterviewChat({
      selectedScenario: ctx.selectedScenario,
      currentSessionId: ctx.currentSessionId,
      code: ctx.code,
      interviewerMessages: ctx.interviewerMessages,
      chatMessages: ctx.chatMessages,
      interviewerInput: ctx.interviewerInput,
      chatInput: ctx.chatInput,
      testResults: ctx.testResults,
      consoleLogs: ctx.consoleLogs,
      efficiencyMetrics: ctx.efficiencyMetrics,
      conversationTracker: ctx.conversationTracker,
      showPostInterviewDiscussion: ctx.showPostInterviewDiscussion,
      recentNudgeTopics: ctx.recentNudgeTopics,
      elapsedTime: ctx.elapsedTime,
      workspaceContext: ctx.workspaceContext,
      setInterviewerMessages: ctx.setInterviewerMessages,
      setChatMessages: ctx.setChatMessages,
      setInterviewerInput: ctx.setInterviewerInput,
      setChatInput: ctx.setChatInput,
      setConversationTracker: ctx.setConversationTracker,
      setRecentNudgeTopics: ctx.setRecentNudgeTopics,
      setShowPostInterviewDiscussion: ctx.setShowPostInterviewDiscussion,
      setIsGeneratingDiscussion: ctx.setIsGeneratingDiscussion,
      getCurrentInterviewPhase,
    })

  // Use code hook for execution
  const { runCode, submitCode, submitSystemDesign } = useInterviewCode({
    selectedScenario: ctx.selectedScenario,
    currentSessionId: ctx.currentSessionId,
    code: ctx.code,
    selectedLanguage: ctx.selectedLanguage,
    starterCode: ctx.starterCode,
    protectedElements: ctx.protectedElements,
    interviewerMessages: ctx.interviewerMessages,
    chatMessages: ctx.chatMessages,
    testResults: ctx.testResults,
    efficiencyMetrics: ctx.efficiencyMetrics,
    conversationTracker: ctx.conversationTracker,
    elapsedTime: ctx.elapsedTime,
    revealedHints: ctx.revealedHints,
    isGuestMode: ctx.isGuestMode,
    guestId: ctx.guestId,
    setTestResults: ctx.setTestResults,
    setConsoleLogs: ctx.setConsoleLogs,
    setIsRunningTests: ctx.setIsRunningTests,
    setTestSummary: ctx.setTestSummary,
    setEfficiencyMetrics: ctx.setEfficiencyMetrics,
    setShowPostInterviewDiscussion: ctx.setShowPostInterviewDiscussion,
    setConversationTracker: ctx.setConversationTracker,
    triggerPostInterviewDiscussion,
  })

  // Use hints hook
  const { fetchRAGHints, submitHintFeedback, revealHint } = useInterviewHints({
    selectedScenario: ctx.selectedScenario,
    isInterviewStarted: ctx.isInterviewStarted,
    ragHints: ctx.ragHints,
    isLoadingHints: ctx.isLoadingHints,
    setRagHints: ctx.setRagHints,
    setIsLoadingHints: ctx.setIsLoadingHints,
    setRevealedAIHintIndices: ctx.setRevealedAIHintIndices,
    setHintFeedback: ctx.setHintFeedback,
  })

  // Use timers hook
  const { onCodeChange, formatTime } = useInterviewTimers({
    isInterviewStarted: ctx.isInterviewStarted,
    showPostInterviewDiscussion: ctx.showPostInterviewDiscussion,
    showFeedback: ctx.showFeedback,
    startTime: ctx.startTime,
    setStartTime: ctx.setStartTime,
    setElapsedTime: ctx.setElapsedTime,
    triggerProactiveInterviewer,
  })

  // Handle file upload
  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files
      if (!files || files.length === 0) return

      const newFiles: Array<{ path: string; content: string }> = []
      for (const file of Array.from(files)) {
        const content = await file.text()
        newFiles.push({ path: file.name, content })
      }
      ctx.setWorkspaceContext((prev) => [...prev, ...newFiles])
    },
    [ctx.setWorkspaceContext]
  )

  // Start interview
  const startInterview = useCallback(async () => {
    if (!ctx.selectedScenario) return

    ctx.setIsInterviewStarted(true)
    ctx.setStartTime(Date.now())
    ctx.setShowScenarioBrowser(false)

    // Initialize starter code if available
    const scenario = ctx.selectedScenario as any
    if (scenario.starterCode?.[ctx.selectedLanguage]) {
      const starter = scenario.starterCode[ctx.selectedLanguage]
      ctx.setCode(starter)
      ctx.setStarterCode(starter)
    }

    // Fetch hints
    fetchRAGHints()

    // Send initial interviewer message
    const initialMessage = `Welcome! I'm your AI interviewer today. Let's work through the "${ctx.selectedScenario.title}" problem together. Take a moment to read the problem, and when you're ready, walk me through your initial thoughts on how you'd approach this.`
    ctx.setInterviewerMessages([{ type: "ai", message: initialMessage }])
  }, [
    ctx.selectedScenario,
    ctx.selectedLanguage,
    ctx.setIsInterviewStarted,
    ctx.setStartTime,
    ctx.setShowScenarioBrowser,
    ctx.setCode,
    ctx.setStarterCode,
    ctx.setInterviewerMessages,
    fetchRAGHints,
  ])

  // Reset interview
  const resetInterview = useCallback(() => {
    ctx.setSelectedScenario(null)
    ctx.setIsInterviewStarted(false)
    ctx.setShowScenarioBrowser(true)
    ctx.setShowFeedback(false)
    ctx.setShowPostInterviewDiscussion(false)
    ctx.setInterviewerMessages([])
    ctx.setChatMessages([])
    ctx.setCode("")
    ctx.setTestResults([])
    ctx.setElapsedTime(0)
    ctx.setStartTime(null)
    resetTracker()
  }, [ctx, resetTracker])

  // Proceed to final feedback
  const proceedToFinalFeedback = useCallback(async () => {
    ctx.setIsGeneratingFeedback(true)
    ctx.setShowFeedback(true)
    ctx.setShowPostInterviewDiscussion(false)

    try {
      const response = await fetch("/api/generate-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: ctx.currentSessionId,
          scenarioId: ctx.selectedScenario?.id,
          code: ctx.code,
          testResults: ctx.testResults,
          interviewerMessages: ctx.interviewerMessages,
          elapsedTime: ctx.elapsedTime,
        }),
      })

      const data = await response.json()

      if (data.feedback) {
        ctx.setComprehensiveFeedback(data.feedback)
        ctx.setPerformanceScore(data.score || null)
        ctx.setTechnicalScore(data.technicalScore || null)
        ctx.setScoreBreakdown(data.breakdown || null)
      }
    } catch (error) {
      console.error("Error generating feedback:", error)
    } finally {
      ctx.setIsGeneratingFeedback(false)
    }
  }, [ctx])

  // Warn before leaving
  useEffect(() => {
    const shouldWarn = (ctx.isInterviewStarted && !ctx.showFeedback) || ctx.isGeneratingDiscussion
    if (!shouldWarn) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = "You have an active interview session. Are you sure you want to leave?"
      return e.returnValue
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [ctx.isInterviewStarted, ctx.showFeedback, ctx.isGeneratingDiscussion])

  // Loading state
  if (ctx.isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-xl text-white">Loading...</div>
      </main>
    )
  }

  const isInterviewMode =
    !ctx.showScenarioBrowser && (ctx.isInterviewStarted || ctx.selectedScenario !== null)
  const isResultView = ctx.showFeedback || ctx.showPostInterviewDiscussion

  return (
    <main className="min-h-screen bg-black">
      {!isInterviewMode && <Header />}

      {/* Guest Mode Banner */}
      {ctx.isGuestMode && !ctx.showFeedback && (
        <div className="from-accent/20 border-accent/30 fixed top-[64px] right-0 left-0 z-40 border-b bg-gradient-to-r to-purple-600/20 backdrop-blur-sm">
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

      {/* Scenario Browser */}
      {ctx.showScenarioBrowser && (
        <ScenarioBrowser
          onStartInterview={async (scenario) => {
            ctx.setSelectedScenario(scenario)
            await startInterview()
          }}
          usageLimit={ctx.usageLimit}
          completedProblems={ctx.completedProblems}
          hasGuestBanner={ctx.isGuestMode && !ctx.showFeedback}
        />
      )}

      {/* Interview Interface */}
      {!ctx.showScenarioBrowser && (
        <section
          className={`flex flex-col bg-gradient-to-b from-gray-900 to-black pt-2 pb-2 ${
            isResultView
              ? "min-h-screen overflow-x-hidden overflow-y-auto"
              : "h-screen overflow-hidden"
          }`}
        >
          <div
            className={`container mx-auto flex flex-1 flex-col px-2 ${isResultView ? "overflow-visible" : "overflow-hidden"}`}
          >
            <div
              className={`mx-auto flex w-full flex-1 flex-col gap-1 ${isResultView ? "overflow-visible" : "overflow-hidden"}`}
            >
              <InterviewTopBar />

              {/* Main Content */}
              {!ctx.showFeedback && !ctx.showPostInterviewDiscussion ? (
                <InterviewPanels
                  submitHintFeedback={submitHintFeedback}
                  handleFileUpload={handleFileUpload}
                  handleSendMessage={handleSendMessage}
                  runCode={runCode}
                  startInterview={startInterview}
                  toggleVoiceRecording={ctx.toggleVoiceRecording}
                  fileInputRef={fileInputRef}
                  chatEndRef={ctx.chatEndRef}
                  editorContainerRef={ctx.editorContainerRef}
                  isRecordingPartner={false}
                  isRecordingInterviewer={ctx.isRecordingInterviewer}
                />
              ) : ctx.showPostInterviewDiscussion ? (
                <PostInterviewView
                  handleSendMessage={handleSendMessage}
                  proceedToFinalFeedback={proceedToFinalFeedback}
                />
              ) : ctx.isGeneratingFeedback ? (
                <FeedbackLoadingState onGoToDashboard={() => router.push("/dashboard")} />
              ) : (
                <FeedbackView
                  resetInterview={resetInterview}
                  elapsedTime={ctx.elapsedTime}
                  isFromRoadmap={ctx.isFromRoadmap}
                />
              )}
            </div>
          </div>
        </section>
      )}

      {/* Guest Signup Prompt */}
      {ctx.isGuestMode &&
        ctx.showFeedback &&
        ctx.performanceScore !== null &&
        ctx.showSignupPrompt && (
          <SignupPrompt
            score={ctx.performanceScore}
            sessionId={ctx.currentSessionId || ""}
            scenarioTitle={ctx.selectedScenario?.title || ""}
            feedbackSummary={ctx.comprehensiveFeedback}
            onDismiss={() => ctx.setShowSignupPrompt(false)}
          />
        )}

      {/* Code Viewer Side Panel */}
      {ctx.isCodeViewerOpen && ctx.selectedFile && (
        <CodeViewerSidePanel
          key={ctx.selectedFile.path}
          isOpen={true}
          onClose={() => {
            ctx.setIsCodeViewerOpen(false)
            ctx.setSelectedFile(null)
          }}
          fileName={ctx.selectedFile.path}
          content={ctx.selectedFile.content}
        />
      )}

      {/* Company Picker */}
      {ctx.selectedScenario && (
        <CompanyPicker
          open={showCompanyPicker}
          onClose={() => setShowCompanyPicker(false)}
          onSelect={(company) => {
            setShowCompanyPicker(false)
            setTargetCompany(company)
            startInterview()
          }}
          scenarioCompanies={ctx.selectedScenario.companies || []}
        />
      )}

      {/* Close Confirmation Dialog */}
      <AlertDialog open={ctx.showCloseDialog} onOpenChange={ctx.setShowCloseDialog}>
        <AlertDialogContent className="border-gray-700 bg-gray-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              You want to close this interview?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              If you close now, your progress will be saved but you'll exit the interview session.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-600 bg-gray-800 text-white hover:bg-gray-700">
              Stay
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                ctx.setShowCloseDialog(false)
                resetInterview()
              }}
              className="bg-[#00d9ff] text-white hover:bg-[#00d9ff]/80"
            >
              Close Interview
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {!isInterviewMode && <Footer />}
    </main>
  )
}
