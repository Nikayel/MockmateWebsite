"use client"

import { memo } from "react"
import { X, Maximize2, Minimize2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { WorkspaceMenu } from "./WorkspaceMenu"
import { EditorLanguageControl } from "./EditorLanguageControl"
import { InterviewTimer } from "@/components/interview"
import type { Scenario } from "@/lib/scenarios"
import type { EditorLanguage } from "../_types"
import { isLanguageSupported } from "../_utils/language"
import { isWorkspaceScenario } from "../_utils/workspace"

interface InterviewTopBarProps {
  selectedScenario: Scenario | null
  selectedLanguage: EditorLanguage
  onLanguageChange: (language: EditorLanguage) => void
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
  selectedLanguage,
  onLanguageChange,
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
  const handleLanguageChange = (newLang: EditorLanguage) => {
    if (isWorkspaceScenario(selectedScenario)) {
      toast.info(`Workspace scenarios run in ${selectedScenario.workspace.language}`)
      return
    }

    onLanguageChange(newLang)
    localStorage.setItem("mockmate_preferred_language", newLang)
    if (!isLanguageSupported(newLang)) {
      toast.warning(`${newLang.toUpperCase()} execution coming soon`, {
        description:
          "You can write code, but tests won't run. Use JavaScript or Python for full support.",
        duration: 5000,
      })
    }
  }

  return (
    <div
      role="group"
      aria-label="Interview controls"
      className="workspace-toolbar focus-header flex min-w-0 items-center gap-0.5"
    >
      <h2 className="text-foreground min-w-0 flex-1 truncate text-sm font-medium lg:hidden">
        {selectedScenario?.title}
      </h2>
      <EditorLanguageControl
        value={selectedLanguage}
        onChange={handleLanguageChange}
        isWorkspace={isWorkspaceScenario(selectedScenario)}
      />
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
          selectedLanguage={selectedLanguage}
          onLanguageChange={handleLanguageChange}
          isWorkspace={isWorkspaceScenario(selectedScenario)}
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
