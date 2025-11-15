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
import { CodeViewerDialog } from "@/components/CodeViewerDialog"
import {
  Play,
  RotateCcw,
  Code,
  MessageSquare,
  CheckCircle,
  Clock,
  User,
  Bot,
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
} from "lucide-react"
import { getCurrentUser, convertFirebaseUser } from "@/lib/auth"
import { checkUsageLimit, incrementSessionUsage, getUserProfile, createInterviewSession, updateInterviewSession } from "@/lib/firestore-helpers"
import { scenarios, filterScenarios, getScenarioById, type Scenario, type ScenarioType, type DifficultyLevel, type Company } from "@/lib/scenarios"
import { User as UserType } from "@/lib/types"
import { toast } from "sonner"

// Dynamically import Monaco Editor (client-side only)
const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false })

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
  const [user, setUser] = useState<UserType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showScenarioBrowser, setShowScenarioBrowser] = useState(true)
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null)
  const [isInterviewStarted, setIsInterviewStarted] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [showPostInterviewDiscussion, setShowPostInterviewDiscussion] = useState(false)
  const [comprehensiveFeedback, setComprehensiveFeedback] = useState<string>("")
  const [isGeneratingDiscussion, setIsGeneratingDiscussion] = useState(false)
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

  const chatEndRef = useRef<HTMLDivElement>(null)
  const interviewerEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Check authentication and usage limit, handle session reopening
  useEffect(() => {
    const checkAuth = async () => {
      const firebaseUser = await getCurrentUser()
      if (!firebaseUser) {
        router.push("/login?redirect=interview")
        return
      }
      const convertedUser = convertFirebaseUser(firebaseUser)
      setUser(convertedUser)
      
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
          const initialMessage = `Welcome back! You're continuing your practice on **${scenario.title}** - a ${scenario.difficulty} ${problemType} problem.

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
  }, [router, searchParams])

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
          // Clear workspace if no files available for this language
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
      }
    }
  }, [selectedLanguage, isInterviewStarted, selectedScenario, showFeedback])

  // Proactive interviewer - improved with context-aware timing
  useEffect(() => {
    if (!isInterviewStarted || showFeedback || showPostInterviewDiscussion) return

    const codeHash = code.trim().replace(/\s+/g, " ")
    const codeLength = code.trim().length
    
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

  // Analyze code for context-aware proactive feedback
  const analyzeCodeForProactiveFeedback = (code: string): string => {
    const analysis: string[] = []
    const codeLower = code.toLowerCase()
    
    // Detect patterns
    if (code.includes("for") && code.includes("for")) {
      analysis.push("Candidate is using nested loops - potential O(n²) complexity")
    }
    
    if (code.match(/sort|\.sort\(/)) {
      analysis.push("Candidate is using sorting - good algorithmic thinking")
    }
    
    if (code.match(/Map|Set|HashMap|HashSet/)) {
      analysis.push("Candidate is using hash-based data structures - efficient approach")
    }
    
    if (code.match(/recursion|function.*\(.*\)\s*{[\s\S]*\1\(/)) {
      analysis.push("Candidate is using recursion - should consider base cases and stack overflow")
    }
    
    if (code.length > 300 && !code.includes("//")) {
      analysis.push("Code is getting lengthy - candidate might benefit from breaking into helper functions")
    }
    
    if (code.match(/if.*if.*if/)) {
      analysis.push("Multiple nested conditionals detected - could indicate complexity")
    }
    
    if (code.match(/\/\/ TODO|\/\/ FIXME|\/\/ HACK/)) {
      analysis.push("Candidate has TODO/FIXME comments - they're aware of incomplete parts")
    }
    
    // Time-based context
    const minutesSpent = Math.floor(elapsedTime / 60)
    if (minutesSpent > 10 && code.length < 100) {
      analysis.push(`Candidate has been working for ${minutesSpent} minutes but code is still minimal - might need guidance`)
    }
    
    return analysis.length > 0 ? analysis.join("\n") : ""
  }

  const triggerPostInterviewDiscussion = async (testResults: TestResult[], summary: any) => {
    setIsGeneratingDiscussion(true)
    
    try {
      // Generate comprehensive feedback first
      let comprehensiveFeedback = `Completed ${selectedScenario?.title} with ${summary.passed}/${summary.total} tests passing`
      let performanceScore = summary.passRate * 10

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
            }),
          })

          if (feedbackResponse.ok) {
            const feedbackData = await feedbackResponse.json()
            comprehensiveFeedback = feedbackData.feedback || comprehensiveFeedback
            performanceScore = feedbackData.performanceScore || performanceScore
            setComprehensiveFeedback(comprehensiveFeedback)
          }
        } catch (feedbackError) {
          console.error("Error generating feedback:", feedbackError)
        }
      }

      // Now trigger interviewer to discuss the solution
      const userProfile = user ? await getUserProfile(user.id) : null
      const metrics = analyzeCodeEfficiency(code)
      
      const discussionPrompt = `[POST-INTERVIEW DISCUSSION] The candidate has completed the coding solution. All tests are passing.

TEST RESULTS: ${summary.passed}/${summary.total} tests passed (${summary.passRate}% pass rate)
TIME SPENT: ${Math.floor(elapsedTime / 60)} minutes ${elapsedTime % 60} seconds
EFFICIENCY METRICS:
- Time Complexity: ${metrics.estimatedTimeComplexity} (Optimal: ${metrics.optimalTimeComplexity})
- Space Complexity: ${metrics.estimatedSpaceComplexity} (Optimal: ${metrics.optimalSpaceComplexity})
- Efficiency Score: ${metrics.efficiencyScore}/100
- Code Complexity: ${metrics.complexity}
- Lines of Code: ${metrics.linesOfCode}

Please:
1. Congratulate them on completing the solution
2. Analyze their solution's time and space complexity
3. Discuss optimization opportunities if the solution isn't optimal
4. Point out what they did well
5. Suggest specific improvements
6. Ask if they want to optimize further or discuss the solution

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
          await updateInterviewSession(
            currentSessionId,
            performanceScore,
            comprehensiveFeedback
          )
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
        
        // Only increment usage for non-DSA questions
        if (selectedScenario.type !== 'dsa') {
          await incrementSessionUsage(user.id)
          // Refresh usage limit
          const updatedUsage = await checkUsageLimit(user.id)
          setUsageLimit(updatedUsage)
        }
      } catch (error) {
        console.error("Error creating session:", error)
        toast.error("Failed to track session")
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
    } else {
      // For DSA problems, load starter code
      initialCode = (selectedScenario as any).starterCode?.[selectedLanguage] || `function solution() {
  // Write your solution here

}`
    }
    setCode(initialCode)

    // Initialize interviewer with welcome message (problem details are now in left panel)
    const problemType = selectedScenario.type === 'bugfix' ? 'BUG FIX' : selectedScenario.type.toUpperCase()
    const initialMessage = `Hello! I'm your interviewer today. We'll be working on **${selectedScenario.title}** - a ${selectedScenario.difficulty} ${problemType} problem.

I can see you're reviewing the problem description on the left. Take a moment to understand it, then feel free to:
- Ask me clarifying questions about the requirements
- Discuss your approach before coding
- Ask for hints if you get stuck

Let's have a great interview! How would you like to approach this problem?`

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
        await updateInterviewSession(
          currentSessionId,
          testSummary.passRate,
          comprehensiveFeedback || `Completed ${selectedScenario?.title} with ${testSummary.passed}/${testSummary.total} tests passing`
        )
      } catch (error) {
        console.error("Error updating session:", error)
      }
    }
    
    setIsInterviewStarted(false)
    setShowFeedback(false)
    setShowPostInterviewDiscussion(false)
    setComprehensiveFeedback("")
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
    if (proactiveTimer) {
      clearTimeout(proactiveTimer)
      setProactiveTimer(null)
    }
  }

  const proceedToFinalFeedback = async () => {
    setShowPostInterviewDiscussion(false)
    setShowFeedback(true)
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

      try {
        // Get user profile for context
        const userProfile = user ? await getUserProfile(user.id) : null
        
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: input,
            context: messages,
            role: isInterviewer ? "interviewer" : "partner",
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
      toast.error("Failed to run tests")
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

  return (
    <main className="min-h-screen bg-black">
      <Header />

      {/* Scenario Browser */}
      {showScenarioBrowser && (
        <section className="pt-24 pb-16 bg-gradient-to-br from-black via-gray-900 to-black">
          <div className="container mx-auto px-4">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-8">
                <h1 className="text-4xl md:text-6xl font-heading font-bold text-white mb-4">
                  Select Interview Scenario
                </h1>
                <p className="text-xl text-gray-300">Choose a problem to practice</p>
              </div>

              {/* Filters */}
              <Card className="bg-gray-900/50 border-gray-700 glass-effect mb-6">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Search */}
                    <div className="md:col-span-2">
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
                        <option value="optimization">Optimization</option>
                        <option value="security">Security</option>
                        <option value="system-design">System Design</option>
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
                  </div>
                </CardContent>
              </Card>

              {/* Scenarios List */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredScenarios.map((scenario) => (
                  <Card
                    key={scenario.id}
                    className={`bg-gray-900/50 border-gray-700 glass-effect scenario-card ${
                      selectedScenario?.id === scenario.id ? "border-[#ff5733] ring-2 ring-[#ff5733]/50 selected" : ""
                    }`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <CardTitle className="text-white">{scenario.title}</CardTitle>
                        <Badge className={`${
                          scenario.difficulty === "easy" ? "bg-green-600" :
                          scenario.difficulty === "medium" ? "bg-yellow-600" :
                          "bg-red-600"
                        }`}>
                          {scenario.difficulty.toUpperCase()}
                        </Badge>
                      </div>
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
                      {/* Start Button on Card */}
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
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedScenario(scenario)
                            // Use setTimeout to ensure state is updated before calling startInterview
                            setTimeout(() => {
                              startInterview()
                            }, 0)
                          }}
                          disabled={usageLimit && !usageLimit.allowed && scenario.type !== 'dsa'}
                          className="w-full bg-[#ff5733] hover:bg-[#ff5733]/80 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Start Interview
                        </Button>
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
        <section className="pt-20 pb-2 bg-gradient-to-b from-gray-900 to-black h-screen flex flex-col overflow-hidden">
          <div className="container mx-auto px-4 flex-1 flex flex-col overflow-hidden">
            <div className="max-w-[1920px] mx-auto flex-1 flex flex-col gap-2 overflow-hidden">
              {/* Compact Top Bar */}
              <div className="flex items-center justify-between flex-shrink-0">
                <div className="flex items-center space-x-3">
                  <h2 className="text-white text-sm font-semibold truncate max-w-md">
                    {selectedScenario?.title}
                  </h2>
                  <Badge className={`${
                    selectedScenario?.difficulty === "easy" ? "bg-green-600/20 text-green-400" :
                    selectedScenario?.difficulty === "medium" ? "bg-yellow-600/20 text-yellow-400" :
                    "bg-red-600/20 text-red-400"
                  } text-xs`}>
                    {selectedScenario?.difficulty?.toUpperCase()}
                  </Badge>
                  {/* Language Selector */}
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value as typeof selectedLanguage)}
                    className="bg-gray-800 border border-gray-600 text-white rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#ff5733]"
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                    <option value="csharp">C#</option>
                    <option value="go">Go</option>
                    <option value="rust">Rust</option>
                  </select>
                </div>
                <div className="flex items-center space-x-3">
                  {isInterviewStarted && (
                    <div className="flex items-center space-x-2 text-white bg-gray-800 px-3 py-1 rounded-lg">
                      <Clock className="h-3 w-3 text-[#ff5733]" />
                      <span className="text-sm font-mono">{formatTime(elapsedTime)}</span>
                    </div>
                  )}
                  <Button
                    onClick={resetInterview}
                    variant="outline"
                    size="sm"
                    className="border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent h-7 text-xs"
                  >
                    <RotateCcw className="mr-1 h-3 w-3" />
                    Reset
                  </Button>
                </div>
              </div>

              {/* Main Interface - Three Column Layout */}
              {!showFeedback && !showPostInterviewDiscussion ? (
                <div className="grid grid-cols-12 gap-2 flex-1 min-h-0 overflow-hidden">
                  {/* Left: Problem Description / File Upload */}
                  <div className="col-span-12 lg:col-span-3 flex flex-col min-h-0">
                    <Card className="bg-gray-900/50 border-gray-700 glass-effect flex flex-col h-full overflow-hidden">
                      <CardHeader className="pb-2 flex-shrink-0">
                        <CardTitle className="text-white flex items-center space-x-2 text-sm">
                          <Target className="h-4 w-4 text-[#ff5733]" />
                          <span>Problem</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex-1 min-h-0 overflow-y-auto text-xs space-y-3">
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
                          {selectedScenario.type === 'bugfix' && workspaceContext.length > 0 ? (
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
                  </div>

                  {/* Center: Code Editor with Partner at Bottom */}
                  <div className="col-span-12 lg:col-span-5 flex flex-col min-h-0 overflow-hidden">
                    <Card className="bg-gray-900/50 border-gray-700 glass-effect flex flex-col h-full overflow-hidden">
                      <CardHeader className="pb-2 flex-shrink-0">
                        <CardTitle className="text-white flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-1">
                            <Code className="h-3 w-3 text-[#ff5733]" />
                            <span>{selectedScenario?.title.toLowerCase().replace(/\s+/g, "-").slice(0, 20)}.{selectedLanguage === "javascript" ? "js" : selectedLanguage === "typescript" ? "ts" : "py"}</span>
                          </div>
                          {isInterviewStarted && (
                            <div className="flex items-center space-x-1">
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                              <span className="text-green-400 text-xs">LIVE</span>
                            </div>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-col flex-1 min-h-0 gap-2 p-3">
                        {/* Code Editor */}
                        <div className="flex-1 border border-gray-700 rounded-lg overflow-hidden min-h-0" style={{ height: '45%' }}>
                          <Editor
                            height="100%"
                            language={selectedLanguage}
                            value={code}
                            onChange={(value) => setCode(value || "")}
                            theme="vs-dark"
                            options={{
                              minimap: { enabled: false },
                              fontSize: 13,
                              lineNumbers: "on",
                              scrollBeyondLastLine: false,
                              automaticLayout: true,
                              tabSize: 2,
                              readOnly: !isInterviewStarted || showFeedback,
                            }}
                          />
                        </div>

                        {/* Test Results & Efficiency - Compact */}
                        {testResults.length > 0 && (
                          <div className="flex-shrink-0 bg-gray-800/30 p-2 rounded border border-gray-700" style={{ maxHeight: '15%' }}>
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="text-white font-semibold text-xs">Results</h3>
                              <div className="flex items-center space-x-2">
                                <Badge
                                  className={`${
                                    testSummary.passRate === 100 ? "bg-green-600" :
                                    testSummary.passRate >= 60 ? "bg-yellow-600" : "bg-red-600"
                                  } text-xs h-4`}
                                >
                                  {testSummary.passed}/{testSummary.total}
                                </Badge>
                                {efficiencyMetrics && (
                                  <Badge className={`${
                                    efficiencyMetrics.efficiencyScore >= 80 ? "bg-green-600" :
                                    efficiencyMetrics.efficiencyScore >= 60 ? "bg-yellow-600" : "bg-red-600"
                                  } text-xs h-4`}>
                                    Eff: {efficiencyMetrics.efficiencyScore}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1 text-xs text-gray-400">
                              {efficiencyMetrics && (
                                <>
                                  <span>Time: <span className="text-white">{efficiencyMetrics.estimatedTimeComplexity}</span></span>
                                  <span className="mx-1">•</span>
                                  <span>Space: <span className="text-white">{efficiencyMetrics.estimatedSpaceComplexity}</span></span>
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Controls */}
                        <div className="flex items-center justify-end gap-2 flex-shrink-0">
                          <Button
                            onClick={runCode}
                            disabled={isRunningTests || showFeedback}
                            className="bg-green-600 hover:bg-green-700 text-white text-xs h-7"
                          >
                            <PlayCircle className="mr-1 h-3 w-3" />
                            {isRunningTests ? "Running..." : "Run Tests"}
                          </Button>
                        </div>

                        {/* AI Coding Partner - Fixed Height */}
                        <div className="flex flex-col border-t border-gray-700 pt-2" style={{ height: '35%' }}>
                          <div className="flex items-center space-x-1 mb-1 flex-shrink-0">
                            <Lightbulb className="h-3 w-3 text-[#ff5733]" />
                            <span className="text-white text-xs font-medium">AI Partner</span>
                          </div>
                          <div className="flex-1 overflow-y-auto space-y-1 mb-2 p-2 bg-gray-800/30 rounded min-h-0">
                            {chatMessages.map((msg, index) => (
                              <div key={index} className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}>
                                <div
                                  className={`max-w-[85%] p-1.5 rounded text-xs ${
                                    msg.type === "user" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-100"
                                  }`}
                                >
                                  <div className="flex items-center space-x-1 mb-0.5">
                                    {msg.type === "user" ? (
                                      <User className="h-2.5 w-2.5" />
                                    ) : (
                                      <Bot className="h-2.5 w-2.5 text-[#ff5733]" />
                                    )}
                                    <span className="text-xs opacity-75">{msg.type === "user" ? "You" : "Partner"}</span>
                                  </div>
                                  <p className="text-xs leading-tight">{msg.message}</p>
                                </div>
                              </div>
                            ))}
                            <div ref={chatEndRef} />
                          </div>
                          <div className="flex space-x-1 flex-shrink-0">
                            <Input
                              value={chatInput}
                              onChange={(e) => setChatInput(e.target.value)}
                              placeholder="Ask for help..."
                              className="flex-1 bg-gray-800 border-gray-600 text-white placeholder-gray-400 text-xs h-7"
                              onKeyPress={(e) => e.key === "Enter" && !isLoadingChat && handleSendMessage(false)}
                              disabled={isLoadingChat}
                            />
                            <Button
                              onClick={() => handleSendMessage(false)}
                              className="bg-[#ff5733] hover:bg-[#ff5733]/80 text-white h-7 px-2"
                              disabled={isLoadingChat}
                            >
                              <Send className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right: AI Interviewer Panel - Fixed Height */}
                  <div className="col-span-12 lg:col-span-4 flex flex-col min-h-0 overflow-hidden">
                    <Card className="bg-gray-900/50 border-gray-700 glass-effect h-full flex flex-col overflow-hidden">
                      <CardHeader className="pb-2 flex-shrink-0">
                        <CardTitle className="text-white flex items-center space-x-2 text-sm">
                          <Bot className="h-4 w-4 text-[#ff5733]" />
                          <span>AI Interviewer</span>
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
                                    className={`max-w-[90%] p-2 rounded-lg ${
                                      msg.type === "user" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-100"
                                    }`}
                                  >
                                    <div className="flex items-center space-x-1 mb-1">
                                      {msg.type === "user" ? (
                                        <User className="h-3 w-3" />
                                      ) : (
                                        <Bot className="h-3 w-3 text-[#ff5733]" />
                                      )}
                                      <span className="text-xs opacity-75">
                                        {msg.type === "user" ? "You" : "Interviewer"}
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
                              placeholder={showPostInterviewDiscussion ? "Ask about optimization or improvements..." : "Ask a question..."}
                              className="flex-1 bg-gray-800 border-gray-600 text-white placeholder-gray-400 text-xs h-7"
                              onKeyPress={(e) => e.key === "Enter" && !isLoadingInterviewer && handleSendMessage(true)}
                              disabled={isLoadingInterviewer || isGeneratingDiscussion}
                            />
                            <Button
                              onClick={() => handleSendMessage(true)}
                              className="bg-[#ff5733] hover:bg-[#ff5733]/80 text-white h-7 px-2"
                              disabled={isLoadingInterviewer || isGeneratingDiscussion}
                            >
                              <Send className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : showPostInterviewDiscussion ? (
                /* Post-Interview Discussion Phase */
                <div className="max-w-6xl mx-auto py-8">
                  <div className="text-center mb-6">
                    <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
                    <h2 className="text-2xl font-heading font-bold text-white mb-2">Solution Complete!</h2>
                    <p className="text-gray-300 mb-4">All tests passed! Let's discuss your solution with the interviewer.</p>
                    {testSummary.total > 0 && (
                      <div className="flex items-center justify-center gap-4 mb-4">
                        <Badge className="bg-green-600 text-white">
                          {testSummary.passed}/{testSummary.total} Tests Passed
                        </Badge>
                        {efficiencyMetrics && (
                          <>
                            <Badge className={`${
                              efficiencyMetrics.efficiencyScore >= 80 ? "bg-green-600" :
                              efficiencyMetrics.efficiencyScore >= 60 ? "bg-yellow-600" : "bg-red-600"
                            } text-white`}>
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

                  {/* Interviewer Discussion Panel */}
                  <Card className="bg-gray-900/50 border-gray-700 glass-effect mb-6">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center space-x-2">
                        <Bot className="h-5 w-5 text-[#ff5733]" />
                        <span>Post-Interview Discussion</span>
                        {isGeneratingDiscussion && (
                          <span className="text-xs text-gray-400 ml-2">(Analyzing your solution...)</span>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4 max-h-96 overflow-y-auto mb-4 pr-2">
                        {interviewerMessages.slice(-5).map((msg, index) => (
                          <div
                            key={index}
                            className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[85%] p-3 rounded-lg ${
                                msg.type === "user" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-100"
                              }`}
                            >
                              <div className="flex items-center space-x-2 mb-1">
                                {msg.type === "user" ? (
                                  <User className="h-4 w-4" />
                                ) : (
                                  <Bot className="h-4 w-4 text-[#ff5733]" />
                                )}
                                <span className="text-sm font-medium">
                                  {msg.type === "user" ? "You" : "Interviewer"}
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
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#ff5733]"></div>
                                <span className="text-sm text-gray-300">Interviewer is analyzing your solution...</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Chat Input */}
                      <div className="flex space-x-2 border-t border-gray-700 pt-4">
                        <Input
                          value={interviewerInput}
                          onChange={(e) => setInterviewerInput(e.target.value)}
                          placeholder="Ask about optimization, complexity, or improvements..."
                          className="flex-1 bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                          onKeyPress={(e) => e.key === "Enter" && !isLoadingInterviewer && handleSendMessage(true)}
                          disabled={isLoadingInterviewer || isGeneratingDiscussion}
                        />
                        <Button
                          onClick={() => handleSendMessage(true)}
                          className="bg-[#ff5733] hover:bg-[#ff5733]/80 text-white"
                          disabled={isLoadingInterviewer || isGeneratingDiscussion}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Action Buttons */}
                  <div className="flex justify-center gap-4">
                    <Button
                      onClick={proceedToFinalFeedback}
                      className="bg-[#ff5733] hover:bg-[#ff5733]/80 text-white px-6"
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
                <div className="max-w-4xl mx-auto py-8">
                  <div className="text-center mb-8">
                    <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
                    <h2 className="text-3xl font-heading font-bold text-white mb-2">Interview Complete!</h2>
                    <p className="text-gray-300 mb-8">Congratulations! Here's your comprehensive performance analysis</p>
                  </div>
                  
                  {/* Comprehensive Feedback */}
                  {comprehensiveFeedback && (
                    <Card className="bg-gray-900/50 border-gray-700 glass-effect mb-6">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center space-x-2">
                          <TrendingUp className="h-5 w-5 text-[#ff5733]" />
                          <span>Performance Feedback</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="prose prose-invert max-w-none">
                          <div className="text-gray-200 whitespace-pre-wrap text-sm leading-relaxed">
                            {comprehensiveFeedback}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="text-center">
                    <Button onClick={resetInterview} className="bg-[#ff5733] hover:bg-[#ff5733]/80 text-white px-8 py-3">
                      Try Another Problem
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Code Viewer Dialog */}
      {selectedFile && (
        <CodeViewerDialog
          isOpen={isCodeViewerOpen}
          onClose={() => {
            setIsCodeViewerOpen(false)
            setSelectedFile(null)
          }}
          fileName={selectedFile.path}
          content={selectedFile.content}
        />
      )}

      <Footer />
    </main>
  )
}

