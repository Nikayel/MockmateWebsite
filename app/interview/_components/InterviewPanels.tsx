"use client"

import { useRef } from "react"
import nextDynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Code,
  MessageSquare,
  Brain,
  Sparkles,
  Lightbulb,
  Target,
  Send,
  PlayCircle,
  HelpCircle,
  Eye,
  ThumbsUp,
  ThumbsDown,
  User,
} from "lucide-react"
import { useInterview } from "../_providers"
import { useInterviewStore } from "@/lib/stores"

// Dynamic imports
const VoiceModeToggle = nextDynamic(
  () => import("@/components/interview").then((mod) => ({ default: mod.VoiceModeToggle })),
  { ssr: false }
)

const GradingCriteriaTooltip = nextDynamic(
  () =>
    import("@/components/GradingCriteria").then((mod) => ({ default: mod.GradingCriteriaTooltip })),
  { ssr: false }
)

const CodeConsole = nextDynamic(
  () => import("@/components/interview/CodeConsole").then((mod) => ({ default: mod.CodeConsole })),
  { ssr: false }
)

const CodeEditor = nextDynamic(
  () => import("@/components/editor").then((mod) => mod.CodeMirrorEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-[#1e1e1e]">
        <div className="text-sm text-gray-400">Loading editor...</div>
      </div>
    ),
  }
)

/**
 * Props for InterviewPanels
 */
export interface InterviewPanelsProps {
  // Handler callbacks
  submitHintFeedback: (hintIndex: number, feedbackType: "helpful" | "unhelpful") => Promise<void>
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  handleSendMessage: (isInterviewer: boolean) => Promise<void>
  runCode: () => Promise<void>
  startInterview: () => Promise<void>
  toggleVoiceRecording: (isInterviewer: boolean) => Promise<void>
  // Refs
  fileInputRef: React.RefObject<HTMLInputElement | null>
  chatEndRef: React.RefObject<HTMLDivElement | null>
  editorContainerRef: React.RefObject<HTMLDivElement | null>
  // Other
  isRecordingPartner: boolean
  isRecordingInterviewer: boolean
}

/**
 * Interview Panels Component
 *
 * Contains the 3-column layout: Problem | Editor | Chat
 * Uses InterviewContext for state, receives handlers as props.
 */
