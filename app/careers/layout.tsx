import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Careers - Join Our Team",
  description: "Join the CodeSparring team and help developers ace their coding interviews. Open roles in Growth and Fullstack Development. Equity-based compensation for early team members.",
  keywords: [
    "CodeSparring careers",
    "startup jobs",
    "AI startup hiring",
    "developer jobs",
    "fullstack developer job",
    "growth marketing job",
    "equity compensation",
  ],
  alternates: {
    canonical: "/careers",
  },
  openGraph: {
    title: "Careers - Join Our Team | CodeSparring",
    description: "Small team. Big ideas. Help developers nail their interviews with AI.",
    url: "/careers",
    type: "website",
  },
  twitter: {
    title: "Careers - Join Our Team | CodeSparring",
    description: "Small team. Big ideas. Help developers nail their interviews with AI.",
  },
}

export default function CareersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
