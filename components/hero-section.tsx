"use client"

import dynamic from "next/dynamic"
import { Bug, Bot, Layers, CheckCircle2, Building2 } from "lucide-react"
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
 * Hero Section — differentiator-led positioning + cognitive-load-aware UX.
 *
 * Strategy: our wedge against LeetCode-style prep is the two rounds it skips —
 * Case Labs (carry a company-style problem from clarify → build inside a real
 * repo) and Bug Fix (debug a real codebase). The hero leads with BOTH as twin
 * differentiators, shown side by side, rather than a single abstract promise.
 *
 * Principles applied (Sweller intrinsic/extraneous/germane load; NN/G):
 * - One clear message (two named rounds), one primary CTA, one quiet secondary.
 * - Concrete over abstract: real failing test + a real milestone flow, not a
 *   LeetCode snippet. Specific company names (Palantir, Stripe) for credibility.
 * - Reduced extraneous motion: static panels; particles + entrance animation
 *   disabled under prefers-reduced-motion.
 * - Restrained color: single warm clay accent token + neutrals.
 */

// The two differentiators, surfaced as named pillars beneath the headline.
const differentiators = [
  { icon: Layers, label: "Company-style Case Labs" },
  { icon: Bug, label: "Real-codebase bug fixes" },
]

// Case Lab milestone flow shown in the right showcase panel.
const milestones = [
  { label: "Clarify", state: "done" },
  { label: "Decompose", state: "done" },
  { label: "Design", state: "active" },
  { label: "Build", state: "todo" },
  { label: "Review", state: "todo" },
] as const

