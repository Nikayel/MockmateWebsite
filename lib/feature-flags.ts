/**
 * Feature Flags Infrastructure
 *
 * A flag has three possible sources, and the whole point of this file is that
 * they are consulted in ONE documented order:
 *
 *   1. The Firestore `feature_flags` document written by /admin/feature-flags.
 *   2. The `FEATURE_FLAG_<NAME>` environment variable.
 *   3. The static default in `FLAGS`.
 *
 * Firestore sits ON TOP deliberately. Until this existed, `getFlag()` read only
 * env and `FLAGS`, so every switch on the admin page was decorative: an operator
 * could toggle a kill switch, see it save, and change nothing at all. A control
 * plane that the runtime does not consult is worse than no control plane,
 * because it is believed. Env stays underneath as the break-glass layer: it is
 * what answers when Firestore holds no document for the flag or cannot be
 * reached at all, which is exactly when a redeploy-time switch is the only one
 * left.
 *
 * Usage:
 *   import { getFlag } from "@/lib/feature-flags"
 *   if (getFlag('USE_EXTRACTION_SERVICE')) { ... }
 *
 *   // In an async request handler, prefer the awaited form: it guarantees the
 *   // Firestore layer has been loaded at least once before answering.
 *   if (await getFlagAsync('DISABLE_VOICE_MODE')) { ... }
 */

/** Environments a Firestore flag can be scoped to. */
export type FlagEnvironment = "all" | "production" | "staging" | "development"

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

  // Pack interviewer 10-state machine. UNWIRED and quarantined OFF: no client drives the
  // pack runtime yet, so the state-scoped prompt block stays dormant until the post-launch
  // wire work. Flip via FEATURE_FLAG_PACK_INTERVIEWER=true only once a client is wired.
  PACK_INTERVIEWER: false,

  // Open learner model ("What CodeSparring Thinks You Know") — /knowledge page +
  // challenge/correct APIs. Kill switch: FEATURE_FLAG_OPEN_LEARNER_MODEL=false.
  OPEN_LEARNER_MODEL: true,

  // Study-control condition: when ON for a user, the learner model page lists
  // concepts but masks every number/forecast and disables challenges. Assign a
  // deterministic cohort via FEATURE_FLAG_LEARNER_MODEL_BLACK_BOX_PCT.
  LEARNER_MODEL_BLACK_BOX: false,

  // Demo-safety lever. ON refuses to mint Deepgram access tokens, so the voice
  // path fails closed and the interview falls back to typing. Exists because
  // live demos run on conference wifi where a half-open microphone socket is a
  // worse failure than no microphone at all. Default OFF: voice works normally.
  DISABLE_VOICE_MODE: false,
} as const

export type FlagName = keyof typeof FLAGS

/** Every flag name runtime code can actually ask for. */
export const FLAG_NAMES = Object.keys(FLAGS) as FlagName[]

/**
 * The admin UI writes lowercase keys (`disable_voice_mode`); code asks for
 * uppercase names (`DISABLE_VOICE_MODE`). One normaliser owns the mapping so a
 * flag created as `Disable-Voice-Mode` still lands on the same switch.
 */
export function normalizeFlagKey(key: string): string {
  return key.trim().toUpperCase().replace(/[\s-]+/g, "_")
}

/** Whether a Firestore flag key corresponds to a flag some code path reads. */
export function isKnownFlagKey(key: string): boolean {
  return normalizeFlagKey(key) in FLAGS
}

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

// ---------------------------------------------------------------------------
// Firestore layer
// ---------------------------------------------------------------------------

/** The subset of a `feature_flags` document that flag resolution actually reads. */
export interface FlagOverride {
  key: string
  enabled: boolean
  rolloutPercentage: number
  targetUserIds: string[]
  environment: FlagEnvironment
  /** Epoch ms; an override past its expiry stops applying without anyone editing it. */
  expiresAtMs: number | null
}

/**
 * How long a fetched snapshot of `feature_flags` is served before it is refetched.
 *
 * WORST-CASE PROPAGATION DELAY — read this before trusting a kill switch:
 *
 *  - `getFlagAsync()`: up to FLAG_CACHE_TTL_MS plus one Firestore round trip.
 *  - `getFlag()` (sync): the same, plus one extra call served from the stale
 *    snapshot while the background refresh is still in flight.
 *  - Writing a flag calls `invalidateFlagCache()`, which drops the delay to
 *    ~zero IN THE PROCESS THAT HANDLED THE WRITE ONLY. On serverless every
 *    other warm instance still waits out its own TTL, so the number below is
 *    the one to plan a demo around, not the invalidation.
 *
 * 30s trades a small read volume (one collection read per instance per 30s,
 * not one per flag check) for a switch that is believable under pressure.
 */
export const FLAG_CACHE_TTL_MS = 30_000

/** Human-readable form of the guarantee above, so the admin UI and this file cannot drift. */
export const FLAG_PROPAGATION_NOTE =
  "Flag changes reach running servers within about 30 seconds. Other server instances keep serving the previous value until their own cache expires, so treat 30 seconds as the worst case."

