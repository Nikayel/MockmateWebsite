"use client"

import { motion } from "framer-motion"
import { ScrollReveal } from "@/lib/motion"
import { MagneticButton } from "@/components/ui/magnetic-button"
import { ArrowRight, Brain, Code2, MessageSquareText, Route, Zap } from "lucide-react"
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
    icon: Brain,
    summary: "Show you know the problem before coding.",
    instruction:
      "Clarify requirements, name edge cases, explain your approach, and give time/space complexity in your own words.",
  },
  {
    id: "problem-solving",
    label: "Problem-Solving",
    percent: 25,
    color: "#00ff88",
    icon: Route,
    summary: "Work through the problem systematically.",
    instruction:
      "Break the task down, compare approaches, debug with evidence, and improve from brute force toward an efficient solution.",
  },
  {
    id: "code-quality",
    label: "Code Quality",
    percent: 20,
    color: "#00d9ff",
    icon: Code2,
    summary: "Write code that is correct and maintainable.",
    instruction:
      "Pass the tests, keep the algorithm efficient, use readable names, and structure the solution so another engineer can review it.",
  },
  {
    id: "communication",
    label: "Communication",
    percent: 30,
    color: "#fbbf24",
    icon: MessageSquareText,
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
            className="max-w-5xl mx-auto mb-12"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <p className="text-center text-xs text-gray-600 uppercase tracking-widest mb-6">
              What you&apos;re evaluated on
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {criteria.map((item, index) => {
                const Icon = item.icon

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.45, delay: index * 0.08 }}
                    tabIndex={0}
                    className="group relative min-h-[230px] rounded-2xl border border-white/10 bg-white/[0.04] p-5 outline-none transition-all hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.07] focus-visible:-translate-y-1 focus-visible:border-white/30 focus-visible:ring-2 focus-visible:ring-white/20"
                  >
                    <div className="mb-5 flex items-start justify-between gap-4">
                      <div
                        className="flex h-11 w-11 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `${item.color}1f` }}
                      >
                        <Icon className="h-5 w-5" style={{ color: item.color }} />
                      </div>
                      <div
                        className="rounded-full border px-2.5 py-1 text-xs font-semibold"
                        style={{ borderColor: `${item.color}66`, color: item.color }}
                      >
                        {item.percent}%
                      </div>
                    </div>

                    <h3 className="text-lg font-semibold text-white">{item.label}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-400">
                      {item.summary}
                    </p>

                    <div className="absolute inset-x-4 bottom-4 translate-y-2 rounded-xl border border-white/10 bg-gray-950/95 p-4 opacity-0 shadow-2xl shadow-black/40 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
                      <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                        How to score well
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-gray-200">
                        {item.instruction}
                      </p>
                    </div>
                  </motion.div>
                )
              })}
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
