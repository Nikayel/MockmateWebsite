import { prepareTranscriptForStorage } from "@/lib/feedback/transcript-storage"
import { count, record, timestamp } from "./fields"

export interface SessionConversation {
  source: "archive" | "interviewer_checkpoint" | "partner_checkpoint"
  messages: Array<{ role: string; content: string }>
  originalCount: number
  truncated: boolean
  persistedAt: string | null
}

/** Prefer the durable archive. Recovery buffers are partial, separate conversation lanes. */
export function sessionConversations(artifact: unknown, state: unknown): SessionConversation[] {
  const stored = record(artifact)
  const archived = normalizeMessages(stored.messages)
  if (archived) {
    const originalCount = count(stored.original_message_count) ?? archived.originalCount
    return [
      {
        source: "archive",
        messages: archived.messages,
        originalCount: Math.max(originalCount, archived.originalCount),
        truncated:
          stored.truncated === true ||
          archived.truncated ||
          originalCount > archived.messages.length,
        persistedAt: timestamp(stored.persisted_at),
      },
    ]
  }
  const checkpoint = record(state)
  return (
    [
      ["interviewer_checkpoint", checkpoint.interviewer_messages],
      ["partner_checkpoint", checkpoint.chat_messages],
    ] as const
  ).flatMap(([source, raw]) => {
    const normalized = normalizeMessages(
      raw,
      source === "partner_checkpoint" ? "ai_partner" : "interviewer"
    )
    return normalized
      ? [{ ...normalized, source, persistedAt: timestamp(checkpoint.saved_at) }]
      : []
  })
}

function normalizeMessages(value: unknown, aiRole?: string) {
  if (!Array.isArray(value)) return null
  return prepareTranscriptForStorage(
    value.map((entry) => {
      const message = record(entry)
      return {
        role: aiRole
          ? message.type === "user"
            ? "candidate"
            : message.type === "ai"
              ? aiRole
              : message.type
          : message.role,
        content: aiRole ? message.message : message.content,
      }
    })
  )
}

export function conversationRoleLabel(role: string): string {
  switch (role) {
    case "user":
    case "candidate":
      return "Candidate"
    case "ai_partner":
      return "AI partner"
    case "assistant":
    case "ai":
    case "model":
    case "interviewer":
      return "Interviewer"
    default:
      return "Recorded message"
  }
}
