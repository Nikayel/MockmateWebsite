/**
 * Where to go from `/labs` when a lab is not the right next hour.
 *
 * Four labs is a small catalog, so the honest close to this page is a set of routes to the practice
 * that is adjacent to it, not a second CTA. Two of these links exist because
 * `/bug-fix-interview-practice` and `/guides/how-to-practice-bug-fix-interviews` were submitted in
 * the sitemap with zero inbound internal links anywhere on the site, and `/labs` is the page whose
 * subject genuinely overlaps theirs: half the labs are debugging rounds.
 *
 * Plain anchors, server rendered, no JS gate. Tiled two-up rather than stacked, because four link
 * rows at the foot of a page are four rows of scrolling for four links.
 */

import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

const NEXT_STEPS: { href: string; label: string; body: string }[] = [
  {
    href: "/bug-fix-interview-practice",
    label: "Bug-fix interview practice",
    body: "Shorter debugging rounds against a broken codebase, with the AI interviewer, when you want the Build milestone without the four milestones around it.",
  },
  {
    href: "/guides/how-to-practice-bug-fix-interviews",
    label: "How to practice bug-fix interviews",
    body: "The written guide: how to read unfamiliar code under time pressure, and what a debugging round is actually scoring.",
  },
  {
    href: "/interview",
    label: "AI mock interview",
    body: "A timed round with a voice-enabled interviewer, on either a coding problem or a debugging scenario, ending in written feedback.",
  },
  {
    href: "/learn",
    label: "Free courses",
    body: "Python, data engineering, and system design lessons, if the gap a lab exposed is knowledge rather than practice.",
  },
]

export function CaseLabNextSteps() {
  return (
    <section aria-labelledby="next-steps" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="next-steps" className="text-lg font-semibold text-[var(--wb-text)] sm:text-xl">
          Where to practice next
        </h2>
        <p className="text-sm text-[var(--wb-text-secondary)]">
          A lab is an hour of work. These are the shorter routes, and the reading, around it.
        </p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {NEXT_STEPS.map((step) => (
          <li key={step.href}>
            <Link
              href={step.href}
              className="group flex h-full flex-col gap-1 rounded-lg border border-[var(--wb-border)] bg-[var(--wb-main)] p-3 transition-colors hover:border-[var(--wb-accent)]"
            >
              <span className="flex items-center gap-1 text-sm font-semibold text-[var(--wb-accent-strong)]">
                {step.label}
                <ArrowUpRight
                  className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5"
                  aria-hidden
                />
              </span>
              <span className="text-[13px] leading-relaxed text-[var(--wb-text-secondary)]">
                {step.body}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
