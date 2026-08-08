import type { Metadata } from "next"

import { truncateForDescription } from "@/lib/seo/learn-metadata"
import { LenisProvider } from "@/components/providers/LenisProvider"

export const metadata: Metadata = {
  title: "How It Works - Science-Backed Interview Prep",
  description: truncateForDescription(
    "How CodeSparring uses spaced repetition, the testing effect, and 40 years of cognitive science to help you retain DSA patterns for interviews."
  ),
  keywords: [
    "spaced repetition coding",
    "interview prep science",
    "forgetting curve learning",
    "DSA pattern retention",
    "cognitive science interview prep",
    "smart practice algorithm",
    "testing effect learning",
    "interleaving practice coding",
  ],
  alternates: {
    canonical: "/why-codesparring",
  },
  openGraph: {
    title: "How It Works - Science-Backed Interview Prep | CodeSparring",
    description:
      "Stop guessing how much to practice. Our algorithm calculates exactly when and how often to review each problem.",
    url: "/why-codesparring",
    type: "website",
  },
  twitter: {
    title: "How It Works - Science-Backed Interview Prep | CodeSparring",
    description:
      "Stop guessing how much to practice. Our algorithm calculates exactly when and how often to review each problem.",
  },
}

export default function WhySkilonLayout({ children }: { children: React.ReactNode }) {
  return <LenisProvider>{children}</LenisProvider>
}
