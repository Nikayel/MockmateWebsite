"use client"

import { memo, type RefObject } from "react"
import {
  BookOpen,
  Bot,
  ChevronDown,
  ChevronUp,
  Code,
  FileCode,
  FlaskConical,
  Lock,
  PlayCircle,
  RotateCcw,
  Send,
} from "lucide-react"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ErrorBoundary } from "@/components/error-boundary"
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer"
import { CodeMirrorEditor, type CodeMirrorEditorRef } from "@/components/editor"
import {
  type ConsoleOutput,
  type TestResult,
  type TestSummary,
} from "@/components/interview/CodeConsole"
import { GradingCriteriaTooltip } from "@/components/GradingCriteria"
import type { Scenario } from "@/lib/scenarios"
import type { EditorLanguage, WorkspaceContextFile } from "../_types"
import { isWorkspaceScenario } from "../_utils/workspace"
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
  return (
    <Card
      className={`editor-panel-card glass-effect border-border bg-card/50 order-2 h-full flex-col gap-0 overflow-hidden py-0 ${
        activePanel === "editor" ? "flex" : "hidden lg:flex"
      }`}
    >
      <CardHeader className="flex-shrink-0 px-0 pt-0 pb-2">
        {isWorkspaceScenario(selectedScenario) &&
        workspaceContext &&
        workspaceContext.length > 0 ? (
          <div
            className="border-border bg-card/80 flex w-full items-center justify-between border-b pr-4"
            data-bugfix-tour={selectedScenario?.type === "bugfix" ? "workspace-files" : undefined}
          >
            <div className="workspace-tabs-container no-scrollbar flex flex-1 overflow-x-auto">
              {workspaceContext.map((file) => {
                const isActive = activeWorkspaceFile?.path === file.path
                // Only show hidden files if they are the active file (though usually hidden files aren't in context, just to be safe)
                if (file.hidden && !isActive) return null

                let iconColor = "text-muted-foreground"
                let activeBorderClass = "border-b-cyan-400"
                let roleBadgeClass = "border-cyan-400/25 bg-cyan-400/10 text-cyan-200"
                let RoleIcon = FileCode
                let roleLabel = "Edit"
                let roleDescription = "Editable file"
                if (file.role === "test") {
                  iconColor = isActive ? "text-emerald-300" : "text-emerald-400/70"
                  activeBorderClass = "border-b-emerald-400"
                  roleBadgeClass = "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
                  RoleIcon = FlaskConical
                  roleLabel = "Test"
                  roleDescription = "Test file"
                } else if (file.role === "readonly") {
                  iconColor = isActive ? "text-amber-300" : "text-amber-400/70"
                  activeBorderClass = "border-b-amber-400"
                  roleBadgeClass = "border-amber-400/25 bg-amber-400/10 text-amber-200"
                  RoleIcon = Lock
                  roleLabel = "Read-only"
                  roleDescription = "Read-only file"
                } else if (file.role === "editable") {
                  iconColor = isActive ? "text-cyan-300" : "text-cyan-400/70"
                } else if (file.role === "docs") {
                  iconColor = isActive ? "text-foreground" : "text-muted-foreground"
                  activeBorderClass = "border-b-gray-400"
                  roleBadgeClass = "border-border/30 bg-muted/10 text-muted-foreground"
                  RoleIcon = BookOpen
                  roleLabel = "Docs"
                  roleDescription = "Documentation file"
                }

                return (
                  <button
                    key={file.path}
                    onClick={() => onFileSelect && onFileSelect(file)}
                    title={`${roleDescription}: ${file.path}`}
                    aria-label={`Open ${roleDescription.toLowerCase()} ${file.path}`}
                    className={`workspace-tab-button border-border flex items-center gap-1.5 border-r px-3 py-2 text-xs whitespace-nowrap transition-colors ${
                      isActive
                        ? `border-b-2 ${activeBorderClass} bg-muted text-foreground`
                        : "bg-card/50 text-muted-foreground hover:bg-muted/80 hover:text-muted-foreground border-b-2 border-b-transparent"
                    }`}
                  >
                    <RoleIcon className={`h-3.5 w-3.5 ${iconColor}`} />
                    <span className="workspace-tab-filename">{file.path}</span>
                    <span
                      className={`rounded border px-1.5 py-0.5 text-[11px] leading-none ${roleBadgeClass}`}
                    >
                      {roleLabel}
                    </span>
                    {file.role === "editable" &&
                      file.originalContent !== undefined &&
                      file.content !== file.originalContent && (
                        <span
                          className="h-1.5 w-1.5 rounded-full bg-amber-300"
                          title="Unsaved edit"
                          aria-label="Unsaved edit"
                        />
                      )}
                  </button>
                )
              })}
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
        <div className="border-border relative min-h-0 flex-1 overflow-auto rounded border">
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
                  Review the problem on the left, then start your interview when ready. The timer
                  will begin once you start.
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
        </div>

        {isInterviewStarted && selectedScenario?.type !== "system-design" && (
          <ConsoleOutputPanel
            editorConsoleOutputs={editorConsoleOutputs}
            testResults={testResults}
            testSummary={testSummary}
            isRunningTests={isRunningTests}
            onClearConsole={onClearConsole}
            onGoToLine={onGoToLine}
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
