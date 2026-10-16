"use client"

import { memo, type RefObject } from "react"
import { MessageSquare, PanelRightClose, Send } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer"
import { VoiceModeToggle } from "@/components/interview"
import type { ChatMessage } from "../_types"
import { SableWaitStatus } from "./SableWaitStatus"

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
  /** Why voice is unusable, already turned into copy. Null when voice is fine. */
  voiceUnavailable?: { title: string; detail: string } | null
  interviewerInput: string
  onInterviewerInputChange: (value: string) => void
  collapsed?: boolean
  onToggleCollapse?: () => void
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
  voiceUnavailable = null,
  interviewerInput,
  onInterviewerInputChange,
  collapsed = false,
  onToggleCollapse,
}: ChatColumnProps) {
  const isBusy = isLoadingInterviewer || isGeneratingDiscussion
  const isRevealingReply = interviewerMessages.at(-1)?.isStreaming === true

  return (
    <Card
      className={`workspace-panel border-border bg-card order-3 h-full flex-col gap-0 overflow-hidden py-0 ${
        focusMode
          ? "hidden"
          : collapsed
            ? // Collapsed is a desktop affordance: hide at lg, still tab-able on mobile
              activePanel === "chat"
              ? "flex lg:hidden"
              : "hidden"
            : activePanel === "chat"
              ? "flex"
              : "hidden lg:flex"
      }`}
    >
      <CardHeader className="flex-shrink-0 px-4 pt-3 pb-2">
        <CardTitle className="text-foreground flex w-full min-w-0 items-center justify-between gap-2 text-sm">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="relative flex-shrink-0">
              <div className="bg-muted text-muted-foreground flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold">
                S
              </div>
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="text-foreground truncate leading-tight font-semibold">Sable</span>
              <span className="text-muted-foreground flex items-center gap-1.5 text-[11px] leading-tight font-normal">
                Interviewer
              </span>
            </div>
          </div>
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="text-muted-foreground hover:bg-muted hover:text-foreground hidden h-11 w-11 items-center justify-center rounded transition-colors lg:inline-flex"
              title="Collapse panel"
              aria-label="Collapse interviewer panel"
            >
              <PanelRightClose className="h-4 w-4" />
            </button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
        <div className="mb-2 min-h-0 flex-1 space-y-2 overflow-y-auto pr-2">
          {interviewerMessages.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              <MessageSquare className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p className="text-xs">Interview will begin when you start...</p>
            </div>
          ) : (
            <>
              {interviewerMessages.map((msg, index) => (
                <div
                  key={msg.id || `interviewer-${msg.type}-${index}`}
                  className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-full px-2 py-2 ${
                      msg.type === "user"
                        ? "bg-secondary text-foreground rounded-[14px_14px_4px_14px]"
                        : "text-foreground"
                    }`}
                  >
                    {msg.isStreaming ? (
                      <p className="text-sm leading-relaxed">
                        {msg.message}
                        <span
                          className="bg-accent ml-1 inline-block h-3 w-1 animate-pulse"
                          aria-hidden="true"
                        />
                      </p>
                    ) : (
                      <MarkdownRenderer content={msg.message} className="text-sm leading-relaxed" />
                    )}
                  </div>
                </div>
              ))}
              {isBusy && !isRevealingReply && (
                <div className="flex justify-start">
                  <div className="border-border/50 bg-muted/50 text-muted-foreground max-w-[90%] rounded-lg border p-2">
                    <SableWaitStatus />
                  </div>
                </div>
              )}
              <div ref={interviewerEndRef} />
            </>
          )}
        </div>
        {(isInterviewStarted || showPostInterviewDiscussion) && (
          <div className="border-border flex flex-shrink-0 flex-col gap-2 border-t pt-3">
            <VoiceModeToggle
              isRecording={isRecordingInterviewer}
              onToggleRecording={onToggleRecording}
              onCancel={onCancelRecording}
              onSend={onSendMessage}
              onCancelCountdown={onCancelCountdown}
              countdownActive={countdownActive}
              unavailable={voiceUnavailable}
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
                  className="bg-secondary border-border text-foreground placeholder-muted-foreground h-11 min-w-0 flex-1 text-base sm:text-sm"
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
                  className="bg-secondary hover:bg-muted text-foreground h-11 w-11 p-0"
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
