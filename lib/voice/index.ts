/**
 * Voice Module
 *
 * Real-time speech-to-text transcription for interview scenarios
 * Primary: Deepgram (high accuracy, production-ready)
 * Fallback: Web Speech API (browser-native)
 */

export {
  DeepgramVoiceService,
  getDeepgramService,
  createDeepgramService,
  isDeepgramAvailable,
  type DeepgramConfig,
  type TranscriptEvent,
  type DeepgramConnection,
} from './deepgram-service'

export {
  useDeepgram,
  useVoiceInput,
  type UseDeepgramOptions,
  type UseDeepgramReturn,
  type VoiceStatus,
} from './use-deepgram'
