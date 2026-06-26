"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { Brain, User, MessageSquare, Send, Mic, Square, ChevronDown, ChevronUp } from "lucide-react"
import { useShallow } from "zustand/react/shallow"
import { FormattedText } from "@/components/ui/FormattedText"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useInterviewStore, type ChatMessage } from "@/lib/stores"
import { cn } from "@/lib/utils"

// Max height for message before showing "Show more" (in pixels, roughly 6 lines)
const MAX_MESSAGE_HEIGHT = 150
// Character threshold for potentially long messages
const LONG_MESSAGE_THRESHOLD = 400

/**
 * Smart Auto-Scroll Hook
 * Research-based UX implementation:
 * - Preserves user's reading position when scrolled up (respects user intent)
 * - Auto-scrolls only when user is near bottom (within threshold)
 * - Shows indicator for new messages when scrolled up
 * - Smooth scroll behavior for better UX
 *
 * Sources: NN/G Chat UX Guidelines, Slack/Discord scroll behavior patterns
 */
function useSmartScroll(dependencies: any[]) {
  const containerRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [hasNewMessages, setHasNewMessages] = useState(false)
  const userScrolledRef = useRef(false)
  const lastMessageCountRef = useRef(0)

  // Threshold in pixels - user is considered "at bottom" if within this distance
  const SCROLL_THRESHOLD = 100

  const checkIfAtBottom = useCallback(() => {
    if (!containerRef.current) return true
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    return scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD
  }, [])

  const handleScroll = useCallback(() => {
    const atBottom = checkIfAtBottom()
    setIsAtBottom(atBottom)

    // If user scrolled to bottom manually, clear new message indicator
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

  // Auto-scroll effect
  useEffect(() => {
    const messageCount = dependencies[0]?.length || 0
    const hasNewContent = messageCount > lastMessageCountRef.current
    lastMessageCountRef.current = messageCount

    if (!containerRef.current) return

    // Auto-scroll if user is at bottom or hasn't scrolled up
    if (isAtBottom || !userScrolledRef.current) {
      // Use requestAnimationFrame for smoother scroll after DOM update
      requestAnimationFrame(() => {
        scrollToBottom("smooth")
      })
    } else if (hasNewContent) {
      // User is scrolled up and there are new messages
      setHasNewMessages(true)
    }
  }, dependencies)

  return {
    containerRef,
    endRef,
    isAtBottom,
    hasNewMessages,
    scrollToBottom,
    handleScroll,
  }
}

/**
 * Collapsible Message Component
 * For long messages, shows truncated view with "Show more" button
 * Research: Users prefer collapsed long messages to reduce scrolling
 * Sources: Slack, Mattermost, Rich Web Chat patterns
 */
function CollapsibleMessage({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [needsCollapse, setNeedsCollapse] = useState(false)

  useEffect(() => {
    if (contentRef.current) {
      // Check if content exceeds max height
      setNeedsCollapse(contentRef.current.scrollHeight > MAX_MESSAGE_HEIGHT)
    }
  }, [children])

  return (
    <div className="relative">
      <div
        ref={contentRef}
        className={cn(
          "overflow-hidden transition-all duration-200",
          !isExpanded && needsCollapse && "max-h-[150px]",
          className
        )}
      >
        {children}
      </div>
      {needsCollapse && !isExpanded && (
        <div className="pointer-events-none absolute right-0 bottom-0 left-0 h-8 bg-gradient-to-t from-gray-800 to-transparent" />
      )}
      {needsCollapse && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-1 flex items-center gap-1 text-[10px] text-blue-400 transition-colors hover:text-blue-300"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-3 w-3" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              Show more
            </>
          )}
        </button>
      )}
    </div>
  )
}

// Sable thinking messages - creative status indicators like Claude Code
const SABLE_THINKING_MESSAGES = [
  "Sable is thinking",
  "Sable is analyzing your approach",
  "Sable is formulating a response",
  "Sable is considering the problem",
  "Sable is preparing feedback",
  "Sable is evaluating your solution",
  "Sable is crafting a hint",
  "Sable is reviewing your code",
  "Sable is pondering",
  "Sable is connecting the dots",
]

