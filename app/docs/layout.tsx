import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Documentation - Getting Started Guide",
  description: "Complete guide to using Skillon for AI-powered coding interview practice. Learn keyboard shortcuts, features, and how to get the most out of your mock interviews.",
  keywords: [
    "Skillon documentation",
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
    title: "Documentation - Getting Started Guide | Skillon",
    description: "Everything you need to master coding interviews with AI-powered practice.",
    url: "/docs",
    type: "website",
  },
  twitter: {
    title: "Documentation - Getting Started Guide | Skillon",
    description: "Everything you need to master coding interviews with AI-powered practice.",
  },
}

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
