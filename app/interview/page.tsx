"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import dynamic from "next/dynamic"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { CodeViewerSidePanel } from "@/components/CodeViewerSidePanel"
import PracticeFeedback from "@/components/PracticeFeedback"
import { GradingCriteriaTooltip } from "@/components/GradingCriteria"
import {
  Play,
  RotateCcw,
  Code,
  MessageSquare,
  CheckCircle,
  Clock,
  User,
  Bot,
  Brain,
  Sparkles,
  Lightbulb,
  Target,
  TrendingUp,
  Send,
  PlayCircle,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  X,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Mic,
  MicOff,
  HelpCircle,
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useAuth } from "@/lib/auth-context"
import { checkUsageLimit, recordSessionStart, getUserProfile, createInterviewSession, updateInterviewSession, checkSessionCost, saveSessionState, getSessionState } from "@/lib/firestore-helpers"
import { scenarios, filterScenarios, getScenarioById, type Scenario, type ScenarioType, type DifficultyLevel, type Company } from "@/lib/scenarios"
import { extractProtectedElements, validateCodeProtection, enforceCodeProtection } from "@/lib/code-protection"
import { toast } from "sonner"

// Dynamically import Monaco Editor (client-side only)
const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => null
})

// Supported languages for code execution
// JavaScript and Python are fully supported; others are coming soon
const SUPPORTED_LANGUAGES = ["javascript", "typescript", "python"] as const
const COMING_SOON_LANGUAGES = ["java", "cpp", "csharp", "go", "rust"] as const

type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number]
type ComingSoonLanguage = typeof COMING_SOON_LANGUAGES[number]

const isLanguageSupported = (lang: string): lang is SupportedLanguage => {
  return SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage)
}

interface ChatMessage {
  type: "user" | "ai"
  message: string
}

interface TestResult {
  description: string
  passed: boolean
  input: any
  expected: any
  actual: any
  error: string | null
}

