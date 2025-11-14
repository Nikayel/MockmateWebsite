"use client"

import { useState, useEffect, useRef } from "react"
import dynamic from "next/dynamic"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Play,
  Pause,
  RotateCcw,
  Code,
  MessageSquare,
  ArrowRight,
  CheckCircle,
  Clock,
  User,
  Bot,
  Lightbulb,
  Target,
  TrendingUp,
  Send,
  Square,
  PlayCircle,
  XCircle,
  AlertCircle,
} from "lucide-react"
import { checkDemoAccess, markDemoAsUsed, getUserContext, formatDemoUsedDate } from "@/lib/demo-manager"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction } from "@/components/ui/alert-dialog"

// Dynamically import Monaco Editor (client-side only)
const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false })

interface ChatMessage {
  type: "user" | "ai"
  message: string
}

interface TestResult {
  description: string
  passed: boolean
  input: { nums: number[]; target: number }
  expected: number[]
  actual: number[] | null
  error: string | null
}

export default function DemoPage() {
  const [isInterviewStarted, setIsInterviewStarted] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [showDemoLimitDialog, setShowDemoLimitDialog] = useState(false)
  const [demoUsedDate, setDemoUsedDate] = useState<string>("")
  const [canAccessDemo, setCanAccessDemo] = useState(true)
  const [code, setCode] = useState(`function twoSum(nums, target) {
  // Write your solution here

}`)

  const [interviewerMessages, setInterviewerMessages] = useState<ChatMessage[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      type: "ai",
      message: "Hi! I'm your AI coding partner. Ask me anything about the Two Sum problem or need help with your approach!",
    },
  ])
  const [chatInput, setChatInput] = useState("")
  const [interviewerInput, setInterviewerInput] = useState("")
  const [isLoadingChat, setIsLoadingChat] = useState(false)
  const [isLoadingInterviewer, setIsLoadingInterviewer] = useState(false)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isRunningTests, setIsRunningTests] = useState(false)
  const [testSummary, setTestSummary] = useState({ total: 0, passed: 0, failed: 0, passRate: 0 })
  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [workspaceContext, setWorkspaceContext] = useState<Array<{ path: string; content: string }>>([])
  const [lastCodeHash, setLastCodeHash] = useState<string>("")
  const [proactiveTimer, setProactiveTimer] = useState<NodeJS.Timeout | null>(null)

  const chatEndRef = useRef<HTMLDivElement>(null)
  const interviewerEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Check demo access on component mount
  useEffect(() => {
    const demoStatus = checkDemoAccess()
    setCanAccessDemo(demoStatus.canAccessDemo)
    if (!demoStatus.canAccessDemo && demoStatus.demoUsedAt) {
      setDemoUsedDate(formatDemoUsedDate(demoStatus.demoUsedAt))
    }
  }, [])

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

  // Proactive interviewer: Watch for code changes and jump in
  useEffect(() => {
    if (!isInterviewStarted || showFeedback) return

    // Simple hash of code to detect changes
    const codeHash = code.trim().replace(/\s+/g, " ")
    
    // If code changed significantly and user has been typing
    if (codeHash !== lastCodeHash && codeHash.length > 50 && lastCodeHash.length > 0) {
      // Clear existing timer
      if (proactiveTimer) {
        clearTimeout(proactiveTimer)
        setProactiveTimer(null)
      }

      // Set new timer - interviewer jumps in after 10 seconds of inactivity
      const timer = setTimeout(() => {
        triggerProactiveInterviewer()
      }, 10000) // 10 seconds after last code change

      setProactiveTimer(timer)
      setLastCodeHash(codeHash)
    }

    return () => {
      if (proactiveTimer) {
        clearTimeout(proactiveTimer)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, isInterviewStarted, showFeedback, lastCodeHash])

  const triggerProactiveInterviewer = async () => {
    if (isLoadingInterviewer) return

    setIsLoadingInterviewer(true)
    try {
      // Get user context for personalized AI responses
      const userContext = getUserContext()

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "", // Empty for proactive mode
          context: interviewerMessages,
          role: "interviewer",
          userContext: userContext,
          workspaceContext: workspaceContext,
          currentCode: code,
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
      // Only process text files
      if (file.type.startsWith("text/") || file.name.match(/\.(js|ts|jsx|tsx|py|java|cpp|c|h|json|md|txt)$/i)) {
        try {
          const content = await file.text()
          // Limit file size to 50KB to avoid token limits
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
    }
  }

  const startInterview = () => {
    // Check if demo has already been used
    if (!canAccessDemo) {
      setShowDemoLimitDialog(true)
      return
    }

    // Mark demo as used
    markDemoAsUsed()
    setCanAccessDemo(false)

    setIsInterviewStarted(true)
    setStartTime(Date.now())
    // AI Interviewer introduces the problem
    setInterviewerMessages([
      {
        type: "ai",
        message:
          "Hello! Today we'll be working on the Two Sum problem. Here's the question:\n\nGiven an array of integers 'nums' and an integer 'target', return indices of the two numbers such that they add up to target.\n\nYou may assume that each input has exactly one solution, and you may not use the same element twice.\n\nExample: nums = [2,7,11,15], target = 9\nOutput: [0,1] (because nums[0] + nums[1] = 2 + 7 = 9)\n\nTake a moment to think about your approach, then feel free to ask me any clarifying questions!",
      },
    ])
  }

  const resetInterview = () => {
    setIsInterviewStarted(false)
    setShowFeedback(false)
    setCode(`function twoSum(nums, target) {
  // Write your solution here

}`)
    setInterviewerMessages([])
    setChatMessages([
      {
        type: "ai",
        message: "Hi! I'm your AI coding partner. Ask me anything about the Two Sum problem or need help with your approach!",
      },
    ])
    setTestResults([])
    setTestSummary({ total: 0, passed: 0, failed: 0, passRate: 0 })
    setStartTime(null)
    setElapsedTime(0)
    setLastCodeHash("")
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
        // Get user context for personalized AI responses
        const userContext = getUserContext()

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: input,
            context: messages,
            role: isInterviewer ? "interviewer" : "partner",
            userContext: userContext,
            workspaceContext: workspaceContext,
            currentCode: code,
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
    setIsRunningTests(true)
    setTestResults([])

    try {
      const response = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })

      const data = await response.json()

      if (data.results) {
        setTestResults(data.results)
        setTestSummary(data.summary)

        // If all tests passed, show feedback
        if (data.success) {
          setTimeout(() => {
            setShowFeedback(true)
          }, 2000)
        }
      }
    } catch (error) {
      console.error("Code execution error:", error)
    } finally {
      setIsRunningTests(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const calculateCodeQuality = () => {
    if (testSummary.passRate === 100) {
      // Check for optimal solution (O(n) with hash map)
      if (code.includes("Map") || code.includes("{}") || code.includes("Object")) {
        return { score: 95, label: "Excellent - Optimal Solution" }
      }
      return { score: 75, label: "Good - Brute Force" }
    }
    return { score: testSummary.passRate, label: "Needs Improvement" }
  }

  return (
    <main className="min-h-screen bg-black">
      <Header />

      {/* Hero Section */}
      <section className="pt-24 pb-12 bg-gradient-to-br from-black via-gray-900 to-black">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto text-center">
            <Badge className="bg-[#ff5733]/20 text-[#ff5733] border-[#ff5733]/30 mb-6">Live Mock Interview</Badge>
            <h1 className="text-4xl md:text-6xl font-heading font-bold text-white mb-6">
              MockMate Trial
              <span className="text-gradient"> Recording</span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Experience a realistic coding interview with an AI interviewer, real code editor, and instant feedback.
              Practice the Two Sum problem!
            </p>
          </div>
        </div>
      </section>

      {/* Interview Interface */}
      <section className="py-16 bg-gradient-to-b from-gray-900 to-black">
        <div className="container mx-auto px-4">
          <div className="max-w-7xl mx-auto">
            {/* Controls */}
            <div className="flex flex-col items-center space-y-4 mb-8">
              <div className="flex justify-center items-center space-x-4">
                {!isInterviewStarted ? (
                  <Button
                    onClick={startInterview}
                    className="bg-[#ff5733] hover:bg-[#ff5733]/80 text-white px-8 py-4 text-lg"
                  >
                    <Play className="mr-2 h-6 w-6" />
                    Start Mock Interview
                  </Button>
                ) : (
                  <>
                    <div className="flex items-center space-x-2 text-white bg-gray-800 px-6 py-3 rounded-lg">
                      <Clock className="h-5 w-5 text-[#ff5733]" />
                      <span className="text-xl font-mono">{formatTime(elapsedTime)}</span>
                    </div>
                    <Button
                      onClick={runCode}
                      disabled={isRunningTests || showFeedback}
                      className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg"
                    >
                      <PlayCircle className="mr-2 h-6 w-6" />
                      {isRunningTests ? "Running..." : "Run Tests"}
                    </Button>
                  </>
                )}
                <Button
                  onClick={resetInterview}
                  variant="outline"
                  className="border-white text-white hover:bg-white hover:text-black bg-transparent px-8 py-4 text-lg"
                >
                  <RotateCcw className="mr-2 h-6 w-6" />
                  Reset
                </Button>
              </div>

              {/* Workspace Context Upload */}
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
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-green-600/20 text-green-400 border-green-600/30">
                      {workspaceContext.length} file{workspaceContext.length !== 1 ? "s" : ""} loaded
                    </Badge>
                    <Button
                      onClick={() => setWorkspaceContext([])}
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-white"
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </div>
              {workspaceContext.length > 0 && (
                <div className="w-full max-w-4xl">
                  <div className="bg-gray-800/50 rounded-lg p-3 text-sm">
                    <p className="text-gray-300 mb-2">
                      <strong className="text-white">AI Context:</strong> Both AI personas can see your codebase files and current solution code.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {workspaceContext.map((file, idx) => (
                        <Badge key={idx} className="bg-blue-600/20 text-blue-300 border-blue-600/30 text-xs">
                          {file.path}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Main Interface */}
            {!showFeedback ? (
              <div className="space-y-6">
                {/* Top Row: Code Editor + AI Interviewer */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Code Editor - 2/3 width */}
                  <div className="lg:col-span-2">
                    <Card className="bg-gray-900/50 border-gray-700 glass-effect">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-white flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Code className="h-5 w-5 text-[#ff5733]" />
                            <span>two-sum.js</span>
                          </div>
                          {isInterviewStarted && (
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                              <span className="text-green-400 text-sm">LIVE</span>
                            </div>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[400px] border border-gray-700 rounded-lg overflow-hidden">
                          <Editor
                            height="100%"
                            defaultLanguage="javascript"
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
                          <div className="mt-4 space-y-2">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-white font-semibold">Test Results</h3>
                              <Badge
                                className={
                                  testSummary.passRate === 100
                                    ? "bg-green-600"
                                    : testSummary.passRate >= 60
                                      ? "bg-yellow-600"
                                      : "bg-red-600"
                                }
                              >
                                {testSummary.passed}/{testSummary.total} Passed ({testSummary.passRate}%)
                              </Badge>
                            </div>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {testResults.map((result, index) => (
                                <div
                                  key={index}
                                  className={`p-2 rounded text-sm ${
                                    result.passed ? "bg-green-900/30 text-green-300" : "bg-red-900/30 text-red-300"
                                  }`}
                                >
                                  <div className="flex items-center space-x-2">
                                    {result.passed ? (
                                      <CheckCircle className="h-4 w-4" />
                                    ) : (
                                      <XCircle className="h-4 w-4" />
                                    )}
                                    <span>{result.description}</span>
                                  </div>
                                  {!result.passed && result.error && (
                                    <div className="ml-6 text-xs mt-1 opacity-80">{result.error}</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* AI Interviewer - 1/3 width */}
                  <div className="lg:col-span-1">
                    <Card className="bg-gray-900/50 border-gray-700 glass-effect h-full">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-white flex items-center space-x-2">
                          <Bot className="h-5 w-5 text-[#ff5733]" />
                          <span>AI Interviewer</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-col h-[calc(100%-80px)]">
                        <div className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-[300px]">
                          {interviewerMessages.length === 0 ? (
                            <div className="text-center py-16 text-gray-400">
                              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p>Interview will begin when you click start...</p>
                            </div>
                          ) : (
                            <>
                              {interviewerMessages.map((msg, index) => (
                                <div
                                  key={index}
                                  className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
                                >
                                  <div
                                    className={`max-w-[90%] p-3 rounded-lg ${
                                      msg.type === "user" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-100"
                                    }`}
                                  >
                                    <div className="flex items-center space-x-2 mb-1">
                                      {msg.type === "user" ? (
                                        <User className="h-3 w-3" />
                                      ) : (
                                        <Bot className="h-3 w-3 text-[#ff5733]" />
                                      )}
                                      <span className="text-xs opacity-75">
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
                          <div className="flex space-x-2 mt-auto">
                            <Input
                              value={interviewerInput}
                              onChange={(e) => setInterviewerInput(e.target.value)}
                              placeholder="Ask the interviewer..."
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

                {/* Bottom Row: AI Coding Partner Chat */}
                <Card className="bg-gray-900/50 border-gray-700 glass-effect">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white flex items-center space-x-2">
                      <Lightbulb className="h-5 w-5 text-[#ff5733]" />
                      <span>AI Coding Partner - Ask for Help Anytime!</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="h-64 overflow-y-auto space-y-3 p-4 bg-gray-800/30 rounded-lg">
                        {chatMessages.map((msg, index) => (
                          <div key={index} className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}>
                            <div
                              className={`max-w-[80%] p-3 rounded-lg ${
                                msg.type === "user" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-100"
                              }`}
                            >
                              <div className="flex items-center space-x-2 mb-1">
                                {msg.type === "user" ? (
                                  <User className="h-3 w-3" />
                                ) : (
                                  <Bot className="h-3 w-3 text-[#ff5733]" />
                                )}
                                <span className="text-xs opacity-75">{msg.type === "user" ? "You" : "AI Partner"}</span>
                              </div>
                              <p className="text-sm">{msg.message}</p>
                            </div>
                          </div>
                        ))}
                        <div ref={chatEndRef} />
                      </div>
                      <div className="flex space-x-2">
                        <Input
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder="Ask about algorithms, hints, or debugging help..."
                          className="flex-1 bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                          onKeyPress={(e) => e.key === "Enter" && !isLoadingChat && handleSendMessage(false)}
                          disabled={isLoadingChat}
                        />
                        <Button
                          onClick={() => handleSendMessage(false)}
                          className="bg-[#ff5733] hover:bg-[#ff5733]/80 text-white"
                          disabled={isLoadingChat}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="text-center">
                  <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
                  <h2 className="text-3xl font-heading font-bold text-white mb-2">Interview Complete!</h2>
                  <p className="text-gray-300">Congratulations! Here's your comprehensive performance analysis</p>
                </div>

                {/* Performance Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <Card className="bg-gray-900/50 border-gray-700 glass-effect text-center">
                    <CardContent className="p-6">
                      <Clock className="h-8 w-8 text-[#ff5733] mx-auto mb-3" />
                      <div className="text-2xl font-bold text-white mb-1">{formatTime(elapsedTime)}</div>
                      <div className="text-gray-400 text-sm">Time Taken</div>
                      <div className="text-green-400 text-xs mt-2">
                        {elapsedTime < 900 ? "Excellent pace" : "Good pace"}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-900/50 border-gray-700 glass-effect text-center">
                    <CardContent className="p-6">
                      <Target className="h-8 w-8 text-[#ff5733] mx-auto mb-3" />
                      <div className="text-2xl font-bold text-white mb-1">{calculateCodeQuality().score}%</div>
                      <div className="text-gray-400 text-sm">Code Quality</div>
                      <div className="text-green-400 text-xs mt-2">{calculateCodeQuality().label}</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-900/50 border-gray-700 glass-effect text-center">
                    <CardContent className="p-6">
                      <MessageSquare className="h-8 w-8 text-[#ff5733] mx-auto mb-3" />
                      <div className="text-2xl font-bold text-white mb-1">
                        {interviewerMessages.filter((m) => m.type === "user").length > 3 ? "A+" : "B+"}
                      </div>
                      <div className="text-gray-400 text-sm">Communication</div>
                      <div className="text-green-400 text-xs mt-2">Good engagement</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-900/50 border-gray-700 glass-effect text-center">
                    <CardContent className="p-6">
                      <TrendingUp className="h-8 w-8 text-[#ff5733] mx-auto mb-3" />
                      <div className="text-2xl font-bold text-white mb-1">{testSummary.passRate}%</div>
                      <div className="text-gray-400 text-sm">Test Pass Rate</div>
                      <div className="text-green-400 text-xs mt-2">
                        {testSummary.passed}/{testSummary.total} tests passed
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Detailed Feedback */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <Card className="bg-gray-900/50 border-gray-700 glass-effect">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center space-x-2">
                        <CheckCircle className="h-5 w-5 text-green-400" />
                        <span>Strengths</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3 text-gray-300">
                        {testSummary.passRate === 100 && (
                          <li className="flex items-start space-x-2">
                            <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                            <span>All test cases passed successfully</span>
                          </li>
                        )}
                        {(code.includes("Map") || code.includes("{}")) && (
                          <li className="flex items-start space-x-2">
                            <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                            <span>Used optimal O(n) solution with hash map</span>
                          </li>
                        )}
                        {elapsedTime < 900 && (
                          <li className="flex items-start space-x-2">
                            <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                            <span>Completed in excellent time</span>
                          </li>
                        )}
                        {interviewerMessages.filter((m) => m.type === "user").length > 2 && (
                          <li className="flex items-start space-x-2">
                            <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                            <span>Good communication with interviewer</span>
                          </li>
                        )}
                        {chatMessages.filter((m) => m.type === "user").length > 2 && (
                          <li className="flex items-start space-x-2">
                            <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                            <span>Effective use of AI coding partner</span>
                          </li>
                        )}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-900/50 border-gray-700 glass-effect">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center space-x-2">
                        <TrendingUp className="h-5 w-5 text-[#ff5733]" />
                        <span>Areas for Improvement</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3 text-gray-300">
                        {testSummary.passRate < 100 && (
                          <li className="flex items-start space-x-2">
                            <div className="w-2 h-2 bg-[#ff5733] rounded-full mt-2 flex-shrink-0"></div>
                            <span>Some test cases failed - review edge cases</span>
                          </li>
                        )}
                        {!code.includes("Map") && !code.includes("{}") && (
                          <li className="flex items-start space-x-2">
                            <div className="w-2 h-2 bg-[#ff5733] rounded-full mt-2 flex-shrink-0"></div>
                            <span>Consider optimizing to O(n) time complexity using a hash map</span>
                          </li>
                        )}
                        {elapsedTime > 1200 && (
                          <li className="flex items-start space-x-2">
                            <div className="w-2 h-2 bg-[#ff5733] rounded-full mt-2 flex-shrink-0"></div>
                            <span>Try to complete solutions more quickly with practice</span>
                          </li>
                        )}
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-center space-x-4">
                  <Button onClick={resetInterview} className="bg-[#ff5733] hover:bg-[#ff5733]/80 text-white px-8 py-3">
                    Try Again
                  </Button>
                  <Button
                    variant="outline"
                    className="border-white text-white hover:bg-white hover:text-black bg-transparent px-8 py-3"
                    onClick={() => {
                      const report = {
                        problem: "Two Sum",
                        timeElapsed: elapsedTime,
                        testResults: testSummary,
                        code: code,
                      }
                      const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement("a")
                      a.href = url
                      a.download = "mockmate-interview-report.json"
                      a.click()
                    }}
                  >
                    Export Report (JSON)
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-black">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-heading font-bold text-white mb-6">Ready to Practice More?</h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Install MockMate in VS Code and access hundreds of interview problems with AI-powered guidance.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-[#ff5733] hover:bg-[#ff5733]/80 text-white px-8 py-4 text-lg">
              Install in VS Code
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-black px-8 py-4 text-lg bg-transparent"
            >
              View Documentation
            </Button>
          </div>
        </div>
      </section>

      {/* Demo Limit Dialog */}
      <AlertDialog open={showDemoLimitDialog} onOpenChange={setShowDemoLimitDialog}>
        <AlertDialogContent className="bg-gray-900 border-gray-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2 text-2xl">
              <AlertCircle className="h-6 w-6 text-[#ff5733]" />
              <span>Demo Already Used</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300 space-y-4">
              <p className="text-lg">
                You've already used your free demo session{demoUsedDate && ` on ${demoUsedDate}`}.
              </p>
              <p>
                To continue practicing with MockMate and access unlimited interview sessions, please sign up for an account or upgrade to a paid plan.
              </p>
              <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 mt-4">
                <h4 className="font-semibold text-white mb-2">What you'll get:</h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <span>Unlimited mock interview sessions</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <span>Access to 500+ coding problems</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <span>Personalized AI feedback and progress tracking</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <span>VS Code integration for seamless practice</span>
                  </li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-3">
            <AlertDialogAction
              className="bg-[#ff5733] hover:bg-[#ff5733]/80 text-white"
              onClick={() => {
                window.location.href = "/auth/login"
              }}
            >
              Sign Up / Login
            </AlertDialogAction>
            <Button
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
              onClick={() => setShowDemoLimitDialog(false)}
            >
              Maybe Later
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </main>
  )
}
