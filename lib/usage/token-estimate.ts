/**
 * Runtime-agnostic token estimation.
 *
 * lib/token-counter.ts does this properly with js-tiktoken, but that is a
 * heavyweight dependency to pull into the Edge bundle for a cost estimate. This
 * is the crude four-characters-per-token approximation the Node provider path
 * already falls back to (lib/ai-providers.ts), stated once so the Edge and Node
 * estimates cannot drift apart.
 *
 * Use provider-reported token counts whenever they are available. This is only
 * for the case where they are not.
 */

/**
 * Average characters per token for English prose and code. Deliberately the
 * same constant the Node fallback uses.
 */
export const ESTIMATED_CHARS_PER_TOKEN = 4

/** Estimated token count for a string. Absent or non-string input yields 0. */
export function estimateTokensFromText(text: string | undefined | null): number {
  if (typeof text !== "string" || text.length === 0) return 0
  return Math.ceil(text.length / ESTIMATED_CHARS_PER_TOKEN)
}
