"use client"

import type { ChatMessage } from "../_types"
import { MessageAcknowledgment } from "@/components/interview/MessageAcknowledgment"
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer"

/** Shared turn styling for the interviewer, coding partner, and review. */
export function ConversationMessage({
  message,
  speaker,
}: {
  message: Pick<ChatMessage, "type" | "message" | "isStreaming" | "reaction">
  speaker: string
}) {
  return (
    <article className={`w-fit max-w-[92%] min-w-0 ${message.type === "user" ? "ml-auto" : ""}`}>
      <div className="workspace-message" data-speaker={message.type}>
        <p className="mb-1 text-xs font-medium">{message.type === "user" ? "You" : speaker}</p>
        {message.isStreaming ? (
          <p className="text-sm leading-6 [overflow-wrap:anywhere]">
            {message.message}
            <span
              className="workspace-reply-cursor ml-1 inline-block h-3 w-0.5"
              aria-hidden="true"
            />
          </p>
        ) : (
          <MarkdownRenderer
            content={message.message}
            className="text-sm leading-6 [overflow-wrap:anywhere]"
          />
        )}
      </div>
      {message.type === "user" && message.reaction === "acknowledged" && (
        <div className="mt-1 flex justify-end">
          <MessageAcknowledgment speaker={speaker} />
        </div>
      )}
    </article>
  )
}
