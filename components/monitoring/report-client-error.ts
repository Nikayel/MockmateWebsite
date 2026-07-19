/**
 * Client-side error reporting: funnels browser errors into the server
 * logger -> Sentry pipeline via POST /api/client-error.
 *
 * The browser intentionally has no NEXT_PUBLIC Sentry DSN, so this endpoint is
 * the only client -> Sentry path. Reporting is fire-and-forget and must never
 * break a page that is already erroring: every failure is swallowed.
 *
 * Shared by ClientErrorReporter (window errors / unhandled rejections) and the
 * React error boundaries (app/error.tsx, app/global-error.tsx), so the dedupe,
 * per-page-load cap, and dev guard live here in one place.
 */

export type ClientErrorSource = "window-error" | "unhandled-rejection" | "react-boundary"

export interface ClientErrorReport {
  message: string
  stack?: string
  url?: string
  source: ClientErrorSource
  componentStack?: string
}

const MAX_REPORTS_PER_PAGE_LOAD = 5
const CLIENT_ERROR_ENDPOINT = "/api/client-error"

// Module-level so remounts within the same page load share one budget.
const sentFingerprints = new Set<string>()
let reportsSent = 0

export function reportClientError(report: ClientErrorReport): void {
  if (process.env.NODE_ENV !== "production") return // dev/test noise never hits the endpoint

  try {
    if (reportsSent >= MAX_REPORTS_PER_PAGE_LOAD) return

    // Dedupe repeat errors (e.g. a render loop) by message + source.
    const fingerprint = `${report.source}:${report.message}`.slice(0, 300)
    if (sentFingerprints.has(fingerprint)) return
    sentFingerprints.add(fingerprint)
    reportsSent++

    // Truncate client-side too so beacons stay under browser size limits;
    // the server re-truncates before trusting anything.
    const body = JSON.stringify({
      message: report.message.slice(0, 2000),
      stack: report.stack?.slice(0, 8000),
      url: (report.url ?? window.location.href).slice(0, 500),
      source: report.source,
      componentStack: report.componentStack?.slice(0, 8000),
    })

    // Prefer sendBeacon (survives page unload); fall back to keepalive fetch.
    let queued = false
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      try {
        queued = navigator.sendBeacon(
          CLIENT_ERROR_ENDPOINT,
          new Blob([body], { type: "application/json" })
        )
      } catch {
        queued = false
      }
    }

    if (!queued) {
      fetch(CLIENT_ERROR_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {
        // Swallow: the reporter must never surface its own failures.
      })
    }
  } catch {
    // Swallow: the reporter must never surface its own failures.
  }
}
