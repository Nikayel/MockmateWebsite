import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { ProblemTeaser } from "@/components/problem-teaser"
import { FeaturesSection } from "@/components/features-section"
import { AIAssistedSection } from "@/components/ai-assisted-section"
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
    <main className="min-h-screen bg-background">
      <Header />
      <HeroSection />
      <ProblemTeaser />
      <AIAssistedSection />
      <FeaturesSection />
      <Footer />
    </main>
  )

  return (
    <HomePageClient
      header={header}
      footer={footer}
      marketingContent={marketingContent}
    />
  )
}
