/**
 * useDeepgram Hook
 *
 * React hook for real-time speech-to-text transcription using Deepgram
 * Provides easy integration with interview components
 */

"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { DeepgramVoiceService, DeepgramConfig } from "./deepgram-service"
import { VOICE } from "@/lib/constants"
import { logger } from "@/lib/logger"

// Web Speech API types (not included in standard TypeScript lib)
interface SpeechRecognitionResult {
  readonly isFinal: boolean
  readonly length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  readonly transcript: string
  readonly confidence: number
}

interface SpeechRecognitionResultList {
  readonly length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number
  readonly results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string
  readonly message: string
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

export type VoiceStatus = "idle" | "connecting" | "recording" | "error"

export interface UseDeepgramOptions extends DeepgramConfig {
  onTranscript?: (transcript: string, isFinal: boolean) => void
  onError?: (error: Error) => void
  onStatusChange?: (status: VoiceStatus) => void
  onUtteranceEnd?: (transcript: string) => void
  onMaxDuration?: (transcript: string) => void // Called when max recording duration reached
  autoSubmitOnSilence?: boolean
  silenceThresholdMs?: number
  // Auto-send configuration
  autoSendEnabled?: boolean // Enable auto-send on utterance end (default: true)
  autoSendDelayMs?: number // Delay before auto-send for cancel window (default: 500ms)
  // Usage tracking
  sessionId?: string
  authToken?: string // Firebase auth token for tracking API
}

export interface UseDeepgramReturn {
  // State
  isRecording: boolean
  status: VoiceStatus
  transcript: string
  error: Error | null
  countdownActive: boolean // True during pre-send countdown

  // Actions
  startRecording: () => Promise<void>
  stopRecording: () => string
  resetTranscript: () => void
  toggleRecording: () => Promise<void>
  clearSentTracker: () => void
  cancelCountdown: () => void // Cancel pending auto-send

  // Info
  isConfigured: boolean
}

/**
 * Hook for using Deepgram real-time transcription
 */
export function useDeepgram(options: UseDeepgramOptions = {}): UseDeepgramReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [status, setStatus] = useState<VoiceStatus>("idle")
  const [transcript, setTranscript] = useState("")
  const [error, setError] = useState<Error | null>(null)
  const [countdownActive, setCountdownActive] = useState(false)

  const serviceRef = useRef<DeepgramVoiceService | null>(null)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const recordingStartTimeRef = useRef<number | null>(null)
  const countdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingTranscriptRef = useRef<string>("")

  // Store latest callbacks in refs to avoid stale closure issues
  const onUtteranceEndRef = useRef(options.onUtteranceEnd)
  const onTranscriptRef = useRef(options.onTranscript)
  const onMaxDurationRef = useRef(options.onMaxDuration)
  onUtteranceEndRef.current = options.onUtteranceEnd
  onTranscriptRef.current = options.onTranscript
  onMaxDurationRef.current = options.onMaxDuration

