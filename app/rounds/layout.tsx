import type { Metadata } from "next"
import { LenisProvider } from "@/components/providers/LenisProvider"

export const metadata: Metadata = {
  title: "Rounds - Two rounds, one session",
  description:
    "The interview rounds LeetCode skips: a failing test to debug and a real-world case to design, with an AI interviewer that reacts as you work.",
  alternates: {
    canonical: "/rounds",
  },
  openGraph: {
    title: "Rounds - Two rounds, one session | CodeSparring",
    description: "A failing test to debug and a real-world case to design, in one AI-led session.",
    url: "/rounds",
    type: "website",
  },
  twitter: {
    title: "Rounds - Two rounds, one session | CodeSparring",
    description: "A failing test to debug and a real-world case to design, in one AI-led session.",
  },
}

export default function RoundsLayout({ children }: { children: React.ReactNode }) {
  return <LenisProvider>{children}</LenisProvider>
}
