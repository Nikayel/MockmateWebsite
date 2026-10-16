"use client"

import { Mic, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { VoiceModeToggle } from "@/components/interview/VoiceModeToggle"

interface InterviewerComposerProps {
  busy: boolean
  input: string
  onInputChange: (value: string) => void
  onSend: () => void
  isRecording: boolean
  countdownActive: boolean
  onToggleRecording: () => void
  onCancelRecording: () => void
  onCancelCountdown: () => void
  voiceUnavailable?: { title: string; detail: string } | null
}

export function InterviewerComposer({
  busy,
  input,
  onInputChange,
  onSend,
  isRecording,
  countdownActive,
  onToggleRecording,
  onCancelRecording,
  onCancelCountdown,
  voiceUnavailable,
}: InterviewerComposerProps) {
  const hasDraft = Boolean(input.trim())
  const showRecording = isRecording || countdownActive

  return (
    <div className="border-border bg-card flex shrink-0 flex-col gap-2 border-t p-3">
      {(showRecording || voiceUnavailable) && (
        <VoiceModeToggle
          isRecording={isRecording}
          onToggleRecording={onToggleRecording}
          onCancel={onCancelRecording}
          onSend={() => {
            if (!hasDraft || busy) return
            onSend()
          }}
          onCancelCountdown={onCancelCountdown}
          countdownActive={countdownActive}
          unavailable={voiceUnavailable}
          transcript={input}
          disabled={busy}
          compact
        />
      )}
      {!showRecording && (
        <form
          className="flex min-w-0 items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            if (hasDraft && !busy) onSend()
          }}
        >
          <Input
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            placeholder="Message Sable…"
            className="border-input bg-background text-foreground placeholder:text-muted-foreground h-11 min-w-0 flex-1 rounded-xl text-base sm:text-sm"
            disabled={busy}
            aria-label="Chat with interviewer"
          />
          {hasDraft || voiceUnavailable ? (
            <Button
              type="submit"
              className="bg-accent text-accent-foreground hover:bg-accent/90 h-11 w-11 shrink-0 rounded-xl p-0"
              disabled={!hasDraft || busy}
              aria-label="Send message"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={onToggleRecording}
              variant="ghost"
              className="text-foreground hover:bg-muted hover:text-foreground dark:hover:bg-muted h-11 w-11 shrink-0 rounded-xl p-0"
              disabled={busy}
              aria-label="Start voice answer"
              title="Start voice answer"
            >
              <Mic className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </form>
      )}
    </div>
  )
}