export function InterviewPanels({
  submitHintFeedback,
  handleFileUpload,
  handleSendMessage,
  runCode,
  startInterview,
  toggleVoiceRecording,
  fileInputRef,
  chatEndRef,
  editorContainerRef,
  isRecordingPartner,
  isRecordingInterviewer,
}: InterviewPanelsProps) {
  const {
    // Scenario
    selectedScenario,
    isInterviewStarted,
    // UI
    focusMode,
    activePanel,
    showProblemPeek,
    setShowProblemPeek,
    showPostInterviewDiscussion,
    showFeedback,
    // Editor
    code,
    setCode,
    selectedLanguage,
    starterCode,
    // Tests
    testResults,
    consoleLogs,
    isRunningTests,
    // Hints
    ragHints,
    isLoadingHints,
    revealedAIHintIndices,
    setRevealedAIHintIndices,
    hintFeedback,
    revealedHintIndices,
    setRevealedHintIndices,
    revealedHints,
    elapsedTime,
    isAIPartnerExpanded,
    setIsAIPartnerExpanded,
    // Workspace
    workspaceContext,
    setSelectedFile,
    setIsCodeViewerOpen,
    // Chat
    chatMessages,
    chatInput,
    setChatInput,
    interviewerMessages,
    interviewerInput,
    setInterviewerInput,
    interviewerEndRef,
    isGeneratingDiscussion,
  } = useInterview()

  // Get loading state from global store
  const { isLoadingChat, isLoadingInterviewer } = useInterviewStore()

  return (
    <div
      className={`relative grid min-h-0 flex-1 gap-1.5 overflow-hidden transition-all duration-300 sm:gap-2 ${
        focusMode
          ? "grid-cols-1" // Focus mode: editor only
          : "grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_260px] xl:grid-cols-[320px_minmax(0,1fr)_300px] 2xl:grid-cols-[380px_minmax(0,1fr)_340px]"
      }`}
    >
      {/* Focus Mode: Floating problem peek button */}
      {focusMode && selectedScenario && (
        <button
          onClick={() => setShowProblemPeek(!showProblemPeek)}
          className={`fixed top-20 left-4 z-50 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium shadow-lg transition-all ${
            showProblemPeek
              ? "bg-accent text-accent-foreground"
              : "border border-gray-600 bg-gray-800/90 text-gray-300 hover:bg-gray-700/90"
          }`}
          title="Peek at problem description"
        >
          <Target className="h-3.5 w-3.5" />
          <span>{showProblemPeek ? "Hide Problem" : "Show Problem"}</span>
        </button>
      )}

      {/* Focus Mode: Problem peek overlay */}
      {focusMode && showProblemPeek && selectedScenario && (
        <div className="fixed top-32 left-4 z-40 max-h-[60vh] w-96 overflow-hidden rounded-xl border border-gray-700 bg-gray-900/95 shadow-2xl backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-gray-700 p-4">
            <div className="flex items-center gap-2">
              <Target className="text-accent h-4 w-4" />
              <span className="text-sm font-semibold text-white">{selectedScenario.title}</span>
            </div>
            <Badge
              className={`text-xs ${
                selectedScenario.difficulty === "easy"
                  ? "bg-green-500/20 text-green-400"
                  : selectedScenario.difficulty === "medium"
                    ? "bg-yellow-500/20 text-yellow-400"
                    : "bg-red-500/20 text-red-400"
              }`}
            >
              {selectedScenario.difficulty}
            </Badge>
          </div>
          <div className="max-h-[calc(60vh-60px)] overflow-y-auto p-4">
            <p className="text-sm leading-relaxed text-gray-200">
              {selectedScenario.problemStatement}
            </p>
            {selectedScenario.type === "dsa" &&
              selectedScenario.examples &&
              selectedScenario.examples.length > 0 && (
                <div className="mt-4 space-y-3">
                  <h4 className="text-accent text-xs font-semibold tracking-wide uppercase">
                    Examples
                  </h4>
                  {selectedScenario.examples.slice(0, 2).map((ex, idx) => (
                    <div key={idx} className="rounded-lg bg-gray-800/50 p-3 font-mono text-xs">
                      <div className="text-gray-400">
                        Input: <span className="text-blue-300">{ex.input}</span>
                      </div>
                      <div className="text-gray-400">
                        Output: <span className="text-green-300">{ex.output}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>
        </div>
      )}

      {/* Left: Problem Description Panel */}
      <Card
        className={`glass-effect order-1 h-full flex-col overflow-hidden border-gray-700 bg-gray-900/50 ${
          focusMode ? "hidden" : ""
        } ${activePanel === "problem" ? "flex" : "hidden lg:flex"}`}
      >
        <CardHeader className="flex-shrink-0 border-b border-gray-700/50 pb-3">
          <CardTitle className="flex items-center justify-between text-white">
            <div className="flex min-w-0 items-center gap-2">
              <Target className="text-accent h-5 w-5 flex-shrink-0" />
              <span className="truncate text-base font-semibold">
                {selectedScenario?.title || "Problem"}
              </span>
            </div>
            {selectedScenario && (
              <Badge
                className={`ml-2 flex-shrink-0 text-xs ${
                  selectedScenario.difficulty === "easy"
                    ? "border-green-500/30 bg-green-500/20 text-green-400"
                    : selectedScenario.difficulty === "medium"
                      ? "border-yellow-500/30 bg-yellow-500/20 text-yellow-400"
                      : "border-red-500/30 bg-red-500/20 text-red-400"
                }`}
              >
                {selectedScenario.difficulty}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
          {selectedScenario && (
            <>
              {/* Description */}
              <div className="space-y-2">
                <h3 className="text-accent flex items-center gap-2 text-sm font-semibold tracking-wide uppercase">
                  <span className="bg-accent h-4 w-1 rounded-full"></span>
                  Description
                </h3>
                <p className="text-[15px] leading-relaxed text-gray-200">
                  {selectedScenario.problemStatement}
                </p>
              </div>

              {/* AI Insights */}
              {isInterviewStarted &&
                code.trim().length - starterCode.trim().length >= 30 &&
                (ragHints.length > 0 || isLoadingHints) && (
                  <div className="space-y-2">
                    <h3 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-purple-400 uppercase">
                      <span className="h-4 w-1 rounded-full bg-purple-400"></span>
                      <Sparkles className="h-4 w-4" />
                      AI Insights
                      <span className="text-xs font-normal text-gray-500">
                        ({revealedAIHintIndices.size}/{ragHints.length} revealed)
                      </span>
                    </h3>
                    {isLoadingHints ? (
                      <div className="flex items-center gap-2 rounded-lg border border-purple-500/20 bg-purple-500/5 p-3 text-sm text-gray-400">
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
                        Generating personalized hints...
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {ragHints.map((hint, i) => {
                          const hintId = `hint-${selectedScenario?.id}-${i}`
                          const isRevealed = revealedAIHintIndices.has(i)
                          const feedback = hintFeedback.get(hintId)

                          return (
                            <div
                              key={`ai-hint-${i}`}
                              className={`rounded-lg border transition-all ${
                                isRevealed
                                  ? "border-purple-500/30 bg-purple-500/10"
                                  : "cursor-pointer border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10"
                              }`}
                            >
                              {isRevealed ? (
                                <div className="p-3">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="flex-1 text-sm leading-relaxed text-purple-100">
                                      <span className="font-medium text-purple-300">
                                        Level {hint.level}:
                                      </span>{" "}
                                      {hint.hint}
                                    </p>
                                    <div className="flex flex-shrink-0 items-center gap-1">
                                      <button
                                        onClick={() => submitHintFeedback(i, "helpful")}
                                        className={`rounded p-1 transition-colors ${
                                          feedback === "helpful"
                                            ? "bg-green-500/30 text-green-400"
                                            : "text-gray-500 hover:bg-green-500/10 hover:text-green-400"
                                        }`}
                                        title="Helpful"
                                      >
                                        <ThumbsUp className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={() => submitHintFeedback(i, "unhelpful")}
                                        className={`rounded p-1 transition-colors ${
                                          feedback === "unhelpful"
                                            ? "bg-red-500/30 text-red-400"
                                            : "text-gray-500 hover:bg-red-500/10 hover:text-red-400"
                                        }`}
                                        title="Not helpful"
                                      >
                                        <ThumbsDown className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div
                                  className="relative p-3"
                                  onClick={() => {
                                    setRevealedAIHintIndices((prev) => new Set([...prev, i]))
                                  }}
                                >
                                  <p className="pointer-events-none text-sm leading-relaxed text-purple-200/20 blur-sm select-none">
                                    <span className="font-medium">Level {hint.level}:</span>{" "}
                                    {hint.hint.substring(0, 60)}...
                                  </p>
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="flex items-center gap-1.5 rounded-full border border-purple-500/40 bg-purple-500/20 px-3 py-1.5 text-xs font-medium text-purple-300">
                                      <Eye className="h-3.5 w-3.5" />
                                      Click to reveal hint {i + 1}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

              {/* Examples */}
              {selectedScenario.type === "dsa" &&
                selectedScenario.examples &&
                selectedScenario.examples.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-accent flex items-center gap-2 text-sm font-semibold tracking-wide uppercase">
                      <span className="bg-accent h-4 w-1 rounded-full"></span>
                      Examples
                    </h3>
                    <div className="space-y-3">
                      {selectedScenario.examples.slice(0, 2).map((ex, i) => (
                        <div
                          key={i}
                          className="rounded-lg border border-gray-700/50 bg-gray-800/70 p-3"
                        >
                          <div className="space-y-1.5 font-mono text-sm">
                            <div className="flex items-start gap-2">
                              <span className="min-w-[55px] font-medium text-gray-500">Input:</span>
                              <code className="break-all text-green-400">{ex.input}</code>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="min-w-[55px] font-medium text-gray-500">
                                Output:
                              </span>
                              <code className="break-all text-blue-400">{ex.output}</code>
                            </div>
                          </div>
                          {ex.explanation && (
                            <div className="mt-2 border-t border-gray-700/50 pt-2 text-sm text-gray-400 italic">
                              {ex.explanation}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Constraints */}
              {selectedScenario.type === "dsa" &&
                selectedScenario.constraints &&
                selectedScenario.constraints.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-accent flex items-center gap-2 text-sm font-semibold tracking-wide uppercase">
                      <span className="bg-accent h-4 w-1 rounded-full"></span>
                      Constraints
                    </h3>
                    <ul className="space-y-1.5 text-gray-300">
                      {selectedScenario.constraints.slice(0, 4).map((c, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-accent mt-0.5">•</span>
                          <code className="font-mono text-gray-300">{c}</code>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {/* Hints Section */}
              {isInterviewStarted &&
                (selectedScenario as any).hints &&
                (selectedScenario as any).hints.length > 0 && (
                  <div className="mt-3 border-t border-gray-700 pt-3">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="flex items-center space-x-1 text-xs font-semibold text-white">
                        <Lightbulb className="h-3 w-3 text-yellow-400" />
                        <span>
                          Hints ({revealedHintIndices.size}/{revealedHints} unlocked)
                        </span>
                      </h3>
                      {revealedHints < (selectedScenario as any).hints.length && (
                        <span className="text-xs text-gray-400">
                          Next in {Math.ceil((180 - (elapsedTime % 180)) / 60)}m
                        </span>
                      )}
                    </div>
                    {revealedHints > 0 ? (
                      <div className="space-y-2">
                        {(selectedScenario as any).hints
                          .slice(0, revealedHints)
                          .map((hint: string, i: number) => {
                            const isHintRevealed = revealedHintIndices.has(i)
                            return (
                              <div
                                key={i}
                                className={`cursor-pointer rounded border border-yellow-500/20 bg-yellow-500/10 p-2 transition-all ${!isHintRevealed ? "hover:bg-yellow-500/15" : ""}`}
                                onClick={() => {
                                  if (!isHintRevealed) {
                                    setRevealedHintIndices((prev) => new Set([...prev, i]))
                                  }
                                }}
                              >
                                {isHintRevealed ? (
                                  <p className="text-xs leading-relaxed text-yellow-200">
                                    <span className="font-semibold">Hint {i + 1}:</span> {hint}
                                  </p>
                                ) : (
                                  <div className="relative">
                                    <p className="pointer-events-none text-xs leading-relaxed text-yellow-200/30 blur-sm select-none">
                                      <span className="font-semibold">Hint {i + 1}:</span>{" "}
                                      {hint.substring(0, 50)}...
                                    </p>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <div className="flex items-center gap-1 rounded border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-400">
                                        <HelpCircle className="h-3 w-3" />
                                        <span>Click to reveal Hint {i + 1}</span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">
                        Hints will unlock every 3 minutes as you work on the problem
                      </p>
                    )}
                  </div>
                )}

              {/* Workspace Files Section */}
              <div className="mt-3 border-t border-gray-700 pt-3">
                <h3 className="mb-2 font-semibold text-white">Workspace Files</h3>
                {selectedScenario &&
                  selectedScenario.type === "add-functionality" &&
                  workspaceContext.length === 0 && (
                    <div className="mb-2 rounded border border-yellow-500/30 bg-yellow-500/10 p-2">
                      <p className="text-xs text-yellow-300">
                        ⚠️ This scenario is optimized for <strong>JavaScript/TypeScript</strong>.
                        Switch language for codebase files.
                      </p>
                    </div>
                  )}
                {selectedScenario &&
                (selectedScenario.type === "bugfix" ||
                  selectedScenario.type === "add-functionality") &&
                workspaceContext.length > 0 ? (
                  <div className="mb-2">
                    <p className="mb-2 text-xs text-green-400">
                      ✓ {workspaceContext.length} codebase file(s) loaded automatically
                    </p>
                    <div className="max-h-32 space-y-1 overflow-y-auto">
                      {workspaceContext.map((file, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setSelectedFile(file)
                            setIsCodeViewerOpen(true)
                          }}
                          className="w-full cursor-pointer rounded border border-gray-700 bg-gray-800/50 px-2 py-1 text-left text-xs text-gray-300 transition-colors hover:border-blue-500 hover:bg-gray-700/50"
                        >
                          <div className="flex items-center gap-1 font-semibold text-blue-400">
                            <Code className="h-3 w-3" />
                            {file.path}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <input
                      ref={fileInputRef as React.RefObject<HTMLInputElement>}
                      type="file"
                      multiple
                      accept=".js,.ts,.jsx,.tsx,.py,.java,.cpp,.c,.h,.json,.md,.txt,text/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      onClick={() => (fileInputRef.current as HTMLInputElement | null)?.click()}
                      variant="outline"
                      className="h-7 w-full border-gray-600 bg-transparent text-xs text-gray-300 hover:bg-gray-800"
                    >
                      <Code className="mr-1 h-3 w-3" />
                      Upload Files
                    </Button>
                    {workspaceContext.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {workspaceContext.map((file, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setSelectedFile(file)
                              setIsCodeViewerOpen(true)
                            }}
                            className="w-full cursor-pointer rounded bg-gray-800/30 px-2 py-1 text-left text-xs text-gray-400 transition-colors hover:bg-gray-700/30 hover:text-blue-400"
                          >
                            <div className="flex items-center gap-1 truncate">
                              <Code className="h-3 w-3 flex-shrink-0" />
                              {file.path}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Center: Code Editor Panel */}
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
              ) : (
                <span>Code Editor</span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {selectedScenario && !isInterviewStarted && (
                <Button
                  onClick={() => startInterview()}
                  className="bg-accent hover:bg-accent/80 text-accent-foreground h-6 px-3 text-xs"
                >
                  <PlayCircle className="mr-1 h-3 w-3" />
                  Start Interview
                </Button>
              )}
              {isInterviewStarted && selectedScenario?.type !== "system-design" && (
                <Button
                  onClick={() => runCode()}
                  disabled={isRunningTests || showFeedback || showPostInterviewDiscussion}
                  className="bg-accent hover:bg-accent/80 text-accent-foreground h-6 px-2 text-xs"
                >
                  {isRunningTests ? (
                    <span className="flex items-center">
                      <div className="mr-1 h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Running...
                    </span>
                  ) : (
                    <>
                      <PlayCircle className="mr-1 h-3 w-3" />
                      Run Tests
                    </>
                  )}
                </Button>
              )}
              <GradingCriteriaTooltip />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent
          ref={editorContainerRef as React.RefObject<HTMLDivElement>}
          className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 pb-2"
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-700">
            <CodeEditor
              height="100%"
              language={selectedLanguage}
              value={code}
              onChange={(value) => setCode(value || "")}
              readOnly={showFeedback}
            />
          </div>
          {/* Console/Output Panel */}
          {isInterviewStarted && (testResults.length > 0 || consoleLogs.length > 0) && (
            <div className="mt-2 max-h-40 flex-shrink-0 overflow-hidden rounded-lg border border-gray-700">
              <CodeConsole testResults={testResults} outputs={consoleLogs} />
            </div>
          )}
          {/* AI Partner (collapsed by default) */}
          {isInterviewStarted && (
            <div className="mt-2 flex-shrink-0">
              <button
                onClick={() => setIsAIPartnerExpanded(!isAIPartnerExpanded)}
                className="flex w-full items-center justify-between rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2 text-xs text-gray-300 transition-colors hover:bg-gray-700/50"
              >
                <div className="flex items-center gap-2">
                  <Brain className="text-accent h-3 w-3" />
                  <span>AI Coding Partner</span>
                  {chatMessages.length > 0 && (
                    <span className="rounded-full bg-gray-600 px-1.5 py-0.5 text-[10px]">
                      {chatMessages.length}
                    </span>
                  )}
                </div>
                <span className="text-gray-500">{isAIPartnerExpanded ? "▲" : "▼"}</span>
              </button>
              {isAIPartnerExpanded && (
                <div className="mt-2 rounded-lg border border-gray-700 bg-gray-800/30 p-3">
                  <div className="mb-2 max-h-32 space-y-2 overflow-y-auto">
                    {chatMessages.length === 0 ? (
                      <p className="text-center text-xs text-gray-500">
                        Ask questions about your approach...
                      </p>
                    ) : (
                      chatMessages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-lg p-2 text-xs ${
                              msg.type === "user"
                                ? "bg-blue-600 text-white"
                                : "bg-gray-700 text-gray-200"
                            }`}
                          >
                            {msg.message}
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={chatEndRef as React.RefObject<HTMLDivElement>} />
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask about your code..."
                      className="h-7 flex-1 border-gray-600 bg-gray-800 text-xs"
                      onKeyPress={(e) =>
                        e.key === "Enter" && !isLoadingChat && handleSendMessage(false)
                      }
                      disabled={isLoadingChat}
                    />
                    <Button
                      onClick={() => handleSendMessage(false)}
                      disabled={!chatInput.trim() || isLoadingChat}
                      size="sm"
                      className="bg-accent hover:bg-accent/80 h-7 px-2"
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
        </CardContent>
      </Card>

      {/* Right: AI Interviewer Panel */}
      <Card
        className={`glass-effect order-3 h-full flex-col overflow-hidden border-gray-700 bg-gray-900/50 ${
          focusMode ? "hidden" : ""
        } ${activePanel === "chat" ? "flex" : "hidden lg:flex"}`}
      >
        <CardHeader className="flex-shrink-0 pb-2">
          <CardTitle className="flex items-center space-x-2 text-sm text-white">
            <div className="relative">
              <Brain className="text-accent animate-neural-pulse h-4 w-4" />
              <div className="bg-accent absolute inset-0 rounded-full opacity-30 blur-md"></div>
            </div>
            <span className="from-accent to-neural bg-gradient-to-r bg-clip-text font-bold text-transparent">
              CodeSparring AI
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
          <div className="mb-2 min-h-0 flex-1 space-y-2 overflow-y-auto pr-2">
            {interviewerMessages.length === 0 ? (
              <div className="py-8 text-center text-gray-400">
                <MessageSquare className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p className="text-xs">Interview will begin when you start...</p>
              </div>
            ) : (
              <>
                {interviewerMessages.map((msg, index) => (
                  <div
                    key={`interviewer-${msg.type}-${index}`}
                    className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[90%] rounded-lg p-2 ${
                        msg.type === "user" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-100"
                      }`}
                    >
                      <div className="mb-1 flex items-center space-x-1">
                        {msg.type === "user" ? (
                          <User className="h-3 w-3" />
                        ) : (
                          <Brain className="text-accent animate-neural-pulse h-3 w-3" />
                        )}
                        <span className="text-xs opacity-75">
                          {msg.type === "user" ? "You" : "CodeSparring AI"}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                    </div>
                  </div>
                ))}
                {/* Thinking indicator */}
                {(isLoadingInterviewer || isGeneratingDiscussion) && (
                  <div className="flex justify-start">
                    <div className="max-w-[90%] rounded-lg border border-gray-700/50 bg-gray-800/50 p-2 text-gray-400">
                      <div className="flex items-center space-x-2">
                        <Brain className="h-3 w-3 animate-pulse text-[#00d9ff]" />
                        <span className="text-xs">CodeSparring AI is thinking</span>
                        <span className="flex space-x-0.5">
                          <span
                            className="h-1 w-1 animate-bounce rounded-full bg-[#00d9ff]"
                            style={{ animationDelay: "0ms" }}
                          />
                          <span
                            className="h-1 w-1 animate-bounce rounded-full bg-[#00d9ff]"
                            style={{ animationDelay: "150ms" }}
                          />
                          <span
                            className="h-1 w-1 animate-bounce rounded-full bg-[#00d9ff]"
                            style={{ animationDelay: "300ms" }}
                          />
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={interviewerEndRef as React.RefObject<HTMLDivElement>} />
              </>
            )}
          </div>
          {(isInterviewStarted || showPostInterviewDiscussion) && (
            <div className="flex flex-shrink-0 flex-col gap-2 border-t border-gray-700 pt-3">
              <VoiceModeToggle
                isRecording={isRecordingInterviewer}
                onToggleRecording={() => toggleVoiceRecording(true)}
                transcript={interviewerInput}
                disabled={isLoadingInterviewer || isGeneratingDiscussion}
                compact
              />
              {!isRecordingInterviewer && (
                <div className="flex space-x-2">
                  <Input
                    value={interviewerInput}
                    onChange={(e) => setInterviewerInput(e.target.value)}
                    placeholder="Type or use voice..."
                    className="bg-secondary border-border text-foreground placeholder-muted-foreground h-7 flex-1 text-xs"
                    onKeyPress={(e) =>
                      e.key === "Enter" && !isLoadingInterviewer && handleSendMessage(true)
                    }
                    disabled={isLoadingInterviewer || isGeneratingDiscussion}
                    aria-label="Chat with interviewer"
                  />
                  <Button
                    onClick={() => handleSendMessage(true)}
                    className="bg-accent hover:bg-accent/80 text-accent-foreground h-7 px-2"
                    disabled={
                      !interviewerInput.trim() || isLoadingInterviewer || isGeneratingDiscussion
                    }
                    aria-label="Send message"
                  >
                    {!(isLoadingInterviewer || isGeneratingDiscussion) && (
                      <Send className="h-3 w-3" aria-hidden="true" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
