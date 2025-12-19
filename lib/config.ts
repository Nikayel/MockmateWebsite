/**
 * Shared application configuration
 * Web-first platform with VS Code extension coming soon
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
      "Web-based code editor",
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
      period: "/month",
      description: "For serious interview preparation",
      monthly: {
        price: 25,
        priceDisplay: "$25",
        period: "/month",
      },
      yearly: {
        price: 225,
        priceDisplay: "$225",
        period: "/year",
        oneTime: true,
      },
    },
    vscode: {
      name: "Pro",
      price: 19,
      priceDisplay: "$19",
      period: "/month",
      description: "For serious interview preparation",
    },
    // Shared features
    sessionsPerMonth: 35,
    sessionsDisplay: "35 interview sessions per month",
    features: [
      "35 interview sessions per month",
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
  name: "Skillon",
  extensionId: "nikayel.skillon", // Coming soon
  extensionComingSoon: true,
  supportEmail: "support@skillon.dev",
  githubUrl: "https://github.com/nikayel/skillon",
} as const

// Helper function to get pricing based on platform
export function getProPricing(platform: 'website' | 'vscode' = 'website') {
  return PRICING_CONFIG.pro[platform]
}

export type SubscriptionTier = "free" | "pro" | "enterprise"
export type SubscriptionPlatform = "website" | "vscode"
