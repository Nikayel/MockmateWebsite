import type { InterviewerReaction } from "../reactions/contract"
import type { ConversationEntry } from "./schema"

interface Message {
  id?: string
  generationId?: string
  feedbackAvailable?: boolean
  type: "user" | "ai"
  message: string
  timestamp?: number
  sequence?: number
  isStreaming?: boolean
  reaction?: InterviewerReaction
}
let sequence = 0
export function createChatMessage(
  type: "user" | "ai",
  message: string,
  response?: { generationId?: string; feedbackAvailable?: boolean }
): Message {
  return {
    id: response?.generationId ?? crypto.randomUUID(),
    type,
    message,
    timestamp: Date.now(),
    sequence: sequence++,
    ...(response?.generationId
      ? {
          generationId: response.generationId,
          feedbackAvailable: response.feedbackAvailable !== false,
        }
      : {}),
  }
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
          ...(message.generationId ? { generationId: message.generationId } : {}),
          id: message.id ?? `legacy-${lane}-${index}`,
          lane,
          role:
            message.type === "user"
              ? "candidate"
              : lane === "partner"
                ? "ai_partner"
                : "interviewer",
          content: message.message,
          ...(lane === "interviewer" && message.type === "user" && message.reaction
            ? { reaction: message.reaction }
            : {}),
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
    content: `[${entry.role}; to=${entry.lane}; id=${entry.id}${entry.reaction ? "; receipt=interviewer_acknowledged" : ""}; at=${entry.timestamp === undefined ? "unknown (legacy order unavailable)" : new Date(entry.timestamp).toISOString()}]\n${entry.content}`,
  }))
}
