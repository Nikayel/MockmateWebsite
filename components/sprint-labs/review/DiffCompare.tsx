"use client"

/**
 * DiffCompare — two read-only `CodeMirrorEditor`s side by side with a shared
 * file picker and a per-file changed-lines count (UX-SPEC.md §1.8). Screen 8
 * (review) uses `mode="single"` — one diff, one pane; screen 9 (retro) uses
 * `mode="two-pane"` — the learner's diff beside the reference.
 *
 * A missing diff (`primaryDiff`/`secondaryDiff` is `null`) renders the exact
 * "not available" line rather than crashing or rendering an empty editor —
 * UX-SPEC.md §10 States already names this for the reference diff
 * ("reference unavailable... render it rather than crashing"); this component
 * reuses the same shape for a review-only ticket's pre-finalization "PR diff"
 * too, which has no source field anywhere in the compiled or sealed content
 * (see the Task 13 report).
 */

import { useMemo, useState } from "react"
import { CodeMirrorEditor } from "@/components/editor"
import { splitDiffByFile, formatChangedLines, type DiffFileEntry } from "./diff-parsing"

export interface DiffCompareProps {
  mode: "single" | "two-pane"
  primaryDiff: string | null
  primaryLabel: string
  primaryNotAvailableMessage?: string
  secondaryDiff?: string | null
  secondaryLabel?: string
  secondaryNotAvailableMessage?: string
}

function byPath(entries: DiffFileEntry[]): Map<string, DiffFileEntry> {
  return new Map(entries.map((entry) => [entry.path, entry]))
}

function pickDefaultPath(entries: DiffFileEntry[]): string | null {
  if (entries.length === 0) return null
  return entries.reduce((best, entry) =>
    entry.added + entry.removed > best.added + best.removed ? entry : best
  ).path
}

function DiffPane({
  label,
  entry,
  notAvailableMessage,
}: {
  label: string
  entry: DiffFileEntry | undefined
  notAvailableMessage: string
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium tracking-[0.08em] text-[var(--wb-faint)] uppercase">
          {label}
        </span>
        {entry && (
          <span className="font-mono text-xs text-[var(--wb-text-secondary)]">
            {formatChangedLines(entry.added, entry.removed)}
          </span>
        )}
      </div>
      {entry ? (
        <CodeMirrorEditor
          value={entry.hunkText}
          language="diff"
          readOnly
          autoHeight
          maxHeight="480px"
        />
      ) : (
        <p className="rounded-lg border border-[var(--wb-border)] bg-[var(--wb-panel)] p-4 text-sm text-[var(--wb-text-secondary)]">
          {notAvailableMessage}
        </p>
      )}
    </div>
  )
}

export function DiffCompare({
  mode,
  primaryDiff,
  primaryLabel,
  primaryNotAvailableMessage = "This diff is not available yet.",
  secondaryDiff,
  secondaryLabel,
  secondaryNotAvailableMessage = "This diff is not available yet.",
}: DiffCompareProps) {
  const primaryEntries = useMemo(
    () => (primaryDiff ? splitDiffByFile(primaryDiff) : []),
    [primaryDiff]
  )
  const secondaryEntries = useMemo(
    () => (secondaryDiff ? splitDiffByFile(secondaryDiff) : []),
    [secondaryDiff]
  )

  const allPaths = useMemo(() => {
    const seen = new Set<string>()
    const paths: string[] = []
    for (const entry of [...primaryEntries, ...secondaryEntries]) {
      if (!seen.has(entry.path)) {
        seen.add(entry.path)
        paths.push(entry.path)
      }
    }
    return paths
  }, [primaryEntries, secondaryEntries])

  const [selectedPath, setSelectedPath] = useState<string | null>(() =>
    pickDefaultPath(primaryEntries)
  )
  const activePath =
    selectedPath && allPaths.includes(selectedPath) ? selectedPath : (allPaths[0] ?? null)

  const primaryByPath = byPath(primaryEntries)
  const secondaryByPath = byPath(secondaryEntries)

  if (allPaths.length === 0) {
    return (
      <p className="rounded-lg border border-[var(--wb-border)] bg-[var(--wb-panel)] p-4 text-sm text-[var(--wb-text-secondary)]">
        {primaryNotAvailableMessage}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Changed files">
        {allPaths.map((path) => (
          <button
            key={path}
            type="button"
            role="tab"
            aria-selected={path === activePath}
            onClick={() => setSelectedPath(path)}
            className={
              "rounded-full border px-2.5 py-1 font-mono text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--wb-accent)] " +
              (path === activePath
                ? "border-[var(--wb-accent)] bg-[var(--wb-accent-soft)] text-[var(--wb-accent-strong)]"
                : "border-[var(--wb-border)] text-[var(--wb-text-secondary)] hover:border-[var(--wb-accent)]")
            }
          >
            {path}
          </button>
        ))}
      </div>

      <div className={mode === "two-pane" ? "flex flex-col gap-4 lg:flex-row" : "flex flex-col"}>
        <DiffPane
          label={primaryLabel}
          entry={activePath ? primaryByPath.get(activePath) : undefined}
          notAvailableMessage={primaryNotAvailableMessage}
        />
        {mode === "two-pane" && (
          <DiffPane
            label={secondaryLabel ?? "Reference"}
            entry={activePath ? secondaryByPath.get(activePath) : undefined}
            notAvailableMessage={secondaryNotAvailableMessage}
          />
        )}
      </div>
    </div>
  )
}
