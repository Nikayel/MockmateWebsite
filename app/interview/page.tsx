"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import dynamic from "next/dynamic"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
  const [user, setUser] = useState<UserType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showScenarioBrowser, setShowScenarioBrowser] = useState(true)
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null)
  const [isInterviewStarted, setIsInterviewStarted] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [comprehensiveFeedback, setComprehensiveFeedback] = useState<string>("")
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

  // Timer
  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)

  // Workspace context
  const [workspaceContext, setWorkspaceContext] = useState<Array<{ path: string; content: string }>>([])
  const [lastCodeHash, setLastCodeHash] = useState<string>("")
  const [proactiveTimer, setProactiveTimer] = useState<NodeJS.Timeout | null>(null)
  const [usageLimit, setUsageLimit] = useState<{ used: number; limit: number; allowed: boolean } | null>(null)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)

  const chatEndRef = useRef<HTMLDivElement>(null)
  const interviewerEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Check authentication and usage limit
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
      
      setIsLoading(false)
    }
    checkAuth()
  }, [router])

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

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  useEffect(() => {
    interviewerEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [interviewerMessages])

  // Proactive interviewer
  useEffect(() => {
    if (!isInterviewStarted || showFeedback) return

    const codeHash = code.trim().replace(/\s+/g, " ")
    
    if (codeHash !== lastCodeHash && codeHash.length > 50 && lastCodeHash.length > 0) {
      if (proactiveTimer) {
        clearTimeout(proactiveTimer)
        setProactiveTimer(null)
      }

      const timer = setTimeout(() => {
        triggerProactiveInterviewer()
      }, 10000)

      setProactiveTimer(timer)
      setLastCodeHash(codeHash)
    }

    return () => {
      if (proactiveTimer) {
        clearTimeout(proactiveTimer)
      }
    }
  }, [code, isInterviewStarted, showFeedback, lastCodeHash])

  const triggerProactiveInterviewer = async () => {
    if (isLoadingInterviewer) return

    setIsLoadingInterviewer(true)
    try {
      // Get user profile for context
      const userProfile = user ? await getUserProfile(user.id) : null
      
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "",
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

    // Check usage limit before starting - redirect to limit page
    if (user && usageLimit && !usageLimit.allowed) {
      router.push("/limit-reached")
      return
    }

    // Increment usage and create session when starting interview
    if (user) {
      try {
        // Create session document first
        const sessionId = await createInterviewSession(
          user.id,
          selectedScenario.title,
          selectedScenario.type,
          selectedScenario.difficulty
        )
        setCurrentSessionId(sessionId)
        
        // Then increment usage
        await incrementSessionUsage(user.id)
        // Refresh usage limit
        const updatedUsage = await checkUsageLimit(user.id)
        setUsageLimit(updatedUsage)
      } catch (error) {
        console.error("Error creating session:", error)
        toast.error("Failed to track session")
      }
    }

    setIsInterviewStarted(true)
    setShowScenarioBrowser(false)
    setStartTime(Date.now())
    
    // Initialize code with starter code
    const starterCode = selectedScenario.starterCode?.[selectedLanguage] || `function solution() {
  // Write your solution here
  
}`
    setCode(starterCode)

    // Initialize interviewer with problem statement
    const initialMessage = `Hello! Today we'll be working on **${selectedScenario.title}**.

${selectedScenario.problemStatement}

${selectedScenario.examples.length > 0 ? `\n**Examples:**\n${selectedScenario.examples.map((ex, i) => `\nExample ${i + 1}:\nInput: ${ex.input}\nOutput: ${ex.output}${ex.explanation ? `\nExplanation: ${ex.explanation}` : ""}`).join("\n")}` : ""}

${selectedScenario.constraints.length > 0 ? `\n**Constraints:**\n${selectedScenario.constraints.map(c => `- ${c}`).join("\n")}` : ""}

Take a moment to think about your approach, then feel free to ask me any clarifying questions!`

    setInterviewerMessages([{ type: "ai", message: initialMessage }])
    setChatMessages([{
      type: "ai",
      message: `Hi! I'm your AI coding partner. I can help you with ${selectedScenario.title}. Ask me anything about algorithms, hints, or debugging!`,
    }])
  }

  const resetInterview = async () => {
    // Update session if it exists and was completed
    if (currentSessionId && showFeedback && testSummary.total > 0) {
      try {
        await updateInterviewSession(
          currentSessionId,
          testSummary.passRate,
          `Completed ${selectedScenario?.title} with ${testSummary.passed}/${testSummary.total} tests passing`
        )
      } catch (error) {
        console.error("Error updating session:", error)
      }
    }
    
    setIsInterviewStarted(false)
    setShowFeedback(false)
    setComprehensiveFeedback("")
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
    if (proactiveTimer) {
      clearTimeout(proactiveTimer)
      setProactiveTimer(null)
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

  const runCode = async () => {
    if (!selectedScenario) return

    setIsRunningTests(true)
    setTestResults([])

    try {
      const response = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, scenarioId: selectedScenario.id }),
      })

      const data = await response.json()

      if (data.results) {
        setTestResults(data.results)
        setTestSummary(data.summary)

                        if (data.success) {
          // Generate comprehensive feedback
          let comprehensiveFeedback = `Completed ${selectedScenario?.title} with ${data.summary.passed}/${data.summary.total} tests passing`
          let performanceScore = data.summary.passRate * 10

          if (currentSessionId && user && code.trim()) {
            try {
              // Generate detailed feedback from AI
              const feedbackResponse = await fetch("/api/generate-feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  code,
                  scenarioTitle: selectedScenario?.title,
                  scenarioType: selectedScenario?.type,
                  testResults: data.results,
                  language: selectedLanguage,
                  timeSpent: elapsedTime,
                }),
              })

              if (feedbackResponse.ok) {
                const feedbackData = await feedbackResponse.json()
                comprehensiveFeedback = feedbackData.feedback || comprehensiveFeedback
                performanceScore = feedbackData.performanceScore || performanceScore
                // Store feedback for display
                setComprehensiveFeedback(comprehensiveFeedback)
              }
            } catch (feedbackError) {
              console.error("Error generating feedback:", feedbackError)
              // Continue with basic feedback if AI generation fails
            }
          }

          // Update session with completion data and comprehensive feedback
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
          
          setTimeout(() => {
            setShowFeedback(true)
          }, 2000)
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
                    className={`bg-gray-900/50 border-gray-700 glass-effect cursor-pointer scenario-card ${
                      selectedScenario?.id === scenario.id ? "border-[#ff5733] ring-2 ring-[#ff5733]/50 selected" : ""
                    }`}
                    onClick={() => setSelectedScenario(scenario)}
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
                      <div className="flex items-center justify-between text-sm text-gray-400">
                        <span>{scenario.companies.slice(0, 2).join(", ")}</span>
                        <span>{scenario.estimatedTime} min</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Start Button */}
              {selectedScenario && (
                <div className="mt-8 text-center space-y-4">
                  {usageLimit && !usageLimit.allowed && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-4">
                      <p className="text-yellow-400 font-medium mb-2">Monthly Limit Reached</p>
                      <p className="text-gray-300 text-sm mb-4">
                        You've used all {usageLimit.limit} free sessions this month. Upgrade to Pro for unlimited practice!
                      </p>
                      <Link href="/limit-reached">
                        <Button className="bg-yellow-500 hover:bg-yellow-600 text-black">
                          View Details & Upgrade
                        </Button>
                      </Link>
                    </div>
                  )}
                  <Button
                    onClick={startInterview}
                    disabled={usageLimit && !usageLimit.allowed}
                    size="lg"
                    className="bg-[#ff5733] hover:bg-[#ff5733]/80 text-white px-8 py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Play className="mr-2 h-5 w-5" />
                    Start Interview
                  </Button>
                  {usageLimit && usageLimit.allowed && (
                    <p className="text-sm text-gray-400">
                      {usageLimit.limit - usageLimit.used} session{usageLimit.limit - usageLimit.used !== 1 ? 's' : ''} remaining this month
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Interview Interface */}
      {!showScenarioBrowser && (
        <section className="pt-20 pb-4 bg-gradient-to-b from-gray-900 to-black h-screen flex flex-col">
          <div className="container mx-auto px-4 flex-1 flex flex-col overflow-hidden">
            <div className="max-w-[1920px] mx-auto flex-1 flex flex-col gap-4">
              {/* Workspace Context Upload - Top Bar */}
              <div className="flex items-center justify-between flex-shrink-0">
                <div className="flex items-center space-x-4">
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
                    className="border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent"
                    size="sm"
                  >
                    <Code className="mr-2 h-4 w-4" />
                    Upload Codebase Files
                  </Button>
                  {workspaceContext.length > 0 && (
                    <Badge className="bg-green-600/20 text-green-400 border-green-600/30">
                      {workspaceContext.length} file{workspaceContext.length !== 1 ? "s" : ""} loaded
                    </Badge>
                  )}
                  {/* Language Selector */}
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value as typeof selectedLanguage)}
                    className="bg-gray-800 border border-gray-600 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff5733]"
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
                {isInterviewStarted && (
                  <div className="flex items-center space-x-2 text-white bg-gray-800 px-4 py-2 rounded-lg">
                    <Clock className="h-4 w-4 text-[#ff5733]" />
                    <span className="text-lg font-mono">{formatTime(elapsedTime)}</span>
                  </div>
                )}
              </div>

              {/* Main Interface - Code Editor with Partner + Interviewer */}
              {!showFeedback ? (
                <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
                  {/* Left: Code Editor with Coding Partner at Bottom */}
                  <div className="col-span-12 lg:col-span-7 flex flex-col min-h-0">
                    <Card className="bg-gray-900/50 border-gray-700 glass-effect interview-card flex flex-col h-full">
                      <CardHeader className="pb-3 flex-shrink-0">
                        <CardTitle className="text-white flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Code className="h-5 w-5 text-[#ff5733]" />
                            <span>{selectedScenario?.title.toLowerCase().replace(/\s+/g, "-")}.{selectedLanguage === "javascript" ? "js" : selectedLanguage === "typescript" ? "ts" : "py"}</span>
                          </div>
                          {isInterviewStarted && (
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                              <span className="text-green-400 text-sm">LIVE</span>
                            </div>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-col flex-1 min-h-0 gap-3">
                        {/* Code Editor */}
                        <div className="flex-1 border border-gray-700 rounded-lg overflow-hidden min-h-0" style={{ minHeight: '300px' }}>
                          <Editor
                            height="100%"
                            defaultLanguage={selectedLanguage}
                            value={code}
                            onChange={(value) => setCode(value || "")}
                            theme="vs-dark"
                            options={{
                              minimap: { enabled: false },
                              fontSize: 14,
                              lineNumbers: "on",
                              scrollBeyondLastLine: false,
                              automaticLayout: true,
                              tabSize: 2,
                              readOnly: !isInterviewStarted || showFeedback,
                            }}
                          />
                        </div>

                        {/* Test Results */}
                        {testResults.length > 0 && (
                          <div className="space-y-2 flex-shrink-0">
                            <div className="flex items-center justify-between">
                              <h3 className="text-white font-semibold text-sm">Test Results</h3>
                              <Badge
                                className={
                                  testSummary.passRate === 100
                                    ? "bg-green-600"
                                    : testSummary.passRate >= 60
                                      ? "bg-yellow-600"
                                      : "bg-red-600"
                                }
                              >
                                {testSummary.passed}/{testSummary.total} ({testSummary.passRate}%)
                              </Badge>
                            </div>
                            <div className="space-y-1 max-h-20 overflow-y-auto">
                              {testResults.map((result, index) => (
                                <div
                                  key={index}
                                  className={`p-2 rounded text-xs ${
                                    result.passed ? "bg-green-900/30 text-green-300" : "bg-red-900/30 text-red-300"
                                  }`}
                                >
                                  <div className="flex items-center space-x-2">
                                    {result.passed ? (
                                      <CheckCircle className="h-3 w-3" />
                                    ) : (
                                      <XCircle className="h-3 w-3" />
                                    )}
                                    <span className="truncate">{result.description}</span>
                                  </div>
                                  {!result.passed && result.error && (
                                    <div className="ml-5 text-xs mt-1 opacity-80 truncate">{result.error}</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Controls */}
                        <div className="flex items-center justify-between gap-2 flex-shrink-0 pt-2 border-t border-gray-700">
                          <Button
                            onClick={resetInterview}
                            variant="outline"
                            size="sm"
                            className="border-gray-600 text-gray-300 hover:bg-gray-800 bg-transparent"
                          >
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Reset
                          </Button>
                          <Button
                            onClick={runCode}
                            disabled={isRunningTests || showFeedback}
                            className="bg-green-600 hover:bg-green-700 text-white"
                            size="sm"
                          >
                            <PlayCircle className="mr-2 h-4 w-4" />
                            {isRunningTests ? "Running..." : "Run Tests"}
                          </Button>
                        </div>

                        {/* AI Coding Partner - Integrated at Bottom */}
                        <div className="flex-shrink-0 border-t border-gray-700 pt-3">
                          <div className="flex items-center space-x-2 mb-2">
                            <Lightbulb className="h-4 w-4 text-[#ff5733]" />
                            <span className="text-white text-sm font-medium">AI Coding Partner</span>
                          </div>
                          <div className="h-32 overflow-y-auto space-y-2 mb-2 p-2 bg-gray-800/30 rounded-lg">
                            {chatMessages.map((msg, index) => (
                              <div key={index} className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"} chat-message`}>
                                <div
                                  className={`max-w-[80%] p-2 rounded-lg ${
                                    msg.type === "user" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-100"
                                  }`}
                                >
                                  <div className="flex items-center space-x-1 mb-1">
                                    {msg.type === "user" ? (
                                      <User className="h-3 w-3" />
                                    ) : (
                                      <Bot className="h-3 w-3 text-[#ff5733]" />
                                    )}
                                    <span className="text-xs opacity-75">{msg.type === "user" ? "You" : "Partner"}</span>
                                  </div>
                                  <p className="text-xs">{msg.message}</p>
                                </div>
                              </div>
                            ))}
                            <div ref={chatEndRef} />
                          </div>
                          <div className="flex space-x-2">
                            <Input
                              value={chatInput}
                              onChange={(e) => setChatInput(e.target.value)}
                              placeholder="Ask for help with algorithms, debugging, or hints..."
                              className="flex-1 bg-gray-800 border-gray-600 text-white placeholder-gray-400 text-sm"
                              onKeyPress={(e) => e.key === "Enter" && !isLoadingChat && handleSendMessage(false)}
                              disabled={isLoadingChat}
                            />
                            <Button
                              onClick={() => handleSendMessage(false)}
                              className="bg-[#ff5733] hover:bg-[#ff5733]/80 text-white"
                              size="sm"
                              disabled={isLoadingChat}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right: AI Interviewer Panel */}
                  <div className="col-span-12 lg:col-span-5 flex flex-col min-h-0">
                    <Card className="bg-gray-900/50 border-gray-700 glass-effect h-full flex flex-col">
                      <CardHeader className="pb-3 flex-shrink-0">
                        <CardTitle className="text-white flex items-center space-x-2">
                          <Bot className="h-5 w-5 text-[#ff5733]" />
                          <span>AI Interviewer</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-col flex-1 min-h-0">
                        <div className="flex-1 overflow-y-auto space-y-3 mb-3 min-h-0">
                          {interviewerMessages.length === 0 ? (
                            <div className="text-center py-16 text-gray-400">
                              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p className="text-sm">Interview will begin when you click start...</p>
                            </div>
                          ) : (
                            <>
                              {interviewerMessages.map((msg, index) => (
                                <div
                                  key={index}
                                  className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"} chat-message`}
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
                                      <span className="text-sm opacity-75">
                                        {msg.type === "user" ? "You" : "AI Interviewer"}
                                      </span>
                                    </div>
                                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                                  </div>
                                </div>
                              ))}
                              <div ref={interviewerEndRef} />
                            </>
                          )}
                        </div>
                        {isInterviewStarted && (
                          <div className="flex space-x-2 flex-shrink-0">
                            <Input
                              value={interviewerInput}
                              onChange={(e) => setInterviewerInput(e.target.value)}
                              placeholder="Ask the interviewer a question..."
                              className="flex-1 bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                              onKeyPress={(e) => e.key === "Enter" && !isLoadingInterviewer && handleSendMessage(true)}
                              disabled={isLoadingInterviewer}
                            />
                            <Button
                              onClick={() => handleSendMessage(true)}
                              className="bg-[#ff5733] hover:bg-[#ff5733]/80 text-white"
                              disabled={isLoadingInterviewer}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
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

      <Footer />
    </main>
  )
}

