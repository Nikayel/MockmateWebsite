/**
 * Canonical model ids for every vendor in the fallback chain.
 *
 * Single owner so a model upgrade cannot strand the Edge streaming path
 * (lib/ai-providers-edge) or token accounting (lib/token-counter) while lib/ai-providers
 * moves ahead. Dependency-free so it is safe to import from the Edge runtime.
 *
 * GEMINI_MODEL_FLASH / GEMINI_MODEL_FLASH_LITE override the pins without a code
 * change (set in the deployment env + redeploy) — the migration lever for model
 * retirements. Pin explicit versions, never the rolling *-latest aliases:
 * scoring stability depends on the model not changing underneath us. Before
 * flipping, verify the successor with `node scripts/ai-fallback-drill.mjs
 * --candidate <model>` and a scoring regression pass.
 *
 * 2026-07-28 migration off the gemini-2.5-* pins (retired by Google 2026-10-16):
 * - flash → gemini-3.6-flash: drill + 8 live probes, stable 1.1-2.2s.
 *   gemini-3.5-flash was REJECTED — 0.9s-30s+ latency variance across probes,
 *   even with thinking disabled.
 * - flashLite → gemini-3.5-flash-lite: drill PASS, stable 0.4-0.7s (3.6 has no
 *   lite sibling).
 * gemini-3.6-flash always thinks and returns 400 on thinkingConfig
 * {thinkingBudget: 0}; both provider paths bound it at 1024 instead
 * (thinkingLevel "low" in lib/ai-providers, inline budget in the Edge path).
 */
export const GEMINI_MODELS = {
  flash: process.env.GEMINI_MODEL_FLASH || "gemini-3.6-flash",
  flashLite: process.env.GEMINI_MODEL_FLASH_LITE || "gemini-3.5-flash-lite",
} as const

/**
 * OpenAI pins. `OPENAI_MODEL_*` override them, same migration lever as Gemini.
 *
 * The GPT-5.6 family is Sol (flagship), Terra (balanced) and Luna (high volume),
 * priced $5/$30, $2/$12 and $0.20/$1.20 per 1M input/output tokens. Luna is the
 * primary because quality here is bought with REASONING EFFORT rather than tier:
 * thinking tokens bill as output, so Luna at `xhigh` still costs a fraction of
 * Sol at the default effort. Sol and Terra are pinned but unused — they exist so
 * escalating one capability is a one-line change in FALLBACK_ORDER rather than a
 * migration.
 */
export const OPENAI_MODELS = {
  luna: process.env.OPENAI_MODEL_LUNA || "gpt-5.6-luna",
  terra: process.env.OPENAI_MODEL_TERRA || "gpt-5.6-terra",
  sol: process.env.OPENAI_MODEL_SOL || "gpt-5.6-sol",
} as const

/**
 * Reasoning effort levels, cheapest first. Every GPT-5.6 model accepts all six,
 * which is what makes tier and effort independent dials.
 *
 * OpenAI's own guidance: start low, measure, and escalate the DIFFICULT CASES
 * rather than raising the setting for a whole workload. `medium` is the API
 * default when the parameter is omitted, so every config here states it
 * explicitly — an omitted effort is a silent, and on the chat paths expensive,
 * default.
 */
export const OPENAI_REASONING_EFFORTS = ["none", "low", "medium", "high", "xhigh", "max"] as const

export type OpenAIReasoningEffort = (typeof OPENAI_REASONING_EFFORTS)[number]

/**
 * DeepSeek pins — the second vendor in the chain.
 *
 * V4 replaced V3 on 2026-04-24 and the legacy `deepseek-chat` / `deepseek-reasoner`
 * names were RETIRED on 2026-07-24, which silently killed this fallback. Both
 * tiers carry a 1M context window and a cache-hit input rate at ~1/50th of the
 * miss rate, which matters here because the interview system prompt is stable
 * across a session's turns.
 */
export const DEEPSEEK_MODELS = {
  flash: process.env.DEEPSEEK_MODEL_FLASH || "deepseek-v4-flash",
  pro: process.env.DEEPSEEK_MODEL_PRO || "deepseek-v4-pro",
} as const
