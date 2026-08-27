"use client"

/**
 * PartnerChat — the Sable in-workspace partner (chat-only v0). Fork of
 * `components/labs/CaseLabChat.tsx` (Sparra thinking state, sign-in gate,
 * error handling), plus:
 *  - the locked-card state (`components/tutorials/SableTutor.tsx`'s
 *    affordance) for a ticket with no session,
 *  - transcript REHYDRATION on mount (GET /api/sprint-labs/chat),
 *  - a per-turn `TURN STATE` note (Layer D) appended to the outgoing message
 *    via `buildPerTurnNote`, and workspace file content (assisted mode only)
 *    via `renderWorkspaceFiles` -- both supplied by the parent through
 *    optional callbacks, since the actual editor/test state lives in a
 *    different, larger workspace-page component this one does not own.
 *
 * Mode/copy table below is UX-SPEC.md §7's "Sable panel, policy-aware"
 * table, reproduced verbatim.
 *
 * Locked vs. active, and why "unassisted" starts locked rather than
 * defaulting straight to the repo-blind tutor: AGENT-CONTEXT.md §6 and this
 * task's own mode resolver (lib/sprint-labs/partner/modes.ts) both treat
 * "unassisted" (no session) and "tutor overlay" (repo-blind, works ON
 * unassisted tickets) as two DIFFERENT, deliberately-requested surfaces --
 * not one silently substituting for the other. So this component starts an
 * unassisted ticket in the locked state (matching AGENT-CONTEXT.md's "no
 * agent session is issued at all" default and this task's own 403 route
 * contract) and offers a real, one-click "Talk to a tutor instead" link
 * that switches it into the working repo-blind chat -- both states stay
 * genuinely reachable, rather than one being dead code the other always
 * pre-empts. A review-only ticket whose author_brief hasn't been authored
 * yet 403s the same way on its first send and lands in the same locked
 * card, driven by the server's own reason instead of a guess.
 */

import { useEffect, useRef, useState } from "react"
import { Lock, Send } from "lucide-react"
import Link from "next/link"
import { Sparra } from "@/components/brand/Sparra"
import { AnimatedEllipsis } from "@/components/brand/AnimatedEllipsis"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import {
  fetchPartnerTranscript,
  sendPartnerChatMessage,
  type SendPartnerChatMessageInput,
} from "@/lib/sprint-labs/partner/chat-client"
import {
  buildPerTurnNote,
  type PerTurnState,
  type WorkspaceFileForContext,
} from "@/lib/sprint-labs/partner/context-layers"
import type { LayerBInput } from "@/lib/sprint-labs/partner/context-layers"
import type { AiPolicy } from "@/lib/sprint-labs/types"

export interface PartnerChatMessage {
  role: "user" | "assistant"
  content: string
}

type PartnerSlot = "partner" | "tutor"

const PANEL_COPY: Record<
  Exclude<PartnerSlot, never> | "review-only",
  { header: string; capability: string; empty: string }
> = {
  partner: {
    header: "SABLE",
    capability: "I can read this repo and talk it through. I cannot edit files or run tests.",
    empty: "Ask about the code, or say what you are about to try.",
  },
  tutor: {
    header: "SABLE — REPO BLIND",
    capability: "I can't see your code on this ticket, and that's deliberate.",
    empty: "I can talk about the concepts. I can't look at what you wrote.",
  },
  "review-only": {
    header: "SABLE — PR AUTHOR",
    capability: "I wrote this diff. I can't run anything from here.",
    empty: "Ask me why I did it this way.",
  },
}

export interface PartnerChatProps {
  runId: string
  ticketKey: string
  aiPolicy: AiPolicy
  /** In-fiction, required by content when aiPolicy is "unassisted" (ticketPublicSchema). */
  aiPolicyReason?: string
  className?: string
  /** Assisted mode only: the current workspace file contents, if the parent wants to grant Sable read access. Omitted -> no files posted. */
  getWorkspaceFiles?: () => WorkspaceFileForContext[]
  /** The client-computed Layer B map, if the parent has one ready. */
  getLayerBInput?: () => LayerBInput | undefined
  /** Layer D: current red visible tests + diff stat, for the per-turn note. Omitted -> no note is appended. */
  getPerTurnState?: () => Omit<PerTurnState, "turnIndex">
}

