"use client"

import { FolderTree } from "lucide-react"
import type { WorkspaceContextFile } from "../../_types"
import { FileTreeSidebar } from "../FileTreeSidebar"

interface WorkspaceFilesPanelProps {
  files: WorkspaceContextFile[]
  activePath: string | null | undefined
  onFileSelect?: (file: WorkspaceContextFile) => void
  /** Spotlight anchor for the bugfix tour's "Inspect the codebase" step. */
  tourAnchor?: string
}

/**
 * The codebase explorer for the problem column.
 *
 * This tree used to live inside the editor card, splitting the one column the
 * candidate writes code in and leaving the problem column to claim the files were
 * "available as tabs in the code editor" -- which was never true, they were in a
 * tree the panel did not own. Reuniting the explorer with the problem it belongs to
 * gives the editor its full width back and restores the ordinary IDE hierarchy:
 * explorer on the left, editor in the middle.
 */
export function WorkspaceFilesPanel({
  files,
  activePath,
  onFileSelect,
  tourAnchor,
}: WorkspaceFilesPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col" data-bugfix-tour={tourAnchor}>
      <div className="border-border/50 text-muted-foreground flex flex-shrink-0 items-center gap-1.5 border-y px-3 py-1.5">
        <FolderTree className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
        <span className="font-mono text-[10px] tracking-[0.14em] uppercase">Files</span>
        <span className="ml-auto font-mono text-[10px] tabular-nums">{files.length}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <FileTreeSidebar files={files} activePath={activePath} onFileSelect={onFileSelect} />
      </div>
    </div>
  )
}
