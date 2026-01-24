"use client"

import { useState, useEffect } from "react"
import { Mic, Square, Volume2, X, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface VoiceModeToggleProps {
  isRecording: boolean
  onToggleRecording: () => void
  transcript?: string
  disabled?: boolean
  compact?: boolean
  className?: string
  onCancel?: () => void
  onSend?: () => void // Send the current transcript
  isLoading?: boolean // Show loading state on send button
}

/**
 * Simplified Voice Input Component
 *
 * Research-backed design principles:
 * - Single interaction pattern reduces cognitive load
 * - Immediate visual feedback (73% of users need this - VUI research 2024)
 * - Natural speech flow - auto-sends when user pauses
 * - Clear state indicators for recording status
 *
 * Sources:
 * - VUI Design Best Practices 2024 (dialzara.com)
 * - UXmatters Voice Interface Research
 */

// Audio waveform visualization - calmer colors
function AudioWaveform({ isActive }: { isActive: boolean }) {
  const bars = 5

  return (
    <div className="flex h-4 items-center gap-0.5">
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "bg-accent w-0.5 rounded-full transition-all duration-150",
            isActive ? "animate-waveform" : "h-1 opacity-40"
          )}
          style={{
            animationDelay: isActive ? `${i * 100}ms` : "0ms",
            height: isActive ? undefined : "4px",
          }}
        />
      ))}
    </div>
  )
}

export function VoiceModeToggle({
  isRecording,
  onToggleRecording,
  transcript = "",
  disabled = false,
  compact = false,
  className,
  onCancel,
  onSend,
  isLoading = false,
}: VoiceModeToggleProps) {
  const hasTranscript = transcript.trim().length > 0

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Recording Controls Row */}
      <div className="flex items-center gap-2">
        {/* Microphone Button - Start/Stop */}
        <Button
          onClick={onToggleRecording}
          disabled={disabled}
          className={cn(
            "relative transition-all duration-200",
            compact ? "h-8 w-8" : "h-10 w-10",
            isRecording
              ? "bg-destructive hover:bg-destructive/80 shadow-lg"
              : "bg-accent hover:bg-accent/80 text-accent-foreground shadow-md hover:shadow-lg"
          )}
        >
          {isRecording ? (
            <Square className={compact ? "h-4 w-4" : "h-5 w-5"} />
          ) : (
            <Mic className={compact ? "h-4 w-4" : "h-5 w-5"} />
          )}
        </Button>

        {/* Waveform + Status when recording */}
        {isRecording && (
          <div className="flex items-center gap-2">
            <AudioWaveform isActive={true} />
            <span className="text-accent text-[10px] font-medium">Recording</span>
          </div>
        )}

        {/* Send button - visible when there's transcript content */}
        {hasTranscript && onSend && (
          <Button
            onClick={onSend}
            disabled={isLoading}
            className={cn(
              "h-8 px-3 transition-all",
              isRecording
                ? "animate-pulse bg-green-500 hover:bg-green-600"
                : "bg-accent hover:bg-accent/80"
            )}
          >
            {isLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <>
                <Send className="mr-1 h-4 w-4" />
                <span className="text-xs font-medium">Send</span>
              </>
            )}
          </Button>
        )}

        {/* Cancel button when recording */}
        {isRecording && onCancel && (
          <Button
            onClick={onCancel}
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive h-6 px-2 text-[10px]"
          >
            <X className="mr-1 h-3 w-3" />
            Cancel
          </Button>
        )}
      </div>

      {/* Status text */}
      <p
        className={cn(
          "text-muted-foreground leading-relaxed",
          compact ? "text-[9px]" : "text-[10px]"
        )}
      >
        {isRecording ? (
          hasTranscript ? (
            <span className="text-green-400">Click Send when ready</span>
          ) : (
            <span className="text-accent">Listening...</span>
          )
        ) : hasTranscript ? (
          <span className="text-green-400">Ready to send</span>
        ) : (
          "Click mic to speak"
        )}
      </p>

      {/* Transcript Preview */}
      {hasTranscript && (
        <div
          className={cn(
            "rounded-lg border px-3 py-2",
            isRecording ? "bg-card border-accent/20" : "bg-card/50 border-border"
          )}
        >
          <div className="mb-1 flex items-center gap-2">
            <Volume2 className="text-muted-foreground h-3 w-3" />
            <span className="text-muted-foreground text-[10px]">
              {isRecording ? "Live transcription" : "Transcribed"}
            </span>
          </div>
          <p className={cn("text-foreground text-sm leading-relaxed", compact && "text-xs")}>
            {transcript}
            {isRecording && (
              <span className="bg-accent/70 ml-0.5 inline-block h-4 w-0.5 animate-pulse" />
            )}
          </p>
        </div>
      )}
    </div>
  )
}

// Legacy export for backwards compatibility
// But internally, we always use auto-send behavior now
export interface LegacyVoiceModeToggleProps {
  isLiveMode: boolean
  onModeChange: (isLive: boolean) => void
  isRecording: boolean
  onToggleRecording: () => void
  onSendMessage?: () => void
  transcript?: string
  disabled?: boolean
  showSendButton?: boolean
  compact?: boolean
  className?: string
}

export function LegacyVoiceModeToggle({
  isRecording,
  onToggleRecording,
  transcript = "",
  disabled = false,
  compact = false,
  className,
}: LegacyVoiceModeToggleProps) {
  // Legacy wrapper - just forwards to simplified version
  // Auto-send is now always enabled (handled in parent)
  return (
    <VoiceModeToggle
      isRecording={isRecording}
      onToggleRecording={onToggleRecording}
      transcript={transcript}
      disabled={disabled}
      compact={compact}
      className={className}
    />
  )
}

export default VoiceModeToggle
