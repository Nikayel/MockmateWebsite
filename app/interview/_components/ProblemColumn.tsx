"use client"

import { memo, type Dispatch, type RefObject, type SetStateAction } from "react"
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Code,
  Eye,
  HardDrive,
  HelpCircle,
  Lightbulb,
  Save,
  Sparkles,
  Target,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer"
import type { Scenario } from "@/lib/scenarios"
import type { WorkspaceContextFile } from "../_types"

type BugfixReflectionField = "hypothesis" | "rootCause" | "prevention"

interface ProblemColumnCtx {
  activePanel: "problem" | "editor" | "chat"
  bugfixReflection?: {
    hypothesis: string
    rootCause: string
    prevention: string
  }
  elapsedTime: number
  fetchRAGHints: () => Promise<void>
  fileInputRef: RefObject<HTMLInputElement | null>
  focusMode: boolean
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  hintAgent: { revealHint: (hintId: string) => void }
  hintFeedback: Map<string, "helpful" | "unhelpful">
  hintFetchStatus: "idle" | "loading" | "success" | "error"
  isInterviewStarted: boolean
  ragHints: Array<{ level: number; hint: string; id?: string }>
  realInterviewMode: boolean
  revealedAIHintIndices: Set<number>
  revealedHintIndices: Set<number>
  revealedHints: number
  selectedScenario: Scenario | null
  setIsCodeViewerOpen: (open: boolean) => void
  onBugfixReflectionChange?: (field: BugfixReflectionField, value: string) => void
  onBugfixReflectionCommit?: (field: BugfixReflectionField) => void
  setRevealedAIHintIndices: Dispatch<SetStateAction<Set<number>>>
  setRevealedHintIndices: Dispatch<SetStateAction<Set<number>>>
  setSelectedFile: (file: WorkspaceContextFile | null) => void
  setShowOptimalApproach: (show: boolean) => void
  showOptimalApproach: boolean
  submitHintFeedback: (hintIndex: number, feedbackType: "helpful" | "unhelpful") => Promise<void>
  workspaceContext: WorkspaceContextFile[]
}

interface ProblemColumnProps {
  ctx: ProblemColumnCtx
}

