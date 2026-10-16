"use client"

import { useRef, useState } from "react"
import { HelpCircle, MessageCircleCode, Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { ThemeToggle } from "@/components/ThemeToggle"
import { GradingCriteriaList } from "@/components/GradingCriteria"

interface WorkspaceMenuProps {
  focusMode: boolean
  onFocusModeChange: (enabled: boolean) => void
  calmMode: boolean
  onCalmModeChange: (enabled: boolean) => void
  hideTimer: boolean
  onHideTimerChange: (hidden: boolean) => void
  onReplayBugfixTour?: () => void
  onOpenSparra?: () => void
}

export function WorkspaceMenu({
  focusMode,
  onFocusModeChange,
  calmMode,
  onCalmModeChange,
  hideTimer,
  onHideTimerChange,
  onReplayBugfixTour,
  onOpenSparra,
}: WorkspaceMenuProps) {
  const [showGrading, setShowGrading] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  return (
    <Dialog open={showGrading} onOpenChange={setShowGrading}>
      <DropdownMenu>
        <DropdownMenuTrigger ref={triggerRef} asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground h-11 w-11"
            aria-label="Workspace settings"
          >
            <Settings2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="interview-workspace workspace-menu max-h-[var(--radix-dropdown-menu-content-available-height)] w-64 overflow-y-auto"
        >
          <DropdownMenuLabel>Workspace</DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            className="lg:hidden"
            checked={focusMode}
            onCheckedChange={onFocusModeChange}
          >
            Focus mode
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={!hideTimer}
            onCheckedChange={(visible) => onHideTimerChange(!visible)}
          >
            Show timer
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={calmMode} onCheckedChange={onCalmModeChange}>
            Reduce distractions
          </DropdownMenuCheckboxItem>
          <ThemeToggle variant="menu-item" />
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setShowGrading(true)}>
            Grading criteria
          </DropdownMenuItem>
          {onReplayBugfixTour && (
            <DropdownMenuItem onSelect={onReplayBugfixTour} className="gap-2">
              <HelpCircle className="h-4 w-4" aria-hidden="true" /> Workspace tour
            </DropdownMenuItem>
          )}
          {onOpenSparra && (
            <DropdownMenuItem onSelect={onOpenSparra} className="gap-2">
              <MessageCircleCode className="h-4 w-4" aria-hidden="true" /> Sparra
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <DialogContent
        className="interview-workspace max-h-[85dvh] overflow-y-auto [&>button]:h-11 [&>button]:w-11"
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          triggerRef.current?.focus()
        }}
      >
        <DialogHeader>
          <DialogTitle>Grading criteria</DialogTitle>
          <DialogDescription>
            Explain your thinking as you work. Using Sparra is optional.
          </DialogDescription>
        </DialogHeader>
        <GradingCriteriaList />
      </DialogContent>
    </Dialog>
  )
}
