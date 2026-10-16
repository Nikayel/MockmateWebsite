"use client"

import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer"

/** Shared turn styling for the interviewer, coding partner, and review. */
export function ConversationMessage({
  message,
  speaker,
}: {
  message: { type: "user" | "ai"; message: string; isStreaming?: boolean }
  speaker: string
}) {
  return (
    <article className="workspace-message" data-speaker={message.type}>
      <p className="mb-1 text-xs font-medium">{message.type === "user" ? "You" : speaker}</p>
      {message.isStreaming ? (
        <p className="text-sm leading-6 [overflow-wrap:anywhere]">
          {message.message}
          <span className="workspace-reply-cursor ml-1 inline-block h-3 w-0.5" aria-hidden="true" />
        </p>
      ) : (
        <MarkdownRenderer
          content={message.message}
          className="text-sm leading-6 [overflow-wrap:anywhere]"
        />
      )}
    </article>
  )
}
