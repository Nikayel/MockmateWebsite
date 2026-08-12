import type { Metadata } from "next"
import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { ProblemTeaser } from "@/components/problem-teaser"
import { RelevanceGapSection } from "@/components/relevance-gap-section"
import { CompanyRoadmapSection } from "@/components/company-roadmap-section"
import { FeaturesSection } from "@/components/features-section"
import { AIAssistedSection } from "@/components/ai-assisted-section"
import { ComparisonSection } from "@/components/comparison-section"
import { MetricsMarketingSection } from "@/components/metrics-marketing-section"
import { Footer } from "@/components/footer"
import { HomePageClient } from "@/components/home/HomePageClient"
import { LenisProvider } from "@/components/providers/LenisProvider"
import { HomepagePositioningFAQJsonLd } from "@/components/seo/JsonLd"

/**
 * Homepage - Server Component
 *
 * This page is now a Server Component, which means:
 * - The marketing content is rendered on the server
 * - AI crawlers and search engines can see the full content
 * - Open Graph/social previews work correctly
 * - Initial page load is faster
 *
 * The HomePageClient component handles auth state and conditionally shows
 * either the marketing content (for non-authenticated users) or the
 * authenticated dashboard (for logged-in users).
 */
// The homepage owns the "/" canonical (moved off the root layout so it is not
// inherited by every route).
//
// It now owns its title and description too. Declaring only a canonical meant
// both fell through to the root layout's site-wide defaults, which are written
// to describe the product across every page and run 95 and 257 characters — a
// truncated title and a truncated snippet on the one result that matters most.
// These are sized for the SERP and say what the hero says.
//
// openGraph is deliberately NOT set here: a child openGraph block replaces the
// parent's outright, and the root layout's carries siteName and locale that the
// homepage would silently lose. Its copy already describes the site correctly.
export const metadata: Metadata = {
  title: "Practice the Interview Rounds LeetCode Skips",
  description:
    "AI mock interviews for DSA, debugging, and system design, with feedback on how you explained your solution. Includes free Python, data engineering, and system design courses.",
  alternates: {
    canonical: "/",
  },
}

export default function HomePage() {
  const header = <Header />
  const footer = <Footer />

  // Marketing content - this is SSR'd and visible to crawlers
  const marketingContent = (
    <LenisProvider>
      <main className="bg-background min-h-screen">
        <Header />
        <HeroSection />
        <RelevanceGapSection />
        <CompanyRoadmapSection />
        <AIAssistedSection />
        <FeaturesSection />
        <ProblemTeaser />
        <MetricsMarketingSection />
        <ComparisonSection />
        <Footer />
      </main>
    </LenisProvider>
  )

  return (
    <>
      <HomepagePositioningFAQJsonLd />
      <HomePageClient header={header} footer={footer} marketingContent={marketingContent} />
    </>
  )
}
