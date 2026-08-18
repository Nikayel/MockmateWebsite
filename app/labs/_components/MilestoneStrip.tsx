"use client"

/**
 * The five-milestone strip on `/labs`, below the lab cards.
 *
 * The hero carries a names-only band that anchors here; this is the body it points at.
 *
 * ## It is a pipeline, not a table row
 *
 * The previous version put five equal columns behind vertical dividers. A divider says "these are
 * peers", which is the exact opposite of "these happen in order", so the only ordering cue left was
 * an 11px numeral. The dividers are gone and a 2px rail runs through the node centres instead,
 * which is the continuity channel the relationship actually lives on. `--wb-rail` is held to the
 * 3:1 non-text bar against BOTH surfaces it can sit on, because it is the sole carrier of the
 * sequence.
 *
 * The rail deliberately does NOT fill up to the active step. A filled-to-here bar reads as progress
 * and would assert the visitor has completed milestones they have not started.
 *
 * ## Why hover is safe here
 *
 * Hover-to-reveal is normally an accessibility failure, so this never depends on it:
 *
 * - Every step's LABEL is always visible and self-explanatory: number, name, one-line summary.
 * - Hover, keyboard focus AND click all open the same detail; `onFocus` runs the same handler as
 *   `onMouseEnter`, so tabbing walks the details in order.
 * - Each step is a real `<button>`, tabbable and operable by Enter and Space for free.
 * - Click PINS. Leaving with the mouse returns to the pinned step, or step 1 if nothing is pinned,
 *   so a tap is never undone by a stray pointer event.
 * - The active state is carried by a 2px accent rule under the column, not by the tint: the tint
 *   measures 1.08:1 in light and is not a state signal on its own.
 *
 * ## Mobile drops the shared panel entirely
 *
 * Below `md` the strip stacked to ~580px and tapping step 4 updated a panel several hundred pixels
 * below the tap, so the interaction changed something the user could not see. On mobile every
 * detail renders inline under its own step and nothing is interactive. The strings come from ONE
 * array rendered at two sizes, so the two can never drift.
 *
 * All five details are in the initial HTML in both layouts. On desktop the inactive four are
 * `hidden`, never conditionally rendered: this copy is a reason the page ranks.
 */

import { useState } from "react"
import { cn } from "@/lib/utils"

import { MILESTONE_SECTION_ID, MILESTONE_STEPS } from "./milestone-steps"

const DETAIL_PANEL_ID = "case-lab-milestone-detail"

export function MilestoneStrip() {
  const [active, setActive] = useState(0)
  const [pinned, setPinned] = useState<number | null>(null)

  return (
    <section aria-labelledby={MILESTONE_SECTION_ID} className="flex scroll-mt-24 flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2
          id={MILESTONE_SECTION_ID}
          className="text-lg font-semibold text-[var(--wb-text)] sm:text-xl"
        >
          How a case lab works
        </h2>
        <p className="max-w-[70ch] text-sm text-[var(--wb-text-secondary)]">
          Every lab runs the same five milestones in the same order. You can move between them
          freely, and nothing is hidden until you have earned it.
        </p>
      </div>

      <div
        className="overflow-hidden rounded-xl border border-[var(--wb-border)] bg-[var(--wb-card)]"
        onMouseLeave={() => setActive(pinned ?? 0)}
      >
        <div className="md:grid md:grid-cols-5">
          {MILESTONE_STEPS.map((step, index) => {
            const isActive = index === active
            return (
              <button
                key={step.kind}
                type="button"
                aria-pressed={isActive}
                aria-controls={DETAIL_PANEL_ID}
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                onClick={() => {
                  setPinned(index)
                  setActive(index)
                }}
                className={cn(
                  "relative flex w-full cursor-pointer flex-col items-start gap-2 p-4 text-left transition-colors",
                  "border-b-2 border-b-transparent",
                  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--wb-accent)]",
                  // Below md the columns become rows, so they need a separator of their own.
                  index > 0 && "border-t border-t-[var(--wb-border)] md:border-t-0",
                  // The 2px rule is the state signal; the tint is reinforcement.
                  isActive && "bg-[var(--wb-accent-soft)] md:border-b-[var(--wb-accent)]"
                )}
              >
                {/* The connector, one segment per step, running from THIS node's centre to the
                    next one's. Drawn per column rather than as one container-wide line so it needs
                    no percentage math and cannot drift when the padding changes; the outer
                    `overflow-hidden` trims nothing because the last step draws none. It is emitted
                    before the node so the node paints over it. */}
                {index < MILESTONE_STEPS.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute top-[30px] left-[30px] hidden h-[2px] w-full bg-[var(--wb-rail)] md:block"
                  />
                )}
                <span className="flex items-center gap-2 md:flex-col md:items-start">
                  <span
                    aria-hidden
                    className={cn(
                      "relative z-[1] flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors",
                      isActive
                        ? "border-[var(--wb-accent-fill)] bg-[var(--wb-accent-fill)] text-[var(--wb-accent-on)]"
                        : "border-[var(--wb-rail)] bg-[var(--wb-card)] text-[var(--wb-text-secondary)]"
                    )}
                  >
                    {index + 1}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-semibold transition-colors",
                      isActive ? "text-[var(--wb-accent-strong)]" : "text-[var(--wb-text)]"
                    )}
                  >
                    {step.title}
                  </span>
                </span>
                <span className="text-xs leading-relaxed text-[var(--wb-text-secondary)]">
                  {step.oneLiner}
                </span>
                {/* Mobile: the detail lives here, always open, and there is nothing to tap. */}
                <span className="text-[13px] leading-relaxed text-[var(--wb-text-secondary)] md:hidden">
                  {step.detail}
                </span>
              </button>
            )
          })}
        </div>

        {/* Desktop: one shared panel. Fixed minimum height so swapping a short paragraph for a long
            one never reflows the page under the cursor. */}
        <div
          id={DETAIL_PANEL_ID}
          aria-live="polite"
          className="hidden min-h-[62px] border-t border-[var(--wb-border)] bg-[var(--wb-panel)] p-4 md:block"
        >
          {MILESTONE_STEPS.map((step, index) => (
            <div
              key={step.kind}
              className={cn("flex flex-col gap-1", index !== active && "hidden")}
            >
              <span className="font-mono text-[11px] tracking-wider text-[var(--wb-accent-strong)] uppercase">
                Step {index + 1} · {step.title}
              </span>
              <p className="max-w-[80ch] text-[13px] leading-relaxed text-[var(--wb-text-secondary)]">
                {step.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
