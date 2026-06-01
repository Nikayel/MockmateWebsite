import type { Metadata } from "next"
import { LenisProvider } from "@/components/providers/LenisProvider"

export const metadata: Metadata = {
  title: "Documentation - Getting Started Guide",
  description: "Complete guide to using CodeSparring for AI-powered coding interview practice. Learn keyboard shortcuts, features, and how to get the most out of your mock interviews.",
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
