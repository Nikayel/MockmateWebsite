import type { Metadata } from "next"

import { truncateForDescription } from "@/lib/seo/learn-metadata"
import { LenisProvider } from "@/components/providers/LenisProvider"

export const metadata: Metadata = {
  title: "Careers - Join Our Team",
  description: truncateForDescription(
    "Join CodeSparring and help developers ace their coding interviews. Open Growth and Fullstack roles, with equity for early team members."
  ),
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

export default function CareersLayout({ children }: { children: React.ReactNode }) {
  return <LenisProvider>{children}</LenisProvider>
}
