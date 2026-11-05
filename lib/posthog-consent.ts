/**
 * The one place that decides what PostHog may store on a visitor's device.
 *
 * Three call sites depend on this being a single decision:
 *  - instrumentation-client.ts, on first load
 *  - components/ConsentAnalytics.tsx, when the banner is answered or withdrawn
 *  - lib/auth-context.tsx, immediately after `posthog.reset()` on sign-out
 *
 * The third is the one that bites, and it is not hypothetical. `posthog.reset()`
 * clears the consent state along with the identity, so a signed-out visitor
 * reverts to PostHog's default consent and starts writing cookies again. On
 * 2026-08-18 one visitor clicked Sign Out and the next ninety seconds of a
 * single uninterrupted browsing flow arrived as four separate "people", one of
 * which still carried the same `$device_id` as the session it came from.
 * Anything that calls `reset()` must call `applyPostHogConsent()` straight
 * after it.
 */
import posthog, { type PostHogConfig } from "posthog-js"

/**
 * Cookieless until consent.
 *
 * `"on_reject"` hands identity to a privacy-preserving hash computed on
 * PostHog's servers whenever the visitor has not opted in, so we can still
 * count them without storing an identifier on their device. Consent upgrades
 * them to ordinary cookie persistence. This replaced `persistence: "memory"`,
 * which stored nothing but also died on every full page load, minting a new
 * person and a new session each time the document reloaded.
 *
 * Two traps are avoided here deliberately:
 *
 *  - `cookieless_mode` is read at runtime by posthog-js 1.417.x but is missing
 *    from its exported `PostHogConfig` type, so it needs a cast. The cast is
 *    isolated to this constant instead of being applied to the whole init
 *    object, which would switch off type checking for every other key.
 *  - We do NOT set `opt_out_capturing_by_default`. Paired with `cookieless_mode`
 *    it stops posthog-js sending anything at all until `opt_out_capturing()` is
 *    called explicitly (posthog-js#2841, still reported as breaking tracking).
 *    `applyPostHogConsent()` makes that call on every load instead.
 *
 * This ALSO requires "Cookieless server hash mode" to be enabled in the PostHog
 * project settings. With it off, every cookieless event is discarded during
 * ingestion, and the failure looks identical to having no traffic at all.
 */
export const COOKIELESS_UNTIL_CONSENT = {
  cookieless_mode: "on_reject",
} as unknown as Partial<PostHogConfig>

/**
 * Push the app's consent decision into PostHog's own consent state.
 *
 * Safe to call on every render and every page load: the opt-in suppresses its
 * `$opt_in` event, so this does not manufacture one event per navigation.
 *
 * A visitor who has not answered the banner is treated the same as one who
 * declined. That is the conservative reading, and it is what puts them into
 * cookieless mode rather than leaving them in PostHog's default cookie-writing
 * state.
 */
export function applyPostHogConsent(consented: boolean): void {
  if (typeof window === "undefined") return
  if (!posthog.__loaded) return

  if (consented) {
    posthog.opt_in_capturing({ captureEventName: false })
  } else {
    posthog.opt_out_capturing()
  }
}

/**
 * Tie PostHog to the Firebase uid so product analytics joins to Firestore
 * profiles and server-side events on the same key.
 *
 * Only with consent. Without it the visitor is cookieless, cookieless events
 * are personless, and ingestion drops a personless `$identify`
 * (`invalid_event_when_process_person_profile_is_false`), so the login never
 * links to the Firebase person. A signed-in visitor can arrive in either order,
 * so there are two call sites:
 *  - lib/auth-context.tsx, on login, for a visitor who already consented
 *  - components/ConsentAnalytics.tsx, on opt-in, for a visitor already signed
 *    in. It must run AFTER `applyPostHogConsent(true)`, which is what ends
 *    cookieless mode.
 */
export function identifyPostHogUser(
  user: { uid: string; email: string | null },
  consented: boolean
): void {
  if (typeof window === "undefined") return
  if (!consented || !posthog.__loaded) return

  posthog.identify(user.uid, { email: user.email ?? undefined })
}
