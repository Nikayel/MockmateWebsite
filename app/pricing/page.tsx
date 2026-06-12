import { PricingPageClient } from "@/components/pricing/PricingPageClient"
import { FAQPageJsonLd } from "@/components/seo/JsonLd"

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
    answer:
      "The free plan gives you 20+ problems with unlimited practice and 8 full interview sessions per month. Full AI feedback included. No credit card required.",
  },
  {
    question: "How does billing work?",
    answer:
      "Pro subscriptions can be billed monthly ($25/mo) or yearly ($225/year, saving you $75). Yearly plans are charged as a one-time payment for 12 months of access.",
  },
  {
    question: "What if I'm not satisfied?",
    answer:
      "We offer a 30-day money-back guarantee. If you're not completely satisfied with Pro, email us and we'll refund your payment in full.",
  },
  {
    question: "How is this different from LeetCode Premium?",
    answer:
      "LeetCode gives you problems. We give you a system. Our spaced repetition algorithm schedules reviews at the optimal time for long-term retention, plus you get AI-powered mock interviews that feel like the real thing. And we're 29% cheaper.",
  },
  {
    question: "What counts as a 'scenario'?",
    answer:
      "A scenario is one AI interview session. Each scenario includes 10+ DSA problems that you can practice unlimited times. Only starting a new scenario counts against your monthly limit.",
  },
]

export default function PricingPage() {
  return (
    <>
      {/* JSON-LD for SEO - rendered server-side */}
      <FAQPageJsonLd faqs={faqs} />
      <PricingPageClient faqs={faqs} />
    </>
  )
}
