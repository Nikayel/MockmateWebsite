"use client"

import { useMemo, useState } from "react"
import { CheckCircle2, Lock, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CodeMirrorEditor, CodeMirrorErrorBoundary } from "@/components/editor"
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer"
import { TestResultsPanel } from "@/components/interview/TestResultsPanel"
import { ColdStartNote } from "./ColdStartNote"
import { SqlDataPreview } from "./SqlDataPreview"
import { useExerciseRun } from "./useExerciseRun"
import type { WorkspaceScenarioFile } from "@/lib/scenarios/types"
import type { PythonExercise } from "@/lib/tutorials/types"

/**
 * Workspace (multi-file) exercise runner. Adapted from `BuildStation`: file tabs (editable files
 * are editable, everything else is locked/readonly), and only the EDITABLE files' content is sent
 * as `workspaceFiles` to the client runner. Hidden files (the runner, hidden tests, package
 * `__init__.py`s) are never shown — so hidden-test source never leaks — but still execute. Grading
 * shares `useExerciseRun`; the Pyodide runner reports `__WORKSPACE_TEST_RESULTS__:` rows.
 */
export interface WorkspaceExerciseRunnerProps {
  exercise: PythonExercise
  workspace: NonNullable<PythonExercise["workspace"]>
  onPass?: () => void
  /** Fires after each graded run with its pass/fail (drives Sable). */
  onRunResult?: (passed: boolean) => void
  /** Which browser engine warms — drives the cold-start copy. Defaults to "python" (call sites unchanged). */
  engine?: "python" | "sql"
  /**
   * SQL workspaces only: the seed DB, shown as an input-table preview above the editor. Sourced from
   * `SqlWorkspaceGrading.seedSql` at the call site (the `workspace` prop is Python-typed and lacks
   * it). Omitted for Python workspaces, where the preview renders nothing.
   */
  seedSql?: string
}

export function WorkspaceExerciseRunner({
  exercise,
  workspace,
  onPass,
  onRunResult,
  engine = "python",
  seedSql,
}: WorkspaceExerciseRunnerProps) {
  const editablePaths = useMemo(() => new Set(workspace.editableFilePaths), [workspace])
  const isEditable = (file: WorkspaceScenarioFile) =>
    file.role === "editable" || editablePaths.has(file.path)

  const visibleFiles = useMemo(() => workspace.files.filter((file) => !file.hidden), [workspace])

  const [edits, setEdits] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {}
    for (const file of workspace.files) {
      if (file.role === "editable" || workspace.editableFilePaths.includes(file.path)) {
        seed[file.path] = file.content
      }
    }
    return seed
  })
  const [activePath, setActivePath] = useState<string>(workspace.primaryFilePath)

  const { running, warming, results, runError, passed, run } = useExerciseRun(exercise, {
    onPass,
    onResult: onRunResult,
  })

  const activeFile =
    visibleFiles.find((file) => file.path === activePath) ?? visibleFiles[0] ?? null

  const handleRun = () => {
    const workspaceFiles = workspace.files
      .filter(isEditable)
      .map((file) => ({ path: file.path, content: edits[file.path] ?? file.content }))
    void run({ workspaceFiles })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <MarkdownRenderer content={exercise.prompt} />
      </div>

      {/* SQL workspaces: preview the seeded input tables. No-op (renders nothing) for Python. */}
      <SqlDataPreview seedSql={seedSql} />

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
                onClick={() => setActivePath(file.path)}
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
                  ? (value) => setEdits((prev) => ({ ...prev, [activeFile.path]: value }))
                  : undefined
              }
              language={activeFile.language}
              readOnly={!isEditable(activeFile)}
              autoHeight
              minHeight={340}
              maxHeight={600}
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
        {passed && (
          <span className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            All tests passed
          </span>
        )}
      </div>

      {runError && (
        <p
          role="alert"
          className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300"
        >
          {runError}
        </p>
      )}

      <TestResultsPanel results={results} isRunning={running} />
    </div>
  )
}
