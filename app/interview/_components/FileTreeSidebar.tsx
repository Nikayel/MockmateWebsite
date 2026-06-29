"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronRight, Folder, FolderOpen } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import type { WorkspaceContextFile } from "../_types"
import { buildFileTree, collectFolderPaths, type FileTreeNode } from "../_utils/fileTree"
import { getWorkspaceFileRoleStyle, hasWorkspaceFileEdits } from "../_utils/workspace"

interface FileTreeSidebarProps {
  files: WorkspaceContextFile[]
  activePath: string | null | undefined
  onFileSelect?: (file: WorkspaceContextFile) => void
  className?: string
}

const INDENT_PER_DEPTH = 12
const BASE_INDENT = 8

const rowPadding = (depth: number) => ({ paddingLeft: depth * INDENT_PER_DEPTH + BASE_INDENT })

/**
 * VSCode-style file tree for the multi-file workspace editor. Converts the flat
 * `WorkspaceContextFile[]` into a collapsible folder/file tree and reports the
 * selected file back through `onFileSelect`.
 */
export function FileTreeSidebar({
  files,
  activePath,
  onFileSelect,
  className,
}: FileTreeSidebarProps) {
  const tree = useMemo(() => buildFileTree(files), [files])
  const folderPaths = useMemo(() => collectFolderPaths(tree), [tree])

  // Expand every folder by default — interview workspaces are small, so hiding
  // files behind collapsed folders would just add clicks. Re-seed when the set
  // of folders changes (e.g. a new scenario loads).
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(folderPaths))
  useEffect(() => {
    setExpanded(new Set(folderPaths))
  }, [folderPaths])

  const toggleFolder = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  return (
    <div
      role="tree"
      aria-label="Workspace files"
      className={cn("bg-card/50 border-border h-full overflow-y-auto py-1 text-xs", className)}
    >
      {tree.map((node) => (
        <FileTreeNodeRow
          key={node.path}
          node={node}
          depth={0}
          expanded={expanded}
          onToggleFolder={toggleFolder}
          activePath={activePath}
          onFileSelect={onFileSelect}
        />
      ))}
    </div>
  )
}

interface FileTreeNodeRowProps {
  node: FileTreeNode
  depth: number
  expanded: Set<string>
  onToggleFolder: (path: string) => void
  activePath: string | null | undefined
  onFileSelect?: (file: WorkspaceContextFile) => void
}

function FileTreeNodeRow({
  node,
  depth,
  expanded,
  onToggleFolder,
  activePath,
  onFileSelect,
}: FileTreeNodeRowProps) {
  if (node.kind === "folder") {
    const isOpen = expanded.has(node.path)
    return (
      <Collapsible open={isOpen} onOpenChange={() => onToggleFolder(node.path)}>
        <CollapsibleTrigger
          role="treeitem"
          aria-expanded={isOpen}
          className="text-muted-foreground hover:bg-muted/60 hover:text-foreground focus-visible:ring-ring flex w-full items-center gap-1.5 py-1 pr-2 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
          style={rowPadding(depth)}
        >
          <ChevronRight
            className={cn("h-3.5 w-3.5 shrink-0 transition-transform", isOpen && "rotate-90")}
            aria-hidden="true"
          />
          {isOpen ? (
            <FolderOpen className="h-3.5 w-3.5 shrink-0 text-amber-400/80" aria-hidden="true" />
          ) : (
            <Folder className="h-3.5 w-3.5 shrink-0 text-amber-400/80" aria-hidden="true" />
          )}
          <span className="truncate">{node.name}</span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {node.children.map((child) => (
            <FileTreeNodeRow
              key={child.path}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggleFolder={onToggleFolder}
              activePath={activePath}
              onFileSelect={onFileSelect}
            />
          ))}
        </CollapsibleContent>
      </Collapsible>
    )
  }

  const { file } = node
  const isActive = activePath === file.path
  const style = getWorkspaceFileRoleStyle(file.role)
  const RoleIcon = style.Icon

  return (
    <button
      type="button"
      role="treeitem"
      aria-selected={isActive}
      onClick={() => onFileSelect?.(file)}
      title={`${style.description}: ${file.path}`}
      aria-label={`Open ${style.description.toLowerCase()}: ${file.path}`}
      style={rowPadding(depth)}
      className={cn(
        "focus-visible:ring-ring flex w-full items-center gap-1.5 border-l-2 py-1 pr-2 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none",
        isActive
          ? "border-l-accent bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground border-l-transparent"
      )}
    >
      <RoleIcon
        className={cn(
          "h-3.5 w-3.5 shrink-0",
          isActive ? style.iconColorActive : style.iconColorIdle
        )}
        aria-hidden="true"
      />
      <span className="truncate">{file.name}</span>
      {hasWorkspaceFileEdits(file) && (
        <span
          className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300"
          title="Unsaved edit"
          aria-label="Unsaved edit"
        />
      )}
    </button>
  )
}
