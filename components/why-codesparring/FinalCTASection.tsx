"use client"

import { MagneticButton } from "@/components/ui/magnetic-button"
import { ScrollReveal } from "@/lib/motion"
import Link from "next/link"
import { Route, ArrowRight } from "lucide-react"

export function FinalCTASection() {
  return (
    <section className="py-32 bg-black relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gradient-to-r from-accent/10 via-neural/10 to-accent/10 rounded-full blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <ScrollReveal>
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-heading font-bold text-white mb-6">
              Ready to Practice <span className="text-accent">Smarter</span>?
            </h2>
            <p className="text-xl text-gray-400 mb-12 max-w-xl mx-auto">
              Join the future of interview prep with science-backed learning.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <Link href="/roadmap">
                <MagneticButton size="lg" variant="primary" glowColor="accent">
                  <Route className="w-5 h-5" />
                  Create Free Roadmap
                  <ArrowRight className="w-5 h-5" />
                </MagneticButton>
              </Link>
              <Link href="/pricing">
                <MagneticButton size="lg" variant="outline" glowColor="none">
                  View Pricing
                </MagneticButton>
              </Link>
            </div>

            <p className="text-sm text-gray-600">
              No credit card required. Start practicing in 30 seconds.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
