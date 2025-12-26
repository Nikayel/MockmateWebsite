/**
 * useDeepgram Hook
 *
 * React hook for real-time speech-to-text transcription using Deepgram
 * Provides easy integration with interview components
 */

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { DeepgramVoiceService, DeepgramConfig } from './deepgram-service'

export type VoiceStatus = 'idle' | 'connecting' | 'recording' | 'error'

export interface UseDeepgramOptions extends DeepgramConfig {
  onTranscript?: (transcript: string, isFinal: boolean) => void
  onError?: (error: Error) => void
  onStatusChange?: (status: VoiceStatus) => void
  onUtteranceEnd?: (transcript: string) => void
  autoSubmitOnSilence?: boolean
  silenceThresholdMs?: number
  // Usage tracking
  sessionId?: string
  authToken?: string  // Firebase auth token for tracking API
}

export interface UseDeepgramReturn {
  // State
  isRecording: boolean
  status: VoiceStatus
  transcript: string
  error: Error | null

  // Actions
  startRecording: () => Promise<void>
  stopRecording: () => string
  resetTranscript: () => void
  toggleRecording: () => Promise<void>
  clearSentTracker: () => void

  // Info
  isConfigured: boolean
}

/**
 * Hook for using Deepgram real-time transcription
 */
export function useDeepgram(options: UseDeepgramOptions = {}): UseDeepgramReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [status, setStatus] = useState<VoiceStatus>('idle')
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<Error | null>(null)

  const serviceRef = useRef<DeepgramVoiceService | null>(null)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const recordingStartTimeRef = useRef<number | null>(null)

  // Initialize service on mount
  useEffect(() => {
    serviceRef.current = new DeepgramVoiceService({
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

    // Set up callbacks
    serviceRef.current.setOnTranscript((text, isFinal) => {
      setTranscript(text)
      options.onTranscript?.(text, isFinal)

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
        newStatus === 'connecting' ? 'connecting' :
        newStatus === 'connected' ? 'recording' :
        newStatus === 'error' ? 'error' : 'idle'

      setStatus(mappedStatus)
      setIsRecording(newStatus === 'connected')
      options.onStatusChange?.(mappedStatus)
    })

    // Set up utterance end callback for live mode auto-send
    serviceRef.current.setOnUtteranceEnd((text) => {
      options.onUtteranceEnd?.(text)
    })

    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
      }
      serviceRef.current?.stopTranscription()
    }
  }, [])

  const startRecording = useCallback(async () => {
    if (!serviceRef.current) {
      throw new Error('Deepgram service not initialized')
    }

    setError(null)
    setStatus('connecting')
    recordingStartTimeRef.current = Date.now()

    try {
      await serviceRef.current.startTranscription()
    } catch (err) {
      recordingStartTimeRef.current = null
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      setStatus('error')
      throw error
    }
  }, [])

  const stopRecording = useCallback((): string => {
    if (!serviceRef.current) {
      return ''
    }

    const finalTranscript = serviceRef.current.stopTranscription()
    setStatus('idle')
    setIsRecording(false)

    // Track voice usage if we have a valid recording session
    if (recordingStartTimeRef.current && options.authToken) {
      const durationSeconds = (Date.now() - recordingStartTimeRef.current) / 1000

      // Only track if recording was at least 1 second
      if (durationSeconds >= 1) {
        fetch('/api/usage/voice', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${options.authToken}`,
          },
          body: JSON.stringify({
            sessionId: options.sessionId,
            durationSeconds,
            model: options.model || 'nova-2',
            transcriptLength: finalTranscript.length,
          }),
        }).catch((err) => {
          // Non-critical - log but don't throw
          console.warn('[Voice Usage] Failed to track usage:', err)
        })
      }
    }

    recordingStartTimeRef.current = null
    return finalTranscript
  }, [options.authToken, options.sessionId, options.model])

  const resetTranscript = useCallback(() => {
    serviceRef.current?.resetTranscript()
    setTranscript('')
  }, [])

  const clearSentTracker = useCallback(() => {
    serviceRef.current?.clearSentTracker()
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
    startRecording,
    stopRecording,
    resetTranscript,
    toggleRecording,
    clearSentTracker,
    isConfigured,
  }
}

/**
 * Fallback to Web Speech API if Deepgram is not available
 */
export function useVoiceInput(options: UseDeepgramOptions & { fallbackToWebSpeech?: boolean } = {}) {
  const deepgram = useDeepgram(options)

  // Check if we should use Web Speech API as fallback
  const useWebSpeech = options.fallbackToWebSpeech && !deepgram.isConfigured

  const [webSpeechRecording, setWebSpeechRecording] = useState(false)
  const [webSpeechTranscript, setWebSpeechTranscript] = useState('')
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const startWebSpeechRecording = useCallback(async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      throw new Error('Speech recognition not supported in this browser')
    }

    // Request microphone permission
    await navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => stream.getTracks().forEach(track => track.stop()))

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = options.language || 'en-US'

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = ''
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      setWebSpeechTranscript(transcript)
      options.onTranscript?.(transcript, event.results[event.results.length - 1]?.isFinal ?? false)
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Web Speech API error:', event.error)
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
      status: webSpeechRecording ? 'recording' as VoiceStatus : 'idle' as VoiceStatus,
      transcript: webSpeechTranscript,
      error: null,
      startRecording: startWebSpeechRecording,
      stopRecording: stopWebSpeechRecording,
      resetTranscript: () => setWebSpeechTranscript(''),
      toggleRecording: async () => {
        if (webSpeechRecording) {
          stopWebSpeechRecording()
        } else {
          await startWebSpeechRecording()
        }
      },
      clearSentTracker: () => {}, // No-op for Web Speech API
      isConfigured: true,
      provider: 'web-speech' as const,
    }
  }

  return {
    ...deepgram,
    provider: 'deepgram' as const,
  }
}
