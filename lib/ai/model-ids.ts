/**
 * Canonical Gemini model ids.
 *
 * Single owner so a model upgrade cannot strand the Edge streaming path
 * (lib/ai-providers-edge) or token accounting (lib/token-counter) while lib/ai-providers
 * moves ahead. Dependency-free so it is safe to import from the Edge runtime.
 */
export const GEMINI_MODELS = {
  flash: "gemini-2.5-flash",
  flashLite: "gemini-2.5-flash-lite",
} as const
