"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { HeroSection } from "./HeroSection"
import { ProblemSection } from "./ProblemSection"
import { ScienceSection } from "./ScienceSection"
import { ComparisonSection } from "./ComparisonSection"
import { RoadmapSection } from "./RoadmapSection"
import { NotificationsSection } from "./NotificationsSection"
import { HowItWorksSection } from "./HowItWorksSection"
import { ResearchReferencesSection } from "./ResearchReferencesSection"
import { FinalCTASection } from "./FinalCTASection"

interface WhyCodesparringPageClientProps {
  sciencePrinciples: {
    icon: string
    title: string
    improvement: string
    description: string
    color: string
    visual: string
    citation: string
    source: string
  }[]
  notificationTypes: {
    icon: string
    title: string
    example: string
  }[]
  comparisonFeatures: {
    feature: string
    codesparring: boolean
    leetcode: boolean
  }[]
}

export function WhyCodesparringPageClient({
  sciencePrinciples,
  notificationTypes,
  comparisonFeatures
}: WhyCodesparringPageClientProps) {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <HeroSection />
      <ProblemSection />
      <ScienceSection sciencePrinciples={sciencePrinciples} />
      <ComparisonSection comparisonFeatures={comparisonFeatures} />
      <RoadmapSection />
      <NotificationsSection notificationTypes={notificationTypes} />
      <HowItWorksSection />
      <ResearchReferencesSection />
      <FinalCTASection />
      <Footer />
    </main>
  )
}
