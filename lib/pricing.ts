/**
 * Centralized Pricing Service
 *
 * Single source of truth for all pricing calculations.
 * Used by admin dashboard, analytics, billing, and revenue calculations.
 *
 * NEVER hardcode prices elsewhere - always import from here.
 */

import { PRICING_CONFIG, type SubscriptionTier } from "./config"

// Re-export types
export type { SubscriptionTier }

/**
 * Get monthly price for a subscription tier
 */
export function getMonthlyPrice(tier: SubscriptionTier): number {
  switch (tier) {
    case "free":
      return PRICING_CONFIG.free.price
    case "pro":
      return PRICING_CONFIG.pro.website.monthly.price
    case "enterprise":
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
    case "free":
      return 0
    case "pro":
      return PRICING_CONFIG.pro.website.yearly.totalPrice
    case "enterprise":
      return 1200 // Default enterprise annual price
    default:
      return 0
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
    case "enterprise":
      return 999 // Effectively unlimited
    case "pro":
      return PRICING_CONFIG.pro.sessionsPerMonth
    case "free":
    default:
      return PRICING_CONFIG.free.sessionsPerMonth
  }
}

/**
 * Whether a tier is a paid tier (pro or enterprise). Use instead of
 * `tier === 'pro'` so enterprise is never treated as unpaid (DUP-2).
 */
export function isPaidTier(tier: SubscriptionTier): boolean {
  return tier === "pro" || tier === "enterprise"
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
  free: 6.5, // ~16 sessions, quota is 8
  pro: 28.0, // ~70 sessions, quota is 35
  enterprise: 112.0, // 4x pro
} as const

/**
 * Get AI budget cap for a tier
 */
function getAIBudgetCap(tier: SubscriptionTier): number {
  return AI_BUDGET_CAPS[tier] ?? AI_BUDGET_CAPS.free
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
      tier: "free",
      name: PRICING_CONFIG.free.name,
      monthlyPrice: getMonthlyPrice("free"),
      annualPrice: getAnnualPrice("free"),
      aiBudgetCap: getAIBudgetCap("free"),
      sessionsPerMonth: PRICING_CONFIG.free.sessionsPerMonth,
    },
    {
      tier: "pro",
      name: PRICING_CONFIG.pro.website.name,
      monthlyPrice: getMonthlyPrice("pro"),
      annualPrice: getAnnualPrice("pro"),
      aiBudgetCap: getAIBudgetCap("pro"),
      sessionsPerMonth: PRICING_CONFIG.pro.sessionsPerMonth,
    },
    {
      tier: "enterprise",
      name: PRICING_CONFIG.enterprise.name,
      monthlyPrice: getMonthlyPrice("enterprise"),
      annualPrice: getAnnualPrice("enterprise"),
      aiBudgetCap: getAIBudgetCap("enterprise"),
      sessionsPerMonth: null, // Unlimited
    },
  ]
}

/**
 * THE AI cost table. Every path that prices an LLM call reads this and nothing
 * else: lib/usage-tracking (billing + budget enforcement), the admin cost
 * dashboards, the global daily kill-switch, and cost-anomaly detection.
 *
 * Rates are the vendor-quoted dollars per 1M tokens, kept SEPARATE per
 * direction. They used to be stored pre-averaged as one blended number per
 * provider, which is only correct when a call happens to be a 50/50 input/output
 * split. Real traffic is nothing like that: a chat turn carries a large system
 * prompt and history against a short reply, so the blended rate overcharged the
 * chat path roughly 2.1x while the measured inputTokens/outputTokens needed to
 * price it correctly were already being stored on every usage event.
 *
 * KEYS ARE PROVIDER IDENTIFIERS, not model ids (see AIProvider in
 * lib/ai-providers.ts and EdgeAIResponse in lib/ai-providers-edge.ts). Every key
 * that can be written onto a usage event must have a row here: an unknown key
 * falls back to the Gemini rate, which is the most expensive row in the table.
 *
 * Verified 2026-08-01/2026-08-07 against the model pins in lib/ai/model-ids.ts.
 * Rows marked UNVERIFIED are pre-existing figures for providers we do not
 * currently route to; they are carried forward unchanged and need human
 * confirmation before anything starts calling them.
 */
export interface AIProviderRate {
  /** USD per 1M input (prompt) tokens. */
  inputPer1M: number
  /**
   * USD per 1M output (completion) tokens. For reasoning models this covers
   * thinking tokens too: they bill as output but produce no visible text.
   */
  outputPer1M: number
}

