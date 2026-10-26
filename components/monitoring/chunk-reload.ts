import { toast } from "sonner"
import { reloadAfterCheckpoint } from "@/lib/interview/session-lifecycle/reload-checkpoint"
import { reportClientError } from "./report-client-error"

/** A stale tab may need fresh assets. Checkpoint active work before its one recovery reload. */
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
 * Returns true when the error was a chunk-load failure AND recovery was scheduled —
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

  reloadAfterCheckpoint(
    () => window.location.reload(),
    () => {
      toast.error("Reload paused to protect your work", {
        description:
          "We could not save a recovery copy. Keep this tab open and copy your code before refreshing.",
        duration: Infinity,
      })
      reportClientError({
        message: "Chunk recovery blocked: session checkpoint unavailable",
        source: "window-error",
      })
    }
  )
  return true
}