let overrideCache: Map<string, FlagOverride> | null = null
let cacheFetchedAt = 0
let inflightRefresh: Promise<Map<string, FlagOverride>> | null = null

function isFresh(): boolean {
  return overrideCache !== null && Date.now() - cacheFetchedAt < FLAG_CACHE_TTL_MS
}

function toMillis(value: unknown): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === "number") return value
  if (typeof value === "string") {
    const parsed = Date.parse(value)
    return Number.isNaN(parsed) ? null : parsed
  }
  const maybeTimestamp = value as { toMillis?: () => number; toDate?: () => Date }
  if (typeof maybeTimestamp.toMillis === "function") return maybeTimestamp.toMillis()
  if (typeof maybeTimestamp.toDate === "function") return maybeTimestamp.toDate().getTime()
  return null
}

/** Narrow a raw Firestore document into a `FlagOverride`, or drop it if it has no usable key. */
export function parseFlagDocument(data: Record<string, unknown>): FlagOverride | null {
  const rawKey = typeof data.key === "string" ? data.key : ""
  const key = normalizeFlagKey(rawKey)
  if (!key) return null

  const rawPct = data.rolloutPercentage
  const pct = typeof rawPct === "number" && Number.isFinite(rawPct) ? rawPct : 100

  return {
    key,
    enabled: data.enabled === true,
    rolloutPercentage: Math.min(100, Math.max(0, pct)),
    targetUserIds: Array.isArray(data.targetUserIds)
      ? data.targetUserIds.filter((id): id is string => typeof id === "string")
      : [],
    environment:
      data.environment === "production" ||
      data.environment === "staging" ||
      data.environment === "development"
        ? data.environment
        : "all",
    expiresAtMs: toMillis(data.expiresAt),
  }
}

/**
 * Which environment this process is. `VERCEL_ENV` is the authority where it
 * exists because `NODE_ENV` is "production" on preview deployments too, which
 * would let a production-scoped kill switch fire on every preview.
 */
export function currentFlagEnvironment(): Exclude<FlagEnvironment, "all"> {
  const vercelEnv = process.env.VERCEL_ENV
  if (vercelEnv === "production") return "production"
  if (vercelEnv === "preview") return "staging"
  if (vercelEnv === "development") return "development"
  return process.env.NODE_ENV === "production" ? "production" : "development"
}

/** Whether an override applies here and now, ignoring its enabled/targeting state. */
function overrideApplies(override: FlagOverride, now: number): boolean {
  if (override.expiresAtMs !== null && override.expiresAtMs <= now) return false
  if (override.environment !== "all" && override.environment !== currentFlagEnvironment()) {
    return false
  }
  return true
}

/**
 * Read every `feature_flags` document.
 *
 * firebase-admin is imported lazily so this module stays importable from any
 * bundle: a static import would drag the Admin SDK into anything that so much
 * as checks a flag. A failed read resolves to an EMPTY map rather than
 * throwing, which makes the layer fall through to env and the static default.
 * Failing open to the deployed configuration beats failing the request.
 */
async function fetchFlagOverrides(): Promise<Map<string, FlagOverride>> {
  const overrides = new Map<string, FlagOverride>()

  try {
    const { adminDb } = await import("./firebase-admin")
    if (!adminDb) return overrides

    const collection = adminDb.collection("feature_flags")
    // A stubbed or partially initialised adminDb is a fall-through to the lower
    // layers, not an error: the flag still resolves, just from env/defaults.
    if (typeof collection?.get !== "function") return overrides

    const snapshot = await collection.get()
    for (const doc of snapshot.docs) {
      const parsed = parseFlagDocument(doc.data() as Record<string, unknown>)
      if (parsed) overrides.set(parsed.key, parsed)
    }
  } catch (error) {
    console.error("[FeatureFlags] Failed to read feature_flags; falling back to env/defaults", error)
  }

  return overrides
}

/**
 * Fetch and cache the Firestore layer. Concurrent callers share one in-flight
 * read so a burst of requests on a cold instance does not fan out into a
 * Firestore read each.
 */
export async function refreshFlagCache(): Promise<Map<string, FlagOverride>> {
  if (inflightRefresh) return inflightRefresh

  inflightRefresh = fetchFlagOverrides()
    .then((overrides) => {
      overrideCache = overrides
      cacheFetchedAt = Date.now()
      return overrides
    })
    .finally(() => {
      inflightRefresh = null
    })

  return inflightRefresh
}

/** Drop the cached snapshot so the next read refetches. Called after an admin write. */
export function invalidateFlagCache(): void {
  overrideCache = null
  cacheFetchedAt = 0
}

/**
 * Seed the cache directly. Exists for tests and for a caller that has already
 * loaded the collection; it marks the snapshot fresh as of now.
 */
export function primeFlagCache(overrides: Iterable<FlagOverride>): void {
  overrideCache = new Map(Array.from(overrides, (o) => [o.key, o] as const))
  cacheFetchedAt = Date.now()
}

