"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Code,
  Clock,
  Brain,
  ArrowLeft,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  Leaf,
  Target,
} from "lucide-react"
import { useInterview } from "../_providers"
import { toast } from "sonner"

// Supported languages for code execution
const SUPPORTED_LANGUAGES = ["javascript", "typescript", "python"] as const
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

const isLanguageSupported = (lang: string): lang is SupportedLanguage => {
  return SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage)
}

// Format time as MM:SS
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}

/**
 * Interview Top Bar Component
 *
 * Displays problem info, mobile panel switcher, timer, and mode toggles.
 * Uses InterviewContext for all state.
 */
export function InterviewTopBar() {
  const {
    selectedScenario,
    selectedLanguage,
    setSelectedLanguage,
    activePanel,
    setActivePanel,
    isInterviewStarted,
    elapsedTime,
    hideTimer,
    setHideTimer,
    calmMode,
    setCalmMode,
    focusMode,
    setFocusMode,
    setShowCloseDialog,
  } = useInterview()

  return (
    <div
      className={`focus-header flex flex-shrink-0 items-center justify-between gap-2 pt-2 transition-all duration-300`}
    >
      {/* Left: Problem info */}
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
        {/* Language Selector - hidden on mobile */}
        <select
          value={selectedLanguage}
          onChange={(e) => {
            const newLang = e.target.value as typeof selectedLanguage
            setSelectedLanguage(newLang)
            // Persist language preference to localStorage
            localStorage.setItem("mockmate_preferred_language", newLang)
            if (!isLanguageSupported(newLang)) {
              toast.warning(`${newLang.toUpperCase()} execution coming soon`, {
                description:
                  "You can write code, but tests won't run. Use JavaScript or Python for full support.",
                duration: 5000,
              })
            }
          }}
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

      {/* Center: Mobile Panel Switcher (visible only on mobile/tablet) */}
      <div className="flex items-center gap-1 rounded-lg bg-gray-800/50 p-0.5 lg:hidden">
        <button
          onClick={() => setActivePanel("problem")}
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
          onClick={() => setActivePanel("editor")}
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
          onClick={() => setActivePanel("chat")}
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

      {/* Right: Actions - Research-backed controls for cognitive load reduction */}
      <div className="flex shrink-0 items-center gap-1.5">
        {/* Timer with hide toggle - WCAG 2.1: Let users manage time on their terms */}
        {isInterviewStarted && (
          <div className="bg-secondary/50 flex items-center overflow-hidden rounded-lg">
            {!hideTimer && (
              <div className="flex items-center space-x-1.5 px-2 py-1">
                <Clock className="text-accent h-3 w-3" />
                <span className="text-foreground font-mono text-xs">{formatTime(elapsedTime)}</span>
              </div>
            )}
            <button
              onClick={() => setHideTimer(!hideTimer)}
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

        {/* Calm Mode Toggle - Research: Muted colors reduce anxiety */}
        <button
          onClick={() => setCalmMode(!calmMode)}
          className={`hidden items-center gap-1 rounded-lg px-2 py-1 text-xs transition-all sm:flex ${
            calmMode
              ? "bg-neural/20 text-neural border-neural/30 border"
              : "bg-secondary/50 text-muted-foreground hover:text-foreground"
          }`}
          title={calmMode ? "Exit Calm Mode" : "Calm Mode (muted colors for focus)"}
        >
          <Leaf className="h-3 w-3" />
          <span className="hidden lg:inline">{calmMode ? "Calm" : "Calm"}</span>
        </button>

        {/* Focus Mode Toggle - Desktop only
            Keyboard shortcut: Cmd/Ctrl+K, Z (VS Code style chord) */}
        <button
          onClick={() => {
            const newFocusMode = !focusMode
            setFocusMode(newFocusMode)
            // Auto-enable calm mode when entering focus
            if (newFocusMode && !calmMode) {
              setCalmMode(true)
            }
          }}
          className={`hidden items-center gap-1 rounded-lg px-2 py-1 text-xs transition-all lg:flex ${
            focusMode
              ? "bg-accent text-accent-foreground"
              : "bg-secondary/50 text-muted-foreground hover:text-foreground"
          }`}
          title={focusMode ? "Exit Focus Mode (Esc)" : "Focus Mode ⌘K Z"}
        >
          {focusMode ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          <span className="hidden xl:inline">{focusMode ? "Exit Focus" : "Focus"}</span>
        </button>

        <Button
          onClick={() => setShowCloseDialog(true)}
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
}
