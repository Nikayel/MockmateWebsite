"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { motion, useInView, useSpring, useTransform } from "framer-motion"
import { Check, X, ArrowRight } from "lucide-react"
import Link from "next/link"
import { MagneticButton } from "@/components/ui/magnetic-button"

/**
 * Comparison Section - V3 with Animated Scale
 *
 * Features a physics-based balance scale that tips to show value difference
 * Pure SVG + Framer Motion - no external libraries
 */

// Animated balance scale component
function BalanceScale({
  leftValue,
  rightValue,
  isActive,
  onTipComplete,
}: {
  leftValue: number
  rightValue: number
  isActive: boolean
  onTipComplete?: () => void
}) {
  // Calculate tilt based on weight difference (max 15 degrees)
  const weightRatio = Math.min(leftValue / rightValue, 50) // Cap at 50x
  const targetTilt = isActive ? Math.min(weightRatio * 0.3, 15) : 0

  const tilt = useSpring(0, {
    stiffness: 30,
    damping: 12,
    mass: 1.5,
  })

  const tiltDegrees = useTransform(tilt, (v) => v)

  useEffect(() => {
    if (isActive) {
      // Delay the tilt to sync with price animation
      const timer = setTimeout(() => {
        tilt.set(targetTilt)
        // Notify when settled
        setTimeout(() => onTipComplete?.(), 800)
      }, 1200)
      return () => clearTimeout(timer)
    }
  }, [isActive, targetTilt, tilt, onTipComplete])

  return (
    <div className="relative mx-auto mb-8 h-[180px] w-full max-w-md sm:h-[220px]">
      <svg viewBox="0 0 400 200" className="h-full w-full" style={{ overflow: "visible" }}>
        {/* Fulcrum / Stand */}
        <motion.g>
          {/* Base */}
          <path d="M180 180 L220 180 L210 195 L190 195 Z" className="fill-muted-foreground/20" />
          {/* Stand */}
          <rect
            x="195"
            y="100"
            width="10"
            height="80"
            rx="2"
            className="fill-muted-foreground/30"
          />
          {/* Fulcrum point */}
          <circle cx="200" cy="95" r="6" className="fill-muted-foreground/40" />
        </motion.g>

        {/* Beam - rotates around center */}
        <motion.g
          style={{
            originX: "200px",
            originY: "95px",
            rotate: tiltDegrees,
          }}
        >
          {/* Main beam */}
          <rect x="40" y="90" width="320" height="10" rx="5" className="fill-border" />

          {/* Left pan (expensive) */}
          <g>
            {/* String */}
            <line
              x1="70"
              y1="95"
              x2="70"
              y2="130"
              className="stroke-muted-foreground/40"
              strokeWidth="2"
            />
            {/* Pan */}
            <motion.ellipse
              cx="70"
              cy="135"
              rx="45"
              ry="12"
              className="fill-muted-foreground/10 stroke-muted-foreground/30"
              strokeWidth="1.5"
            />
            {/* Weight indicator - stack of coins */}
            <motion.g
              initial={{ opacity: 0, y: -10 }}
              animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }}
              transition={{ delay: 0.8, duration: 0.4 }}
            >
              {[0, 1, 2, 3, 4].map((i) => (
                <motion.rect
                  key={i}
                  x="55"
                  y={120 - i * 6}
                  width="30"
                  height="5"
                  rx="2"
                  className="fill-red-500/60"
                  initial={{ opacity: 0, scaleX: 0 }}
                  animate={isActive ? { opacity: 1, scaleX: 1 } : {}}
                  transition={{ delay: 0.6 + i * 0.15, duration: 0.3 }}
                />
              ))}
            </motion.g>
          </g>

          {/* Right pan (CodeSparring) */}
          <g>
            {/* String */}
            <line x1="330" y1="95" x2="330" y2="130" className="stroke-accent/40" strokeWidth="2" />
            {/* Pan */}
            <motion.ellipse
              cx="330"
              cy="135"
              rx="45"
              ry="12"
              className="fill-accent/5 stroke-accent/30"
              strokeWidth="1.5"
            />
            {/* Weight indicator - single small item */}
            <motion.g
              initial={{ opacity: 0, scale: 0.5 }}
              animate={isActive ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 1.6, type: "spring", stiffness: 200 }}
            >
              <circle cx="330" cy="125" r="8" className="fill-accent/40" />
            </motion.g>
          </g>
        </motion.g>
      </svg>

      {/* Price labels positioned below scale */}
      <div className="absolute right-0 bottom-0 left-0 flex justify-between px-4 sm:px-8">
        <div className="text-center">
          <motion.div
            className="text-muted-foreground/60 text-xs font-medium"
            initial={{ opacity: 0 }}
            animate={isActive ? { opacity: 1 } : {}}
            transition={{ delay: 0.4 }}
          >
            Human Mocks
          </motion.div>
        </div>
        <div className="text-center">
          <motion.div
            className="text-accent text-xs font-medium"
            initial={{ opacity: 0 }}
            animate={isActive ? { opacity: 1 } : {}}
            transition={{ delay: 1.4 }}
          >
            CodeSparring
          </motion.div>
        </div>
      </div>
    </div>
  )
}

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

