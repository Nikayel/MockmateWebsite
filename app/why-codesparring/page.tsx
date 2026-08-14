import { WhyCodesparringPageClient } from "@/components/why-codesparring/WhyCodesparringPageClient"
import { WebPageJsonLd } from "@/components/seo/JsonLd"

/**
 * Why CodeSparring Page - Server Component
 *
 * This page explains the science behind our spaced repetition approach.
 * Static content is defined server-side for SEO benefits.
 * Animations and interactive elements are handled by the client component.
 */

// Learning science data with proper research citations - defined server-side for SEO.
//
// No per-principle `color`: the cards all report the same quantity (retention lift), so a
// hue per card encoded nothing and two of the four (purple, amber) were not in the palette.
// The section renders them in the one clay accent the landing sections use. A `visual` field
// also used to live here naming a per-card chart ("wave", "pulse", ...) that was never read.
const sciencePrinciples = [
  {
    icon: "RefreshCw",
    title: "Spacing Effect",
    improvement: "10-30%",
    description:
      "Distributed practice beats cramming. Our algorithm spaces your reviews for optimal long-term retention.",
    citation: "Cepeda et al., 2006",
    source: "Psychological Bulletin",
  },
  {
    icon: "BrainCircuit",
    title: "Testing Effect",
    improvement: "50%",
    description:
      "Active recall strengthens memory more than passive review. Every practice session is a retrieval opportunity.",
    citation: "Roediger & Karpicke, 2006",
    source: "Psychological Science",
  },
  {
    icon: "Layers",
    title: "Interleaving",
    improvement: "43%",
    description:
      "Mixing different patterns daily improves transfer to new problems. We intelligently vary your practice.",
    citation: "Rohrer & Taylor, 2007",
    source: "Instructional Science",
  },
  {
    icon: "TrendingUp",
    title: "Forgetting Curve",
    improvement: "Optimal",
    description:
      "Review at 70-80% retention for maximum efficiency. Our algorithm knows exactly when you're about to forget.",
    citation: "Ebbinghaus, 1885",
    source: "Memory: A Contribution to Experimental Psychology",
  },
]

export default function WhyCodesparringPage() {
  return (
    <>
      {/* JSON-LD for SEO - rendered server-side. HowToJsonLd used to mount here; Google retired
          HowTo rich results in September 2023, so it was bytes and hype copy for no return. */}
      <WebPageJsonLd
        title="Why CodeSparring"
        description="The retention science behind CodeSparring: spaced repetition, active recall, and interleaving applied to interview preparation."
        url="/why-codesparring"
      />
      <WhyCodesparringPageClient sciencePrinciples={sciencePrinciples} />
    </>
  )
}
