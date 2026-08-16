"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { HeroSection } from "./HeroSection"
import { ProblemSection } from "./ProblemSection"
import { ScienceSection } from "./ScienceSection"
import { ResearchReferencesSection } from "./ResearchReferencesSection"
import { FinalCTASection } from "./FinalCTASection"

interface WhyCodesparringPageClientProps {
  sciencePrinciples: {
    icon: string
    title: string
    finding: string
    description: string
    citation: string
    source: string
  }[]
}

export function WhyCodesparringPageClient({ sciencePrinciples }: WhyCodesparringPageClientProps) {
  return (
    <main className="bg-background min-h-screen">
      <Header />
      <HeroSection />
      <ProblemSection />
      <ScienceSection sciencePrinciples={sciencePrinciples} />
      <ResearchReferencesSection />
      <FinalCTASection />
      <Footer />
    </main>
  )
}
