import type { ConversationEntry } from "./schema"

interface Message {
  id?: string
  type: "user" | "ai"
  message: string
  timestamp?: number
  sequence?: number
  isStreaming?: boolean
}
let sequence = 0
export function createChatMessage(type: "user" | "ai", message: string): Message {
  return { id: crypto.randomUUID(), type, message, timestamp: Date.now(), sequence: sequence++ }
}

/** Legacy messages retain unknown dates. Never invent chronology for restored history. */
export function buildConversationTimeline(
  interviewer: Message[],
  partner: Message[]
): ConversationEntry[] {
  const entries = (
    [
      ["interviewer", interviewer],
      ["partner", partner],
    ] as const
  ).flatMap(([lane, messages]) =>
    messages
      .filter((message) => !message.isStreaming)
      .map(
        (message, index): ConversationEntry => ({
          id: message.id ?? `legacy-${lane}-${index}`,
          lane,
          role:
            message.type === "user"
              ? "candidate"
              : lane === "partner"
                ? "ai_partner"
                : "interviewer",
          content: message.message,
          ...(message.timestamp !== undefined ? { timestamp: message.timestamp } : {}),
          ...(message.sequence !== undefined ? { sequence: message.sequence } : {}),
        })
      )
  )
  const unknown = entries.filter((entry) => entry.timestamp === undefined)
  const known = entries
    .filter((entry) => entry.timestamp !== undefined)
    .sort((a, b) => a.timestamp! - b.timestamp! || (a.sequence ?? 0) - (b.sequence ?? 0))
  return [...unknown, ...known]
}

export function timelineProviderHistory(timeline: ConversationEntry[]) {
  return timeline.map((entry) => ({
    role: entry.role === "candidate" ? ("user" as const) : ("model" as const),
    content: `[${entry.role}; to=${entry.lane}; id=${entry.id}; at=${entry.timestamp === undefined ? "unknown (legacy order unavailable)" : new Date(entry.timestamp).toISOString()}]\n${entry.content}`,
  }))
}
