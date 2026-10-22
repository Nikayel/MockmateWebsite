"use client"

import { seedLabCheckpoint } from "@/lib/bugfix/guided-lab/assessment/capture"

import { memo, useMemo, useEffect, useRef, type RefObject, type ReactNode } from "react"
import { Code, PlayCircle } from "lucide-react"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ErrorBoundary } from "@/components/error-boundary"
import { type CodeMirrorEditorRef } from "@/components/editor"
import {
  type ConsoleOutput,
  type TestResult,
  type TestSummary,
} from "@/components/interview/CodeConsole"
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
import { EditorActionsMenu } from "./EditorActionsMenu"
import { EditorLanguageControl } from "./EditorLanguageControl"
import { MarkdownFileView } from "@/components/editor/MarkdownFileView"
import { resolveVisibleTestSources } from "@/lib/interview/test-source/resolve-visible-test-sources"

interface EditorColumnProps {
  toolbar?: ReactNode
  activePanel: "problem" | "editor" | "chat"
  selectedScenario: Scenario | null
  activeWorkspaceFile: WorkspaceContextFile | null | undefined
  documentPreviewPath?: string | null
  onDocumentPreviewChange?: (preview: boolean) => void
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
  workspaceContext?: WorkspaceContextFile[]
  editorRef?: RefObject<CodeMirrorEditorRef | null>
  onGoToLine?: (lineNum: number) => void
  onWorkspaceFileSelect?: (file: WorkspaceContextFile) => void
}

