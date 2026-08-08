import type { Metadata } from "next"

import { truncateForDescription } from "@/lib/seo/learn-metadata"
import { LenisProvider } from "@/components/providers/LenisProvider"

export const metadata: Metadata = {
  title: "Documentation - Getting Started Guide",
  description: truncateForDescription(
    "The complete guide to practicing coding interviews with CodeSparring. Keyboard shortcuts, features, and how to get the most from each mock interview."
  ),
  keywords: [
    "CodeSparring documentation",
    "coding interview tutorial",
    "mock interview guide",
    "AI interview help",
    "interview prep getting started",
    "coding practice guide",
  ],
  alternates: {
    canonical: "/docs",
  },
  openGraph: {
    title: "Documentation - Getting Started Guide | CodeSparring",
    description: "Everything you need to master coding interviews with AI-powered practice.",
    url: "/docs",
    type: "website",
  },
  twitter: {
    title: "Documentation - Getting Started Guide | CodeSparring",
    description: "Everything you need to master coding interviews with AI-powered practice.",
  },
}

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <LenisProvider>{children}</LenisProvider>
}
