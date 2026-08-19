/**
 * Keep a serverless instance alive until a fire-and-forget delivery settles.
 *
 * Vercel freezes a function instance the moment its handler returns and kills
 * any fetch still in flight, so the deliveries most likely to be dropped are
 * the ones issued immediately before returning a response. That covers both
 * users of this helper: the error logged just before a 500, and the analytics
 * event captured just before the JSON goes back.
 *
 * `@vercel/functions` exports `waitUntil` for this, but it is not a dependency
 * here and neither observability nor analytics justifies adding one, so we read
 * the same request context it reads.
 *
 * Off-Vercel (local Node, Edge outside a request, the browser, tests) the
 * symbol is absent and the promise is left floating. That is the correct
 * degradation: those runtimes do not freeze work mid-flight.
 *
 * This lives in its own module rather than inside lib/logger because the
 * knowledge it encodes - the well-known symbol, and the fact that a rejection
 * here must never escape - is exactly the kind of assumption that goes stale in
 * one copy and not the other.
 */

/** Vercel's request context, published on globalThis under a well-known symbol. */
const VERCEL_REQUEST_CONTEXT = Symbol.for("@vercel/request-context")

interface VercelRequestContext {
  get?: () => { waitUntil?: (promise: Promise<unknown>) => void } | undefined
}

export function keepAliveUntilSettled(delivery: Promise<unknown>): void {
  // Neither logging nor analytics may be the thing that crashes a request, so a
  // rejection is swallowed here rather than escaping as an unhandled rejection.
  const settled = delivery.catch(() => {})

  try {
    const context = (globalThis as unknown as Record<symbol, unknown>)[VERCEL_REQUEST_CONTEXT] as
      | VercelRequestContext
      | undefined
    const waitUntil = context?.get?.()?.waitUntil
    if (typeof waitUntil === "function") {
      waitUntil(settled)
    }
  } catch {
    // Any surprise in the host's context object leaves `settled` floating,
    // which is what we would have done anyway.
  }
}