  // Initialize service on mount
  useEffect(() => {
    const service = new DeepgramVoiceService({
      apiKey: options.apiKey,
      language: options.language,
      model: options.model,
      punctuate: options.punctuate,
      interimResults: options.interimResults,
      smartFormat: options.smartFormat,
      utteranceEndMs: options.utteranceEndMs,
      vadEvents: options.vadEvents,
      endpointing: options.endpointing,
    })

    // Pass auth token so the service can fetch the API key from the server
    if (options.authToken) {
      service.setAuthToken(options.authToken)
    }

    serviceRef.current = service

    // Set up callbacks
    serviceRef.current.setOnTranscript((text, isFinal) => {
      setTranscript(text)
      onTranscriptRef.current?.(text, isFinal)

      // Reset silence timer on new transcript
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
      }

      // Auto-submit on silence if enabled
      if (options.autoSubmitOnSilence && isFinal) {
        silenceTimerRef.current = setTimeout(() => {
          // Silence detected after final transcript
        }, options.silenceThresholdMs || 2000)
      }
    })

    serviceRef.current.setOnError((err) => {
      setError(err)
      options.onError?.(err)
    })

    serviceRef.current.setOnStatus((newStatus) => {
      const mappedStatus: VoiceStatus =
        newStatus === "connecting"
          ? "connecting"
          : newStatus === "connected"
            ? "recording"
            : newStatus === "error"
              ? "error"
              : "idle"

      setStatus(mappedStatus)
      setIsRecording(newStatus === "connected")
      options.onStatusChange?.(mappedStatus)
    })

    // Set max recording duration from constants (prevents abuse)
    serviceRef.current.setMaxDuration(VOICE.MAX_RECORDING_SECONDS * 1000)

    // Set up max duration callback
    serviceRef.current.setOnMaxDuration((text) => {
      logger.info("[useDeepgram] Max duration reached, auto-stopping")
      setStatus("idle")
      setIsRecording(false)
      onMaxDurationRef.current?.(text)
    })

    // Set up utterance end callback for live mode auto-send
    serviceRef.current.setOnUtteranceEnd((text) => {
      // If auto-send is disabled, just call the callback directly
      if (options.autoSendEnabled === false) {
        onUtteranceEndRef.current?.(text)
        return
      }

      // Start countdown before auto-send
      if (text.trim()) {
        // Cancel any existing countdown
        if (countdownTimerRef.current) {
          clearTimeout(countdownTimerRef.current)
        }

        pendingTranscriptRef.current = text
        setCountdownActive(true)

        const delayMs = options.autoSendDelayMs ?? 500
        countdownTimerRef.current = setTimeout(() => {
          setCountdownActive(false)
          countdownTimerRef.current = null
          onUtteranceEndRef.current?.(pendingTranscriptRef.current)
          pendingTranscriptRef.current = ""
        }, delayMs)
      }
    })

    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
      }
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current)
      }
      serviceRef.current?.stopTranscription()
    }
  }, [])

  const startRecording = useCallback(async () => {
    if (!serviceRef.current) {
      throw new Error("Deepgram service not initialized")
    }

    setError(null)
    setStatus("connecting")
    recordingStartTimeRef.current = Date.now()

    try {
      await serviceRef.current.startTranscription()
    } catch (err) {
      recordingStartTimeRef.current = null
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      setStatus("error")
      throw error
    }
  }, [])

  const stopRecording = useCallback((): string => {
    if (!serviceRef.current) {
      return ""
    }

    const finalTranscript = serviceRef.current.stopTranscription()
    setStatus("idle")
    setIsRecording(false)

    // Track voice usage if we have a valid recording session
    if (recordingStartTimeRef.current && options.authToken) {
      const durationSeconds = (Date.now() - recordingStartTimeRef.current) / 1000

      // Only track if recording was at least 1 second
      if (durationSeconds >= 1) {
        fetch("/api/usage/voice", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${options.authToken}`,
          },
          body: JSON.stringify({
            sessionId: options.sessionId,
            durationSeconds,
            model: options.model || "nova-2",
            transcriptLength: finalTranscript.length,
          }),
        }).catch((err) => {
          // Non-critical - log but don't throw
          logger.warn("[Voice Usage] Failed to track usage", { error: err })
        })
      }
    }

    recordingStartTimeRef.current = null
    return finalTranscript
  }, [options.authToken, options.sessionId, options.model])

  const resetTranscript = useCallback(() => {
    serviceRef.current?.resetTranscript()
    setTranscript("")
  }, [])

  const clearSentTracker = useCallback(() => {
    serviceRef.current?.clearSentTracker()
  }, [])

  const cancelCountdown = useCallback(() => {
    if (countdownTimerRef.current) {
      clearTimeout(countdownTimerRef.current)
      countdownTimerRef.current = null
    }
    setCountdownActive(false)
    pendingTranscriptRef.current = ""
  }, [])

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      stopRecording()
    } else {
      await startRecording()
    }
  }, [isRecording, startRecording, stopRecording])

  const isConfigured = serviceRef.current?.isConfigured() ?? false

  return {
    isRecording,
    status,
    transcript,
    error,
    countdownActive,
    startRecording,
    stopRecording,
    resetTranscript,
    toggleRecording,
    clearSentTracker,
    cancelCountdown,
    isConfigured,
  }
}

/**
 * Fallback to Web Speech API if Deepgram is not available
 */
export function useVoiceInput(
  options: UseDeepgramOptions & { fallbackToWebSpeech?: boolean } = {}
) {
  const deepgram = useDeepgram(options)

  // Check if we should use Web Speech API as fallback
  const useWebSpeech = options.fallbackToWebSpeech && !deepgram.isConfigured

  const [webSpeechRecording, setWebSpeechRecording] = useState(false)
  const [webSpeechTranscript, setWebSpeechTranscript] = useState("")
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  // Cleanup Web Speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
          recognitionRef.current = null
        } catch {
          // Ignore errors during cleanup
        }
      }
    }
  }, [])

  const startWebSpeechRecording = useCallback(async () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      throw new Error("Speech recognition not supported in this browser")
    }

    // Request microphone permission
    await navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => stream.getTracks().forEach((track) => track.stop()))

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = options.language || "en-US"

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = ""
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      setWebSpeechTranscript(transcript)
      options.onTranscript?.(transcript, event.results[event.results.length - 1]?.isFinal ?? false)
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      logger.error("Web Speech API error", { error: event.error })
      options.onError?.(new Error(`Speech recognition error: ${event.error}`))
      setWebSpeechRecording(false)
    }

    recognition.onend = () => {
      setWebSpeechRecording(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setWebSpeechRecording(true)
  }, [options.language, options.onTranscript, options.onError])

  const stopWebSpeechRecording = useCallback((): string => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setWebSpeechRecording(false)
    return webSpeechTranscript
  }, [webSpeechTranscript])

  // Return appropriate interface based on which service is used
  if (useWebSpeech) {
    return {
      isRecording: webSpeechRecording,
      status: webSpeechRecording ? ("recording" as VoiceStatus) : ("idle" as VoiceStatus),
      transcript: webSpeechTranscript,
      error: null,
      countdownActive: false, // Web Speech doesn't support countdown
      startRecording: startWebSpeechRecording,
      stopRecording: stopWebSpeechRecording,
      resetTranscript: () => setWebSpeechTranscript(""),
      toggleRecording: async () => {
        if (webSpeechRecording) {
          stopWebSpeechRecording()
        } else {
          await startWebSpeechRecording()
        }
      },
      clearSentTracker: () => {}, // No-op for Web Speech API
      cancelCountdown: () => {}, // No-op for Web Speech API
      isConfigured: true,
      provider: "web-speech" as const,
    }
  }

  return {
    ...deepgram,
    provider: "deepgram" as const,
  }
}
