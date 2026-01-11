/**
 * Usage Event Types
 *
 * Segregated interfaces following Interface Segregation Principle (ISP).
 * Each event type has its own specific interface instead of one fat interface
 * with many optional fields.
 */

import { Timestamp } from 'firebase-admin/firestore'

// =============================================================================
// Event Type Definitions
// =============================================================================

export type UsageEventType =
  | 'chat_message'
  | 'feedback_generation'
  | 'code_execution'
  | 'hint_request'
  | 'session_start'
  | 'session_end'
  | 'voice_transcription'
  | 'embedding_generation'

// =============================================================================
// Base Event Interface
// =============================================================================

/**
 * Base interface for all usage events
 * Contains only the fields common to all event types
 */
export interface BaseUsageEvent {
  id?: string
  userId: string
  eventType: UsageEventType
  sessionId?: string
  createdAt: Date | Timestamp
  metadata?: Record<string, unknown>
}

// =============================================================================
// AI/LLM Event Interface
// =============================================================================

/**
 * Event interface for AI/LLM API calls
 * Used by: chat_message, feedback_generation, hint_request
 */
export interface AIUsageEvent extends BaseUsageEvent {
  eventType: 'chat_message' | 'feedback_generation' | 'hint_request'
  provider: string
  model: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  cost: number
  latencyMs?: number
  cached?: boolean
  isExactTokenCount?: boolean
  // Context for analytics
  pattern?: string
  difficulty?: string
  scenarioId?: string
  scenarioTitle?: string
}

// =============================================================================
// Code Execution Event Interface
// =============================================================================

/**
 * Event interface for code execution
 */
export interface CodeExecutionEvent extends BaseUsageEvent {
  eventType: 'code_execution'
  language: string
  executionTimeMs: number
  success: boolean
  testsPassed?: number
  testsFailed?: number
}

// =============================================================================
// Session Event Interface
// =============================================================================

/**
 * Event interface for session lifecycle
 */
export interface SessionEvent extends BaseUsageEvent {
  eventType: 'session_start' | 'session_end'
  sessionId: string
  scenarioId?: string
  scenarioTitle?: string
  pattern?: string
  difficulty?: string
  // Only for session_end
  durationMs?: number
  completed?: boolean
  score?: number
}

// =============================================================================
// Voice Event Interface
// =============================================================================

/**
 * Event interface for voice transcription
 */
export interface VoiceUsageEvent extends BaseUsageEvent {
  eventType: 'voice_transcription'
  provider: string
  model: string
  durationSeconds: number
  cost: number
}

// =============================================================================
// Embedding Event Interface
// =============================================================================

/**
 * Event interface for embedding generation
 */
export interface EmbeddingUsageEvent extends BaseUsageEvent {
  eventType: 'embedding_generation'
  provider: string
  model: string
  inputTokens: number
  cost: number
  documentCount: number
}

// =============================================================================
// Union Type for All Events
// =============================================================================

/**
 * Discriminated union of all usage event types
 * Use this when you need to handle any type of event
 */
export type UsageEvent =
  | AIUsageEvent
  | CodeExecutionEvent
  | SessionEvent
  | VoiceUsageEvent
  | EmbeddingUsageEvent

// =============================================================================
// Type Guards
// =============================================================================

export function isAIUsageEvent(event: UsageEvent): event is AIUsageEvent {
  return ['chat_message', 'feedback_generation', 'hint_request'].includes(event.eventType)
}

export function isCodeExecutionEvent(event: UsageEvent): event is CodeExecutionEvent {
  return event.eventType === 'code_execution'
}

export function isSessionEvent(event: UsageEvent): event is SessionEvent {
  return ['session_start', 'session_end'].includes(event.eventType)
}

export function isVoiceUsageEvent(event: UsageEvent): event is VoiceUsageEvent {
  return event.eventType === 'voice_transcription'
}

export function isEmbeddingUsageEvent(event: UsageEvent): event is EmbeddingUsageEvent {
  return event.eventType === 'embedding_generation'
}

// =============================================================================
// Input Types (for creating events)
// =============================================================================

/**
 * Input type for tracking AI events (omits auto-generated fields)
 */
export type TrackAIEventInput = Omit<AIUsageEvent, 'id' | 'createdAt'>

/**
 * Input type for tracking code execution events
 */
export type TrackCodeExecutionInput = Omit<CodeExecutionEvent, 'id' | 'createdAt'>

/**
 * Input type for tracking session events
 */
export type TrackSessionEventInput = Omit<SessionEvent, 'id' | 'createdAt'>

/**
 * Input type for tracking voice events
 */
export type TrackVoiceEventInput = Omit<VoiceUsageEvent, 'id' | 'createdAt'>

/**
 * Input type for tracking embedding events
 */
export type TrackEmbeddingEventInput = Omit<EmbeddingUsageEvent, 'id' | 'createdAt'>

/**
 * Union of all input types
 */
export type TrackUsageEventInput =
  | TrackAIEventInput
  | TrackCodeExecutionInput
  | TrackSessionEventInput
  | TrackVoiceEventInput
  | TrackEmbeddingEventInput
