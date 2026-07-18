"use client"

import { motion } from "framer-motion"
import { staggerContainer, staggerItem } from "@/lib/motion"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { DynamicMemoryBrain } from "@/components/three/DynamicMemoryBrain"

/**
 * why-codesparring hero — the DSA retention / forgetting-curve story, led by a
 * 3D "memory brain" instead of a centered-text-in-void hero.
 *
 * Two columns: copy left, the {@link MemoryBrain} right (a swaying, cursor-reactive
 * synapse cloud whose nodes fade then fire back to clay — recall kept alive). One
 * idea, one action: a single headline, one subtitle, one primary CTA + a quiet
 * ghost link, one trust line. No eyebrow pill, no multi-step strip — that stacked
 * read generic and high-cognitive-load.
 *
 * Fully theme-aware: surface, text, overlays, and the brain (faded-node + mote
 * colors and the clay accent) all swap on light/dark via the design tokens, so
 * the hero crossfades in step with the rest of the page.
 */
export function HeroSection() {
  return (
    <section className="font-ui bg-background relative overflow-hidden pt-20">
      {/* One flat surface + a barely-there dot texture; dots invert per theme. */}
      <div className="pointer-events-none absolute inset-0 z-0 [background-image:radial-gradient(rgba(38,36,31,0.05)_1px,transparent_1px)] [background-size:22px_22px] opacity-60 dark:[background-image:radial-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)]" />

      <div className="relative z-10 container mx-auto flex min-h-[86vh] items-center px-4 py-16">
        <div className="grid w-full items-center gap-12 lg:grid-cols-2 lg:gap-8">
          {/* Copy */}
          <motion.div
            className="max-w-xl"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            <motion.h1
              variants={staggerItem}
              className="text-foreground text-[clamp(2.5rem,5.5vw,4rem)] leading-[1.05] font-semibold tracking-[-0.03em]"
            >
              You don&apos;t forget interviews. You forget the patterns.
            </motion.h1>

            <motion.p
              variants={staggerItem}
              className="text-muted-foreground mt-6 max-w-lg text-base leading-7 md:text-lg md:leading-8"
            >
              We resurface each weak DSA pattern right before the forgetting curve takes it — so
              your practice still holds on interview day.
            </motion.p>

            <motion.div
              variants={staggerItem}
              className="mt-9 flex flex-col items-start gap-x-6 gap-y-4 sm:flex-row sm:items-center"
            >
              <Link
                href="/roadmap"
                className="bg-foreground text-background hover:bg-foreground/90 inline-flex rounded-[8px] px-8 py-3.5 text-base font-semibold transition-colors duration-200"
              >
                Create your roadmap
              </Link>
              <Link
                href="/interview"
                className="text-foreground/80 hover:text-accent inline-flex items-center gap-1 text-base font-medium transition-colors duration-200"
              >
                Start practicing free
                <ChevronRight className="h-4 w-4" />
              </Link>
            </motion.div>

            <motion.p variants={staggerItem} className="text-muted-foreground mt-5 text-[12px]">
              No credit card required.
            </motion.p>
          </motion.div>

          {/* The 3D memory brain */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 0.61, 0.36, 1] }}
            className="relative mx-auto aspect-square w-full max-w-[520px]"
          >
            {/* Canvas, masked so it fades into the panel edges. */}
            <div className="absolute inset-0 [mask-image:radial-gradient(circle_at_center,black_55%,transparent_82%)] [-webkit-mask-image:radial-gradient(circle_at_center,black_55%,transparent_82%)]">
              <DynamicMemoryBrain />
            </div>

            {/* Caption */}
            <span className="text-muted-foreground pointer-events-none absolute top-5 left-5 font-mono text-[11px] tracking-wide">
              Your recall, kept sharp
            </span>

            {/* LIVE chip */}
            <div className="border-border bg-foreground/5 pointer-events-none absolute top-5 right-5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="bg-accent absolute inline-flex h-full w-full animate-ping rounded-full opacity-70" />
                <span className="bg-accent relative inline-flex h-1.5 w-1.5 rounded-full" />
              </span>
              <span className="text-muted-foreground font-mono text-[10px] tracking-[0.15em]">
                LIVE
              </span>
            </div>

            {/* Legend */}
            <div className="text-muted-foreground pointer-events-none absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="bg-foreground/30 h-1.5 w-1.5 rounded-full" /> Fading
              </span>
              <span className="flex items-center gap-1.5">
                <span className="bg-accent h-1.5 w-1.5 rounded-full" /> Refreshed
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
