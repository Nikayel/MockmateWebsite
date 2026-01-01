"use client"

import { useState, useEffect, useRef, useMemo, memo, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import nextDynamic from "next/dynamic"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ErrorBoundary } from "@/components/error-boundary"
import { useVoiceInput } from "@/lib/voice"
import { getDbLazy } from "@/lib/firebase-lazy"
import { collection, getDocs, query, where, Firestore } from "firebase/firestore"
import {
  Play,
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
  Send,
  PlayCircle,
  XCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  Leaf,
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
import { useRoadmapStore } from "@/lib/stores/roadmap-store"
import { scenarios, filterScenarios, getScenarioById, type Scenario, type ScenarioType, type DifficultyLevel, type Company } from "@/lib/scenarios"
import { extractProtectedElements, validateCodeProtection, enforceCodeProtection } from "@/lib/code-protection"
import { toast } from "sonner"

// Dynamic imports for heavy components to reduce initial bundle size
const ScenarioBrowser = nextDynamic(
  () => import("@/components/interview").then(mod => ({ default: mod.ScenarioBrowser })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-400">Loading scenarios...</div>
      </div>
    )
  }
)

const VoiceModeToggle = nextDynamic(
  () => import("@/components/interview").then(mod => ({ default: mod.VoiceModeToggle })),
  { ssr: false }
)

const CodeViewerSidePanel = nextDynamic(
  () => import("@/components/CodeViewerSidePanel").then(mod => ({ default: mod.CodeViewerSidePanel })),
  { ssr: false }
)

const GradingCriteriaTooltip = nextDynamic(
  () => import("@/components/GradingCriteria").then(mod => ({ default: mod.GradingCriteriaTooltip })),
  { ssr: false }
)

// Inline error fallback for components that fail to load
function ComponentErrorFallback({ componentName }: { componentName: string }) {
  return (
    <div className="flex items-center justify-center h-full bg-gray-900/50 p-4">
      <div className="text-center">
        <div className="text-red-400 text-sm mb-2">Failed to load {componentName}</div>
        <button
          onClick={() => window.location.reload()}
          className="text-xs text-[#00d9ff] hover:underline"
        >
          Reload page
        </button>
      </div>
    </div>
  )
}

// Dynamically import heavy components to reduce initial bundle size
// CodeMirror 6 is used instead of Monaco for ~95% smaller bundle
const CodeEditor = nextDynamic(
  () => import("@/components/editor").then(mod => mod.CodeMirrorEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-[#1e1e1e]">
        <div className="text-gray-400 text-sm">Loading editor...</div>
      </div>
    )
  }
)

const PracticeFeedback = nextDynamic(
  () => import("@/components/PracticeFeedback"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-400 text-sm">Loading feedback...</div>
      </div>
    )
  }
)

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
  timestamp?: number
}

interface TestResult {
  description: string
  passed: boolean
  input: any
  expected: any
  actual: any
  error: string | null
}

function InterviewPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, firebaseUser, loading: authLoading, initialized } = useAuth()
  const { markQuestionCompleted, addActualTime, activeRoadmap } = useRoadmapStore()
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

  // Filters (handled inside ScenarioBrowser now)
  const [completedProblems, setCompletedProblems] = useState<string[]>([])

  // Chat states
  const [interviewerMessages, setInterviewerMessages] = useState<ChatMessage[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [interviewerInput, setInterviewerInput] = useState("")
  const [isLoadingChat, setIsLoadingChat] = useState(false)
  const [isLoadingInterviewer, setIsLoadingInterviewer] = useState(false)

  // Track pending auto-send to avoid duplicate sends
  const pendingAutoSendRef = useRef<{ interviewer: boolean; partner: boolean }>({ interviewer: false, partner: false })

  // Voice recording - using Deepgram with Web Speech API fallback
  const interviewerVoice = useVoiceInput({
    fallbackToWebSpeech: true,
    onTranscript: (transcript, isFinal) => {
      setInterviewerInput(transcript)
    },
    onUtteranceEnd: (transcript) => {
      // Auto-send when user stops speaking in live mode
      // Use ref to get current value (avoids stale closure issue)
      if (voiceModeLiveRef.current && transcript.trim() && !pendingAutoSendRef.current.interviewer) {
        console.log('[Live Mode] Utterance end detected, auto-sending:', transcript.substring(0, 50))
        pendingAutoSendRef.current.interviewer = true
        setInterviewerInput(transcript)
        // Small delay to ensure state is updated
        setTimeout(() => {
          handleSendMessage(true)
          pendingAutoSendRef.current.interviewer = false
          // Clear the sent tracker so next utterance is detected as new
          interviewerVoice.clearSentTracker()
        }, 100)
      }
    },
  })

  const partnerVoice = useVoiceInput({
    fallbackToWebSpeech: true,
    onTranscript: (transcript, isFinal) => {
      setChatInput(transcript)
    },
    onUtteranceEnd: (transcript) => {
      // Auto-send when user stops speaking in live mode
      // Use ref to get current value (avoids stale closure issue)
      if (voiceModeLiveRef.current && transcript.trim() && !pendingAutoSendRef.current.partner) {
        console.log('[Live Mode] Utterance end detected for partner, auto-sending:', transcript.substring(0, 50))
        pendingAutoSendRef.current.partner = true
        setChatInput(transcript)
        setTimeout(() => {
          handleSendMessage(false)
          pendingAutoSendRef.current.partner = false
          partnerVoice.clearSentTracker()
        }, 100)
      }
    },
  })

  // Backwards compatible aliases
  const isRecordingPartner = partnerVoice.isRecording
  const isRecordingInterviewer = interviewerVoice.isRecording
  const recognitionRef = useRef<any>(null) // Keep for any legacy usage

  // AI hints states
  const [showAITips, setShowAITips] = useState(false)
  const [isAIPartnerExpanded, setIsAIPartnerExpanded] = useState(false) // Collapsed by default
  const [ragHints, setRagHints] = useState<{ level: number; hint: string }[]>([])
  const [isLoadingHints, setIsLoadingHints] = useState(false)

  // Voice mode - always auto-send on pause (research-backed simplification)
  // Removed manual/live toggle to reduce cognitive load
  const voiceAutoSend = true // Always enabled now
  const voiceModeLiveRef = useRef(true) // Keep ref for callbacks
  const [revealedHintIndices, setRevealedHintIndices] = useState<Set<number>>(new Set()) // Track which hints are revealed

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
  const lastCodeHashRef = useRef<string>("")
  const [proactiveTimer, setProactiveTimer] = useState<NodeJS.Timeout | null>(null)
  const [usageLimit, setUsageLimit] = useState<{ used: number; limit: number; allowed: boolean } | null>(null)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)

  // Code viewer dialog state
  const [selectedFile, setSelectedFile] = useState<{ path: string; content: string } | null>(null)
  const [isCodeViewerOpen, setIsCodeViewerOpen] = useState(false)

  // Close confirmation dialog state
  const [showCloseDialog, setShowCloseDialog] = useState(false)

  // Focus mode - reduces cognitive load by hiding non-essential panels
  // Research: Selective attention (Broadbent, 1958) - reducing distractors improves performance
  const [focusMode, setFocusMode] = useState(false)
  // Calm mode - muted colors for anxiety reduction (research-backed)
  // Source: Color Psychology in UI Design 2025, UXmatters Calm Design Principles
  const [calmMode, setCalmMode] = useState(false)
  // Hide timer option - reduces time pressure anxiety
  // Research: WCAG 2.1 recommends letting users manage time on their terms
  const [hideTimer, setHideTimer] = useState(false)
  // Mobile panel switcher - only one visible at a time (Miller's Law)
  const [activePanel, setActivePanel] = useState<'problem' | 'editor' | 'chat'>('editor')

  // Toggle calm mode on document for CSS cascade
  useEffect(() => {
    if (calmMode) {
      document.documentElement.classList.add('calm')
    } else {
      document.documentElement.classList.remove('calm')
    }
    return () => document.documentElement.classList.remove('calm')
  }, [calmMode])

  // Code protection state
  const [protectedElements, setProtectedElements] = useState<ReturnType<typeof extractProtectedElements> | null>(null)
  const [starterCode, setStarterCode] = useState<string>("")

  // Roadmap tracking
  const isFromRoadmap = searchParams?.get("roadmap") === "true"

  const chatEndRef = useRef<HTMLDivElement>(null)
  const interviewerEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const previousCodeRef = useRef<string>(code)

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

  // Load completed problems for pattern progress (based on interview_sessions)
  useEffect(() => {
    const loadCompletedProblems = async () => {
      if (!firebaseUser) return

      try {
        // Lazy load Firestore
        const db = await getDbLazy()
        const sessionsQuery = query(
          collection(db, "interview_sessions"),
          where("user_id", "==", firebaseUser.uid)
        )
        const sessionsSnap = await getDocs(sessionsQuery)

        const completedSet = new Set<string>()
        sessionsSnap.forEach((doc) => {
          const data = doc.data() as any
          if (!data.scenario_id) return

          const isCompleted =
            !!data.completed_at ||
            typeof data.performance_score === "number"

          if (isCompleted) {
            completedSet.add(data.scenario_id)
          }
        })

        setCompletedProblems(Array.from(completedSet))
      } catch (error) {
        console.error("Error loading completed problems:", error)
      }
    }

    loadCompletedProblems()
  }, [firebaseUser])

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

      // Check if we're reopening a session or starting from roadmap
      const sessionId = searchParams?.get("session")
      const scenarioId = searchParams?.get("scenario")
      const fromRoadmap = searchParams?.get("roadmap") === "true"

      // Case 1: Reopening an existing session
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

          // Check if there's saved session state to determine if this is a true resume
          const savedState = await getSessionState(sessionId)
          const hasExistingProgress = savedState && (
            savedState.interviewerMessages && savedState.interviewerMessages.length > 1 ||
            savedState.chatMessages && savedState.chatMessages.length > 1 ||
            savedState.elapsedTime && savedState.elapsedTime > 60
          )

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
          } else if (scenario.type === 'system-design') {
            // For system design, provide a design notes template
            initialCode = `// DESIGN NOTES: ${scenario.title}
// Use this space to document your design decisions

/* ============================================
   1. REQUIREMENTS CLARIFICATION
   ============================================ */
// Functional:
// -
//
// Non-Functional:
// - Scale:
// - Latency:
// - Availability:

/* ============================================
   2. HIGH-LEVEL ARCHITECTURE
   ============================================ */
// Key Components:
// 1.
// 2.
// 3.

/* ============================================
   3. DATA MODEL
   ============================================ */
// Tables/Collections:
//

/* ============================================
   4. API DESIGN
   ============================================ */
// Endpoints:
// POST /api/...
// GET /api/...

/* ============================================
   5. SCALING & TRADE-OFFS
   ============================================ */
// -
`
          } else {
            initialCode = (scenario as any).starterCode?.[selectedLanguage] || `function solution() {
  // Write your solution here

}`
          }

          // If there's saved code, use it; otherwise use starter code
          if (hasExistingProgress && savedState?.code) {
            setCode(savedState.code)
            if (savedState.language) {
              setSelectedLanguage(savedState.language as any)
            }
          } else {
            setCode(initialCode)
          }

          // Initialize interviewer with appropriate message based on progress
          const problemType = scenario.type === 'bugfix' ? 'BUG FIX' :
            scenario.type === 'add-functionality' ? 'ADD FUNCTIONALITY' :
              scenario.type.toUpperCase()

          let initialMessage: string
          if (hasExistingProgress) {
            // True resume - user has made progress
            initialMessage = `Welcome back! I'm Sable, your interviewer. You're continuing your practice on **${scenario.title}** - a ${scenario.difficulty} ${problemType} problem.

You can continue where you left off. Feel free to:
- Ask me clarifying questions about the requirements
- Discuss your approach before coding
- Ask for hints if you get stuck

Let's continue!`

            // Restore previous messages if available
            if (savedState?.interviewerMessages && savedState.interviewerMessages.length > 0) {
              setInterviewerMessages(savedState.interviewerMessages as Array<{ type: "ai" | "user"; message: string }>)
            } else {
              setInterviewerMessages([{ type: "ai", message: initialMessage }])
            }
            if (savedState?.chatMessages && savedState.chatMessages.length > 0) {
              setChatMessages(savedState.chatMessages as Array<{ type: "ai" | "user"; message: string }>)
            } else {
              setChatMessages([{
                type: "ai",
                message: `Hi! I'm your AI coding partner. I can help with algorithms, debugging, and hints for ${scenario.title}. Just ask!`,
              }])
            }
            toast.success("Session resumed")
          } else {
            // Fresh start - no previous progress
            const isDSAScenario = scenario.type === 'dsa'
            initialMessage = isDSAScenario
              ? `Hey, I'm Sable—your interviewer for this session. I keep things direct and brutally honest so you get signal that actually helps you improve. Today we're tackling **${scenario.title}**, a ${scenario.difficulty} ${problemType} problem.

Here's what I expect:
- Walk me through your plan before you code; if you skip that, I'll call it out.
- Narrate while you build so I can understand your reasoning.
- This is a pure coding challenge—no AI assistance. Just you and the problem, like a real technical interview.

Take a breath, study the prompt on the left, and tell me how you plan to attack this.`
              : `Hey, I'm Sable—your interviewer for this session. I keep things direct and brutally honest so you get signal that actually helps you improve. Today we're tackling **${scenario.title}**, a ${scenario.difficulty} ${problemType} problem.

Here's what I expect:
- Walk me through your plan before you code; if you skip that, I'll call it out.
- Narrate while you build so I can understand your reasoning.
- Use the AI partner intentionally. If you're just copying suggestions, I'll flag it.

Take a breath, study the prompt on the left, and tell me how you plan to attack this.`

            setInterviewerMessages([{ type: "ai", message: initialMessage }])
            if (!isDSAScenario) {
              setChatMessages([{
                type: "ai",
                message: `Hi! I'm your AI coding partner. I can help with algorithms, debugging, and hints for ${scenario.title}. Just ask!`,
              }])
            } else {
              setChatMessages([]) // No AI partner for DSA
            }
          }
        } else {
          toast.error("Scenario not found")
        }
      }
      // Case 2: Starting fresh from roadmap (scenario only, no session)
      else if (scenarioId && !sessionId && fromRoadmap) {
        const scenario = getScenarioById(scenarioId)
        if (scenario) {
          // Just select the scenario - don't auto-start, let user click Start Interview
          setSelectedScenario(scenario)
          setShowScenarioBrowser(false) // Hide browser to show the problem view
        } else {
          toast.error("Scenario not found")
          setShowScenarioBrowser(true)
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

  // CodeMirror 6 handles layout automatically
  // No manual height tracking needed

  // Initialize code when scenario is selected (before interview starts)
  // This ensures the editor always has a stable value without needing fallbacks
  useEffect(() => {
    if (selectedScenario && !isInterviewStarted && !code) {
      let initialCode: string
      if (selectedScenario.type === 'bugfix') {
        initialCode = (selectedScenario as any).buggyCode?.[selectedLanguage] || `// Bug fix code not available for ${selectedLanguage}`
      } else if (selectedScenario.type === 'add-functionality') {
        initialCode = (selectedScenario as any).existingCode?.[selectedLanguage] || `// Add functionality code not available for ${selectedLanguage}`
      } else if (selectedScenario.type === 'system-design') {
        initialCode = `// DESIGN NOTES: ${selectedScenario.title}\n// Use this space to document your design decisions\n`
      } else {
        initialCode = (selectedScenario as any).starterCode?.[selectedLanguage] || `function solution() {\n  // Write your solution here\n\n}`
      }
      setCode(initialCode)
    }
  }, [selectedScenario, isInterviewStarted, selectedLanguage, code])

  // Update code and workspace files when language changes during interview
  useEffect(() => {
    if (isInterviewStarted && selectedScenario && !showFeedback) {
      let newCode: string
      let codebaseFiles: any[] = []

      // For bug fix scenarios, use buggyCode
      if (selectedScenario.type === 'bugfix') {
        newCode = (selectedScenario as any).buggyCode?.[selectedLanguage] || `// Bug fix code not available for ${selectedLanguage}`
        codebaseFiles = (selectedScenario as any).codebaseFiles?.[selectedLanguage] || []
      } else if (selectedScenario.type === 'add-functionality') {
        // For Add Functionality scenarios, use existingCode
        newCode = (selectedScenario as any).existingCode?.[selectedLanguage] || `// Add functionality code not available for ${selectedLanguage}`
        codebaseFiles = (selectedScenario as any).codebaseFiles?.[selectedLanguage] || []
      } else {
        // For DSA scenarios, use starterCode
        newCode = (selectedScenario as any).starterCode?.[selectedLanguage] || `function solution() {
  // Write your solution here

}`
      }

      // ALWAYS update workspace context files when language changes
      // This ensures codebase files stay in sync with selected language
      if (codebaseFiles.length > 0) {
        const contextFiles = codebaseFiles.map((file: any) => ({
          path: file.fileName,
          content: file.content,
          description: file.description,
        }))
        setWorkspaceContext(contextFiles)
        toast.success(`Loaded ${contextFiles.length} codebase file(s) for ${selectedLanguage}`)
      } else if (selectedScenario.type === 'bugfix' || selectedScenario.type === 'add-functionality') {
        // Clear workspace context if no codebase files for this language
        setWorkspaceContext([])
        toast.warning(`No codebase files available for ${selectedLanguage}. Consider using JavaScript or Python.`)
      }

      // Only update main code if it's still the starter/default code
      const currentCodeTrimmed = code.trim()
      const isEmptyOrStarter = currentCodeTrimmed === "" ||
        currentCodeTrimmed.includes("Write your solution here") ||
        currentCodeTrimmed.includes("BUG:") ||
        currentCodeTrimmed.includes("TODO:") ||
        currentCodeTrimmed.includes("not available for") ||
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

  // Proactive interviewer - DISABLED (was too intrusive)
  // The automatic pop-ups were awkward and interrupted user flow
  useEffect(() => {
    if (!isInterviewStarted || showFeedback || showPostInterviewDiscussion) return

    const codeHash = code.trim().replace(/\s+/g, " ")

    // Track code changes (for metrics only, no proactive triggering)
    // Using ref instead of state to avoid re-renders on every keystroke
    if (codeHash !== lastCodeHashRef.current) {
      lastCodeChangeRef.current = Date.now()
      hasTriggeredInactivityRef.current = false
      lastCodeHashRef.current = codeHash
    }

    // DISABLED: Automatic proactive messages were too intrusive
    // Users found them awkward and distracting
    // The interviewer will only respond when the user messages them

    return () => {
      if (proactiveTimer) {
        clearTimeout(proactiveTimer)
      }
    }
  }, [code, isInterviewStarted, showFeedback, showPostInterviewDiscussion, proactiveTimer])

  // Proactive interviewer - INACTIVITY detection - DISABLED
  // Was too intrusive and interrupted user flow
  useEffect(() => {
    // DISABLED: Automatic inactivity prompts were awkward
    // Users prefer to work at their own pace without interruption
    return () => {
      if (inactivityTimerRef.current) {
        clearInterval(inactivityTimerRef.current)
      }
    }
  }, [isInterviewStarted, showFeedback, showPostInterviewDiscussion, code])

  // Proactive interviewer - SILENCE detection - DISABLED
  // Was too intrusive and condescending
  useEffect(() => {
    // DISABLED: Silence detection prompts felt patronizing
    // The scoring system handles communication separately
    // Users can choose to communicate when they want to

    // Still track for metrics purposes
    const userMessages = interviewerMessages.filter(m => m.type === 'user')
    if (userMessages.length > 0) {
      lastInterviewerMessageRef.current = Date.now()
      hasTriggeredSilenceRef.current = false
    }

    return () => {
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
      } catch (error) {
        console.error("Auto-save failed:", error)
      }
    }, 30000) // 30 seconds

    // Cleanup on unmount
    return () => {
      clearInterval(autoSaveInterval)
    }
  }, [isInterviewStarted, selectedScenario, firebaseUser, code, chatMessages, interviewerMessages, selectedLanguage, elapsedTime, testResults, workspaceContext, currentSessionId])

  // Track when code value changes
  useEffect(() => {
    if (previousCodeRef.current !== code) {
      previousCodeRef.current = code
    }
  }, [code])

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

    if (code.match(/recursion|function.*\(.*\)\s*{[\s\S]*function\s*\(/)) {
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

      // Note: We no longer apply harsh penalties based on message counts alone
      // The AI feedback system now evaluates actual conversation content quality
      // This prevents unfair penalties when users communicate well but message counts are low

      // Generate comprehensive feedback first
      let comprehensiveFeedback = `Completed ${selectedScenario?.title} with ${summary.passed}/${summary.total} tests passing`
      // Convert pass rate (0-100) to 0-100 score scale
      let calculatedPerformanceScore = summary.passRate

      // Calculate efficiency metrics for feedback
      const efficiencyData = analyzeCodeEfficiency(code)

      if (currentSessionId && user && code.trim()) {
        try {
          // Prepare conversation transcript for content-based evaluation
          // This allows the AI to evaluate WHAT was said, not just message counts
          const conversationTranscript = [
            ...interviewerMessages.map(m => ({
              role: m.type === 'user' ? 'candidate' : 'interviewer',
              content: m.message,
              timestamp: m.timestamp
            })),
            ...chatMessages.map(m => ({
              role: m.type === 'user' ? 'candidate' : 'ai_partner',
              content: m.message,
              timestamp: m.timestamp
            }))
          ].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))

          const feedbackResponse = await fetch("/api/generate-feedback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code,
              scenarioTitle: selectedScenario?.title,
              scenarioType: selectedScenario?.type,
              scenarioId: selectedScenario?.id,
              scenarioDifficulty: selectedScenario?.difficulty,
              scenarioPattern: (selectedScenario as any)?.pattern,
              testResults: testResults,
              language: selectedLanguage,
              timeSpent: elapsedTime,
              aiCollaborationMetrics,
              interactionMetrics,
              // Pass efficiency metrics for accurate feedback
              efficiencyMetrics: efficiencyData,
              // NEW: Pass actual conversation content for quality-based evaluation
              conversationTranscript,
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
            email: user?.email,
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
            comprehensiveFeedback,
            {
              code,
              language: selectedLanguage,
              testResults,
              timeComplexity: efficiencyData?.estimatedTimeComplexity,
              spaceComplexity: efficiencyData?.estimatedSpaceComplexity,
              efficiencyScore: efficiencyData?.efficiencyScore,
            }
          )

          // Mark question complete in roadmap if user came from roadmap
          if (isFromRoadmap && selectedScenario && activeRoadmap) {
            markQuestionCompleted(selectedScenario.id, calculatedPerformanceScore)
            // Add elapsed time (convert seconds to minutes)
            const minutesSpent = Math.round(elapsedTime / 60)
            if (minutesSpent > 0) {
              addActualTime(minutesSpent)
            }
            toast.success("Progress saved to your roadmap!")
          }

          // Store solution for RAG (async, non-blocking)
          // For system design, store design notes even if empty (chat-only submission)
          const isSystemDesign = selectedScenario?.type === 'system-design'
          const shouldStore = selectedScenario?.id && (code.trim() || isSystemDesign)

          if (shouldStore) {
            fetch("/api/rag", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "store-solution",
                userId: user.id,
                problemId: selectedScenario.id,
                problemTitle: selectedScenario.title,
                solutionCode: code || (isSystemDesign ? '// Design discussion completed via chat' : ''),
                language: selectedLanguage,
                passed: isSystemDesign ? true : summary.passed === summary.total, // System design has no tests
                score: calculatedPerformanceScore,
                problemType: selectedScenario.type, // Pass problem type for proper tagging
              }),
            }).catch((err) => {
              console.error("Solution storage error (non-blocking):", err)
            })
          }

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
          // Non-critical error - session state saved to cloud but local UI continues
          toast.warning("Session progress may not be fully saved", {
            description: "Your feedback is still available, but progress tracking may be incomplete.",
          })
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

  const startInterview = async (scenarioOverride?: Scenario) => {
    // Use passed scenario if provided, otherwise use state (handles race condition)
    const scenario = scenarioOverride || selectedScenario

    if (!scenario) {
      toast.error("Please select a scenario first")
      return
    }

    // If we received a scenario override, update state
    if (scenarioOverride) {
      setSelectedScenario(scenarioOverride)
    }

    // Check usage limit before starting - redirect to limit page (skip for DSA questions)
    if (user && usageLimit && !usageLimit.allowed && scenario.type !== 'dsa') {
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
          scenario.title,
          scenario.type,
          scenario.difficulty,
          scenario.id
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

    // Clear previous session's test results and metrics (fixes terminal persistence bug)
    setTestResults([])
    setTestSummary({ total: 0, passed: 0, failed: 0, passRate: 0 })
    setEfficiencyMetrics(null)
    setElapsedTime(0)
    setRevealedHints(0)
    setRevealedHintIndices(new Set())
    setRagHints([])
    setWorkspaceContext([])
    setComprehensiveFeedback("")
    setPerformanceScore(null)

    // Initialize code based on scenario type
    let initialCode: string
    if (scenario.type === 'bugfix') {
      // For bug fixes, load buggy code
      initialCode = (scenario as any).buggyCode?.[selectedLanguage] || `// Bug fix code not available for ${selectedLanguage}`

      // Auto-load codebase files into workspace context for bug fixes
      const codebaseFiles = (scenario as any).codebaseFiles?.[selectedLanguage] || []
      if (codebaseFiles.length > 0) {
        const contextFiles = codebaseFiles.map((file: any) => ({
          path: file.fileName,
          content: file.content,
        }))
        setWorkspaceContext(contextFiles)
        toast.success(`Loaded ${contextFiles.length} codebase file(s) for context`)
      }
    } else if (scenario.type === 'add-functionality') {
      // For Add Functionality scenarios, load existing code to extend
      initialCode = (scenario as any).existingCode?.[selectedLanguage] || `// Add functionality to the existing codebase`

      // Auto-load codebase files into workspace context
      const codebaseFiles = (scenario as any).codebaseFiles?.[selectedLanguage] || []
      if (codebaseFiles.length > 0) {
        const contextFiles = codebaseFiles.map((file: any) => ({
          path: file.fileName,
          content: file.content,
          description: file.description,
        }))
        setWorkspaceContext(contextFiles)
        toast.success(`Loaded ${contextFiles.length} codebase file(s) - review them to understand the existing code`)
      }
    } else if (scenario.type === 'system-design') {
      // For system design, provide a design notes template
      initialCode = `// DESIGN NOTES: ${scenario.title}
// Use this space to document your design decisions

/* ============================================
   1. REQUIREMENTS CLARIFICATION
   ============================================ */
// Functional:
// -
//
// Non-Functional:
// - Scale:
// - Latency:
// - Availability:

/* ============================================
   2. HIGH-LEVEL ARCHITECTURE
   ============================================ */
// Key Components:
// 1.
// 2.
// 3.

/* ============================================
   3. DATA MODEL
   ============================================ */
// Tables/Collections:
//

/* ============================================
   4. API DESIGN
   ============================================ */
// Endpoints:
// POST /api/...
// GET /api/...

/* ============================================
   5. SCALING & TRADE-OFFS
   ============================================ */
// -
`
    } else {
      // For DSA problems, load starter code
      initialCode = (scenario as any).starterCode?.[selectedLanguage] || `function solution() {
  // Write your solution here

}`
    }
    setCode(initialCode)
    setStarterCode(initialCode)

    // Extract protected elements for code protection
    const protectedElementsData = extractProtectedElements(initialCode, selectedLanguage)
    setProtectedElements(protectedElementsData)

    // Initialize interviewer with welcome message (problem details are now in left panel)
    const problemType = scenario.type === 'bugfix' ? 'BUG FIX' :
      scenario.type === 'add-functionality' ? 'ADD FUNCTIONALITY' :
        scenario.type.toUpperCase()
    // Different initial message for DSA vs other scenarios
    const isDSA = scenario.type === 'dsa'
    const initialMessage = isDSA
      ? `Hey, I'm Sable—your interviewer for this session. I keep things direct and brutally honest so you get signal that actually helps you improve. Today we're tackling **${scenario.title}**, a ${scenario.difficulty} ${problemType} problem.

Here's what I expect:
- Walk me through your plan before you code; if you skip that, I'll call it out.
- Narrate while you build so I can understand your reasoning.
- This is a pure coding challenge—no AI assistance. Just you and the problem, like a real technical interview.

Take a breath, study the prompt on the left, and tell me how you plan to attack this.`
      : `Hey, I'm Sable—your interviewer for this session. I keep things direct and brutally honest so you get signal that actually helps you improve. Today we're tackling **${scenario.title}**, a ${scenario.difficulty} ${problemType} problem.

Here's what I expect:
- Walk me through your plan before you code; if you skip that, I'll call it out.
- Narrate while you build so I can understand your reasoning.
- Use the AI partner intentionally. If you're just copying suggestions, I'll flag it.

Take a breath, study the prompt on the left, and tell me how you plan to attack this.`

    setInterviewerMessages([{ type: "ai", message: initialMessage }])
    // Only set chat messages for non-DSA scenarios (DSA has no AI partner)
    if (!isDSA) {
      setChatMessages([{
        type: "ai",
        message: `Hi! I'm your AI coding partner. I can help with algorithms, debugging, and hints for ${scenario.title}. Just ask!`,
      }])
    } else {
      setChatMessages([]) // Clear chat messages for DSA
    }

    // Fetch RAG hints for the problem (async, non-blocking)
    fetchRAGHints()
  }

  const resetInterview = async () => {
    // Update session if it exists and was completed
    const isSystemDesign = selectedScenario?.type === 'system-design'
    const hasTests = testSummary.total > 0
    const shouldUpdate = currentSessionId && (showFeedback || showPostInterviewDiscussion) && (hasTests || isSystemDesign)

    if (shouldUpdate) {
      try {
        // Use performance score if available (already 0-100), otherwise use pass rate
        const scoreToSave = performanceScore !== null ? performanceScore : (hasTests ? testSummary.passRate : 0)
        const feedbackText = isSystemDesign
          ? comprehensiveFeedback || `Completed system design interview: ${selectedScenario?.title}`
          : comprehensiveFeedback || `Completed ${selectedScenario?.title} with ${testSummary.passed}/${testSummary.total} tests passing`

        await updateInterviewSession(
          currentSessionId,
          scoreToSave,
          feedbackText,
          {
            code: code || (isSystemDesign ? '// Design notes' : ''),
            language: isSystemDesign ? 'notes' : selectedLanguage,
            testResults: hasTests ? testResults : undefined,
            timeComplexity: efficiencyMetrics?.estimatedTimeComplexity,
            spaceComplexity: efficiencyMetrics?.estimatedSpaceComplexity,
            efficiencyScore: efficiencyMetrics?.efficiencyScore,
          }
        )

        // Store system design notes if not already stored
        if (isSystemDesign && selectedScenario?.id && user) {
          fetch("/api/rag", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "store-solution",
              userId: user.id,
              problemId: selectedScenario.id,
              problemTitle: selectedScenario.title,
              solutionCode: code.trim() || '// Design discussion completed via chat',
              language: 'notes',
              passed: true,
              score: scoreToSave,
              problemType: 'system-design',
            }),
          }).catch((err) => {
            console.error("System design solution storage error (non-blocking):", err)
          })
        }
      } catch (error) {
        console.error("Error updating session:", error)
        // Silent failure - session data is also saved locally
      }
    }

    // CodeMirror 6 handles cleanup automatically through React lifecycle

    // Clear URL params when resetting
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.delete('session')
      url.searchParams.delete('scenario')
      window.history.replaceState({}, '', url.toString())
    }

    // Clear auto-save data to prevent "session restored" toast on next visit
    if (firebaseUser && selectedScenario) {
      const storageKey = `interview_autosave_${firebaseUser.uid}_${selectedScenario.id}`
      try {
        localStorage.removeItem(storageKey)
      } catch (e) {
        // Silent failure - localStorage might be unavailable
      }
    }

    // Stop any active voice recordings to prevent Deepgram billing
    if (interviewerVoice.isRecording) {
      interviewerVoice.stopRecording()
    }
    if (partnerVoice.isRecording) {
      partnerVoice.stopRecording()
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
    lastCodeHashRef.current = ""
    setCurrentSessionId(null)
    setRevealedHints(0)
    setRevealedHintIndices(new Set())
    setRagHints([])
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

  // Voice recording with Deepgram (or Web Speech API fallback)
  const toggleVoiceRecording = async (isInterviewer: boolean) => {
    const voice = isInterviewer ? interviewerVoice : partnerVoice
    const setInput = isInterviewer ? setInterviewerInput : setChatInput

    try {
      if (voice.isRecording) {
        // Stop recording
        const finalTranscript = voice.stopRecording()
        if (finalTranscript) {
          // In Live mode, messages are auto-sent on utterance end (when user pauses)
          // So when manually stopping, we just capture what's left
          if (voiceAutoSend) {
            // Auto-send is always on now - if there's unsent content, send it
            if (finalTranscript.trim()) {
              setInput(finalTranscript)
              setTimeout(() => {
                handleSendMessage(isInterviewer)
              }, 100)
            }
            toast.success("Recording stopped", { duration: 1500 })
          } else {
            // Manual mode: just capture the transcript, user will click send
            toast.success("Voice captured - click send when ready", { duration: 2000 })
          }
        }
      } else {
        // Start recording
        // Reset the transcript before starting
        voice.resetTranscript()
        setInput('')
        await voice.startRecording()
        // Always show simplified voice feedback
        toast.success("Speak now - sends automatically when you pause", {
          duration: 2000,
          icon: '🎙️',
        })
        // Removed manual mode branch - always auto-send now
        if (false) {
          toast.success("Recording... Click mic again to stop", {
            duration: 2000,
            icon: '🎤',
          })
        }
      }
    } catch (err: any) {
      console.error('Voice recording error:', err)
      if (err.message?.includes('denied') || err.message?.includes('NotAllowed')) {
        toast.error("Microphone access denied. Please allow microphone access in your browser.")
      } else if (err.message?.includes('NotFound')) {
        toast.error("No microphone found. Please connect a microphone and try again.")
      } else {
        toast.error("Voice input error. Please try again.")
      }
    }
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
              email: user?.email,
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

          // For system design interviews, store design notes when session ends
          const isSystemDesign = selectedScenario?.type === 'system-design'
          if (isSystemDesign && isEndingSession && selectedScenario?.id && user) {
            // Store design notes (even if empty - chat-only submission)
            fetch("/api/rag", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "store-solution",
                userId: user.id,
                problemId: selectedScenario.id,
                problemTitle: selectedScenario.title,
                solutionCode: code.trim() || '// Design discussion completed via chat',
                language: 'notes',
                passed: true, // System design has no tests
                score: 0, // Will be calculated by feedback system
                problemType: 'system-design',
              }),
            }).catch((err) => {
              console.error("System design solution storage error (non-blocking):", err)
            })
          }
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
    const nestedLoopCount = (code.match(/for.*{[^}]*for/g) || []).length +
      (code.match(/while.*{[^}]*while/g) || []).length
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

  const submitSystemDesign = async () => {
    if (!selectedScenario || selectedScenario.type !== 'system-design') return

    setIsRunningTests(true) // Reuse this state for loading indicator

    try {
      // Generate feedback for system design based on conversation and design notes
      await triggerSystemDesignFeedback()

      // Show success feedback
      playSound('success')
      toast.success("Design submitted!", {
        description: "Your design notes have been saved. Review your feedback below.",
      })
    } catch (error) {
      console.error("System design submission error:", error)
      toast.error("Failed to submit design", {
        description: "There was a problem submitting your design. Please try again.",
        action: {
          label: "Retry",
          onClick: () => submitSystemDesign(),
        },
      })
    } finally {
      setIsRunningTests(false)
    }
  }

  const triggerSystemDesignFeedback = async () => {
    setIsGeneratingDiscussion(true)

    try {
      if (!selectedScenario || selectedScenario.type !== 'system-design') {
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

      // For system design, generate feedback based on conversation and design notes
      // Create a mock summary for system design (no tests, but we need the structure)
      const mockSummary = {
        passed: 0,
        total: 0,
        passRate: 0, // Will be calculated by feedback system based on conversation
      }

      // Generate comprehensive feedback
      let comprehensiveFeedback = `Completed system design interview: ${selectedScenario?.title}`
      let calculatedPerformanceScore = 0

      // Prepare conversation transcript for content-based evaluation
      // This allows the AI to evaluate WHAT was said, not just message counts
      const conversationTranscript = [
        ...interviewerMessages.map(m => ({
          role: m.type === 'user' ? 'candidate' : 'interviewer',
          content: m.message,
          timestamp: m.timestamp
        })),
        ...chatMessages.map(m => ({
          role: m.type === 'user' ? 'candidate' : 'ai_partner',
          content: m.message,
          timestamp: m.timestamp
        }))
      ].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))

      // Generate feedback using the feedback API
      const feedbackResponse = await fetch("/api/generate-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code || '// Design notes completed via discussion',
          scenarioTitle: selectedScenario.title,
          scenarioType: selectedScenario.type,
          scenarioId: selectedScenario.id,
          scenarioDifficulty: selectedScenario.difficulty,
          scenarioPattern: (selectedScenario as any)?.pattern,
          testResults: [], // No tests for system design
          language: 'notes',
          timeSpent: elapsedTime,
          aiCollaborationMetrics,
          interactionMetrics,
          efficiencyMetrics: null, // No code efficiency for system design
          conversationTranscript, // Pass actual conversation for AI analysis
          sessionId: currentSessionId,
          userId: user?.id,
        }),
      })

      if (feedbackResponse.ok) {
        const feedbackData = await feedbackResponse.json()
        comprehensiveFeedback = feedbackData.feedback || comprehensiveFeedback
        calculatedPerformanceScore = feedbackData.scores?.overall || 0
      }

      setComprehensiveFeedback(comprehensiveFeedback)
      setPerformanceScore(calculatedPerformanceScore)

      // Update session with completion data
      if (currentSessionId && user) {
        try {
          await updateInterviewSession(
            currentSessionId,
            calculatedPerformanceScore,
            comprehensiveFeedback,
            {
              code: code || '// Design notes',
              language: 'notes',
              testResults: [],
            }
          )

          // Mark question complete in roadmap if user came from roadmap
          const isFromRoadmap = searchParams.get('from') === 'roadmap'
          if (isFromRoadmap && selectedScenario && activeRoadmap) {
            markQuestionCompleted(selectedScenario.id, calculatedPerformanceScore)
            const minutesSpent = Math.round(elapsedTime / 60)
            if (minutesSpent > 0) {
              addActualTime(minutesSpent)
            }
            toast.success("Progress saved to your roadmap!")
          }

          // Store solution for RAG (async, non-blocking)
          if (selectedScenario?.id) {
            fetch("/api/rag", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "store-solution",
                userId: user.id,
                problemId: selectedScenario.id,
                problemTitle: selectedScenario.title,
                solutionCode: code.trim() || '// Design discussion completed',
                language: 'notes',
                passed: true,
                score: calculatedPerformanceScore,
                problemType: 'system-design',
              }),
            }).catch((err) => {
              console.error("Solution storage error (non-blocking):", err)
            })
          }
        } catch (error) {
          console.error("Error updating session:", error)
        }
      }

      // Start post-interview discussion phase
      setShowPostInterviewDiscussion(true)

      // Trigger interviewer to provide final feedback
      const finalMessage = `The candidate has submitted their design. Please provide a brief summary of their performance, highlighting strengths and areas for improvement. Keep it concise (2-3 sentences).`

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: finalMessage,
          context: interviewerMessages,
          role: "interviewer",
          userContext: user ? {
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "",
          } : undefined,
          currentCode: code,
          scenarioTitle: selectedScenario?.title,
          scenarioType: selectedScenario?.type,
          isProactive: false,
          isPostInterview: true,
          isEndingSession: false,
        }),
      })

      const data = await response.json()
      if (data.reply) {
        setInterviewerMessages((prev) => [...prev, { type: "ai", message: data.reply }])
      }
    } catch (error) {
      console.error("Error generating system design feedback:", error)
      toast.error("Failed to generate feedback", {
        description: "There was a problem generating your feedback. Please try again.",
      })
    } finally {
      setIsGeneratingDiscussion(false)
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

        // Always start post-interview discussion after running tests, regardless of pass rate
        // This ensures sessions are marked as complete even if not all tests pass
        setIsRunningTests(false)
        setShowPostInterviewDiscussion(true)

        // Trigger interviewer to analyze the solution
        triggerPostInterviewDiscussion(data.results, data.summary)
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

      {/* Scenario Browser (Pattern / basket style) */}
      {showScenarioBrowser && (
        <ScenarioBrowser
          onStartInterview={async (scenario) => {
            // Pass scenario directly to avoid race condition with state update
            await startInterview(scenario)
          }}
          usageLimit={usageLimit}
          completedProblems={completedProblems}
        />
      )}

      {/* Interview Interface */}
      {!showScenarioBrowser && (
        <section
          className={`pt-2 pb-2 bg-gradient-to-b from-gray-900 to-black flex flex-col ${isResultView ? "min-h-screen overflow-x-hidden overflow-y-auto" : "h-screen overflow-hidden"
            }`}
        >
          <div className={`container mx-auto px-2 flex-1 flex flex-col ${isResultView ? "overflow-visible" : "overflow-hidden"}`}>
            <div className={`w-full mx-auto flex-1 flex flex-col gap-1 ${isResultView ? "overflow-visible" : "overflow-hidden"}`}>
              {/* Compact Top Bar - Cognitive Load Optimized */}
              <div className="flex items-center justify-between flex-shrink-0 pt-2 gap-2">
                {/* Left: Problem info */}
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  <h2 className="text-white text-sm font-semibold truncate max-w-[200px] sm:max-w-md">
                    {selectedScenario?.title}
                  </h2>
                  <Badge className={`${selectedScenario?.difficulty === "easy" ? "bg-green-600/20 text-green-400" :
                    selectedScenario?.difficulty === "medium" ? "bg-yellow-600/20 text-yellow-400" :
                      "bg-red-600/20 text-red-400"
                    } text-xs shrink-0`}>
                    {selectedScenario?.difficulty?.toUpperCase()}
                  </Badge>
                  {/* Language Selector - hidden on mobile */}
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
                    className="hidden sm:block bg-gray-800 border border-gray-600 text-white rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#00d9ff]"
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
                <div className="flex lg:hidden items-center gap-1 bg-gray-800/50 rounded-lg p-0.5">
                  <button
                    onClick={() => setActivePanel('problem')}
                    className={`px-2.5 py-1 rounded text-[10px] font-medium transition-all ${activePanel === 'problem'
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                      }`}
                    title="Problem"
                  >
                    <Target className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => setActivePanel('editor')}
                    className={`px-2.5 py-1 rounded text-[10px] font-medium transition-all ${activePanel === 'editor'
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                      }`}
                    title="Code Editor"
                  >
                    <Code className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => setActivePanel('chat')}
                    className={`px-2.5 py-1 rounded text-[10px] font-medium transition-all ${activePanel === 'chat'
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                      }`}
                    title="Interview Chat"
                  >
                    <Brain className="h-3 w-3" />
                  </button>
                </div>

                {/* Right: Actions - Research-backed controls for cognitive load reduction */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Timer with hide toggle - WCAG 2.1: Let users manage time on their terms */}
                  {isInterviewStarted && (
                    <div className="flex items-center bg-secondary/50 rounded-lg overflow-hidden">
                      {!hideTimer && (
                        <div className="flex items-center space-x-1.5 px-2 py-1">
                          <Clock className="h-3 w-3 text-accent" />
                          <span className="text-xs font-mono text-foreground">{formatTime(elapsedTime)}</span>
                        </div>
                      )}
                      <button
                        onClick={() => setHideTimer(!hideTimer)}
                        className="px-1.5 py-1 hover:bg-secondary/80 transition-colors"
                        title={hideTimer ? "Show timer" : "Hide timer (reduce time pressure)"}
                      >
                        {hideTimer ? <EyeOff className="h-3 w-3 text-muted-foreground" /> : <Eye className="h-3 w-3 text-muted-foreground" />}
                      </button>
                    </div>
                  )}

                  {/* Calm Mode Toggle - Research: Muted colors reduce anxiety */}
                  <button
                    onClick={() => setCalmMode(!calmMode)}
                    className={`hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all ${calmMode
                        ? 'bg-neural/20 text-neural border border-neural/30'
                        : 'bg-secondary/50 text-muted-foreground hover:text-foreground'
                      }`}
                    title={calmMode ? "Exit Calm Mode" : "Calm Mode (muted colors for focus)"}
                  >
                    <Leaf className="h-3 w-3" />
                    <span className="hidden lg:inline">{calmMode ? 'Calm' : 'Calm'}</span>
                  </button>

                  {/* Focus Mode Toggle - Desktop only */}
                  <button
                    onClick={() => {
                      const newFocusMode = !focusMode
                      setFocusMode(newFocusMode)
                      // Auto-enable calm mode when entering focus
                      if (newFocusMode && !calmMode) {
                        setCalmMode(true)
                      }
                    }}
                    className={`hidden lg:flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all ${focusMode
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-secondary/50 text-muted-foreground hover:text-foreground'
                      }`}
                    title={focusMode ? "Exit Focus Mode" : "Focus Mode (editor only + calm colors)"}
                  >
                    {focusMode ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
                    <span className="hidden xl:inline">{focusMode ? 'Exit Focus' : 'Focus'}</span>
                  </button>

                  <Button
                    onClick={() => setShowCloseDialog(true)}
                    variant="outline"
                    size="sm"
                    className="border-border text-muted-foreground hover:bg-secondary bg-transparent h-7 text-xs"
                  >
                    <ArrowLeft className="mr-1 h-3 w-3" />
                    <span className="hidden sm:inline">Close</span>
                  </Button>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════════
                  MAIN INTERFACE - Cognitive Load Optimized

                  Desktop (lg+):
                  - Default: 3 columns (Problem | Editor | Chat)
                  - Focus Mode: Editor only, with floating mini-buttons

                  Mobile/Tablet (<lg):
                  - Tab-based: One panel at a time (Miller's Law)
                  - Reduces simultaneous information processing
              ═══════════════════════════════════════════════════════════════ */}
              {!showFeedback && !showPostInterviewDiscussion ? (
                <div
                  className={`grid gap-1.5 sm:gap-2 flex-1 min-h-0 overflow-hidden transition-all duration-300 ${focusMode
                      ? 'grid-cols-1' // Focus mode: editor only
                      : 'grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_260px] xl:grid-cols-[320px_minmax(0,1fr)_300px] 2xl:grid-cols-[380px_minmax(0,1fr)_340px]'
                    }`}
                >
                  {/* Left: Problem Description / File Upload
                      - Hidden in focus mode (desktop)
                      - Only visible when activePanel === 'problem' (mobile)
                  */}
                  <Card className={`bg-gray-900/50 border-gray-700 glass-effect flex-col h-full overflow-hidden order-1 ${focusMode ? 'hidden' : '' // Hide in focus mode
                    } ${activePanel === 'problem' ? 'flex' : 'hidden lg:flex'}`}>
                    {/* IMPROVED: Enhanced header with title and difficulty badge */}
                    <CardHeader className="pb-3 flex-shrink-0 border-b border-gray-700/50">
                      <CardTitle className="text-white flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <Target className="h-5 w-5 text-accent flex-shrink-0" />
                          <span className="text-base font-semibold truncate">{selectedScenario?.title || 'Problem'}</span>
                        </div>
                        {selectedScenario && (
                          <Badge className={`text-xs flex-shrink-0 ml-2 ${
                            selectedScenario.difficulty === 'easy' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                            selectedScenario.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                            'bg-red-500/20 text-red-400 border-red-500/30'
                          }`}>
                            {selectedScenario.difficulty}
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    {/* IMPROVED: Better spacing and typography for readability */}
                    <CardContent className="flex-1 min-h-0 overflow-y-auto space-y-5 p-4">
                      {selectedScenario && (
                        <>
                          {/* IMPROVED: Description with larger font and visual hierarchy */}
                          <div className="space-y-2">
                            <h3 className="text-accent font-semibold text-sm uppercase tracking-wide flex items-center gap-2">
                              <span className="w-1 h-4 bg-accent rounded-full"></span>
                              Description
                            </h3>
                            <p className="text-gray-200 leading-relaxed text-[15px]">{selectedScenario.problemStatement}</p>
                          </div>

                          {/* IMPROVED: Examples with better visual hierarchy */}
                          {selectedScenario.type === 'dsa' && selectedScenario.examples && selectedScenario.examples.length > 0 && (
                            <div className="space-y-2">
                              <h3 className="text-accent font-semibold text-sm uppercase tracking-wide flex items-center gap-2">
                                <span className="w-1 h-4 bg-accent rounded-full"></span>
                                Examples
                              </h3>
                              <div className="space-y-3">
                                {selectedScenario.examples.slice(0, 2).map((ex, i) => (
                                  <div key={i} className="bg-gray-800/70 p-3 rounded-lg border border-gray-700/50">
                                    <div className="font-mono text-sm space-y-1.5">
                                      <div className="flex items-start gap-2">
                                        <span className="text-gray-500 font-medium min-w-[55px]">Input:</span>
                                        <code className="text-green-400 break-all">{ex.input}</code>
                                      </div>
                                      <div className="flex items-start gap-2">
                                        <span className="text-gray-500 font-medium min-w-[55px]">Output:</span>
                                        <code className="text-blue-400 break-all">{ex.output}</code>
                                      </div>
                                    </div>
                                    {ex.explanation && (
                                      <div className="text-gray-400 mt-2 pt-2 border-t border-gray-700/50 text-sm italic">
                                        {ex.explanation}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* IMPROVED: Constraints with better styling */}
                          {selectedScenario.type === 'dsa' && selectedScenario.constraints && selectedScenario.constraints.length > 0 && (
                            <div className="space-y-2">
                              <h3 className="text-accent font-semibold text-sm uppercase tracking-wide flex items-center gap-2">
                                <span className="w-1 h-4 bg-accent rounded-full"></span>
                                Constraints
                              </h3>
                              <ul className="text-gray-300 space-y-1.5">
                                {selectedScenario.constraints.slice(0, 4).map((c, i) => (
                                  <li key={i} className="text-sm flex items-start gap-2">
                                    <span className="text-accent mt-0.5">•</span>
                                    <code className="font-mono text-gray-300">{c}</code>
                                  </li>
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
                                  <span>Hints ({revealedHintIndices.size}/{revealedHints} unlocked)</span>
                                </h3>
                                {revealedHints < (selectedScenario as any).hints.length && (
                                  <span className="text-xs text-gray-400">
                                    Next in {Math.ceil((180 - (elapsedTime % 180)) / 60)}m
                                  </span>
                                )}
                              </div>
                              {revealedHints > 0 ? (
                                <div className="space-y-2">
                                  {(selectedScenario as any).hints.slice(0, revealedHints).map((hint: string, i: number) => {
                                    const isHintRevealed = revealedHintIndices.has(i)
                                    return (
                                      <div
                                        key={i}
                                        className={`bg-yellow-500/10 border border-yellow-500/20 rounded p-2 transition-all cursor-pointer ${!isHintRevealed ? 'hover:bg-yellow-500/15' : ''}`}
                                        onClick={() => {
                                          if (!isHintRevealed) {
                                            setRevealedHintIndices(prev => new Set([...prev, i]))
                                          }
                                        }}
                                      >
                                        {isHintRevealed ? (
                                          <p className="text-yellow-200 text-xs leading-relaxed">
                                            <span className="font-semibold">Hint {i + 1}:</span> {hint}
                                          </p>
                                        ) : (
                                          <div className="relative">
                                            <p className="text-yellow-200/30 text-xs leading-relaxed blur-sm select-none pointer-events-none">
                                              <span className="font-semibold">Hint {i + 1}:</span> {hint.substring(0, 50)}...
                                            </p>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                              <div className="flex items-center gap-1 text-yellow-400 text-xs bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/30">
                                                <HelpCircle className="h-3 w-3" />
                                                <span>Click to reveal Hint {i + 1}</span>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              ) : (
                                <p className="text-gray-400 text-xs italic">
                                  Hints will unlock every 3 minutes as you work on the problem
                                </p>
                              )}

                              {/* RAG-powered AI Hints */}
                              {ragHints.length > 0 && (
                                <div className="mt-3 pt-2 border-t border-gray-700/50">
                                  <div className="flex items-center gap-1 mb-2">
                                    <Sparkles className="h-3 w-3 text-purple-400" />
                                    <span className="text-xs text-purple-400">AI Insights</span>
                                  </div>
                                  <div className="space-y-1">
                                    {ragHints.map((hint, i) => (
                                      <div
                                        key={`rag-${i}`}
                                        className="bg-purple-500/10 border border-purple-500/20 rounded p-1.5 text-[10px] text-purple-200"
                                      >
                                        {hint.hint}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {isLoadingHints && (
                                <div className="mt-2 flex items-center gap-1 text-[10px] text-gray-500">
                                  <div className="h-2 w-2 border border-gray-500 border-t-transparent rounded-full animate-spin" />
                                  Loading AI hints...
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}

                      {/* Upload Codebase Section */}
                      <div className="border-t border-gray-700 pt-3 mt-3">
                        <h3 className="text-white font-semibold mb-2">Workspace Files</h3>
                        {/* Show warning for add-functionality when language has no files */}
                        {selectedScenario && selectedScenario.type === 'add-functionality' && workspaceContext.length === 0 && (
                          <div className="mb-2 bg-yellow-500/10 border border-yellow-500/30 rounded p-2">
                            <p className="text-xs text-yellow-300">
                              ⚠️ This scenario is optimized for <strong>JavaScript/TypeScript</strong>. Switch language for codebase files.
                            </p>
                          </div>
                        )}
                        {selectedScenario && (selectedScenario.type === 'bugfix' || selectedScenario.type === 'add-functionality') && workspaceContext.length > 0 ? (
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

                  {/* Center: Code Editor with Terminal/Console
                      - Always visible in focus mode
                      - Only visible when activePanel === 'editor' (mobile)
                  */}
                  <Card className={`bg-gray-900/50 border-gray-700 glass-effect flex-col h-full overflow-hidden order-2 ${activePanel === 'editor' ? 'flex' : 'hidden lg:flex'
                    }`}>
                    <CardHeader className="pb-2 flex-shrink-0 px-6">
                      <CardTitle className="text-white flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-1">
                          <Code className="h-3 w-3 text-accent" />
                          {selectedScenario?.type === 'system-design' ? (
                            <span>Design Notes</span>
                          ) : (
                            <span>{selectedScenario?.title.toLowerCase().replace(/\s+/g, "-").slice(0, 20)}.{selectedLanguage === "javascript" ? "js" : selectedLanguage === "typescript" ? "ts" : "py"}</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-3">
                          {/* Grading criteria indicator */}
                          <GradingCriteriaTooltip />
                          {isInterviewStarted && (
                            <div className="flex items-center space-x-1">
                              <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse"></div>
                              <span className="text-accent text-xs">LIVE</span>
                            </div>
                          )}
                        </div>
                      </CardTitle>
                    </CardHeader>
                    {/* Code Editor - Using CodeMirror 6 for lightweight editing */}
                    <div className="flex flex-col flex-1 min-h-0 gap-2 px-3 pb-3">
                      <div ref={editorContainerRef} className="flex-1 min-h-0 rounded border border-gray-700 overflow-hidden relative">
                        <ErrorBoundary>
                          <CodeEditor
                            height="100%"
                            language={selectedLanguage}
                            value={code}
                            onChange={(newCode) => {
                              // Enforce code protection if enabled
                              if (protectedElements && starterCode && isInterviewStarted && !showFeedback) {
                                const validation = validateCodeProtection(newCode, protectedElements, selectedLanguage)
                                if (!validation.valid) {
                                  toast.error(`Cannot remove required code: ${validation.errors[0]}`)
                                  return
                                }
                              }
                              setCode(newCode)
                            }}
                            readOnly={!isInterviewStarted || showFeedback}
                          />
                        </ErrorBoundary>
                        {/* Start Interview Overlay - shown when scenario selected but not started */}
                        {selectedScenario && !isInterviewStarted && !showScenarioBrowser && (
                          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-10">
                            <div className="text-center p-6 max-w-md">
                              <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <PlayCircle className="h-8 w-8 text-accent" />
                              </div>
                              <h3 className="text-xl font-bold text-white mb-2">Ready to Start?</h3>
                              <p className="text-gray-400 text-sm mb-4">
                                Review the problem on the left, then start your interview when ready. The timer will begin once you start.
                              </p>
                              <Button
                                onClick={() => startInterview()}
                                className="bg-accent hover:bg-accent/80 text-accent-foreground font-semibold px-8 py-3 text-base"
                              >
                                <PlayCircle className="mr-2 h-5 w-5" />
                                Start Interview
                              </Button>
                              <p className="text-gray-500 text-xs mt-3">
                                Estimated time: {selectedScenario.estimatedTime || 30} minutes
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Terminal/Console Output - Enhanced (hidden for system design) */}
                      {testResults.length > 0 && selectedScenario?.type !== 'system-design' && (
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
                              <span className="text-accent">$</span> Running tests...
                            </div>

                            {/* Individual Test Results */}
                            {testResults.map((result, index) => (
                              <div key={index} className="mb-2">
                                <div className={`flex items-center space-x-2 ${result.passed ? 'text-neural' : 'text-muted-foreground'}`}>
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
                      {selectedScenario?.type === 'system-design' ? (
                        /* Submit Design button for system design */
                        <div className="flex flex-col gap-2 flex-shrink-0">
                          <div className="text-[10px] text-gray-400 text-right">
                            Document your design decisions above, then submit when ready
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              onClick={submitSystemDesign}
                              disabled={showFeedback || showPostInterviewDiscussion}
                              loading={isRunningTests}
                              className="bg-accent hover:bg-accent/80 text-accent-foreground font-semibold text-xs h-7"
                              aria-label={isRunningTests ? "Submitting design..." : "Submit Design"}
                            >
                              {!isRunningTests && <CheckCircle className="mr-1 h-3 w-3" aria-hidden="true" />}
                              {isRunningTests ? "Submitting..." : "Submit Design"}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* Run Tests button for coding problems */
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
                      )}

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
                                <Bot className="h-3 w-3 text-accent" />
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
                                  <Bot className="h-3 w-3 text-accent" />
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
                                  className="h-6 w-6 p-0 bg-accent hover:bg-accent/80"
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

                  {/* Right: AI Interviewer Panel
                      - Hidden in focus mode (desktop)
                      - Only visible when activePanel === 'chat' (mobile)
                  */}
                  <Card className={`bg-gray-900/50 border-gray-700 glass-effect h-full flex-col overflow-hidden order-3 ${focusMode ? 'hidden' : '' // Hide in focus mode
                    } ${activePanel === 'chat' ? 'flex' : 'hidden lg:flex'}`}>
                    <CardHeader className="pb-2 flex-shrink-0">
                      <CardTitle className="text-white flex items-center space-x-2 text-sm">
                        <div className="relative">
                          <Brain className="h-4 w-4 text-accent animate-neural-pulse" />
                          <div className="absolute inset-0 bg-accent rounded-full blur-md opacity-30"></div>
                        </div>
                        <span className="bg-gradient-to-r from-accent to-neural bg-clip-text text-transparent font-bold">CodeSparring AI</span>
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
                                      <Brain className="h-3 w-3 text-accent animate-neural-pulse" />
                                    )}
                                    <span className="text-xs opacity-75">
                                      {msg.type === "user" ? "You" : "CodeSparring AI"}
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
                        <div className="flex flex-col gap-2 flex-shrink-0 border-t border-gray-700 pt-3">
                          {/* Enhanced Voice Mode Toggle */}
                          <VoiceModeToggle
                            isRecording={isRecordingInterviewer}
                            onToggleRecording={() => toggleVoiceRecording(true)}
                            transcript={interviewerInput}
                            disabled={isLoadingInterviewer || isGeneratingDiscussion}
                            compact={true}
                          />
                          {/* Text input for typing */}
                          {!isRecordingInterviewer && (
                            <div className="flex space-x-1">
                              <Input
                                value={interviewerInput}
                                onChange={(e) => setInterviewerInput(e.target.value)}
                                placeholder={showPostInterviewDiscussion ? "Type or use voice..." : "Type a question..."}
                                className="flex-1 bg-secondary border-border text-foreground placeholder-muted-foreground text-xs h-7"
                                onKeyPress={(e) => e.key === "Enter" && !isLoadingInterviewer && handleSendMessage(true)}
                                disabled={isLoadingInterviewer || isGeneratingDiscussion}
                                aria-label="Chat with interviewer"
                              />
                              <Button
                                onClick={() => handleSendMessage(true)}
                                className="bg-accent hover:bg-accent/80 text-accent-foreground h-7 px-2"
                                loading={isLoadingInterviewer || isGeneratingDiscussion}
                                disabled={!interviewerInput.trim()}
                                aria-label="Send message"
                              >
                                {!(isLoadingInterviewer || isGeneratingDiscussion) && <Send className="h-3 w-3" aria-hidden="true" />}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : showPostInterviewDiscussion ? (
                /* Post-Interview Discussion Phase */
                <div className="max-w-7xl mx-auto py-8 px-4">
                  <div className="text-center mb-6">
                    <CheckCircle className="h-12 w-12 text-accent mx-auto mb-3" />
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
                          <Code className="h-5 w-5 text-accent" />
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
                          <CodeEditor
                            height="400px"
                            language={selectedLanguage}
                            value={code}
                            readOnly
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
                          <Brain className="h-5 w-5 text-accent animate-neural-pulse" />
                          <div className="absolute inset-0 bg-accent rounded-full blur-md opacity-30"></div>
                        </div>
                        <span className="bg-gradient-to-r from-accent to-neural bg-clip-text text-transparent font-bold">Post-Interview Discussion</span>
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
                                  <Brain className="h-4 w-4 text-accent animate-neural-pulse" />
                                )}
                                <span className="text-sm font-medium">
                                  {msg.type === "user" ? "You" : "CodeSparring AI"}
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

                      {/* Chat Input with Simplified Voice Mode */}
                      <div className="flex flex-col gap-3 border-t border-border pt-4">
                        <VoiceModeToggle
                          isRecording={isRecordingInterviewer}
                          onToggleRecording={() => toggleVoiceRecording(true)}
                          transcript={interviewerInput}
                          disabled={isLoadingInterviewer || isGeneratingDiscussion}
                          compact={false}
                        />
                        {/* Text input for typing when not recording */}
                        {!isRecordingInterviewer && (
                          <div className="flex space-x-2">
                            <Input
                              value={interviewerInput}
                              onChange={(e) => setInterviewerInput(e.target.value)}
                              placeholder="Type or use voice above..."
                              className="flex-1 bg-secondary border-border text-foreground placeholder-muted-foreground"
                              onKeyPress={(e) => e.key === "Enter" && !isLoadingInterviewer && handleSendMessage(true)}
                              disabled={isLoadingInterviewer || isGeneratingDiscussion}
                              aria-label="Chat with interviewer"
                            />
                            <Button
                              onClick={() => handleSendMessage(true)}
                              className="bg-accent hover:bg-accent/80 text-accent-foreground"
                              loading={isLoadingInterviewer || isGeneratingDiscussion}
                              disabled={!interviewerInput.trim()}
                              aria-label="Send message"
                            >
                              {!(isLoadingInterviewer || isGeneratingDiscussion) && <Send className="h-4 w-4" aria-hidden="true" />}
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Action Buttons */}
                  <div className="flex justify-center gap-4">
                    <Button
                      onClick={proceedToFinalFeedback}
                      className="bg-accent hover:bg-accent/80 text-accent-foreground px-6"
                    >
                      View Detailed Feedback
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <Button
                      onClick={resetInterview}
                      variant="outline"
                      className="border-border text-muted-foreground hover:bg-secondary"
                    >
                      Try Another Problem
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <ErrorBoundary>
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
                  </ErrorBoundary>
                  {isFromRoadmap && activeRoadmap && (
                    <div className="mt-6 flex justify-center">
                      <Button
                        onClick={() => router.push("/roadmap")}
                        className="bg-primary hover:bg-primary/90 text-white"
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Roadmap
                      </Button>
                    </div>
                  )}
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

// Loading fallback for Suspense boundary
function InterviewPageLoading() {
  return (
    <main className="flex-1 flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00d9ff] mx-auto mb-4"></div>
        <p className="text-gray-400">Loading interview...</p>
      </div>
    </main>
  )
}

// Wrapper component with Suspense boundary for useSearchParams
export default function InterviewPage() {
  return (
    <Suspense fallback={<InterviewPageLoading />}>
      <InterviewPageContent />
    </Suspense>
  )
}

