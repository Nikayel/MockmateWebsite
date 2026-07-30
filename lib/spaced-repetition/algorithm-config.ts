/**
 * Global spaced-repetition algorithm configuration
 *
 * Backs the admin "End A/B — switch everyone to FSRS" action. The config lives
 * in a single Firestore doc (research_config/algorithm) so the switch takes
 * effect without a redeploy. Reads are cached in-module because
 * getUserAlgorithm() sits on the hot path of every review.
 *
 * Fail-open contract: a missing doc or a read error means "the A/B is still
 * running" (ab_ended: false), which preserves pre-switch behavior exactly.
 */

import { adminDb } from "../firebase-admin"
import type { SpacedRepetitionAlgorithm } from "../types"

export interface AlgorithmResearchConfig {
  ab_ended: boolean
  default_algorithm: SpacedRepetitionAlgorithm
  ended_at?: string
  ended_by?: string
}

const CONFIG_DOC_PATH = { collection: "research_config", doc: "algorithm" } as const

const CONFIG_CACHE_TTL_MS = 5 * 60_000

const FAIL_OPEN_CONFIG: AlgorithmResearchConfig = {
  ab_ended: false,
  default_algorithm: "fsrs",
}

let cachedConfig: { value: AlgorithmResearchConfig; fetchedAt: number } | null = null

/**
 * Read the global algorithm config, cached for CONFIG_CACHE_TTL_MS.
 * Cache-hit path performs zero Firestore reads.
 */
export async function getAlgorithmConfig(): Promise<AlgorithmResearchConfig> {
  if (cachedConfig && Date.now() - cachedConfig.fetchedAt < CONFIG_CACHE_TTL_MS) {
    return cachedConfig.value
  }

  try {
    const doc = await adminDb.collection(CONFIG_DOC_PATH.collection).doc(CONFIG_DOC_PATH.doc).get()

    const data = doc.exists ? (doc.data() as Partial<AlgorithmResearchConfig>) : null
    const value: AlgorithmResearchConfig = {
      ab_ended: data?.ab_ended === true,
      default_algorithm: data?.default_algorithm === "sm2" ? "sm2" : "fsrs",
      ...(data?.ended_at ? { ended_at: data.ended_at } : {}),
      ...(data?.ended_by ? { ended_by: data.ended_by } : {}),
    }

    cachedConfig = { value, fetchedAt: Date.now() }
    return value
  } catch (error) {
    console.error("[AlgorithmConfig] Failed to read research_config/algorithm:", error)
    // Fail open to "A/B still active" — do NOT cache the failure, so a
    // transient read error recovers on the next call.
    return FAIL_OPEN_CONFIG
  }
}

/**
 * Mark the A/B test as ended: all users default to FSRS from now on.
 * Called by the admin end-ab-switch-fsrs action after the migration sweep
 * completes. Merge-set so re-running is harmless.
 */
export async function markAbTestEnded(adminId: string): Promise<void> {
  await adminDb
    .collection(CONFIG_DOC_PATH.collection)
    .doc(CONFIG_DOC_PATH.doc)
    .set(
      {
        ab_ended: true,
        default_algorithm: "fsrs" satisfies SpacedRepetitionAlgorithm,
        ended_at: new Date().toISOString(),
        ended_by: adminId,
      },
      { merge: true }
    )
  clearAlgorithmConfigCache()
}

/** Drop the in-module cache (tests + post-write invalidation). */
export function clearAlgorithmConfigCache(): void {
  cachedConfig = null
}
