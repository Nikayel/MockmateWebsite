/**
 * The five-milestone pipeline in the hero.
 *
 * ## Why this exists
 *
 * The owner wanted "How a case lab works" higher on the page. Moving the whole section above the
 * catalog puts the first lab card at roughly 757px, which clears a 900px viewport by nothing and
 * fails an 800px one, and that is the 1733px regression this page was just rebuilt to fix, starting
 * over with better intentions. A 64px band costs about 24px net and puts the process on the first
 * screen at every viewport, while the section it summarises stays below the catalog where it
 * answers a question the visitor now has rather than raising one they did not.
 *
 * ## Why a rail rather than five words in a row
 *
 * Five milestones are a strict sequence, and the old strip encoded that with an 11px numeral while
 * a set of vertical dividers actively said "these are peers". A connecting rail is the continuity
 * channel the relationship actually lives on. This is not decoration: it moves a real ordering onto
 * the channel that expresses ordering.
 *
 * The rail is inset to 10% so it terminates at the first and last node CENTRES. Run it edge to edge
 * and it stops connecting five things and starts underlining them.
 *
 * ## Names only
 *
 * See the note in `milestone-steps.ts`. This never grows a description.
 *
 * ## Mobile
 *
 * The rail and the node dots are desktop only, and the five names run as one chevron-separated row
 * at 11px. With dots the row wrapped to two lines and left "Review" stranded under 120px of empty
 * space, which is a lot of a 390x844 first screen to spend on a table of contents. Chevrons carry
 * the sequence at that size; a horizontal rail through wrapped rows would connect the wrong things.
 *
 * ## Motion
 *
 * There is none, deliberately. The only transition is `transition-colors` on hover, which
 * `app/globals.css` already neutralises globally under `prefers-reduced-motion` with `!important`.
 * A stroke draw-in would collapse to 0.01ms under that rule anyway, so the static state has to be
 * correct regardless, which means the animation buys nothing and risks a first-paint flash.
 */

import Link from "next/link"
import { ChevronRight } from "lucide-react"

import { MILESTONE_SECTION_ID, MILESTONE_STEPS } from "./milestone-steps"

export function MilestonePipelineBand() {
  return (
    <nav
      aria-label="The five milestones of a case lab"
      className="relative flex flex-nowrap items-center justify-between gap-x-0.5 sm:justify-start sm:gap-x-1"
    >
      {/* Desktop only: the connector. On mobile the chevrons below carry the sequence, because a
          horizontal rail through wrapped rows would connect the wrong things. */}
      <span
        aria-hidden
        className="absolute top-[22px] right-[10%] left-[10%] hidden h-[2px] bg-[var(--wb-rail)] sm:block"
      />
      {MILESTONE_STEPS.map((step, index) => (
        <span key={step.kind} className="flex items-center sm:flex-1">
          <Link
            href={`#${MILESTONE_SECTION_ID}`}
            className="group relative z-[1] flex min-h-[44px] flex-row items-center justify-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--wb-accent)] sm:w-full sm:flex-col sm:gap-2"
          >
            <span
              aria-hidden
              className="hidden h-3 w-3 shrink-0 rounded-full border-2 border-[var(--wb-rail)] bg-[var(--wb-page)] transition-colors group-hover:border-[var(--wb-accent)] group-hover:bg-[var(--wb-accent)] sm:block"
            />
            <span className="text-[11px] font-semibold whitespace-nowrap text-[var(--wb-text)] transition-colors group-hover:text-[var(--wb-accent-strong)] sm:text-[13px]">
              {step.title}
            </span>
          </Link>
          {index < MILESTONE_STEPS.length - 1 && (
            <ChevronRight
              aria-hidden
              className="h-3 w-3 shrink-0 text-[var(--wb-rail)] sm:hidden"
            />
          )}
        </span>
      ))}
    </nav>
  )
}
