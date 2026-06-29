"use client"

import { memo, useState, type RefObject } from "react"
import {
  Bot,
  ChevronDown,
  ChevronUp,
  Code,
  PanelLeft,
  PlayCircle,
  RotateCcw,
  Send,
} from "lucide-react"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { ErrorBoundary } from "@/components/error-boundary"
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer"
import { CodeMirrorEditor, type CodeMirrorEditorRef } from "@/components/editor"
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
import type { EditorLanguage, WorkspaceContextFile } from "../_types"
import {
  getWorkspaceFileRoleStyle,
  hasWorkspaceFileEdits,
  isWorkspaceScenario,
} from "../_utils/workspace"
import { FileTreeSidebar } from "./FileTreeSidebar"
import { ConsoleOutput as ConsoleOutputPanel } from "./_sub/ConsoleOutput"
import { TestResultsPanel } from "./_sub/TestResultsPanel"

interface MiniChatMessage {
  type: "user" | "ai"
  message: string
}

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
  chatMessages: MiniChatMessage[]
  chatEndRef: RefObject<HTMLDivElement | null>
  chatInput: string
  onChatInputChange: (value: string) => void
  isLoadingChat: boolean
  onSendPartnerMessage: () => void
  workspaceContext?: WorkspaceContextFile[]
  onFileSelect?: (file: WorkspaceContextFile) => void
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
  onFileSelect,
  editorRef,
  onGoToLine,
}: EditorColumnProps) {
  const [showFilesDrawer, setShowFilesDrawer] = useState(false)
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

  const handleFileSelect = (file: WorkspaceContextFile) => {
    onFileSelect?.(file)
    setShowFilesDrawer(false)
  }

  const editorSurface = (
    <>
      <ErrorBoundary>
        <CodeMirrorEditor
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
      className={`editor-panel-card glass-effect border-border bg-card/50 order-2 h-full flex-col gap-0 overflow-hidden py-0 ${
        activePanel === "editor" ? "flex" : "hidden lg:flex"
      }`}
    >
      <CardHeader className="flex-shrink-0 px-0 pt-0 pb-2">
        {isWorkspace ? (
          <div className="border-border bg-card/80 flex w-full items-center justify-between border-b pr-4">
            <div className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowFilesDrawer((open) => !open)}
                className="border-border bg-card text-muted-foreground hover:bg-muted h-8 px-2 text-xs md:hidden"
                title="Toggle file list"
                aria-label="Toggle file list"
                aria-expanded={showFilesDrawer}
              >
                <PanelLeft className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
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
        {isWorkspace ? (
          <div
            className="border-border relative min-h-0 flex-1 overflow-hidden rounded border"
            data-bugfix-tour={selectedScenario?.type === "bugfix" ? "workspace-files" : undefined}
          >
            <ResizablePanelGroup direction="horizontal" className="h-full">
              <ResizablePanel
                defaultSize={24}
                minSize={14}
                maxSize={42}
                className="hidden md:block"
              >
                <FileTreeSidebar
                  files={workspaceContext}
                  activePath={activeWorkspaceFile?.path}
                  onFileSelect={handleFileSelect}
                />
              </ResizablePanel>
              <ResizableHandle withHandle className="hidden md:flex" />
              <ResizablePanel className="min-h-0">
                <div className="relative h-full min-h-0 overflow-auto">{editorSurface}</div>
              </ResizablePanel>
            </ResizablePanelGroup>
            {showFilesDrawer && (
              <div className="absolute inset-0 z-20 flex md:hidden">
                <div className="bg-card border-border w-3/4 max-w-xs overflow-y-auto border-r shadow-xl">
                  <FileTreeSidebar
                    files={workspaceContext}
                    activePath={activeWorkspaceFile?.path}
                    onFileSelect={handleFileSelect}
                  />
                </div>
                <button
                  type="button"
                  className="bg-background/60 flex-1"
                  aria-label="Close file list"
                  onClick={() => setShowFilesDrawer(false)}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="border-border relative min-h-0 flex-1 overflow-auto rounded border">
            {editorSurface}
          </div>
        )}

        {isInterviewStarted && selectedScenario?.type !== "system-design" && (
          <ConsoleOutputPanel
            editorConsoleOutputs={editorConsoleOutputs}
            testResults={visibleTestResults}
            testSummary={visibleTestSummary}
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

        {selectedScenario && selectedScenario.type !== "dsa" && (
          <div className="border-border flex-shrink-0 border-t pt-2">
            {!isAIPartnerExpanded ? (
              <button
                type="button"
                className="focus:ring-accent/60 bg-muted/50 hover:bg-muted flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 text-left transition-colors focus:ring-2 focus:outline-none"
                onClick={() => onAIPartnerExpandedChange(true)}
                data-bugfix-tour={selectedScenario?.type === "bugfix" ? "ai-partner" : undefined}
              >
                <div className="flex items-center gap-2">
                  <Bot className="text-accent h-4 w-4" />
                  <span className="text-muted-foreground text-xs">
                    {selectedScenario.type === "bugfix" ? "Debugging Partner" : "Interview Partner"}
                  </span>
                  <span className="text-muted-foreground text-xs">· optional</span>
                </div>
                <div className="flex items-center gap-2">
                  {chatMessages.length > 0 && (
                    <span className="text-muted-foreground text-xs">{chatMessages.length} msg</span>
                  )}
                  <ChevronUp className="text-muted-foreground h-3 w-3" />
                </div>
              </button>
            ) : (
              <div
                className="border-border/60 bg-muted/30 rounded-md border p-3"
                data-bugfix-tour={selectedScenario?.type === "bugfix" ? "ai-partner" : undefined}
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Bot className="text-accent h-4 w-4" />
                    <span className="text-foreground text-xs font-medium">
                      {selectedScenario.type === "bugfix"
                        ? "Debugging Partner"
                        : "Interview Partner"}
                    </span>
                    <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[11px]">
                      optional
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAIPartnerExpandedChange(false)}
                    className="text-muted-foreground hover:text-foreground h-8 w-8 p-0"
                    aria-label="Collapse debugging partner"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>

                <div className="mb-2 max-h-[120px] space-y-1 overflow-y-auto">
                  {chatMessages.length === 0 ? (
                    <p className="text-muted-foreground py-2 text-center text-xs">
                      {selectedScenario.type === "bugfix"
                        ? "Ask for a debugging nudge after you inspect the files"
                        : "Ask for hints, not solutions"}
                    </p>
                  ) : (
                    chatMessages.slice(-4).map((msg, index) => (
                      <div
                        key={`inline-chat-${msg.type}-${index}`}
                        className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded px-2 py-1 text-xs ${msg.type === "user" ? "text-foreground bg-cyan-700/80" : "bg-muted text-foreground"}`}
                        >
                          <MarkdownRenderer content={msg.message} className="text-xs break-words" />
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="flex gap-1">
                  <input
                    value={chatInput}
                    onChange={(event) => onChatInputChange(event.target.value)}
                    placeholder={
                      selectedScenario.type === "bugfix"
                        ? "Ask for a debugging nudge..."
                        : "Quick question..."
                    }
                    className="border-border bg-card text-foreground placeholder:text-muted-foreground h-8 flex-1 rounded-md border px-3 py-1 text-xs focus:ring-2 focus:ring-cyan-300 focus:outline-none"
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !isLoadingChat) {
                        onSendPartnerMessage()
                      }
                    }}
                    disabled={isLoadingChat}
                  />
                  <Button
                    onClick={onSendPartnerMessage}
                    disabled={!chatInput.trim() || isLoadingChat}
                    className="bg-accent hover:bg-accent/80 h-8 w-8 p-0"
                    aria-label="Send debugging partner message"
                  >
                    {isLoadingChat ? (
                      <div className="border-border h-3 w-3 animate-spin rounded-full border border-t-white" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
})
