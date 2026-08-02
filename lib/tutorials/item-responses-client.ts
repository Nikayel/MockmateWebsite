/**
 * Client-side buffered writer for item-level Learn telemetry.
 *
 * Fire-and-forget by design. A learner can answer three checks while scrolling one
 * teach section, so responses are BUFFERED and flushed together rather than sent one
 * request per keystroke-scale action. Nothing here ever throws, ever retries, or ever
 * surfaces a failure: losing a telemetry row is strictly better than interrupting a
 * lesson, and the caller (a widget's commit handler) has no way to act on an error.
 *
 * Signed-out learners drop silently — `authHeaders()` returns null and the buffer is
 * cleared, so anonymous sessions cost one token lookup and no requests.
 *
 * `LearnItemResponseInput` is imported type-only, so this module carries no runtime
 * dependency on the Admin-SDK-backed `./item-responses` service.
 */
import { authHeaders } from "./learn-api-client"
import type { LearnItemResponseInput } from "./item-responses"

const ENDPOINT = "/api/tutorials/item-responses"

/** Matches `MAX_ITEM_RESPONSES_PER_REQUEST` on the server. */
const MAX_BATCH = 20

/** Long enough to coalesce a burst of answers, short enough to survive a tab close. */
const FLUSH_DEBOUNCE_MS = 2000

let buffer: LearnItemResponseInput[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null
let listenersBound = false

async function send(batch: LearnItemResponseInput[]): Promise<void> {
  if (batch.length === 0) return
  try {
    const headers = await authHeaders()
    if (!headers) return
    await fetch(ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify({ responses: batch }),
      // Lets an in-flight flush survive the page teardown that triggered it.
      keepalive: true,
    })
  } catch {
    // Deliberately silent: see the module docblock.
  }
}

/** Drain the buffer immediately, in server-sized chunks. */
export function flushItemResponses(): void {
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  if (buffer.length === 0) return
  const pending = buffer
  buffer = []
  for (let i = 0; i < pending.length; i += MAX_BATCH) {
    void send(pending.slice(i, i + MAX_BATCH))
  }
}

/**
 * Flush when the page is being torn down. `visibilitychange → hidden` is the reliable
 * signal on mobile (`beforeunload` does not fire there); `pagehide` covers bfcache.
 * Bound once, lazily, so importing this module in a server component costs nothing.
 */
function bindTeardownListeners(): void {
  if (listenersBound || typeof document === "undefined") return
  listenersBound = true
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushItemResponses()
  })
  window.addEventListener("pagehide", () => flushItemResponses())
}

/**
 * Queue one item response. Flushes immediately at batch size, otherwise on a debounce.
 * Safe to call from a render-adjacent event handler: it never awaits.
 */
export function queueItemResponse(input: LearnItemResponseInput): void {
  if (typeof window === "undefined") return
  bindTeardownListeners()

  buffer.push(input)

  if (buffer.length >= MAX_BATCH) {
    flushItemResponses()
    return
  }
  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = setTimeout(flushItemResponses, FLUSH_DEBOUNCE_MS)
}

/** Test seam: drop anything buffered without sending it. */
export function __resetItemResponseBufferForTests(): void {
  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = null
  buffer = []
}
