"use client"

import { motion } from "framer-motion"
import { ScrollReveal } from "@/lib/motion"
import { ArrowRight, Building2, CalendarDays, Sparkles } from "lucide-react"
import Link from "next/link"
import { trackEvent } from "@/lib/analytics"

/**
 * CompanyRoadmapSection — homepage hint for company-tailored roadmaps.
 *
 * Strategy: this is a teaser, not the full pitch. It plants one idea ("tell us
 * the company, we build the exact plan") and routes deeper to /roadmap. The
 * plan it shows is illustrative and mirrors the real round styles behind our
 * Case Labs (Palantir decomposition, Stripe correctness), so the claim stays
 * grounded in what the product actually models.
 *
 * Theme-aware by design: uses the centralized semantic tokens (background /
 * foreground / muted-foreground / card / border / accent) so it reads in both
 * light and dark mode, unlike the older marketing sections that pinned a dark
 * surface.
 */

// Companies we currently model rounds for. Palantir + Stripe are live Case
// Labs; the rest are common targets shown to illustrate the company input.
const COMPANY_CHIPS = [
  { label: "Palantir", live: true },
  { label: "Stripe", live: true },
  { label: "Meta", live: false },
  { label: "Amazon", live: false },
] as const

// Illustrative plan preview. Plain-language round names, no internal jargon.
const PLAN_WEEKS = [
  { week: "Week 1", focus: "Scope ambiguous problems", round: "Decomposition" },
  { week: "Week 2", focus: "Design under real constraints", round: "System + tradeoffs" },
  { week: "Week 3", focus: "Fix failing tests in a real repo", round: "Bug fix" },
  { week: "Week 4", focus: "Run the full timed loop", round: "Mock onsite" },
] as const

export function CompanyRoadmapSection() {
  return (
    <section className="bg-background relative overflow-hidden py-20 md:py-24">
      {/* Soft accent wash, kept subtle so it works on light and dark */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(196,112,63,0.06),transparent_60%)]" />

      <div className="relative z-10 container mx-auto px-4">
        <div className="mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-2 lg:gap-14">
          {/* Left: copy + CTAs */}
          <ScrollReveal>
            <div className="text-center lg:text-left">
              <div className="border-border bg-card mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-1">
                <Sparkles className="text-accent h-3.5 w-3.5" />
                <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  Company-tailored prep
                </span>
              </div>

              <h2 className="font-heading text-foreground text-[clamp(2rem,4vw,3rem)] leading-[1.1] font-bold tracking-[-0.03em]">
                Tell us where you&apos;re interviewing. We build the plan.
              </h2>

              <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-base leading-relaxed font-medium md:text-lg lg:mx-0">
                Pick your target company and role. We map the rounds they actually run, then turn
                them into a week-by-week plan. It draws on the same real-question library behind our
                Case Labs.
              </p>

              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:gap-4 lg:items-start lg:justify-start">
                <Link
                  href="/interview"
                  onClick={() =>
                    trackEvent("cta_click", {
                      location: "roadmap_primary",
                      destination: "/interview",
                    })
                  }
                  className="bg-accent text-accent-foreground inline-flex items-center gap-2 rounded-[14px] px-8 py-3.5 text-base font-bold shadow-[0_0_36px_rgba(196,112,63,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:opacity-95"
                >
                  Start practicing free
                </Link>
                <Link
                  href="/roadmap"
                  onClick={() =>
                    trackEvent("cta_click", {
                      location: "roadmap_secondary",
                      destination: "/roadmap",
                    })
                  }
                  className="text-accent group inline-flex items-center gap-1.5 text-sm font-semibold transition-colors hover:opacity-80"
                >
                  See how roadmaps work
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </ScrollReveal>

          {/* Right: company input + generated plan preview */}
          <ScrollReveal>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="border-border bg-card mx-auto w-full max-w-md rounded-3xl border p-5 shadow-xl sm:p-6"
            >
              {/* Company input mock (decorative, not a real form control) */}
              <span className="text-muted-foreground block text-xs font-semibold tracking-wide uppercase">
                Where are you interviewing?
              </span>
              <div className="border-border bg-background mt-2 flex items-center gap-2 rounded-xl border px-3 py-2.5">
                <Building2 className="text-accent h-4 w-4 shrink-0" />
                <span className="text-foreground text-sm font-medium">Palantir</span>
                <span className="text-muted-foreground ml-1 text-sm">· FDSE</span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {COMPANY_CHIPS.map((c) => (
                  <span
                    key={c.label}
                    className={
                      c.live
                        ? "border-accent/40 bg-accent/10 text-foreground inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium"
                        : "border-border text-muted-foreground inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium"
                    }
                  >
                    {c.label}
                    {!c.live && <span className="text-muted-foreground/70 text-[10px]">soon</span>}
                  </span>
                ))}
              </div>

              {/* Generated plan preview */}
              <div className="border-border mt-5 border-t pt-5">
                <div className="mb-3 flex items-center gap-2">
                  <CalendarDays className="text-accent h-4 w-4" />
                  <span className="text-foreground text-sm font-semibold">Your 4-week plan</span>
                  <span className="text-muted-foreground ml-auto text-[11px]">tailored</span>
                </div>

                <ol className="flex flex-col gap-2.5">
                  {PLAN_WEEKS.map((w, i) => (
                    <motion.li
                      key={w.week}
                      initial={{ opacity: 0, x: -8 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.15 + i * 0.08 }}
                      className="border-border bg-background flex items-center gap-3 rounded-xl border px-3 py-2.5"
                    >
                      <span className="bg-accent/10 text-accent flex h-7 w-12 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold">
                        {w.week}
                      </span>
                      <span className="text-foreground min-w-0 flex-1 truncate text-sm font-medium">
                        {w.focus}
                      </span>
                      <span className="text-muted-foreground hidden shrink-0 text-[11px] sm:inline">
                        {w.round}
                      </span>
                    </motion.li>
                  ))}
                </ol>
              </div>
            </motion.div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}

export default CompanyRoadmapSection
