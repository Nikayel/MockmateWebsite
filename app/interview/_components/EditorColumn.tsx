"use client"

import { memo, type RefObject } from "react"
import { Code, PlayCircle, RotateCcw } from "lucide-react"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ErrorBoundary } from "@/components/error-boundary"
import { type CodeMirrorEditorRef } from "@/components/editor"
import {
  type ConsoleOutput,
  type TestResult,
  type TestSummary,
} from "@/components/interview/CodeConsole"
import { GradingCriteriaTooltip } from "@/components/GradingCriteria"
import { cn } from "@/lib/utils"
import {
  useGuidedLabComplete,
  useGuidedLabStore,
  useRevealedTestSuites,
} from "@/lib/stores/guided-lab-store"
import type { Scenario } from "@/lib/scenarios"
import type { PackRunView } from "@/lib/workspace-execution"
import type { EditorLanguage, WorkspaceContextFile } from "../_types"
import {
  getWorkspaceFileRoleStyle,
  hasWorkspaceFileEdits,
  isWorkspaceScenario,
} from "../_utils/workspace"
import { LazyCodeMirrorEditor } from "./LazyCodeMirrorEditor"
import { ConsoleOutput as ConsoleOutputPanel } from "./_sub/ConsoleOutput"
import { TestResultsPanel } from "./_sub/TestResultsPanel"
import { SparraPartnerWidget, type PartnerChatMessage } from "./SparraPartnerWidget"

interface EditorColumnProps {
  activePanel: "problem" | "editor" | "chat"
  selectedScenario: Scenario | null
  activeWorkspaceFile: WorkspaceContextFile | null | undefined
  selectedLanguage: EditorLanguage
  editorLanguage: string
  code: string
  onCodeChange: (code: string) => void
  isInterviewStarted: boolean
  showScenarioBrowser: boolean
  showFeedback: boolean
  showPostInterviewDiscussion: boolean
  isActiveWorkspaceFileEditable: boolean
  onStartInterview: () => void
  editorConsoleOutputs: ConsoleOutput[]
  testResults: TestResult[]
  testSummary: TestSummary
  /** Set only for stdout-oracle packs, whose console shows real terminal output. */
  packRun: PackRunView | null
  isRunningTests: boolean
  onClearConsole: () => void
  onSubmitSystemDesign: () => void
  onRunCode: () => void
  onSubmitCode: () => void
  onSelectedLanguageChange: (language: EditorLanguage) => void
  onResetActiveFile?: () => void
  onResetWorkspace?: () => void
  isAIPartnerExpanded: boolean
  onAIPartnerExpandedChange: (expanded: boolean) => void
  chatMessages: PartnerChatMessage[]
  chatEndRef: RefObject<HTMLDivElement | null>
  chatInput: string
  onChatInputChange: (value: string) => void
  isLoadingChat: boolean
  onSendPartnerMessage: () => void
  workspaceContext?: WorkspaceContextFile[]
  editorRef?: RefObject<CodeMirrorEditorRef | null>
  onGoToLine?: (lineNum: number) => void
}

