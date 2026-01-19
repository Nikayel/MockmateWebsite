/**
 * Feature Flags Infrastructure
 *
 * Phase 1 of incremental service extraction.
 * All flags default to false for safe rollout.
 *
 * Usage:
 *   import { getFlag } from "@/lib/feature-flags"
 *   if (getFlag('USE_EXTRACTION_SERVICE')) { ... }
 */

export const FLAGS = {
  // Phase 2: Extraction service wrapper
  USE_EXTRACTION_SERVICE: false,

  // Phase 3: Phase detection service
  USE_PHASE_SERVICE: false,

  // Future phases
  USE_CONTEXT_SERVICES: false,
  USE_VALIDATION_SERVICE: false,
  USE_ORCHESTRATOR: false,
  USE_MULTI_AGENT: false,

  // Debug mode: Run both old and new, compare results
  SHADOW_MODE: false,
} as const

export type FlagName = keyof typeof FLAGS

/**
 * Get the value of a feature flag.
 *
 * @param flag - The flag name to check
 * @param userId - Optional user ID for percentage rollouts (future)
 * @returns boolean - Whether the flag is enabled
 *
 * Future enhancements:
 * - Percentage-based rollout by userId hash
 * - User allowlist/denylist
 * - Environment-based overrides
 * - Remote config fetching
 */
export function getFlag(flag: FlagName, userId?: string): boolean {
  // Environment override: FEATURE_FLAG_<NAME>=true
  const envKey = `FEATURE_FLAG_${flag}`
  const envValue = process.env[envKey]
  if (envValue !== undefined) {
    return envValue === "true" || envValue === "1"
  }

  // Future: percentage rollout based on userId
  // if (userId && ROLLOUT_PERCENTAGES[flag]) {
  //   const hash = simpleHash(userId)
  //   return hash % 100 < ROLLOUT_PERCENTAGES[flag]
  // }

  return FLAGS[flag]
}

/**
 * Check if shadow mode is enabled for a specific service.
 * Shadow mode runs both old and new code paths and logs differences.
 */
export function isShadowModeEnabled(): boolean {
  return getFlag("SHADOW_MODE")
}

/**
 * Log shadow mode comparison results.
 * Only logs when there are differences between old and new results.
 */
export function logShadowComparison(
  serviceName: string,
  oldResult: unknown,
  newResult: unknown
): void {
  if (!isShadowModeEnabled()) return

  const oldJson = JSON.stringify(oldResult, null, 2)
  const newJson = JSON.stringify(newResult, null, 2)

  if (oldJson !== newJson) {
    console.warn(`[SHADOW MODE] ${serviceName} results differ:`)
    console.warn(`  Old: ${oldJson}`)
    console.warn(`  New: ${newJson}`)
  }
}
