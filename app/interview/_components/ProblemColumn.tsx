"use client"

import { useGuidedLabStore } from "@/lib/stores/guided-lab-store"

import { memo, type Dispatch, type RefObject, type SetStateAction } from "react"
import { ChevronDown, ChevronUp, Clock, HardDrive, HelpCircle, Lightbulb } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer"
import type { Scenario } from "@/lib/scenarios"
import { TASK_DOCUMENT_PATH } from "@/lib/scenarios/workspace-assignment"
import type { GuidedLabConfig } from "@/lib/bugfix/guided-lab/types"
import type { WorkspaceContextFile } from "../_types"
import { WorkspaceTaskBrief } from "./_sub/WorkspaceTaskBrief"
import { ProblemHintSection } from "./_sub/ProblemHintSection"
import { WorkspaceFileViewer } from "./_sub/WorkspaceFileViewer"
import { WorkspaceFilesPanel } from "./_sub/WorkspaceFilesPanel"
import { GuidedLabRail } from "./guided-lab/GuidedLabRail"
import { isWorkspaceScenario } from "../_utils/workspace"

type ScenarioPanelDetails = Scenario & {
  expectedBehavior?: string
  fuzzyStatement?: string
  hints?: string[]
  optimalComplexity?: {
    space: string
    time: string
  }
  guidedLab?: GuidedLabConfig
}

export interface ProblemColumnCtx {
  activePanel: "problem" | "editor" | "chat"
  /** Path of the file open in the editor, so the tree can mark it active. */
  activeWorkspacePath: string | null
  /** Opens a file in the editor. Also records bugfix file-inspection evidence. */
  onWorkspaceFileSelect: (file: WorkspaceContextFile, options?: { readable?: boolean }) => void
  elapsedTime: number
  fetchRAGHints: () => Promise<void>
  fileInputRef: RefObject<HTMLInputElement | null>
  focusMode: boolean
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  hintAgent: { revealHint: (hintId: string) => void }
  hintFetchStatus: "idle" | "loading" | "success" | "error"
  hintsStale: boolean
  isInterviewStarted: boolean
  ragHints: Array<{ level: number; hint: string; id?: string; generationId?: string }>
  realInterviewMode: boolean
  revealedAIHintIndices: Set<number>
  revealedHintIndices: Set<number>
  revealedHints: number
  selectedScenario: Scenario | null
  setIsCodeViewerOpen: (open: boolean) => void
  setRevealedAIHintIndices: Dispatch<SetStateAction<Set<number>>>
  setRevealedHintIndices: Dispatch<SetStateAction<Set<number>>>
  setSelectedFile: (file: WorkspaceContextFile | null) => void
  setShowOptimalApproach: (show: boolean) => void
  showOptimalApproach: boolean
  workspaceContext: WorkspaceContextFile[]
}

interface ProblemColumnProps {
  ctx: ProblemColumnCtx
}

