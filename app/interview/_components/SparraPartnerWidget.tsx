"use client"

import { type FormEvent, type RefObject } from "react"
import { MessageCircle, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConversationMessage } from "./ConversationMessage"

export interface PartnerChatMessage {
  type: "user" | "ai"
  message: string
}

interface SparraPartnerWidgetProps {
  expanded: boolean
  messages: PartnerChatMessage[]
  messagesEndRef: RefObject<HTMLDivElement | null>
  input: string
  onInputChange: (value: string) => void
  isLoading: boolean
  onSendMessage: () => void
  isDebuggingScenario: boolean
}

export function SparraPartnerWidget({
  expanded,
  messages,
  messagesEndRef,
  input,
  onInputChange,
  isLoading,
  onSendMessage,
  isDebuggingScenario,
}: SparraPartnerWidgetProps) {
  const submitMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!input.trim() || isLoading) return
    onSendMessage()
  }

  if (!expanded) return null

  return (
    <section
      id="sparra-partner-chat"
      aria-label="Sparra partner"
      className="bg-card flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
    >
      <div
        className="workspace-conversation min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4"
        role="log"
        aria-label="Sparra messages"
        aria-live="polite"
        // Keyboard users must be able to scroll the conversation without focusing the input.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <MessageCircle className="text-muted-foreground mb-2 h-5 w-5" aria-hidden="true" />
            <p className="text-foreground text-sm font-medium">Talk through your next step</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <ConversationMessage
              key={`sparra-chat-${message.type}-${index}`}
              message={message}
              speaker="Sparra"
            />
          ))
        )}
        {isLoading && (
          <p className="text-muted-foreground text-xs" role="status">
            Sparra is thinking…
          </p>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={submitMessage} className="border-border flex gap-2 border-t p-3">
        <input
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          placeholder={isDebuggingScenario ? "Ask for a debugging nudge…" : "Ask Sparra…"}
          className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring h-11 min-w-0 flex-1 rounded-lg border px-3 text-base focus-visible:ring-2 focus-visible:outline-none sm:text-sm"
          disabled={isLoading}
          aria-label="Message Sparra"
        />
        <Button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="bg-secondary text-foreground hover:bg-muted h-11 w-11 rounded-xl p-0"
          aria-label="Send message to Sparra"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
        </Button>
      </form>
    </section>
  )
}
