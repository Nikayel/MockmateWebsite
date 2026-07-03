"use client"

import { ChevronRight, Lock, Sparkles } from "lucide-react"
import type { LessonSection } from "@/lib/tutorials/types"

/**
 * Sable — the lesson workspace's AI tutor. **Currently locked ("coming soon")**: the live tutor is
 * not shipped yet, so this renders a calm placeholder instead of a chat surface. The column is
 * collapsible (`onCollapse`) so the learner can reclaim the space for the lesson. The event types
 * below are still exported because `LessonPlayer` keeps the (inert) event plumbing wired for when
 * the real tutor lands — nothing is rendered from it while locked.
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

export function SableTutor({ onCollapse }: { onCollapse?: () => void }) {
  return (
    <aside
      className="border-border bg-card/60 flex h-full flex-col rounded-2xl border"
      aria-label="Sable, your AI tutor (coming soon)"
    >
      <div className="border-border flex items-center gap-2.5 border-b px-4 py-3">
        <span className="bg-muted text-muted-foreground flex h-8 w-8 items-center justify-center rounded-full">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="leading-tight">
          <p className="text-foreground text-sm font-semibold">Sable</p>
          <p className="text-muted-foreground text-xs">Your AI tutor</p>
        </div>
        <span className="border-border text-muted-foreground ml-2 rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase">
          Soon
        </span>
        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            aria-label="Hide tutor"
            title="Hide tutor"
            className="text-muted-foreground hover:text-foreground hover:bg-muted/60 focus-visible:ring-accent/50 ml-auto flex h-7 w-7 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 text-center">
        <span className="border-border bg-muted/50 text-muted-foreground mb-4 flex h-11 w-11 items-center justify-center rounded-full border">
          <Lock className="h-5 w-5" aria-hidden="true" />
        </span>
        <p className="text-foreground text-sm font-semibold">AI tutor — coming soon</p>
        <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed text-pretty">
          Sable will talk through each lesson with you, nudge you when a test fails, and answer your
          questions — without ever handing over the answer. It’s not live yet; keep going and it’ll
          be here soon.
        </p>
      </div>
    </aside>
  )
}