/**
 * A `cachedInputPer1M` rate (DeepSeek prices a prompt-cache hit at roughly
 * 1/50th of a miss) used to sit on the type above and on the two DeepSeek rows,
 * and getProviderCostInfo() published it to the admin cost tables. Nothing ever
 * applied it, so a table that names a cache rate stated a discount the platform
 * does not receive. It is removed along with the calculateAICost option that was
 * its only consumer; that function's docstring records how to restore both.
 */
export const AI_PROVIDER_RATES = {
  // --- GPT-5.6 Luna, one key per reasoning effort ---
  // The RATE is identical across all four: effort changes how many output tokens
  // come back, not their price. Keeping them separate is what lets the admin
  // tables attribute spend to an effort level.
  "openai-none": { inputPer1M: 0.2, outputPer1M: 1.2 },
  "openai-low": { inputPer1M: 0.2, outputPer1M: 1.2 },
  "openai-high": { inputPer1M: 0.2, outputPer1M: 1.2 },
  "openai-xhigh": { inputPer1M: 0.2, outputPer1M: 1.2 },
  // Bare "openai" is what the EDGE runtime reports: lib/ai-providers-edge.ts
  // returns provider: "openai" with no effort suffix, because its effort is a
  // module constant rather than part of the provider identity. Same Luna rate as
  // the four keys above.
  //
  // This row existed in usage-tracking's PROVIDER_COSTS but NOT here, and this
  // table is the one that prices calls. Every OpenAI-served Edge feedback
  // generation would have missed the lookup and billed at the gemini fallback,
  // which is the exact 6.4x mispricing the effort keys were added to end.
  openai: { inputPer1M: 0.2, outputPer1M: 1.2 },
  // --- Gemini, matching the live pins in lib/ai/model-ids.ts ---
  gemini: { inputPer1M: 1.5, outputPer1M: 7.5 }, // Gemini 3.6 Flash
  "gemini-lite": { inputPer1M: 0.3, outputPer1M: 2.5 }, // Gemini 3.5 Flash-Lite
  // --- DeepSeek V4 ---
  deepseek: { inputPer1M: 0.435, outputPer1M: 0.87 }, // V4 Pro
  "deepseek-chat": { inputPer1M: 0.14, outputPer1M: 0.28 }, // V4 Flash
  // --- Configured but not routed to by FALLBACK_ORDER ---
  // Priced from the model actually pinned in lib/ai-providers.ts
  // (claude-haiku-4-5-20251001, documented there as $1 in / $5 out per 1M).
  claude: { inputPer1M: 1.0, outputPer1M: 5.0 },
  // --- Legacy keys, retained so historical usage rows still price correctly ---
  "gemini-pro": { inputPer1M: 1.25, outputPer1M: 5.0 }, // Gemini 2.5 Pro (UNVERIFIED)
  "claude-sonnet": { inputPer1M: 3.0, outputPer1M: 15.0 }, // Claude Sonnet 4 (UNVERIFIED)
  "gpt-4o": { inputPer1M: 2.5, outputPer1M: 10.0 }, // (UNVERIFIED)
  "gpt-4o-mini": { inputPer1M: 0.15, outputPer1M: 0.6 }, // (UNVERIFIED)
} as const satisfies Record<string, AIProviderRate>

export type AIProvider = keyof typeof AI_PROVIDER_RATES

/**
 * Round to 10 decimal places. Rate arithmetic in binary floating point produces
 * values like 0.0007000000000000001 where the vendor quotes 0.0007; the extra
 * digits are noise that would leak into displayed rates and exact comparisons.
 */
function roundRate(value: number): number {
  return Math.round(value * 1e10) / 1e10
}

/** Blended (input+output averaged) rate per 1K tokens for one provider. */
function blendedPer1k(rate: AIProviderRate): number {
  return roundRate((rate.inputPer1M + rate.outputPer1M) / 2 / 1000)
}

/**
 * Blended per-1K rate per provider, DERIVED from AI_PROVIDER_RATES.
 *
 * Display and back-compat only. Never price a call with this: averaging is what
 * AI_PROVIDER_RATES exists to stop. It is still the honest headline number for a
 * "what does this provider cost" table, where no token split is known.
 */
export const AI_PROVIDER_COSTS: Record<AIProvider, number> = Object.fromEntries(
  (Object.keys(AI_PROVIDER_RATES) as AIProvider[]).map((provider) => [
    provider,
    blendedPer1k(AI_PROVIDER_RATES[provider]),
  ])
) as Record<AIProvider, number>

/** Fallback used when a usage record names a provider with no row. */
export const FALLBACK_RATE_PROVIDER: AIProvider = "gemini"

