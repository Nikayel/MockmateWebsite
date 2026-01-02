"use client"

import { motion } from "framer-motion"
import { ScrollReveal } from "@/lib/motion"
import { ArrowRight } from "lucide-react"
import Link from "next/link"

/**
 * ProblemTeaser - Compact section highlighting the forgetting curve problem
 *
 * Cognitive Load Principles Applied:
 * - Single focal point (the curve visualization)
 * - Minimal text (one stat, one insight)
 * - Progressive disclosure (link to deep-dive)
 * - Visual > text for memory retention concept
 */

export function ProblemTeaser() {
  return (
    <section className="relative py-20 bg-background overflow-hidden">
      {/* Subtle gradient flow - guides eye downward */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-950/20 to-transparent" />

      <div className="container mx-auto px-4 relative z-10">
        <ScrollReveal>
          <div className="max-w-3xl mx-auto">
            {/* Single clear message */}
            <div className="text-center mb-10">
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-gray-500 text-sm uppercase tracking-widest mb-4"
              >
                The hidden problem
              </motion.p>
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-3xl md:text-4xl font-heading font-bold text-white"
              >
                You forget{" "}
                <span className="text-red-400">80%</span>{" "}
                within a week
              </motion.h2>
            </div>

            {/* Forgetting Curve - The visual anchor */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="relative"
            >
              {/* Subtle glow behind the chart */}
              <div className="absolute inset-0 bg-gradient-to-r from-accent/5 via-transparent to-neural/5 rounded-2xl blur-2xl" />

              <div className="relative bg-gray-950/60 backdrop-blur-sm rounded-2xl border border-gray-800/40 p-6 md:p-8">
                {/* SVG Visualization - responsive with proper aspect ratio */}
                <svg
                  viewBox="0 0 420 160"
                  className="w-full h-auto"
                  preserveAspectRatio="xMidYMid meet"
                  aria-label="Forgetting curve comparison"
                  style={{ maxHeight: '180px', minHeight: '120px' }}
                >
                  <defs>
                    {/* Gradient for the forgetting curve */}
                    <linearGradient id="forgetGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#00d9ff" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#ff6b6b" stopOpacity="0.6" />
                    </linearGradient>
                    {/* Gradient for the retention curve */}
                    <linearGradient id="retainGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#00ff88" />
                      <stop offset="100%" stopColor="#00ff88" />
                    </linearGradient>
                    {/* Glow filter */}
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Axis lines - subtle */}
                  <line x1="40" y1="130" x2="380" y2="130" stroke="#333" strokeWidth="1" opacity="0.5" />
                  <line x1="40" y1="20" x2="40" y2="130" stroke="#333" strokeWidth="1" opacity="0.5" />

                  {/* Y-axis label */}
                  <text x="20" y="75" fill="#666" fontSize="10" textAnchor="middle" transform="rotate(-90, 20, 75)">
                    Memory
                  </text>

                  {/* X-axis labels */}
                  <text x="40" y="145" fill="#666" fontSize="9">Day 1</text>
                  <text x="150" y="145" fill="#666" fontSize="9">Day 3</text>
                  <text x="260" y="145" fill="#666" fontSize="9">Day 7</text>
                  <text x="360" y="145" fill="#666" fontSize="9">Day 30</text>

                  {/* Forgetting curve (without spaced repetition) - animated */}
                  <motion.path
                    d="M 40 25 Q 80 35, 120 70 T 200 105 T 300 120 T 380 125"
                    stroke="url(#forgetGradient)"
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    whileInView={{ pathLength: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                  />

                  {/* Spaced repetition curve - animated with delay */}
                  <motion.path
                    d="M 40 25 C 60 28, 80 35, 95 45
                       L 95 30 C 120 35, 145 45, 170 50
                       L 170 38 C 210 42, 260 48, 300 52
                       L 300 42 C 340 45, 360 48, 380 50"
                    stroke="url(#retainGradient)"
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                    filter="url(#glow)"
                    initial={{ pathLength: 0, opacity: 0 }}
                    whileInView={{ pathLength: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                  />

                  {/* Review points - appear after curve */}
                  {[
                    { cx: 95, cy: 30 },
                    { cx: 170, cy: 38 },
                    { cx: 300, cy: 42 },
                  ].map((point, i) => (
                    <motion.circle
                      key={i}
                      cx={point.cx}
                      cy={point.cy}
                      r="4"
                      fill="#00ff88"
                      initial={{ scale: 0, opacity: 0 }}
                      whileInView={{ scale: 1, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 1.2 + i * 0.2, type: "spring", stiffness: 300 }}
                    />
                  ))}

                  {/* "20%" label at end of forgetting curve */}
                  <motion.text
                    x="390"
                    y="125"
                    fill="#ff6b6b"
                    fontSize="12"
                    fontWeight="600"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 1.3 }}
                  >
                    20%
                  </motion.text>

                  {/* "90%" label at end of retention curve */}
                  <motion.text
                    x="390"
                    y="50"
                    fill="#00ff88"
                    fontSize="12"
                    fontWeight="600"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 1.8 }}
                  >
                    90%
                  </motion.text>
                </svg>

                {/* Legend - responsive stacking on mobile */}
                <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-8 mt-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-0.5 bg-gradient-to-r from-accent to-red-400 rounded-full" />
                    <span className="text-gray-500">Random practice</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-0.5 bg-neural rounded-full" />
                    <span className="text-gray-500">With CodeSparring</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Single insight + CTA */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="text-center mt-8"
            >
              <p className="text-gray-400 mb-4">
                Our algorithm times your reviews at the{" "}
                <span className="text-white">optimal moment</span>—right before you forget.
              </p>
              <Link
                href="/why-skillon"
                className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent/80 transition-colors group"
              >
                Learn the science
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </motion.div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

export default ProblemTeaser
