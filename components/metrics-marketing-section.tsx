"use client"

import type { ComponentType, ReactNode } from "react"
import { motion } from "framer-motion"
import { BarChart3, Brain, Target, TrendingUp } from "lucide-react"
import Link from "next/link"
import { trackEvent } from "@/lib/analytics"
import { MagneticButton } from "@/components/ui/magnetic-button"

/**
 * MetricsMarketingSection — Apple-style bento.
 *
 * Replaces the previous three competing clusters (4 feature cards + a busy
 * dashboard mock + a 6-item "what gets tracked" grid, each with its own
 * gradients) with ONE calm bento: a single focal readiness ring, three quiet
 * supporting cells, and a compact tracked-signals strip. One accent (clay),
 * one soft wash — low cognitive load, high scannability.
 *
 * Theme-aware: every surface/text/stroke maps through semantic tokens so it
 * reads in both light and dark. The ring + bars are intentionally simple
 * (accent fill on a neutral track) pending the Tremor data-surface rebuild
 * (LPUI-401/402) — kept token-only so they survive the theme until then.
 */

const PATTERN_BARS = [
  { name: "Arrays", score: 92, benchmark: 76 },
  { name: "Trees", score: 75, benchmark: 74 },
  { name: "Graphs", score: 58, benchmark: 71 },
]

const TRACKED = [
  "Test pass rate",
  "Hint usage",
  "Communication",
  "Problem solving",
  "Time to solve",
  "Pattern coverage",
]

const READINESS = 78
const CIRCUMFERENCE = 2 * Math.PI * 56

export function MetricsMarketingSection() {
  return (
    <section className="bg-background relative overflow-hidden py-24">
      {/* One soft clay wash — no competing glows. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(196,112,63,0.06),transparent_65%)]" />

      <div className="relative z-10 container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto mb-12 max-w-2xl text-center"
        >
          <div className="border-border bg-muted mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1">
            <BarChart3 className="text-accent h-3.5 w-3.5" />
            <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Performance analytics
            </span>
          </div>
          <h2 className="font-heading text-foreground text-[clamp(2rem,4vw,3rem)] leading-[1.1] font-bold tracking-[-0.03em]">
            See exactly where you stand.
          </h2>
          <p className="text-muted-foreground mx-auto mt-3 max-w-xl text-base leading-relaxed">
            Every session becomes one readiness score, your weakest patterns, and the next move for
            your practice.
          </p>
        </motion.div>

        {/* Bento grid: ring is the single focal point. */}
        <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2">
          {/* Focal cell — readiness ring (2x2 on desktop) */}
          <BentoCell className="flex flex-col items-center justify-center text-center sm:col-span-2 lg:col-span-2 lg:row-span-2">
            <div className="relative h-40 w-40">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 128 128" aria-hidden>
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  strokeWidth="8"
                  fill="none"
                  className="stroke-foreground/10"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  className="stroke-accent"
                  strokeDasharray={`${CIRCUMFERENCE * (READINESS / 100)} ${CIRCUMFERENCE}`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-foreground text-4xl font-bold">{READINESS}%</span>
                <span className="text-muted-foreground text-xs">Ready</span>
              </div>
            </div>
            <h3 className="text-foreground mt-5 text-lg font-semibold">Interview readiness</h3>
            <p className="text-muted-foreground mt-1 max-w-xs text-sm">
              One score, calibrated to real FAANG rubrics, updated after every session.
            </p>
          </BentoCell>

          {/* Pattern mastery (2 wide) */}
          <BentoCell className="sm:col-span-2 lg:col-span-2">
            <CellLabel icon={Target} title="Pattern mastery" />
            <div className="mt-4 space-y-3">
              {PATTERN_BARS.map((p) => (
                <div key={p.name}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-muted-foreground">{p.name}</span>
                    <span className="text-foreground">{p.score}%</span>
                  </div>
                  <div className="bg-foreground/10 relative h-1.5 rounded-full">
                    <div
                      className="bg-accent h-full rounded-full"
                      style={{ width: `${p.score}%` }}
                    />
                    <div
                      className="bg-muted-foreground/60 absolute top-1/2 h-3 w-px -translate-y-1/2"
                      style={{ left: `${p.benchmark}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-muted-foreground/60 mt-3 text-[11px]">
              Bar = you · tick = FAANG average
            </p>
          </BentoCell>

          {/* Progress trend */}
          <BentoCell>
            <CellLabel icon={TrendingUp} title="Progress" />
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-foreground text-3xl font-bold">+12%</span>
              <span className="text-muted-foreground text-xs">this month</span>
            </div>
            <p className="text-muted-foreground mt-2 text-sm">
              Week-over-week, so real gains stand out from a one-session spike.
            </p>
          </BentoCell>

          {/* Cognitive profiling */}
          <BentoCell>
            <CellLabel icon={Brain} title="Adapts to you" />
            <p className="text-muted-foreground mt-3 text-sm">
              Detects whether you stall on setup, edge cases, or explaining, then targets it.
            </p>
          </BentoCell>
        </div>

        {/* Tracked signals — one compact strip instead of a 6-card grid */}
        <div className="border-border bg-card mx-auto mt-4 max-w-5xl rounded-2xl border p-5">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="text-muted-foreground/70 text-xs font-semibold tracking-wide uppercase">
              What gets tracked
            </span>
            {TRACKED.map((t) => (
              <span
                key={t}
                className="text-muted-foreground inline-flex items-center gap-1.5 text-sm"
              >
                <span className="bg-accent h-1.5 w-1.5 rounded-full" />
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-10 text-center">
          <Link
            href="/login"
            onClick={() =>
              trackEvent("cta_click", { location: "home_metrics", destination: "/login" })
            }
          >
            <MagneticButton className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-lg px-6 py-3 font-medium transition-colors">
              Start tracking your progress
            </MagneticButton>
          </Link>
        </div>
      </div>
    </section>
  )
}

function BentoCell({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className={`border-border bg-card hover:border-accent/30 rounded-2xl border p-6 transition-colors ${className ?? ""}`}
    >
      {children}
    </motion.div>
  )
}

function CellLabel({
  icon: Icon,
  title,
}: {
  icon: ComponentType<{ className?: string }>
  title: string
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="bg-accent/10 flex h-8 w-8 items-center justify-center rounded-lg">
        <Icon className="text-accent h-4 w-4" />
      </span>
      <h3 className="text-foreground text-sm font-semibold">{title}</h3>
    </div>
  )
}

export default MetricsMarketingSection
