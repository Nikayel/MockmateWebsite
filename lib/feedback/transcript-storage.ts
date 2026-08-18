/**
 * Durable interview transcripts.
 *
 * The full user<->AI conversation reaches /api/feedback/persist exactly once,
 * at scoring time, and was historically discarded there after message
 * counting. Nothing else ever archived it: the session_state buffer is a
 * crash-recovery scratchpad that rarely survives completion (measured
 * 2026-08-18: 11 of 148 completed sessions kept anything, all of it the AI's
 * canned greeting). This module bounds a transcript for storage in the
 * session's `artifacts/transcript` subcollection doc - a subcollection so
 * session list queries never pay for kilobytes of chat.
 *
 * Caps exist because message content is caller-controlled and a Firestore doc
 * hard-fails at 1MB: recency always wins when anything must go.
 */

export interface TranscriptMessage {
  role: string
  content: string
}

export interface StoredTranscript {
  messages: TranscriptMessage[]
  truncated: boolean
  originalCount: number
}

export const TRANSCRIPT_MAX_MESSAGES = 200
export const TRANSCRIPT_MAX_CONTENT_CHARS = 4000
export const TRANSCRIPT_MAX_TOTAL_BYTES = 700_000

export function prepareTranscriptForStorage(
  raw: Array<{ role?: unknown; content?: unknown }> | null | undefined
): StoredTranscript | null {
  if (!Array.isArray(raw) || raw.length === 0) return null

  const valid: TranscriptMessage[] = []
  for (const entry of raw) {
    if (!entry || typeof entry.role !== "string" || typeof entry.content !== "string") continue
    valid.push({ role: entry.role, content: entry.content })
  }
  if (valid.length === 0) return null

  const originalCount = valid.length
  let truncated = false

  let messages = valid
  if (messages.length > TRANSCRIPT_MAX_MESSAGES) {
    messages = messages.slice(-TRANSCRIPT_MAX_MESSAGES)
    truncated = true
  }

  messages = messages.map((m) => {
    if (m.content.length <= TRANSCRIPT_MAX_CONTENT_CHARS) return m
    truncated = true
    return { role: m.role, content: m.content.slice(0, TRANSCRIPT_MAX_CONTENT_CHARS) }
  })

  // Byte budget: shed oldest messages until the serialized payload fits.
  while (messages.length > 1 && JSON.stringify(messages).length > TRANSCRIPT_MAX_TOTAL_BYTES) {
    messages = messages.slice(Math.ceil(messages.length / 4))
    truncated = true
  }

  return { messages, truncated, originalCount }
}
