"use client"

/**
 * BuildStation (§7.4) — the codebase drop.
 *
 * Embeds the existing multi-file workspace editor on the build scenario the lab
 * points at (`buildScenarioId`) — a partial implementation to extend/fix, NOT a
 * blank single-file DSA task. Editable files are editable; reference/test/docs
 * files are read-only. Edits persist to the run via `setBuild`. Running tests
 * against `/api/execute` is wired in the next increment.
 */

import { useMemo, useState } from "react"
import { CheckCircle2, Loader2, Lock, Play, XCircle } from "lucide-react"
import { getScenarioById } from "@/lib/scenarios"
import { CodeMirrorEditor, CodeMirrorErrorBoundary } from "@/components/editor"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getCurrentUserToken } from "@/lib/firebase-lazy"
import { useCaseLabStore } from "@/lib/stores/case-lab-store"
import type { WorkspaceScenarioConfig, WorkspaceScenarioFile } from "@/lib/scenarios/types"
import type { BuildAnswer, BuildTestResult } from "@/lib/labs/types"

interface ExecuteResponse {
  results?: { description: string; passed: boolean; error?: string | null }[]
}

const baseName = (path: string) => path.split("/").pop() ?? path

function EmptyState({ message }: { message: string }) {
  return (
    <div className="border-border text-muted-foreground flex h-full items-center justify-center rounded-lg border border-dashed p-6 text-center text-sm">
      {message}
    </div>
  )
}

