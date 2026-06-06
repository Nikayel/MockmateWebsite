"use client"

import { memo } from "react"
import {
  ArrowLeft,
  Brain,
  Code,
  Eye,
  EyeOff,
  Leaf,
  Maximize2,
  Minimize2,
  Target,
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { InterviewTimer } from "@/components/interview"
import type { Scenario } from "@/lib/scenarios"
import type { EditorLanguage } from "../_types"
import { isLanguageSupported } from "../_utils/language"
import { isWorkspaceScenario } from "../_utils/workspace"

interface InterviewTopBarProps {
  selectedScenario: Scenario | null
  selectedLanguage: EditorLanguage
  onLanguageChange: (language: EditorLanguage) => void
  activePanel: "problem" | "editor" | "chat"
  onActivePanelChange: (panel: "problem" | "editor" | "chat") => void
  focusMode: boolean
  onFocusModeChange: (enabled: boolean) => void
  calmMode: boolean
  onCalmModeChange: (enabled: boolean) => void
  isInterviewStarted: boolean
  hideTimer: boolean
  onHideTimerChange: (hidden: boolean) => void
  elapsedTime: number
  strictTimeLimit: number | null
  onCloseClick: () => void
}

export const InterviewTopBar = memo(function InterviewTopBar({
  selectedScenario,
  selectedLanguage,
  onLanguageChange,
  activePanel,
  onActivePanelChange,
  focusMode,
  onFocusModeChange,
  calmMode,
  onCalmModeChange,
  isInterviewStarted,
  hideTimer,
  onHideTimerChange,
  elapsedTime,
  strictTimeLimit,
  onCloseClick,
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

  const toggleFocusMode = () => {
    const newFocusMode = !focusMode
    onFocusModeChange(newFocusMode)
    if (newFocusMode && !calmMode) {
      onCalmModeChange(true)
    }
  }

  return (
    <div className="focus-header flex flex-shrink-0 items-center justify-between gap-2 pt-2 transition-all duration-300">
      <div className="flex min-w-0 flex-1 items-center space-x-2">
        <h2 className="max-w-[200px] truncate text-sm font-semibold text-white sm:max-w-md">
          {selectedScenario?.title}
        </h2>
        <Badge
          className={`${
            selectedScenario?.difficulty === "easy"
              ? "bg-green-600/20 text-green-400"
              : selectedScenario?.difficulty === "medium"
                ? "bg-yellow-600/20 text-yellow-400"
                : "bg-red-600/20 text-red-400"
          } shrink-0 text-xs`}
        >
          {selectedScenario?.difficulty?.toUpperCase()}
        </Badge>
        <select
          value={selectedLanguage}
          onChange={(event) => handleLanguageChange(event.target.value as EditorLanguage)}
          disabled={isWorkspaceScenario(selectedScenario)}
          title={
            isWorkspaceScenario(selectedScenario)
              ? `Workspace scenario language: ${selectedScenario.workspace.language}`
              : "Choose editor language"
          }
          className="hidden rounded-md border border-gray-600 bg-gray-800 px-2 py-1 text-xs text-white focus:ring-2 focus:ring-[#00d9ff] focus:outline-none sm:block"
        >
          <option value="javascript">JavaScript</option>
          <option value="typescript">TypeScript</option>
          <option value="python">Python</option>
          <option value="java">Java (Coming Soon)</option>
          <option value="cpp">C++ (Coming Soon)</option>
          <option value="csharp">C# (Coming Soon)</option>
          <option value="go">Go (Coming Soon)</option>
          <option value="rust">Rust (Coming Soon)</option>
        </select>
      </div>

      <div className="flex items-center gap-1 rounded-lg bg-gray-800/50 p-0.5 lg:hidden">
        <button
          onClick={() => onActivePanelChange("problem")}
          className={`rounded px-2.5 py-1 text-[10px] font-medium transition-all ${
            activePanel === "problem"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
          title="Problem"
        >
          <Target className="h-3 w-3" />
        </button>
        <button
          onClick={() => onActivePanelChange("editor")}
          className={`rounded px-2.5 py-1 text-[10px] font-medium transition-all ${
            activePanel === "editor"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
          title="Code Editor"
        >
          <Code className="h-3 w-3" />
        </button>
        <button
          onClick={() => onActivePanelChange("chat")}
          className={`rounded px-2.5 py-1 text-[10px] font-medium transition-all ${
            activePanel === "chat"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
          title="Interview Chat"
        >
          <Brain className="h-3 w-3" />
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {focusMode && (
          <div className="bg-accent/15 text-accent ring-accent/30 hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ring-1 sm:flex">
            <div className="bg-accent h-1.5 w-1.5 animate-pulse rounded-full" />
            <span className="hidden lg:inline">Focus Active</span>
            <span className="lg:hidden">Focus</span>
          </div>
        )}

        {isInterviewStarted && (
          <div className="bg-secondary/50 flex items-center overflow-hidden rounded-lg">
            {!hideTimer && (
              <div className="px-1 py-0.5">
                <InterviewTimer
                  elapsedSeconds={elapsedTime}
                  strictTimeLimit={strictTimeLimit}
                  strictTimeReason={
                    strictTimeLimit
                      ? "Meta gives 45 minutes for 2 coding questions (~25 min each). They are strict about time."
                      : undefined
                  }
                />
              </div>
            )}
            <button
              onClick={() => onHideTimerChange(!hideTimer)}
              className="hover:bg-secondary/80 px-1.5 py-1 transition-colors"
              title={hideTimer ? "Show timer" : "Hide timer (reduce time pressure)"}
            >
              {hideTimer ? (
                <EyeOff className="text-muted-foreground h-3 w-3" />
              ) : (
                <Eye className="text-muted-foreground h-3 w-3" />
              )}
            </button>
          </div>
        )}

        <button
          onClick={() => onCalmModeChange(!calmMode)}
          className={`focus:ring-neural/50 hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-200 focus:ring-2 focus:outline-none sm:flex ${
            calmMode
              ? "bg-neural/20 text-neural border-neural/40 shadow-neural/20 border shadow-sm"
              : "bg-secondary/50 text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
          }`}
          title={calmMode ? "Exit Calm Mode" : "Calm Mode (muted colors for focus)"}
        >
          <Leaf className="h-3.5 w-3.5" />
          <span className="hidden lg:inline">Calm</span>
        </button>

        <button
          onClick={toggleFocusMode}
          className={`focus:ring-accent/50 hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-200 focus:ring-2 focus:outline-none lg:flex ${
            focusMode
              ? "bg-accent/90 text-accent-foreground shadow-accent/25 ring-accent/50 shadow-md ring-1"
              : "bg-secondary/50 text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
          }`}
          title={focusMode ? "Exit Focus Mode (Esc)" : "Focus Mode ⌘K Z"}
        >
          {focusMode ? (
            <Minimize2 className="h-3.5 w-3.5" />
          ) : (
            <Maximize2 className="h-3.5 w-3.5" />
          )}
          <span className="hidden xl:inline">{focusMode ? "Exit Focus" : "Focus"}</span>
        </button>

        <Button
          onClick={onCloseClick}
          variant="outline"
          size="sm"
          className="border-border text-muted-foreground hover:bg-secondary h-7 bg-transparent text-xs"
        >
          <ArrowLeft className="mr-1 h-3 w-3" />
          <span className="hidden sm:inline">Close</span>
        </Button>
      </div>
    </div>
  )
})
