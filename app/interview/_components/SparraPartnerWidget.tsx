"use client"

import { useEffect, useRef, type FormEvent, type RefObject } from "react"
import { MessageCircle, Minimize2, Send } from "lucide-react"
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

  const open = () => {
    onExpandedChange(true)
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }

  const minimize = () => {
    onExpandedChange(false)
    window.setTimeout(() => launcherRef.current?.focus(), 0)
  }

  useEffect(() => {
    if (!expanded) return
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      onExpandedChange(false)
      window.setTimeout(() => launcherRef.current?.focus(), 0)
    }
    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
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
        aria-label="Open Sparra AI partner"
        data-bugfix-tour={isDebuggingScenario ? "ai-partner" : undefined}
        className="border-border bg-card/95 text-foreground hover:border-accent/50 focus-visible:ring-accent/50 absolute right-3 bottom-3 z-40 flex min-h-12 cursor-pointer items-center gap-2 rounded-full border py-1.5 pr-4 pl-1.5 shadow-xl backdrop-blur transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <Sparra state={isLoading ? "thinking" : "idle"} size={34} />
        <span className="text-sm font-semibold">Ask Sparra</span>
        {messages.length > 0 ? (
          <span className="bg-accent/10 text-accent-strong min-w-5 rounded-full px-1.5 py-0.5 text-center text-[10px] font-semibold">
            {messages.length}
          </span>
        ) : (
          <MessageCircle className="text-muted-foreground h-4 w-4" aria-hidden="true" />
        )}
      </button>
    )
  }

  return (
    <section
      id="sparra-partner-chat"
      role="dialog"
      aria-label="Sparra AI partner"
      data-bugfix-tour={isDebuggingScenario ? "ai-partner" : undefined}
      className="border-border bg-card/95 absolute right-3 bottom-3 z-40 flex h-[26rem] max-h-[calc(100%-1.5rem)] w-[calc(100%-1.5rem)] max-w-sm flex-col overflow-hidden rounded-2xl border shadow-2xl backdrop-blur"
    >
      <header className="border-border flex items-center justify-between border-b px-3 py-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <Sparra state={isLoading ? "thinking" : "idle"} size={36} />
          <div className="min-w-0">
            <h2 className="text-foreground text-sm font-semibold">Sparra</h2>
            <p className="text-muted-foreground truncate text-xs">
              {isDebuggingScenario ? "AI debugging partner" : "AI coding partner"}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={minimize}
          className="text-muted-foreground hover:text-foreground h-10 w-10 p-0"
          aria-label="Minimize Sparra"
        >
          <Minimize2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      </header>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3" aria-live="polite">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <MessageCircle className="text-accent mb-2 h-5 w-5" aria-hidden="true" />
            <p className="text-foreground text-sm font-medium">Talk through your next step</p>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              {isDebuggingScenario
                ? "Share what you inspected and ask for a debugging nudge."
                : "Ask for a hint without giving away the solution."}
            </p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={`sparra-chat-${message.type}-${index}`}
              className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                  message.type === "user"
                    ? "bg-accent text-accent-foreground rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm"
                }`}
              >
                <MarkdownRenderer content={message.message} className="text-xs break-words" />
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
          className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-accent/50 h-11 min-w-0 flex-1 rounded-xl border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
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
