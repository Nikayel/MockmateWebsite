"use client"

import { useRef, useEffect } from "react"
import { Brain, User, MessageSquare, Send, Mic, MicOff } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useInterviewStore, type ChatMessage } from "@/lib/stores"

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
    <Card className="bg-gray-900/50 border-gray-700 glass-effect h-full flex flex-col overflow-hidden">
      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle className="text-white flex items-center space-x-2 text-sm">
          <div className="relative">
            <Brain className="h-4 w-4 text-[#00d9ff] animate-neural-pulse" />
            <div className="absolute inset-0 bg-[#00d9ff] rounded-full blur-md opacity-30"></div>
          </div>
          <span className="bg-gradient-to-r from-[#00d9ff] to-[#00ff88] bg-clip-text text-transparent font-bold">
            Skillon AI
          </span>
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
                        <Brain className="h-3 w-3 text-[#00d9ff] animate-neural-pulse" />
                      )}
                      <span className="text-xs opacity-75">
                        {msg.type === "user" ? "You" : "Skillon AI"}
                      </span>
                    </div>
                    <p className="text-xs whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </>
          )}
        </div>
        {(isInterviewStarted || showPostInterviewDiscussion) && (
          <div className="flex space-x-1 flex-shrink-0 border-t border-gray-700 pt-2">
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
              className="flex-1 bg-gray-800 border-gray-600 text-white placeholder-gray-400 text-xs h-7"
              onKeyPress={handleKeyPress}
              disabled={isLoadingInterviewer || isGeneratingDiscussion || isRecording}
              aria-label="Chat with interviewer"
            />
            <Button
              onClick={onToggleRecording}
              className={`h-7 px-2 ${
                isRecording ? "bg-red-500 hover:bg-red-600 animate-pulse" : "bg-gray-700 hover:bg-gray-600"
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
              className="bg-[#00d9ff] hover:bg-[#00d9ff]/80 text-white h-7 px-2"
              disabled={isLoadingInterviewer || isGeneratingDiscussion}
              aria-label={
                isLoadingInterviewer || isGeneratingDiscussion ? "Sending message" : "Send message"
              }
            >
              {!(isLoadingInterviewer || isGeneratingDiscussion) && (
                <Send className="h-3 w-3" aria-hidden="true" />
              )}
              {(isLoadingInterviewer || isGeneratingDiscussion) && (
                <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
    <div className="flex flex-col flex-1 border-t border-gray-700 pt-2 min-h-0">
      <div className="flex items-center space-x-1 mb-1 flex-shrink-0">
        <Brain className="h-3 w-3 text-[#00d9ff]" />
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
                  <Brain className="h-2.5 w-2.5 text-[#00d9ff] animate-neural-pulse" />
                )}
                <span className="text-xs opacity-75">{msg.type === "user" ? "You" : "AI Partner"}</span>
              </div>
              <p className="text-xs leading-tight">{msg.message}</p>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
      <div className="flex space-x-1 flex-shrink-0">
        <Input
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={isRecording ? "Listening..." : "Ask for help..."}
          className="flex-1 bg-gray-800 border-gray-600 text-white placeholder-gray-400 text-xs h-7"
          onKeyPress={handleKeyPress}
          disabled={isLoadingChat || isRecording}
          aria-label="Chat with AI partner"
        />
        <Button
          onClick={onToggleRecording}
          className={`h-7 px-2 ${
            isRecording ? "bg-red-500 hover:bg-red-600 animate-pulse" : "bg-gray-700 hover:bg-gray-600"
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
          className="bg-[#00d9ff] hover:bg-[#00d9ff]/80 text-white h-7 px-2"
          disabled={isLoadingChat}
          aria-label={isLoadingChat ? "Sending message" : "Send message"}
        >
          {!isLoadingChat && <Send className="h-3 w-3" aria-hidden="true" />}
          {isLoadingChat && (
            <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          )}
        </Button>
      </div>
    </div>
  )
}
