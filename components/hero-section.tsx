"use client"

import { ChevronRight, ArrowRight } from "lucide-react"
import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { staggerContainer, staggerItem } from "@/lib/motion"
import { trackEvent } from "@/lib/analytics"
import { DynamicThreeOrb } from "@/components/three/DynamicThreeOrb"

/**
 * Hero Section — theme-aware, premium minimal.
 *
 * One focal column (mono headline → one-line subhead → asymmetric primary CTA +
 * ghost link) over a cursor-sensitive 3D orb. Every surface is driven by the
 * theme tokens (var(--bg)/foreground/accent) so the hero crossfades with the
 * rest of the page when the theme flips. A radial scrim keeps the centered copy
 * readable over the orb; a barely-there dot texture carries depth.
 *
 * The "two rounds" product mockup that used to live here now has its own home
 * at /rounds (linked below the CTAs).
 */
export function HeroSection() {
  const reduceMotion = useReducedMotion()

  return (
    <section className="bg-background text-foreground font-ui relative flex min-h-[100svh] flex-col items-center overflow-hidden px-4 pt-[clamp(8rem,18vh,13rem)] pb-16 text-center md:px-16">
      {/* Cursor-sensitive orb — sits behind everything, recolors with the theme.
          three.js is code-split out of the initial bundle (decorative background). */}
      <DynamicThreeOrb variant="hero" />

      {/* Barely-there dot texture (theme hairline) for depth. */}
      <div
        className="pointer-events-none absolute inset-0 z-[1] opacity-60"
        style={{
          backgroundImage: "radial-gradient(var(--line) 1px, transparent 1px)",
          backgroundSize: "23px 23px",
        }}
      />
      {/* Soft radial scrim — lifts copy contrast a touch without hiding the orb
          (text legibility is mainly carried by the token text-shadow below). */}
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background: "radial-gradient(ellipse 58% 52% at 50% 44%, var(--bg) 8%, transparent 70%)",
          opacity: 0.7,
        }}
      />

      {/* Content */}
      <motion.div
        className="relative z-10 mx-auto w-full max-w-[1200px]"
        variants={staggerContainer}
        initial={reduceMotion ? false : "initial"}
        animate={reduceMotion ? false : "animate"}
      >
        <motion.div variants={staggerItem} className="mx-auto flex max-w-4xl flex-col items-center">
          {/* Eyebrow: names the interview formats the product actually covers.
              It previously read "Used by Palantir & FAANG candidates", which is a
              usage claim the product cannot substantiate pre-launch. Coverage is
              verifiable (Palantir FDSE case labs, DSA/system-design loops, SQL/DE
              rounds all ship today); adoption is not. Swap this for real social
              proof only when there are real users to point at. */}
          <span className="border-border bg-background/40 text-muted-foreground mb-8 inline-flex rounded-full border px-4 py-1.5 text-[12px] font-medium tracking-[0.02em] backdrop-blur-sm lg:mb-9">
            Palantir case labs, FAANG loops, and DE rounds
          </span>

          {/* Focal point: one mono headline. No inline accent — the copy carries itself. */}
          <motion.h1
            variants={staggerItem}
            style={{ textShadow: "0 1px 28px var(--bg), 0 1px 3px var(--bg)" }}
            className="text-foreground mb-6 text-[clamp(2.75rem,6.5vw,4.25rem)] leading-[1.05] font-semibold tracking-[-0.03em]"
          >
            Practice the interview rounds LeetCode skips.
          </motion.h1>

          {/* One subhead, two sentences: the mechanic, then the audience. No filler. */}
          <motion.p
            variants={staggerItem}
            style={{ textShadow: "0 1px 20px var(--bg)" }}
            className="text-muted-foreground mx-auto mb-9 max-w-xl text-base leading-7 sm:text-lg md:text-xl md:leading-8"
          >
            Carry a case from clarify to build, with an AI interviewer that reacts as you work.
            Built for intern and new-grad SWE and DE loops.
          </motion.p>

          {/* Asymmetric CTA: one solid primary (foreground), one inline ghost link. */}
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
                className="bg-foreground text-background hover:bg-foreground/90 inline-flex rounded-[8px] px-8 py-3.5 text-base font-semibold transition-colors duration-200"
              >
                Start practicing free
              </Link>
              {/* Microcopy lives directly under the primary button. The second
                  line quietly surfaces the free courses without adding a
                  section: they are the no-session-cost on-ramp for free users. */}
              <span className="text-muted-foreground mt-2.5 text-[12px]">
                No credit card required.
              </span>
              <span className="text-muted-foreground/80 mt-1 text-[12px]">
                Free{" "}
                <Link
                  href="/learn/python"
                  className="hover:text-foreground underline-offset-2 hover:underline"
                >
                  Python
                </Link>
                ,{" "}
                <Link
                  href="/learn/data-engineering"
                  className="hover:text-foreground underline-offset-2 hover:underline"
                >
                  Data Engineering
                </Link>
                , and{" "}
                <Link
                  href="/learn/system-design"
                  className="hover:text-foreground underline-offset-2 hover:underline"
                >
                  System Design
                </Link>{" "}
                courses included.
              </span>
            </div>
            <Link
              href="/labs"
              onClick={() =>
                trackEvent("cta_click", { location: "hero_secondary", destination: "/labs" })
              }
              className="text-foreground/80 hover:text-accent inline-flex items-center gap-1 text-base font-medium transition-colors duration-200"
            >
              Explore Case Labs
              <ChevronRight className="h-4 w-4" />
            </Link>
          </motion.div>

          {/* Pointer to the relocated "two rounds" mockup. */}
          <motion.div variants={staggerItem} className="mt-10">
            <Link
              href="/rounds"
              onClick={() =>
                trackEvent("cta_click", { location: "hero_rounds", destination: "/rounds" })
              }
              className="text-muted-foreground hover:text-foreground group inline-flex items-center gap-1.5 text-sm font-medium tracking-[0.02em] transition-colors duration-200"
            >
              See the two rounds, one session
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  )
}
