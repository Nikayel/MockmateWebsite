"use client"

import { useEffect, useRef, type FormEvent, type RefObject } from "react"
import { ArrowLeft, MessageCircle, Send } from "lucide-react"
import { Sparra } from "@/components/brand/Sparra"
import { Button } from "@/components/ui/button"
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer"

export interface PartnerChatMessage {
  type: "user" | "ai"
  message: string
}

interface SparraPartnerWidgetProps {
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
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
  onExpandedChange,
  messages,
  messagesEndRef,
  input,
  onInputChange,
  isLoading,
  onSendMessage,
  isDebuggingScenario,
}: SparraPartnerWidgetProps) {
  const launcherRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLElement>(null)

  const open = () => {
    onExpandedChange(true)
  }

  const minimize = () => {
    onExpandedChange(false)
    window.setTimeout(() => launcherRef.current?.focus(), 0)
  }

  useEffect(() => {
    if (!expanded) return
    inputRef.current?.focus()
  }, [expanded])

  useEffect(() => {
    if (!expanded) return
    const onEscape = (event: KeyboardEvent) => {
      if (
        event.key !== "Escape" ||
        event.defaultPrevented ||
        !(event.target instanceof Node) ||
        !panelRef.current?.contains(event.target)
      )
        return
      onExpandedChange(false)
      window.setTimeout(() => launcherRef.current?.focus(), 0)
    }
    window.addEventListener("keydown", onEscape)
    return () => window.removeEventListener("keydown", onEscape)
  }, [expanded, onExpandedChange])

  const submitMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!input.trim() || isLoading) return
    onSendMessage()
  }

  if (!expanded) {
    return (
      <button
        ref={launcherRef}
        type="button"
        onClick={open}
        aria-expanded="false"
        aria-controls="sparra-partner-chat"
        aria-label="Open Sparra partner"
        data-bugfix-tour={isDebuggingScenario ? "ai-partner" : undefined}
        className="border-border bg-card text-foreground hover:bg-muted focus-visible:ring-ring flex min-h-12 w-full shrink-0 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <Sparra state={isLoading ? "thinking" : "idle"} size={34} />
        <span className="text-sm font-semibold">Ask Sparra</span>
        <MessageCircle className="text-muted-foreground ml-auto h-4 w-4" aria-hidden="true" />
      </button>
    )
  }

  return (
    <section
      ref={panelRef}
      id="sparra-partner-chat"
      aria-label="Sparra partner"
      data-bugfix-tour={isDebuggingScenario ? "ai-partner" : undefined}
      className="border-border bg-card flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border"
    >
      <header className="border-border flex items-center justify-between border-b px-3 py-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <Sparra state={isLoading ? "thinking" : "idle"} size={36} />
          <h2 className="text-foreground text-sm font-semibold">Sparra</h2>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={minimize}
          className="text-muted-foreground hover:text-foreground min-h-11 gap-1 px-2 text-xs"
          aria-label="Back to problem"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Problem
        </Button>
      </header>

      <div
        className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4"
        role="log"
        aria-label="Sparra messages"
        aria-live="polite"
        // Keyboard users must be able to scroll the conversation without focusing the input.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <MessageCircle className="text-accent mb-2 h-5 w-5" aria-hidden="true" />
            <p className="text-foreground text-sm font-medium">Talk through your next step</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={`sparra-chat-${message.type}-${index}`}
              className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-full rounded-xl px-3 py-2 text-sm leading-relaxed ${
                  message.type === "user" ? "bg-muted text-foreground" : "text-foreground"
                }`}
              >
                <MarkdownRenderer
                  content={message.message}
                  className="text-sm [overflow-wrap:anywhere] break-words"
                />
              </div>
            </div>
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
          ref={inputRef}
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
          className="bg-accent text-accent-foreground hover:bg-accent/90 h-11 w-11 rounded-xl p-0"
          aria-label="Send message to Sparra"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
        </Button>
      </form>
    </section>
  )
}
