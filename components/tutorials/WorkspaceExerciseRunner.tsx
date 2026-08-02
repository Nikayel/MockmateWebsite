"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { CheckCircle2, Lock, Play, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CodeMirrorEditor, CodeMirrorErrorBoundary } from "@/components/editor"
import { TestResultsPanel } from "@/components/interview/TestResultsPanel"
import { ColdStartNote } from "./ColdStartNote"
import { ExerciseBrief, type ExerciseBriefMeta } from "./ExerciseBrief"
import { ExerciseLayout } from "./ExerciseLayout"
import { SqlDataPreview } from "./SqlDataPreview"
import { SqlWorkspaceResult } from "./SqlWorkspaceResult"
import { useExerciseRun } from "./useExerciseRun"
import type { WorkspaceScenarioFile } from "@/lib/scenarios/types"
import type { LessonSection, PythonExercise } from "@/lib/tutorials/types"
import { LessonNotice } from "./LessonNotice"

/**
 * Workspace (multi-file) exercise runner. Adapted from `BuildStation`: file tabs (editable files
 * are editable, everything else is locked/readonly), and only the EDITABLE files' content is sent
 * as `workspaceFiles` to the client runner. Hidden files (the runner, hidden tests, package
 * `__init__.py`s) are never shown — so hidden-test source never leaks — but still execute. Grading
 * shares `useExerciseRun`; the Pyodide runner reports `__WORKSPACE_TEST_RESULTS__:` rows.
 */
/** The learner's in-progress editor state, lifted so it can outlive a runner unmount. */
export interface WorkspaceEditorState {
  /** Editable file path → current content. */
  edits: Record<string, string>
  /** The open file tab. */
  activePath: string
}

export interface WorkspaceExerciseRunnerProps {
  exercise: PythonExercise
  workspace: NonNullable<PythonExercise["workspace"]>
  onPass?: () => void
  /** Fires after each graded run with its pass/fail (drives Sable). */
  onRunResult?: (passed: boolean) => void
  /** Fires after each graded run with the % of tests passed — the real `lastExerciseScore`. */
  onScore?: (score: number) => void
  /** Which lesson phase this runner is mounted in. Tags telemetry; defaults to `"practice"`. */
  section?: LessonSection
  /** Which browser engine warms — drives the cold-start copy. Defaults to "python" (call sites unchanged). */
  engine?: "python" | "sql"
  /**
   * SQL workspaces only: the seed DB, shown as an input-table preview above the editor. Sourced from
   * `SqlWorkspaceGrading.seedSql` at the call site (the `workspace` prop is Python-typed and lacks
   * it). Omitted for Python workspaces, where the preview renders nothing.
   */
  seedSql?: string
  /** Phase framing for the left brief (eyebrow + title + resurfaces chip). */
  brief?: ExerciseBriefMeta
  /**
   * Persisted editor state. When provided, seeds the initial edits + open tab and is kept in sync via
   * `onPersistState`, so switching sections (which unmounts this runner) doesn't discard the learner's
   * work — the parent re-seeds it on remount. Both the Python and SQL players pass it; a caller that
   * omits it leaves the runner fully self-managed.
   */
  persistedState?: WorkspaceEditorState
  onPersistState?: (state: WorkspaceEditorState) => void
}

