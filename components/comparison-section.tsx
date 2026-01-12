"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { motion, useInView, useSpring, useTransform } from "framer-motion"
import { Check, X, ArrowRight } from "lucide-react"
import Link from "next/link"
import { MagneticButton } from "@/components/ui/magnetic-button"

/**
 * Comparison Section - V2
 *
 * Brings back competitive positioning (LeetCode, Interviewing.io)
 * with a more distinctive visual approach
 */

// Spring-based price counter
function AnimatedPrice({
  value,
  delay = 0,
  className = "",
  onComplete,
}: {
  value: number
  delay?: number
  className?: string
  onComplete?: () => void
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.5 })
  const spring = useSpring(0, { stiffness: 40, damping: 20 })
  const display = useTransform(spring, (v) => Math.floor(v).toLocaleString())
  const [displayValue, setDisplayValue] = useState("0")
  const [hasCompleted, setHasCompleted] = useState(false)

  useEffect(() => {
    const unsubscribe = display.on("change", (v) => {
      setDisplayValue(v)
      if (!hasCompleted && parseInt(v.replace(/,/g, "")) >= value * 0.95) {
        setHasCompleted(true)
        onComplete?.()
      }
    })
    return unsubscribe
  }, [display, value, hasCompleted, onComplete])

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