function Workspace({
  workspace,
  scenarioId,
}: {
  workspace: WorkspaceScenarioConfig
  scenarioId: string
}) {
  const run = useCaseLabStore((s) => s.activeRun)
  const setBuild = useCaseLabStore((s) => s.setBuild)

  const files = workspace.files
  const originalContent = useMemo(
    () => Object.fromEntries(files.map((f) => [f.path, f.content])),
    [files]
  )
  const isEditable = (file: WorkspaceScenarioFile) =>
    file.role === "editable" || workspace.editableFilePaths.includes(file.path)

  const savedBuild = run?.answers.build
  const [edited, setEdited] = useState<Record<string, string>>(() => {
    const seed = { ...originalContent }
    if (savedBuild?.code) seed[workspace.primaryFilePath] = savedBuild.code
    return seed
  })
  const [activePath, setActivePath] = useState<string>(
    workspace.primaryFilePath || files[0]?.path || ""
  )
  const [testResults, setTestResults] = useState<BuildTestResult[]>(savedBuild?.testResults ?? [])
  const [running, setRunning] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)

  const persist = (next: Record<string, string>, results: BuildAnswer["testResults"]) => {
    const touchedFiles = files
      .filter((f) => isEditable(f) && next[f.path] !== originalContent[f.path])
      .map((f) => f.path)
    setBuild({
      touchedFiles,
      code: next[workspace.primaryFilePath] ?? "",
      language: workspace.language,
      testResults: results,
    })
  }

  const handleChange = (path: string, value: string) => {
    const next = { ...edited, [path]: value }
    setEdited(next)
    persist(next, testResults)
  }

  const runTests = async () => {
    setRunning(true)
    setRunError(null)
    try {
      const token = await getCurrentUserToken()
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (token) headers.Authorization = `Bearer ${token}`
      const workspaceFiles = files
        .filter((f) => isEditable(f))
        .map((f) => ({ path: f.path, content: edited[f.path] ?? f.content }))

      const res = await fetch("/api/execute", {
        method: "POST",
        headers,
        body: JSON.stringify({
          scenarioId,
          language: workspace.language,
          workspaceFiles,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as ExecuteResponse & {
        error?: string
      }
      if (!res.ok) throw new Error(data.error || "Run failed")

      const results: BuildTestResult[] = (data.results ?? []).map((r) => ({
        name: r.description,
        passed: r.passed,
        ...(r.error ? { message: r.error } : {}),
      }))
      setTestResults(results)
      persist(edited, results)
    } catch (error) {
      setRunError(error instanceof Error ? error.message : "Run failed")
    } finally {
      setRunning(false)
    }
  }

  const passedCount = testResults.filter((r) => r.passed).length
  const activeFile = files.find((f) => f.path === activePath)

  return (
    <div className="flex h-full flex-col gap-2">
      {/* File tabs */}
      <div className="flex flex-wrap gap-1" role="tablist" aria-label="Workspace files">
        {files.map((file) => {
          const editable = isEditable(file)
          const isActive = file.path === activePath
          return (
            <button
              key={file.path}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActivePath(file.path)}
              className={cn(
                "flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors",
                isActive
                  ? "border-primary/40 bg-primary/5 text-foreground"
                  : "text-muted-foreground hover:bg-muted border-transparent"
              )}
            >
              {!editable && <Lock className="h-3 w-3" aria-hidden />}
              {baseName(file.path)}
            </button>
          )
        })}
      </div>

      {/* Active file editor */}
      <div className="border-border min-h-0 flex-1 overflow-hidden rounded-lg border">
        {activeFile ? (
          <CodeMirrorErrorBoundary>
            <CodeMirrorEditor
              value={edited[activeFile.path] ?? ""}
              onChange={
                isEditable(activeFile) ? (value) => handleChange(activeFile.path, value) : undefined
              }
              language={activeFile.language}
              readOnly={!isEditable(activeFile)}
            />
          </CodeMirrorErrorBoundary>
        ) : (
          <EmptyState message="Select a file to view it." />
        )}
      </div>

      {activeFile && !isEditable(activeFile) && (
        <p className="text-muted-foreground text-xs">
          Read-only reference file — edit the editable files to solve the task.
        </p>
      )}

      {/* Run tests + results */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <Button type="button" size="sm" onClick={runTests} disabled={running}>
            {running ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Play className="h-4 w-4" aria-hidden />
            )}
            {running ? "Running…" : "Run tests"}
          </Button>
          {testResults.length > 0 && (
            <span className="text-muted-foreground text-xs">
              {passedCount}/{testResults.length} passing
            </span>
          )}
        </div>

        {runError && (
          <p className="text-destructive text-xs" role="alert">
            {runError}
          </p>
        )}

        {testResults.length > 0 && (
          <ul className="flex flex-col gap-1">
            {testResults.map((result, i) => (
              <li
                key={i}
                className="border-border flex items-start gap-2 rounded-md border px-2 py-1.5 text-xs"
              >
                {result.passed ? (
                  <CheckCircle2
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500"
                    aria-hidden
                  />
                ) : (
                  <XCircle className="text-destructive mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                )}
                <span className="flex min-w-0 flex-col">
                  <span className="text-foreground">{result.name}</span>
                  {result.message && (
                    <span className="text-muted-foreground">{result.message}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export function BuildStation() {
  const lab = useCaseLabStore((s) => s.activeLab)
  const scenario = useMemo(
    () => (lab?.buildScenarioId ? getScenarioById(lab.buildScenarioId) : undefined),
    [lab?.buildScenarioId]
  )

  return (
    <section aria-labelledby="build-title" className="flex h-full flex-col gap-3">
      <header className="flex flex-col gap-1">
        <h2 id="build-title" className="text-foreground text-lg font-semibold">
          Build
        </h2>
        <p className="text-muted-foreground text-sm">
          Work inside the real system you just designed — extend it or fix it.
        </p>
      </header>

      <div className="min-h-0 flex-1">
        {!lab?.buildScenarioId ? (
          <EmptyState message="No build scenario is attached to this lab yet." />
        ) : !scenario ? (
          <EmptyState message="Couldn't load the build scenario." />
        ) : !scenario.workspace ? (
          <EmptyState message="This lab's build isn't a multi-file workspace." />
        ) : (
          <Workspace workspace={scenario.workspace} scenarioId={lab.buildScenarioId} />
        )}
      </div>
    </section>
  )
}