export const EditorColumn = memo(function EditorColumn({
  activePanel,
  selectedScenario,
  activeWorkspaceFile,
  selectedLanguage,
  editorLanguage,
  code,
  onCodeChange,
  isInterviewStarted,
  showScenarioBrowser,
  showFeedback,
  showPostInterviewDiscussion,
  isActiveWorkspaceFileEditable,
  onStartInterview,
  editorConsoleOutputs,
  testResults,
  testSummary,
  packRun,
  isRunningTests,
  onClearConsole,
  onSubmitSystemDesign,
  onRunCode,
  onSubmitCode,
  onSelectedLanguageChange,
  onResetActiveFile,
  onResetWorkspace,
  isAIPartnerExpanded,
  onAIPartnerExpandedChange,
  chatMessages,
  chatEndRef,
  chatInput,
  onChatInputChange,
  isLoadingChat,
  onSendPartnerMessage,
  workspaceContext = [],
  editorRef,
  onGoToLine,
}: EditorColumnProps) {
  const isWorkspace = isWorkspaceScenario(selectedScenario) && workspaceContext.length > 0
  const activeRoleStyle = activeWorkspaceFile
    ? getWorkspaceFileRoleStyle(activeWorkspaceFile.role)
    : null
  const ActiveRoleIcon = activeRoleStyle?.Icon

  // Guided labs reveal a later bug's test suite only once its milestone unlocks,
  // so the candidate discovers Bug 2 by verifying rather than seeing it up front.
  // An empty revealed set means "no guided lab active → show everything".
  const revealedSuites = useRevealedTestSuites()
  const guideFiltered = revealedSuites.length > 0
  const visibleTestResults = guideFiltered
    ? testResults.filter((result) =>
        revealedSuites.includes(String((result as { input?: unknown }).input ?? ""))
      )
    : testResults
  const visiblePassed = visibleTestResults.filter((result) => result.passed).length
  const visibleTestSummary = guideFiltered
    ? {
        total: visibleTestResults.length,
        passed: visiblePassed,
        failed: visibleTestResults.length - visiblePassed,
        passRate: visibleTestResults.length
          ? Math.round((visiblePassed / visibleTestResults.length) * 100)
          : 0,
      }
    : testSummary

  // Guided-lab reveal signpost: once a later suite is unlocked (more than one
  // suite revealed) and some suite passes while another fails, the failing row
  // is the next bug — not a regression. Tell the learner so the "discovery"
  // moment doesn't read as self-inflicted breakage.
  const revealNotice = (() => {
    if (!guideFiltered || revealedSuites.length <= 1) return undefined
    const suitePassed = new Map<string, boolean>()
    for (const result of visibleTestResults) {
      const suite = String((result as { input?: unknown }).input ?? "")
      suitePassed.set(suite, (suitePassed.get(suite) ?? true) && result.passed)
    }
    const states = Array.from(suitePassed.values())
    const hasPassingSuite = states.some(Boolean)
    const hasFailingSuite = states.some((ok) => !ok)
    return hasPassingSuite && hasFailingSuite
      ? "A new check unlocked when you fixed the first bug — and it's already failing. That's the next bug to fix, not a regression you caused."
      : undefined
  })()

  // Block Submit while a guided lab for this scenario is unfinished, so the user
  // can't submit before discovering and fixing the later bug.
  const guidedLabComplete = useGuidedLabComplete()
  const guidedLabActiveForScenario = useGuidedLabStore(
    (state) => Boolean(state.config) && state.scenarioId === selectedScenario?.id
  )
  const guidedLabBlocksSubmit = guidedLabActiveForScenario && !guidedLabComplete

  const editorSurface = (
    <>
      <ErrorBoundary>
        <LazyCodeMirrorEditor
          ref={editorRef}
          height="100%"
          language={editorLanguage}
          value={code}
          onChange={onCodeChange}
          readOnly={
            !isInterviewStarted ||
            showFeedback ||
            (isWorkspaceScenario(selectedScenario) && !isActiveWorkspaceFileEditable)
          }
        />
      </ErrorBoundary>
      {selectedScenario && !isInterviewStarted && !showScenarioBrowser && (
        <div className="bg-background/80 absolute inset-0 z-10 flex items-center justify-center overflow-y-auto p-4 backdrop-blur-sm">
          <div className="max-h-full max-w-md p-2 text-center sm:p-6">
            <div className="bg-accent/20 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
              <PlayCircle className="text-accent h-8 w-8" />
            </div>
            <h3 className="text-foreground mb-2 text-xl font-bold">Ready to Start?</h3>
            <p className="text-muted-foreground mb-4 text-sm">
              Review the problem on the left, then start your interview when ready. The timer will
              begin once you start.
            </p>
            <Button
              onClick={onStartInterview}
              className="bg-accent hover:bg-accent/80 text-accent-foreground px-8 py-3 text-base font-semibold"
            >
              <PlayCircle className="mr-2 h-5 w-5" />
              Start Interview
            </Button>
            <p className="text-muted-foreground mt-3 text-xs">
              Estimated time: {selectedScenario.estimatedTime || 30} minutes
            </p>
          </div>
        </div>
      )}
    </>
  )

  return (
    <Card
      className={`editor-panel-card glass-effect border-border bg-card/50 relative order-2 h-full flex-col gap-0 overflow-hidden py-0 ${
        activePanel === "editor" ? "flex" : "hidden lg:flex"
      }`}
    >
      <CardHeader className="flex-shrink-0 px-0 pt-0 pb-2">
        {isWorkspace ? (
          <div className="border-border bg-card/80 flex w-full items-center justify-between border-b pr-4">
            <div className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2">
              {activeWorkspaceFile && activeRoleStyle && ActiveRoleIcon ? (
                <>
                  <ActiveRoleIcon
                    className={cn("h-3.5 w-3.5 shrink-0", activeRoleStyle.iconColorActive)}
                    aria-hidden="true"
                  />
                  <span className="text-foreground truncate text-xs">
                    {activeWorkspaceFile.path}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded border px-1.5 py-0.5 text-[11px] leading-none",
                      activeRoleStyle.badgeClass
                    )}
                  >
                    {activeRoleStyle.label}
                  </span>
                  {hasWorkspaceFileEdits(activeWorkspaceFile) && (
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300"
                      title="Unsaved edit"
                      aria-label="Unsaved edit"
                    />
                  )}
                </>
              ) : (
                <span className="text-muted-foreground truncate text-xs">Workspace files</span>
              )}
            </div>
            <div className="flex items-center gap-2 pl-4">
              {activeWorkspaceFile?.role === "editable" && onResetActiveFile && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onResetActiveFile}
                  className="border-border bg-card text-muted-foreground hover:bg-muted h-8 px-2 text-xs"
                  title="Reset active file"
                  aria-label="Reset active file"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              )}
              {onResetWorkspace && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onResetWorkspace}
                  className="border-border bg-card text-muted-foreground hover:bg-muted h-8 px-2 text-xs"
                  title="Reset workspace"
                  aria-label="Reset workspace"
                >
                  <RotateCcw className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                  All
                </Button>
              )}
              <GradingCriteriaTooltip />
              {isInterviewStarted && (
                <div className="flex items-center space-x-1">
                  <div className="bg-accent h-1.5 w-1.5 animate-pulse rounded-full"></div>
                  <span className="text-accent text-xs">LIVE</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <CardTitle className="text-foreground flex w-full items-center justify-between text-xs">
              <div className="flex items-center space-x-1">
                <Code className="text-accent h-3 w-3" />
                {selectedScenario?.type === "system-design" ? (
                  <span>Design Notes</span>
                ) : (
                  <span>
                    {selectedScenario?.title.toLowerCase().replace(/\s+/g, "-").slice(0, 20)}.
                    {selectedLanguage === "javascript"
                      ? "js"
                      : selectedLanguage === "typescript"
                        ? "ts"
                        : "py"}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <GradingCriteriaTooltip />
                {isInterviewStarted && (
                  <div className="flex items-center space-x-1">
                    <div className="bg-accent h-1.5 w-1.5 animate-pulse rounded-full"></div>
                    <span className="text-accent text-xs">LIVE</span>
                  </div>
                )}
              </div>
            </CardTitle>
          </div>
        )}
      </CardHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-3">
        {/* The file tree lives in the problem column now, so the editor keeps the
            whole width of the one column the candidate types in. */}
        <div className="border-border relative min-h-0 flex-1 overflow-auto rounded border">
          {editorSurface}
        </div>

        {isInterviewStarted && selectedScenario?.type !== "system-design" && (
          <ConsoleOutputPanel
            editorConsoleOutputs={editorConsoleOutputs}
            testResults={visibleTestResults}
            testSummary={visibleTestSummary}
            packRun={packRun}
            isRunningTests={isRunningTests}
            onClearConsole={onClearConsole}
            onGoToLine={onGoToLine}
            notice={revealNotice}
          />
        )}

        <TestResultsPanel
          selectedScenario={selectedScenario}
          selectedLanguage={selectedLanguage}
          isRunningTests={isRunningTests}
          showFeedback={showFeedback}
          showPostInterviewDiscussion={showPostInterviewDiscussion}
          onSubmitSystemDesign={onSubmitSystemDesign}
          onRunCode={onRunCode}
          onSubmitCode={onSubmitCode}
          onSelectedLanguageChange={onSelectedLanguageChange}
          guidedLabBlocksSubmit={guidedLabBlocksSubmit}
        />
      </div>

      {selectedScenario && selectedScenario.type !== "dsa" && (
        <SparraPartnerWidget
          expanded={isAIPartnerExpanded}
          onExpandedChange={onAIPartnerExpandedChange}
          messages={chatMessages}
          messagesEndRef={chatEndRef}
          input={chatInput}
          onInputChange={onChatInputChange}
          isLoading={isLoadingChat}
          onSendMessage={onSendPartnerMessage}
          isDebuggingScenario={selectedScenario.type === "bugfix"}
        />
      )}
    </Card>
  )
})
