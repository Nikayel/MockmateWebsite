"use client"

import { memo, type RefObject } from "react"
import { Bot, CheckCircle, ChevronDown, ChevronUp, Code, PlayCircle, Send } from "lucide-react"
import { toast } from "sonner"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ErrorBoundary } from "@/components/error-boundary"
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer"
import { CodeMirrorEditor } from "@/components/editor"
import {
  CodeConsole,
  type ConsoleOutput,
  type TestResult,
  type TestSummary,
} from "@/components/interview/CodeConsole"
import { GradingCriteriaTooltip } from "@/components/GradingCriteria"
import type { Scenario } from "@/lib/scenarios"
import type { EditorLanguage, WorkspaceContextFile } from "../_types"
import { isLanguageSupported } from "../_utils/language"
import { isWorkspaceScenario } from "../_utils/workspace"

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
  isAIPartnerExpanded: boolean
  onAIPartnerExpandedChange: (expanded: boolean) => void
  chatMessages: MiniChatMessage[]
  chatEndRef: RefObject<HTMLDivElement | null>
  chatInput: string
  onChatInputChange: (value: string) => void
  isLoadingChat: boolean
  onSendPartnerMessage: () => void
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
  isAIPartnerExpanded,
  onAIPartnerExpandedChange,
  chatMessages,
  chatEndRef,
  chatInput,
  onChatInputChange,
  isLoadingChat,
  onSendPartnerMessage,
}: EditorColumnProps) {
  const runWithLanguageGuard = (action: () => void, actionName: "run tests" | "submit") => {
    if (!isLanguageSupported(selectedLanguage)) {
      toast.error(`${selectedLanguage.toUpperCase()} execution not supported yet`, {
        description:
          actionName === "run tests"
            ? "Switch to JavaScript or Python to run tests."
            : "Switch to JavaScript or Python to submit.",
        duration: 6000,
        action: {
          label: "Use JavaScript",
          onClick: () => onSelectedLanguageChange("javascript"),
        },
      })
      return
    }
    action()
  }

  return (
    <Card
      className={`glass-effect order-2 h-full flex-col overflow-hidden border-gray-700 bg-gray-900/50 ${
        activePanel === "editor" ? "flex" : "hidden lg:flex"
      }`}
    >
      <CardHeader className="flex-shrink-0 px-6 pb-2">
        <CardTitle className="flex items-center justify-between text-xs text-white">
          <div className="flex items-center space-x-1">
            <Code className="text-accent h-3 w-3" />
            {selectedScenario?.type === "system-design" ? (
              <span>Design Notes</span>
            ) : activeWorkspaceFile ? (
              <span className="truncate">{activeWorkspaceFile.path}</span>
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
      </CardHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-3">
        <div className="relative min-h-0 flex-1 overflow-auto rounded border border-gray-700">
          <ErrorBoundary>
            <CodeMirrorEditor
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
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 backdrop-blur-sm">
              <div className="max-w-md p-6 text-center">
                <div className="bg-accent/20 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                  <PlayCircle className="text-accent h-8 w-8" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-white">Ready to Start?</h3>
                <p className="mb-4 text-sm text-gray-400">
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
                <p className="mt-3 text-xs text-gray-500">
                  Estimated time: {selectedScenario.estimatedTime || 30} minutes
                </p>
              </div>
            </div>
          )}
        </div>

        {isInterviewStarted && selectedScenario?.type !== "system-design" && (
          <CodeConsole
            outputs={editorConsoleOutputs}
            testResults={testResults}
            testSummary={testSummary}
            isRunning={isRunningTests}
            className="max-h-48 min-h-[120px]"
            onClear={onClearConsole}
          />
        )}

        {selectedScenario?.type === "system-design" ? (
          <div className="flex flex-shrink-0 flex-col gap-2">
            <div className="text-right text-[10px] text-gray-400">
              Document your design decisions above, then submit when ready
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button
                onClick={onSubmitSystemDesign}
                disabled={showFeedback || showPostInterviewDiscussion}
                loading={isRunningTests}
                className="bg-accent hover:bg-accent/80 text-accent-foreground h-7 text-xs font-semibold"
                aria-label={isRunningTests ? "Submitting design..." : "Submit Design"}
              >
                {!isRunningTests && <CheckCircle className="mr-1 h-3 w-3" aria-hidden="true" />}
                {isRunningTests ? "Submitting..." : "Submit Design"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-shrink-0 items-center justify-end gap-2">
            {!isLanguageSupported(selectedLanguage) && (
              <span className="mr-1 text-[10px] text-yellow-400">Use JS/Python to run tests</span>
            )}
            <Button
              onClick={() => runWithLanguageGuard(onRunCode, "run tests")}
              disabled={showFeedback || isRunningTests}
              className={`${isLanguageSupported(selectedLanguage) ? "bg-green-600 hover:bg-green-700" : "bg-gray-600 hover:bg-gray-500"} h-7 text-xs text-white`}
              aria-label={isRunningTests ? "Running tests" : "Run tests"}
            >
              {!isRunningTests && <PlayCircle className="mr-1 h-3 w-3" aria-hidden="true" />}
              {isRunningTests ? "Running..." : "Run Tests"}
            </Button>
            <Button
              onClick={() => runWithLanguageGuard(onSubmitCode, "submit")}
              disabled={showFeedback || isRunningTests}
              className="bg-accent hover:bg-accent/80 text-accent-foreground h-7 text-xs font-semibold"
              aria-label="Submit code"
            >
              <Send className="mr-1 h-3 w-3" aria-hidden="true" />
              Submit
            </Button>
          </div>
        )}

        {selectedScenario && selectedScenario.type !== "dsa" && (
          <div className="flex-shrink-0 border-t border-gray-700 pt-2">
            {!isAIPartnerExpanded ? (
              <div
                className="flex cursor-pointer items-center justify-between rounded bg-gray-800/50 px-2 py-1.5 transition-colors hover:bg-gray-800"
                onClick={() => onAIPartnerExpandedChange(true)}
              >
                <div className="flex items-center gap-2">
                  <Bot className="text-accent h-3 w-3" />
                  <span className="text-[10px] text-gray-400">
                    {selectedScenario.type === "bugfix" ? "AI Partner" : "AI Assistant"}
                  </span>
                  <span className="text-[10px] text-gray-600">· optional</span>
                </div>
                <div className="flex items-center gap-2">
                  {chatMessages.length > 0 && (
                    <span className="text-[10px] text-gray-500">{chatMessages.length} msg</span>
                  )}
                  <ChevronUp className="h-3 w-3 text-gray-500" />
                </div>
              </div>
            ) : (
              <div className="rounded bg-gray-800/30 p-2">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Bot className="text-accent h-3 w-3" />
                    <span className="text-[10px] text-gray-300">
                      {selectedScenario.type === "bugfix" ? "AI Partner" : "AI Assistant"}
                    </span>
                    <span className="rounded bg-gray-800 px-1 text-[9px] text-gray-600">
                      optional
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAIPartnerExpandedChange(false)}
                    className="h-5 w-5 p-0 text-gray-500 hover:text-white"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </div>

                <div className="mb-2 max-h-[120px] space-y-1 overflow-y-auto">
                  {chatMessages.length === 0 ? (
                    <p className="py-2 text-center text-[10px] text-gray-500">
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
                          className={`max-w-[85%] rounded px-2 py-1 text-[10px] ${msg.type === "user" ? "bg-blue-600/80 text-white" : "bg-gray-700 text-gray-200"}`}
                        >
                          <MarkdownRenderer
                            content={msg.message}
                            className="text-[10px] break-words"
                          />
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
                    className="h-6 flex-1 rounded-md border border-gray-700 bg-gray-900 px-3 py-1 text-[10px] text-white placeholder:text-gray-600"
                    onKeyPress={(event) => {
                      if (event.key === "Enter" && !isLoadingChat) {
                        onSendPartnerMessage()
                      }
                    }}
                    disabled={isLoadingChat}
                  />
                  <Button
                    onClick={onSendPartnerMessage}
                    disabled={!chatInput.trim() || isLoadingChat}
                    className="bg-accent hover:bg-accent/80 h-6 w-6 p-0"
                  >
                    {isLoadingChat ? (
                      <div className="h-2 w-2 animate-spin rounded-full border border-white/30 border-t-white" />
                    ) : (
                      <Send className="h-2.5 w-2.5" />
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
