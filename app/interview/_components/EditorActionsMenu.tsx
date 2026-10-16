"use client"

import { MoreHorizontal, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function EditorActionsMenu({
  onResetActiveFile,
  onResetWorkspace,
}: {
  onResetActiveFile?: () => void
  onResetWorkspace?: () => void
}) {
  if (!onResetActiveFile && !onResetWorkspace) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground h-11 w-11 shrink-0"
          aria-label="Editor actions"
          type="button"
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="interview-workspace workspace-menu min-w-52">
        {onResetActiveFile && (
          <DropdownMenuItem onSelect={onResetActiveFile} className="gap-2">
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reset active file
          </DropdownMenuItem>
        )}
        {onResetWorkspace && (
          <DropdownMenuItem onSelect={onResetWorkspace} className="gap-2">
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reset workspace
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
