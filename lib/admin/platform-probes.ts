/**
 * The dependencies CodeSparring actually runs on, and how to check each one
 * for free.
 *
 * Before this file the System Health page probed exactly one thing (Firestore)
 * and rendered three more cards that were hardcoded green: "auth" was a literal
 * healthy/50ms, "storage" was initialised healthy and never touched again, and
 * "api" timed its own handler, which cannot fail without the request failing
 * first. Stripe, the AI providers, Deepgram, Brevo and Sentry had no
 * representation at all, so a total vendor outage left the dashboard green.
 *
 * Probe design rules:
 *
 * - Free only. Every HTTP probe here is a credential or metadata read, never a
 *   model call, a transcription or an email send. The dashboard polls every 30
 *   seconds; a probe that costs money would be a standing bill.
 * - A missing credential is unknown outside production and unhealthy inside it.
 *   In development an unset vendor key is expected; in production it means the
 *   feature is silently off.
 * - A dependency with no free way to verify it reports unknown. Sentry is the
 *   honest example: we can prove the DSN is present and well formed, and we
 *   cannot prove events are arriving without paying an event to find out.
 */

import { adminAuth, adminDb } from "../firebase-admin"
import type { DependencyProbe, ProbeOutcome } from "./dependency-probes"

const IS_PRODUCTION = process.env.NODE_ENV === "production"

/**
 * A vendor key that is not set. Expected locally, a real outage in production,
 * and in neither case evidence that the dependency is healthy.
 */
