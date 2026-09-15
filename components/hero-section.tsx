"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { staggerContainer, staggerItem } from "@/lib/motion"
import { trackEvent } from "@/lib/analytics"
import { DynamicThreeOrb } from "@/components/three/DynamicThreeOrb"

/**
 * Hero Section — theme-aware, premium minimal.
 *
 * One focal column (headline → focused subhead with an editorial link → one
 * primary CTA) over a cursor-sensitive 3D orb. Every surface is driven by the
 * theme tokens (var(--bg)/foreground/accent) so the hero crossfades with the
 * rest of the page when the theme flips. A radial scrim keeps the centered copy
 * readable over the orb; a barely-there dot texture carries depth.
 *
 * The "two rounds" product mockup that used to live here now has its own home
 * at /rounds, outside this focused first-screen choice.
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

          {/* The linked phrase opens the decomposition labs; the button below
              opens the lower-friction debugging trial. Only the latter is a CTA. */}
          <motion.p
            variants={staggerItem}
            style={{ textShadow: "0 1px 8px var(--bg), 0 0 28px var(--bg), 0 0 48px var(--bg)" }}
            className="text-foreground/90 mx-auto mb-9 max-w-xl text-base leading-7 sm:text-lg md:text-xl md:leading-8"
          >
            Practice technical interviews for the{" "}
            <Link
              href="/labs"
              onClick={() =>
                trackEvent("cta_click", { location: "hero_age_of_ai", destination: "/labs" })
              }
              className="text-foreground decoration-accent focus-visible:ring-accent/60 hover:text-accent-strong rounded-sm underline decoration-2 underline-offset-4 transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              age of AI
            </Link>
            : scope ambiguous work, defend your decisions, and ship code that holds up.
          </motion.p>

          <motion.div variants={staggerItem} className="flex flex-col items-center">
            <Link
              href="/interview?track=debugging"
              onClick={() =>
                trackEvent("cta_click", {
                  location: "hero_primary",
                  destination: "/interview?track=debugging",
                })
              }
              className="bg-foreground text-background hover:bg-foreground/90 focus-visible:ring-accent/60 inline-flex min-h-12 items-center rounded-[8px] px-8 text-base font-semibold transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Start free
            </Link>
            <span className="text-muted-foreground mt-2.5 text-[12px]">
              No credit card required.
            </span>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  )
}