/** The cached snapshot if fresh; otherwise kick off a refresh and answer with what we have. */
function overridesForSyncRead(): Map<string, FlagOverride> | null {
  if (isFresh()) return overrideCache

  // Never awaited: `getFlag()` is synchronous because its nine call sites are.
  // The refresh lands for the NEXT caller, which is why the sync path carries
  // one extra stale answer in the worst case documented above.
  void refreshFlagCache().catch(() => {
    /* fetchFlagOverrides already logged; a refresh failure must not reject here */
  })

  return overrideCache
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

/** Where a resolved value came from. Surfaced by `explainFlag()` for the admin UI and debugging. */
export type FlagSource = "firestore" | "env" | "env-targeting" | "default"

export interface FlagResolution {
  value: boolean
  source: FlagSource
  /** Present when a Firestore document exists but did not apply (wrong env, expired). */
  ignoredOverrideReason?: "environment" | "expired"
}

/**
 * Resolve a flag against a specific set of overrides. Pure, so precedence is
 * testable without a cache or a database.
 */
export function resolveFlag(
  overrides: Map<string, FlagOverride> | null,
  flag: FlagName,
  userId?: string,
  now: number = Date.now()
): FlagResolution {
  // 1. Firestore: the live control plane the admin page writes.
  const override = overrides?.get(flag)
  if (override) {
    if (overrideApplies(override, now)) {
      // A disabled flag is off for everyone. Targeting only ever narrows an
      // enabled flag, so a kill switch cannot be survived by being on a list.
      if (!override.enabled) return { value: false, source: "firestore" }
      if (userId && override.targetUserIds.includes(userId)) {
        return { value: true, source: "firestore" }
      }
      if (override.rolloutPercentage >= 100) return { value: true, source: "firestore" }
      if (override.rolloutPercentage <= 0) return { value: false, source: "firestore" }
      // Without a user there is nothing to bucket, so a partial rollout counts
      // as on: the flag is enabled and this call cannot be excluded from it.
      if (!userId) return { value: true, source: "firestore" }
      return {
        value: rolloutBucket(userId, flag) < override.rolloutPercentage,
        source: "firestore",
      }
    }

    // The document exists but does not apply here. Fall through, and say why.
    const reason =
      override.expiresAtMs !== null && override.expiresAtMs <= now ? "expired" : "environment"
    const fallback = resolveWithoutFirestore(flag, userId)
    return { ...fallback, ignoredOverrideReason: reason }
  }

  return resolveWithoutFirestore(flag, userId)
}

/** Layers 2–3: the deploy-time configuration that answers when Firestore has nothing to say. */
function resolveWithoutFirestore(flag: FlagName, userId?: string): FlagResolution {
  // 2. Environment override: FEATURE_FLAG_<NAME>=true|false.
  const envValue = process.env[`FEATURE_FLAG_${flag}`]
  if (envValue !== undefined) {
    return { value: envValue === "true" || envValue === "1", source: "env" }
  }

  // 2b. Per-user targeting configured in env / the static maps above.
  if (userId) {
    if (DENYLIST[flag]?.includes(userId)) return { value: false, source: "env-targeting" }
    if (ALLOWLIST[flag]?.includes(userId)) return { value: true, source: "env-targeting" }
    const pct = rolloutPercentage(flag)
    if (pct !== undefined) {
      return { value: rolloutBucket(userId, flag) < pct, source: "env-targeting" }
    }
  }

  // 3. Static default.
  return { value: FLAGS[flag], source: "default" }
}

/**
 * Get the value of a feature flag.
 *
 * Resolution order: Firestore override → `FEATURE_FLAG_<NAME>` env → per-user
 * env targeting → the static default in `FLAGS`.
 *
 * Synchronous, and therefore answered from the cached Firestore snapshot. On a
 * cold instance the first call or two are answered before that snapshot has
 * arrived, i.e. from env and defaults. Where the caller is already async,
 * `getFlagAsync()` removes that window.
 *
 * @param flag - The flag name to check
 * @param userId - Optional stable user id; enables allow/deny lists and percentage rollout
 */
export function getFlag(flag: FlagName, userId?: string): boolean {
  return resolveFlag(overridesForSyncRead(), flag, userId).value
}

/**
 * `getFlag()` with the Firestore layer guaranteed to have been loaded at least
 * once. Use this in async request handlers, and always for a kill switch.
 */
export async function getFlagAsync(flag: FlagName, userId?: string): Promise<boolean> {
  const overrides = isFresh() && overrideCache ? overrideCache : await refreshFlagCache()
  return resolveFlag(overrides, flag, userId).value
}

/** Resolve a flag AND report which layer answered. For diagnostics, not control flow. */
export async function explainFlag(flag: FlagName, userId?: string): Promise<FlagResolution> {
  const overrides = isFresh() && overrideCache ? overrideCache : await refreshFlagCache()
  return resolveFlag(overrides, flag, userId)
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
