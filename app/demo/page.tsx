"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
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
  AlertCircle,
  Lightbulb,
  Target,
  TrendingUp,
  Send,
  Square,
} from "lucide-react"

export default function DemoPage() {
  const [currentPhase, setCurrentPhase] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [progress, setProgress] = useState(0)
  const [typedCode, setTypedCode] = useState("")
  const [currentHint, setCurrentHint] = useState(0)
  const [showFeedback, setShowFeedback] = useState(false)
  const [chatMessages, setChatMessages] = useState([
    {
      type: "ai",
      message: "Hi! I'm your AI coding partner. Ask me anything about the problem or need help with your approach!",
    },
  ])
  const [chatInput, setChatInput] = useState("")

  const recordingPhases = [
    {
      title: "Problem Introduction",
      description: "AI interviewer presents the coding challenge",
      duration: 3000,
    },
    {
      title: "Initial Approach Discussion",
      description: "Discussing solution strategy with AI interviewer",
      duration: 4000,
    },
    {
      title: "Coding & Bug Fixing",
      description: "Writing code with AI coding partner assistance",
      duration: 8000,
    },
    {
      title: "Code Review & Optimization",
      description: "AI interviewer reviews and suggests improvements",
      duration: 4000,
    },
    {
      title: "Submission & Feedback",
      description: "Final submission and comprehensive feedback",
      duration: 2000,
    },
  ]

  const buggyCode = `function twoSum(nums, target) {
    for (let i = 0; i < nums.length; i++) {
        for (let j = i + 1; j < nums.length; j++) {
            if (nums[i] + nums[j] == target) {
                return [i, j];
            }
        }
    }
    return null; // Bug: should return []
}`

  const fixedCode = `function twoSum(nums, target) {
    const map = new Map();
    
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        
        if (map.has(complement)) {
            return [map.get(complement), i];
        }
        
        map.set(nums[i], i);
    }
    
    return []; // Fixed: proper return value
}`

  const interviewerMessages = [
    { type: "ai", message: "Let's work on the Two Sum problem. Can you walk me through your initial approach?" },
    { type: "user", message: "I'll use a nested loop to check all pairs of numbers." },
    { type: "ai", message: "That's a valid brute force approach. What's the time complexity?" },
    { type: "user", message: "O(n²) time complexity, O(1) space." },
    {
      type: "ai",
      message: "Correct! Now let's see your implementation. I notice a small issue in your return statement...",
    },
  ]

  const codingPartnerHints = [
    "💡 Consider using a hash map for O(n) solution",
    "🐛 Check your return value - should be [] not null",
    "⚡ Great optimization! Much better time complexity",
    "✅ Perfect! Clean and efficient solution",
  ]

  const handleSendMessage = () => {
    if (chatInput.trim()) {
      setChatMessages((prev) => [...prev, { type: "user", message: chatInput }])

      // Simulate AI response
      setTimeout(() => {
        const responses = [
          "Great question! For the Two Sum problem, using a hash map can reduce time complexity from O(n²) to O(n).",
          "That's a good approach! Remember to handle edge cases like empty arrays or no valid pairs.",
          "Nice thinking! The complement approach is key: for each number, check if (target - number) exists in your map.",
          "Excellent! Don't forget to return the indices, not the values themselves.",
          "Good observation! Using === instead of == is better for strict equality checking.",
        ]
        const randomResponse = responses[Math.floor(Math.random() * responses.length)]
        setChatMessages((prev) => [...prev, { type: "ai", message: randomResponse }])
      }, 1000)

      setChatInput("")
    }
  }

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRecording) {
      interval = setInterval(
        () => {
          setProgress((prev) => {
            if (prev >= 100) {
              if (currentPhase < recordingPhases.length - 1) {
                setCurrentPhase(currentPhase + 1)
                return 0
              } else {
                setIsRecording(false)
                setShowFeedback(true)
                return 100
              }
            }
            return prev + 2
          })
        },
        recordingPhases[currentPhase]?.duration / 50 || 100,
      )
    }
    return () => clearInterval(interval)
  }, [isRecording, currentPhase])

  useEffect(() => {
    if (currentPhase === 2 && isRecording) {
      let i = 0
      const codeToType = currentPhase === 2 && progress > 50 ? fixedCode : buggyCode
      const timer = setInterval(() => {
        if (i < codeToType.length) {
          setTypedCode(codeToType.slice(0, i + 1))
          i++
        } else {
          clearInterval(timer)
          if (progress > 50 && currentHint < codingPartnerHints.length - 1) {
            setTimeout(() => setCurrentHint((prev) => prev + 1), 1000)
          }
        }
      }, 30)
      return () => clearInterval(timer)
    }
  }, [currentPhase, isRecording, progress])

  const resetRecording = () => {
    setCurrentPhase(0)
    setProgress(0)
    setIsRecording(false)
    setTypedCode("")
    setCurrentHint(0)
    setShowFeedback(false)
    setChatMessages([
      {
        type: "ai",
        message: "Hi! I'm your AI coding partner. Ask me anything about the problem or need help with your approach!",
      },
    ])
  }

  return (
    <main className="min-h-screen bg-black">
      <Header />

      {/* Hero Section */}
      <section className="pt-24 pb-12 bg-gradient-to-br from-black via-gray-900 to-black">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto text-center">
            <Badge className="bg-[#ff5733]/20 text-[#ff5733] border-[#ff5733]/30 mb-6">Live Trial Recording</Badge>
            <h1 className="text-4xl md:text-6xl font-heading font-bold text-white mb-6">
              MockMate Trial
              <span className="text-gradient"> Recording</span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Watch a realistic interview simulation with AI interviewer guidance, coding partner assistance, and
              comprehensive feedback analysis.
            </p>
          </div>
        </div>
      </section>

      {/* Trial Recording Interface */}
      <section className="py-16 bg-gradient-to-b from-gray-900 to-black">
        <div className="container mx-auto px-4">
          <div className="max-w-7xl mx-auto">
            {/* Recording Controls */}
            <div className="flex justify-center items-center space-x-4 mb-8">
              <Button
                onClick={() => setIsRecording(!isRecording)}
                className="bg-[#ff5733] hover:bg-[#ff5733]/80 text-white px-8 py-4 text-lg"
                disabled={showFeedback}
              >
                {isRecording ? <Pause className="mr-2 h-6 w-6" /> : <Play className="mr-2 h-6 w-6" />}
                {isRecording ? "Pause Recording" : "Start Trial Recording"}
              </Button>
              {isRecording && (
                <Button
                  onClick={() => setIsRecording(false)}
                  variant="outline"
                  className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white bg-transparent px-8 py-4 text-lg"
                >
                  <Square className="mr-2 h-6 w-6" />
                  Stop
                </Button>
              )}
              <Button
                onClick={resetRecording}
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-black bg-transparent px-8 py-4 text-lg"
              >
                <RotateCcw className="mr-2 h-6 w-6" />
                Reset
              </Button>
            </div>

            {/* Progress Indicator */}
            {!showFeedback && (
              <div className="mb-8">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white font-semibold text-lg">{recordingPhases[currentPhase]?.title}</span>
                  <span className="text-gray-400">
                    {isRecording ? `Phase ${currentPhase + 1} of ${recordingPhases.length}` : "Stopped"}
                  </span>
                </div>
                <Progress value={progress} className="h-3 bg-gray-800" />
                <p className="text-gray-300 mt-2">{recordingPhases[currentPhase]?.description}</p>
              </div>
            )}

            {/* Main Recording Interface */}
            {!showFeedback ? (
              <div className="grid grid-cols-12 gap-6 h-[600px]">
                {/* VS Code Interface - Main Area */}
                <div className="col-span-8">
                  <Card className="bg-gray-900/50 border-gray-700 glass-effect h-full">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-white flex items-center space-x-2">
                        <Code className="h-5 w-5 text-[#ff5733]" />
                        <span>VS Code - two-sum.js</span>
                        <div className="ml-auto flex items-center space-x-2">
                          {isRecording ? (
                            <>
                              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                              <span className="text-red-400 text-sm">RECORDING</span>
                            </>
                          ) : (
                            <>
                              <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                              <span className="text-gray-400 text-sm">STOPPED</span>
                            </>
                          )}
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="h-full pb-6">
                      <div className="bg-black rounded-lg p-4 h-full">
                        {/* VS Code Header */}
                        <div className="flex items-center space-x-2 mb-4 pb-2 border-b border-gray-700">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-gray-400 text-sm ml-4">two-sum.js</span>
                        </div>

                        {/* Code Content */}
                        {currentPhase >= 2 ? (
                          <div className="text-left">
                            <div className="text-gray-500 text-sm mb-2">
                              // Two Sum Problem - Finding optimal solution
                            </div>
                            <pre className="text-white font-mono text-sm leading-relaxed">
                              <code>
                                {typedCode}
                                {isRecording && <span className="animate-pulse text-[#ff5733]">|</span>}
                              </code>
                            </pre>
                            {currentPhase === 2 && progress > 30 && (
                              <div className="mt-4 p-2 bg-yellow-900/30 border border-yellow-600 rounded">
                                <div className="flex items-center space-x-2 text-yellow-400">
                                  <AlertCircle className="h-4 w-4" />
                                  <span className="text-sm">Potential optimization opportunity detected</span>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : currentPhase === 1 ? (
                          <div className="text-center py-20">
                            <MessageSquare className="h-16 w-16 text-[#ff5733] mx-auto mb-4 animate-pulse" />
                            <p className="text-white text-lg">Discussing approach with AI interviewer...</p>
                            <p className="text-gray-400 text-sm mt-2">Analyzing problem requirements</p>
                          </div>
                        ) : (
                          <div className="text-center py-20">
                            {isRecording ? (
                              <>
                                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#ff5733] mx-auto mb-4"></div>
                                <p className="text-white text-lg">MockMate AI initializing...</p>
                                <p className="text-gray-400 text-sm mt-2">Preparing interview environment</p>
                              </>
                            ) : (
                              <>
                                <Play className="h-16 w-16 text-[#ff5733] mx-auto mb-4" />
                                <p className="text-white text-lg">Ready to start interview</p>
                                <p className="text-gray-400 text-sm mt-2">Click "Start Trial Recording" to begin</p>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* AI Interviewer - Right Side */}
                <div className="col-span-4">
                  <Card className="bg-gray-900/50 border-gray-700 glass-effect h-full">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-white flex items-center space-x-2">
                        <Bot className="h-5 w-5 text-[#ff5733]" />
                        <span>AI Interviewer</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="h-full pb-6">
                      <div className="space-y-4 h-full overflow-y-auto">
                        {currentPhase >= 1 &&
                          interviewerMessages
                            .slice(0, Math.min(currentPhase + 1, interviewerMessages.length))
                            .map((msg, index) => (
                              <div key={index} className="space-y-2">
                                <div className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}>
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
                                    <p className="text-sm">{msg.message}</p>
                                  </div>
                                </div>
                              </div>
                            ))}

                        {currentPhase === 0 && (
                          <div className="text-center py-16 text-gray-400">
                            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Interview will begin when recording starts...</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* AI Coding Partner - Bottom */}
                <div className="col-span-12 mt-6">
                  <Card className="bg-gray-900/50 border-gray-700 glass-effect">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-white flex items-center space-x-2">
                        <Lightbulb className="h-5 w-5 text-[#ff5733]" />
                        <span>AI Coding Partner</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isRecording && currentPhase >= 2 ? (
                        <div className="flex items-center space-x-4 p-4 bg-gray-800/50 rounded-lg">
                          <Bot className="h-8 w-8 text-[#ff5733] flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-white font-medium">Real-time Assistance</p>
                            <p className="text-gray-300 text-sm mt-1">{codingPartnerHints[currentHint]}</p>
                          </div>
                          {progress > 50 && (
                            <div className="flex items-center space-x-2 text-green-400">
                              <CheckCircle className="h-5 w-5" />
                              <span className="text-sm">Optimization Applied</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Chat interface when not recording */
                        <div className="space-y-4">
                          <div className="h-64 overflow-y-auto space-y-3 p-4 bg-gray-800/30 rounded-lg">
                            {chatMessages.map((msg, index) => (
                              <div
                                key={index}
                                className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
                              >
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
                                    <span className="text-xs opacity-75">
                                      {msg.type === "user" ? "You" : "AI Partner"}
                                    </span>
                                  </div>
                                  <p className="text-sm">{msg.message}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="flex space-x-2">
                            <Input
                              value={chatInput}
                              onChange={(e) => setChatInput(e.target.value)}
                              placeholder="Ask me about algorithms, data structures, or coding approaches..."
                              className="flex-1 bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                            />
                            <Button
                              onClick={handleSendMessage}
                              className="bg-[#ff5733] hover:bg-[#ff5733]/80 text-white"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="text-center">
                  <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
                  <h2 className="text-3xl font-heading font-bold text-white mb-2">Interview Complete!</h2>
                  <p className="text-gray-300">Here's your comprehensive performance analysis</p>
                </div>

                {/* Performance Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <Card className="bg-gray-900/50 border-gray-700 glass-effect text-center">
                    <CardContent className="p-6">
                      <Clock className="h-8 w-8 text-[#ff5733] mx-auto mb-3" />
                      <div className="text-2xl font-bold text-white mb-1">12:34</div>
                      <div className="text-gray-400 text-sm">Time Taken</div>
                      <div className="text-green-400 text-xs mt-2">Excellent pace</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-900/50 border-gray-700 glass-effect text-center">
                    <CardContent className="p-6">
                      <Target className="h-8 w-8 text-[#ff5733] mx-auto mb-3" />
                      <div className="text-2xl font-bold text-white mb-1">92%</div>
                      <div className="text-gray-400 text-sm">Code Quality</div>
                      <div className="text-green-400 text-xs mt-2">Optimal solution</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-900/50 border-gray-700 glass-effect text-center">
                    <CardContent className="p-6">
                      <MessageSquare className="h-8 w-8 text-[#ff5733] mx-auto mb-3" />
                      <div className="text-2xl font-bold text-white mb-1">A+</div>
                      <div className="text-gray-400 text-sm">Communication</div>
                      <div className="text-green-400 text-xs mt-2">Clear explanations</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-900/50 border-gray-700 glass-effect text-center">
                    <CardContent className="p-6">
                      <TrendingUp className="h-8 w-8 text-[#ff5733] mx-auto mb-3" />
                      <div className="text-2xl font-bold text-white mb-1">95%</div>
                      <div className="text-gray-400 text-sm">Prompt Engineering</div>
                      <div className="text-green-400 text-xs mt-2">Excellent AI usage</div>
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
                        <li className="flex items-start space-x-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                          <span>Excellent optimization from O(n²) to O(n) solution</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                          <span>Clear communication of thought process</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                          <span>Effective use of AI coding partner suggestions</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                          <span>Quick bug identification and resolution</span>
                        </li>
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
                        <li className="flex items-start space-x-2">
                          <div className="w-2 h-2 bg-[#ff5733] rounded-full mt-2 flex-shrink-0"></div>
                          <span>Consider edge cases earlier in the process</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <div className="w-2 h-2 bg-[#ff5733] rounded-full mt-2 flex-shrink-0"></div>
                          <span>Add more comprehensive test cases</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <div className="w-2 h-2 bg-[#ff5733] rounded-full mt-2 flex-shrink-0"></div>
                          <span>Discuss space-time tradeoffs more explicitly</span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-center space-x-4">
                  <Button onClick={resetRecording} className="bg-[#ff5733] hover:bg-[#ff5733]/80 text-white px-8 py-3">
                    Try Another Problem
                  </Button>
                  <Button
                    variant="outline"
                    className="border-white text-white hover:bg-white hover:text-black bg-transparent px-8 py-3"
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
          <h2 className="text-3xl font-heading font-bold text-white mb-6">Ready to Start Your Interview Practice?</h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Install MockMate in VS Code and begin practicing with AI-powered interviews today.
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

      <Footer />
    </main>
  )
}
