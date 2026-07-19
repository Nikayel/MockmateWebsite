import type { Metadata } from "next"
import { LenisProvider } from "@/components/providers/LenisProvider"

export const metadata: Metadata = {
  title: "Pricing - AI Mock Interview Plans",
  description:
    "Choose your coding interview prep plan. Start free with 8 interviews/month or go Pro for 35 interview sessions a month. 29% cheaper than LeetCode Premium with AI-powered feedback.",
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
