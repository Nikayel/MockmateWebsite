"use client"

import { ScrollReveal } from "@/lib/motion"
import { ArrowRight } from "lucide-react"
import Link from "next/link"

/**
 * RelevanceGapSection — the post-hero "problem" beat.
 *
 * Deepens the wedge instead of pivoting away from it. The hero promises the
 * real-engineering rounds LeetCode skips; this section makes the visitor feel
 * why that matters: you drilled puzzles, the job tests something else. Apple-
 * calm — one idea, big type, generous whitespace, a single clay accent — and
 * theme-aware (semantic tokens) so it reads in light and dark.
 */

const PRACTICED = ["Reverse a binary tree", "Two Sum", "Sliding-window maximum"]

const ASKED = [
  "Fix a failing test in a real codebase",
  "Scope a vague, real-world system",
  "Ship a feature without breaking the build",
]

export function RelevanceGapSection() {
  return (
    <section className="bg-background relative py-28 md:py-36">
      <div className="mx-auto max-w-5xl px-6">
        {/* One idea, centered, with room to breathe */}
        <ScrollReveal>
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-muted-foreground text-xs font-semibold tracking-[0.18em] uppercase">
              The gap
            </span>
            <h2 className="font-heading text-foreground mt-5 text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.05] font-bold tracking-[-0.03em]">
              You drilled puzzles.
              <br />
              They tested <span className="text-accent">the job.</span>
            </h2>
            <p className="text-muted-foreground mx-auto mt-6 max-w-xl text-lg leading-relaxed">
              You solved hundreds of LeetCode problems. Then the interview opened a real codebase
              and asked you to find the bug, or handed you an ambiguous system to scope.
            </p>
          </div>
        </ScrollReveal>

        {/* The contrast — a clean two-up split with a single hairline divider */}
        <ScrollReveal>
          <div className="mx-auto mt-20 grid max-w-3xl gap-10 md:grid-cols-2 md:gap-0">
            <div className="md:pr-12">
              <h3 className="text-muted-foreground mb-6 text-xs font-semibold tracking-[0.12em] uppercase">
                What you practiced
              </h3>
              <ul className="flex flex-col gap-4">
                {PRACTICED.map((item) => (
                  <li
                    key={item}
                    className="text-muted-foreground flex items-center gap-3 text-base"
                  >
                    <span className="bg-muted-foreground/40 h-px w-4 shrink-0" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-border md:border-l md:pl-12">
              <h3 className="text-foreground mb-6 text-xs font-semibold tracking-[0.12em] uppercase">
                What they actually ask
              </h3>
              <ul className="flex flex-col gap-4">
                {ASKED.map((item) => (
                  <li
                    key={item}
                    className="text-foreground flex items-center gap-3 text-base font-medium"
                  >
                    <span className="bg-accent h-1.5 w-1.5 shrink-0 rounded-full" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </ScrollReveal>

        {/* Quiet payoff line + one soft link */}
        <ScrollReveal>
          <div className="mt-20 text-center">
            <p className="text-muted-foreground text-lg">Closing that gap is the entire product.</p>
            <Link
              href="/labs"
              className="text-accent-strong group mt-3 inline-flex items-center gap-1.5 text-sm font-semibold transition-colors hover:opacity-80"
            >
              See a real Case Lab
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

export default RelevanceGapSection
