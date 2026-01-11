"use client"

import { useRef, useEffect, useState } from "react"
import { motion, useInView } from "framer-motion"
import { Check, X, Mic, Calendar } from "lucide-react"
import { staggerContainer, staggerItem } from "@/lib/motion"

/**
 * Comparison Section - Strategic positioning component
 *
 * Design principles:
 * - Professional and friendly, not "AI generated" looking
 * - Organic timing with spring physics
 * - Progressive disclosure (cost hook → detailed features)
 * - Uses neural minimalism design system
 */

// Animated counter hook - uses spring for natural feel
function useAnimatedCounter(end: number, duration: number = 2000, startOnView: boolean = true) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.5 })

  useEffect(() => {
    if (!startOnView || !isInView) return

    const startTime = Date.now()
    const startValue = 0

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Ease out cubic for natural deceleration
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = Math.floor(startValue + (end - startValue) * eased)

      setCount(current)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    // Small delay before starting for dramatic effect
    const timer = setTimeout(() => {
      requestAnimationFrame(animate)
    }, 300)

    return () => clearTimeout(timer)
  }, [end, duration, isInView, startOnView])

  return { count, ref }
}

// Feature row component with staggered animation
function FeatureRow({
  feature,
  leetcode,
  interviewing,
  codesparring,
  index,
}: {
  feature: string
  leetcode: boolean | string
  interviewing: boolean | string
  codesparring: boolean | string
  index: number
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.5 })

  const renderValue = (value: boolean | string, isHighlight: boolean = false) => {
    if (typeof value === "string") {
      return (
        <span className={`text-xs ${isHighlight ? "text-accent" : "text-gray-400"}`}>{value}</span>
      )
    }
    return value ? (
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={isInView ? { scale: 1, rotate: 0 } : { scale: 0, rotate: -180 }}
        transition={{
          delay: 0.1 * index + 0.3,
          type: "spring",
          stiffness: 200,
          damping: 15,
        }}
      >
        <Check className={`h-4 w-4 ${isHighlight ? "text-neural" : "text-gray-500"}`} />
      </motion.div>
    ) : (
      <motion.div
        initial={{ scale: 0 }}
        animate={isInView ? { scale: 1 } : { scale: 0 }}
        transition={{ delay: 0.1 * index + 0.3, duration: 0.2 }}
      >
        <X className="h-4 w-4 text-gray-600" />
      </motion.div>
    )
  }

  return (
    <motion.div
      ref={ref}
      className="grid grid-cols-4 items-center gap-4 border-b border-gray-800/50 py-3"
      initial={{ opacity: 0, x: -20 }}
      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
      transition={{
        delay: 0.08 * index,
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      <span className="text-sm text-gray-300">{feature}</span>
      <div className="flex justify-center">{renderValue(leetcode)}</div>
      <div className="flex justify-center">{renderValue(interviewing)}</div>
      <div className="flex justify-center">{renderValue(codesparring, true)}</div>
    </motion.div>
  )
}

export function ComparisonSection() {
  const sectionRef = useRef(null)
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 })

  // Animated counters for the cost comparison
  const interviewingCost = useAnimatedCounter(1125, 1800)
  const codesparringCost = useAnimatedCounter(25, 1200)

  const features = [
    { feature: "Practice coding problems", leetcode: true, interviewing: true, codesparring: true },
    {
      feature: "Voice-enabled (talk out loud)",
      leetcode: false,
      interviewing: true,
      codesparring: true,
    },
    { feature: "Real-time feedback", leetcode: false, interviewing: true, codesparring: true },
    { feature: "Available 24/7", leetcode: true, interviewing: false, codesparring: true },
    { feature: "No scheduling needed", leetcode: true, interviewing: false, codesparring: true },
    {
      feature: "Spaced repetition system",
      leetcode: false,
      interviewing: false,
      codesparring: true,
    },
    { feature: "Consistent quality", leetcode: "N/A", interviewing: "Varies", codesparring: true },
  ]

  return (
    <section ref={sectionRef} className="bg-background relative overflow-hidden py-20 lg:py-28">
      {/* Subtle gradient background */}
      <div className="via-accent/[0.02] pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-transparent" />

      <div className="relative z-10 container mx-auto px-4">
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate={isInView ? "animate" : "initial"}
          className="mx-auto max-w-4xl"
        >
          {/* Section header */}
          <motion.div variants={staggerItem} className="mb-12 text-center">
            <h2 className="font-heading mb-4 text-2xl font-bold sm:text-3xl lg:text-4xl">
              <span className="text-foreground">The real cost of </span>
              <span className="text-accent">interview prep</span>
            </h2>
            <p className="text-muted-foreground mx-auto max-w-2xl text-base">
              Mock interviews with humans cost $225 per session. Research shows 5 sessions doubles
              your pass rate. Do the math.
            </p>
          </motion.div>

          {/* Cost comparison - the emotional hook */}
          <motion.div variants={staggerItem} className="mb-16 grid gap-6 md:grid-cols-2">
            {/* Interviewing.io cost */}
            <div className="group relative">
              <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-gray-800 to-gray-700 opacity-50 blur-sm" />
              <div className="bg-card relative rounded-xl border border-gray-800 p-6">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-800">
                    <Calendar className="h-4 w-4 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-300">Human Mock Interviews</h3>
                    <p className="text-xs text-gray-500">Interviewing.io, Pramp, etc.</p>
                  </div>
                </div>

                <div ref={interviewingCost.ref} className="mb-3">
                  <span className="text-4xl font-bold text-gray-400">$</span>
                  <span className="text-5xl font-bold text-gray-300">
                    {interviewingCost.count.toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-500">For 5 sessions to double your pass rate</p>
                <p className="mt-2 text-xs text-gray-600">$225/session × 5 sessions</p>
              </div>
            </div>

            {/* CodeSparring cost */}
            <div className="group relative">
              <div className="from-accent/30 to-neural/30 absolute -inset-0.5 rounded-xl bg-gradient-to-r opacity-70 blur-sm transition-opacity group-hover:opacity-100" />
              <div className="bg-card border-accent/30 relative rounded-xl border p-6">
                <div className="mb-4 flex items-center gap-2">
                  <div className="bg-accent/10 flex h-8 w-8 items-center justify-center rounded-lg">
                    <Mic className="text-accent h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-foreground font-medium">CodeSparring</h3>
                    <p className="text-accent text-xs">Unlimited AI mock interviews</p>
                  </div>
                </div>

                <div ref={codesparringCost.ref} className="mb-3">
                  <span className="text-accent text-4xl font-bold">$</span>
                  <span className="text-accent text-5xl font-bold">{codesparringCost.count}</span>
                  <span className="text-accent/70 ml-1 text-lg">/month</span>
                </div>
                <p className="text-sm text-gray-400">Unlimited practice, same skill building</p>
                <p className="text-neural mt-2 text-xs">That's 45× less expensive</p>
              </div>
            </div>
          </motion.div>

          {/* Feature comparison table */}
          <motion.div variants={staggerItem}>
            <h3 className="mb-6 text-center text-lg font-medium text-gray-400">
              What you actually get
            </h3>

            <div className="bg-card/50 overflow-x-auto rounded-xl border border-gray-800/50 p-4 sm:p-6">
              {/* Table header */}
              <div className="mb-2 grid min-w-[500px] grid-cols-4 gap-4 border-b border-gray-700 pb-3">
                <div className="text-sm font-medium text-gray-500">Feature</div>
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-400">LeetCode</div>
                  <div className="text-xs text-gray-600">$35/mo (350+ problems)</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-400">Interviewing.io</div>
                  <div className="text-xs text-gray-600">$225/session</div>
                </div>
                <div className="text-center">
                  <div className="text-accent text-sm font-medium">CodeSparring</div>
                  <div className="text-accent/70 text-xs">$25/mo</div>
                </div>
              </div>

              {/* Feature rows */}
              <div className="min-w-[500px]">
                {features.map((row, index) => (
                  <FeatureRow key={row.feature} {...row} index={index} />
                ))}
              </div>
            </div>

            {/* Bottom message */}
            <motion.p variants={staggerItem} className="mt-6 text-center text-sm text-gray-500">
              LeetCode trains problem-solving. We train interview performance.
              <span className="text-gray-400"> They're not the same skill.</span>
            </motion.p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
