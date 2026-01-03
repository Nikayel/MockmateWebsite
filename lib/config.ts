/**
 * Shared application configuration
 * Web-first platform with VS Code extension coming soon
 */

export const PRICING_CONFIG = {
  free: {
    name: "Free",
    price: 0,
    priceDisplay: "$0",
    period: "",
    description: "Try CodeSparring and see if it's right for you",
    sessionsPerMonth: 2,
    sessionsDisplay: "2 interview scenarios per month",
    features: [
      "2 interview scenarios per month",
      "All 200+ DSA problems available",
      "AI interviewer with real-time feedback",
      "Performance tracking & analytics",
      "Web-based Monaco code editor",
    ],
    limitations: [
      "No personalized study roadmap",
      "No spaced repetition scheduling",
      "No pattern mastery tracking",
    ],
    buttonText: "Start Free",
    popular: false,
  },
  pro: {
    // Different pricing per platform
    website: {
      name: "Pro",
      price: 25,
      priceDisplay: "$25",
      period: "/mo",
      description: "Everything you need to land your dream job",
      monthly: {
        price: 25,
        priceDisplay: "$25",
        period: "/mo",
        billingNote: "Billed monthly",
      },
      yearly: {
        price: 225,
        priceDisplay: "$19",
        period: "/mo",
        totalPrice: 225,
        totalDisplay: "$225",
        billingNote: "Billed as $225/year",
        savings: 75,
        savingsPercent: 25,
        oneTime: true,
      },
    },
    vscode: {
      name: "Pro",
      price: 19,
      priceDisplay: "$19",
      period: "/mo",
      description: "Practice in your favorite IDE",
      comingSoon: true,
    },
    // Shared features
    sessionsPerMonth: 35,
    sessionsDisplay: "350+ problems per month",
    // Core value: what makes Pro worth it
    valueProps: [
      {
        title: "Unlimited Practice per Scenario",
        description: "Each scenario unlocks 10+ DSA problems. Practice each problem as many times as you need—only the scenario counts against your limit.",
      },
      {
        title: "Spaced Repetition System",
        description: "AI schedules your reviews at the scientifically optimal time for long-term retention. Never forget what you've learned.",
      },
      {
        title: "Personalized Study Roadmap",
        description: "Get a custom prep plan based on your target company, interview date, and skill gaps. Updated daily based on your progress.",
      },
    ],
    // Complete feature list for Pro
    features: [
      "350+ problems per month",
      "Unlimited practice within each scenario",
      "10+ DSA problems per scenario",
      "Spaced repetition scheduling (SM-2 algorithm)",
      "Personalized study roadmap",
      "Pattern mastery tracking (15 patterns)",
      "Company-specific prep (FAANG, startups)",
      "System design interviews",
      "Detailed analytics & insights",
      "Priority support",
      "Custom difficulty levels",
    ],
    // Quick comparison for pricing cards
    highlights: [
      "350+ problems/month",
      "Unlimited practice per problem",
      "Spaced repetition scheduling",
      "Personalized roadmap",
      "Pattern mastery tracking",
      "System design interviews",
      "Company-specific prep",
      "Priority support",
    ],
    buttonText: "Start Pro",
    popular: true,
  },
  enterprise: {
    name: "Enterprise",
    price: null,
    priceDisplay: "Custom",
    period: "",
    description: "For teams preparing together",
    features: [
      "Everything in Pro",
      "Unlimited team members",
      "Team analytics dashboard",
      "Custom interview templates",
      "SSO & SAML integration",
      "Dedicated success manager",
      "Custom integrations",
      "Volume discounts",
    ],
    buttonText: "Contact Sales",
    popular: false,
  },
} as const

export const APP_CONFIG = {
  name: "CodeSparring",
  extensionId: "nikayel.codesparring", // Coming soon
  extensionComingSoon: true,
  supportEmail: "support@codesparring.dev",
  githubUrl: "https://github.com/nikayel/codesparring",
} as const

// Helper function to get pricing based on platform
export function getProPricing(platform: 'website' | 'vscode' = 'website'): typeof PRICING_CONFIG.pro.website {
  return PRICING_CONFIG.pro[platform] as typeof PRICING_CONFIG.pro.website
}

export type SubscriptionTier = "free" | "pro" | "enterprise"
export type SubscriptionPlatform = "website" | "vscode"
