import { MessageAcknowledgment } from "@/components/interview/MessageAcknowledgment"
import type { SessionConversation } from "@/lib/admin/session-review/conversation"
import { conversationRoleLabel } from "@/lib/admin/session-review/conversation"
import { absoluteTime } from "@/lib/admin/session-display"

export function Conversation({ conversations }: { conversations: SessionConversation[] }) {
  return (
    <section aria-label="Conversation" className="space-y-3">
      <h3 className="font-semibold text-white">Conversation</h3>
      {conversations.length === 0 && (
        <p className="text-sm text-gray-400">
          No transcript or saved conversation is available for this session.
        </p>
      )}
      {conversations.map((conversation) => (
        <div key={conversation.source} className="space-y-3">
          <p className="text-xs text-gray-400">
            {conversation.source === "archive"
              ? "Archived transcript"
              : conversation.source === "interviewer_checkpoint"
                ? "Saved interviewer conversation · partial recovery copy"
                : "Saved AI partner conversation · partial recovery copy"}
            {` · ${conversation.messages.length} messages`}
            {conversation.persistedAt && ` · Saved ${absoluteTime(conversation.persistedAt)}`}
          </p>
          {conversation.truncated && (
            <p role="status" className="text-sm text-amber-300">
              This transcript is shortened. {conversation.originalCount} messages were originally
              recorded; some messages or text were omitted.
            </p>
          )}
          <ol className="space-y-3">
            {conversation.messages.map((message, index) => (
              <li
                key={index}
                className="min-w-0 rounded-md border border-gray-800 bg-gray-900/60 p-3"
              >
                <p className="mb-2 text-xs font-semibold text-[#e0a077]">
                  {index + 1}. {conversationRoleLabel(message.role)}
                </p>
                <div className="text-sm leading-relaxed [overflow-wrap:anywhere] break-words whitespace-pre-wrap text-gray-200">
                  {message.content}
                </div>
                {message.reaction === "acknowledged" && <MessageAcknowledgment />}
              </li>
            ))}
          </ol>
        </div>
      ))}
    </section>
  )
}
