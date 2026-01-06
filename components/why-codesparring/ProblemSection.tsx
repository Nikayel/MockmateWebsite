"use client"

import { motion } from "framer-motion"
import { ScrollReveal } from "@/lib/motion"

export function ProblemSection() {
  return (
    <section className="py-24 bg-black relative overflow-hidden">
      <div className="container mx-auto px-4">
        <ScrollReveal>
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mb-6">
              The Problem with Traditional Practice
            </h2>
            <p className="text-xl text-gray-400 leading-relaxed">
              Without a system, you <span className="text-red-400 font-medium">forget 80%</span> of what you learn within a week.
              Random problem selection leaves weak patterns untouched.
            </p>
            <p className="text-sm text-gray-600 mt-4 italic">
              Based on Ebbinghaus's forgetting curve research (1885)
            </p>
          </div>
        </ScrollReveal>

        {/* Visual representation - Animated Forgetting curve */}
        <ScrollReveal>
          <div className="max-w-3xl mx-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-accent/5 via-transparent to-neural/5 rounded-2xl blur-2xl" />

            <div className="relative bg-gray-950/60 backdrop-blur-sm rounded-2xl border border-gray-800/40 p-6 md:p-8">
              <svg
                viewBox="0 0 400 160"
                className="w-full h-32 md:h-40 lg:h-48"
                aria-label="Forgetting curve comparison"
              >
                <defs>
                  <linearGradient id="forgetGradientWhy" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#00d9ff" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#ff6b6b" stopOpacity="0.6" />
                  </linearGradient>
                  <linearGradient id="retainGradientWhy" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#00ff88" />
                    <stop offset="100%" stopColor="#00ff88" />
                  </linearGradient>
                  <filter id="glowWhy">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>

                <line x1="40" y1="130" x2="380" y2="130" stroke="#333" strokeWidth="1" opacity="0.5" />
                <line x1="40" y1="20" x2="40" y2="130" stroke="#333" strokeWidth="1" opacity="0.5" />

                <text x="20" y="75" fill="#666" fontSize="10" textAnchor="middle" transform="rotate(-90, 20, 75)">
                  Memory
                </text>

                <text x="40" y="145" fill="#666" fontSize="9">Day 1</text>
                <text x="150" y="145" fill="#666" fontSize="9">Day 3</text>
                <text x="260" y="145" fill="#666" fontSize="9">Day 7</text>
                <text x="360" y="145" fill="#666" fontSize="9">Day 30</text>

                <motion.path
                  d="M 40 25 Q 80 35, 120 70 T 200 105 T 300 120 T 380 125"
                  stroke="url(#forgetGradientWhy)"
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  whileInView={{ pathLength: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                />

                <motion.path
                  d="M 40 25 C 60 28, 80 35, 95 45
                     L 95 30 C 120 35, 145 45, 170 50
                     L 170 38 C 210 42, 260 48, 300 52
                     L 300 42 C 340 45, 360 48, 380 50"
                  stroke="url(#retainGradientWhy)"
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                  filter="url(#glowWhy)"
                  initial={{ pathLength: 0, opacity: 0 }}
                  whileInView={{ pathLength: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                />

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

                <motion.text
                  x="385"
                  y="125"
                  fill="#ff6b6b"
                  fontSize="11"
                  fontWeight="600"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 1.3 }}
                >
                  20%
                </motion.text>

                <motion.text
                  x="385"
                  y="50"
                  fill="#00ff88"
                  fontSize="11"
                  fontWeight="600"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 1.8 }}
                >
                  90%
                </motion.text>
              </svg>

              <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-8 mt-4 text-xs">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-6 h-0.5 bg-gradient-to-r from-accent to-red-400 rounded-full" />
                  <span className="text-gray-500">Random practice</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-6 h-0.5 bg-neural rounded-full" />
                  <span className="text-gray-500">With CodeSparring</span>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
