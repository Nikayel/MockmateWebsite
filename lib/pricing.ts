/**
 * Centralized Pricing Service
 *
 * Single source of truth for all pricing calculations.
 * Used by admin dashboard, analytics, billing, and revenue calculations.
 *
 * NEVER hardcode prices elsewhere - always import from here.
 */

import { PRICING_CONFIG, type SubscriptionTier } from './config'

// Re-export types
export type { SubscriptionTier }

/**
 * Get monthly price for a subscription tier
 */
export function getMonthlyPrice(tier: SubscriptionTier): number {
  switch (tier) {
    case 'free':
      return PRICING_CONFIG.free.price
    case 'pro':
      return PRICING_CONFIG.pro.website.monthly.price
    case 'enterprise':
      // Enterprise is custom pricing - use a default for calculations
      return 100 // Default enterprise price for revenue calculations
    default:
      return 0
  }
}

/**
 * Get annual price for a subscription tier
 */
export function getAnnualPrice(tier: SubscriptionTier): number {
  switch (tier) {
    case 'free':
      return 0
    case 'pro':
      return PRICING_CONFIG.pro.website.yearly.totalPrice
    case 'enterprise':
      return 1200 // Default enterprise annual price
    default:
      return 0
  }
}

/**
 * Get display price string
 */
export function getPriceDisplay(tier: SubscriptionTier, period: 'monthly' | 'yearly' = 'monthly'): string {
  switch (tier) {
    case 'free':
      return PRICING_CONFIG.free.priceDisplay
    case 'pro':
      return period === 'monthly'
        ? PRICING_CONFIG.pro.website.monthly.priceDisplay
        : PRICING_CONFIG.pro.website.yearly.priceDisplay
    case 'enterprise':
      return PRICING_CONFIG.enterprise.priceDisplay
    default:
      return '$0'
  }
}

/**
 * Effective monthly session limit for a tier. Enterprise is effectively
 * unlimited (999 sentinel). This is the single source of truth so the server
 * quota gate (enforceQuota) and the client gate (checkUsageLimit) never
 * disagree, and so enterprise never silently falls through to the free limit
 * via a `pro ? pro : free` ternary (DUP-2).
 */
export function getSessionsLimitForTier(tier: SubscriptionTier): number {
  switch (tier) {
    case 'enterprise':
      return 999 // Effectively unlimited
    case 'pro':
      return PRICING_CONFIG.pro.sessionsPerMonth
    case 'free':
    default:
      return PRICING_CONFIG.free.sessionsPerMonth
  }
}

/**
 * Whether a tier is a paid tier (pro or enterprise). Use instead of
 * `tier === 'pro'` so enterprise is never treated as unpaid (DUP-2).
 */
export function isPaidTier(tier: SubscriptionTier): boolean {
  return tier === 'pro' || tier === 'enterprise'
}

/**
 * AI Budget Caps per tier (monthly)
 * These control how much AI API cost a user can consume
 */
export const AI_BUDGET_CAPS = {
  // Re-set 2026-08-01 alongside the ~23x cost-constant correction below. These
  // are deliberately set NOT to bind: the server-authoritative session quota
  // (lib/config.ts: free 8/mo, pro 35/mo) is the real limit, and these are the
  // runaway backstop. At the corrected rates a session costs roughly $0.40
  // pathological / $0.15 typical, so free covers ~16 sessions against a quota
  // of 8. Leaving the old $0.50 here after the correction would have started
  // blocking free users partway through their SECOND session.
  free: 6.50,        // ~16 sessions, quota is 8
  pro: 28.00,        // ~70 sessions, quota is 35
  enterprise: 112.00, // 4x pro
} as const

/**
 * Get AI budget cap for a tier
 */
export function getAIBudgetCap(tier: SubscriptionTier): number {
  return AI_BUDGET_CAPS[tier] ?? AI_BUDGET_CAPS.free
}

/**
 * Calculate MRR (Monthly Recurring Revenue) from user counts
 */
export function calculateMRR(tierCounts: { free: number; pro: number; enterprise: number }): number {
  const proRevenue = tierCounts.pro * getMonthlyPrice('pro')
  const enterpriseRevenue = tierCounts.enterprise * getMonthlyPrice('enterprise')
  return proRevenue + enterpriseRevenue
}

