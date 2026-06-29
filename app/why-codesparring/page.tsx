import { WhyCodesparringPageClient } from "@/components/why-codesparring/WhyCodesparringPageClient"
import { HowToJsonLd } from "@/components/seo/JsonLd"

/**
 * Why CodeSparring Page - Server Component
 *
 * This page explains the science behind our spaced repetition approach.
 * Static content is defined server-side for SEO benefits.
 * Animations and interactive elements are handled by the client component.
 */

// Learning science data with proper research citations - defined server-side for SEO
const sciencePrinciples = [
  {
    icon: "RefreshCw",
    title: "Spacing Effect",
    improvement: "10-30%",
    description:
      "Distributed practice beats cramming. Our algorithm spaces your reviews for optimal long-term retention.",
    color: "accent",
    visual: "wave",
    citation: "Cepeda et al., 2006",
    source: "Psychological Bulletin",
  },
  {
    icon: "BrainCircuit",
    title: "Testing Effect",
    improvement: "50%",
    description:
      "Active recall strengthens memory more than passive review. Every practice session is a retrieval opportunity.",
    color: "neural",
    visual: "pulse",
    citation: "Roediger & Karpicke, 2006",
    source: "Psychological Science",
  },
  {
    icon: "Layers",
    title: "Interleaving",
    improvement: "43%",
    description:
      "Mixing different patterns daily improves transfer to new problems. We intelligently vary your practice.",
    color: "purple",
    visual: "layers",
    citation: "Rohrer & Taylor, 2007",
    source: "Instructional Science",
  },
  {
    icon: "TrendingUp",
    title: "Forgetting Curve",
    improvement: "Optimal",
    description:
      "Review at 70-80% retention for maximum efficiency. Our algorithm knows exactly when you're about to forget.",
    color: "amber",
    visual: "curve",
    citation: "Ebbinghaus, 1885",
    source: "Memory: A Contribution to Experimental Psychology",
  },
]

export default function WhySkilonPage() {
  return (
    <>
      {/* JSON-LD for SEO - rendered server-side */}
      <HowToJsonLd />
      <WhyCodesparringPageClient sciencePrinciples={sciencePrinciples} />
    </>
  )
}
