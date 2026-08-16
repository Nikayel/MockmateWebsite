/**
 * Where to go from `/labs` when a lab is not the right next hour.
 *
 * Four labs is a small catalog, so the honest close to this page is a set of routes to the practice
 * that is adjacent to it, not a second CTA. Two of these links exist because
 * `/bug-fix-interview-practice` and `/guides/how-to-practice-bug-fix-interviews` were submitted in
 * the sitemap with zero inbound internal links anywhere on the site, and `/labs` is the page whose
 * subject genuinely overlaps theirs: half the labs are debugging rounds.
 *
 * Plain anchors, server rendered, no JS gate.
 */

import Link from "next/link"

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
      <h2 id="next-steps" className="text-xl font-semibold text-[var(--wb-text)] sm:text-2xl">
        Where to practice next
      </h2>
      <p className="text-sm text-[var(--wb-text-secondary)]">
        A lab is an hour of work. These are the shorter routes, and the reading, around it.
      </p>
      <ul className="flex flex-col gap-3">
        {NEXT_STEPS.map((step) => (
          <li key={step.href} className="text-sm text-[var(--wb-text-secondary)]">
            <Link
              href={step.href}
              className="font-medium text-[var(--wb-accent-strong)] underline underline-offset-2"
            >
              {step.label}
            </Link>
            <span> · {step.body}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
