/**
 * Canonical Gemini model ids.
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
