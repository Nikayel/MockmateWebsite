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
  User,
  Send,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  X,
  MessageSquare,
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
 * Preserves user reading position when scrolled up,
 * auto-scrolls only when near bottom
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
    if (containerRef.current) {
      // Use scrollTo on the container instead of scrollIntoView to prevent
      // the entire page from scrolling when the chat updates
      const { scrollHeight } = containerRef.current
      containerRef.current.scrollTo({
        top: scrollHeight,
        behavior,
      })
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
      {/* Header - Apple-style clean design */}
      <div className="mb-6 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold tracking-tight text-white">
              {debriefPhase === "technical" ? "Technical Debrief" : "Wrap Up"}
            </h2>
            <div className="flex items-center gap-1.5 rounded-full bg-zinc-800/60 px-3 py-1.5">
              {testSummary.passRate === 100 ? (
                <CheckCircle className="h-4 w-4 text-emerald-500" />
              ) : (
                <XCircle className="h-4 w-4 text-amber-500" />
              )}
              <span className="text-sm font-medium text-zinc-300">
                {testSummary.passed}/{testSummary.total} tests
              </span>
            </div>
            {testSummary.passRate < 100 && (
              <Button
                onClick={() => setShowPostInterviewDiscussion(false)}
                variant="ghost"
                size="sm"
                className="h-8 rounded-full px-3 text-xs font-medium text-amber-500 transition-colors hover:bg-amber-500/10 hover:text-amber-400"
              >
                <Code className="mr-1.5 h-3 w-3" />
                Continue Editing
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={proceedToFinalFeedback}
              size="sm"
              className="h-11 rounded-full bg-white px-6 text-sm font-semibold text-zinc-900 shadow-sm transition-all duration-200 hover:bg-zinc-50 hover:shadow-md active:scale-[0.98]"
            >
              See Full Interview Score
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            {onClose && (
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
                className="h-10 w-10 rounded-full p-0 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
        <p className="mt-2 text-sm font-medium text-zinc-500">
          {debriefPhase === "technical"
            ? "Discuss your solution, complexity trade-offs, and alternatives."
            : "Any final questions before viewing your feedback?"}
        </p>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Left Column: Code & Test Results */}
        <div className="flex min-h-0 flex-col">
          <Card className="flex min-h-0 flex-1 flex-col border-gray-800 bg-gray-900/80">
            <CardHeader
              className="flex-shrink-0 cursor-pointer border-b border-gray-800 py-2.5 transition-colors hover:bg-gray-800/50"
              onClick={() => setShowCodeInDiscussion(!showCodeInDiscussion)}
            >
              <CardTitle className="flex items-center justify-between text-sm text-white">
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4 text-gray-400" />
                  <span>Your Solution</span>
                  <Badge variant="outline" className="border-gray-700 text-xs text-gray-500">
                    {selectedLanguage}
                  </Badge>
                  {efficiencyMetrics && efficiencyMetrics.estimatedTimeComplexity !== "Unknown" && (
                    <>
                      <span className="text-gray-600">·</span>
                      <span className="text-xs text-gray-500">
                        {efficiencyMetrics.estimatedTimeComplexity} time
                      </span>
                      {efficiencyMetrics.estimatedSpaceComplexity !== "Unknown" && (
                        <>
                          <span className="text-gray-600">·</span>
                          <span className="text-xs text-gray-500">
                            {efficiencyMetrics.estimatedSpaceComplexity} space
                          </span>
                        </>
                      )}
                    </>
                  )}
                </div>
                {showCodeInDiscussion ? (
                  <ChevronUp className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                )}
              </CardTitle>
            </CardHeader>
            {showCodeInDiscussion && (
              <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
                {/* Code Editor */}
                <div className="min-h-0 flex-1 overflow-auto">
                  <CodeEditor height="100%" language={selectedLanguage} value={code} readOnly />
                </div>
                {/* Test Results - Compact */}
                {testResults.length > 0 && (
                  <div className="max-h-28 flex-shrink-0 overflow-y-auto border-t border-gray-800 p-3">
                    <div className="space-y-1">
                      {testResults.map((result, index) => (
                        <div
                          key={index}
                          className={`flex items-center gap-2 rounded px-2 py-1 text-xs ${
                            result.passed
                              ? "bg-green-900/20 text-green-400"
                              : "bg-red-900/20 text-red-400"
                          }`}
                        >
                          {result.passed ? (
                            <CheckCircle className="h-3 w-3 flex-shrink-0" />
                          ) : (
                            <XCircle className="h-3 w-3 flex-shrink-0" />
                          )}
                          <span className="truncate">{result.description}</span>
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
          <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border-gray-800 bg-gray-900/80">
            <CardHeader className="flex-shrink-0 border-b border-gray-800 py-2.5">
              <CardTitle className="flex items-center justify-between text-sm text-white">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-gray-400" />
                  <span>Discussion</span>
                </div>
                <Badge variant="outline" className="border-gray-700 text-xs text-gray-500">
                  {interviewerMessages.filter((m) => m.type === "user").length} messages
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
              {/* Chat Messages */}
              <div className="relative min-h-0 flex-1">
                <div
                  ref={chatContainerRef}
                  onScroll={handleScroll}
                  className="absolute inset-0 space-y-3 overflow-y-auto p-3"
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
                        className={`max-w-[85%] rounded-lg px-3 py-2 ${
                          msg.type === "user"
                            ? "bg-white text-gray-900"
                            : "bg-gray-800 text-gray-100"
                        }`}
                      >
                        <div className="mb-1 flex items-center gap-1.5">
                          <User className="h-3 w-3 opacity-50" />
                          <span className="text-xs font-medium opacity-60">
                            {msg.type === "user" ? "You" : "Interviewer"}
                          </span>
                        </div>
                        <FormattedText className="text-sm leading-relaxed">
                          {msg.message}
                        </FormattedText>
                      </div>
                    </div>
                  ))}
                  {/* Typing Indicator */}
                  {(isLoadingInterviewer || isGeneratingDiscussion) && (
                    <div className="flex justify-start">
                      <div className="rounded-lg bg-gray-800 px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-gray-500">Typing</span>
                          <span className="flex gap-0.5">
                            <span
                              className="h-1 w-1 animate-pulse rounded-full bg-gray-500"
                              style={{ animationDelay: "0ms" }}
                            />
                            <span
                              className="h-1 w-1 animate-pulse rounded-full bg-gray-500"
                              style={{ animationDelay: "150ms" }}
                            />
                            <span
                              className="h-1 w-1 animate-pulse rounded-full bg-gray-500"
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
                    className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border border-gray-700 bg-gray-800 px-2.5 py-1 text-xs text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
                    aria-label="Scroll to latest messages"
                  >
                    <ChevronDown className="h-3 w-3" />
                    {hasNewMessages ? "New" : "Latest"}
                  </button>
                )}
              </div>

              {/* Chat Input */}
              <div className="flex-shrink-0 border-t border-gray-800 p-3">
                <VoiceModeToggle
                  isRecording={isRecordingInterviewer}
                  onToggleRecording={() => toggleVoiceRecording(true)}
                  transcript={interviewerInput}
                  disabled={isLoadingInterviewer || isGeneratingDiscussion}
                  compact
                />
                {!isRecordingInterviewer && (
                  <div className="mt-2 flex gap-2">
                    <Input
                      value={interviewerInput}
                      onChange={(e) => setInterviewerInput(e.target.value)}
                      placeholder="Ask about your solution..."
                      className="h-9 flex-1 border-gray-700 bg-gray-800 text-sm text-white placeholder-gray-500"
                      onKeyDown={(e) =>
                        e.key === "Enter" && !isLoadingInterviewer && handleSendMessage(true)
                      }
                      disabled={isLoadingInterviewer || isGeneratingDiscussion}
                      aria-label="Chat with interviewer"
                    />
                    <Button
                      onClick={() => handleSendMessage(true)}
                      size="sm"
                      className="h-9 bg-white px-3 text-gray-900 hover:bg-gray-100"
                      disabled={
                        !interviewerInput.trim() || isLoadingInterviewer || isGeneratingDiscussion
                      }
                      aria-label="Send message"
                    >
                      <Send className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
