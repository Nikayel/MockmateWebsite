/**
 * Deepgram Voice Service
 *
 * Real-time speech-to-text transcription using Deepgram's API
 * Features:
 * - High accuracy real-time transcription
 * - Support for interim (partial) and final transcripts
 * - WebSocket-based for low latency
 * - Automatic punctuation and formatting
 */

import { logger } from "@/lib/logger"

export interface DeepgramConfig {
  apiKey?: string
  language?: string
  model?: "nova-2" | "nova" | "enhanced" | "base"
  punctuate?: boolean
  interimResults?: boolean
  smartFormat?: boolean
  utteranceEndMs?: number
  vadEvents?: boolean
  endpointing?: number | boolean
}

export interface TranscriptEvent {
  type: "transcript"
  channel: {
    alternatives: Array<{
      transcript: string
      confidence: number
      words?: Array<{
        word: string
        start: number
        end: number
        confidence: number
      }>
    }>
  }
  is_final: boolean
  speech_final: boolean
  from_finalize?: boolean
}

export interface DeepgramConnection {
  socket: WebSocket | null
  isConnected: boolean
  isRecording: boolean
  mediaRecorder: MediaRecorder | null
  audioContext: AudioContext | null
  mediaStream: MediaStream | null
}

type TranscriptCallback = (transcript: string, isFinal: boolean) => void
type ErrorCallback = (error: Error) => void
type StatusCallback = (status: "connecting" | "connected" | "disconnected" | "error") => void
type UtteranceEndCallback = (transcript: string) => void
type MaxDurationCallback = (transcript: string) => void

/**
 * Deepgram Voice Service
 *
 * Provides real-time speech-to-text transcription for interview scenarios
 */
export class DeepgramVoiceService {
  private config: DeepgramConfig
  private connection: DeepgramConnection
  private onTranscript: TranscriptCallback | null = null
  private onError: ErrorCallback | null = null
  private onStatus: StatusCallback | null = null
  private onUtteranceEnd: UtteranceEndCallback | null = null
  private onMaxDuration: MaxDurationCallback | null = null
  private accumulatedTranscript: string = ""
  private keepAliveInterval: ReturnType<typeof setInterval> | null = null
  private maxDurationTimeout: ReturnType<typeof setTimeout> | null = null
  private lastSentTranscript: string = ""
  private maxDurationMs: number = 180000 // 3 minutes default
  private authToken: string = ""
  private transcriptMuted: boolean = false

  constructor(config: DeepgramConfig = {}) {
    this.config = {
      apiKey: config.apiKey || "",
      language: config.language || "en-US",
      model: config.model || "nova-2",
      punctuate: config.punctuate !== false,
      interimResults: config.interimResults !== false,
      smartFormat: config.smartFormat !== false,
      utteranceEndMs: config.utteranceEndMs || 1000,
      vadEvents: config.vadEvents !== false,
      endpointing: config.endpointing ?? 300,
    }

    this.connection = {
      socket: null,
      isConnected: false,
      isRecording: false,
      mediaRecorder: null,
      audioContext: null,
      mediaStream: null,
    }
  }

  /**
   * Set the auth token for fetching the API key from the server
   */
  setAuthToken(token: string): void {
    this.authToken = token
  }

