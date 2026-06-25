"use client"

import dynamic from "next/dynamic"
import { Bug, Bot, Repeat } from "lucide-react"
import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { staggerContainer, staggerItem } from "@/lib/motion"
import { GridBackground } from "@/components/GridBackground"
import { trackEvent } from "@/lib/analytics"

// Lazy load Three.js particles for performance
const SubtleParticles = dynamic(
  () => import("@/components/SubtleParticles").then((mod) => mod.SubtleParticles),
  { ssr: false, loading: () => null }
)

/**
 * Hero Section — bugfix-led positioning + cognitive-load-aware UX.
 *
 * Principles applied (Sweller intrinsic/extraneous/germane load; NN/G):
 * - One message at a time: single headline → one subhead → one primary CTA.
 * - Reduced extraneous motion: static pillar chips instead of a running
 *   typewriter; particles + entrance animation disabled under
 *   prefers-reduced-motion.
 * - Content matches the message: the demo shows a failing test + AI guiding the
 *   fix (real-codebase debugging), not a LeetCode snippet.
 * - Restrained color: single brand accent token + neutrals.
 */

// The three supporting pillars beneath the bugfix wedge. Static (no motion to track).
const pillars = [
  { icon: Bug, label: "Real-codebase debugging" },
  { icon: Bot, label: "An AI interviewer that reacts" },
  { icon: Repeat, label: "Spaced repetition that sticks" },
]