interface InterviewerChatProps {
  onSendMessage: (message: string) => Promise<void>
  isRecording: boolean
  onToggleRecording: () => void
  onStopRecording?: () => void // Separate stop that doesn't send
  inputValue: string
  onInputChange: (value: string) => void
}

export function InterviewerChat({
  onSendMessage,
  isRecording,
  onToggleRecording,
  onStopRecording,
  inputValue,
  onInputChange,
}: InterviewerChatProps) {
  const {
    interviewerMessages,
    isInterviewStarted,
    showPostInterviewDiscussion,
    isLoadingInterviewer,
    isGeneratingDiscussion,
  } = useInterviewStore(
    useShallow((state) => ({
      interviewerMessages: state.interviewerMessages,
      isInterviewStarted: state.isInterviewStarted,
      showPostInterviewDiscussion: state.showPostInterviewDiscussion,
      isLoadingInterviewer: state.isLoadingInterviewer,
      isGeneratingDiscussion: state.isGeneratingDiscussion,
    }))
  )

  // Smart auto-scroll with user scroll position tracking
  // Dependencies: messages, loading state, recording state (for STT updates)
  const {
    containerRef: chatContainerRef,
    endRef: chatEndRef,
    isAtBottom,
    hasNewMessages,
    scrollToBottom,
    handleScroll,
  } = useSmartScroll([
    interviewerMessages,
    isLoadingInterviewer,
    isGeneratingDiscussion,
    isRecording,
  ])

  // Rotating thinking message
  const [thinkingMessageIndex, setThinkingMessageIndex] = useState(0)

  // Rotate thinking messages every 2.5 seconds when AI is loading
  useEffect(() => {
    if (isLoadingInterviewer || isGeneratingDiscussion) {
      // Start with a random message
      setThinkingMessageIndex(Math.floor(Math.random() * SABLE_THINKING_MESSAGES.length))

      const interval = setInterval(() => {
        setThinkingMessageIndex((prev) => (prev + 1) % SABLE_THINKING_MESSAGES.length)
      }, 2500)

      return () => clearInterval(interval)
    }
  }, [isLoadingInterviewer, isGeneratingDiscussion])

  // Auto-scroll when AI starts/stops responding (loading state changes)
  useEffect(() => {
    if (isLoadingInterviewer || isGeneratingDiscussion) {
      // When AI starts responding, scroll to show the thinking indicator
      scrollToBottom("smooth")
    }
  }, [isLoadingInterviewer, isGeneratingDiscussion, scrollToBottom])

  const handleSubmit = async () => {
    if (inputValue.trim() && !isLoadingInterviewer) {
      const message = inputValue.trim()
      onInputChange("")
      await onSendMessage(message)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoadingInterviewer) {
      handleSubmit()
    }
  }

  return (
    <Card className="glass-effect flex h-full flex-col overflow-hidden border-border bg-card/50">
      <CardHeader className="flex-shrink-0 pb-2">
        <CardTitle className="flex items-center space-x-2 text-sm text-foreground">
          <div className="relative">
            <Brain className="animate-neural-pulse h-4 w-4 text-[#c4703f]" />
            <div className="absolute inset-0 rounded-full bg-[#c4703f] opacity-30 blur-md"></div>
          </div>
          <span className="bg-gradient-to-r from-[#c4703f] to-[#3fb883] bg-clip-text font-bold text-transparent">
            CodeSparring AI
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
        {/* Chat messages container with smart scroll */}
        <div className="relative mb-2 min-h-0 flex-1">
          <div
            ref={chatContainerRef}
            onScroll={handleScroll}
            className="absolute inset-0 space-y-2 overflow-y-auto scroll-smooth pr-2"
            role="log"
            aria-label="Interview chat messages"
            aria-live="polite"
            aria-relevant="additions"
          >
            {interviewerMessages.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <MessageSquare className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p className="text-xs">Interview will begin when you start...</p>
              </div>
            ) : (
              <>
                {interviewerMessages.map((msg, index) => (
                  <div
                    key={`msg-${msg.type}-${index}`}
                    className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[90%] rounded-lg p-2 ${
                        msg.type === "user" ? "bg-blue-600 text-white" : "bg-muted text-foreground"
                      }`}
                    >
                      <div className="mb-1 flex items-center space-x-1">
                        {msg.type === "user" ? (
                          <User className="h-3 w-3" />
                        ) : (
                          <Brain className="animate-neural-pulse h-3 w-3 text-[#c4703f]" />
                        )}
                        <span className="text-xs opacity-75">
                          {msg.type === "user" ? "You" : "CodeSparring AI"}
                        </span>
                      </div>
                      {/* Use CollapsibleMessage for long messages */}
                      {msg.message.length > LONG_MESSAGE_THRESHOLD ? (
                        <CollapsibleMessage>
                          <FormattedText className="text-xs leading-relaxed">
                            {msg.message}
                          </FormattedText>
                        </CollapsibleMessage>
                      ) : (
                        <FormattedText className="text-xs leading-relaxed">
                          {msg.message}
                        </FormattedText>
                      )}
                    </div>
                  </div>
                ))}
                {/* Thinking indicator - shows when AI is processing */}
                {(isLoadingInterviewer || isGeneratingDiscussion) && (
                  <div className="flex justify-start">
                    <div className="max-w-[90%] rounded-lg border border-border/50 bg-muted/50 p-2 text-muted-foreground">
                      <div className="flex items-center space-x-2">
                        <Brain className="h-3 w-3 animate-pulse text-[#c4703f]" />
                        <span className="text-xs">
                          {SABLE_THINKING_MESSAGES[thinkingMessageIndex]}
                        </span>
                        <span className="flex space-x-0.5">
                          <span
                            className="h-1 w-1 animate-bounce rounded-full bg-[#c4703f]"
                            style={{ animationDelay: "0ms" }}
                          />
                          <span
                            className="h-1 w-1 animate-bounce rounded-full bg-[#c4703f]"
                            style={{ animationDelay: "150ms" }}
                          />
                          <span
                            className="h-1 w-1 animate-bounce rounded-full bg-[#c4703f]"
                            style={{ animationDelay: "300ms" }}
                          />
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </>
            )}
          </div>
          {/* Scroll to bottom button - appears when user scrolls up and new messages arrive */}
          {(hasNewMessages || !isAtBottom) && interviewerMessages.length > 0 && (
            <button
              onClick={() => scrollToBottom("smooth")}
              className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border bg-muted/95 px-3 py-1.5 text-xs text-muted-foreground shadow-lg backdrop-blur-sm transition-all hover:bg-muted hover:text-foreground"
              aria-label="Scroll to latest messages"
            >
              <ChevronDown className="h-3 w-3" />
              {hasNewMessages ? "New messages" : "Scroll to bottom"}
            </button>
          )}
        </div>
        {(isInterviewStarted || showPostInterviewDiscussion) && (
          <div className="flex flex-shrink-0 space-x-1 border-t border-border pt-2">
            <Input
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder={
                isRecording
                  ? "Listening... click Send when ready"
                  : showPostInterviewDiscussion
                    ? "Ask about optimization or improvements..."
                    : "Ask a question..."
              }
              className="h-7 flex-1 border-border bg-muted text-xs text-foreground placeholder-gray-400"
              onKeyPress={handleKeyPress}
              disabled={isLoadingInterviewer || isGeneratingDiscussion}
              aria-label="Chat with interviewer"
            />
            {/* Mic button - shows Stop icon when recording */}
            <Button
              onClick={isRecording ? onStopRecording || onToggleRecording : onToggleRecording}
              className={cn(
                "h-7 px-2 text-foreground",
                isRecording ? "bg-red-500 hover:bg-red-600" : "bg-muted hover:bg-gray-600"
              )}
              aria-label={isRecording ? "Stop recording" : "Start voice input"}
              disabled={isLoadingInterviewer || isGeneratingDiscussion}
            >
              {isRecording ? (
                <Square className="h-3 w-3" aria-hidden="true" />
              ) : (
                <Mic className="h-3 w-3" aria-hidden="true" />
              )}
            </Button>
            {/* Send button - always visible, highlighted when recording with content */}
            <Button
              onClick={handleSubmit}
              className={cn(
                "h-7 px-2 text-foreground",
                isRecording && inputValue.trim()
                  ? "animate-pulse bg-green-500 hover:bg-green-600"
                  : "bg-[#c4703f] hover:bg-[#c4703f]/80"
              )}
              disabled={isLoadingInterviewer || isGeneratingDiscussion || !inputValue.trim()}
              aria-label={
                isLoadingInterviewer || isGeneratingDiscussion ? "Sending message" : "Send message"
              }
            >
              {!(isLoadingInterviewer || isGeneratingDiscussion) && (
                <Send className="h-3 w-3" aria-hidden="true" />
              )}
              {(isLoadingInterviewer || isGeneratingDiscussion) && (
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-border border-t-white" />
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Export a simplified version for the AI Partner chat
interface AIChatPartnerProps {
  onSendMessage: (message: string) => Promise<void>
  isRecording: boolean
  onToggleRecording: () => void
  onStopRecording?: () => void // Separate stop that doesn't send
  inputValue: string
  onInputChange: (value: string) => void
}

export function AIChatPartner({
  onSendMessage,
  isRecording,
  onToggleRecording,
  onStopRecording,
  inputValue,
  onInputChange,
}: AIChatPartnerProps) {
  const { chatMessages, isLoadingChat } = useInterviewStore(
    useShallow((state) => ({
      chatMessages: state.chatMessages,
      isLoadingChat: state.isLoadingChat,
    }))
  )

  // Smart auto-scroll with user scroll position tracking
  const {
    containerRef: chatContainerRef,
    endRef: chatEndRef,
    isAtBottom,
    hasNewMessages,
    scrollToBottom,
    handleScroll,
  } = useSmartScroll([chatMessages, isLoadingChat, isRecording])

  // Rotating thinking message
  const [thinkingMessageIndex, setThinkingMessageIndex] = useState(0)

  // Rotate thinking messages every 2.5 seconds when AI is loading
  useEffect(() => {
    if (isLoadingChat) {
      // Start with a random message
      setThinkingMessageIndex(Math.floor(Math.random() * SABLE_THINKING_MESSAGES.length))

      const interval = setInterval(() => {
        setThinkingMessageIndex((prev) => (prev + 1) % SABLE_THINKING_MESSAGES.length)
      }, 2500)

      return () => clearInterval(interval)
    }
  }, [isLoadingChat])

  // Auto-scroll when AI starts responding
  useEffect(() => {
    if (isLoadingChat) {
      scrollToBottom("smooth")
    }
  }, [isLoadingChat, scrollToBottom])

  const handleSubmit = async () => {
    if (inputValue.trim() && !isLoadingChat) {
      const message = inputValue.trim()
      onInputChange("")
      await onSendMessage(message)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoadingChat) {
      handleSubmit()
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col border-t border-border pt-2">
      <div className="mb-1 flex flex-shrink-0 items-center space-x-1">
        <Brain className="h-3 w-3 text-[#c4703f]" />
        <span className="text-xs font-medium text-foreground">AI Partner</span>
      </div>
      {/* Chat container with smart scroll */}
      <div className="relative mb-2 min-h-0 flex-1">
        <div
          ref={chatContainerRef}
          onScroll={handleScroll}
          className="absolute inset-0 space-y-1 overflow-y-auto scroll-smooth rounded bg-muted/30 p-2"
        >
          {chatMessages.map((msg, index) => (
            <div
              key={`chat-${msg.type}-${index}`}
              className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded p-1.5 text-xs ${
                  msg.type === "user" ? "bg-blue-600 text-white" : "bg-muted text-foreground"
                }`}
              >
                <div className="mb-0.5 flex items-center space-x-1">
                  {msg.type === "user" ? (
                    <User className="h-2.5 w-2.5" />
                  ) : (
                    <Brain className="animate-neural-pulse h-2.5 w-2.5 text-[#c4703f]" />
                  )}
                  <span className="text-xs opacity-75">
                    {msg.type === "user" ? "You" : "AI Partner"}
                  </span>
                </div>
                {/* Use CollapsibleMessage for long messages */}
                {msg.message.length > LONG_MESSAGE_THRESHOLD ? (
                  <CollapsibleMessage>
                    <FormattedText className="text-xs leading-tight">{msg.message}</FormattedText>
                  </CollapsibleMessage>
                ) : (
                  <FormattedText className="text-xs leading-tight">{msg.message}</FormattedText>
                )}
              </div>
            </div>
          ))}
          {/* Thinking indicator for AI Partner */}
          {isLoadingChat && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded border border-border/50 bg-muted/50 p-1.5 text-muted-foreground">
                <div className="flex items-center space-x-1.5">
                  <Brain className="h-2.5 w-2.5 animate-pulse text-[#c4703f]" />
                  <span className="text-xs">{SABLE_THINKING_MESSAGES[thinkingMessageIndex]}</span>
                  <span className="flex space-x-0.5">
                    <span
                      className="h-1 w-1 animate-bounce rounded-full bg-[#c4703f]"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="h-1 w-1 animate-bounce rounded-full bg-[#c4703f]"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="h-1 w-1 animate-bounce rounded-full bg-[#c4703f]"
                      style={{ animationDelay: "300ms" }}
                    />
                  </span>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        {/* Scroll to bottom button for AI Partner */}
        {(hasNewMessages || !isAtBottom) && chatMessages.length > 0 && (
          <button
            onClick={() => scrollToBottom("smooth")}
            className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border bg-muted/95 px-2 py-1 text-xs text-muted-foreground shadow-lg backdrop-blur-sm transition-all hover:bg-gray-600 hover:text-foreground"
            aria-label="Scroll to latest messages"
          >
            <ChevronDown className="h-2.5 w-2.5" />
            {hasNewMessages ? "New" : "Bottom"}
          </button>
        )}
      </div>
      <div className="flex flex-shrink-0 space-x-1">
        <Input
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={isRecording ? "Listening... click Send when ready" : "Ask for help..."}
          className="h-7 flex-1 border-border bg-muted text-xs text-foreground placeholder-gray-400"
          onKeyPress={handleKeyPress}
          disabled={isLoadingChat}
          aria-label="Chat with AI partner"
        />
        {/* Mic button - shows Stop icon when recording */}
        <Button
          onClick={isRecording ? onStopRecording || onToggleRecording : onToggleRecording}
          className={cn(
            "h-7 px-2 text-foreground",
            isRecording ? "bg-red-500 hover:bg-red-600" : "bg-muted hover:bg-gray-600"
          )}
          aria-label={isRecording ? "Stop recording" : "Start voice input"}
          disabled={isLoadingChat}
        >
          {isRecording ? (
            <Square className="h-3 w-3" aria-hidden="true" />
          ) : (
            <Mic className="h-3 w-3" aria-hidden="true" />
          )}
        </Button>
        {/* Send button - highlighted when recording with content */}
        <Button
          onClick={handleSubmit}
          className={cn(
            "h-7 px-2 text-foreground",
            isRecording && inputValue.trim()
              ? "animate-pulse bg-green-500 hover:bg-green-600"
              : "bg-[#c4703f] hover:bg-[#c4703f]/80"
          )}
          disabled={isLoadingChat || !inputValue.trim()}
          aria-label={isLoadingChat ? "Sending message" : "Send message"}
        >
          {!isLoadingChat && <Send className="h-3 w-3" aria-hidden="true" />}
          {isLoadingChat && (
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-border border-t-white" />
          )}
        </Button>
      </div>
    </div>
  )
}