/**
 * Calculate ARR (Annual Recurring Revenue) from MRR
 */
export function calculateARR(mrr: number): number {
  return mrr * 12
}

/**
 * Get all pricing tiers with full details for admin display
 */
export function getAllPricingTiers(): Array<{
  tier: SubscriptionTier
  name: string
  monthlyPrice: number
  annualPrice: number
  aiBudgetCap: number
  sessionsPerMonth: number | null
}> {
  return [
    {
      tier: 'free',
      name: PRICING_CONFIG.free.name,
      monthlyPrice: getMonthlyPrice('free'),
      annualPrice: getAnnualPrice('free'),
      aiBudgetCap: getAIBudgetCap('free'),
      sessionsPerMonth: PRICING_CONFIG.free.sessionsPerMonth,
    },
    {
      tier: 'pro',
      name: PRICING_CONFIG.pro.website.name,
      monthlyPrice: getMonthlyPrice('pro'),
      annualPrice: getAnnualPrice('pro'),
      aiBudgetCap: getAIBudgetCap('pro'),
      sessionsPerMonth: PRICING_CONFIG.pro.sessionsPerMonth,
    },
    {
      tier: 'enterprise',
      name: PRICING_CONFIG.enterprise.name,
      monthlyPrice: getMonthlyPrice('enterprise'),
      annualPrice: getAnnualPrice('enterprise'),
      aiBudgetCap: getAIBudgetCap('enterprise'),
      sessionsPerMonth: null, // Unlimited
    },
  ]
}

/**
 * AI Provider costs per 1K tokens (input + output averaged)
 * Updated Dec 2025
 */
export const AI_PROVIDER_COSTS = {
  gemini: 0.0045,           // Gemini 3.6 Flash: $1.50 in + $7.50 out per 1M
  'gemini-lite': 0.0014,    // Gemini 3.5 Flash-Lite: $0.30 in + $2.50 out per 1M
  'deepseek-chat': 0.00021, // Deepseek (provider key, was falling back to gemini)
  'gemini-pro': 0.003125,   // Gemini 2.5 Pro
  deepseek: 0.00021,        // Deepseek
  claude: 0.0024,           // Claude 3.5 Haiku
  'claude-sonnet': 0.009,   // Claude Sonnet 4
  'gpt-4o': 0.00625,        // GPT-4o
  'gpt-4o-mini': 0.000375,  // GPT-4o mini
} as const

export type AIProvider = keyof typeof AI_PROVIDER_COSTS

/**
 * Calculate AI cost from token counts
 */
export function calculateAICost(
  inputTokens: number,
  outputTokens: number,
  provider: AIProvider | string
): number {
  const costPer1k = AI_PROVIDER_COSTS[provider as AIProvider] ?? AI_PROVIDER_COSTS.gemini
  const totalTokens = inputTokens + outputTokens
  return (totalTokens / 1000) * costPer1k
}

/**
 * Get provider cost info for admin display
 */
export function getProviderCostInfo(): Array<{
  provider: string
  costPer1kTokens: number
  displayName: string
}> {
  return [
    { provider: 'gemini', costPer1kTokens: AI_PROVIDER_COSTS.gemini, displayName: 'Gemini 2.5 Flash' },
    { provider: 'gemini-pro', costPer1kTokens: AI_PROVIDER_COSTS['gemini-pro'], displayName: 'Gemini 2.5 Pro' },
    { provider: 'deepseek', costPer1kTokens: AI_PROVIDER_COSTS.deepseek, displayName: 'Deepseek' },
    { provider: 'claude', costPer1kTokens: AI_PROVIDER_COSTS.claude, displayName: 'Claude 3.5 Haiku' },
    { provider: 'claude-sonnet', costPer1kTokens: AI_PROVIDER_COSTS['claude-sonnet'], displayName: 'Claude Sonnet 4' },
    { provider: 'gpt-4o', costPer1kTokens: AI_PROVIDER_COSTS['gpt-4o'], displayName: 'GPT-4o' },
    { provider: 'gpt-4o-mini', costPer1kTokens: AI_PROVIDER_COSTS['gpt-4o-mini'], displayName: 'GPT-4o Mini' },
  ]
}
