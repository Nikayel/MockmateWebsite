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
// No per-principle `color`: the cards all report the same kind of claim, so a hue per card
// encoded nothing and two of the four (purple, amber) were not in the palette. The section
// renders them in the one clay accent the landing sections use. A `visual` field also used
// to live here naming a per-card chart ("wave", "pulse", ...) that was never read.
//
// The lead line used to be a retention percentage: 10-30%, 50%, 43%, "Optimal". Those numbers
// were presented as findings of the papers cited beneath them, and none of them can be traced
// to the cited paper. A magnitude attached to a real citation is worse than no number at all,
// because the citation lends it authority it never earned. What survives is the DIRECTION each
// study established, which is what these four literatures actually agree on and what the product
// is built to exploit. The `finding` field is named for what it now holds; `improvement` was a
// name that only made sense while the value was a percentage lift.
const sciencePrinciples = [
  {
    icon: "RefreshCw",
    title: "Spacing Effect",
    finding: "Beats cramming",
    description:
      "The same practice spread across days is retained longer than practice packed into one sitting. Your reviews are scheduled apart instead of repeated in a block.",
    citation: "Cepeda et al., 2006",
    source: "Psychological Bulletin",
  },
  {
    icon: "BrainCircuit",
    title: "Testing Effect",
    finding: "Beats rereading",
    description:
      "Pulling an answer out of memory strengthens it more than looking at the answer again. Every session asks you to produce the solution, not recognize it.",
    citation: "Roediger & Karpicke, 2006",
    source: "Psychological Science",
  },
  {
    icon: "Layers",
    title: "Interleaving",
    finding: "Beats one pattern at a time",
    description:
      "Mixing problem types feels harder in the moment and transfers better to problems you have not seen. Your roadmap spreads coding, debugging, and design work through the plan instead of clustering it.",
    citation: "Rohrer & Taylor, 2007",
    source: "Instructional Science",
  },
  {
    icon: "TrendingUp",
    title: "Forgetting Curve",
    finding: "Memory fades without review",
    description:
      "Retention drops sharply after you first learn something, and each review flattens the curve. The scheduler aims your next review at a pattern before it fades, instead of at random.",
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
