"use client"

import { memo, type RefObject, type ReactNode } from "react"
import { MessageSquare, PanelRightClose } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ChatMessage } from "../_types"
import { SableWaitStatus } from "./SableWaitStatus"
import { ConversationMessage } from "./ConversationMessage"
import { InterviewerComposer } from "./InterviewerComposer"

interface ChatColumnProps {
  toolbar?: ReactNode
  focusMode: boolean
  activePanel: "problem" | "editor" | "chat"
  interviewerMessages: ChatMessage[]
  isLoadingInterviewer: boolean
  isGeneratingDiscussion: boolean
  interviewerEndRef: RefObject<HTMLDivElement | null>
  isInterviewStarted: boolean
  showPostInterviewDiscussion: boolean
  isRecordingInterviewer: boolean
  interviewerMediaStream?: MediaStream | null
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
  toolbar,
  focusMode,
  activePanel,
  interviewerMessages,
  isLoadingInterviewer,
  isGeneratingDiscussion,
  interviewerEndRef,
  isInterviewStarted,
  showPostInterviewDiscussion,
  isRecordingInterviewer,
  interviewerMediaStream,
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
      role="complementary"
      aria-label="Interviewer"
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
      <CardHeader className="block shrink-0 p-2">
        <CardTitle className="text-foreground flex w-full min-w-0 items-center justify-between gap-2 text-sm">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="relative flex-shrink-0">
              <div className="workspace-chat-avatar flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold">
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
        {toolbar && <div className="mt-1 hidden min-w-0 lg:block">{toolbar}</div>}
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
        <div
          className="workspace-conversation min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-3"
          role="log"
          aria-label="Interview messages"
          aria-live="polite"
          aria-relevant="additions"
          // Keyboard users can focus the log to read earlier turns.
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
        >
          {interviewerMessages.length === 0 && !isBusy && (
            <div className="text-muted-foreground py-8 text-center">
              <MessageSquare className="mx-auto mb-2 h-8 w-8 opacity-50" />
              <p className="text-xs">
                {isInterviewStarted
                  ? "Ask Sable about the problem."
                  : "Start your interview to meet Sable."}
              </p>
            </div>
          )}
          {interviewerMessages.map((msg, index) => (
            <ConversationMessage
              key={msg.id || `interviewer-${msg.type}-${index}`}
              message={msg}
              speaker="Sable"
            />
          ))}
          {isBusy && !isRevealingReply && <SableWaitStatus />}
          <div ref={interviewerEndRef} />
        </div>
        {(isInterviewStarted || showPostInterviewDiscussion) && (
          <InterviewerComposer
            busy={isBusy}
            input={interviewerInput}
            onInputChange={onInterviewerInputChange}
            onSend={onSendMessage}
            isRecording={isRecordingInterviewer}
            mediaStream={interviewerMediaStream}
            countdownActive={countdownActive}
            onToggleRecording={onToggleRecording}
            onCancelRecording={onCancelRecording}
            onCancelCountdown={onCancelCountdown}
            voiceUnavailable={voiceUnavailable}
          />
        )}
      </CardContent>
    </Card>
  )
})
