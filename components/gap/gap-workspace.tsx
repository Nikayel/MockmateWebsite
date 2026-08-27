"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Clock, Mic, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { Sparra } from "@/components/brand/Sparra"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GAP_TICKETS, deriveBadLineIndex, type GapTicket } from "@/lib/landing/gap-tickets"

function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}

/**
 * One code line: a fixed-width gutter cell + token-colored source, laid out
 * as its own two-column grid (not a `contents` row sharing the parent's grid
 * — `display: contents` drops box properties entirely, so a row that needs
 * to paint a background/border for the buggy line can't be `contents`).
 * The transparent border on every row keeps the bad line's border from
 * shifting its neighbors' text horizontally.
 */
function CodeLineRow({
  index,
  line,
  bad,
}: {
  index: number
  line: GapTicket["src"][number]
  bad: boolean
}) {
  return (
    <div
      className={cn(
        "-mx-1.5 grid grid-cols-[1.25rem_1fr] items-baseline gap-x-3 border-l-2 border-transparent px-1.5",
        bad && "bg-destructive/10 border-destructive"
      )}
    >
      <span
        className="text-right tabular-nums select-none"
        style={{ color: "var(--gut)" }}
        aria-hidden
      >
        {index + 1}
      </span>
      <span className="text-foreground whitespace-pre">
        {line.length === 0
          ? " "
          : line.map((tok, j) => (
              <span
                key={j}
                style={tok.kind === "plain" ? undefined : { color: `var(--${tok.kind})` }}
              >
                {tok.text}
              </span>
            ))}
      </span>
    </div>
  )
}

/**
 * GapWorkspace — the "onsite round" mockup (HANDOFF-GapSection.md §5-6).
 *
 * Full width, never side-by-side with the screening strip above it. Every
 * pane — header, code, ticket, chat, copilot — reads from `tickets[current]`;
 * "Next ticket" is the only thing that changes, and it re-renders all five
 * together so nothing can drift out of sync with the ticket underneath it.
 */
