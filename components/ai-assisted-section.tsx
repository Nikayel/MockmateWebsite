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
  { id: 'code-quality', label: 'Code Quality', percent: 30, color: '#00d9ff', hint: 'Tests pass, efficient, readable' },
  { id: 'problem-solving', label: 'Problem-Solving', percent: 25, color: '#00ff88', hint: 'Approach, debugging, optimization' },
  { id: 'understanding', label: 'Understanding', percent: 25, color: '#a78bfa', hint: 'Explain your code & complexity' },
  { id: 'communication', label: 'Communication', percent: 20, color: '#fbbf24', hint: 'Share your thought process' },
];

const companies = ['Meta', 'Google', 'Amazon', 'Microsoft'];

export function AIAssistedSection() {
  return (
    <section className="relative py-16 md:py-20 bg-black overflow-hidden">
      {/* Subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-950/30 to-transparent" />

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
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Our AI interviewer evaluates you the same way {companies.join(', ')} interviewers do.
              <span className="text-white"> AI usage is optional</span>—you&apos;re never penalized for not using it.
            </p>
          </motion.div>
        </ScrollReveal>

        {/* Grading visualization - horizontal bar style */}
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

            {/* Horizontal stacked bar */}
            <div className="relative">
              {/* The bar */}
              <div className="flex h-3 rounded-full overflow-hidden bg-gray-900">
                {criteria.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${item.percent}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: idx * 0.1, ease: "easeOut" }}
                    className="relative group cursor-pointer"
                    style={{ backgroundColor: item.color }}
                  >
                    {/* Hover tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 whitespace-nowrap text-center">
                        <div className="text-xs font-medium" style={{ color: item.color }}>
                          {item.label}
                        </div>
                        <div className="text-[10px] text-gray-500">{item.hint}</div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Labels below */}
              <div className="flex mt-4">
                {criteria.map((item) => (
                  <div
                    key={item.id}
                    className="text-center"
                    style={{ width: `${item.percent}%` }}
                  >
                    <div className="text-xs font-medium text-gray-400">{item.label}</div>
                    <div className="text-[10px] text-gray-600">{item.percent}%</div>
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
            <p className="text-gray-500 text-sm">
              <span className="line-through">How often you use AI</span>
              <span className="mx-2">·</span>
              <span className="line-through">Typing speed</span>
              <span className="mx-2">·</span>
              <span className="line-through">Memorized syntax</span>
              <span className="mx-3 text-gray-600">← These don&apos;t matter</span>
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
