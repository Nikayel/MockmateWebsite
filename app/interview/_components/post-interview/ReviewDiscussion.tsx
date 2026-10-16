"use client"

import dynamic from "next/dynamic"
import { ChevronDown, Mic, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ConversationMessage } from "../ConversationMessage"
import { SableWaitStatus } from "../SableWaitStatus"
import { useReviewScroll } from "./useReviewScroll"
import type { PostInterviewViewProps } from "./types"

const VoiceModeToggle = dynamic(
  () => import("@/components/interview/VoiceModeToggle").then((module) => module.VoiceModeToggle),
  { ssr: false }
)
type DiscussionProps = Pick<
  PostInterviewViewProps,
  | "interviewerMessages"
  | "isLoadingInterviewer"
  | "isGeneratingDiscussion"
  | "interviewerInput"
  | "setInterviewerInput"
  | "handleSendMessage"
  | "isRecordingInterviewer"
  | "toggleVoiceRecording"
>

export function ReviewDiscussion(props: DiscussionProps) {
  const {
    interviewerMessages,
    interviewerInput,
    setInterviewerInput,
    handleSendMessage,
    isRecordingInterviewer,
    toggleVoiceRecording,
  } = props
  const busy = props.isLoadingInterviewer || props.isGeneratingDiscussion
  const revealing = interviewerMessages.at(-1)?.isStreaming === true
  const { ref, onScroll, hasNewMessages, scrollToLatest } = useReviewScroll(interviewerMessages)
  return (
    <section
      aria-label="Interview discussion"
      className="border-border flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border"
    >
      <header className="border-border/60 flex h-12 shrink-0 items-center border-b px-4">
        <h2 className="text-sm font-medium">Discuss with Sable</h2>
      </header>
      <div className="relative min-h-0 flex-1">
        <div
          ref={ref}
          onScroll={onScroll}
          role="log"
          aria-label="Post-interview discussion messages"
          aria-live="polite"
          aria-relevant="additions"
          // Keyboard users need a focus target to scroll the conversation.
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
          className="workspace-conversation absolute inset-0 space-y-5 overflow-y-auto overscroll-contain p-4"
        >
          {interviewerMessages.map((message, index) => (
            <ConversationMessage
              key={message.id ?? `${message.type}-${index}`}
              message={message}
              speaker="Sable"
            />
          ))}
          {interviewerMessages.length === 0 && !busy && (
            <p className="text-muted-foreground text-sm leading-6">
              Ask about your submission or continue to your feedback.
            </p>
          )}
          {busy && !revealing && <SableWaitStatus />}
        </div>
        {hasNewMessages && (
          <Button
            variant="outline"
            className="absolute right-3 bottom-3 min-h-11"
            onClick={scrollToLatest}
          >
            <ChevronDown className="mr-1 h-4 w-4" />
            Latest reply
          </Button>
        )}
      </div>
      <div className="border-border/60 shrink-0 border-t p-3">
        {isRecordingInterviewer && (
          <VoiceModeToggle
            isRecording={isRecordingInterviewer}
            onToggleRecording={() => toggleVoiceRecording(true)}
            transcript={interviewerInput}
            disabled={busy}
            compact
          />
        )}
        {!isRecordingInterviewer && (
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              if (interviewerInput.trim() && !busy) handleSendMessage(true)
            }}
          >
            <Button
              type="button"
              variant="ghost"
              className="h-11 w-11 shrink-0 p-0"
              aria-label="Start voice input"
              onClick={() => toggleVoiceRecording(true)}
              disabled={busy}
            >
              <Mic className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Input
              value={interviewerInput}
              onChange={(event) => setInterviewerInput(event.target.value)}
              placeholder="Ask about your submission…"
              className="h-11 min-w-0 flex-1 text-base sm:text-sm"
              disabled={busy}
              aria-label="Chat with interviewer"
            />
            <Button
              type="submit"
              className="h-11 w-11 shrink-0 p-0"
              disabled={!interviewerInput.trim() || busy}
              aria-label="Send message"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </Button>
          </form>
        )}
      </div>
    </section>
  )
}
