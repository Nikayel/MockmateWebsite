/**
 * Stale-deploy chunk recovery.
 *
 * Every production deploy invalidates the previous build's hashed chunk URLs. A tab
 * that loaded before the deploy and lazy-loads a route after it throws a
 * ChunkLoadError: the file it wants no longer exists on the server. Retrying cannot
 * help (the URL is gone for good), and the error page's "Try Again" re-renders with
 * the same stale manifest — the only real fix is a full reload, which fetches the new
 * build's HTML.
 *
 * `attemptChunkErrorRecovery` reloads AT MOST once per latch window
 * (sessionStorage-based) so a genuinely broken build cannot reload-loop: a second
 * chunk failure inside the window falls through to normal error reporting and the
 * error page. Callers therefore use it as a gate — recovered errors are not beaconed
 * to /api/client-error, because deploy churn is expected behavior, not an incident.
 */

const RELOAD_LATCH_KEY = "cs-chunk-reload-at"
const RELOAD_LATCH_WINDOW_MS = 2 * 60 * 1000

// Matches webpack's "Loading chunk N failed", Next's "Failed to load chunk
// /_next/static/chunks/<hash>.js from module N", and the ChunkLoadError name that
// prefixes both when surfaced via window.onerror ("Uncaught ChunkLoadError: ...").
const CHUNK_ERROR_PATTERN = /ChunkLoadError|Loading chunk \S+ failed|Failed to load chunk/i

export function isChunkLoadError(message: string | null | undefined): boolean {
  return typeof message === "string" && CHUNK_ERROR_PATTERN.test(message)
}

/**
 * Returns true when the error was a chunk-load failure AND a reload was triggered —
 * the caller should stop (skip reporting, skip rendering an error state). Returns
 * false for every other error, and for chunk errors that already got their reload.
 */
export function attemptChunkErrorRecovery(message: string | null | undefined): boolean {
  if (!isChunkLoadError(message)) return false
  if (typeof window === "undefined") return false

  try {
    const lastReloadAt = Number(window.sessionStorage.getItem(RELOAD_LATCH_KEY) ?? "0")
    if (Number.isFinite(lastReloadAt) && Date.now() - lastReloadAt < RELOAD_LATCH_WINDOW_MS) {
      // Reloaded recently and chunks are still failing: that is a real problem, not
      // deploy churn. Let it report and show the error page.
      return false
    }
    window.sessionStorage.setItem(RELOAD_LATCH_KEY, String(Date.now()))
  } catch {
    // Storage unavailable (private mode, disabled cookies): without the latch we
    // cannot rule out a reload loop, so fail toward reporting instead of reloading.
    return false
  }

  window.location.reload()
  return true
}