export default function InterviewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, firebaseUser, loading: authLoading, initialized } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [authCheckComplete, setAuthCheckComplete] = useState(false)
  const [showScenarioBrowser, setShowScenarioBrowser] = useState(true)
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null)
  const [isInterviewStarted, setIsInterviewStarted] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [showPostInterviewDiscussion, setShowPostInterviewDiscussion] = useState(false)
  const [comprehensiveFeedback, setComprehensiveFeedback] = useState<string>("")
  const [performanceScore, setPerformanceScore] = useState<number | null>(null)
  const [isGeneratingDiscussion, setIsGeneratingDiscussion] = useState(false)
  const [showCodeInDiscussion, setShowCodeInDiscussion] = useState(false)
  const [code, setCode] = useState("")
  const [selectedLanguage, setSelectedLanguage] = useState<"javascript" | "typescript" | "python" | "java" | "cpp" | "csharp" | "go" | "rust">("javascript")

  // Filters
  const [filterType, setFilterType] = useState<ScenarioType[]>([])
  const [filterDifficulty, setFilterDifficulty] = useState<DifficultyLevel[]>([])
  const [filterCompanies, setFilterCompanies] = useState<Company[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  // Chat states
  const [interviewerMessages, setInterviewerMessages] = useState<ChatMessage[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [interviewerInput, setInterviewerInput] = useState("")
  const [isLoadingChat, setIsLoadingChat] = useState(false)
  const [isLoadingInterviewer, setIsLoadingInterviewer] = useState(false)

  // Voice recording states
  const [isRecordingPartner, setIsRecordingPartner] = useState(false)
  const [isRecordingInterviewer, setIsRecordingInterviewer] = useState(false)
  const recognitionRef = useRef<any>(null)

  // AI hints states
  const [showAITips, setShowAITips] = useState(false)
  const [isAIPartnerExpanded, setIsAIPartnerExpanded] = useState(false) // Collapsed by default
  const [ragHints, setRagHints] = useState<{ level: number; hint: string }[]>([])
  const [isLoadingHints, setIsLoadingHints] = useState(false)

  // Test states
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isRunningTests, setIsRunningTests] = useState(false)
  const [testSummary, setTestSummary] = useState({ total: 0, passed: 0, failed: 0, passRate: 0 })
  const [efficiencyMetrics, setEfficiencyMetrics] = useState<{
    linesOfCode: number
    complexity: string
    estimatedTimeComplexity: string
    estimatedSpaceComplexity: string
    optimalTimeComplexity: string
    optimalSpaceComplexity: string
    efficiencyScore: number
  } | null>(null)

  // Timer
  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)

  // Hints
  const [revealedHints, setRevealedHints] = useState<number>(0)
  const [hintTimers, setHintTimers] = useState<number[]>([])

  // Workspace context
  const [workspaceContext, setWorkspaceContext] = useState<Array<{ path: string; content: string }>>([])
  const [lastCodeHash, setLastCodeHash] = useState<string>("")
  const [proactiveTimer, setProactiveTimer] = useState<NodeJS.Timeout | null>(null)
  const [usageLimit, setUsageLimit] = useState<{ used: number; limit: number; allowed: boolean } | null>(null)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)

  // Code viewer dialog state
  const [selectedFile, setSelectedFile] = useState<{ path: string; content: string } | null>(null)
  const [isCodeViewerOpen, setIsCodeViewerOpen] = useState(false)

  // Close confirmation dialog state
  const [showCloseDialog, setShowCloseDialog] = useState(false)

  // Code protection state
  const [protectedElements, setProtectedElements] = useState<ReturnType<typeof extractProtectedElements> | null>(null)
  const [starterCode, setStarterCode] = useState<string>("")

  const chatEndRef = useRef<HTMLDivElement>(null)
  const interviewerEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<any>(null) // Monaco editor instance ref
  const [editorHeight, setEditorHeight] = useState(400)

  // Monaco Editor cleanup on unmount - dispose all models to prevent memory leaks
  useEffect(() => {
    return () => {
      // Dispose editor instance
      if (editorRef.current) {
        try {
          editorRef.current.dispose()
        } catch (e) {
          console.warn('Error disposing editor:', e)
        }
        editorRef.current = null
      }
      // Dispose all Monaco models
      if (typeof window !== 'undefined' && (window as any).monaco?.editor) {
        try {
          const models = (window as any).monaco.editor.getModels()
          models.forEach((model: any) => {
            try {
              model.dispose()
            } catch (e) {
              // Model may already be disposed
            }
          })
        } catch (e) {
          console.warn('Error disposing Monaco models:', e)
        }
      }
    }
  }, [])

  // Update URL when interview starts (for refresh persistence)
  useEffect(() => {
    if (isInterviewStarted && selectedScenario && currentSessionId && typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('session', currentSessionId)
      url.searchParams.set('scenario', selectedScenario.id)
      window.history.replaceState({}, '', url.toString())
    }
  }, [isInterviewStarted, selectedScenario, currentSessionId])

  // Warn user before leaving page during active interview
  useEffect(() => {
    if (!isInterviewStarted || showFeedback) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = 'You have an active interview session. Are you sure you want to leave?'
      return e.returnValue
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isInterviewStarted, showFeedback])

  // Separate effect to handle auth check with delay to prevent race condition on refresh
  useEffect(() => {
    if (!initialized || authLoading) return

    // Give Firebase a moment to restore session on page refresh before checking auth
    const timer = setTimeout(() => {
      setAuthCheckComplete(true)
    }, 300)

    return () => clearTimeout(timer)
  }, [initialized, authLoading])

  // Check authentication and usage limit, handle session reopening
  useEffect(() => {
    const checkAuth = async () => {
      if (authLoading || !initialized || !authCheckComplete) return

      if (!firebaseUser) {
        router.push("/login?redirect=interview")
        return
      }

      // Check usage limit
      const usage = await checkUsageLimit(firebaseUser.uid)
      setUsageLimit(usage)

      // Check if we're reopening a session
      const sessionId = searchParams?.get("session")
      const scenarioId = searchParams?.get("scenario")

      if (sessionId && scenarioId) {
        // Load the scenario and reopen the session
        const scenario = getScenarioById(scenarioId)
        if (scenario) {
          setSelectedScenario(scenario)
          setCurrentSessionId(sessionId)
          // Start the interview immediately
          setIsInterviewStarted(true)
          setShowScenarioBrowser(false)
          setStartTime(Date.now())

          // Initialize code based on scenario type
          let initialCode: string
          if (scenario.type === 'bugfix') {
            initialCode = (scenario as any).buggyCode?.[selectedLanguage] || `// Bug fix code not available for ${selectedLanguage}`
            const codebaseFiles = (scenario as any).codebaseFiles?.[selectedLanguage] || []
            if (codebaseFiles.length > 0) {
              const contextFiles = codebaseFiles.map((file: any) => ({
                path: file.fileName,
                content: file.content,
              }))
              setWorkspaceContext(contextFiles)
            }
          } else {
            initialCode = (scenario as any).starterCode?.[selectedLanguage] || `function solution() {
  // Write your solution here

}`
          }
          setCode(initialCode)

          // Initialize interviewer with welcome message
          const problemType = scenario.type === 'bugfix' ? 'BUG FIX' : scenario.type.toUpperCase()
          const initialMessage = `Welcome back! I'm Sable, your interviewer. You're continuing your practice on **${scenario.title}** - a ${scenario.difficulty} ${problemType} problem.

You can continue where you left off. Feel free to:
- Ask me clarifying questions about the requirements
- Discuss your approach before coding
- Ask for hints if you get stuck

Let's continue!`

          setInterviewerMessages([{ type: "ai", message: initialMessage }])
          setChatMessages([{
            type: "ai",
            message: `Hi! I'm your AI coding partner. I can help with algorithms, debugging, and hints for ${scenario.title}. Just ask!`,
          }])

          toast.success("Session resumed")
        } else {
          toast.error("Scenario not found")
        }
      }

      setIsLoading(false)
    }
    checkAuth()
  }, [router, searchParams, firebaseUser, authLoading, initialized, authCheckComplete])

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isInterviewStarted && !showFeedback && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isInterviewStarted, showFeedback, startTime])

  // Progressive hints reveal effect
  useEffect(() => {
    if (!isInterviewStarted || !selectedScenario || showFeedback) return

    const hints = (selectedScenario as any).hints || []
    if (hints.length === 0) return

    // Reveal hints at intervals: 3min, 6min, 9min, etc.
    const hintInterval = 180 // 3 minutes in seconds

    // Check if it's time to reveal a new hint
    const hintsToReveal = Math.floor(elapsedTime / hintInterval)
    const maxHints = Math.min(hintsToReveal, hints.length)

    if (maxHints > revealedHints) {
      setRevealedHints(maxHints)
      // Play sound and show notification
      playSound('hint')
      toast.info(`💡 New hint available! (${maxHints}/${hints.length})`)
    }
  }, [elapsedTime, isInterviewStarted, selectedScenario, showFeedback, revealedHints])

  // Sound effects
  const playSound = (type: 'hint' | 'success' | 'fail' | 'milestone') => {
    // Use Web Audio API for subtle sound effects
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    // Different frequencies for different events
    const soundConfig = {
      hint: { freq: 800, duration: 0.1, volume: 0.1 },
      success: { freq: 1000, duration: 0.15, volume: 0.15 },
      fail: { freq: 400, duration: 0.2, volume: 0.1 },
      milestone: { freq: 1200, duration: 0.2, volume: 0.15 },
    }

    const config = soundConfig[type]
    oscillator.frequency.value = config.freq
    gainNode.gain.value = config.volume

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + config.duration)
  }

  // Auto-scroll chat - scroll only within container, not the whole page
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" })
    }
  }, [chatMessages])

  useEffect(() => {
    if (interviewerEndRef.current) {
      interviewerEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" })
    }
  }, [interviewerMessages])

  // Measure editor container height for Monaco Editor
  useEffect(() => {
    if (!editorContainerRef.current) return

    const updateHeight = () => {
      if (editorContainerRef.current) {
        const height = editorContainerRef.current.clientHeight
        if (height > 0) {
          setEditorHeight(height)
        }
      }
    }

    let resizeObserver: ResizeObserver | null = null

    // Use requestAnimationFrame to ensure DOM is laid out
    const rafId = requestAnimationFrame(() => {
      updateHeight()

      // Use ResizeObserver to track size changes
      if (editorContainerRef.current) {
        resizeObserver = new ResizeObserver(() => {
          requestAnimationFrame(updateHeight)
        })
        resizeObserver.observe(editorContainerRef.current)
      }
    })

    // Also listen to window resize
    window.addEventListener('resize', updateHeight)

    return () => {
      cancelAnimationFrame(rafId)
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
      window.removeEventListener('resize', updateHeight)
    }
  }, [isInterviewStarted, showFeedback, testResults.length])

  // Update code when language changes during interview
  useEffect(() => {
    if (isInterviewStarted && selectedScenario && !showFeedback) {
      let newCode: string

      // For bug fix scenarios, use buggyCode
      if (selectedScenario.type === 'bugfix') {
        newCode = (selectedScenario as any).buggyCode?.[selectedLanguage] || `// Bug fix code not available for ${selectedLanguage}`

        // Also update workspace files when language changes
        const codebaseFiles = (selectedScenario as any).codebaseFiles?.[selectedLanguage] || []
        if (codebaseFiles.length > 0) {
          const contextFiles = codebaseFiles.map((file: any) => ({
            path: file.fileName,
            content: file.content,
          }))
          setWorkspaceContext(contextFiles)
          toast.success(`Loaded ${contextFiles.length} codebase file(s) for ${selectedLanguage}`)
        } else {
          setWorkspaceContext([])
        }
      } else if (selectedScenario.type === 'add-functionality') {
        // For Add Functionality scenarios, use existingCode
        newCode = (selectedScenario as any).existingCode?.[selectedLanguage] || `// Add functionality code not available for ${selectedLanguage}`

        // Also update workspace files when language changes
        const codebaseFiles = (selectedScenario as any).codebaseFiles?.[selectedLanguage] || []
        if (codebaseFiles.length > 0) {
          const contextFiles = codebaseFiles.map((file: any) => ({
            path: file.fileName,
            content: file.content,
            description: file.description,
          }))
          setWorkspaceContext(contextFiles)
          toast.success(`Loaded ${contextFiles.length} codebase file(s) for ${selectedLanguage}`)
        } else {
          setWorkspaceContext([])
        }
      } else {
        // For DSA scenarios, use starterCode
        newCode = (selectedScenario as any).starterCode?.[selectedLanguage] || `function solution() {
  // Write your solution here

}`
      }

      // Only update if code is still the starter code or empty
      const currentCodeTrimmed = code.trim()
      const isEmptyOrStarter = currentCodeTrimmed === "" ||
        currentCodeTrimmed.includes("Write your solution here") ||
        currentCodeTrimmed.includes("BUG:") ||
        currentCodeTrimmed.length < 100

      if (isEmptyOrStarter) {
        setCode(newCode)
        setStarterCode(newCode)

        // Extract protected elements for code protection
        const protectedElementsData = extractProtectedElements(newCode, selectedLanguage)
        setProtectedElements(protectedElementsData)
      }
    }
  }, [selectedLanguage, isInterviewStarted, selectedScenario, showFeedback])

  // Track last activity timestamps for proactive interviewer
  const lastCodeChangeRef = useRef<number>(Date.now())
  const lastInterviewerMessageRef = useRef<number>(Date.now())
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null)
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const hasTriggeredInactivityRef = useRef<boolean>(false)
  const hasTriggeredSilenceRef = useRef<boolean>(false)

  // Proactive interviewer - improved with context-aware timing (code change detection)
  useEffect(() => {
    if (!isInterviewStarted || showFeedback || showPostInterviewDiscussion) return

    const codeHash = code.trim().replace(/\s+/g, " ")
    const codeLength = code.trim().length

    // Track code changes
    if (codeHash !== lastCodeHash) {
      lastCodeChangeRef.current = Date.now()
      hasTriggeredInactivityRef.current = false // Reset inactivity trigger on new code
    }

    // More intelligent timing based on code activity
    // Jump in after 15-30 seconds of inactivity, but only if meaningful code exists
    if (codeHash !== lastCodeHash && codeLength > 50 && lastCodeHash.length > 0) {
      if (proactiveTimer) {
        clearTimeout(proactiveTimer)
        setProactiveTimer(null)
      }

      // Variable timing: shorter for more complex code, longer for simpler
      const baseDelay = 15000 // 15 seconds base
      const complexityMultiplier = codeLength > 200 ? 0.8 : codeLength > 100 ? 1.0 : 1.2
      const delay = Math.floor(baseDelay * complexityMultiplier)

      const timer = setTimeout(() => {
        triggerProactiveInterviewer()
      }, delay)

      setProactiveTimer(timer)
      setLastCodeHash(codeHash)
    }

    return () => {
      if (proactiveTimer) {
        clearTimeout(proactiveTimer)
      }
    }
  }, [code, isInterviewStarted, showFeedback, showPostInterviewDiscussion, lastCodeHash])

  // Proactive interviewer - INACTIVITY detection (user not typing for too long)
  useEffect(() => {
    if (!isInterviewStarted || showFeedback || showPostInterviewDiscussion) return

    // Clear existing inactivity timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
    }

    // Set up inactivity check every 45 seconds
    const INACTIVITY_THRESHOLD = 45000 // 45 seconds of no code changes
    const CHECK_INTERVAL = 15000 // Check every 15 seconds

    const checkInactivity = () => {
      const timeSinceLastChange = Date.now() - lastCodeChangeRef.current
      const codeLength = code.trim().length

      // If user hasn't typed in 45+ seconds and hasn't been prompted yet
      if (timeSinceLastChange > INACTIVITY_THRESHOLD && !hasTriggeredInactivityRef.current) {
        hasTriggeredInactivityRef.current = true

        // Different prompts based on code state
        if (codeLength < 30) {
          // User hasn't started coding yet
          triggerProactiveInterviewerWithContext("inactivity_no_code")
        } else if (codeLength < 100) {
          // User started but seems stuck
          triggerProactiveInterviewerWithContext("inactivity_stuck")
        } else {
          // User was coding but stopped
          triggerProactiveInterviewerWithContext("inactivity_paused")
        }
      }
    }

    // Start checking after initial 30 seconds
    const initialDelay = setTimeout(() => {
      checkInactivity()
      inactivityTimerRef.current = setInterval(checkInactivity, CHECK_INTERVAL) as unknown as NodeJS.Timeout
    }, 30000)

    return () => {
      clearTimeout(initialDelay)
      if (inactivityTimerRef.current) {
        clearInterval(inactivityTimerRef.current)
      }
    }
  }, [isInterviewStarted, showFeedback, showPostInterviewDiscussion, code])

  // Proactive interviewer - SILENCE detection (user not communicating)
  useEffect(() => {
    if (!isInterviewStarted || showFeedback || showPostInterviewDiscussion) return

    // Update last interviewer message time when user sends a message
    const userMessages = interviewerMessages.filter(m => m.type === 'user')
    if (userMessages.length > 0) {
      lastInterviewerMessageRef.current = Date.now()
      hasTriggeredSilenceRef.current = false
    }

    // Clear existing silence timer
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
    }

    // Set up silence check - if user hasn't talked to interviewer in 2 minutes
    const SILENCE_THRESHOLD = 120000 // 2 minutes
    const CHECK_INTERVAL = 30000 // Check every 30 seconds

    const checkSilence = () => {
      const timeSinceLastMessage = Date.now() - lastInterviewerMessageRef.current
      const userMessageCount = interviewerMessages.filter(m => m.type === 'user').length

      // If user hasn't communicated with interviewer in 2+ minutes
      if (timeSinceLastMessage > SILENCE_THRESHOLD && !hasTriggeredSilenceRef.current && elapsedTime > 60) {
        hasTriggeredSilenceRef.current = true

        if (userMessageCount === 0) {
          // User hasn't said anything at all
          triggerProactiveInterviewerWithContext("silence_no_communication")
        } else {
          // User stopped communicating
          triggerProactiveInterviewerWithContext("silence_stopped")
        }
      }
    }

    // Start checking after 60 seconds
    const initialDelay = setTimeout(() => {
      checkSilence()
      silenceTimerRef.current = setInterval(checkSilence, CHECK_INTERVAL) as unknown as NodeJS.Timeout
    }, 60000)

    return () => {
      clearTimeout(initialDelay)
      if (silenceTimerRef.current) {
        clearInterval(silenceTimerRef.current)
      }
    }
  }, [isInterviewStarted, showFeedback, showPostInterviewDiscussion, interviewerMessages, elapsedTime])

  // Cleanup all proactive timers on unmount
  useEffect(() => {
    return () => {
      if (inactivityTimerRef.current) clearInterval(inactivityTimerRef.current)
      if (silenceTimerRef.current) clearInterval(silenceTimerRef.current)
    }
  }, [])

  // Auto-save session data every 30 seconds (localStorage + Firestore)
  useEffect(() => {
    if (!isInterviewStarted || !selectedScenario || !firebaseUser) return

    const autoSaveInterval = setInterval(async () => {
      try {
        const sessionData = {
          scenarioId: selectedScenario.id,
          code,
          chatMessages,
          interviewerMessages,
          selectedLanguage,
          elapsedTime,
          testResults,
          workspaceContext,
          timestamp: Date.now(),
        }

        // Save to localStorage with user-specific key (immediate backup)
        const storageKey = `interview_autosave_${firebaseUser.uid}_${selectedScenario.id}`
        localStorage.setItem(storageKey, JSON.stringify(sessionData))

        // Also save to Firestore if we have a session ID (for cross-device recovery)
        if (currentSessionId) {
          await saveSessionState(currentSessionId, {
            code,
            selectedLanguage,
            elapsedTime,
            chatMessages,
            interviewerMessages,
            testResults,
          })
        }

        console.log("Session auto-saved at", new Date().toLocaleTimeString())
      } catch (error) {
        console.error("Auto-save failed:", error)
      }
    }, 30000) // 30 seconds

    // Cleanup on unmount
    return () => {
      clearInterval(autoSaveInterval)
    }
  }, [isInterviewStarted, selectedScenario, firebaseUser, code, chatMessages, interviewerMessages, selectedLanguage, elapsedTime, testResults, workspaceContext, currentSessionId])

  // Restore auto-saved session on mount (check both localStorage and Firestore)
  useEffect(() => {
    if (!firebaseUser || !selectedScenario || isInterviewStarted) return

    const restoreSession = async () => {
      try {
        // Check localStorage first (faster)
        const storageKey = `interview_autosave_${firebaseUser.uid}_${selectedScenario.id}`
        const savedData = localStorage.getItem(storageKey)
        let localData = null
        let localTimestamp = 0

        if (savedData) {
          const parsed = JSON.parse(savedData)
          const timeSinceLastSave = Date.now() - parsed.timestamp
          if (timeSinceLastSave < 24 * 60 * 60 * 1000) {
            localData = parsed
            localTimestamp = parsed.timestamp
          } else {
            localStorage.removeItem(storageKey)
          }
        }

        // Check Firestore if we have a session ID in URL
        const sessionIdFromUrl = searchParams.get('session')
        let firestoreData = null
        let firestoreTimestamp = 0

        if (sessionIdFromUrl) {
          const firestoreState = await getSessionState(sessionIdFromUrl)
          if (firestoreState?.savedAt) {
            firestoreData = firestoreState
            firestoreTimestamp = new Date(firestoreState.savedAt).getTime()
            setCurrentSessionId(sessionIdFromUrl)
          }
        }

        // Use the most recent save (prefer Firestore if same time for cross-device)
        const useFirestore = firestoreData && (!localData || firestoreTimestamp >= localTimestamp)

        if (useFirestore && firestoreData) {
          setCode(firestoreData.code || "")
          setChatMessages((firestoreData.chatMessages as ChatMessage[]) || [])
          setInterviewerMessages((firestoreData.interviewerMessages as ChatMessage[]) || [])
          setSelectedLanguage((firestoreData.language as typeof selectedLanguage) || "javascript")
          setTestResults(firestoreData.testResults || [])
          if (firestoreData.elapsedTime) {
            setElapsedTime(firestoreData.elapsedTime)
          }
          toast.info("Session restored from cloud backup", {
            description: "Your progress was saved. Continue where you left off!",
          })
        } else if (localData) {
          setCode(localData.code || "")
          setChatMessages(localData.chatMessages || [])
          setInterviewerMessages(localData.interviewerMessages || [])
          setSelectedLanguage(localData.selectedLanguage || "javascript")
          setTestResults(localData.testResults || [])
          setWorkspaceContext(localData.workspaceContext || [])
          if (localData.elapsedTime) {
            setElapsedTime(localData.elapsedTime)
          }
          toast.info("Session restored from auto-save", {
            description: "Your local progress was recovered.",
          })
        }
      } catch (error) {
        console.error("Failed to restore auto-saved session:", error)
        toast.error("Could not restore session", {
          description: "Starting fresh. Previous progress may be lost.",
        })
      }
    }

    restoreSession()
  }, [firebaseUser, selectedScenario, searchParams])

  const triggerProactiveInterviewer = async () => {
    if (isLoadingInterviewer || showFeedback || showPostInterviewDiscussion) return

    setIsLoadingInterviewer(true)
    try {
      // Get user profile for context
      const userProfile = user ? await getUserProfile(user.id) : null

      // Analyze code patterns for context-aware feedback
      const codeAnalysis = analyzeCodeForProactiveFeedback(code)

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: codeAnalysis ? `[CONTEXT ANALYSIS]\n${codeAnalysis}` : "",
          context: interviewerMessages,
          role: "interviewer",
          userContext: userProfile ? {
            email: user.email,
            subscription_tier: userProfile.subscription_tier,
            sessions_used: usageLimit?.used || 0,
          } : undefined,
          workspaceContext: workspaceContext,
          currentCode: code,
          scenarioTitle: selectedScenario?.title,
          scenarioType: selectedScenario?.type,
          isProactive: true,
          elapsedTime: elapsedTime,
        }),
      })

      const data = await response.json()

      if (data.reply) {
        setInterviewerMessages((prev) => [...prev, { type: "ai", message: data.reply }])
      }
    } catch (error) {
      console.error("Proactive interviewer error:", error)
    } finally {
      setIsLoadingInterviewer(false)
    }
  }

  // Context-aware proactive interviewer for different scenarios
  const triggerProactiveInterviewerWithContext = async (contextType: string) => {
    if (isLoadingInterviewer || showFeedback || showPostInterviewDiscussion) return

    setIsLoadingInterviewer(true)
    try {
      const userProfile = user ? await getUserProfile(user.id) : null
      const minutesSpent = Math.floor(elapsedTime / 60)

      // Build context-specific prompt
      let contextPrompt = ""
      switch (contextType) {
        case "inactivity_no_code":
          contextPrompt = `[INTERVIEWER INTERVENTION - CANDIDATE NOT STARTED]
The candidate has been in the interview for ${minutesSpent} minute(s) but hasn't written any meaningful code yet.

As a supportive but direct interviewer, you should:
1. Check in with them - ask if they understand the problem
2. Ask them to walk through their approach before coding
3. Offer to clarify any requirements
4. Remind them that thinking out loud helps you assess their problem-solving skills

Be encouraging but also note that time is passing. Keep it natural and conversational.`
          break

        case "inactivity_stuck":
          contextPrompt = `[INTERVIEWER INTERVENTION - CANDIDATE SEEMS STUCK]
The candidate started coding but seems stuck. They've been inactive for a while with minimal code written.

As a helpful interviewer, you should:
1. Ask what they're thinking about
2. Offer a gentle hint or ask a guiding question
3. Suggest breaking down the problem into smaller steps
4. Ask if they want to discuss their approach

Be supportive - getting stuck is normal. Help them move forward.`
          break

        case "inactivity_paused":
          contextPrompt = `[INTERVIEWER INTERVENTION - CODING PAUSED]
The candidate was making progress but has paused coding for a while.

As an observant interviewer, you should:
1. Ask about their current thinking
2. If they have substantial code, ask about time/space complexity
3. Ask about edge cases they're considering
4. Check if they're debugging mentally or need help

Keep the conversation flowing - interviews should be collaborative.`
          break

        case "silence_no_communication":
          contextPrompt = `[INTERVIEWER INTERVENTION - NO COMMUNICATION]
The candidate hasn't communicated with you at all during the interview (${minutesSpent}+ minutes).

This is a problem in real interviews. As a direct interviewer, you should:
1. Remind them that communication is crucial in technical interviews
2. Ask them to walk you through what they're doing
3. Explain that you want to understand their thought process, not just see code
4. Note that silence hurts their collaboration score

Be direct but professional - this is important feedback.`
          break

        case "silence_stopped":
          contextPrompt = `[INTERVIEWER INTERVENTION - STOPPED COMMUNICATING]
The candidate was communicating earlier but has gone silent.

As an engaged interviewer, you should:
1. Check in with them - ask what they're working on
2. Ask about any challenges they're facing
3. Probe their current thinking about the solution
4. Keep the dialogue going

Interviews are conversations, not just coding exercises.`
          break

        default:
          contextPrompt = analyzeCodeForProactiveFeedback(code)
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: contextPrompt,
          context: interviewerMessages,
          role: "interviewer",
          userContext: userProfile ? {
            email: user?.email,
            subscription_tier: userProfile.subscription_tier,
            sessions_used: usageLimit?.used || 0,
          } : undefined,
          workspaceContext: workspaceContext,
          currentCode: code,
          scenarioTitle: selectedScenario?.title,
          scenarioType: selectedScenario?.type,
          isProactive: true,
          elapsedTime: elapsedTime,
        }),
      })

      const data = await response.json()

      if (data.reply) {
        setInterviewerMessages((prev) => [...prev, { type: "ai", message: data.reply }])
      }
    } catch (error) {
      console.error("Proactive interviewer error:", error)
    } finally {
      setIsLoadingInterviewer(false)
    }
  }

  // Analyze code for context-aware proactive feedback
  // IMPORTANT: This analysis is NEUTRAL - do not praise patterns until correctness is verified
  const analyzeCodeForProactiveFeedback = (code: string): string => {
    const analysis: string[] = []
    const observations: string[] = []

    // Detect patterns - use NEUTRAL language, NOT praise
    if (code.includes("for") && code.includes("for")) {
      observations.push("Candidate is using nested loops - ASK about time complexity implications")
    }

    if (code.match(/sort|\.sort\(/)) {
      observations.push("Candidate is using sorting - ASK about the complexity tradeoffs")
    }

    if (code.match(/Map|Set|HashMap|HashSet/)) {
      observations.push("Candidate is using hash-based data structures - ASK if they understand the space tradeoff")
    }

    if (code.match(/recursion|function.*\(.*\)\s*{[\s\S]*\1\(/)) {
      observations.push("Candidate is using recursion - ASK about base cases and stack limits")
    }

    if (code.length > 300 && !code.includes("//")) {
      observations.push("Code is getting lengthy without comments - ASK about code organization")
    }

    if (code.match(/if.*if.*if/)) {
      observations.push("Multiple nested conditionals detected - ASK about simplifying the logic")
    }

    if (code.match(/\/\/ TODO|\/\/ FIXME|\/\/ HACK/)) {
      observations.push("Candidate has TODO/FIXME comments - ASK about their plan to address these")
    }

    // Time-based context
    const minutesSpent = Math.floor(elapsedTime / 60)
    if (minutesSpent > 10 && code.length < 100) {
      observations.push(`Candidate has been working for ${minutesSpent} minutes but code is still minimal - might need guidance`)
    }

    // Build the context prompt for the interviewer
    if (observations.length > 0) {
      analysis.push(`[INTERVIEWER OBSERVATION - CODE ANALYSIS]
The candidate has written code. Here are observations for you to probe:

${observations.join("\n")}

CRITICAL RULES:
1. DO NOT praise the code until tests have been run and passed
2. Ask probing questions about their approach and design decisions
3. If they haven't run tests yet, suggest they test their solution
4. If they haven't explained their approach, ask them to walk you through it
5. Focus on understanding their thought process, NOT validating their code

Ask ONE focused question based on these observations.`)
    }

    return analysis.length > 0 ? analysis.join("\n") : ""
  }

  const triggerPostInterviewDiscussion = async (testResults: TestResult[], summary: any) => {
    setIsGeneratingDiscussion(true)

    try {
      if (!selectedScenario) {
        return
      }

      const partnerMessagesSent = chatMessages.filter((msg) => msg.type === "user").length
      const partnerMessagesReceived = chatMessages.filter((msg) => msg.type === "ai").length
      const interviewerUserMessages = interviewerMessages.filter((msg) => msg.type === "user")
      const interviewerQuestionsAnswered = interviewerUserMessages.length
      const interviewerClarificationsRequested = interviewerUserMessages.filter((msg) =>
        msg.message.includes("?")
      ).length
      const interviewerFeedbackAcknowledged = interviewerUserMessages.filter((msg) =>
        /thanks|got it|understand|cool|okay|ok/i.test(msg.message)
      ).length
      const proactiveInteractions =
        interviewerQuestionsAnswered > 0 || partnerMessagesSent > 0 ? 1 : 0

      const aiCollaborationMetrics = {
        partnerMessagesSent,
        partnerMessagesReceived,
        partnerHintsRequested: revealedHints,
      }

      const interactionMetrics = {
        interviewerQuestionsAnswered,
        interviewerClarificationsRequested,
        interviewerFeedbackAcknowledged,
        proactiveInteractions,
        problemDifficulty: selectedScenario?.difficulty,
        problemType: selectedScenario?.type,
        skillsDemonstrated: selectedScenario?.tags || [],
      }

      const noInterviewerWalkthrough = interactionMetrics.interviewerQuestionsAnswered === 0
      const noAiPartnerCollab = aiCollaborationMetrics.partnerMessagesSent === 0
      const rushedSession = elapsedTime < 90

      const applyCollaborationPenalty = (score: number) => {
        let adjustedScore = score
        // If no collaboration at all, cap at 45-50/100 (very strict penalty)
        if (noInterviewerWalkthrough && noAiPartnerCollab) {
          adjustedScore = Math.min(adjustedScore, 50)
          // If they also rushed, make it even lower
          if (rushedSession) {
            adjustedScore = Math.min(adjustedScore, 45)
          }
        }
        // If missing one form of collaboration, cap at 60/100
        else if (noInterviewerWalkthrough || noAiPartnerCollab) {
          adjustedScore = Math.min(adjustedScore, 60)
        }
        // Rushed session penalty (if they have some collaboration)
        if (rushedSession && !(noInterviewerWalkthrough && noAiPartnerCollab)) {
          adjustedScore = Math.min(adjustedScore, 65)
        }
        return Math.max(0, adjustedScore)
      }

      // Generate comprehensive feedback first
      let comprehensiveFeedback = `Completed ${selectedScenario?.title} with ${summary.passed}/${summary.total} tests passing`
      // Convert pass rate (0-100) to 0-100 score scale
      let calculatedPerformanceScore = summary.passRate

      // Calculate efficiency metrics for feedback
      const efficiencyData = analyzeCodeEfficiency(code)

      if (currentSessionId && user && code.trim()) {
        try {
          const feedbackResponse = await fetch("/api/generate-feedback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code,
              scenarioTitle: selectedScenario?.title,
              scenarioType: selectedScenario?.type,
              testResults: testResults,
              language: selectedLanguage,
              timeSpent: elapsedTime,
              aiCollaborationMetrics,
              interactionMetrics,
              // Pass efficiency metrics for accurate feedback
              efficiencyMetrics: efficiencyData,
              sessionId: currentSessionId,
              userId: user.id,
            }),
          })

          if (feedbackResponse.ok) {
            const feedbackData = await feedbackResponse.json()
            comprehensiveFeedback = feedbackData.feedback || comprehensiveFeedback
            calculatedPerformanceScore = feedbackData.performanceScore || calculatedPerformanceScore
          }
        } catch (feedbackError) {
          console.error("Error generating feedback:", feedbackError)
          toast.warning("Feedback generation delayed", {
            description: "Using basic feedback. Full analysis may be available shortly.",
          })
        }
      }

      calculatedPerformanceScore = applyCollaborationPenalty(calculatedPerformanceScore)
      setComprehensiveFeedback(comprehensiveFeedback)
      setPerformanceScore(calculatedPerformanceScore)

      // Now trigger interviewer to discuss the solution
      const userProfile = user ? await getUserProfile(user.id) : null
      const metrics = analyzeCodeEfficiency(code)

      const discussionPrompt = `[POST-INTERVIEW DISCUSSION - CONTINUE CONVERSATION] This is a continuation of our interview conversation. The candidate has just completed their coding solution.

TEST RESULTS: ${summary.passed}/${summary.total} tests passed (${summary.passRate}% pass rate)
TIME SPENT: ${Math.floor(elapsedTime / 60)} minutes ${elapsedTime % 60} seconds
EFFICIENCY METRICS:
- Time Complexity: ${metrics.estimatedTimeComplexity} (Optimal: ${metrics.optimalTimeComplexity})
- Space Complexity: ${metrics.estimatedSpaceComplexity} (Optimal: ${metrics.optimalSpaceComplexity})
- Efficiency Score: ${metrics.efficiencyScore}/100
- Code Complexity: ${metrics.complexity}
- Lines of Code: ${metrics.linesOfCode}

IMPORTANT: This is a POST-INTERVIEW DISCUSSION phase. You should:
1. Continue the conversation naturally - reference previous discussion points if relevant
2. Discuss the results and solution quality
3. Ask if they have questions about the solution, complexity, or optimizations
4. Be conversational - this is a debrief, not a restart

Do NOT reintroduce yourself. Continue as if we're in the middle of a discussion about their completed solution.

Be conversational and thorough - like a real interviewer debriefing after a coding interview.`

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: discussionPrompt,
          context: interviewerMessages,
          role: "interviewer",
          userContext: userProfile ? {
            email: user.email,
            subscription_tier: userProfile.subscription_tier,
            sessions_used: usageLimit?.used || 0,
          } : undefined,
          workspaceContext: workspaceContext,
          currentCode: code,
          scenarioTitle: selectedScenario?.title,
          scenarioType: selectedScenario?.type,
          isProactive: false,
        }),
      })

      const data = await response.json()

      if (data.reply) {
        setInterviewerMessages((prev) => [...prev, { type: "ai", message: data.reply }])
      }

      // Update session with completion data
      if (currentSessionId && user) {
        try {
          // performanceScore is now 0-100, save directly
          const scoreToSave = calculatedPerformanceScore
          await updateInterviewSession(
            currentSessionId,
            scoreToSave,
            comprehensiveFeedback
          )

          // Vectorize session for RAG features (async, non-blocking)
          fetch("/api/vectorize-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: user.id,
              sessionId: currentSessionId,
              scenarioId: selectedScenario?.id,
              scenarioTitle: selectedScenario?.title,
              language: selectedLanguage,
              code,
              testResults,
              timeSpent: elapsedTime,
              aiCollaborationMetrics,
              interactionMetrics,
              efficiencyMetrics: efficiencyData,
              scores: {
                correctness: (testResults.filter((t: TestResult) => t.passed).length / testResults.length) * 100,
                efficiency: efficiencyData.efficiencyScore,
                codeQuality: 70, // Default, would need more analysis
                reasoningExplanation: aiCollaborationMetrics.partnerMessagesSent > 0 ? 50 : 0,
                aiCollaboration: aiCollaborationMetrics.partnerMessagesSent > 0 ? 50 : 0,
                overall: calculatedPerformanceScore,
              },
            }),
          }).catch((err) => {
            console.error("Vectorization error (non-blocking):", err)
          })
        } catch (error) {
          console.error("Error updating session on completion:", error)
        }
      }
    } catch (error) {
      console.error("Error in post-interview discussion:", error)
      toast.error("Failed to start discussion")
    } finally {
      setIsGeneratingDiscussion(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const newFiles: Array<{ path: string; content: string }> = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (file.type.startsWith("text/") || file.name.match(/\.(js|ts|jsx|tsx|py|java|cpp|c|h|json|md|txt)$/i)) {
        try {
          const content = await file.text()
          if (content.length < 50000) {
            newFiles.push({
              path: file.name,
              content: content,
            })
          }
        } catch (error) {
          console.error(`Error reading file ${file.name}:`, error)
        }
      }
    }

    if (newFiles.length > 0) {
      setWorkspaceContext((prev) => [...prev, ...newFiles])
      toast.success(`Added ${newFiles.length} file(s) to workspace context`)
    }
  }

  const startInterview = async () => {
    if (!selectedScenario) {
      toast.error("Please select a scenario first")
      return
    }

    // Check usage limit before starting - redirect to limit page (skip for DSA questions)
    if (user && usageLimit && !usageLimit.allowed && selectedScenario.type !== 'dsa') {
      router.push("/limit-reached")
      return
    }

    // Create session and increment usage when starting interview
    // DSA questions don't count against session limit
    if (user) {
      try {
        // Create session document first
        const sessionId = await createInterviewSession(
          user.id,
          selectedScenario.title,
          selectedScenario.type,
          selectedScenario.difficulty,
          selectedScenario.id
        )
        setCurrentSessionId(sessionId)

        // Record session start (uses free opens or consumes 1 usage)
        const result = await recordSessionStart(user.id)
        if (result.usedPaidSession) {
          toast.success(`Session started! You now have ${result.freeOpensRemaining} free opens.`)
        }
        // Refresh usage limit
        const updatedUsage = await checkUsageLimit(user.id)
        setUsageLimit(updatedUsage)
      } catch (error) {
        console.error("Error creating session:", error)
        toast.error("Session tracking error", {
          description: "Your progress will still be saved locally. You can continue the interview.",
        })
      }
    }

    setIsInterviewStarted(true)
    setShowScenarioBrowser(false)
    setStartTime(Date.now())

    // Initialize code based on scenario type
    let initialCode: string
    if (selectedScenario.type === 'bugfix') {
      // For bug fixes, load buggy code
      initialCode = (selectedScenario as any).buggyCode?.[selectedLanguage] || `// Bug fix code not available for ${selectedLanguage}`

      // Auto-load codebase files into workspace context for bug fixes
      const codebaseFiles = (selectedScenario as any).codebaseFiles?.[selectedLanguage] || []
      if (codebaseFiles.length > 0) {
        const contextFiles = codebaseFiles.map((file: any) => ({
          path: file.fileName,
          content: file.content,
        }))
        setWorkspaceContext(contextFiles)
        toast.success(`Loaded ${contextFiles.length} codebase file(s) for context`)
      }
    } else if (selectedScenario.type === 'add-functionality') {
      // For Add Functionality scenarios, load existing code to extend
      initialCode = (selectedScenario as any).existingCode?.[selectedLanguage] || `// Add functionality to the existing codebase`

      // Auto-load codebase files into workspace context
      const codebaseFiles = (selectedScenario as any).codebaseFiles?.[selectedLanguage] || []
      if (codebaseFiles.length > 0) {
        const contextFiles = codebaseFiles.map((file: any) => ({
          path: file.fileName,
          content: file.content,
          description: file.description,
        }))
        setWorkspaceContext(contextFiles)
        toast.success(`Loaded ${contextFiles.length} codebase file(s) - review them to understand the existing code`)
      }
    } else {
      // For DSA problems, load starter code
      initialCode = (selectedScenario as any).starterCode?.[selectedLanguage] || `function solution() {
  // Write your solution here

}`
    }
    setCode(initialCode)
    setStarterCode(initialCode)

    // Extract protected elements for code protection
    const protectedElementsData = extractProtectedElements(initialCode, selectedLanguage)
    setProtectedElements(protectedElementsData)

    // Initialize interviewer with welcome message (problem details are now in left panel)
    const problemType = selectedScenario.type === 'bugfix' ? 'BUG FIX' :
      selectedScenario.type === 'add-functionality' ? 'ADD FUNCTIONALITY' :
        selectedScenario.type.toUpperCase()
    const initialMessage = `Hey, I'm Sable—your interviewer for this session. I keep things direct and brutally honest so you get signal that actually helps you improve. Today we're tackling **${selectedScenario.title}**, a ${selectedScenario.difficulty} ${problemType} problem.

Here's what I expect:
- Walk me through your plan before you code; if you skip that, I'll call it out.
- Narrate while you build so I can understand your reasoning.
- Use the AI partner intentionally. If you're just copying suggestions, I'll flag it.

Take a breath, study the prompt on the left, and tell me how you plan to attack this.`

    setInterviewerMessages([{ type: "ai", message: initialMessage }])
    setChatMessages([{
      type: "ai",
      message: `Hi! I'm your AI coding partner. I can help with algorithms, debugging, and hints for ${selectedScenario.title}. Just ask!`,
    }])
  }

  const resetInterview = async () => {
    // Update session if it exists and was completed
    if (currentSessionId && (showFeedback || showPostInterviewDiscussion) && testSummary.total > 0) {
      try {
        // Use performance score if available (already 0-100), otherwise use pass rate
        const scoreToSave = performanceScore !== null ? performanceScore : testSummary.passRate
        await updateInterviewSession(
          currentSessionId,
          scoreToSave,
          comprehensiveFeedback || `Completed ${selectedScenario?.title} with ${testSummary.passed}/${testSummary.total} tests passing`
        )
      } catch (error) {
        console.error("Error updating session:", error)
        // Silent failure - session data is also saved locally
      }
    }

    // Monaco cleanup - dispose editor and all models to prevent memory leaks
    if (editorRef.current) {
      try {
        editorRef.current.dispose()
      } catch (e) {
        console.warn('Error disposing editor on reset:', e)
      }
      editorRef.current = null
    }

    if (typeof window !== 'undefined' && (window as any).monaco?.editor) {
      try {
        const models = (window as any).monaco.editor.getModels()
        models.forEach((model: any) => {
          try {
            if (!model.isDisposed()) {
              model.dispose()
            }
          } catch (e) {
            // Model may already be disposed
          }
        })
      } catch (e) {
        console.warn('Error disposing Monaco models on reset:', e)
      }
    }

    // Clear URL params when resetting
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.delete('session')
      url.searchParams.delete('scenario')
      window.history.replaceState({}, '', url.toString())
    }

    // Clear all proactive interview timers
    if (proactiveTimer) {
      clearTimeout(proactiveTimer)
      setProactiveTimer(null)
    }
    if (inactivityTimerRef.current) {
      clearInterval(inactivityTimerRef.current)
      inactivityTimerRef.current = null
    }
    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current)
      silenceTimerRef.current = null
    }

    // Reset proactive trigger flags
    hasTriggeredInactivityRef.current = false
    hasTriggeredSilenceRef.current = false
    lastCodeChangeRef.current = Date.now()
    lastInterviewerMessageRef.current = Date.now()

    setIsInterviewStarted(false)
    setShowFeedback(false)
    setShowPostInterviewDiscussion(false)
    setComprehensiveFeedback("")
    setPerformanceScore(null)
    setIsGeneratingDiscussion(false)
    setShowScenarioBrowser(true)
    setCode("")
    setInterviewerMessages([])
    setChatMessages([])
    setTestResults([])
    setTestSummary({ total: 0, passed: 0, failed: 0, passRate: 0 })
    setStartTime(null)
    setElapsedTime(0)
    setLastCodeHash("")
    setCurrentSessionId(null)
    setRevealedHints(0)
    setWorkspaceContext([])
    setEfficiencyMetrics(null)
    setProtectedElements(null)
    setStarterCode("")
  }

  const proceedToFinalFeedback = async () => {
    setShowPostInterviewDiscussion(false)
    setShowFeedback(true)
  }

  // Fetch RAG hints for the current problem
  const fetchRAGHints = async () => {
    if (!selectedScenario) return

    setIsLoadingHints(true)
    try {
      const response = await fetch("/api/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "get-hints",
          problemText: selectedScenario.problemStatement,
          problemTitle: selectedScenario.title,
          userCode: code,
          difficulty: selectedScenario.difficulty,
          problemType: selectedScenario.type,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setRagHints(data.contextualHints || [])
      }
    } catch (error) {
      console.error("Error fetching hints:", error)
    } finally {
      setIsLoadingHints(false)
    }
  }

  // AI Usage Tips content
  const aiUsageTips = [
    {
      title: "Ask Strategic Questions",
      description: "Don't ask the AI to solve the problem. Instead, ask about specific concepts: 'What data structure is best for O(1) lookups?' or 'How does the two-pointer technique work?'",
      good: "What's the time complexity of using a hash map vs array for lookups?",
      bad: "Can you solve this two-sum problem for me?",
    },
    {
      title: "Explain Your Thinking",
      description: "Share your approach before asking for help. This shows the interviewer you're thinking, and helps the AI give more relevant hints.",
      good: "I'm thinking of using nested loops but worried about O(n²). Is there a better approach?",
      bad: "What should I do?",
    },
    {
      title: "Debug with Context",
      description: "When debugging, provide specific context about what's failing and what you've tried.",
      good: "My code returns [1,2] but expected [2,1]. I think the issue is in my sorting logic. Can you help me trace through it?",
      bad: "Why isn't my code working?",
    },
    {
      title: "Verify Understanding",
      description: "After getting a hint, explain it back in your own words. This shows the interviewer you understand, not just copy.",
      good: "So you're suggesting I use a hash map because lookup is O(1)? Let me implement that.",
      bad: "*copies suggestion without explanation*",
    },
  ]

  // Voice recording with Web Speech API - with proper permission handling
  const toggleVoiceRecording = async (isInterviewer: boolean) => {
    const isRecording = isInterviewer ? isRecordingInterviewer : isRecordingPartner
    const setIsRecording = isInterviewer ? setIsRecordingInterviewer : setIsRecordingPartner
    const setInput = isInterviewer ? setInterviewerInput : setChatInput

    if (isRecording) {
      // Stop recording
      if (recognitionRef.current) {
        recognitionRef.current.stop()
        recognitionRef.current = null
      }
      setIsRecording(false)
      return
    }

    // Check for browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast.error("Voice input is not supported in your browser. Try Chrome or Edge.")
      return
    }

    // First, explicitly request microphone permission
    try {
      // Check current permission status
      if (navigator.permissions) {
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName })
        if (permissionStatus.state === 'denied') {
          toast.error("Microphone access is blocked. Please enable it in your browser settings.")
          return
        }
      }

      // Request microphone access explicitly before starting speech recognition
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // Stop the stream immediately - we just needed permission
      stream.getTracks().forEach(track => track.stop())

      toast.info("Microphone access granted. Starting voice input...")
    } catch (err: any) {
      console.error('Microphone permission error:', err)
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        toast.error("Microphone access denied. Please allow microphone access in your browser.")
      } else if (err.name === 'NotFoundError') {
        toast.error("No microphone found. Please connect a microphone and try again.")
      } else {
        toast.error("Could not access microphone. Please check your browser settings.")
      }
      return
    }

    // Start recording with speech recognition
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      setIsRecording(true)
      toast.success("Listening... Speak now", { duration: 2000 })
    }

    recognition.onresult = (event: any) => {
      let transcript = ''
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      setInput(transcript)
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      if (event.error === 'not-allowed') {
        toast.error("Microphone access denied. Please allow microphone access in your browser settings.")
      } else if (event.error === 'no-speech') {
        toast.info("No speech detected. Try speaking louder or closer to the microphone.")
      } else if (event.error !== 'aborted') {
        toast.error("Voice recognition error. Please try again.")
      }
      setIsRecording(false)
      recognitionRef.current = null
    }

    recognition.onend = () => {
      setIsRecording(false)
      recognitionRef.current = null
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  const handleSendMessage = async (isInterviewer = false) => {
    const input = isInterviewer ? interviewerInput : chatInput
    const setInput = isInterviewer ? setInterviewerInput : setChatInput
    const messages = isInterviewer ? interviewerMessages : chatMessages
    const setMessages = isInterviewer ? setInterviewerMessages : setChatMessages
    const setLoading = isInterviewer ? setIsLoadingInterviewer : setIsLoadingChat

    if (input.trim()) {
      const newUserMessage: ChatMessage = { type: "user", message: input }
      setMessages((prev) => [...prev, newUserMessage])
      setInput("")
      setLoading(true)

      // Check if user wants to end the session
      const conclusionSignals = [
        "no thanks", "no thank", "no, thanks", "i'm done", "im done", "done",
        "conclude", "end session", "that's all", "thats all", "nothing else",
        "no questions", "i'm good", "im good", "all good", "let's wrap", "lets wrap"
      ]
      const isEndingSession = conclusionSignals.some(signal =>
        input.toLowerCase().includes(signal)
      )

      try {
        // Get user profile for context
        const userProfile = user ? await getUserProfile(user.id) : null

        // Extract name for personalization
        let userName = user?.user_metadata?.full_name || userProfile?.full_name || user?.email?.split("@")[0] || ""

        // Add post-interview context if in that phase
        let additionalContext = ""
        if (showPostInterviewDiscussion && isInterviewer) {
          additionalContext = isEndingSession
            ? "\n\n[IMPORTANT: The candidate wants to end the session. Respond with a brief, graceful conclusion. Thank them, give a quick summary of their performance, and wish them luck. Do NOT ask more questions.]"
            : "\n\n[POST-INTERVIEW DISCUSSION: Continue discussing their solution. If they indicate they're done or have no questions, wrap up gracefully.]"
        }

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: input + additionalContext,
            context: messages,
            role: isInterviewer ? "interviewer" : "partner",
            userContext: userProfile ? {
              email: user.email,
              full_name: userName,
              subscription_tier: userProfile.subscription_tier,
              sessions_used: usageLimit?.used || 0,
            } : undefined,
            workspaceContext: workspaceContext,
            currentCode: code,
            scenarioTitle: selectedScenario?.title,
            scenarioType: selectedScenario?.type,
            isProactive: false,
            isPostInterview: showPostInterviewDiscussion,
            isEndingSession: isEndingSession,
          }),
        })

        const data = await response.json()

        if (data.reply) {
          setMessages((prev) => [...prev, { type: "ai", message: data.reply }])
        } else {
          setMessages((prev) => [
            ...prev,
            { type: "ai", message: "Sorry, I encountered an error. Please try again." },
          ])
        }
      } catch (error) {
        console.error("Chat error:", error)
        setMessages((prev) => [...prev, { type: "ai", message: "Sorry, I couldn't process that. Please try again." }])
        toast.error("Failed to send message", {
          description: "Network error. Please check your connection and try again.",
          action: {
            label: "Retry",
            onClick: () => handleSendMessage(isInterviewer),
          },
        })
      } finally {
        setLoading(false)
      }
    }
  }

  const analyzeCodeEfficiency = (code: string) => {
    // Calculate lines of code (excluding empty lines and comments)
    const lines = code.split('\n')
    const linesOfCode = lines.filter(line => {
      const trimmed = line.trim()
      return trimmed.length > 0 && !trimmed.startsWith('//') && !trimmed.startsWith('/*') && !trimmed.startsWith('*')
    }).length

    // Basic complexity estimation based on control structures
    const controlStructures = (code.match(/\b(if|else|for|while|switch|case|catch)\b/g) || []).length
    const complexityLevel = controlStructures <= 3 ? "Low" : controlStructures <= 7 ? "Medium" : "High"

    // Estimate time complexity based on nested loops
    const nestedLoopCount = (code.match(/for.*{[^}]*for/gs) || []).length +
      (code.match(/while.*{[^}]*while/gs) || []).length
    let estimatedTimeComplexity = "O(n)"
    if (nestedLoopCount >= 2) {
      estimatedTimeComplexity = "O(n³)"
    } else if (nestedLoopCount === 1) {
      estimatedTimeComplexity = "O(n²)"
    } else if (code.includes("sort")) {
      estimatedTimeComplexity = "O(n log n)"
    }

    // Estimate space complexity based on data structures
    const hasHashMap = code.includes("Map") || code.includes("Set") || code.includes("Object") || code.includes("{}")
    const hasArray = code.includes("[") || code.includes("Array")
    let estimatedSpaceComplexity = "O(1)"
    if (hasHashMap || hasArray) {
      estimatedSpaceComplexity = "O(n)"
    }

    // Get optimal complexity from scenario
    const optimalTimeComplexity = (selectedScenario as any)?.optimalComplexity?.time || "N/A"
    const optimalSpaceComplexity = (selectedScenario as any)?.optimalComplexity?.space || "N/A"

    // Calculate efficiency score (0-100)
    let efficiencyScore = 100

    // Deduct points for suboptimal time complexity
    if (optimalTimeComplexity !== "N/A" && estimatedTimeComplexity !== optimalTimeComplexity) {
      efficiencyScore -= 20
    }

    // Deduct points for suboptimal space complexity
    if (optimalSpaceComplexity !== "N/A" && estimatedSpaceComplexity !== optimalSpaceComplexity) {
      efficiencyScore -= 10
    }

    // Deduct points for excessive complexity
    if (complexityLevel === "High") {
      efficiencyScore -= 15
    } else if (complexityLevel === "Medium") {
      efficiencyScore -= 5
    }

    // Deduct points for excessive lines of code
    if (linesOfCode > 30) {
      efficiencyScore -= 10
    } else if (linesOfCode > 20) {
      efficiencyScore -= 5
    }

    return {
      linesOfCode,
      complexity: complexityLevel,
      estimatedTimeComplexity,
      estimatedSpaceComplexity,
      optimalTimeComplexity,
      optimalSpaceComplexity,
      efficiencyScore: Math.max(0, efficiencyScore),
    }
  }

  const runCode = async () => {
    if (!selectedScenario) return

    setIsRunningTests(true)
    setTestResults([])

    // Analyze code efficiency
    const metrics = analyzeCodeEfficiency(code)
    setEfficiencyMetrics(metrics)

    try {
      const response = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          scenarioId: selectedScenario.id,
          language: selectedLanguage,
        }),
      })

      const data = await response.json()

      if (data.results) {
        setTestResults(data.results)
        setTestSummary(data.summary)

        // Play sound based on results
        if (data.summary.passRate === 100) {
          playSound('success')
        } else if (data.summary.passRate >= 50) {
          playSound('milestone')
        } else {
          playSound('fail')
        }

        if (data.success) {
          // Start post-interview discussion phase instead of immediately showing feedback
          setIsRunningTests(false)
          setShowPostInterviewDiscussion(true)

          // Trigger interviewer to analyze the solution
          triggerPostInterviewDiscussion(data.results, data.summary)
        }
      }
    } catch (error) {
      console.error("Code execution error:", error)
      toast.error("Failed to run tests", {
        description: "There was a problem executing your code. Please try again.",
        action: {
          label: "Retry",
          onClick: () => runCode(),
        },
      })
    } finally {
      setIsRunningTests(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Memoize filtered scenarios to avoid recalculating on every render
  const filteredScenarios = useMemo(() => {
    return filterScenarios({
      type: filterType.length > 0 ? filterType : undefined,
      difficulty: filterDifficulty.length > 0 ? filterDifficulty : undefined,
      companies: filterCompanies.length > 0 ? filterCompanies : undefined,
      searchQuery: searchQuery || undefined,
    })
  }, [filterType, filterDifficulty, filterCompanies, searchQuery])

  if (isLoading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </main>
    )
  }

  if (!user) {
    return null
  }

  // Determine if we should hide the header (during interview mode)
  const isInterviewMode = !showScenarioBrowser && (isInterviewStarted || selectedScenario !== null)
  const isResultView = showFeedback || showPostInterviewDiscussion

  return (
    <main className="min-h-screen bg-black">
      {!isInterviewMode && <Header />}

      {/* Scenario Browser */}
      {showScenarioBrowser && (
        <section className="pt-24 pb-16 bg-gradient-to-br from-black via-gray-900 to-black">
          <div className="container mx-auto px-4">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-8">
                <h1 className="text-4xl md:text-6xl font-heading font-bold text-white mb-4">
                  Select Interview Scenario
                </h1>
                <p className="text-xl text-gray-300 mb-6">Choose a problem to practice</p>
                <div className="flex flex-wrap justify-center gap-4 text-sm">
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-lg border border-gray-700">
                    <div className="w-2 h-2 rounded-full bg-[#00d9ff]"></div>
                    <span className="text-white font-semibold">{scenarios.filter(s => s.type === 'dsa').length}</span>
                    <span className="text-gray-400">DSA Questions</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-lg border border-gray-700">
                    <div className="w-2 h-2 rounded-full bg-[#00ff88]"></div>
                    <span className="text-white font-semibold">{scenarios.filter(s => s.type === 'bugfix').length}</span>
                    <span className="text-gray-400">Bug Fix</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 rounded-lg border border-yellow-500/30">
                    <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                    <span className="text-white font-semibold">{scenarios.filter(s => s.type === 'add-functionality').length}</span>
                    <span className="text-yellow-300">Add Functionality</span>
                    <span className="text-[10px] text-yellow-500 bg-yellow-500/20 px-1.5 rounded">Flagship</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-lg border border-gray-700">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    <span className="text-white font-semibold">{scenarios.filter(s => s.type === 'system-design').length}</span>
                    <span className="text-gray-400">System Design</span>
                  </div>
                </div>
              </div>

              {/* Filters */}
              <Card className="bg-gray-900/50 border-gray-700 glass-effect mb-6">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Search */}
                    <div className="md:col-span-2 lg:col-span-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search scenarios..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10 bg-gray-800 border-gray-600 text-white"
                        />
                      </div>
                    </div>

                    {/* Type Filter */}
                    <div>
                      <select
                        value={filterType.join(",")}
                        onChange={(e) => setFilterType(e.target.value ? e.target.value.split(",") as ScenarioType[] : [])}
                        className="w-full bg-gray-800 border border-gray-600 text-white rounded-md px-3 py-2"
                      >
                        <option value="">All Types</option>
                        <option value="dsa">DSA</option>
                        <option value="bugfix">Bug Fix</option>
                        <option value="add-functionality">Add Functionality</option>
                        <option value="system-design">System Design</option>
                        <option value="optimization">Optimization</option>
                        <option value="security">Security</option>
                      </select>
                    </div>

                    {/* Difficulty Filter */}
                    <div>
                      <select
                        value={filterDifficulty.join(",")}
                        onChange={(e) => setFilterDifficulty(e.target.value ? e.target.value.split(",") as DifficultyLevel[] : [])}
                        className="w-full bg-gray-800 border border-gray-600 text-white rounded-md px-3 py-2"
                      >
                        <option value="">All Difficulties</option>
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>

                    {/* Company Filter */}
                    <div>
                      <select
                        value={filterCompanies.join(",")}
                        onChange={(e) => setFilterCompanies(e.target.value ? e.target.value.split(",") as Company[] : [])}
                        className="w-full bg-gray-800 border border-gray-600 text-white rounded-md px-3 py-2"
                      >
                        <option value="">All Companies</option>
                        <option value="Google">Google</option>
                        <option value="Meta">Meta</option>
                        <option value="Amazon">Amazon</option>
                        <option value="Microsoft">Microsoft</option>
                        <option value="Apple">Apple</option>
                        <option value="Netflix">Netflix</option>
                        <option value="Airbnb">Airbnb</option>
                        <option value="Shopify">Shopify</option>
                        <option value="Walmart">Walmart</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Scenarios List */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredScenarios.map((scenario) => (
                  <Card
                    key={scenario.id}
                    onClick={() => setSelectedScenario(scenario)}
                    className={`bg-gray-900/50 border-gray-700 glass-effect scenario-card cursor-pointer transition-all duration-200 hover:border-gray-600 ${selectedScenario?.id === scenario.id ? "border-[#00d9ff] ring-2 ring-[#00d9ff]/50 selected" : ""
                      }`}
                  >
                    <CardHeader>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={`${scenario.type === "dsa" ? "bg-[#00d9ff] text-black" :
                          scenario.type === "bugfix" ? "bg-[#00ff88] text-black" :
                            scenario.type === "add-functionality" ? "bg-yellow-400 text-black" :
                              scenario.type === "system-design" ? "bg-purple-500 text-white" :
                                "bg-gray-500 text-white"
                          } text-xs font-semibold`}>
                          {scenario.type === "dsa" ? "DSA" :
                            scenario.type === "bugfix" ? "BUG FIX" :
                              scenario.type === "add-functionality" ? "ADD FEATURE" :
                                scenario.type.toUpperCase()}
                        </Badge>
                        <Badge className={`${scenario.difficulty === "easy" ? "bg-green-600" :
                          scenario.difficulty === "medium" ? "bg-yellow-600" :
                            "bg-red-600"
                          } text-xs`}>
                          {scenario.difficulty.toUpperCase()}
                        </Badge>
                      </div>
                      <CardTitle className="text-white mb-2">{scenario.title}</CardTitle>
                      <p className="text-gray-400 text-sm">{scenario.description}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {scenario.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
                        <span>{scenario.companies.slice(0, 2).join(", ")}</span>
                        <span>{scenario.estimatedTime} min</span>
                      </div>
                      {/* Conditional Button Display */}
                      <div className="space-y-2">
                        {usageLimit && !usageLimit.allowed && scenario.type !== 'dsa' && (
                          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2 mb-2">
                            <p className="text-yellow-400 text-xs font-medium mb-1">Limit Reached</p>
                            <p className="text-gray-300 text-xs mb-2">
                              Upgrade to Pro for unlimited practice!
                            </p>
                            <Link href="/limit-reached">
                              <Button size="sm" className="bg-yellow-500 hover:bg-yellow-600 text-black w-full text-xs h-6">
                                Upgrade
                              </Button>
                            </Link>
                          </div>
                        )}
                        {selectedScenario?.id === scenario.id ? (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation()
                              startInterview()
                            }}
                            disabled={usageLimit && !usageLimit.allowed && scenario.type !== 'dsa'}
                            className="w-full bg-[#00d9ff] hover:bg-[#00d9ff]/80 text-white disabled:opacity-50 disabled:cursor-not-allowed h-12 text-lg font-semibold shadow-lg"
                          >
                            <Play className="mr-2 h-5 w-5" />
                            Start Interview
                          </Button>
                        ) : (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedScenario(scenario)
                            }}
                            variant="outline"
                            className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
                          >
                            Select Practice
                          </Button>
                        )}
                        {usageLimit && usageLimit.allowed && scenario.type !== 'dsa' && (
                          <p className="text-xs text-gray-400 text-center">
                            {usageLimit.limit - usageLimit.used} session{usageLimit.limit - usageLimit.used !== 1 ? 's' : ''} remaining
                          </p>
                        )}
                        {scenario.type === 'dsa' && (
                          <p className="text-xs text-green-400 text-center">
                            Free to practice
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Interview Interface */}
      {!showScenarioBrowser && (
        <section
          className={`pt-2 pb-2 bg-gradient-to-b from-gray-900 to-black flex flex-col ${isResultView ? "min-h-screen overflow-x-hidden overflow-y-auto" : "h-screen overflow-hidden"
            }`}
        >
          <div className={`container mx-auto px-2 flex-1 flex flex-col ${isResultView ? "overflow-visible" : "overflow-hidden"}`}>
            <div className={`w-full mx-auto flex-1 flex flex-col gap-1 ${isResultView ? "overflow-visible" : "overflow-hidden"}`}>
              {/* Compact Top Bar */}
              <div className="flex items-center justify-between flex-shrink-0 pt-2">
                <div className="flex items-center space-x-3">
                  <h2 className="text-white text-sm font-semibold truncate max-w-md">
                    {selectedScenario?.title}
                  </h2>
                  <Badge className={`${selectedScenario?.difficulty === "easy" ? "bg-green-600/20 text-green-400" :
                    selectedScenario?.difficulty === "medium" ? "bg-yellow-600/20 text-yellow-400" :
                      "bg-red-600/20 text-red-400"
                    } text-xs`}>
                    {selectedScenario?.difficulty?.toUpperCase()}
                  </Badge>
                  {/* Language Selector */}
                  <select
                    value={selectedLanguage}
                    onChange={(e) => {
                      const newLang = e.target.value as typeof selectedLanguage
                      setSelectedLanguage(newLang)
                      if (!isLanguageSupported(newLang)) {
                        toast.warning(`${newLang.toUpperCase()} execution coming soon`, {
                          description: "You can write code, but tests won't run. Use JavaScript or Python for full support.",
                          duration: 5000,
                        })
                      }
                    }}
                    className="bg-gray-800 border border-gray-600 text-white rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#00d9ff]"
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
                <div className="flex items-center space-x-3">
                  {isInterviewStarted && (
                    <div className="flex items-center space-x-2 text-white bg-gray-800 px-3 py-1 rounded-lg">
                      <Clock className="h-3 w-3 text-[#00d9ff]" />
                      <span className="text-sm font-mono">{formatTime(elapsedTime)}</span>
                    </div>
                  )}
                  <Button
                    onClick={() => setShowCloseDialog(true)}
                    variant="outline"
                    size="sm"
                    className="border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent h-7 text-xs"
                  >
                    <ArrowLeft className="mr-1 h-3 w-3" />
                    Close
                  </Button>
                </div>
              </div>

              {/* Main Interface - Three Column Layout */}
              {!showFeedback && !showPostInterviewDiscussion ? (
                <div
                  className={`grid grid-cols-1 gap-2 flex-1 min-h-0 overflow-hidden transition-all duration-300 ${isCodeViewerOpen ? "xl:ml-[600px]" : ""
                    } md:grid-cols-[240px_minmax(0,1fr)] lg:grid-cols-[260px_minmax(0,1fr)_260px] xl:grid-cols-[300px_minmax(0,1fr)_300px] 2xl:grid-cols-[340px_minmax(0,1fr)_340px]`}
                >
                  {/* Left: Problem Description / File Upload */}
                  <Card className="bg-gray-900/50 border-gray-700 glass-effect flex flex-col h-full overflow-hidden order-1">
                    <CardHeader className="pb-2 flex-shrink-0">
                      <CardTitle className="text-white flex items-center space-x-2 text-sm">
                        <Target className="h-4 w-4 text-[#00d9ff]" />
                        <span>Problem</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-0 overflow-y-auto text-xs sm:text-sm leading-relaxed space-y-4 pr-1">
                      {selectedScenario && (
                        <>
                          <div>
                            <h3 className="text-white font-semibold mb-1">Description</h3>
                            <p className="text-gray-300 leading-relaxed">{selectedScenario.problemStatement}</p>
                          </div>

                          {selectedScenario.type === 'dsa' && selectedScenario.examples && selectedScenario.examples.length > 0 && (
                            <div>
                              <h3 className="text-white font-semibold mb-1">Examples</h3>
                              <div className="space-y-2">
                                {selectedScenario.examples.slice(0, 2).map((ex, i) => (
                                  <div key={i} className="bg-gray-800/50 p-2 rounded text-xs">
                                    <div className="text-gray-400">Input: <span className="text-green-400">{ex.input}</span></div>
                                    <div className="text-gray-400">Output: <span className="text-blue-400">{ex.output}</span></div>
                                    {ex.explanation && <div className="text-gray-500 mt-1 text-xs">{ex.explanation}</div>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {selectedScenario.type === 'dsa' && selectedScenario.constraints && selectedScenario.constraints.length > 0 && (
                            <div>
                              <h3 className="text-white font-semibold mb-1">Constraints</h3>
                              <ul className="text-gray-300 space-y-1 list-disc list-inside">
                                {selectedScenario.constraints.slice(0, 3).map((c, i) => (
                                  <li key={i} className="text-xs">{c}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Hints Section */}
                          {isInterviewStarted && (selectedScenario as any).hints && (selectedScenario as any).hints.length > 0 && (
                            <div className="border-t border-gray-700 pt-3 mt-3">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="text-white font-semibold flex items-center space-x-1 text-xs">
                                  <Lightbulb className="h-3 w-3 text-yellow-400" />
                                  <span>Hints ({revealedHints}/{(selectedScenario as any).hints.length})</span>
                                </h3>
                                {revealedHints < (selectedScenario as any).hints.length && (
                                  <span className="text-xs text-gray-400">
                                    Next in {Math.ceil((180 - (elapsedTime % 180)) / 60)}m
                                  </span>
                                )}
                              </div>
                              {revealedHints > 0 ? (
                                <div className="space-y-2">
                                  {(selectedScenario as any).hints.slice(0, revealedHints).map((hint: string, i: number) => (
                                    <div key={i} className="bg-yellow-500/10 border border-yellow-500/20 rounded p-2">
                                      <p className="text-yellow-200 text-xs leading-relaxed">
                                        <span className="font-semibold">Hint {i + 1}:</span> {hint}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-gray-400 text-xs italic">
                                  Hints will unlock every 3 minutes as you work on the problem
                                </p>
                              )}
                            </div>
                          )}
                        </>
                      )}

                      {/* Upload Codebase Section */}
                      <div className="border-t border-gray-700 pt-3 mt-3">
                        <h3 className="text-white font-semibold mb-2">Workspace Files</h3>
                        {/* Show warning for add-functionality when language has no files */}
                        {selectedScenario.type === 'add-functionality' && workspaceContext.length === 0 && (
                          <div className="mb-2 bg-yellow-500/10 border border-yellow-500/30 rounded p-2">
                            <p className="text-xs text-yellow-300">
                              ⚠️ This scenario is optimized for <strong>JavaScript/TypeScript</strong>. Switch language for codebase files.
                            </p>
                          </div>
                        )}
                        {(selectedScenario.type === 'bugfix' || selectedScenario.type === 'add-functionality') && workspaceContext.length > 0 ? (
                          <div className="mb-2">
                            <p className="text-xs text-green-400 mb-2">
                              ✓ {workspaceContext.length} codebase file(s) loaded automatically
                            </p>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {workspaceContext.map((file, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => {
                                    setSelectedFile(file)
                                    setIsCodeViewerOpen(true)
                                  }}
                                  className="w-full text-left text-xs text-gray-300 bg-gray-800/50 px-2 py-1 rounded border border-gray-700 hover:bg-gray-700/50 hover:border-blue-500 transition-colors cursor-pointer"
                                >
                                  <div className="font-semibold text-blue-400 flex items-center gap-1">
                                    <Code className="h-3 w-3" />
                                    {file.path}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <>
                            <input
                              ref={fileInputRef}
                              type="file"
                              multiple
                              accept=".js,.ts,.jsx,.tsx,.py,.java,.cpp,.c,.h,.json,.md,.txt,text/*"
                              onChange={handleFileUpload}
                              className="hidden"
                            />
                            <Button
                              onClick={() => fileInputRef.current?.click()}
                              variant="outline"
                              className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent text-xs h-7"
                            >
                              <Code className="mr-1 h-3 w-3" />
                              Upload Files
                            </Button>
                            {workspaceContext.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {workspaceContext.map((file, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => {
                                      setSelectedFile(file)
                                      setIsCodeViewerOpen(true)
                                    }}
                                    className="w-full text-left text-xs text-gray-400 bg-gray-800/30 px-2 py-1 rounded hover:bg-gray-700/30 hover:text-blue-400 transition-colors cursor-pointer"
                                  >
                                    <div className="truncate flex items-center gap-1">
                                      <Code className="h-3 w-3 flex-shrink-0" />
                                      {file.path}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Center: Code Editor with Terminal/Console */}
                  <Card className="bg-gray-900/50 border-gray-700 glass-effect flex flex-col h-full overflow-hidden order-2">
                    <CardHeader className="pb-2 flex-shrink-0 px-6">
                      <CardTitle className="text-white flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-1">
                          <Code className="h-3 w-3 text-[#00d9ff]" />
                          <span>{selectedScenario?.title.toLowerCase().replace(/\s+/g, "-").slice(0, 20)}.{selectedLanguage === "javascript" ? "js" : selectedLanguage === "typescript" ? "ts" : "py"}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          {/* Grading criteria indicator */}
                          <GradingCriteriaTooltip />
                          {isInterviewStarted && (
                            <div className="flex items-center space-x-1">
                              <div className="w-1.5 h-1.5 bg-[#00d9ff] rounded-full animate-pulse"></div>
                              <span className="text-[#00d9ff] text-xs">LIVE</span>
                            </div>
                          )}
                        </div>
                      </CardTitle>
                    </CardHeader>
                    {/* Code Editor - Direct in Card, no CardContent wrapper */}
                    <div className="flex flex-col flex-1 min-h-0 gap-2 px-3 pb-3">
                      <div ref={editorContainerRef} className="flex-1 min-h-0 rounded border border-gray-700 editor-wrapper">
                        <Editor
                          key={`editor-${selectedLanguage}-${selectedScenario?.id || 'none'}`}
                          height={editorHeight}
                          language={selectedLanguage}
                          value={code}
                          onMount={(editor, monaco) => {
                            // Dispose old editor reference if exists
                            if (editorRef.current && editorRef.current !== editor) {
                              try {
                                editorRef.current.dispose()
                              } catch (e) {
                                // Editor may already be disposed
                              }
                            }
                            editorRef.current = editor

                            // Clean up any orphaned models (except the current one)
                            const currentModel = editor.getModel()
                            const allModels = monaco.editor.getModels()
                            allModels.forEach((model: any) => {
                              if (model !== currentModel && !model.isDisposed()) {
                                try {
                                  model.dispose()
                                } catch (e) {
                                  // Model may already be disposed
                                }
                              }
                            })
                          }}
                          onChange={(value, event) => {
                            const newCode = value || ""

                            // Skip validation for programmatic changes (like language switches)
                            if (event?.isFlush) {
                              setCode(newCode)
                              return
                            }

                            // Enforce code protection if enabled
                            if (protectedElements && starterCode && isInterviewStarted && !showFeedback) {
                              const validation = validateCodeProtection(newCode, protectedElements, selectedLanguage)

                              if (!validation.valid) {
                                // Show error and prevent the change
                                toast.error(`Cannot remove required code: ${validation.errors[0]}`)
                                return // Don't update code
                              }
                            }

                            setCode(newCode)
                          }}
                          theme="vs-dark"
                          options={{
                            // Layout
                            automaticLayout: true,
                            scrollBeyondLastLine: false,
                            scrollbar: { vertical: 'hidden', horizontal: 'hidden', handleMouseWheel: true },
                            overviewRulerLanes: 0,
                            overviewRulerBorder: false,
                            hideCursorInOverviewRuler: true,

                            // Disable sticky scroll (causes space at top)
                            stickyScroll: { enabled: false },

                            // Minimize UI elements
                            minimap: { enabled: false },
                            lineNumbers: 'on',
                            lineNumbersMinChars: 3,
                            lineDecorationsWidth: 0,
                            glyphMargin: false,
                            folding: false,
                            foldingHighlight: false,
                            showFoldingControls: 'never',
                            renderLineHighlight: 'none',
                            renderWhitespace: 'none',
                            renderIndentGuides: false,
                            renderLineHighlightOnlyWhenFocus: true,

                            // Disable features
                            contextmenu: false,
                            quickSuggestions: false,
                            suggestOnTriggerCharacters: false,
                            acceptSuggestionOnEnter: 'off',
                            tabCompletion: 'off',
                            wordBasedSuggestions: 'off',
                            parameterHints: { enabled: false },
                            hover: { enabled: false },
                            links: false,
                            colorDecorators: false,
                            codeLens: false,
                            occurrencesHighlight: false,
                            selectionHighlight: false,
                            matchBrackets: 'never',

                            // Styling
                            fontSize: 13,
                            lineHeight: 21,
                            letterSpacing: 0.5,
                            tabSize: 2,
                            fontLigatures: false,
                            readOnly: !isInterviewStarted || showFeedback,

                            // Padding and layout
                            padding: { top: 0, bottom: 0 },
                            fixedOverflowWidgets: true,

                            // Disable all widgets and popups
                            find: {
                              addExtraSpaceOnTop: false,
                              autoFindInSelection: 'never',
                              seedSearchStringFromSelection: 'never',
                            },
                          }}
                        />
                      </div>

                      {/* Terminal/Console Output - Enhanced */}
                      {testResults.length > 0 && (
                        <div className="flex-shrink-0 bg-black border border-gray-700 rounded flex flex-col max-h-48 min-h-[120px]">
                          {/* Terminal Header */}
                          <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800 border-b border-gray-700 flex-shrink-0">
                            <div className="flex items-center space-x-2">
                              <div className="flex space-x-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                              </div>
                              <span className="text-gray-400 text-xs font-mono">Terminal</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge
                                className={`${testSummary.passRate === 100 ? "bg-[#00d9ff]" :
                                  testSummary.passRate >= 60 ? "bg-[#00d9ff]/70" : "bg-gray-600"
                                  } text-xs h-5 text-black`}
                              >
                                {testSummary.passed}/{testSummary.total} passed
                              </Badge>
                              {efficiencyMetrics && (
                                <Badge className={`${efficiencyMetrics.efficiencyScore >= 80 ? "bg-[#00d9ff]/20 text-[#00d9ff] border-[#00d9ff]" :
                                  efficiencyMetrics.efficiencyScore >= 60 ? "bg-[#00d9ff]/10 text-[#00d9ff]/70 border-[#00d9ff]/50" :
                                    "bg-gray-600/20 text-gray-400 border-gray-600"
                                  } text-xs h-5 border`}>
                                  {efficiencyMetrics.efficiencyScore}% efficient
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Terminal Content */}
                          <div className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-xs">
                            {/* Summary */}
                            <div className="text-gray-400 mb-2">
                              <span className="text-[#00d9ff]">$</span> Running tests...
                            </div>

                            {/* Individual Test Results */}
                            {testResults.map((result, index) => (
                              <div key={index} className="mb-2">
                                <div className={`flex items-center space-x-2 ${result.passed ? 'text-[#00d9ff]' : 'text-gray-400'}`}>
                                  {result.passed ? (
                                    <CheckCircle className="h-3 w-3 flex-shrink-0" />
                                  ) : (
                                    <XCircle className="h-3 w-3 flex-shrink-0" />
                                  )}
                                  <span className="font-semibold">{result.description}</span>
                                </div>

                                {!result.passed && (
                                  <div className="ml-5 mt-1 space-y-0.5 text-gray-300">
                                    <div className="flex items-start space-x-2">
                                      <span className="text-gray-500">Input:</span>
                                      <span className="text-blue-300">{JSON.stringify(result.input)}</span>
                                    </div>
                                    <div className="flex items-start space-x-2">
                                      <span className="text-gray-500">Expected:</span>
                                      <span className="text-green-300">{JSON.stringify(result.expected)}</span>
                                    </div>
                                    <div className="flex items-start space-x-2">
                                      <span className="text-gray-500">Got:</span>
                                      <span className="text-red-300">{JSON.stringify(result.actual)}</span>
                                    </div>
                                    {result.error && (
                                      <div className="flex items-start space-x-2 mt-1">
                                        <AlertCircle className="h-3 w-3 flex-shrink-0 text-red-400 mt-0.5" />
                                        <span className="text-red-300 break-all">{result.error}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}

                            {/* Efficiency Metrics */}
                            {efficiencyMetrics && (
                              <div className="border-t border-gray-800 pt-2 mt-2 space-y-1">
                                <div className="text-gray-400">Complexity Analysis:</div>
                                <div className="ml-2 space-y-0.5 text-gray-300">
                                  <div>
                                    <span className="text-gray-500">Time:</span>
                                    <span className={`ml-2 ${efficiencyMetrics.estimatedTimeComplexity === efficiencyMetrics.optimalTimeComplexity ? 'text-green-400' : 'text-yellow-400'}`}>
                                      {efficiencyMetrics.estimatedTimeComplexity}
                                    </span>
                                    {efficiencyMetrics.optimalTimeComplexity !== "N/A" && (
                                      <span className="text-gray-500 ml-1">(optimal: {efficiencyMetrics.optimalTimeComplexity})</span>
                                    )}
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Space:</span>
                                    <span className={`ml-2 ${efficiencyMetrics.estimatedSpaceComplexity === efficiencyMetrics.optimalSpaceComplexity ? 'text-green-400' : 'text-yellow-400'}`}>
                                      {efficiencyMetrics.estimatedSpaceComplexity}
                                    </span>
                                    {efficiencyMetrics.optimalSpaceComplexity !== "N/A" && (
                                      <span className="text-gray-500 ml-1">(optimal: {efficiencyMetrics.optimalSpaceComplexity})</span>
                                    )}
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Code Quality:</span>
                                    <span className="ml-2 text-gray-300">{efficiencyMetrics.complexity} complexity, {efficiencyMetrics.linesOfCode} LOC</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Controls */}
                      <div className="flex items-center justify-end gap-2 flex-shrink-0">
                        {!isLanguageSupported(selectedLanguage) && (
                          <span className="text-[10px] text-yellow-400 mr-1">
                            Use JS/Python to run tests
                          </span>
                        )}
                        <Button
                          onClick={() => {
                            if (!isLanguageSupported(selectedLanguage)) {
                              toast.error(`${selectedLanguage.toUpperCase()} execution not supported yet`, {
                                description: "Switch to JavaScript or Python to run tests.",
                                action: {
                                  label: "Use JavaScript",
                                  onClick: () => setSelectedLanguage("javascript"),
                                },
                              })
                              return
                            }
                            runCode()
                          }}
                          disabled={showFeedback}
                          loading={isRunningTests}
                          className={`${isLanguageSupported(selectedLanguage) ? "bg-green-600 hover:bg-green-700" : "bg-gray-600 hover:bg-gray-500"} text-white text-xs h-7`}
                          aria-label={isRunningTests ? "Running tests" : "Run tests"}
                        >
                          {!isRunningTests && <PlayCircle className="mr-1 h-3 w-3" aria-hidden="true" />}
                          {isRunningTests ? "Running..." : "Run Tests"}
                        </Button>
                      </div>

                      {/* AI Coding Partner - Only show for interview types that allow AI assistance
                          Real interview rules:
                          - DSA: NO AI (pure problem-solving like Google/Meta traditional interviews)
                          - Bug Fix: YES (Meta E5+ allows AI tools for debugging)
                          - Add Functionality: YES (realistic production environment)
                          - System Design: YES (discussion-based, AI collaboration acceptable)
                      */}
                      {selectedScenario && selectedScenario.type !== 'dsa' && (
                        <div className="border-t border-gray-700 pt-2 flex-shrink-0">
                          {!isAIPartnerExpanded ? (
                            /* Collapsed state - just a thin bar */
                            <div
                              className="flex items-center justify-between px-2 py-1.5 bg-gray-800/50 rounded cursor-pointer hover:bg-gray-800 transition-colors"
                              onClick={() => setIsAIPartnerExpanded(true)}
                            >
                              <div className="flex items-center gap-2">
                                <Bot className="h-3 w-3 text-[#00d9ff]" />
                                <span className="text-[10px] text-gray-400">AI Assistant</span>
                                <span className="text-[10px] text-gray-600">· optional</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {chatMessages.length > 0 && (
                                  <span className="text-[10px] text-gray-500">{chatMessages.length} msg</span>
                                )}
                                <ChevronUp className="h-3 w-3 text-gray-500" />
                              </div>
                            </div>
                          ) : (
                            /* Expanded state - compact chat */
                            <div className="bg-gray-800/30 rounded p-2">
                              {/* Header with collapse */}
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1.5">
                                  <Bot className="h-3 w-3 text-[#00d9ff]" />
                                  <span className="text-[10px] text-gray-300">AI Assistant</span>
                                  <span className="text-[9px] text-gray-600 bg-gray-800 px-1 rounded">optional</span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setIsAIPartnerExpanded(false)}
                                  className="h-5 w-5 p-0 text-gray-500 hover:text-white"
                                >
                                  <ChevronDown className="h-3 w-3" />
                                </Button>
                              </div>

                              {/* Messages - max height 120px */}
                              <div className="max-h-[120px] overflow-y-auto space-y-1 mb-2">
                                {chatMessages.length === 0 ? (
                                  <p className="text-[10px] text-gray-500 text-center py-2">
                                    Ask for hints, not solutions
                                  </p>
                                ) : (
                                  chatMessages.slice(-4).map((msg, index) => (
                                    <div key={index} className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}>
                                      <div className={`max-w-[85%] px-2 py-1 rounded text-[10px] ${msg.type === "user" ? "bg-blue-600/80 text-white" : "bg-gray-700 text-gray-200"}`}>
                                        <p className="break-words whitespace-pre-wrap">{msg.message}</p>
                                      </div>
                                    </div>
                                  ))
                                )}
                                <div ref={chatEndRef} />
                              </div>

                              {/* Input - single line */}
                              <div className="flex gap-1">
                                <Input
                                  value={chatInput}
                                  onChange={(e) => setChatInput(e.target.value)}
                                  placeholder="Quick question..."
                                  className="flex-1 bg-gray-900 border-gray-700 text-white text-[10px] h-6 placeholder:text-gray-600"
                                  onKeyPress={(e) => e.key === "Enter" && !isLoadingChat && handleSendMessage(false)}
                                  disabled={isLoadingChat}
                                />
                                <Button
                                  onClick={() => handleSendMessage(false)}
                                  disabled={!chatInput.trim() || isLoadingChat}
                                  className="h-6 w-6 p-0 bg-[#00d9ff] hover:bg-[#00d9ff]/80"
                                >
                                  {isLoadingChat ? (
                                    <div className="h-2 w-2 border border-white/30 border-t-white rounded-full animate-spin" />
                                  ) : (
                                    <Send className="h-2.5 w-2.5" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Right: AI Interviewer Panel - Hidden on md, visible on lg+ */}
                  <Card className="bg-gray-900/50 border-gray-700 glass-effect h-full flex-col overflow-hidden order-3 hidden lg:flex">
                    <CardHeader className="pb-2 flex-shrink-0">
                      <CardTitle className="text-white flex items-center space-x-2 text-sm">
                        <div className="relative">
                          <Brain className="h-4 w-4 text-[#00d9ff] animate-neural-pulse" />
                          <div className="absolute inset-0 bg-[#00d9ff] rounded-full blur-md opacity-30"></div>
                        </div>
                        <span className="bg-gradient-to-r from-[#00d9ff] to-[#00ff88] bg-clip-text text-transparent font-bold">Skillon AI</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col flex-1 min-h-0 overflow-hidden p-3">
                      <div className="flex-1 overflow-y-auto space-y-2 mb-2 min-h-0 pr-2">
                        {interviewerMessages.length === 0 ? (
                          <div className="text-center py-8 text-gray-400">
                            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-xs">Interview will begin when you start...</p>
                          </div>
                        ) : (
                          <>
                            {interviewerMessages.map((msg, index) => (
                              <div
                                key={index}
                                className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
                              >
                                <div
                                  className={`max-w-[90%] p-2 rounded-lg ${msg.type === "user" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-100"
                                    }`}
                                >
                                  <div className="flex items-center space-x-1 mb-1">
                                    {msg.type === "user" ? (
                                      <User className="h-3 w-3" />
                                    ) : (
                                      <Brain className="h-3 w-3 text-[#00d9ff] animate-neural-pulse" />
                                    )}
                                    <span className="text-xs opacity-75">
                                      {msg.type === "user" ? "You" : "Skillon AI"}
                                    </span>
                                  </div>
                                  <p className="text-xs whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                                </div>
                              </div>
                            ))}
                            <div ref={interviewerEndRef} />
                          </>
                        )}
                      </div>
                      {(isInterviewStarted || showPostInterviewDiscussion) && (
                        <div className="flex space-x-1 flex-shrink-0 border-t border-gray-700 pt-2">
                          <Input
                            value={interviewerInput}
                            onChange={(e) => setInterviewerInput(e.target.value)}
                            placeholder={isRecordingInterviewer ? "Listening..." : (showPostInterviewDiscussion ? "Ask about optimization or improvements..." : "Ask a question...")}
                            className="flex-1 bg-gray-800 border-gray-600 text-white placeholder-gray-400 text-xs h-7"
                            onKeyPress={(e) => e.key === "Enter" && !isLoadingInterviewer && handleSendMessage(true)}
                            disabled={isLoadingInterviewer || isGeneratingDiscussion || isRecordingInterviewer}
                            aria-label="Chat with interviewer"
                          />
                          <Button
                            onClick={() => toggleVoiceRecording(true)}
                            className={`h-7 px-2 ${isRecordingInterviewer ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-gray-700 hover:bg-gray-600'} text-white`}
                            aria-label={isRecordingInterviewer ? "Stop recording" : "Start voice input"}
                            disabled={isLoadingInterviewer || isGeneratingDiscussion}
                          >
                            {isRecordingInterviewer ? <MicOff className="h-3 w-3" aria-hidden="true" /> : <Mic className="h-3 w-3" aria-hidden="true" />}
                          </Button>
                          <Button
                            onClick={() => handleSendMessage(true)}
                            className="bg-[#00d9ff] hover:bg-[#00d9ff]/80 text-white h-7 px-2"
                            loading={isLoadingInterviewer || isGeneratingDiscussion}
                            aria-label={(isLoadingInterviewer || isGeneratingDiscussion) ? "Sending message" : "Send message"}
                          >
                            {!(isLoadingInterviewer || isGeneratingDiscussion) && <Send className="h-3 w-3" aria-hidden="true" />}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : showPostInterviewDiscussion ? (
                /* Post-Interview Discussion Phase */
                <div className="max-w-7xl mx-auto py-8 px-4">
                  <div className="text-center mb-6">
                    <CheckCircle className="h-12 w-12 text-[#00d9ff] mx-auto mb-3" />
                    <h2 className="text-2xl font-heading font-bold text-white mb-2">Solution Complete!</h2>
                    <p className="text-gray-300 mb-4">All tests passed! Let's discuss your solution with the interviewer.</p>
                    {testSummary.total > 0 && (
                      <div className="flex items-center justify-center gap-4 mb-4">
                        <Badge className="bg-[#00d9ff] text-black">
                          {testSummary.passed}/{testSummary.total} Tests Passed
                        </Badge>
                        {efficiencyMetrics && (
                          <>
                            <Badge className={`${efficiencyMetrics.efficiencyScore >= 80 ? "bg-[#00d9ff]" :
                              efficiencyMetrics.efficiencyScore >= 60 ? "bg-[#00d9ff]/70" : "bg-gray-600"
                              } text-black`}>
                              Efficiency: {efficiencyMetrics.efficiencyScore}/100
                            </Badge>
                            <Badge variant="outline" className="border-gray-600 text-gray-300">
                              Time: {efficiencyMetrics.estimatedTimeComplexity}
                            </Badge>
                            <Badge variant="outline" className="border-gray-600 text-gray-300">
                              Space: {efficiencyMetrics.estimatedSpaceComplexity}
                            </Badge>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Collapsible Code Viewer */}
                  <Card className="bg-gray-900/50 border-gray-700 glass-effect mb-6">
                    <CardHeader
                      className="cursor-pointer hover:bg-gray-800/50 transition-colors"
                      onClick={() => setShowCodeInDiscussion(!showCodeInDiscussion)}
                    >
                      <CardTitle className="text-white flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Code className="h-5 w-5 text-[#00d9ff]" />
                          <span>Your Solution</span>
                          <Badge variant="outline" className="border-gray-600 text-gray-400">
                            {selectedLanguage}
                          </Badge>
                        </div>
                        {showCodeInDiscussion ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </CardTitle>
                    </CardHeader>
                    {showCodeInDiscussion && (
                      <CardContent>
                        <div className="border border-gray-700 rounded-lg overflow-hidden">
                          <Editor
                            height="400px"
                            language={selectedLanguage}
                            value={code}
                            theme="vs-dark"
                            options={{
                              readOnly: true,
                              minimap: { enabled: false },
                              fontSize: 14,
                              scrollBeyondLastLine: false,
                            }}
                          />
                        </div>
                        {testResults.length > 0 && (
                          <div className="mt-4 space-y-2">
                            <h4 className="text-sm font-semibold text-white">Test Results:</h4>
                            {testResults.map((result, index) => (
                              <div
                                key={index}
                                className={`p-2 rounded border ${result.passed
                                  ? "bg-green-900/20 border-green-700"
                                  : "bg-red-900/20 border-red-700"
                                  }`}
                              >
                                <div className="flex items-center justify-between text-xs">
                                  <span className={result.passed ? "text-green-400" : "text-red-400"}>
                                    {result.passed ? "✓" : "✗"} {result.description}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>

                  {/* Interviewer Discussion Panel */}
                  <Card className="bg-gray-900/50 border-gray-700 glass-effect mb-6">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center space-x-2">
                        <div className="relative">
                          <Brain className="h-5 w-5 text-[#00d9ff] animate-neural-pulse" />
                          <div className="absolute inset-0 bg-[#00d9ff] rounded-full blur-md opacity-30"></div>
                        </div>
                        <span className="bg-gradient-to-r from-[#00d9ff] to-[#00ff88] bg-clip-text text-transparent font-bold">Post-Interview Discussion</span>
                        {isGeneratingDiscussion && (
                          <span className="text-xs text-gray-400 ml-2">(Analyzing your solution...)</span>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4 max-h-[500px] overflow-y-auto mb-4 pr-2">
                        {interviewerMessages.map((msg, index) => (
                          <div
                            key={index}
                            className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[85%] p-3 rounded-lg ${msg.type === "user" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-100"
                                }`}
                            >
                              <div className="flex items-center space-x-2 mb-1">
                                {msg.type === "user" ? (
                                  <User className="h-4 w-4" />
                                ) : (
                                  <Brain className="h-4 w-4 text-[#00d9ff] animate-neural-pulse" />
                                )}
                                <span className="text-sm font-medium">
                                  {msg.type === "user" ? "You" : "Skillon AI"}
                                </span>
                              </div>
                              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                            </div>
                          </div>
                        ))}
                        {isGeneratingDiscussion && (
                          <div className="flex justify-start">
                            <div className="bg-gray-800 p-3 rounded-lg">
                              <div className="flex items-center space-x-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#00d9ff]"></div>
                                <span className="text-sm text-gray-300">Interviewer is analyzing your solution...</span>
                              </div>
                            </div>
                          </div>
                        )}
                        <div ref={interviewerEndRef} />
                      </div>

                      {/* Chat Input */}
                      <div className="flex space-x-2 border-t border-gray-700 pt-4">
                        <Input
                          value={interviewerInput}
                          onChange={(e) => setInterviewerInput(e.target.value)}
                          placeholder={isRecordingInterviewer ? "Listening..." : "Ask about optimization, complexity, or improvements..."}
                          className="flex-1 bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                          onKeyPress={(e) => e.key === "Enter" && !isLoadingInterviewer && handleSendMessage(true)}
                          disabled={isLoadingInterviewer || isGeneratingDiscussion || isRecordingInterviewer}
                          aria-label="Chat with interviewer"
                        />
                        <Button
                          onClick={() => toggleVoiceRecording(true)}
                          className={`${isRecordingInterviewer ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-gray-700 hover:bg-gray-600'} text-white`}
                          aria-label={isRecordingInterviewer ? "Stop recording" : "Start voice input"}
                          disabled={isLoadingInterviewer || isGeneratingDiscussion}
                        >
                          {isRecordingInterviewer ? <MicOff className="h-4 w-4" aria-hidden="true" /> : <Mic className="h-4 w-4" aria-hidden="true" />}
                        </Button>
                        <Button
                          onClick={() => handleSendMessage(true)}
                          className="bg-[#00d9ff] hover:bg-[#00d9ff]/80 text-white"
                          loading={isLoadingInterviewer || isGeneratingDiscussion}
                          aria-label={(isLoadingInterviewer || isGeneratingDiscussion) ? "Sending message" : "Send message"}
                        >
                          {!(isLoadingInterviewer || isGeneratingDiscussion) && <Send className="h-4 w-4" aria-hidden="true" />}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Action Buttons */}
                  <div className="flex justify-center gap-4">
                    <Button
                      onClick={proceedToFinalFeedback}
                      className="bg-[#00d9ff] hover:bg-[#00d9ff]/80 text-white px-6"
                    >
                      View Detailed Feedback
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <Button
                      onClick={resetInterview}
                      variant="outline"
                      className="border-gray-600 text-gray-300 hover:bg-gray-800"
                    >
                      Try Another Problem
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <PracticeFeedback
                    feedback={comprehensiveFeedback || ""}
                    performanceScore={performanceScore || 0}
                    testsPassed={testSummary.passed}
                    testsTotal={testSummary.total}
                    timeComplexity={efficiencyMetrics?.estimatedTimeComplexity}
                    spaceComplexity={efficiencyMetrics?.estimatedSpaceComplexity}
                    efficiencyScore={efficiencyMetrics?.efficiencyScore}
                    elapsedTime={elapsedTime}
                    userId={user?.id}
                    problemType={selectedScenario?.type}
                    difficulty={selectedScenario?.difficulty}
                    problemTitle={selectedScenario?.title}
                    code={code}
                    language={selectedLanguage}
                    onRetry={resetInterview}
                    onNewProblem={resetInterview}
                  />
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Code Viewer Side Panel */}
      {isCodeViewerOpen && selectedFile && (
        <CodeViewerSidePanel
          key={selectedFile.path}
          isOpen={true}
          onClose={() => {
            setIsCodeViewerOpen(false)
            setSelectedFile(null)
          }}
          fileName={selectedFile.path}
          content={selectedFile.content}
        />
      )}

      {/* Close Confirmation Dialog */}
      <AlertDialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <AlertDialogContent className="bg-gray-900 border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">You want to close this interview?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              If you close now, your progress will be saved but you'll exit the interview session. You can always come back to continue later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 text-white border-gray-600 hover:bg-gray-700">
              Stay
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowCloseDialog(false)
                resetInterview()
              }}
              className="bg-[#00d9ff] hover:bg-[#00d9ff]/80 text-white"
            >
              Close Interview
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {!isInterviewMode && <Footer />}
    </main>
  )
}

