"use client"

import { MagneticButton } from "@/components/ui/magnetic-button"
import { ScrollReveal } from "@/lib/motion"
import Link from "next/link"
import { Route, ArrowRight } from "lucide-react"

/**
 * FinalCTASection — the closing ask, on the landing design system.
 *
 * `bg-black` and `text-white` are gone; the surface and copy resolve through the
 * tokens so the section crossfades with the theme like every landing section does.
 * The clay highlight stays `text-accent` rather than `accent-strong` because it sits
 * in a 36px+ bold heading, which WCAG scores as large text at 3:1.
 */
export function FinalCTASection() {
  return (
    <section className="bg-background relative overflow-hidden py-32">
      <div className="pointer-events-none absolute inset-0">
        <div className="from-accent/10 via-neural/10 to-accent/10 absolute top-1/2 left-1/2 h-[400px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r blur-[120px]" />
      </div>

      <div className="relative z-10 container mx-auto px-4">
        <ScrollReveal>
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-heading text-foreground text-[clamp(2rem,4vw,3rem)] leading-[1.1] font-bold tracking-[-0.03em]">
              Ready to practice <span className="text-accent">smarter</span>?
            </h2>
            <p className="text-muted-foreground mx-auto mt-6 mb-12 max-w-xl text-lg leading-relaxed">
              Join the future of interview prep with science-backed learning.
            </p>

            <div className="mb-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/roadmap">
                <MagneticButton size="lg" variant="primary" glowColor="accent">
                  <Route className="h-5 w-5" />
                  Create Free Roadmap
                  <ArrowRight className="h-5 w-5" />
                </MagneticButton>
              </Link>
              <Link href="/pricing">
                <MagneticButton size="lg" variant="outline" glowColor="none">
                  View Pricing
                </MagneticButton>
              </Link>
            </div>

            <p className="text-muted-foreground text-sm">
              No credit card required. Start practicing in 30 seconds.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