// Comparison row
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
  const [showSavingsBadge, setShowSavingsBadge] = useState(false)

  const handlePriceComplete = useCallback(() => {
    setShowStrike(true)
  }, [])

  const handleScaleTipComplete = useCallback(() => {
    setShowSavingsBadge(true)
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
            className="mb-8 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
              <span className="text-foreground">The real cost of </span>
              <span className="text-accent">interview prep</span>
            </h2>
            <p className="text-muted-foreground mx-auto mt-4 max-w-2xl">
              5 mock interviews doubles your pass rate. Here&apos;s what that costs.
            </p>
          </motion.div>

          {/* Animated Scale */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <BalanceScale
              leftValue={1125}
              rightValue={25}
              isActive={isInView}
              onTipComplete={handleScaleTipComplete}
            />
          </motion.div>

          {/* Price comparison cards */}
          <motion.div
            className="mb-12 grid gap-4 sm:grid-cols-2"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            {/* Human interviews */}
            <div className="border-border/50 bg-card/30 relative rounded-2xl border p-5">
              <div className="mb-3">
                <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                  Human mock interviews
                </span>
                <p className="text-muted-foreground/60 mt-1 text-[11px]">
                  Interviewing.io, Pramp, etc.
                </p>
              </div>
              <div className="relative inline-block">
                <AnimatedPrice
                  value={1125}
                  delay={600}
                  className="text-muted-foreground/50 text-3xl font-bold sm:text-4xl"
                  onComplete={handlePriceComplete}
                />
                <StrikeThrough show={showStrike} delay={0.2} />
              </div>
              <p className="text-muted-foreground/40 mt-2 text-xs">$225 × 5 sessions</p>
            </div>

            {/* CodeSparring */}
            <div className="border-accent/30 bg-accent/[0.03] relative rounded-2xl border p-5">
              {/* Savings badge */}
              <motion.div
                className="absolute -top-3 right-4"
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={showSavingsBadge ? { opacity: 1, scale: 1, y: 0 } : {}}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
              >
                <span className="border-neural/30 bg-neural/10 text-neural inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold">
                  Save $1,100
                </span>
              </motion.div>

              <div className="mb-3">
                <span className="text-accent text-xs font-medium tracking-wider uppercase">
                  CodeSparring
                </span>
                <p className="text-accent/60 mt-1 text-[11px]">Unlimited AI mock interviews</p>
              </div>
              <div className="flex items-baseline gap-1">
                <AnimatedPrice
                  value={25}
                  delay={1400}
                  className="text-foreground text-3xl font-bold sm:text-4xl"
                />
                <span className="text-muted-foreground">/mo</span>
              </div>
              <p className="text-muted-foreground/60 mt-2 text-xs">Cancel anytime</p>
            </div>
          </motion.div>

          {/* Feature comparison */}
          <motion.div
            className="border-border/40 bg-card/20 rounded-2xl border p-4 sm:p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
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

            <div className="divide-border/20 divide-y">
              {features.map((row, index) => (
                <ComparisonRow key={row.feature} {...row} index={index} />
              ))}
            </div>
          </motion.div>

          {/* CTA */}
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