export const EditorColumn = memo(function EditorColumn({
  toolbar,
  activePanel,
  selectedScenario,
  activeWorkspaceFile,
  documentPreviewPath,
  onDocumentPreviewChange,
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
  workspaceContext = [],
  editorRef,
  onGoToLine,
  onWorkspaceFileSelect,
}: EditorColumnProps) {
  const isWorkspace = isWorkspaceScenario(selectedScenario) && workspaceContext.length > 0
  const activeRoleStyle = activeWorkspaceFile
    ? getWorkspaceFileRoleStyle(activeWorkspaceFile.role)
    : null
  const ActiveRoleIcon = activeRoleStyle?.Icon

  const guidedLabActiveForScenario = useGuidedLabStore(
    (state) => Boolean(state.config) && state.scenarioId === selectedScenario?.id
  )
  const sourceSnapshot = workspaceContext
    .filter((file) => file.role === "editable")
    .map((file) => `${file.path}:${file.content}`)
    .join("\n")
  const captureGeneration = useGuidedLabStore((state) => state.captureGeneration)
  useEffect(() => {
    if (selectedScenario && guidedLabActiveForScenario)
      seedLabCheckpoint(selectedScenario.id, workspaceContext)
  }, [selectedScenario, guidedLabActiveForScenario, workspaceContext, captureGeneration])
  const previousSource = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (
      previousSource.current !== undefined &&
      previousSource.current !== sourceSnapshot &&
      selectedScenario
    ) {
      useGuidedLabStore.getState().invalidateVerification(selectedScenario.id)
    }
    previousSource.current = sourceSnapshot
  }, [sourceSnapshot, selectedScenario])
  const revealedSuites = useRevealedTestSuites()
  const guideFiltered = guidedLabActiveForScenario
  const allowedSuites = new Set(
    revealedSuites.flatMap((suite) => [suite, suite.replace(/^visible /, "hidden ")])
  )
  const visibleTestResults = guideFiltered
    ? testResults.filter((result) => allowedSuites.has(String(result.input ?? "")))
    : testResults
  const visiblePassed = visibleTestResults.filter((result) => result.passed).length
  const testSources = useMemo(
    () =>
      resolveVisibleTestSources(
        testResults,
        workspaceContext,
        isWorkspaceScenario(selectedScenario) ? selectedScenario.workspace.visibleTestPaths : []
      ),
    [testResults, workspaceContext, selectedScenario]
  )
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
      ? "Results cover the current and completed phases. Repair any failing checks before continuing."
      : undefined
  })()

  // Block Submit while a guided lab for this scenario is unfinished, so the user
  // can't submit before discovering and fixing the later bug.
  const guidedLabComplete = useGuidedLabComplete()
  const guidedLabBlocksSubmit = guidedLabActiveForScenario && !guidedLabComplete

  const editorSurface = (
    <>
      <ErrorBoundary>
        <MarkdownFileView
          fileName={activeWorkspaceFile?.path ?? ""}
          content={code}
          preview={
            onDocumentPreviewChange ? documentPreviewPath === activeWorkspaceFile?.path : undefined
          }
          onPreviewChange={onDocumentPreviewChange}
        >
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
        </MarkdownFileView>
      </ErrorBoundary>
      {selectedScenario &&
        !isInterviewStarted &&
        !showScenarioBrowser &&
        activeWorkspaceFile?.role !== "docs" && (
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
      className={`editor-panel-card workspace-panel border-border bg-card relative order-2 h-full min-w-0 flex-col gap-0 overflow-hidden py-0 ${
        activePanel === "editor" ? "flex" : "hidden lg:flex"
      }`}
    >
      <CardHeader className="border-border block shrink-0 border-b p-1 [.border-b]:pb-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-1">
          <div className="min-w-0 flex-1">
            {isWorkspace ? (
              <div className="flex min-h-11 w-full min-w-0 items-center justify-between">
                <div
                  className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2"
                  title={activeWorkspaceFile?.path}
                >
                  {activeWorkspaceFile && activeRoleStyle && ActiveRoleIcon ? (
                    <>
                      <ActiveRoleIcon
                        className="text-muted-foreground h-3.5 w-3.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="text-foreground truncate text-xs">
                        {activeWorkspaceFile.path}
                      </span>
                      <span className="border-border text-muted-foreground hidden shrink-0 rounded border px-1.5 py-0.5 text-[11px] leading-none xl:inline">
                        {activeRoleStyle.label}
                      </span>
                      {hasWorkspaceFileEdits(activeWorkspaceFile) && (
                        <span
                          className="bg-accent h-1.5 w-1.5 shrink-0 rounded-full"
                          title="Unsaved edit"
                          aria-label="Unsaved edit"
                        />
                      )}
                    </>
                  ) : (
                    <span className="text-muted-foreground truncate text-xs">Workspace files</span>
                  )}
                </div>
                <EditorActionsMenu
                  onResetActiveFile={
                    activeWorkspaceFile?.role === "editable" ? onResetActiveFile : undefined
                  }
                  onResetWorkspace={onResetWorkspace}
                />
              </div>
            ) : (
              <div className="flex min-h-11 items-center justify-between px-2">
                <CardTitle className="text-foreground flex w-full items-center justify-between text-xs">
                  <div className="flex items-center space-x-1">
                    <Code className="text-muted-foreground h-3 w-3" />
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
                </CardTitle>
              </div>
            )}
          </div>
          <EditorLanguageControl
            value={selectedLanguage}
            onChange={onSelectedLanguageChange}
            isWorkspace={isWorkspaceScenario(selectedScenario)}
          />
          <div className="hidden lg:block">{toolbar}</div>
        </div>
      </CardHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2">
        {/* The file tree lives in the problem column now, so the editor keeps the
            whole width of the one column the candidate types in. */}
        <div className="workspace-code-surface border-border relative min-h-0 flex-1 overflow-auto rounded border">
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
            testSources={testSources}
            onOpenTestSource={
              onWorkspaceFileSelect
                ? (path) => {
                    const file = workspaceContext.find(
                      (entry) => entry.path === path && !entry.hidden
                    )
                    if (file) onWorkspaceFileSelect(file)
                  }
                : undefined
            }
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
    </Card>
  )
})
