"use client"

import { memo, type RefObject } from "react"
import { MessageSquare, PanelRightClose, Send } from "lucide-react"
import { Sparra } from "@/components/brand/Sparra"
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
  interviewerInput,
  onInterviewerInputChange,
  collapsed = false,
  onToggleCollapse,
}: ChatColumnProps) {
  const isBusy = isLoadingInterviewer || isGeneratingDiscussion

  return (
    <Card
      className={`glass-effect border-border bg-card/50 order-3 h-full flex-col gap-0 overflow-hidden py-0 ${
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
              <div className="bg-accent/15 text-accent ring-accent/30 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ring-1">
                S
              </div>
              <span
                className="bg-neural border-card absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2"
                aria-hidden="true"
              />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="text-foreground truncate leading-tight font-semibold">
                CodeSparring AI
              </span>
              <span className="text-muted-foreground flex items-center gap-1.5 text-[11px] leading-tight font-normal">
                Sable · reacting live
                <span className="flex items-end gap-0.5" aria-hidden="true">
                  <span className="bg-accent/70 h-1.5 w-0.5 animate-pulse rounded-full" />
                  <span
                    className="bg-accent/70 h-2.5 w-0.5 animate-pulse rounded-full"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="bg-accent/70 h-1 w-0.5 animate-pulse rounded-full"
                    style={{ animationDelay: "300ms" }}
                  />
                </span>
              </span>
            </div>
          </div>
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="text-muted-foreground hover:bg-muted hover:text-foreground hidden h-6 w-6 items-center justify-center rounded transition-colors lg:inline-flex"
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
                  key={`interviewer-${msg.type}-${index}`}
                  className={`animate-in slide-in-from-bottom-2 flex duration-300 ${
                    msg.type === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[88%] px-3 py-2 ${
                      msg.type === "user"
                        ? "bg-secondary text-foreground rounded-[14px_14px_4px_14px]"
                        : "border-accent/20 bg-accent/10 text-foreground rounded-[14px_14px_14px_4px] border"
                    }`}
                  >
                    <MarkdownRenderer content={msg.message} className="text-xs leading-relaxed" />
                  </div>
                </div>
              ))}
              {isBusy && (
                <div className="flex justify-start">
                  <div className="border-border/50 bg-muted/50 text-muted-foreground max-w-[90%] rounded-lg border p-2">
                    <div className="flex items-center gap-2">
                      <Sparra state="thinking" size={20} />
                      <span className="text-xs">CodeSparring AI is thinking…</span>
                    </div>
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
