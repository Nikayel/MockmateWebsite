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
    sessionsPerMonth: 8,
    sessionsDisplay: "8 full interview sessions per month",
    features: [
      "20+ problems with unlimited practice",
      "8 full interview sessions per month",
      "AI interviewer with real-time feedback",
      "Performance tracking & analytics",
      // Do not name an editor vendor here. This string is rendered on the paid
      // pricing page, so it is a claim about what the buyer receives. It used to
      // read "Web-based Monaco code editor"; there is no Monaco dependency in
      // this repo and there has not been one since the switch to CodeMirror 6.
      "In-browser code editor with per-language syntax highlighting",
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
    sessionsDisplay: "35 full interview sessions per month",
    // Core value: what makes Pro worth it
    valueProps: [
      {
        title: "Re-practice Every Scenario",
        description:
          "Starting a session uses 1 of your monthly sessions and unlocks that scenario for repeated practice, so you can come back and run it again without spending another session.",
      },
      {
        title: "Spaced Repetition System",
        description:
          "AI schedules your reviews at the scientifically optimal time for long-term retention. Never forget what you've learned.",
      },
      {
        title: "Personalized Study Roadmap",
        description:
          "Get a custom prep plan based on your target company, interview date, and skill gaps. Updated daily based on your progress.",
      },
    ],
    // Complete feature list for Pro
    features: [
      "35 full interview sessions per month",
      "Unlimited practice within each scenario",
      "Spaced repetition scheduling",
      "Personalized study roadmap",
      "Pattern mastery tracking (15+ patterns)",
      "Company-specific prep (FAANG, startups)",
      "System design interviews",
      "Detailed analytics & insights",
      "Priority support",
      "Custom difficulty levels",
    ],
    // Quick comparison for pricing cards
    highlights: [
      "35 sessions/month",
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
export function getProPricing(
  platform: "website" | "vscode" = "website"
): typeof PRICING_CONFIG.pro.website {
  return PRICING_CONFIG.pro[platform] as typeof PRICING_CONFIG.pro.website
}

export type SubscriptionTier = "free" | "pro" | "enterprise"
export type SubscriptionPlatform = "website" | "vscode"
