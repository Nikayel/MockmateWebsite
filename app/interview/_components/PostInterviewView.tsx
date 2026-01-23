"use client"

import { RefObject, useRef, useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Code,
  CheckCircle,
  XCircle,
  Brain,
  User,
  Send,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  X,
  MessageSquare,
  Clock,
  Zap,
} from "lucide-react"
import { FormattedText } from "@/components/ui/FormattedText"
import nextDynamic from "next/dynamic"

const VoiceModeToggle = nextDynamic(
  () => import("@/components/interview").then((mod) => ({ default: mod.VoiceModeToggle })),
  { ssr: false }
)

const CodeEditor = nextDynamic(
  () => import("@/components/editor").then((mod) => mod.CodeMirrorEditor),
  { ssr: false }
)

/**
 * Smart Auto-Scroll Hook
 * Research-based UX: preserves user reading position when scrolled up,
 * auto-scrolls only when near bottom, shows new message indicator
 */
function useSmartScroll(dependencies: unknown[]) {
  const containerRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [hasNewMessages, setHasNewMessages] = useState(false)
  const userScrolledRef = useRef(false)
  const lastMessageCountRef = useRef(0)

  const SCROLL_THRESHOLD = 100

  const checkIfAtBottom = useCallback(() => {
    if (!containerRef.current) return true
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    return scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD
  }, [])

  const handleScroll = useCallback(() => {
    const atBottom = checkIfAtBottom()
    setIsAtBottom(atBottom)

    if (atBottom) {
      setHasNewMessages(false)
      userScrolledRef.current = false
    } else {
      userScrolledRef.current = true
    }
  }, [checkIfAtBottom])

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior, block: "end" })
      setHasNewMessages(false)
      userScrolledRef.current = false
      setIsAtBottom(true)
    }
  }, [])

  useEffect(() => {
    const messageCount = Array.isArray(dependencies[0]) ? dependencies[0].length : 0
    const hasNewContent = messageCount > lastMessageCountRef.current
    lastMessageCountRef.current = messageCount

    if (!containerRef.current) return

    if (isAtBottom || !userScrolledRef.current) {
      requestAnimationFrame(() => {
        scrollToBottom("smooth")
      })
    } else if (hasNewContent) {
      setHasNewMessages(true)
    }
  }, [dependencies, isAtBottom, scrollToBottom])

  return {
    containerRef,
    endRef,
    isAtBottom,
    hasNewMessages,
    scrollToBottom,
    handleScroll,
  }
}

// Rotating thinking messages for better UX
const THINKING_MESSAGES = [
  "Analyzing your solution",
  "Reviewing code patterns",
  "Formulating feedback",
  "Evaluating approach",
  "Preparing response",
  "Considering optimizations",
  "Connecting the dots",
]

interface ChatMessage {
  type: "user" | "ai"
  message: string
}

interface TestResult {
  description: string
  passed: boolean
  input: unknown
  expected: unknown
  actual: unknown
  error: string | null
}

interface EfficiencyMetrics {
  linesOfCode: number
  complexity: string
  estimatedTimeComplexity: string
  estimatedSpaceComplexity: string
  optimalTimeComplexity: string
  optimalSpaceComplexity: string
  efficiencyScore: number
}

interface TestSummary {
  total: number
  passed: number
  failed: number
  passRate: number
}

export interface PostInterviewViewProps {
  testSummary: TestSummary
  efficiencyMetrics: EfficiencyMetrics | null
  code: string
  selectedLanguage: string
  testResults: TestResult[]
  interviewerMessages: ChatMessage[]
  isLoadingInterviewer: boolean
  isGeneratingDiscussion: boolean
  interviewerInput: string
  setInterviewerInput: (input: string) => void
  handleSendMessage: (isInterviewer: boolean) => void
  isRecordingInterviewer: boolean
  toggleVoiceRecording: (isInterviewer: boolean) => void
  /** @deprecated Internal smart scroll is now used instead */
  interviewerEndRef?: RefObject<HTMLDivElement | null>
  showCodeInDiscussion: boolean
  setShowCodeInDiscussion: (show: boolean) => void
  setShowPostInterviewDiscussion: (show: boolean) => void
  proceedToFinalFeedback: () => void
  onClose?: () => void
}

