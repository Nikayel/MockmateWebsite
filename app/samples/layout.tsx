import type { Metadata } from "next"

import { truncateForDescription } from "@/lib/seo/learn-metadata"
import { LenisProvider } from "@/components/providers/LenisProvider"

export const metadata: Metadata = {
  title: "Sample Interview Feedback Reports",
  description: truncateForDescription(
    "See real AI interview feedback. Browse sample coding sessions graded A+ to C, including Two Sum, Binary Tree, and Dynamic Programming problems."
  ),
  keywords: [
    "coding interview feedback examples",
    "mock interview sample reports",
    "AI interview feedback",
    "Two Sum solution feedback",
    "coding interview grading",
    "DSA interview examples",
    "interview performance analysis",
  ],
  alternates: {
    canonical: "/samples",
  },
  openGraph: {
    title: "Sample Interview Feedback Reports | CodeSparring",
    description: "See what detailed AI-powered interview feedback looks like. From A+ performances to areas needing improvement.",
    url: "/samples",
    type: "website",
  },
  twitter: {
    title: "Sample Interview Feedback Reports | CodeSparring",
    description: "See what detailed AI-powered interview feedback looks like.",
  },
}

export default function SamplesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <LenisProvider>{children}</LenisProvider>
}
