"use client"

import { motion } from "framer-motion"
import { staggerContainer, staggerItem } from "@/lib/motion"
import Link from "next/link"
import { ChevronRight } from "lucide-react"

/**
 * why-codesparring hero — the DSA retention / forgetting-curve story.
 *
 * The wedge here is memory, not problem count: you don't have a practice
 * problem, you have a forgetting problem. We map your weak DSA patterns into a
 * roadmap and resurface each one right before you'd forget it.
 *
 * Premium-minimal styling (shared with the homepage hero): flat #0A0A0A surface
 * with a barely-there dot texture — no glow blobs, no gradient on the dark
 * surface — a no-fill pill, one mono off-white headline (geometric sans, weight
 * 600, tight tracking), one subhead, a compact 3-step "system" line, and an
 * asymmetric white CTA + ghost link. Blue (#5E8BFF) is hover-only.
 */
export function HeroSection() {
  return (
    <section className="font-ui relative flex min-h-[90vh] items-center justify-center overflow-hidden bg-[#0A0A0A] pt-20">
      {/* One flat surface + a barely-there dot texture (~4%). No blobs, no glow,
          no gradient on the dark surface. */}
      <div className="pointer-events-none absolute inset-0 z-0 [background-image:radial-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:22px_22px] opacity-60" />

      <motion.div
        className="relative z-10 container mx-auto px-4 text-center"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <div className="mx-auto max-w-4xl">
          <motion.div variants={staggerItem}>
            <span className="mb-8 inline-flex rounded-full border border-white/15 px-4 py-1.5 text-[12px] font-medium tracking-[0.02em] text-white/70">
              Spaced repetition, built for DSA
            </span>
          </motion.div>

          <motion.h1
            variants={staggerItem}
            className="mb-6 text-[clamp(2.75rem,6.5vw,4.25rem)] leading-[1.05] font-semibold tracking-[-0.03em] text-[#f5f5f5]"
          >
            You don&apos;t forget interviews. You forget the patterns.
          </motion.h1>

          <motion.p
            variants={staggerItem}
            className="mx-auto mb-9 max-w-xl text-base leading-7 text-white/55 sm:text-lg md:text-xl md:leading-8"
          >
            We map your weak DSA patterns into a personalized roadmap and resurface each one right
            before the forgetting curve takes it — so practice actually sticks by interview day.
          </motion.p>

          {/* The system, in three calm steps */}
          <motion.ol
            variants={staggerItem}
            className="mx-auto mb-10 flex max-w-2xl flex-col items-center justify-center gap-2 text-[13px] text-white/45 sm:flex-row sm:gap-5"
          >
            <li className="flex items-center gap-2">
              <span className="font-mono text-white/30">01</span> Map your weak patterns
            </li>
            <ChevronRight className="hidden h-3.5 w-3.5 text-white/20 sm:block" />
            <li className="flex items-center gap-2">
              <span className="font-mono text-white/30">02</span> Get a spaced roadmap
            </li>
            <ChevronRight className="hidden h-3.5 w-3.5 text-white/20 sm:block" />
            <li className="flex items-center gap-2">
              <span className="font-mono text-white/30">03</span> Review right before you forget
            </li>
          </motion.ol>

          <motion.div
            variants={staggerItem}
            className="flex flex-col items-center gap-x-6 gap-y-4 sm:flex-row sm:justify-center"
          >
            <div className="flex flex-col items-center">
              <Link
                href="/roadmap"
                className="inline-flex rounded-[8px] bg-white px-8 py-3.5 text-base font-semibold text-[#0A0A0A] transition-colors duration-200 hover:bg-white/90"
              >
                Create your roadmap
              </Link>
              <span className="mt-2.5 text-[12px] text-white/40">No credit card required.</span>
            </div>
            <Link
              href="/interview"
              className="inline-flex items-center gap-1 text-base font-medium text-white/80 transition-colors duration-200 hover:text-[#5E8BFF]"
            >
              Try free practice
              <ChevronRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </motion.div>

      {/* Scroll indicator — neutral, calm */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <ChevronRight className="h-6 w-6 rotate-90 text-white/25" />
      </motion.div>
    </section>
  )
}
