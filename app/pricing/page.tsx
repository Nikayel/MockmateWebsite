import { PRICING_CONFIG } from "@/lib/config"
import { getLeetCodeSavingsPercent } from "@/lib/pricing-comparison"
import { PricingPageClient } from "@/components/pricing/PricingPageClient"
import { SessionPreview } from "@/components/pricing/SessionPreview"

const { monthly, yearly } = PRICING_CONFIG.pro.website

/**
 * Pricing Page - Server Component
 *
 * The page itself is a Server Component for SSR/SEO benefits.
 * Static data (FAQs) is passed to the client component.
 * Interactive elements (billing toggle, FAQ accordion) are handled client-side.
 */

// FAQ data - defined server-side for SEO
const faqs = [
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes, you can cancel your subscription at any time. You'll continue to have access to Pro features until the end of your billing period. No questions asked.",
  },
  {
    question: "Is there a free trial?",
    answer: `The free plan gives you 20+ problems with unlimited practice and ${PRICING_CONFIG.free.sessionsPerMonth} full interview sessions per month. Full AI feedback included, plus free Python, SQL, and System Design courses to build your fundamentals. No credit card required.`,
  },
  {
    question: "How does billing work?",
    answer: `Pro subscriptions can be billed monthly (${monthly.priceDisplay}/mo) or yearly (${yearly.totalDisplay}/year, saving you $${yearly.savings}). Yearly plans are charged as a one-time payment for 12 months of access.`,
  },
  {
    question: "What if I'm not satisfied?",
    answer:
      "We offer a 30-day money-back guarantee. If you're not completely satisfied with Pro, email us and we'll refund your payment in full.",
  },
  {
    question: "How is this different from LeetCode Premium?",
    answer: `LeetCode gives you problems. We give you a system. Our spaced repetition algorithm schedules reviews at the optimal time for long-term retention, plus you get AI-powered mock interviews that feel like the real thing. And we're ${getLeetCodeSavingsPercent()}% cheaper.`,
  },
  {
    // The plan cards, the metadata and the quota all meter in "sessions". This
    // answer asked about "scenarios", so the page used two nouns for the one
    // unit it charges for, in the FAQ entry that exists to define it.
    question: "What counts as a session?",
    answer:
      "A session is one AI interview. Starting a session uses 1 of your monthly sessions and grants 10 free opens, so you can come back to its problems again without spending another session.",
  },
]

export default function PricingPage() {
  return (
    <>
      {/* No FAQPage JSON-LD here. Google stopped rendering FAQ rich results on
          2026-05-07, and components/seo/JsonLd.tsx states the rule this follows:
          an unrendered schema type is bytes on every page for no return. The faqs
          array below is still the real page content, just no longer duplicated
          into a graph nothing reads. */}
      <PricingPageClient faqs={faqs}>
        <SessionPreview />
      </PricingPageClient>
    </>
  )
}