export function HeroSection() {
  const reduceMotion = useReducedMotion()

  return (
    <section className="relative flex min-h-[100svh] flex-col items-center overflow-hidden bg-[#1a1917] px-4 pt-[clamp(8rem,18vh,13rem)] pb-16 text-center font-[var(--font-geist)] md:px-16">
      {/* CSS Background - lightweight base */}
      <GridBackground />

      {/* Subtle particles overlay — skipped entirely under reduced motion */}
      {!reduceMotion && (
        <SubtleParticles
          className="absolute inset-0 z-[1] opacity-20"
          particleCount={12}
          primaryColor="#c4703f"
          secondaryColor="#7c4a2d"
        />
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-[620px] bg-[radial-gradient(circle_at_50%_-20%,rgba(196,112,63,0.12),rgba(26,25,23,0)_70%)]" />

      {/* Content */}
      <motion.div
        className="relative z-10 mx-auto w-full max-w-[1200px]"
        variants={staggerContainer}
        initial={reduceMotion ? false : "initial"}
        animate={reduceMotion ? false : "animate"}
      >
        <motion.div variants={staggerItem} className="mx-auto flex max-w-4xl flex-col items-center">
          {/* Eyebrow: product descriptor */}
          <span className="text-accent mb-8 inline-flex rounded-full border border-white/10 bg-[#232220]/80 px-4 py-1.5 text-[12px] font-bold tracking-[0.1em] uppercase lg:mb-9">
            AI mock interviews for real engineering work
          </span>

          {/* Focal point: differentiator-led headline (two named rounds) */}
          <motion.h1
            variants={staggerItem}
            className="font-heading mb-6 text-[clamp(3rem,7.5vw,4.75rem)] leading-[1.06] font-extrabold tracking-[-0.05em] text-[#ece9e1]"
          >
            Debug <span className="text-accent">real codebases.</span>
            <br />
            Ship <span className="text-accent">company-style</span> projects.
          </motion.h1>

          {/* One subhead naming both differentiators + how they're different */}
          <motion.p
            variants={staggerItem}
            className="mx-auto mb-7 max-w-2xl text-base leading-7 font-medium text-[#c5c1b6] sm:text-lg md:text-xl md:leading-8"
          >
            The two interview rounds LeetCode skips: carry a company-style case from clarify to
            build, or fix a failing test in a real repo—each with an AI interviewer that reacts as
            you work.
          </motion.p>

          {/* The two differentiators, named explicitly */}
          <motion.ul
            variants={staggerItem}
            className="mb-9 flex flex-wrap items-center justify-center gap-2"
          >
            {differentiators.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-sm font-medium text-[#e3ded3]"
              >
                <Icon className="text-accent h-3.5 w-3.5" />
                {label}
              </li>
            ))}
          </motion.ul>

          {/* One primary CTA + one quiet secondary that surfaces the labs round */}
          <motion.div
            variants={staggerItem}
            className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4"
          >
            <Link
              href="/interview"
              onClick={() =>
                trackEvent("cta_click", { location: "hero_primary", destination: "/interview" })
              }
              className="bg-accent inline-flex rounded-[14px] px-10 py-4 text-base font-extrabold text-[#1a1917] shadow-[0_0_40px_rgba(196,112,63,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:opacity-95 hover:shadow-[0_0_46px_rgba(196,112,63,0.34)]"
            >
              Try free
            </Link>
            <Link
              href="/labs"
              onClick={() =>
                trackEvent("cta_click", { location: "hero_secondary", destination: "/labs" })
              }
              className="inline-flex rounded-[14px] border border-white/12 px-7 py-4 text-base font-semibold text-[#e3ded3] transition-colors duration-200 hover:bg-white/[0.06]"
            >
              Explore Case Labs
            </Link>
          </motion.div>

          <motion.p
            variants={staggerItem}
            className="mt-5 text-[13px] font-medium text-[#c5c1b6]/70"
          >
            No credit card required · Company-style case labs · Real-codebase bug fixes
          </motion.p>
        </motion.div>

        {/* Twin showcase: the two differentiators side by side. Left = Bug Fix
            (a real failing test + AI guiding the fix). Right = Case Lab (the
            clarify → build milestone flow with a company badge). */}
        <motion.div
          variants={staggerItem}
          className="mx-auto mt-[clamp(3rem,8vh,5rem)] grid w-full max-w-[1000px] grid-cols-1 gap-4 px-2 md:grid-cols-2"
        >
          {/* Bug Fix panel */}
          <div className="overflow-hidden rounded-[20px] border border-white/10 bg-[#232220]/50 text-left shadow-[0_30px_90px_-40px_rgba(196,112,63,0.4)] backdrop-blur-xl">
            <div className="flex h-10 items-center gap-2 border-b border-white/10 bg-[#2a2926]/50 px-4">
              <Bug className="text-accent h-3.5 w-3.5" />
              <span className="text-xs font-semibold tracking-wide text-[#e3ded3]">Bug Fix</span>
              <span className="ml-auto font-mono text-[11px] text-[#c5c1b6]/60">
                checkout total returns NaN
              </span>
            </div>
            <div className="flex flex-col gap-4 p-6 font-mono text-sm leading-6 text-[#c5c1b6]">
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded bg-[#ffb4ab]/15 px-2 py-0.5 font-semibold text-[#ffb4ab]">
                  ✕ 1 failing
                </span>
                <span className="text-[#c5c1b6]/60">cart.test.ts › applies discount</span>
              </div>
              <pre className="text-[13px] whitespace-pre-wrap">
                <span className="text-[#ffb4ab]">{"expect(total).toBe(90)  // Received: NaN"}</span>
                {"\n\n"}
                <span className="text-accent">function</span>{" "}
                <span className="text-[#ece9e1]">applyDiscount</span>(price, pct) {"{"}
                {"\n  "}
                <span className="text-[#ffb786]">{'// pct arrives as "20", not 0.2'}</span>
                {"\n  "}
                <span className="text-accent">return</span> price - price * pct;{"\n}"}
              </pre>
              <div className="mt-auto rounded-xl border border-white/10 bg-white/[0.03] p-3 font-sans text-xs text-[#c5c1b6]/80">
                <Bot className="text-accent mb-1 inline h-3.5 w-3.5" />{" "}
                <span className="text-[#e3ded3]">
                  Before you change the formula—what are the actual types of price and pct?
                </span>
                <div className="mt-2 text-[#c5c1b6]/60">
                  Navigate the repo · reproduce · find root cause · ship the fix
                </div>
              </div>
            </div>
          </div>

          {/* Case Lab panel */}
          <div className="overflow-hidden rounded-[20px] border border-white/10 bg-[#232220]/50 text-left shadow-[0_30px_90px_-40px_rgba(196,112,63,0.4)] backdrop-blur-xl">
            <div className="flex h-10 items-center gap-2 border-b border-white/10 bg-[#2a2926]/50 px-4">
              <Layers className="text-accent h-3.5 w-3.5" />
              <span className="text-xs font-semibold tracking-wide text-[#e3ded3]">Case Lab</span>
              <span className="ml-auto inline-flex items-center gap-1 rounded bg-[#7c4a2d] px-2 py-0.5 text-[11px] font-medium text-white">
                <Building2 className="h-3 w-3" />
                Palantir · FDSE
              </span>
            </div>
            <div className="flex flex-col gap-4 p-6">
              <ol className="flex flex-col gap-2">
                {milestones.map(({ label, state }) => (
                  <li key={label} className="flex items-center gap-2.5 text-sm">
                    {state === "done" ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-[#4cc79b]" />
                    ) : (
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          state === "active" ? "bg-accent" : "bg-white/20"
                        }`}
                      />
                    )}
                    <span
                      className={
                        state === "active"
                          ? "text-accent font-semibold"
                          : state === "done"
                            ? "text-[#c5c1b6] line-through"
                            : "text-[#c5c1b6]/50"
                      }
                    >
                      {label}
                    </span>
                    {state === "active" && (
                      <span className="ml-auto rounded bg-[#c4703f]/15 px-2 py-0.5 text-[11px] font-medium text-[#e0a074]">
                        you are here
                      </span>
                    )}
                  </li>
                ))}
              </ol>
              <div className="mt-auto rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-[#c5c1b6]/80">
                <Bot className="text-accent mb-1 inline h-3.5 w-3.5" />{" "}
                <span className="text-[#e3ded3]">
                  Good scope. Now—what&apos;s the contract for the dispatch API, and which tradeoff
                  are you defending?
                </span>
                <div className="mt-2 text-[#c5c1b6]/60">
                  Clarify → design → build a real feature, end to end
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  )
}
