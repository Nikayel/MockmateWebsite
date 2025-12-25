'use client'

import { useState, useEffect } from 'react'
import { Mic, MicOff, Volume2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface VoiceModeToggleProps {
  // Simplified props - removed mode toggle complexity
  isRecording: boolean
  onToggleRecording: () => void
  transcript?: string
  disabled?: boolean
  compact?: boolean
  className?: string
  // Optional: allow canceling current recording
  onCancel?: () => void
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
    <div className="flex items-center gap-0.5 h-4">
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-0.5 rounded-full transition-all duration-150 bg-accent",
            isActive ? "animate-waveform" : "h-1 opacity-40"
          )}
          style={{
            animationDelay: isActive ? `${i * 100}ms` : '0ms',
            height: isActive ? undefined : '4px',
          }}
        />
      ))}
    </div>
  )
}

export function VoiceModeToggle({
  isRecording,
  onToggleRecording,
  transcript = '',
  disabled = false,
  compact = false,
  className,
  onCancel,
}: VoiceModeToggleProps) {
  const [showTranscriptPreview, setShowTranscriptPreview] = useState(false)

  // Show transcript preview when recording and there's content
  useEffect(() => {
    if (isRecording && transcript) {
      setShowTranscriptPreview(true)
    } else if (!isRecording) {
      // Hide after a delay when stopped
      const timer = setTimeout(() => setShowTranscriptPreview(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isRecording, transcript])

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Simple instruction - always the same */}
      <p className={cn(
        "text-muted-foreground leading-relaxed",
        compact ? "text-[9px]" : "text-[10px]"
      )}>
        {isRecording ? (
          <span className="text-accent">
            Listening... message sends when you pause speaking
          </span>
        ) : (
          "Click mic to speak – sends automatically when you pause"
        )}
      </p>

      {/* Recording Controls - Simplified */}
      <div className="flex items-center gap-2">
        {/* Single Microphone Button */}
        <Button
          onClick={onToggleRecording}
          disabled={disabled}
          className={cn(
            "relative transition-all duration-200",
            compact ? "h-8 w-8" : "h-10 w-10",
            isRecording
              ? "bg-destructive hover:bg-destructive/80 shadow-lg animate-pulse"
              : "bg-accent hover:bg-accent/80 text-accent-foreground shadow-md hover:shadow-lg"
          )}
        >
          {isRecording ? (
            <>
              <MicOff className={compact ? "h-4 w-4" : "h-5 w-5"} />
              {/* Recording ring animation */}
              <span
                className="absolute inset-0 rounded-md animate-ping opacity-20 bg-destructive"
              />
            </>
          ) : (
            <Mic className={compact ? "h-4 w-4" : "h-5 w-5"} />
          )}
        </Button>

        {/* Waveform indicator when recording */}
        {isRecording && (
          <div className="flex items-center gap-2">
            <AudioWaveform isActive={true} />
            <span className="text-[10px] text-accent font-medium">Recording</span>
          </div>
        )}

        {/* Cancel button when recording */}
        {isRecording && onCancel && (
          <Button
            onClick={onCancel}
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-muted-foreground hover:text-destructive text-[10px]"
          >
            <X className="h-3 w-3 mr-1" />
            Cancel
          </Button>
        )}
      </div>

      {/* Transcript Preview (when recording) */}
      {isRecording && transcript && (
        <div className={cn(
          "px-3 py-2 rounded-lg bg-card border border-accent/20"
        )}>
          <div className="flex items-center gap-2 mb-1">
            <Volume2 className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Live transcription</span>
          </div>
          <p className={cn(
            "text-sm text-foreground leading-relaxed",
            compact && "text-xs"
          )}>
            {transcript}
            <span className="inline-block w-0.5 h-4 bg-accent/70 animate-pulse ml-0.5" />
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
  transcript = '',
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
