"use client"

/**
 * "How a case lab works" on `/labs`.
 *
 * Five compact cards showing only `STEP N` and the milestone name. The paragraph for a step opens
 * as a popup over the row. Collapsed, the whole section is one short row instead of five columns of
 * body copy, which is what lets it sit close under the catalog without pushing anything down.
 *
 * ## Hover is never the only way in
 *
 * Hover-to-reveal is normally an accessibility failure, so every path is wired to the same state:
 *
 * - Each step is a real `<button>` with `aria-expanded` and `aria-controls`, so it is tabbable and
 *   works on Enter and Space for free.
 * - `onFocus` opens and `onBlur` closes, so tabbing through the row walks the paragraphs in order.
 * - Click PINS a step open, which is the path a touch device takes: it has no hover, and a tap that
 *   only fired `mouseenter` would leave the popup open with no way to dismiss it. Clicking the same
 *   step again unpins.
 * - `open = hovered ?? pinned`, so moving the mouse away falls back to whatever was pinned rather
 *   than closing something the user deliberately opened.
 *
 * The step NAME is always visible, so a visitor who never hovers, tabs or taps still reads the
 * whole pipeline in order. That is the property that makes the popup an enhancement rather than a
 * gate.
 *
 * ## All five paragraphs are in the initial HTML
 *
 * The closed ones are `hidden`, never conditionally rendered. This copy is a reason the page ranks,
 * and a crawler does not hover.
 *
 * ## Positioning
 *
 * The popup is `absolute` from `sm` up and static below it, so on a phone it expands inline instead
 * of floating over the next card.
 *
 * Horizontal alignment is per index AND per breakpoint, because the popup is wider than a column
 * and the card sitting at the right edge of the grid is a different one at each width. The grid is
 * three across at `sm` and five across at `lg`, so index 2 is the rightmost column at `sm` while
 * index 4 is the rightmost at `lg`; each of those hangs right and everything else hangs left. Get
 * this wrong and one popup runs off the page at exactly one viewport width, which is the kind of
 * bug that only ever shows up on somebody else's screen.
 *
 * Every claim in the copy is checked against the code that implements it; see `milestone-steps.ts`.
 */

import { useState } from "react"
import { cn } from "@/lib/utils"

import { MILESTONE_SECTION_ID, MILESTONE_STEPS } from "./milestone-steps"

/**
 * Which edge each step's popup hangs from, per breakpoint. The grid is 1 / 3 / 5 columns, so the
 * rightmost card is index 2 at `sm` and index 4 at `lg`. Spelled out in full because Tailwind only
 * sees literal class strings.
 */
const POPUP_ALIGNMENT = [
  "sm:left-0",
  "sm:left-0",
  "sm:right-0 lg:right-auto lg:left-0",
  "sm:left-0",
  "sm:left-0 lg:left-auto lg:right-0",
] as const

export function HowACaseLabWorks() {
  const [hovered, setHovered] = useState<number | null>(null)
  const [pinned, setPinned] = useState<number | null>(null)
  const open = hovered ?? pinned

  return (
    <section
      aria-labelledby={MILESTONE_SECTION_ID}
      className="flex scroll-mt-28 flex-col gap-4"
      id="how-it-works"
    >
      <div className="flex flex-col gap-1">
        <h2
          id={MILESTONE_SECTION_ID}
          className="text-lg font-semibold text-[var(--wb-text)] sm:text-xl"
        >
          How a case lab works
        </h2>
        <p className="max-w-[70ch] text-sm text-[var(--wb-text-secondary)]">
          Every lab runs the same five milestones in the same order. You can move between them
          freely, and nothing is hidden until you have earned it. Hover, tab to, or tap a step to
          read what it asks of you.
        </p>
      </div>

      <ol className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {MILESTONE_STEPS.map((step, index) => {
          const isOpen = index === open
          const panelId = `${MILESTONE_SECTION_ID}-${step.kind}`
          return (
            <li key={step.kind} className="relative">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onMouseEnter={() => setHovered(index)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(index)}
                onBlur={() => setHovered(null)}
                onClick={() => setPinned((current) => (current === index ? null : index))}
                className={cn(
                  "flex w-full cursor-pointer flex-col gap-1 rounded-2xl border p-4 text-left transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--wb-accent)]",
                  isOpen
                    ? "border-[var(--wb-accent)] bg-[var(--wb-accent-soft)]"
                    : "border-[var(--wb-border)] bg-[var(--wb-card)]"
                )}
              >
                <span className="text-[11px] font-semibold tracking-[0.08em] text-[var(--wb-accent-strong)] uppercase">
                  Step {index + 1}
                </span>
                <span className="text-[15px] font-semibold text-[var(--wb-text)]">
                  {step.title}
                </span>
              </button>

              <div
                id={panelId}
                role="tooltip"
                className={cn(
                  "z-20 mt-2 rounded-2xl border border-[var(--wb-accent)] bg-[var(--wb-card)] p-3 shadow-lg",
                  "sm:absolute sm:top-full sm:w-[300px]",
                  POPUP_ALIGNMENT[index],
                  !isOpen && "hidden"
                )}
              >
                <p className="text-[13px] leading-relaxed text-[var(--wb-text-secondary)]">
                  {step.detail}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