  /**
   * Fetch the Deepgram API key from the server-side proxy
   * This avoids exposing the key in client-side bundles
   */
  async fetchApiKey(): Promise<void> {
    if (this.config.apiKey) return

    if (!this.authToken) {
      throw new Error("Auth token required to fetch Deepgram API key")
    }

    const response = await fetch("/api/voice/token", {
      headers: { Authorization: `Bearer ${this.authToken}` },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch voice token")
    }

    const data = await response.json()
    this.config.apiKey = data.apiKey
  }

  /**
   * Check if Deepgram is configured (has API key or can fetch one)
   */
  isConfigured(): boolean {
    return !!this.config.apiKey || !!this.authToken
  }

  /**
   * Set callback for transcript events
   */
  setOnTranscript(callback: TranscriptCallback): void {
    this.onTranscript = callback
  }

  /**
   * Set callback for error events
   */
  setOnError(callback: ErrorCallback): void {
    this.onError = callback
  }

  /**
   * Set callback for status events
   */
  setOnStatus(callback: StatusCallback): void {
    this.onStatus = callback
  }

  /**
   * Set callback for utterance end events (when user stops speaking)
   * This is useful for live mode auto-send functionality
   */
  setOnUtteranceEnd(callback: UtteranceEndCallback): void {
    this.onUtteranceEnd = callback
  }

  /**
   * Set callback for when max recording duration is reached
   * Recording will be automatically stopped and this callback fired
   */
  setOnMaxDuration(callback: MaxDurationCallback): void {
    this.onMaxDuration = callback
  }

  /**
   * Set maximum recording duration in milliseconds
   */
  setMaxDuration(ms: number): void {
    this.maxDurationMs = ms
  }

  /**
   * Build Deepgram WebSocket URL with options
   */
  private buildWebSocketUrl(): string {
    const params = new URLSearchParams({
      model: this.config.model || "nova-2",
      language: this.config.language || "en-US",
      punctuate: String(this.config.punctuate),
      interim_results: String(this.config.interimResults),
      smart_format: String(this.config.smartFormat),
      utterance_end_ms: String(this.config.utteranceEndMs),
      vad_events: String(this.config.vadEvents),
    })

    if (this.config.endpointing !== false) {
      params.set("endpointing", String(this.config.endpointing))
    }

    return `wss://api.deepgram.com/v1/listen?${params.toString()}`
  }

  /**
   * Start real-time transcription
   */
  async startTranscription(): Promise<void> {
    // Fetch API key from server if not already set
    await this.fetchApiKey()

    if (!this.config.apiKey) {
      throw new Error("Deepgram API key not configured")
    }

    if (this.connection.isRecording) {
      return
    }

    this.transcriptMuted = false
    this.onStatus?.("connecting")

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })

      this.connection.mediaStream = stream

      // Listen for stream/track ending (e.g., mic unplugged, permission revoked)
      stream.getTracks().forEach((track) => {
        track.onended = () => {
          logger.warn("[Deepgram] Audio track ended unexpectedly")
          this.onError?.(new Error("Microphone disconnected. Please reconnect and try again."))
          this.cleanup()
          this.onStatus?.("disconnected")
        }
      })

      // Create WebSocket connection to Deepgram
      logger.info("[Deepgram] Connecting with API key", {
        apiKeyPrefix: this.config.apiKey?.substring(0, 8) + "...",
      })
      const ws = new WebSocket(this.buildWebSocketUrl(), ["token", this.config.apiKey!])

