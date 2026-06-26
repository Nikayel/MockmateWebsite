import { type Dispatch, type SetStateAction, useEffect, useState } from "react"

export type InterviewPanel = "problem" | "editor" | "chat"

/** Action the focus-mode keyboard chord resolves to for a given keydown. */
export type ModeShortcutAction = "none" | "exit-focus" | "start-chord" | "complete-chord"

/**
 * Pure decision for the focus-mode keyboard shortcut (VS Code-style Cmd/Ctrl+K
 * then Z chord, plus Escape to exit). Returns the action the keydown maps to
 * given the current focus + chord state. Kept pure so the chord logic is
 * unit-testable without a DOM.
 */
export function interpretModeKeydown(
  key: string,
  hasModifier: boolean,
  focusMode: boolean,
  waitingForZ: boolean
): ModeShortcutAction {
  if (key === "Escape" && focusMode) return "exit-focus"
  if (hasModifier && key === "k") return "start-chord"
  if (waitingForZ && key === "z") return "complete-chord"
  return "none"
}

export interface UseInterviewModesReturn {
  focusMode: boolean
  setFocusMode: Dispatch<SetStateAction<boolean>>
  calmMode: boolean
  setCalmMode: Dispatch<SetStateAction<boolean>>
  hideTimer: boolean
  setHideTimer: Dispatch<SetStateAction<boolean>>
  activePanel: InterviewPanel
  setActivePanel: Dispatch<SetStateAction<InterviewPanel>>
  showProblemPeek: boolean
  setShowProblemPeek: Dispatch<SetStateAction<boolean>>
}

/**
 * Owns the interview's display modes and their side effects:
 * - focus mode (hides non-essential panels; toggles `focus-mode-active` class)
 * - calm mode (muted colors; toggles `calm` class)
 * - hide-timer (time-pressure reduction)
 * - mobile active panel switcher
 * - the focus-mode problem peek overlay
 * - the Cmd/Ctrl+K→Z chord (and Escape) keyboard shortcuts.
 *
 * Extracted verbatim from the inline mode state + effects in
 * `app/interview/page.tsx`.
 */
export function useInterviewModes(): UseInterviewModesReturn {
  const [focusMode, setFocusMode] = useState(false)
  const [calmMode, setCalmMode] = useState(false)
  const [hideTimer, setHideTimer] = useState(false)
  const [activePanel, setActivePanel] = useState<InterviewPanel>("editor")
  const [showProblemPeek, setShowProblemPeek] = useState(false)

  // Toggle calm mode on document for CSS cascade
  useEffect(() => {
    if (calmMode) {
      document.documentElement.classList.add("calm")
    } else {
      document.documentElement.classList.remove("calm")
    }
    return () => document.documentElement.classList.remove("calm")
  }, [calmMode])

  // Toggle focus mode class on document for CSS cascade
  useEffect(() => {
    if (focusMode) {
      document.documentElement.classList.add("focus-mode-active")
    } else {
      document.documentElement.classList.remove("focus-mode-active")
      setShowProblemPeek(false) // Close peek when exiting focus mode
    }
    return () => document.documentElement.classList.remove("focus-mode-active")
  }, [focusMode])

  // Keyboard shortcut for Focus Mode (Cmd/Ctrl+K then Z - VS Code style)
  // Also supports Escape to exit focus mode
  useEffect(() => {
    let waitingForZ = false
    let timeoutId: NodeJS.Timeout | null = null

    const handleKeyDown = (e: KeyboardEvent) => {
      const action = interpretModeKeydown(e.key, e.metaKey || e.ctrlKey, focusMode, waitingForZ)

      if (action === "exit-focus") {
        setFocusMode(false)
        return
      }

      if (action === "start-chord") {
        e.preventDefault()
        waitingForZ = true
        // Reset after 1 second if Z isn't pressed
        timeoutId = setTimeout(() => {
          waitingForZ = false
        }, 1000)
        return
      }

      if (action === "complete-chord") {
        e.preventDefault()
        waitingForZ = false
        if (timeoutId) clearTimeout(timeoutId)
        setFocusMode(!focusMode)
        // Auto-enable calm mode when entering focus
        if (!focusMode && !calmMode) {
          setCalmMode(true)
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [focusMode, calmMode])

  return {
    focusMode,
    setFocusMode,
    calmMode,
    setCalmMode,
    hideTimer,
    setHideTimer,
    activePanel,
    setActivePanel,
    showProblemPeek,
    setShowProblemPeek,
  }
}
