/**
 * First-party funnel counters, client side.
 *
 * GA4 and Vercel Analytics are both consent-gated, so every funnel event from
 * an unconsented visitor is silently dropped and top-of-funnel volume is
 * systematically under-counted. This channel exists to answer exactly one
 * question honestly: how many times did each funnel step happen. It sends an
 * event NAME and nothing else: no user id, no session id, no cookies read or
 * written, so it is an anonymous aggregate counter, not tracking, and does not
 * ride the consent gate.
 *
 * Fire-and-forget by contract: this must never break or slow the flow that
 * calls it. sendBeacon survives navigation (the signup/login sites navigate
 * away immediately); keepalive fetch is the fallback.
 */

export type FunnelEvent =
  | "guest_trial_start"
  | "guest_chat_walled"
  | "signup"
  | "login"
  | "checkout_start"

export function reportFunnelEvent(event: FunnelEvent): void {
  try {
    const body = JSON.stringify({ event })
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const sent = navigator.sendBeacon(
        "/api/metrics/funnel",
        new Blob([body], { type: "application/json" })
      )
      if (sent) return
    }
    void fetch("/api/metrics/funnel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {})
  } catch {
    // Counters are best-effort; the product flow always wins.
  }
}
