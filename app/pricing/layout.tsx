import type { Metadata } from "next"

import { PRICING_CONFIG } from "@/lib/config"
import { getLeetCodeComparisonClaim } from "@/lib/pricing-comparison"
import { truncateForDescription } from "@/lib/seo/learn-metadata"
import { LenisProvider } from "@/components/providers/LenisProvider"

// Session counts and the competitor claim are quota and advertising, not copy.
// Both were typed as literals here and in the two social blocks below, so a
// change to PRICING_CONFIG left three stale claims in the page <head> where
// nobody would look for them.
const freeSessions = PRICING_CONFIG.free.sessionsPerMonth
const proSessions = PRICING_CONFIG.pro.sessionsPerMonth
const comparisonClaim = getLeetCodeComparisonClaim()

const socialDescription = `Start free or go Pro for ${proSessions} AI mock interview sessions a month. ${comparisonClaim}.`

export const metadata: Metadata = {
  title: "Pricing - AI Mock Interview Plans",
  description: truncateForDescription(
    `Start free with ${freeSessions} AI mock interviews a month, or go Pro for ${proSessions}. Full feedback on every session, ${comparisonClaim}.`
  ),
  keywords: [
    "coding interview pricing",
    "mock interview cost",
    "LeetCode alternative price",
    "interview prep subscription",
    "AI interview practice pricing",
    "tech interview preparation cost",
  ],
  alternates: {
    canonical: "/pricing",
  },
  openGraph: {
    title: "Pricing - AI Mock Interview Plans | CodeSparring",
    description: socialDescription,
    url: "/pricing",
    type: "website",
  },
  twitter: {
    title: "Pricing - AI Mock Interview Plans | CodeSparring",
    description: socialDescription,
  },
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <LenisProvider>{children}</LenisProvider>
}
