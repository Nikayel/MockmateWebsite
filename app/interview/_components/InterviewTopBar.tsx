"use client"

import { memo } from "react"
import { X, Maximize2, Minimize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WorkspaceMenu } from "./WorkspaceMenu"
import { InterviewTimer } from "@/components/interview"
import type { Scenario } from "@/lib/scenarios"
import { isWorkspaceScenario } from "../_utils/workspace"

interface InterviewTopBarProps {
  selectedScenario: Scenario | null
  focusMode: boolean
  onFocusModeChange: (enabled: boolean) => void
  calmMode: boolean
  onCalmModeChange: (enabled: boolean) => void
  isInterviewStarted: boolean
  hideTimer: boolean
  onHideTimerChange: (hidden: boolean) => void
  elapsedTime: number
  strictTimeLimit: number | null
  onReplayBugfixTour?: () => void
  /** Omitted after an interview ends; result views supply their own direct exit. */
  onCloseClick?: () => void
  onOpenSparra?: () => void
}

export const InterviewTopBar = memo(function InterviewTopBar({
  selectedScenario,
  focusMode,
  onFocusModeChange,
  calmMode,
  onCalmModeChange,
  isInterviewStarted,
  hideTimer,
  onHideTimerChange,
  elapsedTime,
  strictTimeLimit,
  onReplayBugfixTour,
  onCloseClick,
  onOpenSparra,
}: InterviewTopBarProps) {
  return (
    <div
      role="group"
      aria-label="Interview controls"
      className="workspace-toolbar focus-header flex min-w-0 flex-wrap items-center justify-end gap-0.5"
    >
      <h2 className="text-foreground min-w-0 flex-1 truncate text-sm font-medium lg:hidden">
        {selectedScenario?.title}
      </h2>
      <div className="flex shrink-0 items-center gap-1">
        {isInterviewStarted && !hideTimer && (
          <InterviewTimer
            elapsedSeconds={elapsedTime}
            strictTimeLimit={strictTimeLimit}
            appearance="quiet"
            strictTimeReason={
              strictTimeLimit ? "This interview uses a timed practice window." : undefined
            }
          />
        )}
        <Button
          type="button"
          variant="ghost"
          onClick={() => onFocusModeChange(!focusMode)}
          className="text-muted-foreground hidden h-11 w-11 shrink-0 p-0 lg:flex"
          aria-pressed={focusMode}
          aria-label={focusMode ? "Exit focus mode" : "Enable focus mode"}
          title={focusMode ? "Exit focus mode (Esc)" : "Focus mode (⌘K Z)"}
        >
          {focusMode ? (
            <Minimize2 className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
          )}
        </Button>
        <WorkspaceMenu
          focusMode={focusMode}
          onFocusModeChange={onFocusModeChange}
          calmMode={calmMode}
          onCalmModeChange={onCalmModeChange}
          hideTimer={hideTimer}
          onHideTimerChange={onHideTimerChange}
          onReplayBugfixTour={selectedScenario?.type === "bugfix" ? onReplayBugfixTour : undefined}
          onOpenSparra={
            focusMode && !isWorkspaceScenario(selectedScenario) ? onOpenSparra : undefined
          }
        />
        {onCloseClick && (
          <Button
            type="button"
            onClick={onCloseClick}
            variant="ghost"
            className="text-muted-foreground h-11 w-11 shrink-0 p-0"
            aria-label="Close interview"
            title="Close interview"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  )
})
