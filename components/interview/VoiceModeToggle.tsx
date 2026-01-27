"use client"

import { useState, useEffect, useCallback } from "react"
import { Mic, X, Volume2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

const CANCEL_THRESHOLD = 50 // pixels to drag before cancel triggers

interface VoiceModeToggleProps {
  isRecording: boolean
  onToggleRecording: () => void
  transcript?: string
  disabled?: boolean
  compact?: boolean
  className?: string
  onCancel?: () => void
  onSend?: () => void // Manual send button
  isLoading?: boolean
  // Auto-send props
  countdownActive?: boolean
  autoSendDelayMs?: number
  onCancelCountdown?: () => void
}

/**
 * Voice Input Component - Streamlined UX
 *
 * Flow: Tap to start → speaks → auto-sends on pause
 * Cancel: Swipe away OR tap X button
 */

// Countdown ring component
function CountdownRing({ durationMs }: { durationMs: number }) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const newProgress = Math.min(elapsed / durationMs, 1)
      setProgress(newProgress)

      if (newProgress >= 1) {
        clearInterval(interval)
      }
    }, 16) // ~60fps

    return () => clearInterval(interval)
  }, [durationMs])

  const circumference = 2 * Math.PI * 14 // radius = 14

  return (
    <svg className="h-8 w-8 -rotate-90" viewBox="0 0 32 32">
      <circle
        cx="16"
        cy="16"
        r="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-muted/30"
      />
      <circle
        cx="16"
        cy="16"
        r="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - progress)}
        strokeLinecap="round"
        className="text-accent transition-all duration-75"
      />
    </svg>
  )
}

// Audio waveform visualization
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
  countdownActive = false,
  autoSendDelayMs = 500,
  onCancelCountdown,
}: VoiceModeToggleProps) {
  const hasTranscript = transcript.trim().length > 0
  const [dragOffset, setDragOffset] = useState(0)

  const handleCancel = useCallback(() => {
    onCancelCountdown?.()
    onCancel?.()
    setDragOffset(0)
  }, [onCancel, onCancelCountdown])

  // Compute opacity based on drag distance
  const dragOpacity = Math.max(0.3, 1 - Math.abs(dragOffset) / (CANCEL_THRESHOLD * 2))

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Main Recording Area - Draggable */}
      <motion.div
        drag={isRecording ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.5}
        onDrag={(_, info) => {
          setDragOffset(info.offset.x)
        }}
        onDragEnd={(_, info) => {
          if (Math.abs(info.offset.x) > CANCEL_THRESHOLD) {
            handleCancel()
          }
          setDragOffset(0)
        }}
        style={{
          opacity: isRecording ? dragOpacity : 1,
          touchAction: "pan-y",
        }}
        className="flex items-center gap-3"
      >
        {/* Microphone Button with Pulsing Ring */}
        <div className="relative">
          {/* Pulsing ring when recording */}
          <AnimatePresence>
            {isRecording && !countdownActive && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div
                  className={cn(
                    "bg-accent/20 absolute rounded-full",
                    compact ? "h-12 w-12" : "h-14 w-14",
                    "animate-listening-pulse"
                  )}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Countdown ring when about to send */}
          <AnimatePresence>
            {countdownActive && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <CountdownRing durationMs={autoSendDelayMs} />
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            onClick={onToggleRecording}
            disabled={disabled || isLoading}
            className={cn(
              "relative z-10 transition-all duration-200",
              compact ? "h-8 w-8" : "h-10 w-10",
              isRecording
                ? "bg-destructive hover:bg-destructive/80 shadow-lg"
                : "bg-accent hover:bg-accent/80 text-accent-foreground shadow-md hover:shadow-lg"
            )}
          >
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                />
              ) : (
                <motion.div
                  key="mic"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <Mic className={compact ? "h-4 w-4" : "h-5 w-5"} />
                </motion.div>
              )}
            </AnimatePresence>
          </Button>
        </div>

        {/* Status Area */}
        <div className="flex flex-col gap-0.5">
          {/* Status with waveform when recording */}
          <div className="flex items-center gap-2">
            <AnimatePresence mode="wait">
              {isRecording && !countdownActive && (
                <motion.div
                  key="recording"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex items-center gap-2"
                >
                  <AudioWaveform isActive={true} />
                  <span className="text-accent text-xs font-medium">Listening...</span>
                </motion.div>
              )}

              {countdownActive && (
                <motion.div
                  key="countdown"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex items-center gap-2"
                >
                  <span className="text-xs font-medium text-green-400">Sending...</span>
                </motion.div>
              )}

              {!isRecording && !countdownActive && !isLoading && (
                <motion.span
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-muted-foreground text-xs"
                >
                  Tap to speak
                </motion.span>
              )}

              {isLoading && (
                <motion.span
                  key="sending"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-accent text-xs font-medium"
                >
                  Sending...
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Swipe hint when recording */}
          <AnimatePresence>
            {isRecording && (
              <motion.span
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 0.6, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-muted-foreground text-[9px]"
              >
                Swipe to cancel
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Send button - visible when there's transcript */}
        <AnimatePresence>
          {hasTranscript && onSend && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Button
                onClick={onSend}
                disabled={isLoading}
                size="sm"
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
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cancel button (X) - visible when recording */}
        <AnimatePresence>
          {(isRecording || countdownActive) && onCancel && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Button
                onClick={handleCancel}
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-7 w-7 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Transcript Preview */}
      <AnimatePresence>
        {hasTranscript && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={cn(
              "overflow-hidden rounded-lg border px-3 py-2",
              isRecording || countdownActive
                ? "bg-card border-accent/20"
                : "bg-card/50 border-border"
            )}
          >
            <div className="mb-1 flex items-center gap-2">
              <Volume2 className="text-muted-foreground h-3 w-3" />
              <span className="text-muted-foreground text-[10px]">
                {isRecording
                  ? "Live transcription"
                  : countdownActive
                    ? "Sending..."
                    : "Transcribed"}
              </span>
            </div>
            <p className={cn("text-foreground text-sm leading-relaxed", compact && "text-xs")}>
              {transcript}
              {isRecording && (
                <span className="bg-accent/70 ml-0.5 inline-block h-4 w-0.5 animate-pulse" />
              )}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Legacy export for backwards compatibility
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