// Strike-through animation
function StrikeThrough({ show, delay = 0 }: { show: boolean; delay?: number }) {
  return (
    <motion.span
      className="absolute top-1/2 right-0 left-0 h-[3px] origin-left bg-gradient-to-r from-red-500/80 to-red-400/60"
      initial={{ scaleX: 0 }}
      animate={show ? { scaleX: 1 } : { scaleX: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
    />
  )
}

// Comparison row - styled differently than typical tables
function ComparisonRow({
  feature,
  leetcode,
  interviewing,
  codesparring,
  index,
}: {
  feature: string
  leetcode: boolean | string
  interviewing: boolean | string
  codesparring: boolean
  index: number
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.5 })

  const renderCell = (value: boolean | string, isWinner = false) => {
    if (typeof value === "string") {
      return <span className="text-muted-foreground/60 text-xs">{value}</span>
    }
    if (value) {
      return (
        <Check className={`h-4 w-4 ${isWinner ? "text-neural" : "text-muted-foreground/50"}`} />
      )
    }
    return <X className="text-muted-foreground/30 h-4 w-4" />
  }

  return (
    <motion.div
      ref={ref}
      className="grid grid-cols-[1fr_60px_60px_60px] items-center gap-2 py-3 sm:grid-cols-[1fr_80px_80px_80px] sm:gap-4"
      initial={{ opacity: 0, x: -10 }}
      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
      transition={{
        delay: 0.05 * index,
        duration: 0.4,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      <span className="text-foreground/90 text-sm">{feature}</span>
      <div className="flex justify-center">{renderCell(leetcode)}</div>
      <div className="flex justify-center">{renderCell(interviewing)}</div>
      <div className="flex justify-center">{renderCell(codesparring, true)}</div>
    </motion.div>
  )
}

export function ComparisonSection() {
  const sectionRef = useRef(null)
  const isInView = useInView(sectionRef, { once: true, amount: 0.1 })
  const [showStrike, setShowStrike] = useState(false)

  const handlePriceComplete = useCallback(() => {
    setShowStrike(true)
  }, [])

  const features = [
    {
      feature: "Talk through problems out loud",
      leetcode: false,
      interviewing: true,
      codesparring: true,
    },
    {
      feature: "Available 24/7, no scheduling",
      leetcode: true,
      interviewing: false,
      codesparring: true,
    },
    {
      feature: "Real-time feedback as you code",
      leetcode: false,
      interviewing: true,
      codesparring: true,
    },
    {
      feature: "Consistent interviewer quality",
      leetcode: "N/A",
      interviewing: "Varies",
      codesparring: true,
    },
    {
      feature: "Spaced repetition system",
      leetcode: false,
      interviewing: false,
      codesparring: true,
    },
    {
      feature: "Unlimited practice",
      leetcode: true,
      interviewing: false,
      codesparring: true,
    },
  ]

  return (
    <section ref={sectionRef} className="bg-background relative overflow-hidden py-20 lg:py-28">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="from-accent/[0.03] absolute top-0 left-1/2 h-[600px] w-[900px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] via-transparent to-transparent" />
      </div>

      <div className="relative z-10 container mx-auto px-4">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <motion.div
            className="mb-12 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
              <span className="text-foreground">The real cost of </span>
              <span className="text-accent">interview prep</span>
            </h2>
            <p className="text-muted-foreground mx-auto mt-4 max-w-2xl">
              Mock interviews with humans cost $225/session. Research shows 5 sessions doubles your
              pass rate. Do the math.
            </p>
          </motion.div>

          {/* Price comparison - the hook */}
          <motion.div
            className="mb-16 grid gap-4 sm:grid-cols-2"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            {/* Interviewing.io / Human */}
            <div className="border-border/50 bg-card/30 relative rounded-2xl border p-6">
              <div className="mb-4">
                <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                  Human mock interviews
                </span>
                <p className="text-muted-foreground/60 mt-1 text-xs">
                  Interviewing.io, Pramp, etc.
                </p>
              </div>
              <div className="relative inline-block">
                <AnimatedPrice
                  value={1125}
                  delay={400}
                  className="text-muted-foreground/60 text-4xl font-bold"
                  onComplete={handlePriceComplete}
                />
                <StrikeThrough show={showStrike} delay={0.2} />
              </div>
              <p className="text-muted-foreground/50 mt-2 text-xs">$225 × 5 sessions</p>
            </div>

            {/* CodeSparring */}
            <div className="border-accent/30 bg-accent/[0.03] relative rounded-2xl border p-6">
              <div className="absolute -top-3 right-4">
                <motion.span
                  className="border-neural/30 bg-neural/10 text-neural inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold"
                  initial={{ opacity: 0, y: 10 }}
                  animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                  transition={{ delay: 1.8, type: "spring", stiffness: 200 }}
                >
                  45× cheaper
                </motion.span>
              </div>
              <div className="mb-4">
                <span className="text-accent text-xs font-medium tracking-wider uppercase">
                  CodeSparring
                </span>
                <p className="text-accent/60 mt-1 text-xs">Unlimited AI mock interviews</p>
              </div>
              <div className="flex items-baseline gap-1">
                <AnimatedPrice
                  value={25}
                  delay={1200}
                  className="text-foreground text-4xl font-bold"
                />
                <span className="text-muted-foreground">/mo</span>
              </div>
              <p className="text-muted-foreground/70 mt-2 text-xs">Cancel anytime</p>
            </div>
          </motion.div>

          {/* Feature comparison */}
          <motion.div
            className="border-border/40 bg-card/20 rounded-2xl border p-4 sm:p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            {/* Table header */}
            <div className="border-border/30 mb-2 grid grid-cols-[1fr_60px_60px_60px] items-end gap-2 border-b pb-3 sm:grid-cols-[1fr_80px_80px_80px] sm:gap-4">
              <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                Feature
              </span>
              <div className="text-center">
                <span className="text-muted-foreground/70 text-xs font-medium">LeetCode</span>
                <p className="text-muted-foreground/40 text-[10px]">$35/mo</p>
              </div>
              <div className="text-center">
                <span className="text-muted-foreground/70 text-xs font-medium">
                  Interviewing.io
                </span>
                <p className="text-muted-foreground/40 text-[10px]">$225/session</p>
              </div>
              <div className="text-center">
                <span className="text-accent text-xs font-medium">CodeSparring</span>
                <p className="text-accent/60 text-[10px]">$25/mo</p>
              </div>
            </div>

            {/* Feature rows */}
            <div className="divide-border/20 divide-y">
              {features.map((row, index) => (
                <ComparisonRow key={row.feature} {...row} index={index} />
              ))}
            </div>
          </motion.div>

          {/* Bottom positioning + CTA */}
          <motion.div
            className="mt-10 text-center"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
          >
            <p className="text-muted-foreground mb-6 text-sm">
              LeetCode trains problem-solving. Interviewing.io gives you humans.
              <br />
              <span className="text-foreground">
                We combine the best of both—available 24/7, for 45× less.
              </span>
            </p>

            <Link href="/interview">
              <MagneticButton variant="primary" glowColor="accent" size="lg">
                Try it free
                <ArrowRight className="ml-2 h-4 w-4" />
              </MagneticButton>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