export const ProblemColumn = memo(function ProblemColumn({ ctx }: ProblemColumnProps) {
  const {
    activePanel,
    bugfixReflection,
    elapsedTime,
    fetchRAGHints,
    fileInputRef,
    focusMode,
    handleFileUpload,
    hintAgent,
    hintFeedback,
    hintFetchStatus,
    isInterviewStarted,
    ragHints,
    realInterviewMode,
    revealedAIHintIndices,
    revealedHintIndices,
    revealedHints,
    selectedScenario,
    setIsCodeViewerOpen,
    onBugfixReflectionChange,
    onBugfixReflectionCommit,
    setRevealedAIHintIndices,
    setRevealedHintIndices,
    setSelectedFile,
    setShowOptimalApproach,
    showOptimalApproach,
    submitHintFeedback,
    workspaceContext,
  } = ctx
  const isBugfix = selectedScenario?.type === "bugfix"

  return (
    <>
      {/* Left: Problem Description / File Upload
                      - Hidden in focus mode (desktop)
                      - Only visible when activePanel === 'problem' (mobile)
                  */}
      <Card
        className={`glass-effect order-1 h-full flex-col gap-0 overflow-hidden border-gray-700 bg-gray-900/50 py-0 ${
          focusMode
            ? "hidden" // Always hidden in focus mode - no responsive override
            : activePanel === "problem"
              ? "flex"
              : "hidden lg:flex"
        }`}
      >
        {/* IMPROVED: Enhanced header with title and difficulty badge */}
        <CardHeader className="flex-shrink-0 border-b border-gray-700/50 px-4 pt-3 pb-2">
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
        {/* IMPROVED: Better spacing and typography for readability */}
        <CardContent className="min-h-0 flex-1 space-y-5 overflow-y-auto p-3">
          {selectedScenario && (
            <>
              {/* IMPROVED: Description with larger font and visual hierarchy */}
              <div className="space-y-2">
                <h3 className="text-accent flex items-center gap-2 text-sm font-semibold tracking-wide uppercase">
                  <span className="bg-accent h-4 w-1 rounded-full"></span>
                  Description
                  {realInterviewMode && (selectedScenario as any).fuzzyStatement && (
                    <Badge className="border-purple-500/30 bg-purple-500/20 text-[10px] text-purple-300">
                      Real Interview Mode
                    </Badge>
                  )}
                </h3>
                <MarkdownRenderer
                  content={
                    realInterviewMode && (selectedScenario as any).fuzzyStatement
                      ? (selectedScenario as any).fuzzyStatement
                      : selectedScenario.problemStatement
                  }
                  className="text-[15px] leading-relaxed text-gray-200"
                />
              </div>

              {isBugfix && (
                <div
                  className="rounded-md border border-blue-500/20 bg-blue-500/5 p-3"
                  data-bugfix-tour="incident-report"
                >
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold tracking-wide text-blue-300 uppercase">
                    <span className="h-4 w-1 rounded-full bg-blue-300"></span>
                    Incident Report
                  </h3>
                  <div className="space-y-2 text-sm leading-relaxed text-gray-300">
                    {(selectedScenario as any).userReport && (
                      <p className="text-gray-200">{(selectedScenario as any).userReport}</p>
                    )}
                    {(selectedScenario as any).expectedBehavior && (
                      <p>
                        <span className="font-medium text-gray-100">Expected:</span>{" "}
                        {(selectedScenario as any).expectedBehavior}
                      </p>
                    )}
                    {(selectedScenario as any).reproductionSteps?.length > 0 && (
                      <div>
                        <p className="mb-1 text-xs font-semibold tracking-wide text-blue-200 uppercase">
                          Repro Steps
                        </p>
                        <ol className="list-decimal space-y-1.5 pl-4 text-xs text-gray-400">
                          {(selectedScenario as any).reproductionSteps.map(
                            (step: string, index: number) => (
                              <li key={`${step}-${index}`}>{step}</li>
                            )
                          )}
                        </ol>
                      </div>
                    )}
                    {(selectedScenario as any).visibleLogs?.length > 0 && (
                      <div>
                        <p className="mb-1 text-xs font-semibold tracking-wide text-blue-200 uppercase">
                          Visible Logs
                        </p>
                        <div className="space-y-1 rounded border border-gray-700/60 bg-gray-950/50 p-2 font-mono text-[11px] text-gray-300">
                          {(selectedScenario as any).visibleLogs.map(
                            (log: string, index: number) => (
                              <p key={`${log}-${index}`}>{log}</p>
                            )
                          )}
                        </div>
                      </div>
                    )}
                    {(selectedScenario as any).successCriteria?.length > 0 && (
                      <div>
                        <p className="mb-1 text-xs font-semibold tracking-wide text-blue-200 uppercase">
                          Success Criteria
                        </p>
                        <ul className="space-y-1 pl-1 text-xs text-gray-400">
                          {(selectedScenario as any).successCriteria.map(
                            (criterion: string, index: number) => (
                              <li key={`${criterion}-${index}`} className="flex gap-2">
                                <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-blue-300" />
                                <span>{criterion}</span>
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {isBugfix && isInterviewStarted && bugfixReflection && (
                <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-wide text-emerald-300 uppercase">
                    <span className="h-4 w-1 rounded-full bg-emerald-300"></span>
                    Debugging Notes
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <div
                        className="mb-1 flex items-center justify-between gap-2"
                        data-bugfix-tour="hypothesis"
                      >
                        <label
                          htmlFor="bugfix-hypothesis"
                          className="block text-xs font-medium text-gray-300"
                        >
                          Hypothesis
                        </label>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={!bugfixReflection.hypothesis.trim()}
                          onClick={() => onBugfixReflectionCommit?.("hypothesis")}
                          className="h-7 border-emerald-500/30 px-2 text-[11px] text-emerald-200 hover:bg-emerald-500/10"
                        >
                          <Save className="mr-1 h-3 w-3" />
                          Save hypothesis
                        </Button>
                      </div>
                      <Textarea
                        id="bugfix-hypothesis"
                        value={bugfixReflection.hypothesis}
                        onChange={(event) =>
                          onBugfixReflectionChange?.("hypothesis", event.target.value)
                        }
                        onBlur={() => onBugfixReflectionCommit?.("hypothesis")}
                        className="min-h-[64px] border-gray-700 bg-gray-950/60 text-xs text-gray-100"
                        placeholder="What do you think is causing the incident?"
                      />
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <label
                          htmlFor="bugfix-root-cause"
                          className="block text-xs font-medium text-gray-300"
                        >
                          Root Cause
                        </label>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={!bugfixReflection.rootCause.trim()}
                          onClick={() => onBugfixReflectionCommit?.("rootCause")}
                          className="h-7 border-emerald-500/30 px-2 text-[11px] text-emerald-200 hover:bg-emerald-500/10"
                        >
                          <Save className="mr-1 h-3 w-3" />
                          Save root cause
                        </Button>
                      </div>
                      <Textarea
                        id="bugfix-root-cause"
                        value={bugfixReflection.rootCause}
                        onChange={(event) =>
                          onBugfixReflectionChange?.("rootCause", event.target.value)
                        }
                        onBlur={() => onBugfixReflectionCommit?.("rootCause")}
                        className="min-h-[64px] border-gray-700 bg-gray-950/60 text-xs text-gray-100"
                        placeholder="What failed, and why?"
                      />
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <label
                          htmlFor="bugfix-prevention"
                          className="block text-xs font-medium text-gray-300"
                        >
                          Prevention
                        </label>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={!bugfixReflection.prevention.trim()}
                          onClick={() => onBugfixReflectionCommit?.("prevention")}
                          className="h-7 border-emerald-500/30 px-2 text-[11px] text-emerald-200 hover:bg-emerald-500/10"
                        >
                          <Save className="mr-1 h-3 w-3" />
                          Save prevention
                        </Button>
                      </div>
                      <Textarea
                        id="bugfix-prevention"
                        value={bugfixReflection.prevention}
                        onChange={(event) =>
                          onBugfixReflectionChange?.("prevention", event.target.value)
                        }
                        onBlur={() => onBugfixReflectionCommit?.("prevention")}
                        className="min-h-[64px] border-gray-700 bg-gray-950/60 text-xs text-gray-100"
                        placeholder="What test, guardrail, or monitoring would catch this next time?"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* AI Insights - Shown independently, right after description */}
              {/* Only show hints when user has written meaningful code beyond starter code */}
              {/* Use hintFetchStatus to prevent flickering - section stays visible after first fetch attempt */}
              {isInterviewStarted && hintFetchStatus !== "idle" && (
                <div className="space-y-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-purple-400 uppercase">
                    <span className="h-4 w-1 rounded-full bg-purple-400"></span>
                    <Sparkles className="h-4 w-4" />
                    AI Insights
                    {ragHints.length > 0 && (
                      <span className="text-xs font-normal text-gray-500">
                        ({revealedAIHintIndices.size}/{ragHints.length} revealed)
                      </span>
                    )}
                  </h3>
                  {hintFetchStatus === "loading" ? (
                    <div className="flex items-center gap-2 rounded-lg border border-purple-500/20 bg-purple-500/5 p-3 text-sm text-gray-400">
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
                      Generating personalized hints...
                    </div>
                  ) : hintFetchStatus === "error" || ragHints.length === 0 ? (
                    <div className="rounded-lg border border-gray-600/30 bg-gray-800/30 p-3">
                      <p className="text-sm text-gray-400">
                        Hints will appear here as you code. Keep working on your solution!
                      </p>
                      <button
                        onClick={fetchRAGHints}
                        className="mt-2 flex items-center gap-1.5 text-xs text-purple-400 transition-colors hover:text-purple-300"
                      >
                        <Sparkles className="h-3 w-3" />
                        Try generating hints
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {ragHints
                        .slice(0, Math.min(revealedAIHintIndices.size + 1, ragHints.length))
                        .map((hint, i) => {
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
                                    {/* Feedback buttons */}
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
                                <button
                                  type="button"
                                  className="relative w-full p-3 text-left focus:ring-2 focus:ring-purple-400 focus:outline-none"
                                  onClick={() => {
                                    if (hint.id) {
                                      hintAgent.revealHint(hint.id)
                                    }
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
                                </button>
                              )}
                            </div>
                          )
                        })}
                    </div>
                  )}
                </div>
              )}

              {/* IMPROVED: Examples with better visual hierarchy */}
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

              {/* IMPROVED: Constraints with better styling */}
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

              {/* Optimal Approach - Collapsible (DSA only) */}
              {selectedScenario.type === "dsa" && (selectedScenario as any).optimalComplexity && (
                <div className="rounded-md border border-gray-600/60 bg-gray-800/40">
                  <button
                    onClick={() => setShowOptimalApproach(!showOptimalApproach)}
                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left transition-colors hover:bg-gray-700/30"
                  >
                    <div className="flex items-center gap-2">
                      <span className="bg-accent h-4 w-1 rounded-full"></span>
                      <span className="text-sm font-medium text-gray-200">Target complexity</span>
                    </div>
                    {showOptimalApproach ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </button>

                  {showOptimalApproach && (
                    <div className="animate-in slide-in-from-top-2 px-3 pt-0.5 pb-3 duration-200">
                      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
                        <span className="flex items-center gap-1.5 text-gray-400">
                          <Clock className="h-3.5 w-3.5 text-gray-500" />
                          <code className="text-accent font-mono">
                            {(selectedScenario as any).optimalComplexity.time}
                          </code>
                        </span>
                        <span className="flex items-center gap-1.5 text-gray-400">
                          <HardDrive className="h-3.5 w-3.5 text-gray-500" />
                          <code className="text-accent font-mono">
                            {(selectedScenario as any).optimalComplexity.space}
                          </code>
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        Aim for this before checking hints.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Legacy static hints are kept hidden during interviews so generated insights are the single hint surface. */}
              {!isInterviewStarted &&
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
                              <button
                                type="button"
                                key={i}
                                className={`w-full cursor-pointer rounded border border-yellow-500/20 bg-yellow-500/10 p-2 text-left transition-all focus:ring-2 focus:ring-yellow-400 focus:outline-none ${!isHintRevealed ? "hover:bg-yellow-500/15" : ""}`}
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
                              </button>
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
            </>
          )}

          {/* Upload Codebase Section - Only show for non-DSA scenarios */}
          {selectedScenario && selectedScenario.type !== "dsa" && (
            <div className="mt-3 border-t border-gray-700 pt-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="font-semibold text-white">Codebase Files</h3>
                {selectedScenario.type === "bugfix" && (
                  <Badge className="border-blue-500/30 bg-blue-500/10 text-[10px] text-blue-300">
                    review first
                  </Badge>
                )}
              </div>
              {/* Show warning for add-functionality when language has no files */}
              {selectedScenario &&
                selectedScenario.type === "add-functionality" &&
                workspaceContext.length === 0 && (
                  <div className="mb-2 rounded border border-yellow-500/30 bg-yellow-500/10 p-2">
                    <p className="text-xs text-yellow-300">
                      This scenario uses a prepared codebase workspace. Reload the scenario if the
                      files do not appear.
                    </p>
                  </div>
                )}
              {selectedScenario &&
              (selectedScenario.type === "bugfix" ||
                selectedScenario.type === "add-functionality") &&
              workspaceContext.length > 0 ? (
                <div className="mb-2">
                  <p className="mb-2 text-xs text-blue-400">
                    <Code className="mr-1 mb-0.5 inline-block h-3 w-3" />
                    Your codebase files are available as tabs in the code editor.
                  </p>
                </div>
              ) : (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".js,.ts,.jsx,.tsx,.py,.java,.cpp,.c,.h,.json,.md,.txt,text/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="h-7 w-full border-gray-600 bg-transparent text-xs text-gray-300 hover:bg-gray-800"
                  >
                    <Code className="mr-1 h-3 w-3" />
                    Upload Files
                  </Button>
                  {workspaceContext.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {workspaceContext.map((file) => (
                        <button
                          key={file.path}
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
          )}
        </CardContent>
      </Card>
    </>
  )
})
