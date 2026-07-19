/**
 * Canonical Gemini model ids.
 *
 * Single owner so a model upgrade cannot strand the Edge streaming path
 * (lib/ai-providers-edge) or token accounting (lib/token-counter) while lib/ai-providers
 * moves ahead. Dependency-free so it is safe to import from the Edge runtime.
 *
 * GEMINI_MODEL_FLASH / GEMINI_MODEL_FLASH_LITE override the pins without a code
 * change (set in the deployment env + redeploy) — the migration lever for model
 * retirements (gemini-2.5-flash is scheduled to deprecate 2026-10-16). Pin
 * explicit versions, never the rolling *-latest aliases: scoring stability
 * depends on the model not changing underneath us. Before flipping, verify the
 * successor with `node scripts/ai-fallback-drill.mjs --candidate <model>` and a
 * scoring regression pass.
 */
export const GEMINI_MODELS = {
  flash: process.env.GEMINI_MODEL_FLASH || "gemini-2.5-flash",
  flashLite: process.env.GEMINI_MODEL_FLASH_LITE || "gemini-2.5-flash-lite",
} as const
