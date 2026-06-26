"use client"

import type { ComponentType, ReactNode } from "react"
import { motion } from "framer-motion"
import { BarChart3, Brain, Target, TrendingUp } from "lucide-react"
import Link from "next/link"
import { MagneticButton } from "@/components/ui/magnetic-button"

/**
 * MetricsMarketingSection — Apple-style bento.
 *
 * Replaces the previous three competing clusters (4 feature cards + a busy
 * dashboard mock + a 6-item "what gets tracked" grid, each with its own
 * gradients) with ONE calm bento: a single focal readiness ring, three quiet
 * supporting cells, and a compact tracked-signals strip. One accent (clay),
 * one soft wash, dark surface — low cognitive load, high scannability.
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
    <section className="relative overflow-hidden bg-[#1a1917] py-24">
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
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
            <BarChart3 className="h-3.5 w-3.5 text-[#d0824f]" />
            <span className="text-xs font-semibold tracking-wide text-[#c5c1b6] uppercase">
              Performance analytics
            </span>
          </div>
          <h2 className="font-heading text-[clamp(2rem,4vw,3rem)] leading-[1.1] font-bold tracking-[-0.03em] text-[#ece9e1]">
            See exactly where you stand.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-[#c5c1b6]">
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
                  className="stroke-white/10"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  className="stroke-[#d0824f]"
                  strokeDasharray={`${CIRCUMFERENCE * (READINESS / 100)} ${CIRCUMFERENCE}`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-[#ece9e1]">{READINESS}%</span>
                <span className="text-xs text-[#c5c1b6]">Ready</span>
              </div>
            </div>
            <h3 className="mt-5 text-lg font-semibold text-[#ece9e1]">Interview readiness</h3>
            <p className="mt-1 max-w-xs text-sm text-[#c5c1b6]">
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
                    <span className="text-[#c5c1b6]">{p.name}</span>
                    <span className="text-[#ece9e1]">{p.score}%</span>
                  </div>
                  <div className="relative h-1.5 rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-[#d0824f]"
                      style={{ width: `${p.score}%` }}
                    />
                    <div
                      className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-[#c5c1b6]/60"
                      style={{ left: `${p.benchmark}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-[#c5c1b6]/60">Bar = you · tick = FAANG average</p>
          </BentoCell>

          {/* Progress trend */}
          <BentoCell>
            <CellLabel icon={TrendingUp} title="Progress" />
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#ece9e1]">+12%</span>
              <span className="text-xs text-[#c5c1b6]">this month</span>
            </div>
            <p className="mt-2 text-sm text-[#c5c1b6]">
              Week-over-week, so real gains stand out from a one-session spike.
            </p>
          </BentoCell>

          {/* Cognitive profiling */}
          <BentoCell>
            <CellLabel icon={Brain} title="Adapts to you" />
            <p className="mt-3 text-sm text-[#c5c1b6]">
              Detects whether you stall on setup, edge cases, or explaining, then targets it.
            </p>
          </BentoCell>
        </div>

        {/* Tracked signals — one compact strip instead of a 6-card grid */}
        <div className="mx-auto mt-4 max-w-5xl rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="text-xs font-semibold tracking-wide text-[#c5c1b6]/70 uppercase">
              What gets tracked
            </span>
            {TRACKED.map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5 text-sm text-[#c5c1b6]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#d0824f]" />
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-10 text-center">
          <Link href="/signup">
            <MagneticButton className="rounded-lg bg-[#c4703f] px-6 py-3 font-medium text-white transition-colors hover:bg-[#c4703f]/90">
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
      className={`rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:border-[#d0824f]/30 ${className ?? ""}`}
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
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#d0824f]/10">
        <Icon className="h-4 w-4 text-[#d0824f]" />
      </span>
      <h3 className="text-sm font-semibold text-[#ece9e1]">{title}</h3>
    </div>
  )
}

export default MetricsMarketingSection
