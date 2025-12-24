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

export interface DeepgramConfig {
  apiKey?: string
  language?: string
  model?: 'nova-2' | 'nova' | 'enhanced' | 'base'
  punctuate?: boolean
  interimResults?: boolean
  smartFormat?: boolean
  utteranceEndMs?: number
  vadEvents?: boolean
  endpointing?: number | boolean
}

export interface TranscriptEvent {
  type: 'transcript'
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
type StatusCallback = (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void
type UtteranceEndCallback = (transcript: string) => void

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
  private accumulatedTranscript: string = ''
  private keepAliveInterval: ReturnType<typeof setInterval> | null = null
  private utteranceBuffer: string = ''
  private lastSentTranscript: string = ''

  constructor(config: DeepgramConfig = {}) {
    this.config = {
      apiKey: config.apiKey || process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY || '',
      language: config.language || 'en-US',
      model: config.model || 'nova-2',
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
   * Check if Deepgram is configured
   */
  isConfigured(): boolean {
    return !!this.config.apiKey && this.config.apiKey.length > 0
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
   * Build Deepgram WebSocket URL with options
   */
  private buildWebSocketUrl(): string {
    const params = new URLSearchParams({
      model: this.config.model || 'nova-2',
      language: this.config.language || 'en-US',
      punctuate: String(this.config.punctuate),
      interim_results: String(this.config.interimResults),
      smart_format: String(this.config.smartFormat),
      utterance_end_ms: String(this.config.utteranceEndMs),
      vad_events: String(this.config.vadEvents),
    })

    if (this.config.endpointing !== false) {
      params.set('endpointing', String(this.config.endpointing))
    }

    return `wss://api.deepgram.com/v1/listen?${params.toString()}`
  }

  /**
   * Start real-time transcription
   */
  async startTranscription(): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error('Deepgram API key not configured')
    }

    if (this.connection.isRecording) {
      console.warn('[Deepgram] Already recording')
      return
    }

    this.onStatus?.('connecting')

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        }
      })

      this.connection.mediaStream = stream

      // Create WebSocket connection to Deepgram
      const ws = new WebSocket(this.buildWebSocketUrl(), ['token', this.config.apiKey!])

      ws.onopen = () => {
        console.log('[Deepgram] WebSocket connected')
        this.connection.isConnected = true
        this.connection.isRecording = true
        this.onStatus?.('connected')

        // Start sending audio data
        this.startAudioCapture(stream, ws)

        // Keep-alive ping every 8 seconds
        this.keepAliveInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'KeepAlive' }))
          }
        }, 8000)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          if (data.type === 'Results' || data.channel) {
            const transcript = data.channel?.alternatives?.[0]?.transcript || ''
            const isFinal = data.is_final || data.speech_final

            if (transcript) {
              if (isFinal) {
                this.accumulatedTranscript += (this.accumulatedTranscript ? ' ' : '') + transcript
                // Track what's new since last utterance end
                this.utteranceBuffer = this.accumulatedTranscript.substring(this.lastSentTranscript.length).trim()
                this.onTranscript?.(this.accumulatedTranscript, true)
              } else {
                // Show interim result with accumulated + current
                const fullTranscript = this.accumulatedTranscript +
                  (this.accumulatedTranscript ? ' ' : '') + transcript
                this.onTranscript?.(fullTranscript, false)
              }
            }
          } else if (data.type === 'UtteranceEnd') {
            // Speech pause detected - this is the key event for live mode auto-send
            console.log('[Deepgram] Utterance end detected')
            if (this.accumulatedTranscript && this.accumulatedTranscript !== this.lastSentTranscript) {
              const newContent = this.accumulatedTranscript.substring(this.lastSentTranscript.length).trim()
              if (newContent) {
                // Call utterance end callback with the full accumulated transcript
                this.onUtteranceEnd?.(this.accumulatedTranscript)
                // Track what we've sent to avoid duplicates
                this.lastSentTranscript = this.accumulatedTranscript
              }
              this.onTranscript?.(this.accumulatedTranscript, true)
            }
          }
        } catch (error) {
          console.error('[Deepgram] Error parsing message:', error)
        }
      }

      ws.onerror = (event) => {
        console.error('[Deepgram] WebSocket error:', event)
        this.onStatus?.('error')
        this.onError?.(new Error('WebSocket connection error'))
      }

      ws.onclose = (event) => {
        console.log('[Deepgram] WebSocket closed:', event.code, event.reason)
        this.cleanup()
        this.onStatus?.('disconnected')
      }

      this.connection.socket = ws

    } catch (error) {
      console.error('[Deepgram] Error starting transcription:', error)
      this.cleanup()
      this.onStatus?.('error')
      throw error
    }
  }

  /**
   * Start capturing and sending audio
   */
  private startAudioCapture(stream: MediaStream, ws: WebSocket): void {
    // Use MediaRecorder for audio capture
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm'

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType,
      audioBitsPerSecond: 16000,
    })

    mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
        ws.send(event.data)
      }
    }

    // Capture audio in 100ms chunks for low latency
    mediaRecorder.start(100)
    this.connection.mediaRecorder = mediaRecorder

    console.log('[Deepgram] Audio capture started')
  }

  /**
   * Stop transcription
   */
  stopTranscription(): string {
    console.log('[Deepgram] Stopping transcription')

    // Send close stream message
    if (this.connection.socket?.readyState === WebSocket.OPEN) {
      this.connection.socket.send(JSON.stringify({ type: 'CloseStream' }))
    }

    this.cleanup()

    const finalTranscript = this.accumulatedTranscript
    this.accumulatedTranscript = ''
    this.utteranceBuffer = ''
    this.lastSentTranscript = ''

    return finalTranscript
  }

  /**
   * Clear the sent transcript tracker (used after sending a message in live mode)
   * This allows the next utterance to be detected as new content
   */
  clearSentTracker(): void {
    this.lastSentTranscript = this.accumulatedTranscript
    this.utteranceBuffer = ''
  }

  /**
   * Reset accumulated transcript
   */
  resetTranscript(): void {
    this.accumulatedTranscript = ''
    this.utteranceBuffer = ''
    this.lastSentTranscript = ''
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

    // Stop media recorder
    if (this.connection.mediaRecorder?.state !== 'inactive') {
      try {
        this.connection.mediaRecorder?.stop()
      } catch {}
    }
    this.connection.mediaRecorder = null

    // Stop media stream tracks
    this.connection.mediaStream?.getTracks().forEach(track => track.stop())
    this.connection.mediaStream = null

    // Close audio context
    if (this.connection.audioContext?.state !== 'closed') {
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
 * Check if Deepgram is available
 */
export function isDeepgramAvailable(): boolean {
  return !!process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY
}
