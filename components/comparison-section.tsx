"use client"

import { useRef, useState, useEffect } from "react"
import { motion, useInView, useSpring, useTransform } from "framer-motion"
import { Check, X, ArrowRight } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

/**
 * Comparison Section - Professional Redesign
 *
 * Design principles applied:
 * - Typography: Work Sans for headings, Open Sans for body (via font-heading/font-sans)
 * - Colors: zinc-800/900 palette matching authenticated dashboard
 * - Cards: Subtle borders (zinc-800/50), minimal backgrounds (zinc-900/50)
 * - Animation: Subtle scroll reveals only, no gimmicky effects
 * - Layout: Clean grid, proper spacing, professional hierarchy
 */

// Animated counter - subtle, professional
function AnimatedPrice({
  value,
  delay = 0,
  className = "",
}: {
  value: number
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.5 })
  const spring = useSpring(0, { stiffness: 50, damping: 25 })
  const display = useTransform(spring, (v) => Math.floor(v).toLocaleString())
  const [displayValue, setDisplayValue] = useState("0")

  useEffect(() => {
    const unsubscribe = display.on("change", setDisplayValue)
    return unsubscribe
  }, [display])

  useEffect(() => {
    if (isInView) {
      const timer = setTimeout(() => spring.set(value), delay)
      return () => clearTimeout(timer)
    }
  }, [isInView, value, spring, delay])

  return (
    <span ref={ref} className={className}>
      ${displayValue}
    </span>
  )
}

// Feature row with clean styling
function FeatureRow({
  feature,
  leetcode,
  human,
  codesparring,
  index,
}: {
  feature: string
  leetcode: boolean | string
  human: boolean | string
  codesparring: boolean
  index: number
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.5 })

  const renderValue = (value: boolean | string, highlight = false) => {
    if (typeof value === "string") {
      return <span className="text-xs text-zinc-500">{value}</span>
    }
    if (value) {
      return <Check className={`h-4 w-4 ${highlight ? "text-emerald-400" : "text-zinc-500"}`} />
    }
    return <X className="h-4 w-4 text-zinc-700" />
  }

  return (
    <motion.div
      ref={ref}
      className="grid grid-cols-[1fr_72px_72px_72px] items-center gap-2 border-b border-zinc-800/30 py-3 last:border-0 sm:grid-cols-[1fr_88px_88px_88px]"
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : {}}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <span className="text-sm text-zinc-300">{feature}</span>
      <div className="flex justify-center">{renderValue(leetcode)}</div>
      <div className="flex justify-center">{renderValue(human)}</div>
      <div className="flex justify-center">{renderValue(codesparring, true)}</div>
    </motion.div>
  )
}

