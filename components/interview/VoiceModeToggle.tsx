'use client'

import { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, Radio, Hand, Volume2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface VoiceModeToggleProps {
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

// Audio waveform visualization component
function AudioWaveform({ isActive, color = '#00d9ff' }: { isActive: boolean; color?: string }) {
  const bars = 5

  return (
    <div className="flex items-center gap-0.5 h-4">
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-0.5 rounded-full transition-all duration-150",
            isActive ? "animate-waveform" : "h-1"
          )}
          style={{
            backgroundColor: color,
            animationDelay: isActive ? `${i * 100}ms` : '0ms',
            height: isActive ? undefined : '4px',
          }}
        />
      ))}
    </div>
  )
}

// Live indicator with pulsing animation
function LiveIndicator({ isActive }: { isActive: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className={cn(
          "w-2 h-2 rounded-full transition-all duration-300",
          isActive
            ? "bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]"
            : "bg-gray-500"
        )}
      />
      <span className={cn(
        "text-[10px] font-bold uppercase tracking-wider",
        isActive ? "text-red-400" : "text-gray-500"
      )}>
        LIVE
      </span>
    </div>
  )
}

export function VoiceModeToggle({
  isLiveMode,
  onModeChange,
  isRecording,
  onToggleRecording,
  onSendMessage,
  transcript = '',
  disabled = false,
  showSendButton = true,
  compact = false,
  className,
}: VoiceModeToggleProps) {
  const [showTranscriptPreview, setShowTranscriptPreview] = useState(false)

  // Show transcript preview when recording and there's content
  useEffect(() => {
    if (isRecording && transcript) {
      setShowTranscriptPreview(true)
    } else if (!isRecording) {
      // Hide after a delay when stopped
      const timer = setTimeout(() => setShowTranscriptPreview(false), 500)
      return () => clearTimeout(timer)
    }
  }, [isRecording, transcript])

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Mode Toggle - Segmented Control */}
      <div className="flex items-center justify-between">
        <div className={cn(
          "flex rounded-lg p-0.5 bg-gray-800/80 border border-gray-700",
          compact ? "gap-0" : "gap-1"
        )}>
          {/* Manual Mode Button */}
          <button
            onClick={() => onModeChange(false)}
            disabled={disabled || isRecording}
            className={cn(
              "flex items-center gap-1.5 rounded-md transition-all duration-200",
              compact ? "px-2 py-1 text-[10px]" : "px-3 py-1.5 text-xs",
              !isLiveMode
                ? "bg-gray-600 text-white shadow-sm"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/50",
              (disabled || isRecording) && "opacity-50 cursor-not-allowed"
            )}
          >
            <Hand className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
            <span className="font-medium">Push to Talk</span>
          </button>

          {/* Live Mode Button */}
          <button
            onClick={() => onModeChange(true)}
            disabled={disabled || isRecording}
            className={cn(
              "flex items-center gap-1.5 rounded-md transition-all duration-200",
              compact ? "px-2 py-1 text-[10px]" : "px-3 py-1.5 text-xs",
              isLiveMode
                ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-sm shadow-green-500/25"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/50",
              (disabled || isRecording) && "opacity-50 cursor-not-allowed"
            )}
          >
            <Radio className={cn(
              compact ? "h-3 w-3" : "h-3.5 w-3.5",
              isLiveMode && "animate-pulse"
            )} />
            <span className="font-medium">Live</span>
            {isLiveMode && (
              <span className="ml-0.5 px-1 py-0.5 text-[8px] bg-green-500/30 rounded font-bold">
                AUTO
              </span>
            )}
          </button>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          {isRecording && isLiveMode && <LiveIndicator isActive={true} />}
          {isRecording && <AudioWaveform isActive={true} color={isLiveMode ? '#22c55e' : '#00d9ff'} />}
        </div>
      </div>

      {/* Mode Description */}
      <p className={cn(
        "text-gray-500 leading-relaxed",
        compact ? "text-[9px]" : "text-[10px]"
      )}>
        {isLiveMode ? (
          <>
            <span className="text-green-400 font-medium">Live Mode:</span>{' '}
            {isRecording
              ? "Speaking... message sends automatically when you pause"
              : "Click mic to start - sends when you pause speaking"}
          </>
        ) : (
          <>
            <span className="text-gray-400 font-medium">Manual Mode:</span>{' '}
            {isRecording
              ? "Recording... click mic again when done, then send"
              : "Click mic to record, then click send"}
          </>
        )}
      </p>

      {/* Recording Controls */}
      <div className="flex items-center gap-2">
        {/* Microphone Button */}
        <Button
          onClick={onToggleRecording}
          disabled={disabled}
          className={cn(
            "relative transition-all duration-200",
            compact ? "h-8 w-8" : "h-10 w-10",
            isRecording
              ? isLiveMode
                ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg shadow-green-500/30"
                : "bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 shadow-lg shadow-red-500/30 animate-pulse"
              : "bg-gray-700 hover:bg-gray-600"
          )}
        >
          {isRecording ? (
            <>
              <MicOff className={compact ? "h-4 w-4" : "h-5 w-5"} />
              {/* Recording ring animation */}
              <span className="absolute inset-0 rounded-md animate-ping opacity-30"
                style={{ backgroundColor: isLiveMode ? '#22c55e' : '#ef4444' }} />
            </>
          ) : (
            <Mic className={compact ? "h-4 w-4" : "h-5 w-5"} />
          )}
        </Button>

        {/* Transcript Preview (when recording) */}
        {isRecording && transcript && (
          <div className={cn(
            "flex-1 px-3 py-2 rounded-lg bg-gray-800/50 border",
            isLiveMode ? "border-green-500/30" : "border-blue-500/30"
          )}>
            <div className="flex items-center gap-2 mb-1">
              <Volume2 className="h-3 w-3 text-gray-400" />
              <span className="text-[10px] text-gray-400">Live transcription</span>
            </div>
            <p className={cn(
              "text-sm text-white leading-relaxed",
              compact && "text-xs"
            )}>
              {transcript}
              <span className="inline-block w-0.5 h-4 bg-white/70 animate-pulse ml-0.5" />
            </p>
          </div>
        )}

        {/* Send Button (only in manual mode when not recording and there's transcript) */}
        {showSendButton && !isLiveMode && !isRecording && transcript && onSendMessage && (
          <Button
            onClick={onSendMessage}
            disabled={disabled || !transcript.trim()}
            className={cn(
              "bg-[#00d9ff] hover:bg-[#00d9ff]/80 text-white",
              compact ? "h-8 px-3" : "h-10 px-4"
            )}
          >
            <Send className={compact ? "h-4 w-4" : "h-5 w-5"} />
          </Button>
        )}
      </div>
    </div>
  )
}

export default VoiceModeToggle
