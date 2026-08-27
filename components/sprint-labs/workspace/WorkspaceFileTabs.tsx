"use client"

/**
 * WorkspaceFileTabs — file tabs with a Lock glyph on read-only entries, grouped docs/src/tests
 * (UX-SPEC.md §1.8, §7). The `components/labs/stations/BuildStation.tsx` file-tabs pattern,
 * extracted and re-tokenized onto `--wb-*`: UX-SPEC.md §1.1 calls BuildStation out BY NAME as mixing
 * global tokens (`text-muted-foreground`, `border-primary/40`) into the workbook surface and says to
 * "copy its structure, not its class names" — this component is that re-tokenized copy, not a
 * wrapper around the original. Matches BuildStation's own level of ARIA authoring (`role="tablist"`/
 * `role="tab"`/`aria-selected`, no custom roving-tabindex key handling) rather than a
 * fuller implementation BuildStation itself does not have (UX-SPEC.md §14 names this "as
 * BuildStation has today", i.e. describing the current reality, not a stricter bar to clear).
 *
 * Hidden test files can never appear here: this component renders exactly the `files` it is given
 * and has no path lookup, fetch, or registry access of its own — the workspace page is the only
 * place that decides what is in `files`, and hidden tests are never in that data at all
 * (AGENT-CONTEXT.md §4).
 */
import { Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import type { WorkspaceTreeFile, WorkspaceTreeGroup } from "@/lib/sprint-labs/workspace/tree"

export interface WorkspaceFileTabsProps {
  files: readonly WorkspaceTreeFile[]
  activePath: string
  onSelect: (path: string) => void
  className?: string
}

const GROUP_ORDER: readonly WorkspaceTreeGroup[] = ["docs", "src", "tests"]

function baseName(path: string): string {
  return path.split("/").pop() ?? path
}

export function WorkspaceFileTabs({
  files,
  activePath,
  onSelect,
  className,
}: WorkspaceFileTabsProps) {
  const groups = GROUP_ORDER.map((group) => ({
    group,
    files: files.filter((f) => f.group === group),
  })).filter((g) => g.files.length > 0)

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {groups.map(({ group, files: groupFiles }) => (
        <div key={group} className="flex flex-col gap-1">
          <span className="text-[10px] font-medium tracking-[0.08em] text-[var(--wb-faint)] uppercase">
            {group}
          </span>
          <div className="flex flex-col gap-0.5" role="tablist" aria-label={`${group} files`}>
            {groupFiles.map((file) => {
              const isActive = file.path === activePath
              return (
                <button
                  key={file.path}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  title={file.path}
                  onClick={() => onSelect(file.path)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs transition-colors",
                    isActive
                      ? "bg-[var(--wb-accent-soft)] text-[var(--wb-text)]"
                      : "text-[var(--wb-text-secondary)] hover:bg-[var(--wb-panel)]"
                  )}
                >
                  {!file.editable && (
                    <Lock className="h-3 w-3 shrink-0 text-[var(--wb-disabled)]" aria-hidden />
                  )}
                  <span className="truncate">{baseName(file.path)}</span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
      {groups.length === 0 && (
        <p className="px-1 text-[12px] text-[var(--wb-faint)]">
          No files are mounted for this ticket yet.
        </p>
      )}
    </div>
  )
}
