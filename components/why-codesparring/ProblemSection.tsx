"use client"

import { motion } from "framer-motion"
import { ScrollReveal } from "@/lib/motion"

/**
 * ProblemSection — the forgetting-curve beat, on the landing design system.
 *
 * Was a hardcoded `bg-black` slab with `text-white` / `text-gray-*` copy, which
 * stranded a black band between a token-driven hero and the rest of the page and
 * went unreadable in light mode. Now: `bg-background`, Work Sans headings, Open Sans
 * body, and clay/green as the only two hues — the same contract the landing sections
 * follow (see comparison-section.tsx).
 *
 * The SVG resolves its colors through the CSS custom properties rather than literal
 * hexes, so the chart crossfades with the theme instead of staying pinned to dark.
 */
export function ProblemSection() {
  return (
    <section className="bg-background relative overflow-hidden py-24">
      <div className="relative z-10 container mx-auto px-4">
        <ScrollReveal>
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <span className="text-muted-foreground text-xs font-semibold tracking-[0.18em] uppercase">
              The problem
            </span>
            <h2 className="font-heading text-foreground mt-5 text-[clamp(2rem,4vw,3rem)] leading-[1.1] font-bold tracking-[-0.03em]">
              The problem with traditional practice
            </h2>
            <p className="text-muted-foreground mx-auto mt-6 max-w-xl text-lg leading-relaxed">
              Without a system, you{" "}
              <span className="text-accent-strong font-semibold">forget 80%</span> of what you learn
              within a week. Random problem selection leaves weak patterns untouched.
            </p>
            <p className="text-muted-foreground mt-4 text-sm">
              Based on Ebbinghaus&apos;s forgetting curve research (1885)
            </p>
          </div>
        </ScrollReveal>

        {/* Visual representation - Animated Forgetting curve */}
        <ScrollReveal>
          <div className="mx-auto max-w-3xl">
            <div className="border-border bg-card relative rounded-2xl border p-6 md:p-8">
              <svg
                viewBox="0 0 400 160"
                className="h-32 w-full md:h-40 lg:h-48"
                aria-label="Forgetting curve comparison"
              >
                <defs>
                  <linearGradient id="forgetGradientWhy" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="var(--destructive)" stopOpacity="0.7" />
                  </linearGradient>
                  <linearGradient id="retainGradientWhy" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="var(--neural)" />
                    <stop offset="100%" stopColor="var(--neural)" />
                  </linearGradient>
                  <filter id="glowWhy">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                <line x1="40" y1="130" x2="380" y2="130" stroke="var(--border)" strokeWidth="1" />
                <line x1="40" y1="20" x2="40" y2="130" stroke="var(--border)" strokeWidth="1" />

                <text
                  x="20"
                  y="75"
                  fill="var(--muted-foreground)"
                  fontSize="10"
                  textAnchor="middle"
                  transform="rotate(-90, 20, 75)"
                >
                  Memory
                </text>

                <text x="40" y="145" fill="var(--muted-foreground)" fontSize="9">
                  Day 1
                </text>
                <text x="150" y="145" fill="var(--muted-foreground)" fontSize="9">
                  Day 3
                </text>
                <text x="260" y="145" fill="var(--muted-foreground)" fontSize="9">
                  Day 7
                </text>
                <text x="360" y="145" fill="var(--muted-foreground)" fontSize="9">
                  Day 30
                </text>

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
                    fill="var(--neural)"
                    initial={{ scale: 0, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 1.2 + i * 0.2, type: "spring", stiffness: 300 }}
                  />
                ))}

                <motion.text
                  x="385"
                  y="125"
                  fill="var(--destructive)"
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
                  fill="var(--neural-strong)"
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

              <div className="mt-4 flex flex-col justify-center gap-4 text-xs sm:flex-row sm:gap-8">
                <div className="flex items-center justify-center gap-2">
                  <div className="from-accent to-destructive h-0.5 w-6 rounded-full bg-gradient-to-r" />
                  <span className="text-muted-foreground">Random practice</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="bg-neural h-0.5 w-6 rounded-full" />
                  <span className="text-muted-foreground">With CodeSparring</span>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
