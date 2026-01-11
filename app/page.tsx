import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { ProblemTeaser } from "@/components/problem-teaser"
import { FeaturesSection } from "@/components/features-section"
import { AIAssistedSection } from "@/components/ai-assisted-section"
import { ComparisonSection } from "@/components/comparison-section"
import { MetricsMarketingSection } from "@/components/metrics-marketing-section"
import { Footer } from "@/components/footer"
import { HomePageClient } from "@/components/home/HomePageClient"

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
export default function HomePage() {
  const header = <Header />
  const footer = <Footer />

  // Marketing content - this is SSR'd and visible to crawlers
  const marketingContent = (
    <main className="bg-background min-h-screen">
      <Header />
      <HeroSection />
      <ProblemTeaser />
      <AIAssistedSection />
      <ComparisonSection />
      <FeaturesSection />
      <MetricsMarketingSection />
      <Footer />
    </main>
  )

  return <HomePageClient header={header} footer={footer} marketingContent={marketingContent} />
}