export function WorkspaceExerciseRunner({
  exercise,
  workspace,
  onPass,
  onRunResult,
  onScore,
  section = "practice",
  engine = "python",
  seedSql,
  brief,
  persistedState,
  onPersistState,
}: WorkspaceExerciseRunnerProps) {
  const editablePaths = useMemo(() => new Set(workspace.editableFilePaths), [workspace])
  const isEditable = (file: WorkspaceScenarioFile) =>
    file.role === "editable" || editablePaths.has(file.path)

  const visibleFiles = useMemo(() => workspace.files.filter((file) => !file.hidden), [workspace])

  // The starter content of every editable file — the reset target and the "dirty" baseline.
  const starterEdits = useMemo(() => {
    const seed: Record<string, string> = {}
    for (const file of workspace.files) {
      if (file.role === "editable" || workspace.editableFilePaths.includes(file.path)) {
        seed[file.path] = file.content
      }
    }
    return seed
  }, [workspace])

  // Seeded from the parent's cache (if any) so edits survive a section switch; the parent stays
  // authoritative on remount, but this internal state is the live source of truth while mounted.
  const [edits, setEditsState] = useState<Record<string, string>>(
    () => persistedState?.edits ?? starterEdits
  )
  const [activePath, setActivePathState] = useState<string>(
    () => persistedState?.activePath ?? workspace.primaryFilePath
  )

  // Mirror every edit/tab change up so the parent's cache stays current. Imperative (not an effect)
  // to avoid a mount-time write-back loop; a no-op when the caller doesn't pass `onPersistState`.
  const applyEdits = (next: Record<string, string>) => {
    setEditsState(next)
    onPersistState?.({ edits: next, activePath })
  }
  const selectPath = (path: string) => {
    setActivePathState(path)
    onPersistState?.({ edits, activePath: path })
  }

  // SQL-only: after each graded Run, re-run the same seed + script (display-only, no assertions) to
  // show the RESULTING tables. `runNonce` triggers a fresh preview; `submittedScript` pins the exact
  // content that ran, so later typing doesn't desync the shown tables from the graded result.
  const [runNonce, setRunNonce] = useState(0)
  const [submittedScript, setSubmittedScript] = useState("")

  const isDirty = useMemo(
    () => Object.keys(starterEdits).some((path) => edits[path] !== starterEdits[path]),
    [edits, starterEdits]
  )

  const { running, warming, results, runError, lastRunPassed, lastScore, run } = useExerciseRun(
    exercise,
    {
      onPass,
      onResult: onRunResult,
      section,
    }
  )

  // Report the graded score upward whenever it changes, so the player persists the real pass
  // rate rather than a constant.
  const reportedScore = useRef<number | null>(null)
  useEffect(() => {
    if (lastScore !== null && lastScore !== reportedScore.current) {
      reportedScore.current = lastScore
      onScore?.(lastScore)
    }
  }, [lastScore, onScore])

  const activeFile =
    visibleFiles.find((file) => file.path === activePath) ?? visibleFiles[0] ?? null

  const handleRun = () => {
    const workspaceFiles = workspace.files
      .filter(isEditable)
      .map((file) => ({ path: file.path, content: edits[file.path] ?? file.content }))
    void run({ workspaceFiles })

    // SQL workspaces: capture the primary script that just ran and bump the nonce so the resulting
    // tables refresh alongside the test results. No-op for Python (the panel never renders).
    if (engine === "sql") {
      const primaryFile = workspace.files.find((file) => file.path === workspace.primaryFilePath)
      setSubmittedScript(edits[workspace.primaryFilePath] ?? primaryFile?.content ?? "")
      setRunNonce((n) => n + 1)
    }
  }

  return (
    <ExerciseLayout
      aside={
        <ExerciseBrief
          eyebrow={brief?.eyebrow ?? "Apply"}
          title={brief?.title ?? "Your turn"}
          resurfaces={brief?.resurfaces}
          prompt={exercise.prompt}
          goal={`Edit ${workspace.primaryFilePath}, then run the tests. A failing test shows exactly what's expected.`}
          // SQL workspaces: preview the seeded input tables. No-op (renders nothing) for Python.
          data={
            <SqlDataPreview
              seedSql={seedSql}
              title="Schema & data"
              defaultOpen={!brief?.resurfaces}
            />
          }
        />
      }
    >
      <div className="border-border overflow-hidden rounded-lg border">
        <div
          role="tablist"
          aria-label="Workspace files"
          className="border-border bg-muted/40 flex flex-wrap gap-1 border-b px-2 py-1.5"
        >
          {visibleFiles.map((file) => {
            const selected = activeFile?.path === file.path
            return (
              <button
                key={file.path}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => selectPath(file.path)}
                className={[
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-xs transition-colors",
                  selected
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {!isEditable(file) && <Lock className="h-3 w-3" aria-label="read-only" />}
                {file.path}
              </button>
            )
          })}
        </div>

        {activeFile && (
          <CodeMirrorErrorBoundary>
            <CodeMirrorEditor
              value={
                isEditable(activeFile)
                  ? (edits[activeFile.path] ?? activeFile.content)
                  : activeFile.content
              }
              onChange={
                isEditable(activeFile)
                  ? (value) => applyEdits({ ...edits, [activeFile.path]: value })
                  : undefined
              }
              language={activeFile.language}
              readOnly={!isEditable(activeFile)}
              autoHeight
              minHeight={340}
              // Cap at ~22 lines (22px line-height + 16px content padding), then scroll internally.
              maxHeight={500}
            />
          </CodeMirrorErrorBoundary>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={handleRun} disabled={running} className="gap-2">
          <Play className="h-4 w-4" />
          {warming
            ? engine === "sql"
              ? "Starting SQL engine…"
              : "Starting Python…"
            : running
              ? "Running…"
              : "Run tests"}
        </Button>
        <ColdStartNote warming={warming} engine={engine} />
        <Button
          variant="ghost"
          onClick={() => applyEdits(starterEdits)}
          disabled={!isDirty}
          className="gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
        {lastRunPassed === true && (
          <span className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            All tests passed
          </span>
        )}
      </div>

      {runError && <LessonNotice>{runError}</LessonNotice>}

      <TestResultsPanel results={results} isRunning={running} />

      {/* SQL workspaces: show the actual tables the learner's script produced, so the pass/fail
          assertions above are backed by data they can see. No-op for Python. */}
      {engine === "sql" && (
        <SqlWorkspaceResult seedSql={seedSql} script={submittedScript} runNonce={runNonce} />
      )}
    </ExerciseLayout>
  )
}
