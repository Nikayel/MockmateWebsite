"use client"

import { Mic, MicOff, Send, Square, X } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { RecordingWaveform } from "./recording-waveform/RecordingWaveform"

const CANCEL_DRAG_DISTANCE = 50

interface VoiceModeToggleProps {
  isRecording: boolean
  mediaStream?: MediaStream | null
  onToggleRecording: () => void
  transcript?: string
  disabled?: boolean
  compact?: boolean
  className?: string
  onCancel?: () => void
  onSend?: () => void
  countdownActive?: boolean
  onCancelCountdown?: () => void
  /** Display copy supplied by the voice controller; typing stays available. */
  unavailable?: { title: string; detail: string } | null
}

/** Recording controls only. Reply progress belongs in the conversation. */
export function VoiceModeToggle({
  isRecording,
  mediaStream = null,
  onToggleRecording,
  transcript = "",
  disabled = false,
  compact = false,
  className,
  onCancel,
  onSend,
  countdownActive = false,
  onCancelCountdown,
  unavailable = null,
}: VoiceModeToggleProps) {
  const hasTranscript = Boolean(transcript.trim())
  const active = isRecording || countdownActive
  const cancel = () => {
    onCancelCountdown?.()
    onCancel?.()
  }

  if (unavailable) {
    return (
      <div
        className={cn(
          "border-border bg-muted flex items-start gap-2 rounded-md border p-3",
          className
        )}
        role="status"
      >
        <MicOff className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-foreground text-xs font-medium">{unavailable.title}</p>
          <p className="text-muted-foreground text-xs">{unavailable.detail}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <motion.div
        drag={isRecording && onCancel ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.3}
        onDragEnd={(_, info) => {
          if (Math.abs(info.offset.x) > CANCEL_DRAG_DISTANCE) cancel()
        }}
        style={{ touchAction: "pan-y" }}
        className="flex min-w-0 flex-wrap items-center gap-2"
      >
        <Button
          type="button"
          aria-label={isRecording ? "Stop recording" : "Start voice answer"}
          onClick={onToggleRecording}
          disabled={disabled}
          variant="ghost"
          className={cn(
            "h-11 w-11 shrink-0 p-0",
            isRecording && "bg-destructive text-destructive-foreground hover:bg-destructive/90"
          )}
        >
          {isRecording ? (
            <Square className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Mic className="h-4 w-4" aria-hidden="true" />
          )}
        </Button>
        <div className="min-w-0 flex-1">
          <p className="text-foreground text-xs font-medium" role={active ? "status" : undefined}>
            {countdownActive ? "Sending soon…" : isRecording ? "Listening…" : "Tap to speak"}
          </p>
          {isRecording && <RecordingWaveform mediaStream={mediaStream} />}
          {isRecording && onCancel && (
            <p className="text-muted-foreground text-xs">Swipe to cancel</p>
          )}
        </div>
        {hasTranscript && onSend && (
          <Button
            type="button"
            onClick={() => {
              onCancelCountdown?.()
              onSend()
            }}
            disabled={disabled}
            aria-label="Send voice answer"
            className="bg-accent text-accent-foreground hover:bg-accent/90 h-11 w-11 shrink-0 p-0"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
        {active && onCancel && (
          <Button
            type="button"
            onClick={cancel}
            variant="ghost"
            className="text-muted-foreground h-11 w-11 shrink-0 p-0"
            aria-label="Cancel voice answer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </motion.div>
      {hasTranscript && (
        <div className="border-border bg-background rounded-lg border p-3">
          <p className="text-muted-foreground mb-1 text-xs">
            {isRecording ? "Live transcription" : countdownActive ? "Ready to send" : "Transcribed"}
          </p>
          <p
            className={cn(
              "text-foreground leading-relaxed [overflow-wrap:anywhere]",
              compact ? "text-sm" : "text-base"
            )}
          >
            {transcript}
          </p>
        </div>
      )}
    </div>
  )
}

export default VoiceModeToggle
