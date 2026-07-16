"use client"

import { memo, type Dispatch, type RefObject, type SetStateAction } from "react"
import {
  ChevronDown,
  ChevronUp,
  Clock,
  HardDrive,
  HelpCircle,
  Lightbulb,
  PanelLeftClose,
  Target,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer"
import { difficultyColorClass } from "@/lib/ui/difficulty-colors"
import type { Scenario } from "@/lib/scenarios"
import type { BugSymptom } from "@/lib/scenarios/types"
import type { GuidedLabConfig } from "@/lib/bugfix/guided-lab/types"
import type { WorkspaceContextFile } from "../_types"
import { BugfixBrief } from "./_sub/BugfixBrief"
import { ProblemHintSection } from "./_sub/ProblemHintSection"
import { BugfixReflectionPanel } from "./_sub/BugfixReflectionPanel"
import { WorkspaceFileViewer } from "./_sub/WorkspaceFileViewer"
import { GuidedLabRail } from "./guided-lab/GuidedLabRail"

export type BugfixReflectionField = "hypothesis" | "rootCause" | "prevention"

type ScenarioPanelDetails = Scenario & {
  expectedBehavior?: string
  fuzzyStatement?: string
  hints?: string[]
  optimalComplexity?: {
    space: string
    time: string
  }
  reproductionSteps?: string[]
  successCriteria?: string[]
  task?: string
  symptom?: BugSymptom
  userReport?: string
  visibleLogs?: string[]
  guidedLab?: GuidedLabConfig
}

export interface ProblemColumnCtx {
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
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export const ProblemColumn = memo(function ProblemColumn({
  ctx,
  collapsed = false,
  onToggleCollapse,
}: ProblemColumnProps) {
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
  const scenarioDetails = selectedScenario as ScenarioPanelDetails | null
  const reproductionSteps = scenarioDetails?.reproductionSteps ?? []
  const successCriteria = scenarioDetails?.successCriteria ?? []
  const visibleLogs = scenarioDetails?.visibleLogs ?? []
  const guidedLab = scenarioDetails?.guidedLab

  return (
    <>
      {/* Left: Problem Description / File Upload
                      - Hidden in focus mode (desktop)
                      - Only visible when activePanel === 'problem' (mobile)
                  */}
      <Card
        className={`glass-effect border-border bg-card/50 order-1 h-full flex-col gap-0 overflow-hidden py-0 ${
          focusMode
            ? "hidden" // Always hidden in focus mode - no responsive override
            : collapsed
              ? // Collapsed is a desktop affordance: hide at lg, still tab-able on mobile
                activePanel === "problem"
                ? "flex lg:hidden"
                : "hidden"
              : activePanel === "problem"
                ? "flex"
                : "hidden lg:flex"
        }`}
      >
        {/* IMPROVED: Enhanced header with title and difficulty badge */}
        <CardHeader className="border-border/50 flex-shrink-0 border-b px-4 pt-3 pb-2">
          <CardTitle className="text-foreground flex w-full min-w-0 items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <Target className="text-accent h-5 w-5 flex-shrink-0" />
              <span className="truncate text-base font-semibold">
                {selectedScenario?.title || "Problem"}
              </span>
            </div>
            <div className="flex flex-shrink-0 items-center gap-1.5">
              {selectedScenario && (
                <Badge className={`text-xs ${difficultyColorClass(selectedScenario.difficulty)}`}>
                  {selectedScenario.difficulty}
                </Badge>
              )}
              {onToggleCollapse && (
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="text-muted-foreground hover:bg-muted hover:text-foreground hidden h-6 w-6 items-center justify-center rounded transition-colors lg:inline-flex"
                  title="Collapse panel"
                  aria-label="Collapse problem panel"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        {/* IMPROVED: Better spacing and typography for readability */}
        <CardContent className="min-h-0 flex-1 space-y-5 overflow-y-auto p-3">
          {guidedLab && selectedScenario && (
            <div className="border-border/60 bg-muted/20 rounded-lg border p-3">
              <GuidedLabRail config={guidedLab} scenarioId={selectedScenario.id} />
            </div>
          )}
          {selectedScenario && (
            <>
              {/* Bug-fix: one brief, single source of truth. Everything else keeps
                  the classic Description block. */}
              {isBugfix ? (
                <BugfixBrief
                  task={scenarioDetails?.task}
                  symptom={scenarioDetails?.symptom}
                  acceptance={successCriteria}
                  report={
                    realInterviewMode && scenarioDetails?.fuzzyStatement
                      ? scenarioDetails.fuzzyStatement
                      : selectedScenario.problemStatement
                  }
                  fallbackStatement={
                    realInterviewMode && scenarioDetails?.fuzzyStatement
                      ? scenarioDetails.fuzzyStatement
                      : selectedScenario.problemStatement
                  }
                  isFuzzy={Boolean(realInterviewMode && scenarioDetails?.fuzzyStatement)}
                />
              ) : (
                <div className="space-y-2">
                  <h3 className="text-accent flex items-center gap-2 text-sm font-semibold tracking-wide uppercase">
                    <span className="bg-accent h-4 w-1 rounded-full"></span>
                    Description
                    {realInterviewMode && scenarioDetails?.fuzzyStatement && (
                      <Badge className="border-cyan-400/30 bg-cyan-400/10 text-xs text-cyan-200">
                        Real Interview Mode
                      </Badge>
                    )}
                  </h3>
                  <MarkdownRenderer
                    content={
                      realInterviewMode && scenarioDetails?.fuzzyStatement
                        ? scenarioDetails.fuzzyStatement
                        : selectedScenario.problemStatement
                    }
                    className="text-foreground text-base leading-relaxed"
                  />
                </div>
              )}

              {/* Repro steps and logs are evidence, not narrative: they stay, but
                  below the brief and without a second telling of the incident. */}
              {isBugfix && (reproductionSteps.length > 0 || visibleLogs.length > 0) && (
                <div className="space-y-3">
                  {reproductionSteps.length > 0 && (
                    <div>
                      <p className="text-muted-foreground/70 mb-1 font-mono text-[10px] tracking-[0.14em] uppercase">
                        Repro steps
                      </p>
                      <ol className="text-muted-foreground list-decimal space-y-1 pl-4 text-[12px]">
                        {reproductionSteps.map((step: string, index: number) => (
                          <li key={`${step}-${index}`}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                  {visibleLogs.length > 0 && (
                    <div>
                      <p className="text-muted-foreground/70 mb-1 font-mono text-[10px] tracking-[0.14em] uppercase">
                        Visible logs
                      </p>
                      <div className="border-border/60 bg-background/50 text-muted-foreground space-y-1 overflow-x-auto rounded border p-2 font-mono text-[11px] whitespace-pre">
                        {visibleLogs.map((log: string, index: number) => (
                          <p key={`${log}-${index}`}>{log}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {isBugfix && isInterviewStarted && bugfixReflection && (
                <BugfixReflectionPanel
                  bugfixReflection={bugfixReflection}
                  onBugfixReflectionChange={onBugfixReflectionChange}
                  onBugfixReflectionCommit={onBugfixReflectionCommit}
                />
              )}

              {/* Debugging signals - shown independently, right after description */}
              {/* Only show hints when user has written meaningful code beyond starter code */}
              {/* Use hintFetchStatus to prevent flickering - section stays visible after first fetch attempt */}
              {isInterviewStarted && hintFetchStatus !== "idle" && (
                <ProblemHintSection
                  isBugfix={isBugfix}
                  ragHints={ragHints}
                  hintFetchStatus={hintFetchStatus}
                  hintFeedback={hintFeedback}
                  revealedAIHintIndices={revealedAIHintIndices}
                  selectedScenarioId={selectedScenario?.id}
                  hintAgent={hintAgent}
                  fetchRAGHints={fetchRAGHints}
                  submitHintFeedback={submitHintFeedback}
                  setRevealedAIHintIndices={setRevealedAIHintIndices}
                />
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
                        <div key={i} className="border-border/50 bg-muted/70 rounded-lg border p-3">
                          <div className="space-y-1.5 font-mono text-sm">
                            <div className="flex items-start gap-2">
                              <span className="text-muted-foreground min-w-[55px] font-medium">
                                Input:
                              </span>
                              <code className="text-foreground break-all">{ex.input}</code>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-muted-foreground min-w-[55px] font-medium">
                                Output:
                              </span>
                              <code className="text-foreground break-all">{ex.output}</code>
                            </div>
                          </div>
                          {ex.explanation && (
                            <div className="border-border/50 text-muted-foreground mt-2 border-t pt-2 text-sm italic">
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
                    <ul className="text-muted-foreground space-y-1.5">
                      {selectedScenario.constraints.slice(0, 4).map((c, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-accent mt-0.5">•</span>
                          <code className="text-muted-foreground font-mono">{c}</code>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {/* Optimal Approach - Collapsible (DSA only) */}
              {selectedScenario.type === "dsa" && scenarioDetails?.optimalComplexity && (
                <div className="border-border/60 bg-muted/40 rounded-md border">
                  <button
                    onClick={() => setShowOptimalApproach(!showOptimalApproach)}
                    className="hover:bg-muted/30 flex w-full items-center justify-between rounded-md px-3 py-2 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="bg-accent h-4 w-1 rounded-full"></span>
                      <span className="text-foreground text-sm font-medium">Target complexity</span>
                    </div>
                    {showOptimalApproach ? (
                      <ChevronUp className="text-muted-foreground h-4 w-4" />
                    ) : (
                      <ChevronDown className="text-muted-foreground h-4 w-4" />
                    )}
                  </button>

                  {showOptimalApproach && (
                    <div className="animate-in slide-in-from-top-2 px-3 pt-0.5 pb-3 duration-200">
                      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Clock className="text-muted-foreground h-3.5 w-3.5" />
                          <code className="text-accent font-mono">
                            {scenarioDetails.optimalComplexity.time}
                          </code>
                        </span>
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <HardDrive className="text-muted-foreground h-3.5 w-3.5" />
                          <code className="text-accent font-mono">
                            {scenarioDetails.optimalComplexity.space}
                          </code>
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-2 text-xs">
                        Aim for this before checking hints.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Legacy static hints are kept hidden during interviews so generated insights are the single hint surface. */}
              {!isInterviewStarted &&
                scenarioDetails?.hints &&
                scenarioDetails.hints.length > 0 && (
                  <div className="border-border mt-3 border-t pt-3">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-foreground flex items-center space-x-1 text-xs font-semibold">
                        <Lightbulb className="h-3 w-3 text-amber-300" />
                        <span>
                          Hints ({revealedHintIndices.size}/{revealedHints} unlocked)
                        </span>
                      </h3>
                      {revealedHints < scenarioDetails.hints.length && (
                        <span className="text-muted-foreground text-xs">
                          Next in {Math.ceil((180 - (elapsedTime % 180)) / 60)}m
                        </span>
                      )}
                    </div>
                    {revealedHints > 0 ? (
                      <div className="space-y-2">
                        {scenarioDetails.hints
                          .slice(0, revealedHints)
                          .map((hint: string, i: number) => {
                            const isHintRevealed = revealedHintIndices.has(i)
                            return (
                              <button
                                type="button"
                                key={i}
                                className={`w-full cursor-pointer rounded border border-amber-400/20 bg-amber-500/10 p-2 text-left transition-all focus:ring-2 focus:ring-amber-300 focus:outline-none ${!isHintRevealed ? "hover:bg-amber-500/15" : ""}`}
                                onClick={() => {
                                  if (!isHintRevealed) {
                                    setRevealedHintIndices((prev) => new Set([...prev, i]))
                                  }
                                }}
                              >
                                {isHintRevealed ? (
                                  <p className="text-xs leading-relaxed text-amber-200">
                                    <span className="font-semibold">Hint {i + 1}:</span> {hint}
                                  </p>
                                ) : (
                                  <div className="relative">
                                    <p className="pointer-events-none text-xs leading-relaxed text-amber-200/30 blur-sm select-none">
                                      <span className="font-semibold">Hint {i + 1}:</span>{" "}
                                      {hint.substring(0, 50)}...
                                    </p>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <div className="flex items-center gap-1 rounded border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-300">
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
                      <p className="text-muted-foreground text-xs italic">
                        Hints will unlock every 3 minutes as you work on the problem
                      </p>
                    )}
                  </div>
                )}
            </>
          )}

          {/* Upload Codebase Section - Only show for non-DSA scenarios */}
          {selectedScenario && selectedScenario.type !== "dsa" && (
            <WorkspaceFileViewer
              selectedScenario={selectedScenario}
              workspaceContext={workspaceContext}
              fileInputRef={fileInputRef}
              handleFileUpload={handleFileUpload}
              setSelectedFile={setSelectedFile}
              setIsCodeViewerOpen={setIsCodeViewerOpen}
            />
          )}
        </CardContent>
      </Card>
    </>
  )
})
