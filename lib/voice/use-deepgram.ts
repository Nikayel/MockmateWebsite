/**
 * useDeepgram Hook
 *
 * React hook for real-time speech-to-text transcription using Deepgram
 * Provides easy integration with interview components
 */

"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { DeepgramVoiceService, DeepgramConfig, DEFAULT_DEEPGRAM_MODEL } from "./deepgram-service"
import { repairInterviewTranscript } from "./transcript-repair"
import { classifyVoiceError, type VoiceUnavailableReason } from "./voice-availability"
import { VOICE } from "@/lib/constants"
import { logger } from "@/lib/logger"
import { trackEvent } from "@/lib/analytics"

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
  /**
   * How to get a Firebase ID token. Required: without it the token grant cannot be authenticated,
   * the service reports itself unconfigured, and voice is unavailable for the session. There is no
   * fallback recognizer any more, deliberately - see useVoiceInput.
   *
   * A getter rather than a string so the token is always fresh; see `setAuthTokenProvider`.
   */
  getAuthToken?: () => Promise<string | null>
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
  /**
   * Whether a credential source EXISTS. Not whether voice will work: this is
   * `!!apiKey || !!getAuthToken`, and getAuthToken is a function the interview
   * page always supplies, so it stays true even for a guest whose token
   * resolves to null. Use `unavailableReason` to decide what to show.
   */
  isConfigured: boolean
  /**
   * Why voice is not usable, or null if nothing has failed yet.
   *
   * Set when a start attempt fails and when the stream dies mid-session, since
   * those are the only moments the truth is actually known.
   */
  unavailableReason: VoiceUnavailableReason | null
}

/** Body of a single POST to /api/usage/voice. */
export interface VoiceUsagePayload {
  sessionId?: string
  durationSeconds: number
  model: string
  transcriptLength: number
}

/**
 * Build the usage report for one recording session, or null when there is nothing worth
 * reporting.
 *
 * Duration is clamped to the recording ceiling the service enforces on itself
 * (`setMaxDuration`): a session that ended on its own (max duration reached, socket dropped) is
 * only discovered when the component unmounts, and the wall clock since it started is not what
 * Deepgram actually streamed.
 */
export function buildVoiceUsagePayload(params: {
  startedAt: number
  endedAt: number
  transcript: string
  sessionId?: string
  model?: string
}): VoiceUsagePayload | null {
  const elapsedSeconds = (params.endedAt - params.startedAt) / 1000
  const durationSeconds = Math.min(elapsedSeconds, VOICE.MAX_RECORDING_SECONDS)

  // Written as a negated comparison so NaN (a corrupt start time) fails closed.
  if (!(durationSeconds >= 1)) return null

  return {
    sessionId: params.sessionId,
    durationSeconds,
    model: params.model || DEFAULT_DEEPGRAM_MODEL,
    transcriptLength: params.transcript.length,
  }
}

/**
 * Hook for using Deepgram real-time transcription
 */