export function ComparisonSection() {
  const sectionRef = useRef(null)
  const isInView = useInView(sectionRef, { once: true, amount: 0.1 })

  const features = [
    {
      feature: "Practice speaking through solutions",
      leetcode: false,
      human: true,
      codesparring: true,
    },
    { feature: "Available 24/7, no scheduling", leetcode: true, human: false, codesparring: true },
    { feature: "Real-time hints while coding", leetcode: false, human: true, codesparring: true },
    {
      feature: "Consistent feedback quality",
      leetcode: "N/A",
      human: "Varies",
      codesparring: true,
    },
    { feature: "Spaced repetition system", leetcode: false, human: false, codesparring: true },
    { feature: "Unlimited practice sessions", leetcode: true, human: false, codesparring: true },
  ]

  return (
    <section ref={sectionRef} className="bg-zinc-950 py-20 lg:py-28">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <motion.div
            className="mb-12 text-center"
            initial={{ opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
          >
            <h2 className="font-heading text-2xl font-semibold text-white sm:text-3xl lg:text-4xl">
              What interview prep costs
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-zinc-500">
              5+ mock interviews significantly improve pass rates. Here's what that investment looks
              like.
            </p>
          </motion.div>

          {/* Price Cards */}
          <div className="mb-10 grid gap-4 sm:grid-cols-2">
            {/* Human Mocks */}
            <motion.div
              className="rounded-xl border border-zinc-800/50 bg-zinc-900/50 p-5"
              initial={{ opacity: 0, y: 16 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              <div className="mb-4">
                <span className="text-xs font-medium tracking-wider text-zinc-500 uppercase">
                  Human Mock Interviews
                </span>
                <p className="mt-0.5 text-[11px] text-zinc-600">Interviewing.io, Pramp Pro, etc.</p>
              </div>

              <div className="flex items-baseline gap-2">
                <AnimatedPrice
                  value={750}
                  delay={300}
                  className="text-3xl font-light text-zinc-400"
                />
                <span className="text-zinc-600">–</span>
                <AnimatedPrice
                  value={1125}
                  delay={500}
                  className="text-3xl font-light text-zinc-400"
                />
              </div>

              <p className="mt-2 text-[11px] text-zinc-600">$150–225 per session × 5 sessions</p>

              <div className="mt-4 space-y-1.5 border-t border-zinc-800/50 pt-4">
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <Check className="h-3 w-3 text-zinc-600" />
                  Real human feedback
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <X className="h-3 w-3 text-zinc-700" />
                  Requires scheduling in advance
                </div>
              </div>
            </motion.div>

            {/* CodeSparring */}
            <motion.div
              className="rounded-xl border border-zinc-700/50 bg-zinc-900/70 p-5"
              initial={{ opacity: 0, y: 16 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <div className="mb-4">
                <span className="text-xs font-medium tracking-wider text-white uppercase">
                  CodeSparring
                </span>
                <p className="mt-0.5 text-[11px] text-zinc-500">Unlimited AI mock interviews</p>
              </div>

              <div className="flex items-baseline gap-1">
                <AnimatedPrice value={25} delay={700} className="text-3xl font-light text-white" />
                <span className="text-sm text-zinc-500">/month</span>
              </div>

              <p className="mt-2 text-[11px] text-zinc-500">Cancel anytime</p>

              <div className="mt-4 space-y-1.5 border-t border-zinc-800/50 pt-4">
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <Check className="h-3 w-3 text-emerald-400" />
                  AI adapts to your skill level
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <Check className="h-3 w-3 text-emerald-400" />
                  Practice at 2am before your 9am interview
                </div>
              </div>
            </motion.div>
          </div>

          {/* Value Statement */}
          <motion.p
            className="mb-10 text-center text-sm text-zinc-500"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            One month costs less than a single human mock session.
          </motion.p>

          {/* Feature Comparison */}
          <motion.div
            className="mb-10 rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-4 sm:p-6"
            initial={{ opacity: 0, y: 16 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            {/* Table Header */}
            <div className="mb-1 grid grid-cols-[1fr_72px_72px_72px] items-end gap-2 border-b border-zinc-800/50 pb-3 sm:grid-cols-[1fr_88px_88px_88px]">
              <span className="text-xs font-medium tracking-wider text-zinc-500 uppercase">
                Feature
              </span>
              <div className="text-center">
                <span className="block text-xs text-zinc-500">LeetCode</span>
                <span className="text-[10px] text-zinc-600">$35/mo</span>
              </div>
              <div className="text-center">
                <span className="block text-xs text-zinc-500">Human</span>
                <span className="text-[10px] text-zinc-600">$150+</span>
              </div>
              <div className="text-center">
                <span className="block text-xs text-white">Ours</span>
                <span className="text-[10px] text-zinc-500">$25/mo</span>
              </div>
            </div>

            {/* Rows */}
            <div>
              {features.map((row, index) => (
                <FeatureRow key={row.feature} {...row} index={index} />
              ))}
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            className="text-center"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <Link href="/interview">
              <Button size="lg" className="bg-white font-medium text-zinc-900 hover:bg-zinc-200">
                Try your first mock free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <p className="mt-3 text-xs text-zinc-600">No credit card required</p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