export const ProblemColumn = memo(function ProblemColumn({ ctx }: ProblemColumnProps) {
  const {
    activeWorkspacePath,
    onWorkspaceFileSelect,
    elapsedTime,
    fetchRAGHints,
    fileInputRef,
    handleFileUpload,
    hintAgent,
    hintFetchStatus,
    hintsStale,
    isInterviewStarted,
    ragHints,
    realInterviewMode,
    revealedAIHintIndices,
    revealedHintIndices,
    revealedHints,
    selectedScenario,
    setIsCodeViewerOpen,
    setRevealedAIHintIndices,
    setRevealedHintIndices,
    setSelectedFile,
    setShowOptimalApproach,
    showOptimalApproach,
    workspaceContext,
  } = ctx
  const isBugfix = selectedScenario?.type === "bugfix"
  const scenarioDetails = selectedScenario as ScenarioPanelDetails | null
  const guidedLab = scenarioDetails?.guidedLab
  const isDebuggingTask = isBugfix || selectedScenario?.type === "add-functionality"
  const taskFile = isDebuggingTask
    ? (workspaceContext.find((file) => file.path === TASK_DOCUMENT_PATH && file.role === "docs") ??
      selectedScenario?.workspace?.files.find(
        (file) => file.path === TASK_DOCUMENT_PATH && file.role === "docs" && !file.hidden
      ))
    : undefined

  // The explorer only earns its own region when there is a real codebase behind it.
  // Upload-style scenarios keep the inline uploader at the foot of the brief.
  const showFileTree = isWorkspaceScenario(selectedScenario) && workspaceContext.length > 0
  const initialBriefSize = taskFile && !guidedLab ? 48 : 62

  return (
    <>
      <Card className="bg-card flex h-full flex-col gap-0 overflow-hidden rounded-none border-0 py-0 shadow-none">
        <CardHeader className="flex-shrink-0 px-4 pt-4 pb-3">
          <CardTitle className="text-foreground flex w-full min-w-0 items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="text-base leading-snug font-semibold">
                {selectedScenario?.title || "Problem"}
              </h2>
            </div>
            <div className="flex flex-shrink-0 items-center gap-1.5">
              {selectedScenario && (
                <Badge className="border-border text-muted-foreground bg-transparent text-xs">
                  {selectedScenario.difficulty}
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        {/* The brief scrolls; the explorer below it is pinned and independently
            resizable, so reading the incident never pushes the codebase off screen
            and a deep tree never buries the task. */}
        <CardContent className="min-h-0 flex-1 overflow-hidden p-0">
          <ResizablePanelGroup direction="vertical" className="h-full">
            <ResizablePanel defaultSize={showFileTree ? initialBriefSize : 100} minSize={30}>
              <div className="h-full space-y-5 overflow-y-auto px-4 pb-4">
                {guidedLab && selectedScenario && (
                  <div className="border-border/60 bg-muted/20 rounded-lg border p-3">
                    {taskFile && (
                      <button
                        type="button"
                        className="text-accent-strong focus-visible:ring-ring mb-2 min-h-11 underline underline-offset-4 focus-visible:ring-2"
                        onClick={() => onWorkspaceFileSelect(taskFile, { readable: true })}
                      >
                        Open task.md for the full incident and product contract
                      </button>
                    )}
                    <GuidedLabRail config={guidedLab} scenarioId={selectedScenario.id} />
                  </div>
                )}
                {selectedScenario && (
                  <>
                    {guidedLab ? null : isDebuggingTask && taskFile ? (
                      <WorkspaceTaskBrief
                        summary={selectedScenario.task ?? selectedScenario.description}
                        onOpenTask={() => onWorkspaceFileSelect(taskFile, { readable: true })}
                      />
                    ) : (
                      <div className="space-y-2">
                        <h3 className="text-foreground flex items-center gap-2 text-sm font-semibold tracking-wide uppercase">
                          Description
                          {realInterviewMode && scenarioDetails?.fuzzyStatement && (
                            <Badge className="border-accent/30 bg-accent/10 text-foreground-strong text-xs">
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

                    {selectedScenario.type === "dsa" &&
                      selectedScenario.examples &&
                      selectedScenario.examples.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="text-foreground flex items-center gap-2 text-sm font-semibold tracking-wide uppercase">
                            Examples
                          </h3>
                          <div className="space-y-3">
                            {selectedScenario.examples.slice(0, 2).map((ex, i) => (
                              <div
                                key={i}
                                className="border-border/50 bg-muted/70 rounded-lg border p-3"
                              >
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

                    {selectedScenario.type === "dsa" &&
                      selectedScenario.constraints &&
                      selectedScenario.constraints.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="text-foreground flex items-center gap-2 text-sm font-semibold tracking-wide uppercase">
                            Constraints
                          </h3>
                          <ul className="text-muted-foreground space-y-1.5">
                            {selectedScenario.constraints.slice(0, 4).map((c, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <span className="text-foreground mt-0.5">•</span>
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
                            <span className="text-foreground text-sm font-medium">
                              Target complexity
                            </span>
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
                                <code className="text-foreground font-mono">
                                  {scenarioDetails.optimalComplexity.time}
                                </code>
                              </span>
                              <span className="text-muted-foreground flex items-center gap-1.5">
                                <HardDrive className="text-muted-foreground h-3.5 w-3.5" />
                                <code className="text-foreground font-mono">
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

                    {/* Signals belong after the question material, so this optional
                        action does not interrupt a candidate's first read. */}
                    {isInterviewStarted && (
                      <ProblemHintSection
                        isBugfix={isBugfix}
                        ragHints={ragHints}
                        hintFetchStatus={hintFetchStatus}
                        revealedAIHintIndices={revealedAIHintIndices}
                        hintAgent={hintAgent}
                        hintsStale={hintsStale}
                        fetchRAGHints={fetchRAGHints}
                        setRevealedAIHintIndices={setRevealedAIHintIndices}
                      />
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
                                          useGuidedLabStore
                                            .getState()
                                            .observe(selectedScenario.id, {
                                              kind: "hint",
                                              text: hint.slice(0, 3000),
                                              truncated: hint.length > 3000,
                                            })
                                        }
                                      }}
                                    >
                                      {isHintRevealed ? (
                                        <p className="text-xs leading-relaxed text-amber-200">
                                          <span className="font-semibold">Hint {i + 1}:</span>{" "}
                                          {hint}
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

                {/* Upload path only. A prepared workspace gets the real tree below,
              not a note claiming the files live somewhere else. */}
                {selectedScenario && selectedScenario.type !== "dsa" && !showFileTree && (
                  <WorkspaceFileViewer
                    selectedScenario={selectedScenario}
                    workspaceContext={workspaceContext}
                    fileInputRef={fileInputRef}
                    handleFileUpload={handleFileUpload}
                    setSelectedFile={setSelectedFile}
                    setIsCodeViewerOpen={setIsCodeViewerOpen}
                  />
                )}
              </div>
            </ResizablePanel>

            {showFileTree && (
              <>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={100 - initialBriefSize} minSize={12} collapsible>
                  <WorkspaceFilesPanel
                    files={workspaceContext}
                    activePath={activeWorkspacePath}
                    onFileSelect={onWorkspaceFileSelect}
                    tourAnchor={isBugfix ? "workspace-files" : undefined}
                  />
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        </CardContent>
      </Card>
    </>
  )
})
