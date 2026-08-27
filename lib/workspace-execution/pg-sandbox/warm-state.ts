import { runPgInWorker } from "./worker-runner"

/**
 * PGlite compiles its (much larger than sql.js) WASM module + bundled template data directory
 * once per browser session — a same-origin fetch of the assets under /wasm/pglite/ followed by a
 * full Postgres boot. Module-level so every pg-sandbox surface shares one "has it warmed yet"
 * signal: the first Run shows the cold-start state, everything after benefits from the browser's
 * own HTTP cache + V8's WASM compilation cache. Mirrors sql-sandbox/warm-state.ts exactly.
 */
let warmed = false

export function isPgRuntimeWarm(): boolean {
  return warmed
}

export function markPgRuntimeWarm(): void {
  warmed = true
}

/**
 * Fire-and-forget: warms the engine on workspace mount so the learner's first Run isn't the first
 * compile+boot. Safe to call repeatedly (a no-op once a run is already in flight or the engine is
 * warm).
 */
export function prewarmPgRuntime(): void {
  if (warmed || typeof window === "undefined") return
  void runPgInWorker({ mode: "warm" })
    .then(() => {
      warmed = true
    })
    .catch(() => {
      // Best-effort — a failed pre-warm just means the first real Run pays the cold start.
    })
}
