"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"

/**
 * The collapsed state of a side panel: a slim, full-height clickable rail with a vertical label and
 * a chevron pointing the way it expands. Used by `ExecutorSidePanel` so Problem / Notes can fold
 * away to the edges, keeping the default view uncluttered (HANDOFF-UX §2). The section icon/label is
 * muted — clay is reserved for interactive/primary (§5) — and it lights up on hover/focus.
 */
export function VerticalRail({
  label,
  onExpand,
  side,
}: {
  label: string
  onExpand: () => void
  /** Which edge the rail sits on — decides the chevron direction (expands toward the center). */
  side: "left" | "right"
}) {
  const Chevron = side === "left" ? ChevronRight : ChevronLeft
  return (
    <button
      type="button"
      onClick={onExpand}
      aria-label={`Show ${label}`}
      title={`Show ${label}`}
      className="group border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 focus-visible:ring-accent/50 flex w-10 shrink-0 flex-col items-center gap-2 border-r py-3 transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      <Chevron className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span
        className="text-[11px] font-semibold tracking-wide uppercase"
        style={{ writingMode: "vertical-rl" }}
      >
        {label}
      </span>
    </button>
  )
}
