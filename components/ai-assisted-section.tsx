"use client"

import { motion } from "framer-motion"
import { ScrollReveal } from "@/lib/motion"
import { MagneticButton } from "@/components/ui/magnetic-button"
import { ArrowRight, Zap } from "lucide-react"
import Link from "next/link"

/**
 * AIAssistedSection - How our AI interviewer evaluates you
 *
 * These weights match our actual scoring algorithm in lib/scoring.ts
 * Design: Unique horizontal visualization with accurate grading criteria
 */

const criteria = [
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

export function AIAssistedSection() {
  return (
    <section className="relative py-16 md:py-20 bg-background overflow-hidden">
      {/* Subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-secondary/20 to-transparent" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <ScrollReveal className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-sm text-gray-500 uppercase tracking-widest mb-4">
              How our AI grades you
            </p>
            <h2 className="text-4xl md:text-5xl font-heading font-bold text-white mb-4">
              Real Interview Scoring
            </h2>
          </motion.div>
        </ScrollReveal>

        {/* Grading visualization */}
        <ScrollReveal>
          <motion.div
            className="max-w-3xl mx-auto mb-12"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <p className="text-center text-xs text-gray-600 uppercase tracking-widest mb-6">
              What you&apos;re evaluated on
            </p>

            <div className="relative">
              <div
                className="flex h-4 overflow-visible rounded-full bg-gray-900 shadow-inner shadow-black/40"
                aria-label="Interview scoring weight breakdown"
              >
                {criteria.map((item) => (
                  <div
                    key={item.id}
                    tabIndex={0}
                    role="button"
                    aria-label={`${item.label}: ${item.percent} percent. ${item.instruction}`}
                    className="group relative cursor-help outline-none first:rounded-l-full last:rounded-r-full focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    style={{
                      width: `${item.percent}%`,
                      backgroundColor: item.color,
                    }}
                  >
                    <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-4 w-[min(270px,80vw)] -translate-x-1/2 translate-y-2 rounded-xl border border-white/10 bg-gray-950/95 p-4 text-left opacity-0 shadow-2xl shadow-black/40 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-white">{item.label}</p>
                        <span className="text-xs font-semibold" style={{ color: item.color }}>
                          {item.percent}%
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-400">{item.summary}</p>
                      <p className="mt-3 text-sm leading-relaxed text-gray-200">
                        {item.instruction}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex">
                {criteria.map((item) => (
                  <div
                    key={item.id}
                    tabIndex={0}
                    role="button"
                    aria-label={`${item.label}: ${item.percent} percent. ${item.instruction}`}
                    className="group relative cursor-help px-1 text-center outline-none"
                    style={{ width: `${item.percent}%` }}
                  >
                    <div className="mx-auto mb-2 h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <div className="text-[11px] font-medium leading-tight text-gray-400 transition-colors group-hover:text-white group-focus-visible:text-white">
                      {item.label}
                    </div>
                    <div className="text-[10px] text-gray-600">{item.percent}%</div>

                    <div className="pointer-events-none absolute top-full left-1/2 z-20 mt-3 w-[min(260px,80vw)] -translate-x-1/2 translate-y-2 rounded-xl border border-white/10 bg-gray-950/95 p-4 text-left opacity-0 shadow-2xl shadow-black/40 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
                      <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                        How to score well
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-gray-200">
                        {item.instruction}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </ScrollReveal>

        {/* Key message */}
        <ScrollReveal>
          <motion.div
            className="max-w-xl mx-auto text-center mb-10"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <p className="text-gray-300 text-lg leading-relaxed mb-4">
              The goal: Can you <span className="text-white font-medium">solve problems</span>,{' '}
              <span className="text-white font-medium">explain your thinking</span>, and{' '}
              <span className="text-white font-medium">write clean code</span>?
            </p>
          </motion.div>
        </ScrollReveal>

        {/* CTA */}
        <div className="text-center">
          <Link href="/interview">
            <MagneticButton
              size="lg"
              variant="primary"
              glowColor="accent"
              className="group"
            >
              <Zap className="w-5 h-5" />
              Practice Like the Real Thing
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </MagneticButton>
          </Link>
        </div>
      </div>
    </section>
  )
}

export default AIAssistedSection