export function PartnerChat({
  runId,
  ticketKey,
  aiPolicy,
  aiPolicyReason,
  className,
  getWorkspaceFiles,
  getLayerBInput,
  getPerTurnState,
}: PartnerChatProps) {
  const { user, initialized } = useAuth()
  const signedOut = initialized && !user

  const [slot, setSlot] = useState<PartnerSlot>("partner")
  // Locked starts true for an unassisted ticket asking for the "partner"
  // slot -- this is a real, deterministic 403 (AGENT-CONTEXT.md §6), so
  // there is no reason to spend a network round trip finding that out.
  const [locked, setLocked] = useState(aiPolicy === "unassisted")
  const [lockReason, setLockReason] = useState(aiPolicyReason ?? "")

  const [messages, setMessages] = useState<PartnerChatMessage[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const turnIndexRef = useRef(0)

  useEffect(() => {
    let cancelled = false
    setLoadingHistory(true)
    fetchPartnerTranscript(runId, ticketKey).then((state) => {
      if (cancelled || !state) {
        setLoadingHistory(false)
        return
      }
      const rehydrated = state.transcript.messages
        .filter(
          (m): m is PartnerChatMessage & { role: "user" | "assistant" } =>
            m.role === "user" || m.role === "assistant"
        )
        .map((m) => ({ role: m.role, content: m.content }))
      setMessages(rehydrated)
      turnIndexRef.current = Math.ceil(rehydrated.length / 2)
      setLoadingHistory(false)
    })
    return () => {
      cancelled = true
    }
    // ticketKey/runId identify one conversation; re-run only when either changes.
  }, [runId, ticketKey])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages, sending])

  const copy = aiPolicy === "review-only" ? PANEL_COPY["review-only"] : PANEL_COPY[slot]

  const requestTutor = () => {
    setSlot("tutor")
    setLocked(false)
    setError(null)
  }

  const send = async () => {
    const text = input.trim()
    if (!text || sending) return
    if (signedOut) {
      setError("Please sign in to chat with Sable.")
      return
    }

    const next: PartnerChatMessage[] = [...messages, { role: "user", content: text }]
    setMessages(next)
    setInput("")
    setSending(true)
    setError(null)

    const turnIndex = turnIndexRef.current
    // C1 fix (review round 1, Critical): Layer B (the src/tests map) and
    // Layer D (the per-turn red-test/diff-stat note) are gated on
    // `slot === "partner"`, exactly like `files` below -- a repo-blind tutor
    // must never even POST the map or live test state, not just trust the
    // server to discard it. The server (route.ts) enforces the same gate
    // independently on `layerB`, since a client bug here must not be the
    // only thing standing between a repo-blind ticket and its map.
    const perTurn = slot === "partner" ? getPerTurnState?.() : undefined
    const message = perTurn ? text + buildPerTurnNote({ ...perTurn, turnIndex }) : text

    const body: SendPartnerChatMessageInput = {
      runId,
      ticketKey,
      message,
      turnIndex,
      mode: slot,
      layerB: slot === "partner" ? getLayerBInput?.() : undefined,
      files: slot === "partner" ? getWorkspaceFiles?.() : undefined,
    }

    const result = await sendPartnerChatMessage(body)
    setSending(false)

    if (!result.ok && result.locked) {
      setLocked(true)
      setLockReason(result.reason)
      setMessages(messages) // roll back the optimistic user turn -- no session accepted it
      return
    }
    if (!result.ok) {
      setError(result.error)
      setMessages(messages) // roll back; the turn was never accepted or stored
      return
    }

    turnIndexRef.current += 1
    setMessages([...next, { role: "assistant", content: result.reply }])
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void send()
    }
  }

  if (locked) {
    return (
      <aside
        className={cn(
          "flex h-full flex-col items-center justify-center rounded-2xl border border-[var(--wb-border)] bg-[var(--wb-panel)] px-6 py-8 text-center",
          className
        )}
        aria-label="Sable (no agent on this ticket)"
      >
        <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-[var(--wb-border)] bg-[var(--wb-main)] text-[var(--wb-disabled)]">
          <Lock className="h-5 w-5" aria-hidden="true" />
        </span>
        <p className="text-[13px] font-semibold text-[var(--wb-text)]">No agent on this ticket</p>
        {lockReason && (
          <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--wb-text-secondary)]">
            &ldquo;{lockReason}&rdquo;
          </p>
        )}
        <button
          type="button"
          onClick={requestTutor}
          className="mt-4 text-[12px] font-medium text-[var(--wb-accent)] underline underline-offset-2"
        >
          Talk to a tutor instead
        </button>
      </aside>
    )
  }

  return (
    <div className={cn("flex h-full flex-col gap-2.5", className)}>
      <div className="flex items-center gap-2">
        <h2 className="text-[11px] font-medium tracking-[0.08em] text-[var(--wb-faint)] uppercase">
          {copy.header}
        </h2>
      </div>
      <p className="text-[11px] leading-snug text-[var(--wb-text-secondary)]">{copy.capability}</p>

      <div
        ref={scrollRef}
        className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto"
        role="log"
        aria-live="polite"
      >
        {loadingHistory ? (
          <p className="px-1 text-[12px] text-[var(--wb-disabled)]">Loading conversation…</p>
        ) : messages.length === 0 && !sending ? (
          <p className="px-1 text-[12px] leading-relaxed text-[var(--wb-disabled)]">{copy.empty}</p>
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
          <div className="flex items-center gap-2 self-start rounded-lg border border-[var(--wb-border)] bg-[var(--wb-main)] px-3 py-2">
            <Sparra state="thinking" size={18} />
            <span className="text-xs text-[var(--wb-muted)]">
              Thinking
              <AnimatedEllipsis />
            </span>
          </div>
        )}
      </div>

      {error && (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      )}

      {signedOut ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-[var(--wb-border)] bg-[var(--wb-main)] px-3 py-2.5 text-[12px] text-[var(--wb-text-secondary)]">
          <span>Sign in to chat with Sable.</span>
          <Link
            href={`/login?redirect=/sprint-labs`}
            className="font-medium text-[var(--wb-accent)] underline"
          >
            Sign in
          </Link>
        </div>
      ) : (
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Message Sable…"
            rows={2}
            className="min-h-0 resize-none text-xs"
            aria-label="Message Sable"
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
      )}
    </div>
  )
}
