/**
 * Server-side PostHog capture.
 *
 * The browser SDK cannot see anything that happens after the request leaves it,
 * so code execution, AI chat volume, feedback generation and purchases were
 * invisible to product analytics no matter how good the client instrumentation
 * got. This is the other half.
 *
 * WHY THE DISTINCT ID MATTERS MORE THAN ANYTHING ELSE HERE
 *
 * lib/auth-context calls `posthog.identify(fbUser.uid)` in the browser, so the
 * Firebase uid is already this project's person key. Capturing server events
 * against that same uid is what makes "this person ran 12 tests and then
 * upgraded" a single answerable question rather than two unrelated charts. Send
 * a different id and PostHog will faithfully record two strangers.
 *
 * When there is no signed-in user there is nothing to join to, so the event is
 * sent as anonymous (`$process_person_profile: false`) rather than inventing a
 * person. That mirrors `person_profiles: "identified_only"` on the client, and
 * it keeps a synthetic id from showing up in person counts as if it were a
 * human.
 */
import { PostHog } from "posthog-node"

import { keepAliveUntilSettled } from "./serverless-keep-alive"

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY

/**
 * `undefined` means "not decided yet", `null` means "decided: no key, stay
 * quiet". Distinguishing them is what stops a keyless deploy from constructing
 * a client on every single event.
 */
let client: PostHog | null | undefined

function getClient(): PostHog | null {
  if (client !== undefined) return client

  if (!POSTHOG_KEY) {
    client = null
    return null
  }

  client = new PostHog(POSTHOG_KEY, {
    // Direct, not the /ingest rewrite: that proxy exists so ad blockers do not
    // eat browser traffic, and there is no ad blocker in a serverless function.
    host: "https://us.i.posthog.com",
    // Serverless instances are frozen the moment the handler returns, so there
    // is no later moment at which a queued batch would be sent. Deliver each
    // event as it is captured and keep the instance alive for the flush.
    flushAt: 1,
    flushInterval: 0,
  })

  return client
}

/**
 * Send one product event to PostHog from a server route.
 *
 * Never throws and never rejects: analytics must not be able to fail the
 * request it is measuring. Callers do not await delivery, they await capture.
 */
export function capturePostHogServerEvent(
  eventName: string,
  properties: Record<string, unknown>
): void {
  const posthog = getClient()
  if (!posthog) return

  const userId = typeof properties.userId === "string" ? properties.userId : undefined
  const sessionId = typeof properties.sessionId === "string" ? properties.sessionId : undefined

  // Signed-in events join to the browser person on the Firebase uid. Everything
  // else is anonymous, and the id below only exists because `capture` requires
  // one; it is never used to count people.
  const distinctId = userId ?? (sessionId ? `anon_session:${sessionId}` : "anon_server")

  try {
    posthog.capture({
      distinctId,
      event: eventName,
      properties: userId ? properties : { ...properties, $process_person_profile: false },
    })

    keepAliveUntilSettled(posthog.flush())
  } catch (error) {
    console.error("PostHog server analytics error:", error)
  }
}
