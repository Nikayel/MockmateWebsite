"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Sparkles } from "lucide-react"
import type { LessonSection, PythonLesson, PythonLevel } from "@/lib/tutorials/types"

/** Tappable FAQ — deterministic answers (no LLM), so Sable can field common questions honestly. */
const FAQ: { q: string; a: string }[] = [
  {
    q: "How do hints work?",
    a: "Open them one at a time with the Hint button. In Apply, after two failed runs you can also reveal the reference; in Practice the reference stays hidden — that's the challenge.",
  },
  {
    q: "What is Practice?",
    a: "A harder, real-world variant of what you just learned in Apply — same idea, a shape closer to production code. Passing it completes the lesson.",
  },
  {
    q: "Why 3 days?",
    a: "Spaced repetition: a concept resurfaces a few days later, right as you'd start to forget it. Re-deriving it then is what moves it into long-term memory.",
  },
]

/**
 * Sable — the lesson workspace's AI tutor (HANDOFF §C). Greets with the level + lesson context and
 * reacts to every run, hint, and reference reveal with a *nudge, not a spoiler*. Reactions are
 * deterministic and derived from the event stream the player feeds in (no LLM call, so no cost and
 * no auth surface) — honest about what it knows (pass/fail, which phase, how many hints are left).
 */
export type SableEvent =
  | { id: number; kind: "phase"; section: LessonSection }
  | { id: number; kind: "run"; passed: boolean; section: LessonSection }
  | { id: number; kind: "hint"; index: number; total: number }
  | { id: number; kind: "reference" }
  | { id: number; kind: "complete"; section: LessonSection }

/** Distributive omit so each union member keeps its own fields when `id` is stripped. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

/** A Sable event before the player assigns it a stable id. */
export type SableEventInput = DistributiveOmit<SableEvent, "id">

const SECTION_LABEL: Record<LessonSection, string> = {
  teach: "Read",
  apply: "Apply",
  practice: "Practice",
}

/** A short, context-aware line for one event. Encouraging on pass; a nudge (never the answer) on fail. */
function sableLine(event: SableEvent): string {
  switch (event.kind) {
    case "phase":
      if (event.section === "teach") return "Take your time reading — I'll be here when you try it."
      if (event.section === "apply")
        return "Your turn. Write it out and Run & check — wrong answers are useful here."
      return "Practice is a real-world variant of what you just learned. Same idea, new shape."
    case "run":
      if (event.passed)
        return event.section === "practice"
          ? "That's a pass — and that one was meant to be tricky. Nicely done."
          : "All green. You've got the idea — ready to push into Practice?"
      return "Not all tests passed yet. Read the first failing case closely: what input went in, and what did it expect back?"
    case "hint":
      return event.index >= event.total
        ? "That's my last hint — you're close. Reread your function's return value against the expected output."
        : `Hint ${event.index} of ${event.total}. Try that, then run again before opening the next one.`
    case "reference":
      return "The reference is one way to write it — compare it to your attempt line by line rather than copying it wholesale."
    case "complete":
      return event.section === "practice"
        ? "Lesson complete. This idea resurfaces in 3 days so it actually sticks."
        : `Nice — ${SECTION_LABEL[event.section]} done. On to the next step.`
  }
}

export function SableTutor({
  level,
  lesson,
  events,
}: {
  level: PythonLevel
  lesson: PythonLesson
  events: SableEvent[]
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  // User-asked FAQ exchanges, appended after the reactive thread (the player owns `events`).
  const [asked, setAsked] = useState<{ id: number; q: string; a: string }[]>([])
  const askedId = useRef(0)

  const greeting = useMemo(
    () =>
      `Hi, I'm Sable — your tutor for Level ${level.id}, ${level.title.replace(/^Level \d+\s*[—-]\s*/, "")}. ` +
      `We're on "${lesson.title}". Read it, write it, then practice it — I'll nudge when you run or ask for a hint.`,
    [level.id, level.title, lesson.title]
  )

  // Keep the latest message in view as the thread grows.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [events.length, asked.length])

  const ask = (item: { q: string; a: string }) =>
    setAsked((prev) => [...prev, { id: askedId.current++, ...item }])

  const unaskedFaq = FAQ.filter((f) => !asked.some((a) => a.q === f.q))

  return (
    <aside
      className="border-border bg-card/60 flex h-full flex-col rounded-2xl border"
      aria-label="Sable, your Python tutor"
    >
      <div className="border-border flex items-center gap-2.5 border-b px-4 py-3">
        <span className="bg-accent/15 text-accent flex h-8 w-8 items-center justify-center rounded-full">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="leading-tight">
          <p className="text-foreground text-sm font-semibold">Sable</p>
          <p className="text-muted-foreground text-xs">Your Python tutor</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        <SableBubble>{greeting}</SableBubble>
        {events.map((event) => (
          <SableBubble key={event.id}>{sableLine(event)}</SableBubble>
        ))}
        {asked.map((item) => (
          <div key={item.id} className="space-y-3">
            <div className="bg-accent/10 text-foreground ml-auto w-fit max-w-[85%] rounded-xl rounded-tr-sm px-3 py-2 text-sm">
              {item.q}
            </div>
            <SableBubble>{item.a}</SableBubble>
          </div>
        ))}
      </div>

      {unaskedFaq.length > 0 && (
        <div className="border-border flex flex-wrap gap-1.5 border-t px-3 py-2.5">
          {unaskedFaq.map((item) => (
            <button
              key={item.q}
              type="button"
              onClick={() => ask(item)}
              className="border-border text-muted-foreground hover:border-accent/40 hover:text-accent focus-visible:ring-accent/50 rounded-full border px-2.5 py-1 text-xs transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              {item.q}
            </button>
          ))}
        </div>
      )}

      <p className="border-border text-muted-foreground/70 border-t px-4 py-2.5 text-[11px]">
        Sable nudges — it won't hand you the answer.
      </p>
    </aside>
  )
}

function SableBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-muted/50 text-foreground/90 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 rounded-xl rounded-tl-sm px-3 py-2 text-sm leading-relaxed">
      {children}
    </div>
  )
}
