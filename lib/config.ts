/**
 * Shared application configuration
 * Platform-specific pricing: Website ($25) vs VS Code Extension ($19)
 */

export const PRICING_CONFIG = {
  free: {
    name: "Free",
    price: 0,
    priceDisplay: "$0",
    period: "/month",
    description: "Perfect for getting started",
    sessionsPerMonth: 2,
    sessionsDisplay: "2 interview sessions per month",
    features: [
      "2 interview sessions per month",
      "Basic coding challenges",
      "AI interviewer feedback",
      "Performance tracking",
      "VS Code integration",
    ],
    buttonText: "Start Free",
    popular: false,
  },
  pro: {
    // Platform-specific pricing
    website: {
      name: "Pro",
      price: 25,
      priceDisplay: "$25",
      period: "/month",
      description: "For serious interview preparation",
    },
    vscode: {
      name: "Pro",
      price: 19,
      priceDisplay: "$19",
      period: "/month",
      description: "For serious interview preparation",
    },
    // Shared features
    sessionsPerMonth: 1000, // Effectively unlimited
    sessionsDisplay: "Unlimited interview sessions",
    features: [
      "Unlimited interview sessions",
      "Advanced coding challenges",
      "System design interviews",
      "Detailed analytics & insights",
      "Priority support",
      "Custom interview scenarios",
      "Custom difficulty levels",
    ],
    buttonText: "Upgrade to Pro",
    popular: true,
  },
  enterprise: {
    name: "Enterprise",
    price: null,
    priceDisplay: "Custom",
    period: "",
    description: "For teams and organizations",
    features: [
      "Everything in Pro",
      "Team management",
      "Custom interview templates",
      "Priority support",
      "SSO integration",
      "Custom integrations",
    ],
    buttonText: "Contact Sales",
    popular: false,
  },
} as const

export const APP_CONFIG = {
  name: "MockMate",
  extensionId: "nikayel.MockMate",
  supportEmail: "support@mockmate.dev",
  githubUrl: "https://github.com/nikayel/mockmate",
} as const

// Helper function to get pricing based on platform
export function getProPricing(platform: 'website' | 'vscode' = 'website') {
  return PRICING_CONFIG.pro[platform]
}

export type SubscriptionTier = "free" | "pro" | "enterprise"
export type SubscriptionPlatform = "website" | "vscode"
