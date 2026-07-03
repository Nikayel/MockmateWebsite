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
 * Gradual-rollout percentage per flag (0–100). A flag with `50` is on for a deterministic ~50% of
 * users. Overridable per-flag at runtime via `FEATURE_FLAG_<NAME>_PCT`. Absent → no rollout (falls
 * through to the static default).
 */
const ROLLOUT_PERCENTAGES: Partial<Record<FlagName, number>> = {}

/** Users the flag is ALWAYS on for (e.g. internal testers), regardless of the rollout percentage. */
const ALLOWLIST: Partial<Record<FlagName, string[]>> = {}

/** Users the flag is ALWAYS off for. Takes precedence over the allowlist and the rollout percentage. */
const DENYLIST: Partial<Record<FlagName, string[]>> = {}

/**
 * Deterministic 0–99 bucket for (userId, flag). FNV-1a over `flag:userId` so each flag buckets
 * INDEPENDENTLY (a user isn't in the same slice for every flag) and STABLY (same input → same bucket
 * every request — never `Math.random`, which would flip a user in and out between requests).
 */
function rolloutBucket(userId: string, flag: FlagName): number {
  const input = `${flag}:${userId}`
  let hash = 0x811c9dc5 // FNV offset basis
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) // FNV prime
  }
  return (hash >>> 0) % 100
}

/** Effective rollout percentage for a flag: `FEATURE_FLAG_<NAME>_PCT` env wins, else the static map. */
function rolloutPercentage(flag: FlagName): number | undefined {
  const envPct = process.env[`FEATURE_FLAG_${flag}_PCT`]
  if (envPct !== undefined) {
    const n = Number.parseInt(envPct, 10)
    if (Number.isFinite(n)) return Math.min(100, Math.max(0, n))
  }
  return ROLLOUT_PERCENTAGES[flag]
}

/**
 * Get the value of a feature flag.
 *
 * Resolution order:
 *   1. `FEATURE_FLAG_<NAME>` env override — the ops kill-switch / force-on; wins over everything.
 *   2. Per-user targeting (only when `userId` is supplied): denylist (off) → allowlist (on) →
 *      percentage rollout (`FEATURE_FLAG_<NAME>_PCT` or `ROLLOUT_PERCENTAGES`) by deterministic hash.
 *   3. The static default in `FLAGS`.
 *
 * @param flag - The flag name to check
 * @param userId - Optional stable user id; enables allow/deny lists and percentage rollout
 */
export function getFlag(flag: FlagName, userId?: string): boolean {
  // 1. Environment override: FEATURE_FLAG_<NAME>=true|false — the ultimate switch.
  const envValue = process.env[`FEATURE_FLAG_${flag}`]
  if (envValue !== undefined) {
    return envValue === "true" || envValue === "1"
  }

  // 2. Per-user targeting.
  if (userId) {
    if (DENYLIST[flag]?.includes(userId)) return false
    if (ALLOWLIST[flag]?.includes(userId)) return true
    const pct = rolloutPercentage(flag)
    if (pct !== undefined) return rolloutBucket(userId, flag) < pct
  }

  // 3. Static default.
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
