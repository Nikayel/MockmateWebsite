import { WhyCodesparringPageClient } from "@/components/why-codesparring/WhyCodesparringPageClient"
import { HowToJsonLd } from "@/components/seo/JsonLd"

/**
 * Why CodeSparring Page - Server Component
 *
 * This page explains the science behind our spaced repetition approach.
 * Static content is defined server-side for SEO benefits.
 * Animations and interactive elements are handled by the client component.
 */

// Learning science data with proper research citations - defined server-side for SEO
const sciencePrinciples = [
  {
    icon: "RefreshCw",
    title: "Spacing Effect",
    improvement: "10-30%",
    description: "Distributed practice beats cramming. Our algorithm spaces your reviews for optimal long-term retention.",
    color: "accent",
    visual: "wave",
    citation: "Cepeda et al., 2006",
    source: "Psychological Bulletin"
  },
  {
    icon: "BrainCircuit",
    title: "Testing Effect",
    improvement: "50%",
    description: "Active recall strengthens memory more than passive review. Every practice session is a retrieval opportunity.",
    color: "neural",
    visual: "pulse",
    citation: "Roediger & Karpicke, 2006",
    source: "Psychological Science"
  },
  {
    icon: "Layers",
    title: "Interleaving",
    improvement: "43%",
    description: "Mixing different patterns daily improves transfer to new problems. We intelligently vary your practice.",
    color: "purple",
    visual: "layers",
    citation: "Rohrer & Taylor, 2007",
    source: "Instructional Science"
  },
  {
    icon: "TrendingUp",
    title: "Forgetting Curve",
    improvement: "Optimal",
    description: "Review at 70-80% retention for maximum efficiency. Our algorithm knows exactly when you're about to forget.",
    color: "amber",
    visual: "curve",
    citation: "Ebbinghaus, 1885",
    source: "Memory: A Contribution to Experimental Psychology"
  }
]

// Notification types
const notificationTypes = [
  { icon: "RefreshCw", title: "Spaced Review", example: "Time to review 'Two Sum'" },
  { icon: "AlertTriangle", title: "Pattern Decay", example: "Graph skills declining" },
  { icon: "Calendar", title: "Daily Reminder", example: "15 min keeps skills sharp" },
  { icon: "Flame", title: "Streak Alert", example: "Don't break your 7-day streak!" },
  { icon: "Clock", title: "Interview Countdown", example: "5 days left - focus on DP" },
  { icon: "Trophy", title: "Milestone", example: "You mastered Binary Search!" },
  { icon: "Target", title: "Weak Pattern", example: "Trees need attention" },
  { icon: "Route", title: "Roadmap Update", example: "2 days behind schedule" },
  { icon: "Timer", title: "Optimal Time", example: "Perfect time to review" },
  { icon: "Moon", title: "Rest Reminder", example: "Rest helps consolidation" },
]

// Comparison data
const comparisonFeatures = [
  { feature: "Personalized practice schedule", codesparring: true, leetcode: false },
  { feature: "Knows when you'll forget", codesparring: true, leetcode: false },
  { feature: "AI-powered review timing", codesparring: true, leetcode: false },
  { feature: "Pattern-specific decay tracking", codesparring: true, leetcode: false },
  { feature: "Interview countdown optimization", codesparring: true, leetcode: false },
  { feature: "Science-backed spaced repetition", codesparring: true, leetcode: false },
  { feature: "Smart notification system", codesparring: true, leetcode: false },
  { feature: "Large problem database", codesparring: true, leetcode: true },
]

export default function WhySkilonPage() {
  return (
    <>
      {/* JSON-LD for SEO - rendered server-side */}
      <HowToJsonLd />
      <WhyCodesparringPageClient
        sciencePrinciples={sciencePrinciples}
        notificationTypes={notificationTypes}
        comparisonFeatures={comparisonFeatures}
      />
    </>
  )
}
