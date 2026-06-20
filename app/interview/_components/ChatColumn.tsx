"use client"

import { memo, type RefObject } from "react"
import { Brain, MessageSquare, Send, User } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer"
import { VoiceModeToggle } from "@/components/interview"
import type { ChatMessage } from "@/lib/stores"

interface ChatColumnProps {
  focusMode: boolean
  activePanel: "problem" | "editor" | "chat"
  interviewerMessages: ChatMessage[]
  isLoadingInterviewer: boolean
  isGeneratingDiscussion: boolean
  interviewerEndRef: RefObject<HTMLDivElement | null>
  isInterviewStarted: boolean
  showPostInterviewDiscussion: boolean
  isRecordingInterviewer: boolean
  onToggleRecording: () => void
  onCancelRecording: () => void
  onCancelCountdown: () => void
  onSendMessage: () => void
  countdownActive: boolean
  interviewerInput: string
  onInterviewerInputChange: (value: string) => void
}

export const ChatColumn = memo(function ChatColumn({
  focusMode,
  activePanel,
  interviewerMessages,
  isLoadingInterviewer,
  isGeneratingDiscussion,
  interviewerEndRef,
  isInterviewStarted,
  showPostInterviewDiscussion,
  isRecordingInterviewer,
  onToggleRecording,
  onCancelRecording,
  onCancelCountdown,
  onSendMessage,
  countdownActive,
  interviewerInput,
  onInterviewerInputChange,
}: ChatColumnProps) {
  const isBusy = isLoadingInterviewer || isGeneratingDiscussion

  return (
    <Card
      className={`glass-effect order-3 h-full flex-col gap-0 overflow-hidden border-gray-700 bg-gray-900/50 py-0 ${
        focusMode ? "hidden" : activePanel === "chat" ? "flex" : "hidden lg:flex"
      }`}
    >
      <CardHeader className="flex-shrink-0 px-4 pt-3 pb-2">
        <CardTitle className="flex items-center space-x-2 text-sm text-white">
          <div className="relative">
            <Brain className="text-accent animate-neural-pulse h-4 w-4" />
            <div className="bg-accent absolute inset-0 rounded-full opacity-30 blur-md"></div>
          </div>
          <span className="from-accent to-neural bg-gradient-to-r bg-clip-text font-bold text-transparent">
            CodeSparring AI
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
        <div className="mb-2 min-h-0 flex-1 space-y-2 overflow-y-auto pr-2">
          {interviewerMessages.length === 0 ? (
            <div className="py-8 text-center text-gray-400">
              <MessageSquare className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p className="text-xs">Interview will begin when you start...</p>
            </div>
          ) : (
            <>
              {interviewerMessages.map((msg, index) => (
                <div
                  key={`interviewer-${msg.type}-${index}`}
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
                        <Brain className="text-accent animate-neural-pulse h-3 w-3" />
                      )}
                      <span className="text-xs opacity-75">
                        {msg.type === "user" ? "You" : "CodeSparring AI"}
                      </span>
                    </div>
                    <MarkdownRenderer content={msg.message} className="text-xs leading-relaxed" />
                  </div>
                </div>
              ))}
              {isBusy && (
                <div className="flex justify-start">
                  <div className="max-w-[90%] rounded-lg border border-gray-700/50 bg-gray-800/50 p-2 text-gray-400">
                    <div className="flex items-center space-x-2">
                      <Brain className="h-3 w-3 animate-pulse text-[#00d9ff]" />
                      <span className="text-xs">CodeSparring AI is thinking</span>
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
              <div ref={interviewerEndRef} />
            </>
          )}
        </div>
        {(isInterviewStarted || showPostInterviewDiscussion) && (
          <div className="flex flex-shrink-0 flex-col gap-2 border-t border-gray-700 pt-3">
            <VoiceModeToggle
              isRecording={isRecordingInterviewer}
              onToggleRecording={onToggleRecording}
              onCancel={onCancelRecording}
              onSend={onSendMessage}
              onCancelCountdown={onCancelCountdown}
              countdownActive={countdownActive}
              autoSendDelayMs={500}
              isLoading={isBusy}
              transcript={interviewerInput}
              disabled={isBusy}
              compact={true}
            />
            {!isRecordingInterviewer && (
              <div className="flex space-x-1">
                <Input
                  value={interviewerInput}
                  onChange={(event) => onInterviewerInputChange(event.target.value)}
                  placeholder={
                    showPostInterviewDiscussion ? "Type or use mic above..." : "Type a question..."
                  }
                  className="bg-secondary border-border text-foreground placeholder-muted-foreground h-7 flex-1 text-xs"
                  onKeyPress={(event) => {
                    if (event.key === "Enter" && !isBusy) {
                      onSendMessage()
                    }
                  }}
                  disabled={isBusy}
                  aria-label="Chat with interviewer"
                />
                <Button
                  onClick={onSendMessage}
                  className="bg-accent hover:bg-accent/80 text-accent-foreground h-7 px-2"
                  loading={isBusy}
                  disabled={!interviewerInput.trim()}
                  aria-label="Send message"
                >
                  {!isBusy && <Send className="h-3 w-3" aria-hidden="true" />}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
})
