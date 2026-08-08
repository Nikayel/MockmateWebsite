import type { Metadata } from "next"

import { truncateForDescription } from "@/lib/seo/learn-metadata"
import { LenisProvider } from "@/components/providers/LenisProvider"

export const metadata: Metadata = {
  title: "Pricing - AI Mock Interview Plans",
  description: truncateForDescription(
    "Start free with 8 AI mock interviews a month, or go Pro for 35. Full feedback on every session, 29% cheaper than LeetCode Premium."
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
    description:
      "Start free or go Pro for 35 AI mock interview sessions a month. 29% cheaper than LeetCode Premium.",
    url: "/pricing",
    type: "website",
  },
  twitter: {
    title: "Pricing - AI Mock Interview Plans | CodeSparring",
    description:
      "Start free or go Pro for 35 AI mock interview sessions a month. 29% cheaper than LeetCode Premium.",
  },
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <LenisProvider>{children}</LenisProvider>
}