export function GapWorkspace() {
  const reduceMotion = useReducedMotion()
  const [current, setCurrent] = useState(0)
  const ticket = GAP_TICKETS[current]
  const [remaining, setRemaining] = useState(ticket.clockSeconds)

  // The clock resets whenever the ticket changes, and only ticks — nothing
  // else in this mockup moves on a timer (motion rule: diegetic only).
  useEffect(() => {
    setRemaining(GAP_TICKETS[current].clockSeconds)
  }, [current])

  useEffect(() => {
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000)
    return () => clearInterval(id)
  }, [])

  const badLine = deriveBadLineIndex(ticket.src, ticket.diff)

  return (
    <div className="border-border bg-card overflow-hidden rounded-[6px] border">
      {/* Header */}
      <div className="border-border flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-2.5">
        <span
          className="text-accent-strong font-mono text-[10px] font-bold tracking-[0.1em] uppercase"
          aria-hidden
        >
          Onsite round
        </span>
        <span className="text-muted-foreground text-[12px]">case lab</span>
        <span className="bg-border h-3.5 w-px" aria-hidden />
        <span className="text-foreground font-mono text-[12px] font-medium">{ticket.id}</span>
        <span className="text-muted-foreground text-[12px]">
          {ticket.n} of {GAP_TICKETS.length}
        </span>
        <div className="ml-auto flex items-center gap-2.5">
          <span
            role="timer"
            aria-label={`${formatClock(remaining)} remaining on this ticket`}
            className="text-accent-strong flex items-center gap-1 font-mono text-[12px] font-bold tabular-nums"
          >
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {formatClock(remaining)}
          </span>
          <button
            type="button"
            onClick={() => setCurrent((c) => (c + 1) % GAP_TICKETS.length)}
            className="bg-muted border-border text-foreground hover:bg-muted/70 rounded-[4px] border px-2.5 py-1 text-[12px] font-medium transition-colors"
          >
            Next ticket →
          </button>
        </div>
      </div>

      {/* Body */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={ticket.id}
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="grid grid-cols-1 lg:grid-cols-[minmax(320px,1fr)_240px] xl:grid-cols-[minmax(320px,1fr)_282px]"
        >
          <Tabs
            defaultValue="code"
            className="border-border min-w-0 border-b lg:border-r lg:border-b-0"
          >
            <TabsList className="bg-muted/50 border-border h-auto w-full justify-start gap-1 rounded-none border-b p-1.5">
              <TabsTrigger value="ticket" className="rounded-[4px] px-3 py-1.5 text-[12.5px]">
                Ticket
              </TabsTrigger>
              <TabsTrigger
                value="code"
                className="flex items-center gap-1.5 rounded-[4px] px-3 py-1.5 text-[12.5px]"
              >
                Code
                <span className="bg-destructive text-destructive-foreground rounded-full px-1.5 py-px text-[10px] leading-none font-semibold">
                  1
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ticket" className="mt-0 p-5">
              <h3 className="text-foreground text-[17px] font-bold">{ticket.title}</h3>
              <dl className="border-border mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0 overflow-hidden rounded-[6px] border text-[12.5px]">
                {(
                  [
                    ["reporter", ticket.reporter],
                    ["opened", ticket.opened],
                    ["repro steps", ticket.repro],
                    ["your access", ticket.access],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="contents">
                    <dt className="bg-muted text-muted-foreground border-border border-b px-3 py-2 font-medium">
                      {label}
                    </dt>
                    <dd className="border-border text-foreground border-b px-3 py-2 last:border-b-0">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="text-muted-foreground mt-4 text-[13.5px] leading-relaxed">
                {ticket.body}
              </p>
            </TabsContent>

            <TabsContent value="code" className="mt-0 flex min-w-0 flex-col">
              <div className="text-muted-foreground border-border flex items-center gap-1.5 border-b px-3 py-2 font-mono text-[11px]">
                <span>{ticket.crumb}</span>
                <span aria-hidden>/</span>
                <span className="text-foreground">{ticket.file}</span>
                <span className="bg-accent ml-1 h-1.5 w-1.5 rounded-full" aria-label="modified" />
              </div>

              <div className="bg-editor-bg min-w-0 overflow-x-auto p-3">
                <pre className="font-mono text-[12.5px] leading-relaxed">
                  <code className="grid">
                    {ticket.src.map((line, i) => (
                      <CodeLineRow key={i} index={i} line={line} bad={i === badLine} />
                    ))}
                  </code>
                </pre>
              </div>

              <div className="border-border flex flex-wrap items-baseline gap-x-2 gap-y-1 border-t px-3 py-2 font-mono text-[11.5px]">
                <span className="text-destructive shrink-0 font-bold whitespace-nowrap">
                  ✗ FAIL
                </span>
                <span className="text-muted-foreground">
                  {ticket.testName} — {ticket.testFail}
                </span>
                <span className="text-neural-strong">expected {ticket.expected}</span>
                <span className="text-destructive">received {ticket.received}</span>
              </div>

              {/* Copilot — enabled and correct on purpose. The obvious objection to
                  this product is "AI can do the coding round too"; showing the fix
                  applied and asking the candidate to explain it answers that here,
                  not in a FAQ. */}
              <div className="bg-editor-bg border-border border-t p-3">
                <div className="mb-2 flex items-center gap-1.5">
                  <Sparkles className="text-accent h-3.5 w-3.5" aria-hidden />
                  <span className="text-foreground text-[11px] font-bold tracking-[0.06em] uppercase">
                    Copilot
                  </span>
                  <span className="bg-neural/15 text-neural-strong rounded-full px-2 py-0.5 text-[10px] font-semibold">
                    enabled
                  </span>
                  <span className="text-muted-foreground text-[11px]">— on purpose</span>
                </div>
                <p className="text-muted-foreground mb-2 text-[12px] leading-relaxed">
                  {ticket.copilotBlurb}
                </p>
                <pre className="mb-2 overflow-x-auto font-mono text-[11.5px] leading-relaxed">
                  {ticket.diff.map(([op, text], i) => (
                    <div key={i} className={op === "+" ? "text-neural-strong" : "text-destructive"}>
                      {op} {text}
                    </div>
                  ))}
                </pre>
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    className="bg-accent-strong text-accent-foreground rounded-[4px] px-2.5 py-1 text-[12px] font-medium"
                  >
                    Apply patch
                  </button>
                  <p className="text-muted-foreground text-[11.5px]">
                    <strong className="text-foreground font-semibold">Applying it is free.</strong>{" "}
                    Explaining it is the round.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Sparra chat rail */}
          <div className="bg-muted/30 flex min-h-[380px] flex-col p-3.5 font-sans">
            <div className="mb-3 flex items-center gap-2">
              <Sparra state="thinking" size={26} label="Sparra, thinking" />
              <div>
                <p className="text-foreground text-[12.5px] font-bold">Sparra</p>
                <p className="text-muted-foreground flex items-center gap-1 text-[10.5px]">
                  <span className="bg-neural h-1.5 w-1.5 rounded-full" aria-hidden />
                  interviewing · live
                </p>
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
              {ticket.chat.map((m, i) => (
                <div key={i} className={m.who === "you" ? "self-end text-right" : "self-start"}>
                  <p
                    className={cn(
                      "max-w-[220px] px-3 py-2 text-[12.5px] leading-[1.45]",
                      m.who === "sparra"
                        ? "bg-muted rounded-[10px_10px_10px_3px]"
                        : "bg-accent/10 border-accent/20 rounded-[10px_10px_3px_10px] border"
                    )}
                  >
                    {m.text}
                  </p>
                  <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-[10px]">
                    {m.who === "you" && m.spokenFor && (
                      <span className="ml-auto flex items-center gap-1">
                        <Mic className="h-2.5 w-2.5" aria-hidden />
                        spoken · {m.spokenFor}
                      </span>
                    )}
                    {m.who === "sparra" && <span>{m.time}</span>}
                  </p>
                </div>
              ))}

              {/* Pending question, pinned to the bottom — Sparra is waiting. */}
              <div className="mt-auto self-start">
                <p className="bg-muted max-w-[220px] rounded-[10px_10px_10px_3px] px-3 py-2 text-[12.5px] leading-[1.45]">
                  {ticket.pending}
                </p>
                <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-[10.5px]">
                  <span className="flex gap-0.5" aria-hidden>
                    <span className="bg-accent h-1 w-1 animate-pulse rounded-full" />
                    <span className="bg-accent h-1 w-1 animate-pulse rounded-full [animation-delay:150ms]" />
                    <span className="bg-accent h-1 w-1 animate-pulse rounded-full [animation-delay:300ms]" />
                  </span>
                  waiting for you
                </p>
              </div>
            </div>

            <div className="border-border bg-background mt-3 flex items-center gap-2 rounded-[6px] border px-3 py-2">
              <Mic className="text-accent h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="text-muted-foreground flex-1 text-[12px]">
                Answer out loud, or type…
              </span>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default GapWorkspace