/**
 * Look up a provider's rate, reporting whether it was actually found.
 *
 * Callers must surface `matched: false` rather than swallowing it. An unmatched
 * key bills at the Gemini rate, the most expensive row in the table, which is
 * how the Edge feedback path came to be billed at ~6.4x its real cost while
 * every dashboard presented the figure as fact.
 */
export function resolveProviderRate(provider: string): {
  rate: AIProviderRate
  matched: boolean
} {
  const rate = AI_PROVIDER_RATES[provider as AIProvider]
  return rate
    ? { rate, matched: true }
    : { rate: AI_PROVIDER_RATES[FALLBACK_RATE_PROVIDER], matched: false }
}

/**
 * Cost of one AI call in USD, priced per direction.
 *
 * REMOVED from here: a `cachedInputTokens` option that billed the cache-hit
 * subset of the prompt at the vendor's prompt-cache rate. The arithmetic was
 * correct and it had zero callers, which made it worse than absent: this
 * docstring described the DeepSeek cache discount as handled while every call
 * was in fact billed at the full input rate.
 *
 * To apply that discount the hit count has to come from the vendor's own
 * response, and the only place that response is in scope is lib/ai-providers.ts,
 * whose DeepSeek branch already reads `data.usage.prompt_tokens` off the same
 * object that carries `prompt_cache_hit_tokens` (OpenAI spells it
 * `prompt_tokens_details.cached_tokens`). Wiring it means extending
 * ProviderTokenUsage there and passing the count down to calculateCost.
 *
 * The two callers in lib/usage-tracking.ts could not have supplied it: both
 * count tokens from raw text with tiktoken and never see a vendor response, so
 * any figure they passed would have been invented.
 */
export function calculateAICost(
  inputTokens: number,
  outputTokens: number,
  provider: AIProvider | string
): number {
  const { rate } = resolveProviderRate(provider)

  const safeInput = Math.max(0, inputTokens)
  const safeOutput = Math.max(0, outputTokens)

  return (safeInput * rate.inputPer1M + safeOutput * rate.outputPer1M) / 1_000_000
}

/**
 * Human-readable name per provider key, for admin display.
 *
 * The OpenAI entries are all one model; the suffix is the reasoning effort the
 * routing table buys for that capability, which is what an operator comparing
 * spend actually wants to see.
 */
const PROVIDER_DISPLAY_NAMES: Record<AIProvider, string> = {
  "openai-none": "GPT-5.6 Luna (effort: none)",
  "openai-low": "GPT-5.6 Luna (effort: low)",
  "openai-high": "GPT-5.6 Luna (effort: high)",
  "openai-xhigh": "GPT-5.6 Luna (effort: xhigh)",
  openai: "GPT-5.6 Luna (Edge runtime)",
  gemini: "Gemini 3.6 Flash",
  "gemini-lite": "Gemini 3.5 Flash-Lite",
  "gemini-pro": "Gemini 2.5 Pro",
  deepseek: "DeepSeek V4 Pro",
  "deepseek-chat": "DeepSeek V4 Flash",
  // Named for the model actually pinned in lib/ai-providers.ts. It said
  // "Claude 3.5 Haiku" while the pin was claude-haiku-4-5-20251001.
  claude: "Claude Haiku 4.5",
  "claude-sonnet": "Claude Sonnet 4",
  "gpt-4o": "GPT-4o",
  "gpt-4o-mini": "GPT-4o Mini",
}

/**
 * Get provider cost info for admin display.
 *
 * Derived from AI_PROVIDER_RATES rather than hand-listed. The literal version
 * had already drifted twice over: it omitted `gemini-lite` and `deepseek-chat`
 * entirely, and still called the pinned model "Gemini 2.5 Flash" after the
 * migration to 3.6. Adding four OpenAI providers to a hand-written list would
 * have made the admin cost breakdown silently exclude the PRIMARY vendor.
 *
 * `costPer1kTokens` is the blended headline rate; the input/output pair beside
 * it is what calls are actually priced with, and the two differ by more than 2x
 * on real traffic.
 */
export function getProviderCostInfo(): Array<{
  provider: string
  costPer1kTokens: number
  inputPer1kTokens: number
  outputPer1kTokens: number
  displayName: string
}> {
  return (Object.keys(AI_PROVIDER_RATES) as AIProvider[]).map((provider) => {
    const rate: AIProviderRate = AI_PROVIDER_RATES[provider]
    return {
      provider,
      costPer1kTokens: AI_PROVIDER_COSTS[provider],
      inputPer1kTokens: roundRate(rate.inputPer1M / 1000),
      outputPer1kTokens: roundRate(rate.outputPer1M / 1000),
      displayName: PROVIDER_DISPLAY_NAMES[provider] ?? provider,
    }
  })
}
