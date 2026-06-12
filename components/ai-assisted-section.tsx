"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { ScrollReveal } from "@/lib/motion"
import { ArrowRight, Zap } from "lucide-react"
import Link from "next/link"

/**
 * AIAssistedSection - How our AI interviewer evaluates you
 *
 * These weights match our actual scoring algorithm in lib/scoring.ts
 * Design: Unique horizontal visualization with accurate grading criteria
 */

interface Criterion {
  id: string
  label: string
  percent: number
  color: string
  summary: string
  instruction: string
}

const criteria: Criterion[] = [
  {
    id: "understanding",
    label: "Understanding",
    percent: 25,
    color: "#a78bfa",
    summary: "Show you know the problem before coding.",
    instruction:
      "Clarify requirements, name edge cases, explain your approach, and give time/space complexity in your own words.",
  },
  {
    id: "problem-solving",
    label: "Problem-Solving",
    percent: 25,
    color: "#00ff88",
    summary: "Work through the problem systematically.",
    instruction:
      "Break the task down, compare approaches, debug with evidence, and improve from brute force toward an efficient solution.",
  },
  {
    id: "code-quality",
    label: "Code Quality",
    percent: 20,
    color: "#00d9ff",
    summary: "Write code that is correct and maintainable.",
    instruction:
      "Pass the tests, keep the algorithm efficient, use readable names, and structure the solution so another engineer can review it.",
  },
  {
    id: "communication",
    label: "Communication",
    percent: 30,
    color: "#fbbf24",
    summary: "Make your thinking visible to the interviewer.",
    instruction:
      "Think out loud, answer follow-up questions directly, narrate tradeoffs, and explain fixes as you make them.",
  },
]

interface ActiveTooltip {
  item: Criterion
  /** Center x and top y (viewport coords) of the hovered segment. */
  x: number
  top: number
}

/**
 * ScoreTooltip - portal-rendered scrim + glass card.
 *
 * Rendered to document.body so it escapes the section's nested stacking
 * contexts (ScrollReveal/motion opacity). The fixed scrim dims the busy
 * background copy so the glass card stays readable.
 */
function ScoreTooltip({ active }: { active: ActiveTooltip | null }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {active && (
        <>
          <motion.div
            className="pointer-events-none fixed inset-0 z-[90] bg-black/55 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            className="pointer-events-none fixed z-[91] w-[min(280px,80vw)] -translate-x-1/2 -translate-y-full overflow-hidden rounded-2xl border border-white/15 bg-gray-950/70 p-4 text-left shadow-[0_8px_40px_rgba(0,0,0,0.5)] backdrop-blur-2xl backdrop-saturate-150"
            style={{ left: active.x, top: active.top - 16 }}
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {/* Top inner highlight for the glass edge */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">{active.item.label}</p>
              <span className="text-xs font-semibold" style={{ color: active.item.color }}>
                {active.item.percent}%
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-300">{active.item.summary}</p>
            <p className="mt-3 text-sm leading-relaxed text-gray-100">{active.item.instruction}</p>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}

export function AIAssistedSection() {
  // Which segment is hovered/focused (drives the portal tooltip + scrim).
  const [active, setActive] = useState<ActiveTooltip | null>(null)

  const showTooltip = (item: Criterion, el: HTMLElement) => {
    const rect = el.getBoundingClientRect()
    setActive({ item, x: rect.left + rect.width / 2, top: rect.top })
  }

  return (
    <section className="bg-background relative overflow-hidden py-16 md:py-20">
      {/* Subtle gradient */}
      <div className="via-secondary/20 absolute inset-0 bg-gradient-to-b from-transparent to-transparent" />

      <div className="relative z-10 container mx-auto px-4">
        {/* Header */}
        <ScrollReveal className="mb-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="mb-4 text-sm tracking-widest text-gray-500 uppercase">
              How our AI grades you
            </p>
            <h2 className="font-heading text-3xl font-bold tracking-tight text-white md:text-4xl">
              Real Interview Scoring
            </h2>
          </motion.div>
        </ScrollReveal>

        {/* Grading visualization */}
        <ScrollReveal>
          <motion.div
            className="mx-auto mb-12 max-w-3xl"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <p className="mb-7 text-center text-xs tracking-widest text-gray-500 uppercase">
              What you&apos;re evaluated on
            </p>

            <div className="relative">
              <div
                className="flex h-3 gap-1.5 overflow-visible"
                aria-label="Interview scoring weight breakdown"
              >
                {criteria.map((item) => (
                  <div
                    key={item.id}
                    tabIndex={0}
                    role="button"
                    aria-label={`${item.label}: ${item.percent} percent. ${item.instruction}`}
                    onMouseEnter={(e) => showTooltip(item, e.currentTarget)}
                    onMouseLeave={() => setActive(null)}
                    onFocus={(e) => showTooltip(item, e.currentTarget)}
                    onBlur={() => setActive(null)}
                    className="group focus-visible:ring-offset-background relative rounded-full transition-[transform,box-shadow] duration-300 ease-out outline-none hover:-translate-y-0.5 focus-visible:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2"
                    style={{
                      width: `${item.percent}%`,
                      backgroundColor: item.color,
                    }}
                  >
                    {/* Glow on hover, color-matched to the segment */}
                    <div
                      className="pointer-events-none absolute inset-0 rounded-full opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-70 group-focus-visible:opacity-70"
                      style={{ backgroundColor: item.color }}
                    />
                  </div>
                ))}
              </div>

              {/* Static label row — passively echoes the hovered segment, no tooltip */}
              <div className="mt-5 flex gap-1.5">
                {criteria.map((item) => (
                  <div
                    key={item.id}
                    className="group text-center"
                    style={{ width: `${item.percent}%` }}
                  >
                    <div
                      className="mx-auto mb-2 h-2 w-2 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="text-[11px] leading-tight font-semibold tracking-wide text-gray-400">
                      {item.label}
                    </div>
                    <div className="text-[10px] font-medium text-gray-600">{item.percent}%</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </ScrollReveal>

        {/* Key message */}
        <ScrollReveal>
          <motion.div
            className="mx-auto mb-10 max-w-xl text-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <p className="mb-4 text-lg leading-relaxed text-gray-300">
              The goal: Can you <span className="font-medium text-white">solve problems</span>,{" "}
              <span className="font-medium text-white">explain your thinking</span>, and{" "}
              <span className="font-medium text-white">write clean code</span>?
            </p>
          </motion.div>
        </ScrollReveal>

        {/* CTA */}
        <div className="text-center">
          <Link
            href="/interview"
            className="group inline-flex items-center gap-2.5 rounded-full bg-[#adc6ff] px-7 py-3.5 text-sm font-semibold tracking-wide text-[#001a42] shadow-[0_0_30px_rgba(173,198,255,0.25)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#c1d3ff] hover:shadow-[0_0_40px_rgba(173,198,255,0.4)]"
          >
            <Zap className="h-4 w-4" />
            Practice Like the Real Thing
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>

      <ScoreTooltip active={active} />
    </section>
  )
}

export default AIAssistedSection
