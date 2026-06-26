"use client"

/**
 * CaseLabChat — the right-column interviewer (P4: the AI is the spine).
 *
 * Sends the current milestone, the lab persona, and a short summary of the
 * candidate's answers to `/api/labs/chat`, so the interviewer reacts in
 * character to whatever station they're on. Best-effort: failures surface a
 * soft error and never block the rest of the lab.
 */

import { useEffect, useRef, useState } from "react"
import { Loader2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { getCurrentUserToken } from "@/lib/firebase-lazy"
import { useCaseLabStore } from "@/lib/stores/case-lab-store"
import type { CaseLabRun } from "@/lib/labs/types"
import type { CaseLabChatMessage } from "@/lib/labs/case-lab-chat"

/** A compact summary of the run's answers, to ground the interviewer. */
function buildContext(run: CaseLabRun): string {
  const a = run.answers
  const lines: string[] = []
  if (a.clarify?.length) lines.push(`Clarify: ${a.clarify.length} question(s)`)
  if (a.decompose)
    lines.push(
      `Decompose: ${a.decompose.workflow.length} step(s), ${a.decompose.entities.length} entit(ies)`
    )
  if (a.design?.api.name) lines.push(`Design API: ${a.design.api.name}`)
  if (a.build) {
    const passed = a.build.testResults.filter((t) => t.passed).length
    lines.push(`Build: ${passed}/${a.build.testResults.length} tests passing`)
  }
  return lines.join("\n")
}

export function CaseLabChat({ className }: { className?: string }) {
  const lab = useCaseLabStore((s) => s.activeLab)
  const run = useCaseLabStore((s) => s.activeRun)
  const milestone = useCaseLabStore((s) => s.getCurrentMilestone())

  const [messages, setMessages] = useState<CaseLabChatMessage[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages, sending])

  const send = async () => {
    const text = input.trim()
    if (!text || sending || !milestone) return
    const next: CaseLabChatMessage[] = [...messages, { role: "user", content: text }]
    setMessages(next)
    setInput("")
    setSending(true)
    setError(null)
    try {
      const token = await getCurrentUserToken()
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (token) headers.Authorization = `Bearer ${token}`
      const res = await fetch("/api/labs/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({
          milestone,
          messages: next,
          lab: lab
            ? {
                title: lab.title,
                company: lab.company,
                role: lab.role,
                whyThisCompany: lab.whyThisCompany,
              }
            : undefined,
          context: run ? buildContext(run) : undefined,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        reply?: string
        error?: string
      }
      if (!res.ok || !data.reply) throw new Error(data.error || "No response")
      setMessages([...next, { role: "assistant", content: data.reply }])
    } catch {
      setError("Couldn't reach the interviewer. Try again.")
    } finally {
      setSending(false)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void send()
    }
  }

  return (
    <div className={cn("flex h-full flex-col gap-2.5", className)}>
      <h2 className="text-[11px] font-medium tracking-[0.08em] text-[var(--wb-faint)] uppercase">
        Interviewer
      </h2>

      <div
        ref={scrollRef}
        className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto"
        role="log"
        aria-live="polite"
      >
        {messages.length === 0 && !sending ? (
          <p className="px-1 text-[12px] leading-relaxed text-[var(--wb-disabled)]">
            Ask anything or share your thinking.
          </p>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[92%] rounded-lg px-3 py-2 text-[12px] leading-[1.55] whitespace-pre-wrap",
                m.role === "user"
                  ? "self-end bg-[var(--wb-accent)] text-white"
                  : "self-start border border-[var(--wb-border)] bg-[var(--wb-main)] text-[var(--wb-text-secondary)]"
              )}
            >
              {m.content}
            </div>
          ))
        )}
        {sending && (
          <div className="self-start rounded-lg border border-[var(--wb-border)] bg-[var(--wb-main)] px-3 py-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--wb-muted)]" aria-hidden />
          </div>
        )}
      </div>

      {error && (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-end gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Message the interviewer…"
          rows={2}
          className="min-h-0 resize-none text-xs"
          aria-label="Message the interviewer"
        />
        <Button
          type="button"
          size="sm"
          onClick={send}
          disabled={sending || !input.trim()}
          aria-label="Send"
        >
          <Send className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  )
}
