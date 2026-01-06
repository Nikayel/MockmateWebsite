/**
 * useInterviewUI Hook
 *
 * Manages UI-related state including:
 * - Panel visibility and modes
 * - Dialog states
 * - Focus mode and accessibility features
 * - Mobile panel switcher
 */

import { useState, useEffect } from "react"

export interface UseInterviewUIOptions {
  isInterviewStarted?: boolean
}

export interface UseInterviewUIReturn {
  // Browser and main views
  showScenarioBrowser: boolean
  setShowScenarioBrowser: (show: boolean) => void

  // Dialog states
  showCloseDialog: boolean
  setShowCloseDialog: (show: boolean) => void
  showSignupPrompt: boolean
  setShowSignupPrompt: (show: boolean) => void
  showCodeInDiscussion: boolean
  setShowCodeInDiscussion: (show: boolean) => void

  // Code viewer
  selectedFile: { path: string; content: string } | null
  setSelectedFile: (file: { path: string; content: string } | null) => void
  isCodeViewerOpen: boolean
  setIsCodeViewerOpen: (open: boolean) => void

  // AI tips and hints
  showAITips: boolean
  setShowAITips: (show: boolean) => void
  isAIPartnerExpanded: boolean
  setIsAIPartnerExpanded: (expanded: boolean) => void

  // Accessibility and focus modes
  focusMode: boolean
  setFocusMode: (mode: boolean) => void
  calmMode: boolean
  setCalmMode: (mode: boolean) => void
  hideTimer: boolean
  setHideTimer: (hide: boolean) => void
  showProblemPeek: boolean
  setShowProblemPeek: (show: boolean) => void

  // Mobile panel switcher
  activePanel: "problem" | "editor" | "chat"
  setActivePanel: (panel: "problem" | "editor" | "chat") => void
}

export function useInterviewUI({
  isInterviewStarted = false,
}: UseInterviewUIOptions = {}): UseInterviewUIReturn {
  // Browser and main views
  const [showScenarioBrowser, setShowScenarioBrowser] = useState(true)

  // Dialog states
  const [showCloseDialog, setShowCloseDialog] = useState(false)
  const [showSignupPrompt, setShowSignupPrompt] = useState(false)
  const [showCodeInDiscussion, setShowCodeInDiscussion] = useState(false)

  // Code viewer
  const [selectedFile, setSelectedFile] = useState<{ path: string; content: string } | null>(null)
  const [isCodeViewerOpen, setIsCodeViewerOpen] = useState(false)

  // AI tips and hints
  const [showAITips, setShowAITips] = useState(false)
  const [isAIPartnerExpanded, setIsAIPartnerExpanded] = useState(false)

  // Accessibility and focus modes
  const [focusMode, setFocusMode] = useState(false)
  const [calmMode, setCalmMode] = useState(false)
  const [hideTimer, setHideTimer] = useState(false)
  const [showProblemPeek, setShowProblemPeek] = useState(false)

  // Mobile panel switcher
  const [activePanel, setActivePanel] = useState<"problem" | "editor" | "chat">("editor")

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

  return {
    showScenarioBrowser,
    setShowScenarioBrowser,
    showCloseDialog,
    setShowCloseDialog,
    showSignupPrompt,
    setShowSignupPrompt,
    showCodeInDiscussion,
    setShowCodeInDiscussion,
    selectedFile,
    setSelectedFile,
    isCodeViewerOpen,
    setIsCodeViewerOpen,
    showAITips,
    setShowAITips,
    isAIPartnerExpanded,
    setIsAIPartnerExpanded,
    focusMode,
    setFocusMode,
    calmMode,
    setCalmMode,
    hideTimer,
    setHideTimer,
    showProblemPeek,
    setShowProblemPeek,
    activePanel,
    setActivePanel,
  }
}
