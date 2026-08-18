/**
 * "How a case lab works" on `/labs`.
 *
 * ## One instance, and a quiet one
 *
 * This replaced two things: an interactive five-column pipeline with a hover-driven shared detail
 * panel, and a second names-only band up in the hero. Two renderings of one list made the reader
 * check whether the second said anything new, and the interactive version spent an accent fill, a
 * connector rail, a selected-column tint and a state rule on a list nobody needs to operate. The
 * five steps are a thing to read once, not a control.
 *
 * ## It is the platform's own pattern
 *
 * `/learn` explains itself with "How a lesson works": a left-aligned heading, a one-line intro, and
 * a row of cards each carrying a clay `STEP N` eyebrow, a name, and a paragraph. This is that,
 * with five cards instead of three, in the same slot relative to the catalog above it. A visitor
 * moving between `/learn` and `/labs` should not have to learn a second visual language for the
 * same idea.
 *
 * A Server Component with no state: every word is in the initial HTML, always visible, with nothing
 * to hover, tab or tap. That is also what makes it work on a phone, where the previous version's
 * tap updated a panel several hundred pixels below the tap.
 */

import { MILESTONE_SECTION_ID, MILESTONE_STEPS } from "./milestone-steps"

export function HowACaseLabWorks() {
  return (
    <section aria-labelledby={MILESTONE_SECTION_ID} className="flex flex-col gap-4">
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

      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {MILESTONE_STEPS.map((step, index) => (
          <li
            key={step.kind}
            className="flex flex-col gap-1.5 rounded-2xl border border-[var(--wb-border)] bg-[var(--wb-card)] p-4"
          >
            <span className="text-[11px] font-semibold tracking-[0.08em] text-[var(--wb-accent-strong)] uppercase">
              Step {index + 1}
            </span>
            <h3 className="text-[15px] font-semibold text-[var(--wb-text)]">{step.title}</h3>
            <p className="text-[13px] leading-relaxed text-[var(--wb-text-secondary)]">
              {step.detail}
            </p>
          </li>
        ))}
      </ol>
    </section>
  )
}
