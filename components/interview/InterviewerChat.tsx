"use client"

import { useRef, useEffect, useState } from "react"
import { Brain, User, MessageSquare, Send, Mic, MicOff } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useInterviewStore, type ChatMessage } from "@/lib/stores"

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
  inputValue: string
  onInputChange: (value: string) => void
}

export function InterviewerChat({
  onSendMessage,
  isRecording,
  onToggleRecording,
  inputValue,
  onInputChange,
}: InterviewerChatProps) {
  const chatEndRef = useRef<HTMLDivElement>(null)
  const {
    interviewerMessages,
    isInterviewStarted,
    showPostInterviewDiscussion,
    isLoadingInterviewer,
    isGeneratingDiscussion,
  } = useInterviewStore()

  // Rotating thinking message
  const [thinkingMessageIndex, setThinkingMessageIndex] = useState(0)

  // Rotate thinking messages every 2 seconds when AI is loading
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

  // Auto-scroll chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" })
    }
  }, [interviewerMessages])

  const handleSubmit = async () => {
    if (inputValue.trim() && !isLoadingInterviewer) {
      await onSendMessage(inputValue)
      onInputChange("")
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoadingInterviewer) {
      handleSubmit()
    }
  }

  return (
    <Card className="glass-effect flex h-full flex-col overflow-hidden border-gray-700 bg-gray-900/50">
      <CardHeader className="flex-shrink-0 pb-2">
        <CardTitle className="flex items-center space-x-2 text-sm text-white">
          <div className="relative">
            <Brain className="animate-neural-pulse h-4 w-4 text-[#00d9ff]" />
            <div className="absolute inset-0 rounded-full bg-[#00d9ff] opacity-30 blur-md"></div>
          </div>
          <span className="bg-gradient-to-r from-[#00d9ff] to-[#00ff88] bg-clip-text font-bold text-transparent">
            CodeSparring AI
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
        <div
          className="mb-2 min-h-0 flex-1 space-y-2 overflow-y-auto pr-2"
          role="log"
          aria-label="Interview chat messages"
          aria-live="polite"
          aria-relevant="additions"
        >
          {interviewerMessages.length === 0 ? (
            <div className="py-8 text-center text-gray-400">
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
                      msg.type === "user" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-100"
                    }`}
                  >
                    <div className="mb-1 flex items-center space-x-1">
                      {msg.type === "user" ? (
                        <User className="h-3 w-3" />
                      ) : (
                        <Brain className="animate-neural-pulse h-3 w-3 text-[#00d9ff]" />
                      )}
                      <span className="text-xs opacity-75">
                        {msg.type === "user" ? "You" : "CodeSparring AI"}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                  </div>
                </div>
              ))}
              {/* Thinking indicator - shows when AI is processing */}
              {(isLoadingInterviewer || isGeneratingDiscussion) && (
                <div className="flex justify-start">
                  <div className="max-w-[90%] rounded-lg border border-gray-700/50 bg-gray-800/50 p-2 text-gray-400">
                    <div className="flex items-center space-x-2">
                      <Brain className="h-3 w-3 animate-pulse text-[#00d9ff]" />
                      <span className="text-xs">
                        {SABLE_THINKING_MESSAGES[thinkingMessageIndex]}
                      </span>
                      <span className="flex space-x-0.5">
                        <span
                          className="h-1 w-1 animate-bounce rounded-full bg-[#00d9ff]"
                          style={{ animationDelay: "0ms" }}
                        />
                        <span
                          className="h-1 w-1 animate-bounce rounded-full bg-[#00d9ff]"
                          style={{ animationDelay: "150ms" }}
                        />
                        <span
                          className="h-1 w-1 animate-bounce rounded-full bg-[#00d9ff]"
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
        {(isInterviewStarted || showPostInterviewDiscussion) && (
          <div className="flex flex-shrink-0 space-x-1 border-t border-gray-700 pt-2">
            <Input
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder={
                isRecording
                  ? "Listening..."
                  : showPostInterviewDiscussion
                    ? "Ask about optimization or improvements..."
                    : "Ask a question..."
              }
              className="h-7 flex-1 border-gray-600 bg-gray-800 text-xs text-white placeholder-gray-400"
              onKeyPress={handleKeyPress}
              disabled={isLoadingInterviewer || isGeneratingDiscussion || isRecording}
              aria-label="Chat with interviewer"
            />
            <Button
              onClick={onToggleRecording}
              className={`h-7 px-2 ${
                isRecording
                  ? "animate-pulse bg-red-500 hover:bg-red-600"
                  : "bg-gray-700 hover:bg-gray-600"
              } text-white`}
              aria-label={isRecording ? "Stop recording" : "Start voice input"}
              disabled={isLoadingInterviewer || isGeneratingDiscussion}
            >
              {isRecording ? (
                <MicOff className="h-3 w-3" aria-hidden="true" />
              ) : (
                <Mic className="h-3 w-3" aria-hidden="true" />
              )}
            </Button>
            <Button
              onClick={handleSubmit}
              className="h-7 bg-[#00d9ff] px-2 text-white hover:bg-[#00d9ff]/80"
              disabled={isLoadingInterviewer || isGeneratingDiscussion}
              aria-label={
                isLoadingInterviewer || isGeneratingDiscussion ? "Sending message" : "Send message"
              }
            >
              {!(isLoadingInterviewer || isGeneratingDiscussion) && (
                <Send className="h-3 w-3" aria-hidden="true" />
              )}
              {(isLoadingInterviewer || isGeneratingDiscussion) && (
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
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
  inputValue: string
  onInputChange: (value: string) => void
}

export function AIChatPartner({
  onSendMessage,
  isRecording,
  onToggleRecording,
  inputValue,
  onInputChange,
}: AIChatPartnerProps) {
  const chatEndRef = useRef<HTMLDivElement>(null)
  const { chatMessages, isLoadingChat } = useInterviewStore()

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

  // Auto-scroll chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" })
    }
  }, [chatMessages])

  const handleSubmit = async () => {
    if (inputValue.trim() && !isLoadingChat) {
      await onSendMessage(inputValue)
      onInputChange("")
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoadingChat) {
      handleSubmit()
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col border-t border-gray-700 pt-2">
      <div className="mb-1 flex flex-shrink-0 items-center space-x-1">
        <Brain className="h-3 w-3 text-[#00d9ff]" />
        <span className="text-xs font-medium text-white">AI Partner</span>
      </div>
      <div className="mb-2 min-h-0 flex-1 space-y-1 overflow-y-auto rounded bg-gray-800/30 p-2">
        {chatMessages.map((msg, index) => (
          <div
            key={`chat-${msg.type}-${index}`}
            className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded p-1.5 text-xs ${
                msg.type === "user" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-100"
              }`}
            >
              <div className="mb-0.5 flex items-center space-x-1">
                {msg.type === "user" ? (
                  <User className="h-2.5 w-2.5" />
                ) : (
                  <Brain className="animate-neural-pulse h-2.5 w-2.5 text-[#00d9ff]" />
                )}
                <span className="text-xs opacity-75">
                  {msg.type === "user" ? "You" : "AI Partner"}
                </span>
              </div>
              <p className="text-xs leading-tight">{msg.message}</p>
            </div>
          </div>
        ))}
        {/* Thinking indicator for AI Partner */}
        {isLoadingChat && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded border border-gray-600/50 bg-gray-700/50 p-1.5 text-gray-400">
              <div className="flex items-center space-x-1.5">
                <Brain className="h-2.5 w-2.5 animate-pulse text-[#00d9ff]" />
                <span className="text-xs">{SABLE_THINKING_MESSAGES[thinkingMessageIndex]}</span>
                <span className="flex space-x-0.5">
                  <span
                    className="h-1 w-1 animate-bounce rounded-full bg-[#00d9ff]"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="h-1 w-1 animate-bounce rounded-full bg-[#00d9ff]"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="h-1 w-1 animate-bounce rounded-full bg-[#00d9ff]"
                    style={{ animationDelay: "300ms" }}
                  />
                </span>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      <div className="flex flex-shrink-0 space-x-1">
        <Input
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={isRecording ? "Listening..." : "Ask for help..."}
          className="h-7 flex-1 border-gray-600 bg-gray-800 text-xs text-white placeholder-gray-400"
          onKeyPress={handleKeyPress}
          disabled={isLoadingChat || isRecording}
          aria-label="Chat with AI partner"
        />
        <Button
          onClick={onToggleRecording}
          className={`h-7 px-2 ${
            isRecording
              ? "animate-pulse bg-red-500 hover:bg-red-600"
              : "bg-gray-700 hover:bg-gray-600"
          } text-white`}
          aria-label={isRecording ? "Stop recording" : "Start voice input"}
          disabled={isLoadingChat}
        >
          {isRecording ? (
            <MicOff className="h-3 w-3" aria-hidden="true" />
          ) : (
            <Mic className="h-3 w-3" aria-hidden="true" />
          )}
        </Button>
        <Button
          onClick={handleSubmit}
          className="h-7 bg-[#00d9ff] px-2 text-white hover:bg-[#00d9ff]/80"
          disabled={isLoadingChat}
          aria-label={isLoadingChat ? "Sending message" : "Send message"}
        >
          {!isLoadingChat && <Send className="h-3 w-3" aria-hidden="true" />}
          {isLoadingChat && (
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          )}
        </Button>
      </div>
    </div>
  )
}
