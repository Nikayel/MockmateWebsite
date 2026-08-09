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
import { Sparra } from "@/components/brand/Sparra"
import { AnimatedEllipsis } from "@/components/brand/AnimatedEllipsis"
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
  isGeneratingFeedback: boolean
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
  isGeneratingFeedback,
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
    <div className="mx-auto flex h-full max-w-7xl flex-col px-3 py-4 sm:px-4 sm:py-5 lg:px-6 lg:py-6">
      {/* Header - Apple-style clean design with responsive layout */}
      <div className="mb-4 flex-shrink-0 sm:mb-5 lg:mb-6">
        {/* Mobile: Stack vertically, Tablet+: Horizontal layout */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          {/* Left side: Title and status */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:gap-4">
            <h2 className="text-foreground text-lg font-semibold tracking-tight sm:text-xl">
              {debriefPhase === "technical" ? "Technical Debrief" : "Wrap Up"}
            </h2>
            <div className="bg-muted/60 flex items-center gap-1.5 rounded-full px-2.5 py-1 sm:px-3 sm:py-1.5">
              {testSummary.passRate === 100 ? (
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500 sm:h-4 sm:w-4" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-amber-500 sm:h-4 sm:w-4" />
              )}
              <span className="text-muted-foreground text-xs font-medium sm:text-sm">
                {testSummary.passed}/{testSummary.total} tests
              </span>
            </div>
            {testSummary.passRate < 100 && (
              <Button
                onClick={() => setShowPostInterviewDiscussion(false)}
                variant="ghost"
                size="sm"
                className="h-8 min-h-[44px] min-w-[44px] rounded-full px-3 text-xs font-medium text-amber-500 transition-colors hover:bg-amber-500/10 hover:text-amber-400 sm:min-h-0 sm:min-w-0"
              >
                <Code className="mr-1.5 h-3 w-3" />
                <span className="xs:inline hidden">Continue Editing</span>
                <span className="xs:hidden">Edit</span>
              </Button>
            )}
          </div>
          {/* Right side: Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              onClick={proceedToFinalFeedback}
              loading={isGeneratingFeedback}
              disabled={isGeneratingFeedback}
              size="sm"
              className="bg-card text-foreground hover:bg-muted h-10 min-h-[44px] flex-1 rounded-full px-4 text-xs font-semibold shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.98] sm:h-11 sm:flex-none sm:px-5 sm:text-sm lg:px-6"
            >
              <span className="hidden sm:inline">See Full Interview Score</span>
              <span className="sm:hidden">View Score</span>
              <ArrowRight className="ml-1.5 h-3.5 w-3.5 sm:ml-2 sm:h-4 sm:w-4" />
            </Button>
            {onClose && (
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:bg-muted hover:text-foreground h-10 min-h-[44px] w-10 min-w-[44px] rounded-full p-0 transition-colors sm:h-10 sm:w-10"
              >
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
        <p className="text-muted-foreground mt-2 text-xs font-medium sm:text-sm">
          {debriefPhase === "technical"
            ? "Discuss your solution, complexity trade-offs, and alternatives."
            : "Any final questions before viewing your feedback?"}
        </p>
      </div>

      {/* Main Content - Two Column Layout
          Research-backed breakpoints:
          - Mobile (<768px): Single column, stacked
          - Tablet/Laptop (768px+): Two columns side by side
          - Desktop (1024px+): Two columns with more spacing
      */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:gap-5">
        {/* Left Column: Code & Test Results */}
        <div className="flex min-h-0 flex-col">
          <Card className="border-border bg-card/80 flex min-h-0 flex-1 flex-col">
            <CardHeader
              className="border-border hover:bg-muted/50 min-h-[44px] flex-shrink-0 cursor-pointer border-b px-3 py-2 transition-colors sm:px-4 sm:py-2.5 lg:px-6"
              onClick={() => setShowCodeInDiscussion(!showCodeInDiscussion)}
            >
              <CardTitle className="text-foreground flex items-center justify-between text-xs sm:text-sm">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <Code className="text-muted-foreground h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Your Solution</span>
                  <Badge
                    variant="outline"
                    className="border-border text-muted-foreground text-[10px] sm:text-xs"
                  >
                    {selectedLanguage}
                  </Badge>
                  {/* Complexity metrics - hidden on mobile, shown on tablet+ */}
                  {efficiencyMetrics && efficiencyMetrics.estimatedTimeComplexity !== "Unknown" && (
                    <span className="hidden items-center gap-1.5 sm:flex">
                      <span className="text-muted-foreground">·</span>
                      <span className="text-muted-foreground text-xs">
                        {efficiencyMetrics.estimatedTimeComplexity} time
                      </span>
                      {efficiencyMetrics.estimatedSpaceComplexity !== "Unknown" && (
                        <>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-muted-foreground text-xs">
                            {efficiencyMetrics.estimatedSpaceComplexity} space
                          </span>
                        </>
                      )}
                    </span>
                  )}
                </div>
                {showCodeInDiscussion ? (
                  <ChevronUp className="text-muted-foreground h-4 w-4 flex-shrink-0" />
                ) : (
                  <ChevronDown className="text-muted-foreground h-4 w-4 flex-shrink-0" />
                )}
              </CardTitle>
            </CardHeader>
            {showCodeInDiscussion && (
              <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
                {/* Code Editor */}
                <div className="min-h-0 flex-1 overflow-auto">
                  <CodeEditor height="100%" language={selectedLanguage} value={code} readOnly />
                </div>
                {/* Test Results - Responsive height based on screen size */}
                {testResults.length > 0 && (
                  <div className="border-border max-h-24 flex-shrink-0 overflow-y-auto border-t p-2 sm:max-h-28 sm:p-3 lg:max-h-32">
                    <div className="space-y-1">
                      {testResults.map((result, index) => (
                        <div
                          key={index}
                          className={`flex items-center gap-2 rounded px-2 py-1.5 text-xs ${
                            result.passed
                              ? "bg-emerald-900/20 text-emerald-400"
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
          <Card className="border-border bg-card/80 flex min-h-0 flex-1 flex-col overflow-hidden">
            <CardHeader className="border-border min-h-[44px] flex-shrink-0 border-b px-3 py-2 sm:px-4 sm:py-2.5 lg:px-6">
              <CardTitle className="text-foreground flex items-center justify-between text-xs sm:text-sm">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <MessageSquare className="text-muted-foreground h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Discussion</span>
                </div>
                <Badge
                  variant="outline"
                  className="border-border text-muted-foreground text-[10px] sm:text-xs"
                >
                  {interviewerMessages.filter((m) => m.type === "user").length} messages
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
              {/* Chat Messages
                  UX Research (Baymard Institute, NN/g):
                  - Optimal line length: 50-75 characters for readability
                  - Mobile: 30-50 characters per line
                  - Max-width capped at 32rem (~512px) for readable line lengths
                  - Spacing scales with screen size for visual hierarchy
              */}
              <div className="relative min-h-0 flex-1">
                <div
                  ref={chatContainerRef}
                  onScroll={handleScroll}
                  className="absolute inset-0 space-y-2 overflow-y-auto p-2 sm:space-y-3 sm:p-3 lg:space-y-4 lg:p-4"
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
                      {/* Message bubble: max-w-[85%] on mobile for space efficiency,
                          capped at 32rem (512px) on larger screens for optimal ~60-70 char line length */}
                      <div
                        className={`max-w-[85%] rounded-lg px-3 py-2 sm:max-w-[75%] sm:px-3.5 sm:py-2.5 md:max-w-[32rem] ${
                          msg.type === "user"
                            ? "bg-card text-foreground"
                            : "bg-muted text-foreground"
                        }`}
                      >
                        <div className="mb-1 flex items-center gap-1.5">
                          <User className="h-3 w-3 opacity-50" />
                          <span className="text-[11px] font-medium opacity-60 sm:text-xs">
                            {msg.type === "user" ? "You" : "Interviewer"}
                          </span>
                        </div>
                        <FormattedText className="text-[13px] leading-relaxed sm:text-sm">
                          {msg.message}
                        </FormattedText>
                      </div>
                    </div>
                  ))}
                  {/* Typing Indicator */}
                  {(isLoadingInterviewer || isGeneratingDiscussion) && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Sparra state="thinking" size={20} />
                          <span className="text-muted-foreground text-xs">
                            CodeSparring AI is thinking
                            <AnimatedEllipsis />
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
                    className="border-border bg-muted text-muted-foreground hover:bg-muted hover:text-foreground absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors"
                    aria-label="Scroll to latest messages"
                  >
                    <ChevronDown className="h-3 w-3" />
                    {hasNewMessages ? "New" : "Latest"}
                  </button>
                )}
              </div>

              {/* Chat Input - Touch targets meet Apple HIG 44x44 minimum */}
              <div className="border-border flex-shrink-0 border-t p-2 sm:p-3">
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
                      className="border-border bg-muted text-foreground placeholder-muted-foreground h-11 flex-1 text-sm"
                      onKeyDown={(e) =>
                        e.key === "Enter" && !isLoadingInterviewer && handleSendMessage(true)
                      }
                      disabled={isLoadingInterviewer || isGeneratingDiscussion}
                      aria-label="Chat with interviewer"
                    />
                    {/* Send button: 44x44 minimum touch target per Apple HIG */}
                    <Button
                      onClick={() => handleSendMessage(true)}
                      size="sm"
                      className="bg-card text-foreground hover:bg-muted h-11 min-h-[44px] min-w-[44px] px-3"
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
