import { runSqlInWorker } from "./worker-runner"

/**
 * sql.js compiles its WASM module once per browser session (the first run is a ~1 MB same-origin
 * fetch + compile). Module-level so every SQL surface shares one "has it warmed yet" signal: the
 * first Run shows the cold-start state, everything after is instant.
 */
let warmed = false

export function isSqlRuntimeWarm(): boolean {
  return warmed
}

export function markSqlRuntimeWarm(): void {
  warmed = true
}

/**
 * Fire-and-forget: compile the engine on lesson mount so the learner's first Run isn't the first
 * compile. Safe to call repeatedly (a no-op once a run is already in flight or the engine is warm).
 */
export function prewarmSqlRuntime(): void {
  if (warmed || typeof window === "undefined") return
  void runSqlInWorker({ mode: "warm" })
    .then(() => {
      warmed = true
    })
    .catch(() => {
      // Best-effort — a failed pre-warm just means the first real Run pays the cold start.
    })
}