export function PostInterviewView({
  testSummary,
  efficiencyMetrics,
  code,
  selectedLanguage,
  testResults,
  interviewerMessages,
  isLoadingInterviewer,
  isGeneratingDiscussion,
  interviewerInput,
  setInterviewerInput,
  handleSendMessage,
  isRecordingInterviewer,
  toggleVoiceRecording,
  showCodeInDiscussion,
  setShowCodeInDiscussion,
  setShowPostInterviewDiscussion,
  proceedToFinalFeedback,
  onClose,
}: PostInterviewViewProps) {
  // Smart scroll for chat panel
  const {
    containerRef: chatContainerRef,
    endRef: chatEndRef,
    isAtBottom,
    hasNewMessages,
    scrollToBottom,
    handleScroll,
  } = useSmartScroll([interviewerMessages, isLoadingInterviewer, isGeneratingDiscussion])

  // Rotating thinking messages
  const [thinkingMessageIndex, setThinkingMessageIndex] = useState(0)

  useEffect(() => {
    if (isLoadingInterviewer || isGeneratingDiscussion) {
      setThinkingMessageIndex(Math.floor(Math.random() * THINKING_MESSAGES.length))
      const interval = setInterval(() => {
        setThinkingMessageIndex((prev) => (prev + 1) % THINKING_MESSAGES.length)
      }, 2500)
      return () => clearInterval(interval)
    }
  }, [isLoadingInterviewer, isGeneratingDiscussion])

  // Auto-scroll when AI starts responding
  useEffect(() => {
    if (isLoadingInterviewer || isGeneratingDiscussion) {
      scrollToBottom("smooth")
    }
  }, [isLoadingInterviewer, isGeneratingDiscussion, scrollToBottom])

  // Determine debrief phase based on message count
  const debriefPhase = interviewerMessages.length <= 2 ? "technical" : "wrapup"

  return (
    <div className="mx-auto flex h-full max-w-7xl flex-col px-4 py-6">
      {/* Header Section - FAANG-style Debrief */}
      <div className="mb-4 flex-shrink-0">
        {onClose && (
          <div className="mb-3 flex justify-end">
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:bg-gray-800 hover:text-white"
            >
              <X className="mr-2 h-4 w-4" />
              Close & Return to Dashboard
            </Button>
          </div>
        )}
        <div className="text-center">
          {/* Status indicator - subtle, not celebratory */}
          <div className="mb-3 flex items-center justify-center gap-2">
            {testSummary.passRate === 100 ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-yellow-500" />
            )}
            <span className="text-sm font-medium text-gray-300">
              {testSummary.passed}/{testSummary.total} tests passed
            </span>
          </div>

          {/* Main header - Debrief focused */}
          <h2 className="font-heading mb-2 text-xl font-bold text-white">
            {debriefPhase === "technical" ? "Technical Debrief" : "Wrapping Up"}
          </h2>
          <p className="mb-3 text-sm text-gray-400">
            {debriefPhase === "technical"
              ? "Let's discuss your solution - complexity, trade-offs, and alternatives."
              : "Any final questions before we wrap up?"}
          </p>

          {/* Action buttons - Continue editing if tests failed */}
          {testSummary.passRate < 100 && (
            <div className="mb-3">
              <Button
                onClick={() => setShowPostInterviewDiscussion(false)}
                variant="outline"
                size="sm"
                className="border-yellow-600 text-yellow-500 hover:bg-yellow-600/10"
              >
                <Code className="mr-1.5 h-3.5 w-3.5" />
                Continue Editing
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Left Column: Code & Test Results */}
        <div className="flex min-h-0 flex-col">
          <Card className="glass-effect flex min-h-0 flex-1 flex-col border-gray-700 bg-gray-900/50">
            <CardHeader
              className="flex-shrink-0 cursor-pointer py-3 transition-colors hover:bg-gray-800/50"
              onClick={() => setShowCodeInDiscussion(!showCodeInDiscussion)}
            >
              <CardTitle className="flex items-center justify-between text-sm text-white">
                <div className="flex items-center space-x-2">
                  <Code className="text-accent h-4 w-4" />
                  <span>Your Solution</span>
                  <Badge variant="outline" className="border-gray-600 text-xs text-gray-400">
                    {selectedLanguage}
                  </Badge>
                </div>
                {showCodeInDiscussion ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </CardTitle>
            </CardHeader>
            {showCodeInDiscussion && (
              <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden pb-3">
                {/* Efficiency Metrics - Compact inline display */}
                {efficiencyMetrics && (
                  <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-gray-700/50 bg-gray-800/30 px-3 py-2">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Clock className="h-3 w-3" />
                      <span>Time: {efficiencyMetrics.estimatedTimeComplexity}</span>
                    </div>
                    <div className="h-3 w-px bg-gray-700" />
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Zap className="h-3 w-3" />
                      <span>Space: {efficiencyMetrics.estimatedSpaceComplexity}</span>
                    </div>
                    <div className="h-3 w-px bg-gray-700" />
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <span>{efficiencyMetrics.linesOfCode} lines</span>
                    </div>
                  </div>
                )}
                {/* Scrollable Code Editor Container */}
                <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-gray-700">
                  <CodeEditor height="100%" language={selectedLanguage} value={code} readOnly />
                </div>
                {/* Test Results - Scrollable */}
                {testResults.length > 0 && (
                  <div className="mt-3 max-h-32 flex-shrink-0 overflow-y-auto">
                    <h4 className="mb-2 text-xs font-semibold text-white">Test Results:</h4>
                    <div className="space-y-1.5">
                      {testResults.map((result, index) => (
                        <div
                          key={index}
                          className={`rounded border px-2 py-1.5 ${
                            result.passed
                              ? "border-green-700 bg-green-900/20"
                              : "border-red-700 bg-red-900/20"
                          }`}
                        >
                          <span
                            className={`text-xs ${result.passed ? "text-green-400" : "text-red-400"}`}
                          >
                            {result.passed ? "✓" : "✗"} {result.description}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </div>

        {/* Right Column: Discussion Panel */}
        <div className="flex min-h-0 flex-col">
          <Card className="glass-effect flex min-h-0 flex-1 flex-col overflow-hidden border-gray-700 bg-gray-900/50">
            <CardHeader className="flex-shrink-0 py-3">
              <CardTitle className="flex items-center justify-between text-sm text-white">
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <MessageSquare className="text-accent h-4 w-4" />
                  </div>
                  <span className="font-semibold text-white">
                    {debriefPhase === "technical" ? "Technical Discussion" : "Final Questions"}
                  </span>
                </div>
                {/* Phase indicator */}
                <Badge
                  variant="outline"
                  className="border-gray-600 text-xs text-gray-400"
                >
                  {debriefPhase === "technical" ? "Debrief" : "Wrap-up"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 pt-0">
              {/* Chat Messages with Smart Scroll */}
              <div className="relative mb-3 min-h-0 flex-1">
                <div
                  ref={chatContainerRef}
                  onScroll={handleScroll}
                  className="absolute inset-0 space-y-3 overflow-y-auto scroll-smooth pr-2"
                  role="log"
                  aria-label="Post-interview discussion messages"
                  aria-live="polite"
                  aria-relevant="additions"
                >
                  {interviewerMessages.map((msg, index) => (
                    <div
                      key={`msg-${msg.type}-${index}`}
                      className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[90%] rounded-lg p-2.5 ${
                          msg.type === "user"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-800 text-gray-100"
                        }`}
                      >
                        <div className="mb-1 flex items-center space-x-1.5">
                          {msg.type === "user" ? (
                            <User className="h-3.5 w-3.5" />
                          ) : (
                            <Brain className="text-accent animate-neural-pulse h-3.5 w-3.5" />
                          )}
                          <span className="text-xs font-medium opacity-80">
                            {msg.type === "user" ? "You" : "CodeSparring AI"}
                          </span>
                        </div>
                        <FormattedText className="text-sm leading-relaxed">
                          {msg.message}
                        </FormattedText>
                      </div>
                    </div>
                  ))}
                  {/* Thinking Indicator with Rotating Messages */}
                  {(isLoadingInterviewer || isGeneratingDiscussion) && (
                    <div className="flex justify-start">
                      <div className="max-w-[90%] rounded-lg border border-gray-700/50 bg-gray-800/50 p-2.5 text-gray-400">
                        <div className="flex items-center space-x-2">
                          <Brain className="h-3.5 w-3.5 animate-pulse text-[#00d9ff]" />
                          <span className="text-sm">{THINKING_MESSAGES[thinkingMessageIndex]}</span>
                          <span className="flex space-x-0.5">
                            <span
                              className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#00d9ff]"
                              style={{ animationDelay: "0ms" }}
                            />
                            <span
                              className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#00d9ff]"
                              style={{ animationDelay: "150ms" }}
                            />
                            <span
                              className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#00d9ff]"
                              style={{ animationDelay: "300ms" }}
                            />
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                {/* Scroll to Bottom Button */}
                {(hasNewMessages || !isAtBottom) && interviewerMessages.length > 0 && (
                  <button
                    onClick={() => scrollToBottom("smooth")}
                    className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border border-gray-600 bg-gray-800/95 px-3 py-1.5 text-xs text-gray-300 shadow-lg backdrop-blur-sm transition-all hover:bg-gray-700 hover:text-white"
                    aria-label="Scroll to latest messages"
                  >
                    <ChevronDown className="h-3 w-3" />
                    {hasNewMessages ? "New messages" : "Scroll to bottom"}
                  </button>
                )}
              </div>

              {/* Chat Input */}
              <div className="flex-shrink-0 border-t border-gray-700 pt-3">
                <VoiceModeToggle
                  isRecording={isRecordingInterviewer}
                  onToggleRecording={() => toggleVoiceRecording(true)}
                  transcript={interviewerInput}
                  disabled={isLoadingInterviewer || isGeneratingDiscussion}
                  compact
                />
                {!isRecordingInterviewer && (
                  <div className="mt-2 flex space-x-2">
                    <Input
                      value={interviewerInput}
                      onChange={(e) => setInterviewerInput(e.target.value)}
                      placeholder="Ask about your solution..."
                      className="h-9 flex-1 border-gray-600 bg-gray-800 text-sm text-white placeholder-gray-400"
                      onKeyPress={(e) =>
                        e.key === "Enter" && !isLoadingInterviewer && handleSendMessage(true)
                      }
                      disabled={isLoadingInterviewer || isGeneratingDiscussion}
                      aria-label="Chat with interviewer"
                    />
                    <Button
                      onClick={() => handleSendMessage(true)}
                      className="h-9 bg-[#00d9ff] px-3 text-white hover:bg-[#00d9ff]/80"
                      disabled={
                        !interviewerInput.trim() || isLoadingInterviewer || isGeneratingDiscussion
                      }
                      aria-label="Send message"
                    >
                      {!(isLoadingInterviewer || isGeneratingDiscussion) ? (
                        <Send className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Button - Fixed at Bottom */}
      <div className="mt-4 flex flex-shrink-0 flex-col items-center gap-2">
        <Button
          onClick={proceedToFinalFeedback}
          className="bg-accent hover:bg-accent/80 text-accent-foreground px-8 py-2"
        >
          End Interview
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <p className="text-xs text-gray-500">
          You&apos;ll receive detailed feedback and performance analysis
        </p>
      </div>
    </div>
  )
}
