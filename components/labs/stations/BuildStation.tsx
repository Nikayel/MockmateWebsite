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
import { Lock } from "lucide-react"
import { getScenarioById } from "@/lib/scenarios"
import { CodeMirrorEditor, CodeMirrorErrorBoundary } from "@/components/editor"
import { cn } from "@/lib/utils"
import { useCaseLabStore } from "@/lib/stores/case-lab-store"
import type { WorkspaceScenarioConfig, WorkspaceScenarioFile } from "@/lib/scenarios/types"
import type { BuildAnswer } from "@/lib/labs/types"

const baseName = (path: string) => path.split("/").pop() ?? path

function EmptyState({ message }: { message: string }) {
  return (
    <div className="border-border text-muted-foreground flex h-full items-center justify-center rounded-lg border border-dashed p-6 text-center text-sm">
      {message}
    </div>
  )
}

function Workspace({ workspace }: { workspace: WorkspaceScenarioConfig }) {
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

  const persist = (next: Record<string, string>, testResults: BuildAnswer["testResults"]) => {
    const touchedFiles = files
      .filter((f) => isEditable(f) && next[f.path] !== originalContent[f.path])
      .map((f) => f.path)
    setBuild({
      touchedFiles,
      code: next[workspace.primaryFilePath] ?? "",
      language: workspace.language,
      testResults,
    })
  }

  const handleChange = (path: string, value: string) => {
    const next = { ...edited, [path]: value }
    setEdited(next)
    persist(next, savedBuild?.testResults ?? [])
  }

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
          <Workspace workspace={scenario.workspace} />
        )}
      </div>
    </section>
  )
}
