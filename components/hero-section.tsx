"use client"

import { Bug, Bot, Layers, CheckCircle2, Building2, ChevronRight } from "lucide-react"
import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { staggerContainer, staggerItem } from "@/lib/motion"
import { trackEvent } from "@/lib/analytics"

/**
 * Hero Section — premium minimal (Apple dark mode, not SaaS template).
 *
 * One focal column (mono off-white headline → one-line subhead → asymmetric
 * white CTA + ghost link), then a calm "product strip" of twin panels as quiet
 * proof. Surface is a single flat #0A0A0A — no glow, no gradient on the dark
 * surface; only a barely-there dot texture (~4% opacity) for depth. Orange is
 * gone from the chrome; the cool blue (#5E8BFF) appears on hover/interaction
 * only, never as a fill on a large surface.
 *
 * Note: GridBackground is intentionally NOT imported here — it is shared by
 * several other pages, so the hero inlines its own flat background instead.
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
    <section className="font-ui relative flex min-h-[100svh] flex-col items-center overflow-hidden bg-[#0A0A0A] px-4 pt-[clamp(8rem,18vh,13rem)] pb-16 text-center md:px-16">
      {/* Background — one flat surface. No glow, no gradient. A single barely-there
          dot texture (~4% opacity) carries depth without reading as decoration. */}
      <div className="pointer-events-none absolute inset-0 z-0 [background-image:radial-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:22px_22px] opacity-60" />

      {/* Content */}
      <motion.div
        className="relative z-10 mx-auto w-full max-w-[1200px]"
        variants={staggerContainer}
        initial={reduceMotion ? false : "initial"}
        animate={reduceMotion ? false : "animate"}
      >
        <motion.div variants={staggerItem} className="mx-auto flex max-w-4xl flex-col items-center">
          {/* Eyebrow: no-fill, hairline border, specific social proof — not a slogan */}
          <span className="mb-8 inline-flex rounded-full border border-white/15 px-4 py-1.5 text-[12px] font-medium tracking-[0.02em] text-white/70 lg:mb-9">
            Used by Palantir &amp; FAANG candidates
          </span>

          {/* Focal point: one mono off-white wedge headline. No inline accent —
              the copy carries itself. Geometric sans, weight 600, tight tracking. */}
          <motion.h1
            variants={staggerItem}
            className="mb-6 text-[clamp(2.75rem,6.5vw,4.25rem)] leading-[1.05] font-semibold tracking-[-0.03em] text-[#f5f5f5]"
          >
            Practice the interview rounds LeetCode skips.
          </motion.h1>

          {/* One subhead — one sentence, no filler */}
          <motion.p
            variants={staggerItem}
            className="mx-auto mb-9 max-w-xl text-base leading-7 text-white/55 sm:text-lg md:text-xl md:leading-8"
          >
            Carry a case from clarify to build — with an AI interviewer that reacts as you work.
          </motion.p>

          {/* Asymmetric CTA: one solid white primary, one inline ghost text link.
              Blue (#5E8BFF) is reserved for hover/interaction only. */}
          <motion.div
            variants={staggerItem}
            className="flex flex-col items-center gap-x-6 gap-y-4 sm:flex-row sm:justify-center"
          >
            <div className="flex flex-col items-center">
              <Link
                href="/interview"
                onClick={() =>
                  trackEvent("cta_click", { location: "hero_primary", destination: "/interview" })
                }
                className="inline-flex rounded-[8px] bg-white px-8 py-3.5 text-base font-semibold text-[#0A0A0A] transition-colors duration-200 hover:bg-white/90"
              >
                Try free
              </Link>
              {/* Microcopy lives directly under the primary button */}
              <span className="mt-2.5 text-[12px] text-white/40">No credit card required.</span>
            </div>
            <Link
              href="/labs"
              onClick={() =>
                trackEvent("cta_click", { location: "hero_secondary", destination: "/labs" })
              }
              className="inline-flex items-center gap-1 text-base font-medium text-white/80 transition-colors duration-200 hover:text-[#5E8BFF]"
            >
              Explore Case Labs
              <ChevronRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </motion.div>

        {/* Product strip: the twin rounds as quiet proof, below the focal column */}
        <motion.div
          variants={staggerItem}
          className="mx-auto mt-[clamp(5rem,14vh,8rem)] w-full max-w-[1000px] px-2"
        >
          <p className="mb-8 text-[13px] font-semibold tracking-[0.14em] text-white/45 uppercase">
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