function credentialMissing(envVar: string): ProbeOutcome {
  return IS_PRODUCTION
    ? { status: "unhealthy", detail: `${envVar} is not set, so this dependency is unavailable` }
    : { status: "unknown", detail: `${envVar} is not set in this environment` }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Reachability plus credential check over HTTP.
 *
 * The status codes are mapped deliberately: 401/403 means our key is wrong or
 * revoked, which is our problem and hard-fails; 5xx means the vendor is down;
 * any other non-2xx is odd enough to flag but not to call an outage.
 */
async function checkHttpDependency(
  url: string,
  init: RequestInit,
  signal: AbortSignal
): Promise<ProbeOutcome> {
  let response: Response
  try {
    response = await fetch(url, { ...init, signal, cache: "no-store" })
  } catch (error) {
    if (signal.aborted) {
      return { status: "degraded", detail: "No response before the probe timeout" }
    }
    return { status: "unhealthy", detail: `Request failed: ${errorMessage(error)}` }
  }

  // Release the socket without downloading a body we do not read.
  void response.body?.cancel().catch(() => {})

  if (response.status === 401 || response.status === 403) {
    return {
      status: "unhealthy",
      detail: `Credentials rejected (HTTP ${response.status})`,
    }
  }
  if (response.status === 429) {
    return { status: "degraded", detail: "Rate limited by the vendor (HTTP 429)" }
  }
  if (response.status >= 500) {
    return { status: "unhealthy", detail: `Vendor error (HTTP ${response.status})` }
  }
  if (!response.ok) {
    return { status: "degraded", detail: `Unexpected response (HTTP ${response.status})` }
  }
  return { status: "healthy", detail: "Reachable, credentials accepted" }
}

/** Builds an HTTP probe that first requires its credential to exist. */
function credentialedHttpProbe(config: {
  id: string
  label: string
  envVar: string
  critical: boolean
  degradedAboveMs: number
  request: (credential: string) => { url: string; init: RequestInit }
}): DependencyProbe {
  return {
    id: config.id,
    label: config.label,
    critical: config.critical,
    degradedAboveMs: config.degradedAboveMs,
    run: async (signal) => {
      const credential = process.env[config.envVar]
      if (!credential) return credentialMissing(config.envVar)
      const { url, init } = config.request(credential)
      return checkHttpDependency(url, init, signal)
    },
  }
}

/**
 * Firestore. A read of one document from a collection the product depends on.
 * Losing it takes everything down, so it is the one probe that can drive the
 * platform status to unhealthy on its own.
 */
const firestoreProbe: DependencyProbe = {
  id: "firestore",
  label: "Firestore",
  critical: true,
  degradedAboveMs: 500,
  run: async () => {
    if (!adminDb) {
      return { status: "unhealthy", detail: "Firebase Admin SDK is not initialised" }
    }
    await adminDb.collection("profiles").limit(1).get()
    return { status: "healthy", detail: "Read succeeded" }
  },
}

/**
 * Firebase Auth. Listing a single user exercises the same admin credential that
 * every authenticated request depends on, and Firebase Auth reads are not
 * billed per call. The old dashboard hardcoded this card to healthy/50ms, so a
 * revoked service account showed as green.
 */
const firebaseAuthProbe: DependencyProbe = {
  id: "firebase-auth",
  label: "Firebase Auth",
  critical: true,
  degradedAboveMs: 1000,
  run: async () => {
    if (!adminAuth) {
      return { status: "unhealthy", detail: "Firebase Admin SDK is not initialised" }
    }
    await adminAuth.listUsers(1)
    return { status: "healthy", detail: "Admin credential accepted" }
  },
}

/**
 * Sentry. There is no free way to confirm that events are being ingested: the
 * only proof is sending an event, and a probe that manufactures errors every 30
 * seconds would poison the very tool it is checking. So this reports what it
 * can actually establish, and reports unknown for the rest.
 */
const sentryProbe: DependencyProbe = {
  id: "sentry",
  label: "Sentry",
  critical: false,
  run: async () => {
    const dsn = process.env.SENTRY_DSN
    if (!dsn) {
      return IS_PRODUCTION
        ? {
            status: "unhealthy",
            detail: "SENTRY_DSN is not set, so no error is being captured anywhere",
          }
        : { status: "unknown", detail: "SENTRY_DSN is not set in this environment" }
    }
    try {
      const url = new URL(dsn)
      if (!url.username || !url.pathname.replace(/^\//, "")) {
        return { status: "unhealthy", detail: "SENTRY_DSN is malformed, error capture is broken" }
      }
    } catch {
      return {
        status: "unhealthy",
        detail: "SENTRY_DSN is not a valid URL, error capture is broken",
      }
    }
    return {
      status: "unknown",
      detail: "DSN configured. Delivery cannot be verified without sending a paid event",
    }
  },
}

/** AI provider probes, in the fallback order used by lib/ai-providers.ts. */
export const AI_PROVIDER_PROBE_IDS = ["openai", "deepseek", "gemini"] as const

/**
 * Every dependency the platform has, with a real probe or an explicit unknown.
 * Order is display order on the dashboard.
 */
export const PLATFORM_PROBES: DependencyProbe[] = [
  firestoreProbe,
  firebaseAuthProbe,
  credentialedHttpProbe({
    id: "stripe",
    label: "Stripe",
    envVar: "STRIPE_SECRET_KEY",
    // Billing being down blocks new revenue but not the product itself.
    critical: false,
    degradedAboveMs: 1500,
    request: (key) => ({
      // Balance retrieval is a free read that fails loudly on a bad key.
      url: "https://api.stripe.com/v1/balance",
      init: { headers: { Authorization: `Bearer ${key}` } },
    }),
  }),
  credentialedHttpProbe({
    id: "openai",
    label: "OpenAI",
    envVar: "OPENAI_API_KEY",
    critical: false,
    degradedAboveMs: 1500,
    request: (key) => ({
      // Model listing is free; a completion would not be.
      url: "https://api.openai.com/v1/models",
      init: { headers: { Authorization: `Bearer ${key}` } },
    }),
  }),
  credentialedHttpProbe({
    id: "deepseek",
    label: "DeepSeek",
    envVar: "DEEPSEEK_API_KEY",
    critical: false,
    degradedAboveMs: 1500,
    request: (key) => ({
      url: "https://api.deepseek.com/v1/models",
      init: { headers: { Authorization: `Bearer ${key}` } },
    }),
  }),
  credentialedHttpProbe({
    id: "gemini",
    label: "Gemini",
    envVar: "GEMINI_API_KEY",
    critical: false,
    degradedAboveMs: 1500,
    request: (key) => ({
      // Model listing validates the key without spending a token.
      url: `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
      init: {},
    }),
  }),
  credentialedHttpProbe({
    id: "deepgram",
    label: "Deepgram",
    envVar: "DEEPGRAM_API_KEY",
    critical: false,
    degradedAboveMs: 1500,
    request: (key) => ({
      // Project listing checks the same key the voice token grant uses,
      // without minting a token or transcribing any audio.
      url: "https://api.deepgram.com/v1/projects",
      init: { headers: { Authorization: `Token ${key}` } },
    }),
  }),
  credentialedHttpProbe({
    id: "brevo",
    label: "Brevo",
    envVar: "BREVO_API_KEY",
    critical: false,
    degradedAboveMs: 1500,
    request: (key) => ({
      // Account read, not a send.
      url: "https://api.brevo.com/v3/account",
      init: { headers: { "api-key": key } },
    }),
  }),
  sentryProbe,
]