export function HeroSection() {
  const reduceMotion = useReducedMotion()

  return (
    <section className="relative flex min-h-[100svh] flex-col items-center overflow-hidden bg-[#131317] px-4 pt-[clamp(8rem,18vh,13rem)] pb-16 text-center font-[var(--font-geist)] md:px-16">
      {/* CSS Background - lightweight base */}
      <GridBackground />

      {/* Subtle particles overlay — skipped entirely under reduced motion */}
      {!reduceMotion && (
        <SubtleParticles
          className="absolute inset-0 z-[1] opacity-25"
          particleCount={12}
          primaryColor="#22d3ee"
          secondaryColor="#0891b2"
        />
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-[620px] bg-[radial-gradient(circle_at_50%_-20%,rgba(34,211,238,0.10),rgba(19,19,23,0)_70%)]" />

      {/* Content */}
      <motion.div
        className="relative z-10 mx-auto w-full max-w-[1200px]"
        variants={staggerContainer}
        initial={reduceMotion ? false : "initial"}
        animate={reduceMotion ? false : "animate"}
      >
        <motion.div variants={staggerItem} className="mx-auto flex max-w-4xl flex-col items-center">
          {/* Eyebrow: product descriptor */}
          <span className="text-accent mb-8 inline-flex rounded-full border border-white/10 bg-[#2a2a2e]/80 px-4 py-1.5 text-[12px] font-bold tracking-[0.1em] uppercase lg:mb-9">
            AI mock interviews for real engineering work
          </span>

          {/* Focal point: bugfix-led headline */}
          <motion.h1
            variants={staggerItem}
            className="font-heading mb-6 text-[clamp(3rem,7.5vw,4.75rem)] leading-[1.06] font-extrabold tracking-[-0.05em] text-[#e9e8ef]"
          >
            Debug <span className="text-accent">real codebases</span>
            <br />
            in a live AI interview
          </motion.h1>

          {/* One-line subhead naming the three pillars */}
          <motion.p
            variants={staggerItem}
            className="mx-auto mb-7 max-w-2xl text-base leading-7 font-medium text-[#c2c6d6] sm:text-lg md:text-xl md:leading-8"
          >
            Fix failing tests in real codebases with an AI interviewer that reacts as you work—then
            keep it with spaced repetition. The round LeetCode never gave you.
          </motion.p>

          {/* Static pillar chips (supporting pillars, no animation) */}
          <motion.ul
            variants={staggerItem}
            className="mb-9 flex flex-wrap items-center justify-center gap-2"
          >
            {pillars.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-sm font-medium text-[#dfe4f2]"
              >
                <Icon className="text-accent h-3.5 w-3.5" />
                {label}
              </li>
            ))}
          </motion.ul>

          {/* One primary CTA + one quiet secondary */}
          <motion.div
            variants={staggerItem}
            className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4"
          >
            <Link
              href="/interview"
              onClick={() =>
                trackEvent("cta_click", { location: "hero_primary", destination: "/interview" })
              }
              className="bg-accent inline-flex rounded-[14px] px-10 py-4 text-base font-extrabold text-zinc-950 shadow-[0_0_40px_rgba(34,211,238,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:opacity-95 hover:shadow-[0_0_46px_rgba(34,211,238,0.34)]"
            >
              Try free
            </Link>
            <Link
              href="/why-codesparring"
              onClick={() =>
                trackEvent("cta_click", {
                  location: "hero_secondary",
                  destination: "/why-codesparring",
                })
              }
              className="inline-flex rounded-[14px] border border-white/12 px-7 py-4 text-base font-semibold text-[#dfe4f2] transition-colors duration-200 hover:bg-white/[0.06]"
            >
              See how it works
            </Link>
          </motion.div>
        </motion.div>

        {/* Demo: a failing test + AI interviewer guiding the fix (matches the message) */}
        <motion.div
          variants={staggerItem}
          className="mx-auto mt-[clamp(3rem,8vh,5rem)] w-full max-w-[1000px] px-2"
        >
          <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[#1f1f23]/45 shadow-[0_30px_90px_-40px_rgba(34,211,238,0.4)] backdrop-blur-xl">
            <div className="flex h-10 items-center gap-2 border-b border-white/10 bg-[#2a2a2e]/45 px-4">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-[#ffb4ab]/50" />
                <div className="h-2.5 w-2.5 rounded-full bg-[#ffb786]/50" />
                <div className="bg-accent/50 h-2.5 w-2.5 rounded-full" />
              </div>
              <div className="mx-auto font-mono text-xs text-[#c2c6d6]/60">
                Debugging Session: checkout total returns NaN
              </div>
            </div>

            <div className="grid min-h-[360px] grid-cols-1 overflow-hidden text-left md:grid-cols-12">
              <div className="overflow-hidden border-white/10 bg-[#1a1a1f] p-6 font-mono text-sm leading-6 text-[#c2c6d6] md:col-span-8 md:border-r md:p-8">
                <div className="mb-4 flex items-center gap-2 text-xs">
                  <span className="rounded bg-[#ffb4ab]/15 px-2 py-0.5 font-semibold text-[#ffb4ab]">
                    ✕ 1 failing
                  </span>
                  <span className="text-[#c2c6d6]/60">cart.test.ts › applies discount</span>
                </div>
                <pre className="whitespace-pre-wrap">
                  <span className="text-[#ffb4ab]">{"  expect(total).toBe(90)"}</span>
                  {"\n"}
                  <span className="text-[#ffb4ab]">{"  Received: NaN"}</span>
                  {"\n\n"}
                  <span className="text-accent">function</span>{" "}
                  <span className="text-[#e4e1e7]">applyDiscount</span>(price, pct) {"{"}
                  {"\n"}
                  {"  "}
                  <span className="text-[#ffb786]">{'// pct arrives as "20", not 0.2'}</span>
                  {"\n"}
                  {"  "}
                  <span className="text-accent">return</span> price - price * pct;{"\n"}
                  {"}"}
                </pre>
              </div>

              <div className="flex flex-col gap-6 bg-[#1b1b1f]/65 p-6 md:col-span-4 md:p-8">
                <div className="flex items-center gap-3">
                  <div className="border-accent/30 bg-accent/20 flex h-8 w-8 items-center justify-center rounded-full border">
                    <Bot className="text-accent h-4 w-4" />
                  </div>
                  <div className="text-sm font-bold text-[#e4e1e7]">AI Interviewer</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#1f1f23]/60 p-5 text-sm leading-6 text-[#c2c6d6]">
                  "The test expects 90 but gets NaN. Before you change the formula—what are the
                  actual types of <span className="text-accent font-mono">price</span> and{" "}
                  <span className="text-accent font-mono">pct</span> here?"
                </div>
                <div className="mt-auto rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-[#c2c6d6]/80">
                  Navigate the repo · reproduce · find root cause · ship the fix
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  )
}
