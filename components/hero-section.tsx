"use client"

import { Bug, Bot, Layers, CheckCircle2, Building2, ChevronRight } from "lucide-react"
import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { staggerContainer, staggerItem } from "@/lib/motion"
import { trackEvent } from "@/lib/analytics"

/**
 * Hero Section — differentiator-led, cognitive-load-reduced.
 *
 * One focal column (single-accent headline → subhead → one clay CTA), then a
 * calm "product strip" of twin panels discovered on a short scroll as quiet
 * proof. The wedge is stated once in words (headline + subhead) and shown once
 * in product (panels), removing the prior 4x repetition of "Case Labs / Bug
 * fixes". Background collapsed to two layers (flat warm wash + one soft clay
 * glow): no particles, grid, noise, green glow, or double radial.
 *
 * Note: GridBackground is intentionally NOT imported here — it is shared by
 * several other pages, so the hero inlines its own 2-layer background instead.
 */

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
      {/* Background — two layers only: a flat warm wash + one soft clay glow
          anchored low enough to light both the headline and the panel strip. */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-[#1a1917] via-[#161513] to-[#1a1917]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[720px] bg-[radial-gradient(circle_at_50%_30%,rgba(196,112,63,0.07),rgba(26,25,23,0)_70%)]" />

      {/* Content */}
      <motion.div
        className="relative z-10 mx-auto w-full max-w-[1200px]"
        variants={staggerContainer}
        initial={reduceMotion ? false : "initial"}
        animate={reduceMotion ? false : "animate"}
      >
        <motion.div variants={staggerItem} className="mx-auto flex max-w-4xl flex-col items-center">
          {/* Eyebrow: calm, sentence-case product descriptor */}
          <span className="text-accent mb-8 inline-flex rounded-full border border-white/10 bg-[#232220]/80 px-4 py-1.5 text-[12px] font-semibold tracking-[0.04em] lg:mb-9">
            AI mock interviews for real engineering work
          </span>

          {/* Focal point: single-accent, single-line wedge headline.
              Swap-ready fallback if naming a competitor in the H1 needs review:
              Practice the engineering rounds <span className="text-accent">others skip.</span> */}
          <motion.h1
            variants={staggerItem}
            className="font-heading mb-6 text-[clamp(2.75rem,6.5vw,4.25rem)] leading-[1.05] font-extrabold tracking-[-0.04em] text-[#ece9e1]"
          >
            Practice the interview rounds <span className="text-accent">LeetCode skips.</span>
          </motion.h1>

          {/* One subhead — the single place both rounds are named */}
          <motion.p
            variants={staggerItem}
            className="mx-auto mb-8 max-w-2xl text-base leading-7 font-medium text-[#c5c1b6] sm:text-lg md:text-xl md:leading-8"
          >
            Carry a company-style case from clarify to build, or fix a failing test in a real repo,
            with an AI interviewer that reacts as you work.
          </motion.p>

          {/* One loud primary CTA + one quiet secondary text link */}
          <motion.div
            variants={staggerItem}
            className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4"
          >
            <Link
              href="/interview"
              onClick={() =>
                trackEvent("cta_click", { location: "hero_primary", destination: "/interview" })
              }
              className="bg-accent inline-flex rounded-[14px] px-10 py-4 text-base font-extrabold text-[#1a1917] shadow-[0_0_32px_rgba(196,112,63,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:opacity-95 hover:shadow-[0_0_46px_rgba(196,112,63,0.34)]"
            >
              Try free
            </Link>
            <Link
              href="/labs"
              onClick={() =>
                trackEvent("cta_click", { location: "hero_secondary", destination: "/labs" })
              }
              className="hover:text-accent inline-flex items-center gap-1 px-2 py-4 text-base font-semibold text-[#e3ded3] transition-colors duration-200"
            >
              Explore Case Labs
              <ChevronRight className="h-4 w-4" />
            </Link>
          </motion.div>

          <motion.p
            variants={staggerItem}
            className="mt-5 text-[13px] font-medium text-[#c5c1b6]/70"
          >
            No credit card required.
          </motion.p>
        </motion.div>

        {/* Product strip: the twin rounds as quiet proof, below the focal column */}
        <motion.div
          variants={staggerItem}
          className="mx-auto mt-[clamp(4rem,12vh,7rem)] w-full max-w-[1000px] px-2"
        >
          <p className="mb-5 text-[12px] font-semibold tracking-[0.1em] text-[#c5c1b6]/70 uppercase">
            Two rounds, one session
          </p>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {/* Bug Fix panel */}
            <div className="overflow-hidden rounded-[20px] border border-white/[0.08] bg-[#232220]/40 text-left shadow-none backdrop-blur-xl">
              <div className="flex h-10 items-center gap-2 border-b border-white/10 bg-[#2a2926]/50 px-4">
                <Bug className="text-accent h-3.5 w-3.5" />
                <span className="text-xs font-semibold tracking-wide text-[#e3ded3]">Bug Fix</span>
                <span className="ml-auto font-mono text-[11px] text-[#c5c1b6]/60">
                  checkout total returns NaN
                </span>
              </div>
              <div className="flex flex-col gap-4 p-5 font-mono text-sm leading-6 text-[#c5c1b6]">
                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded bg-[#ffb4ab]/15 px-2 py-0.5 font-semibold text-[#ffb4ab]">
                    ✕ 1 failing
                  </span>
                  <span className="text-[#c5c1b6]/60">cart.test.ts › applies discount</span>
                </div>
                <pre className="text-[13px] whitespace-pre-wrap">
                  <span className="text-[#ffb4ab]">
                    {"expect(total).toBe(90)  // Received: NaN"}
                  </span>
                  {"\n"}
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
                    Before you change the formula, what are the actual types of price and pct?
                  </span>
                </div>
              </div>
            </div>

            {/* Case Lab panel */}
            <div className="overflow-hidden rounded-[20px] border border-white/[0.08] bg-[#232220]/40 text-left shadow-none backdrop-blur-xl">
              <div className="flex h-10 items-center gap-2 border-b border-white/10 bg-[#2a2926]/50 px-4">
                <Layers className="text-accent h-3.5 w-3.5" />
                <span className="text-xs font-semibold tracking-wide text-[#e3ded3]">Case Lab</span>
                <span className="ml-auto inline-flex items-center gap-1 rounded bg-[#7c4a2d] px-2 py-0.5 text-[11px] font-medium text-white">
                  <Building2 className="h-3 w-3" />
                  Palantir · FDSE
                </span>
              </div>
              <div className="flex flex-col gap-4 p-5">
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
                    Good scope. So what&apos;s the contract for the dispatch API, and which tradeoff
                    are you defending?
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  )
}