export function useDeepgram(options: UseDeepgramOptions = {}): UseDeepgramReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [status, setStatus] = useState<VoiceStatus>("idle")
  const [transcript, setTranscript] = useState("")
  const [error, setError] = useState<Error | null>(null)
  const [unavailableReason, setUnavailableReason] = useState<VoiceUnavailableReason | null>(null)
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
  // Held in a ref like the callbacks above: callers pass an inline arrow, so depending on its
  // identity would tear down and rebuild the service (and its socket) on every render.
  const getAuthTokenRef = useRef(options.getAuthToken)
  onUtteranceEndRef.current = options.onUtteranceEnd
  onTranscriptRef.current = options.onTranscript
  onMaxDurationRef.current = options.onMaxDuration
  getAuthTokenRef.current = options.getAuthToken

  // One report per recording session. `stopRecording` and the unmount cleanup can both run for
  // the same audio (stop, then navigate away), and Deepgram must not be billed twice for it.
  const usageReportedRef = useRef(false)

  /**
   * Report the session's Deepgram minutes.
   *
   * Held in a ref rather than being a `useCallback` because the unmount cleanup runs the closure
   * captured at mount: reading through the ref means a session ended by navigation or a closed tab
   * reports the CURRENT sessionId and model. Before this existed the report lived only inside
   * `stopRecording`, so every session that ended any other way streamed real audio and recorded
   * nothing.
   */
  const reportUsageRef = useRef<(finalTranscript: string) => void>(() => {})
  reportUsageRef.current = (finalTranscript: string) => {
    const startedAt = recordingStartTimeRef.current
    if (usageReportedRef.current || !startedAt || !getAuthTokenRef.current) return

    const payload = buildVoiceUsagePayload({
      startedAt,
      endedAt: Date.now(),
      transcript: finalTranscript,
      sessionId: options.sessionId,
      model: options.model,
    })
    if (!payload) return

    // Claimed before the await so a synchronous second caller cannot slip through.
    usageReportedRef.current = true

    // Resolve the token at report time rather than capturing one: a long interview can outlive
    // the token that was current when recording started.
    void (async () => {
      try {
        const authToken = await getAuthTokenRef.current?.()
        if (!authToken) return
        await fetch("/api/usage/voice", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          // The unmount path fires while the page may already be tearing down, and keepalive lets
          // the request outlive the document. sendBeacon cannot be used instead: the route
          // requires an Authorization header and beacons cannot carry one.
          keepalive: true,
          body: JSON.stringify(payload),
        })
      } catch (err) {
        // Non-critical - log but don't throw
        logger.warn("[Voice Usage] Failed to track usage", { error: err })
      }
    })()
  }

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
      // Undefined falls back to the default interview vocabulary in the service.
      keyterms: options.keyterms,
    })

    // Pass the token provider so the service can grant itself a Deepgram access token. Read
    // through the ref at call time, so the service sees the current getter without being rebuilt.
    service.setAuthTokenProvider(
      options.getAuthToken ? () => getAuthTokenRef.current?.() ?? Promise.resolve(null) : null
    )

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
      // Mid-session failures land here rather than in startRecording's catch:
      // an unplugged microphone or a dropped socket happens long after the
      // start call resolved, and without this the UI would keep showing a live
      // recorder for a stream that has already died.
      const midSessionReason = classifyVoiceError(err)
      setUnavailableReason(midSessionReason)
      trackEvent("voice_unavailable", { reason: midSessionReason, at: "mid-session" })
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
      // The service stops itself right after this callback and callers gate `stopRecording` on
      // `isRecording`, so this is the only exit this session gets.
      reportUsageRef.current(text)
      recordingStartTimeRef.current = null
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
      const finalTranscript = serviceRef.current?.stopTranscription() ?? ""
      // Fire and forget: a cleanup cannot await, and the POST is keepalive so it survives the
      // navigation that triggered this.
      reportUsageRef.current(finalTranscript)
    }
  }, [])

  const startRecording = useCallback(async () => {
    if (!serviceRef.current) {
      throw new Error("Deepgram service not initialized")
    }

    setError(null)
    setUnavailableReason(null)
    setStatus("connecting")
    recordingStartTimeRef.current = Date.now()
    usageReportedRef.current = false

    try {
      await serviceRef.current.startTranscription()
    } catch (err) {
      recordingStartTimeRef.current = null
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      const reason = classifyVoiceError(err)
      setUnavailableReason(reason)
      // Records the DECISION, not just the error. Nothing else counts how often
      // voice is unusable, so today the answer is unknowable.
      trackEvent("voice_unavailable", { reason, at: "start" })
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
    reportUsageRef.current(finalTranscript)

    recordingStartTimeRef.current = null
    return finalTranscript
  }, [])

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
    unavailableReason,
  }
}

/**
 * The interview's voice entry point. Deepgram, or nothing.
 *
 * This used to accept `fallbackToWebSpeech` and quietly switch to the browser's
 * SpeechRecognition when Deepgram reported itself unconfigured. That option is
 * gone, and the browser path with it, because falling back was wrong on three
 * counts and only one of them was quality.
 *
 * The disclosure problem is the serious one. /legal tells users that "audio is
 * streamed live to Deepgram" and names Deepgram as the only voice
 * subprocessor. Chrome implements SpeechRecognition by streaming microphone
 * audio to Google. So the fallback sent a user's voice to a company our own
 * privacy page does not list, without telling them, on a path they could not
 * see or decline.
 *
 * The quality problem is that the browser recognizer has no keyterm vocabulary
 * and no notion of this domain, so it renders "O of n log n" as "o off and log
 * in" - and that transcript is not just displayed, it is fed to the interviewer
 * and to scoring. A candidate was being graded on a mangled record of what they
 * said.
 *
 * And the failure was invisible. Nothing threw, a transcript still appeared,
 * and the only symptom was wording nobody was reading closely. It shipped
 * undetected twice.
 *
 * So Deepgram is now the only path. When it is unavailable, startRecording sets
 * an error and throws rather than silently substituting a different vendor:
 * voice being unavailable is a state the interview can show and the candidate
 * can work around by typing. Being transcribed by an undisclosed third party is
 * not.
 */
export function useVoiceInput(options: UseDeepgramOptions = {}) {
  const deepgram = useDeepgram(options)

  // Voice is dead, not degraded, when this fires. Worth a log line: the old
  // silent downgrade is exactly how this went unnoticed for so long.
  const warned = useRef(false)
  useEffect(() => {
    if (!deepgram.isConfigured && !warned.current) {
      warned.current = true
      logger.warn("Voice unavailable: Deepgram reported itself unconfigured", {
        hasAuthTokenGetter: Boolean(options.getAuthToken),
        sessionId: options.sessionId,
      })
    }
  }, [deepgram.isConfigured, options.getAuthToken, options.sessionId])

  return {
    ...deepgram,
    provider: "deepgram" as const,
  }
}
