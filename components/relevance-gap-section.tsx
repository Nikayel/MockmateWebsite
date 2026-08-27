"use client"

import { ScrollReveal } from "@/lib/motion"
import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { trackEvent } from "@/lib/analytics"
import { GapScreeningStrip } from "@/components/gap/gap-screening-strip"
import { GapWorkspace } from "@/components/gap/gap-workspace"

/**
 * RelevanceGapSection — the post-hero "problem" beat (HANDOFF-GapSection.md,
 * option 16a).
 *
 * Two stacked, unequal-height bands instead of a second hero: a collapsed
 * screening-round strip (an LLM clears it in seconds, you still have to
 * understand it), then the full-width onsite-round workspace that decides
 * the loop — a real ticket, a copilot that's enabled and correct, and an
 * interviewer asking the candidate to explain the fix. Stacking states the
 * relationship before a word is read; the two are never side by side.
 *
 * No vanity metrics anywhere in this section — the only comparison is
 * `your runtime · 0 ms` vs `an LLM · 9s, first try`, inside the strip.
 */
export function RelevanceGapSection() {
  return (
    <section className="bg-background relative py-24 md:py-32">
      <div className="mx-auto max-w-[1080px] px-6">
        <ScrollReveal>
          <p className="text-foreground max-w-[620px] text-[17px] leading-relaxed font-medium">
            Two rounds decide a real loop. Only one of them looks like practice.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.05}>
          <div className="mt-6">
            <GapScreeningStrip />
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="mt-10 mb-5 flex items-center gap-3">
            <span className="text-muted-foreground shrink-0 text-xs font-semibold tracking-[0.14em] uppercase">
              The round that decides
            </span>
            <span className="bg-border h-px flex-1" aria-hidden />
          </div>
          <GapWorkspace />
        </ScrollReveal>

        <ScrollReveal delay={0.15}>
          <div className="mt-14 text-center">
            <p className="text-muted-foreground mx-auto max-w-xl text-lg leading-relaxed">
              So we drill both: puzzles out loud, and the round the copilot can&apos;t sit through
              for you.
            </p>
            <Link
              href="/interview"
              onClick={() =>
                trackEvent("cta_click", { location: "gap_closing", destination: "/interview" })
              }
              className="text-accent-strong group mt-4 inline-flex items-center gap-1.5 text-sm font-semibold transition-colors hover:opacity-80"
            >
              Try a free round
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

export default RelevanceGapSection
