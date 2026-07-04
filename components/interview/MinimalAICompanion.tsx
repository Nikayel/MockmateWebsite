"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Bot,
  ChevronDown,
  ChevronUp,
  Send,
  Mic,
  MicOff,
  Minimize2,
  Maximize2,
  X,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * MinimalAICompanion - A compact, non-intrusive AI assistant panel
 *
 * Design philosophy:
 * - Minimal by default, expandable on demand
 * - AI is a tool, not a crutch - real interviews grade on YOUR understanding
 * - Compact floating design that doesn't distract from coding
 * - Quick access for hints without spamming the AI
 *
 * This simulates real Meta/Google AI-assisted interviews where:
 * - AI is optional and available
 * - You're graded on understanding, not AI usage frequency
 * - Code quality and your explanations matter most
 */

interface Message {
  type: "user" | "ai"
  message: string
  timestamp?: number
}

interface MinimalAICompanionProps {
  messages: Message[]
  onSendMessage: (message: string) => void
  isLoading?: boolean
  isRecording?: boolean
  onToggleRecording?: () => void
  className?: string
  disabled?: boolean
}

export function MinimalAICompanion({
  messages,
  onSendMessage,
  isLoading = false,
  isRecording = false,
  onToggleRecording,
  className,
  disabled = false,
}: MinimalAICompanionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [input, setInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isExpanded && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }
  }, [messages, isExpanded])

  const handleSend = () => {
    if (!input.trim() || isLoading || disabled) return
    onSendMessage(input.trim())
    setInput("")
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Fully minimized state - just a small floating button
  if (isMinimized) {
    return (
      <div className={cn("fixed right-4 bottom-4 z-50", className)}>
        <Button
          onClick={() => setIsMinimized(false)}
          className="bg-muted/90 hover:bg-muted border-border h-10 w-10 rounded-full border shadow-lg backdrop-blur-sm"
          title="Open AI Assistant"
        >
          <Bot className="h-5 w-5 text-[#c4703f]" />
        </Button>
        {messages.length > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#c4703f] text-[10px] font-medium text-white">
            {messages.length}
          </span>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "bg-card/95 border-border rounded-lg border shadow-xl backdrop-blur-sm transition-all duration-200",
        isExpanded ? "w-80" : "w-64",
        className
      )}
    >
      {/* Header - Always visible */}
      <div
        className="border-border hover:bg-muted/50 flex cursor-pointer items-center justify-between border-b px-3 py-2"
        onClick={() => !isExpanded && setIsExpanded(true)}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !isExpanded) {
            e.preventDefault()
            setIsExpanded(true)
          }
        }}
      >
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bot className="h-4 w-4 text-[#c4703f]" />
            <div className="absolute inset-0 rounded-full bg-[#c4703f] opacity-30 blur-sm" />
          </div>
          <span className="text-muted-foreground text-xs font-medium">AI Assistant</span>
          <span className="text-muted-foreground bg-muted rounded px-1.5 py-0.5 text-[10px]">
            optional
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
            className="text-muted-foreground hover:text-foreground h-5 w-5 p-0"
          >
            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              setIsMinimized(true)
            }}
            className="text-muted-foreground hover:text-foreground h-5 w-5 p-0"
          >
            <Minimize2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Collapsed Quick Actions */}
      {!isExpanded && (
        <div className="p-2">
          <div className="flex gap-1">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Quick question..."
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-7 flex-1 text-xs"
              onKeyPress={handleKeyPress}
              disabled={isLoading || disabled}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading || disabled}
              className="h-7 w-7 bg-[#c4703f] p-0 hover:bg-[#c4703f]/80"
            >
              <Send className="h-3 w-3" />
            </Button>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => setIsExpanded(true)}
              className="text-muted-foreground hover:text-muted-foreground mt-1 w-full text-center text-[10px]"
            >
              View {messages.length} message{messages.length !== 1 ? "s" : ""} ↑
            </button>
          )}
        </div>
      )}

      {/* Expanded Chat View */}
      {isExpanded && (
        <>
          {/* Reminder about AI usage */}
          <div className="bg-muted/50 border-border border-b px-3 py-1.5">
            <p className="text-muted-foreground flex items-center gap-1 text-[10px]">
              <Sparkles className="h-3 w-3 text-yellow-500" />
              <span>
                Use AI strategically. You're graded on{" "}
                <span className="text-foreground">understanding</span>, not AI usage.
              </span>
            </p>
          </div>

          {/* Messages */}
          <div className="h-48 space-y-2 overflow-y-auto p-2">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-4 text-center">
                <Bot className="text-muted-foreground mb-2 h-8 w-8" />
                <p className="text-muted-foreground text-xs">
                  Ask for hints, debugging help, or algorithm suggestions.
                </p>
                <p className="text-muted-foreground mt-1 text-[10px]">
                  Remember: explain your reasoning to the interviewer!
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={cn("flex", msg.type === "user" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-lg px-2.5 py-1.5 text-xs",
                      msg.type === "user" ? "bg-blue-600 text-white" : "bg-muted text-foreground"
                    )}
                  >
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-border border-t p-2">
            <div className="flex gap-1">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isRecording ? "Listening..." : "Ask for help..."}
                className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-7 flex-1 text-xs"
                onKeyPress={handleKeyPress}
                disabled={isLoading || disabled || isRecording}
              />
              {onToggleRecording && (
                <Button
                  onClick={onToggleRecording}
                  disabled={isLoading || disabled}
                  className={cn(
                    "h-7 w-7 p-0",
                    isRecording
                      ? "animate-pulse bg-red-500 hover:bg-red-600"
                      : "bg-muted hover:bg-muted"
                  )}
                >
                  {isRecording ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                </Button>
              )}
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading || disabled}
                className="h-7 w-7 bg-[#c4703f] p-0 hover:bg-[#c4703f]/80"
              >
                {isLoading ? (
                  <div className="border-border h-3 w-3 animate-spin rounded-full border border-t-white" />
                ) : (
                  <Send className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default MinimalAICompanion
