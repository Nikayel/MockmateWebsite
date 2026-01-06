"use client"

import { MagneticButton } from "@/components/ui/magnetic-button"
import { ScrollReveal } from "@/lib/motion"
import Link from "next/link"
import { Check, X, ArrowRight } from "lucide-react"

interface ComparisonFeature {
  feature: string
  codesparring: boolean
  leetcode: boolean
}

interface ComparisonSectionProps {
  comparisonFeatures: ComparisonFeature[]
}

export function ComparisonSection({ comparisonFeatures }: ComparisonSectionProps) {
  return (
    <section className="py-24 bg-black relative overflow-hidden">
      <div className="container mx-auto px-4">
        <ScrollReveal>
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-heading font-bold text-white mb-6">
              LeetCode Gives You Problems
              <br />
              <span className="text-accent">We Give You a System</span>
            </h2>
          </div>
        </ScrollReveal>

        <ScrollReveal>
          <div className="max-w-2xl mx-auto">
            <div className="grid grid-cols-[1fr_70px_70px] sm:grid-cols-[1fr_100px_100px] gap-2 sm:gap-4 pb-4 border-b border-gray-800 mb-2">
              <div className="text-gray-500 text-xs sm:text-sm font-medium">Feature</div>
              <div className="text-center text-accent font-bold text-xs sm:text-base">CodeSparring</div>
              <div className="text-center text-gray-500 font-medium text-xs sm:text-base">LeetCode</div>
            </div>

            {comparisonFeatures.map((row, i) => (
              <div
                key={row.feature}
                className="grid grid-cols-[1fr_70px_70px] sm:grid-cols-[1fr_100px_100px] gap-2 sm:gap-4 py-3 sm:py-4 border-b border-gray-800/30 hover:bg-gray-900/30 transition-colors rounded-lg px-2 -mx-2"
              >
                <div className="text-gray-300">{row.feature}</div>
                <div className="text-center">
                  {row.codesparring ? (
                    <Check className="w-5 h-5 text-neural mx-auto" />
                  ) : (
                    <X className="w-5 h-5 text-gray-700 mx-auto" />
                  )}
                </div>
                <div className="text-center">
                  {row.leetcode ? (
                    <Check className="w-5 h-5 text-gray-500 mx-auto" />
                  ) : (
                    <X className="w-5 h-5 text-gray-700 mx-auto" />
                  )}
                </div>
              </div>
            ))}

            <div className="text-center mt-8">
              <Link href="/interview">
                <MagneticButton variant="primary" glowColor="accent">
                  Start Practicing Smarter <ArrowRight className="w-4 h-4" />
                </MagneticButton>
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