      ws.onopen = () => {
        logger.info("[Deepgram] WebSocket connected")
        this.connection.isConnected = true
        this.connection.isRecording = true
        this.onStatus?.("connected")

        // Start sending audio data
        this.startAudioCapture(stream, ws)

        // Keep-alive ping every 8 seconds
        this.keepAliveInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "KeepAlive" }))
          }
        }, 8000)

        // Set max duration timeout to prevent abuse (e.g., playing music indefinitely)
        this.maxDurationTimeout = setTimeout(() => {
          logger.info("[Deepgram] Max recording duration reached, stopping automatically")
          const transcript = this.accumulatedTranscript
          this.onMaxDuration?.(transcript)
          this.stopTranscription()
        }, this.maxDurationMs)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          if (data.type === "Results" || data.channel) {
            const transcript = data.channel?.alternatives?.[0]?.transcript || ""
            const isFinal = data.is_final || data.speech_final

            if (transcript && !this.transcriptMuted) {
              if (isFinal) {
                this.accumulatedTranscript += (this.accumulatedTranscript ? " " : "") + transcript
                this.onTranscript?.(this.accumulatedTranscript, true)
              } else {
                // Show interim result with accumulated + current
                const fullTranscript =
                  this.accumulatedTranscript + (this.accumulatedTranscript ? " " : "") + transcript
                this.onTranscript?.(fullTranscript, false)
              }
            }
          } else if (data.type === "UtteranceEnd" && !this.transcriptMuted) {
            // Speech pause detected - this is the key event for live mode auto-send
            logger.info("[Deepgram] Utterance end detected")
            if (
              this.accumulatedTranscript &&
              this.accumulatedTranscript !== this.lastSentTranscript
            ) {
              const newContent = this.accumulatedTranscript
                .substring(this.lastSentTranscript.length)
                .trim()
              if (newContent) {
                // Call utterance end callback with only the NEW content since last send
                this.onUtteranceEnd?.(newContent)
                // Track what we've sent to avoid duplicates
                this.lastSentTranscript = this.accumulatedTranscript
              }
              this.onTranscript?.(this.accumulatedTranscript, true)
            }
          }
        } catch (error) {
          logger.error("[Deepgram] Error parsing message", { error })
        }
      }

      ws.onerror = (event) => {
        logger.error("[Deepgram] WebSocket error", { event })
        this.onStatus?.("error")
        this.onError?.(new Error("WebSocket connection error"))
      }

      ws.onclose = (event) => {
        logger.info("[Deepgram] WebSocket closed", { code: event.code, reason: event.reason })
        this.cleanup()
        this.onStatus?.("disconnected")
      }

      this.connection.socket = ws
    } catch (error) {
      logger.error("[Deepgram] Error starting transcription", { error })
      this.cleanup()
      this.onStatus?.("error")
      throw error
    }
  }

  /**
   * Start capturing and sending audio
   */
  private startAudioCapture(stream: MediaStream, ws: WebSocket): void {
    try {
      // Check if stream is active - this can happen if mic permission was revoked
      // or if there's a hardware issue
      if (!stream || stream.active === false) {
        logger.warn("[Deepgram] MediaStream became inactive - requesting new stream")
        // Don't throw - let the caller handle reconnection
        this.onError?.(
          new Error(
            "Microphone stream became inactive. Please check your microphone permissions and try again."
          )
        )
        this.onStatus?.("error")
        return
      }

      // Verify we have audio tracks
      const audioTracks = stream.getAudioTracks()
      if (audioTracks.length === 0) {
        logger.warn("[Deepgram] No audio tracks in MediaStream")
        this.onError?.(
          new Error("No microphone detected. Please ensure a microphone is connected.")
        )
        this.onStatus?.("error")
        return
      }

      // Log track status for debugging
      logger.info("[Deepgram] Audio track status", {
        readyState: audioTracks[0].readyState,
        enabled: audioTracks[0].enabled,
      })

      // Check if MediaRecorder is supported
      if (typeof MediaRecorder === "undefined") {
        throw new Error("MediaRecorder is not supported in this browser")
      }

      // Find a supported mime type
      const supportedTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
        "audio/mpeg",
      ]

      let mimeType: string | undefined
      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type
          break
        }
      }

      if (!mimeType) {
        throw new Error("No supported audio mime type found")
      }

      // Create MediaRecorder with error handling
      let mediaRecorder: MediaRecorder
      try {
        mediaRecorder = new MediaRecorder(stream, {
          mimeType,
          audioBitsPerSecond: 16000,
        })
      } catch (error) {
        // Fallback: try without options
        logger.warn("[Deepgram] Failed to create MediaRecorder with options, trying without", {
          error,
        })
        mediaRecorder = new MediaRecorder(stream)
      }

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          ws.send(event.data)
        }
      }

      mediaRecorder.onerror = (event) => {
        logger.error("[Deepgram] MediaRecorder error", { event })
        this.onError?.(new Error("MediaRecorder error occurred"))
      }

      // Check MediaRecorder state before starting
      if (mediaRecorder.state === "recording") {
        logger.warn("[Deepgram] MediaRecorder already recording")
        return
      }

      // Capture audio in 100ms chunks for low latency
      // Some browsers may not support timeslice parameter, so wrap in try-catch
      try {
        mediaRecorder.start(100)
      } catch (error) {
        // Fallback: start without timeslice
        logger.warn("[Deepgram] Failed to start with timeslice, trying without", { error })
        mediaRecorder.start()
      }

      this.connection.mediaRecorder = mediaRecorder
      logger.info("[Deepgram] Audio capture started", { mimeType })
    } catch (error) {
      logger.error("[Deepgram] Error starting audio capture", { error })
      this.onError?.(error instanceof Error ? error : new Error("Failed to start audio capture"))
      throw error
    }
  }

  /**
   * Stop transcription
   */
  stopTranscription(): string {
    logger.info("[Deepgram] Stopping transcription")
    this.transcriptMuted = true

    // Send close stream message
    if (this.connection.socket?.readyState === WebSocket.OPEN) {
      this.connection.socket.send(JSON.stringify({ type: "CloseStream" }))
    }

    this.cleanup()

    const finalTranscript = this.accumulatedTranscript
    this.accumulatedTranscript = ""
    this.lastSentTranscript = ""

    return finalTranscript
  }

  /**
   * Clear the sent transcript tracker (used after sending a message in live mode)
   * This allows the next utterance to be detected as new content
   */
  clearSentTracker(): void {
    this.lastSentTranscript = this.accumulatedTranscript
  }

  /**
   * Reset accumulated transcript
   */
  resetTranscript(): void {
    this.transcriptMuted = true
    this.accumulatedTranscript = ""
    this.lastSentTranscript = ""
  }

  /**
   * Get current accumulated transcript
   */
  getTranscript(): string {
    return this.accumulatedTranscript
  }

  /**
   * Check if currently recording
   */
  isRecording(): boolean {
    return this.connection.isRecording
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    // Clear keep-alive interval
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval)
      this.keepAliveInterval = null
    }

    // Clear max duration timeout
    if (this.maxDurationTimeout) {
      clearTimeout(this.maxDurationTimeout)
      this.maxDurationTimeout = null
    }

    // Stop media recorder
    if (this.connection.mediaRecorder?.state !== "inactive") {
      try {
        this.connection.mediaRecorder?.stop()
      } catch {}
    }
    this.connection.mediaRecorder = null

    // Stop media stream tracks
    this.connection.mediaStream?.getTracks().forEach((track) => track.stop())
    this.connection.mediaStream = null

    // Close audio context
    if (this.connection.audioContext?.state !== "closed") {
      try {
        this.connection.audioContext?.close()
      } catch {}
    }
    this.connection.audioContext = null

    // Close WebSocket
    if (this.connection.socket) {
      try {
        this.connection.socket.close()
      } catch {}
      this.connection.socket = null
    }

    this.connection.isConnected = false
    this.connection.isRecording = false

    // Notify listeners that recording has stopped
    this.onStatus?.("disconnected")
  }
}

/**
 * Default Deepgram service instance
 */
let defaultDeepgramService: DeepgramVoiceService | null = null

export function getDeepgramService(config?: DeepgramConfig): DeepgramVoiceService {
  if (!defaultDeepgramService) {
    defaultDeepgramService = new DeepgramVoiceService(config)
  }
  return defaultDeepgramService
}

/**
 * Create a new Deepgram service instance
 */
export function createDeepgramService(config?: DeepgramConfig): DeepgramVoiceService {
  return new DeepgramVoiceService(config)
}

/**
 * Check if Deepgram is available.
 * On the server, checks DEEPGRAM_API_KEY; on the client, always true
 * (the actual key is fetched via /api/voice/token at runtime).
 */
export function isDeepgramAvailable(): boolean {
  if (typeof window !== "undefined") return true
  return !!process.env.DEEPGRAM_API_KEY
}
