import { runPythonInWorker } from "./worker-runner"

/**
 * Pyodide boots once per browser session (the first run downloads + starts the WASM runtime, which
 * is multi-second). Module-level so every Python surface — graded lesson exercises and the free
 * Python Executor alike — shares one "has it warmed yet" signal: whichever runs first shows the
 * cold-start state, and every surface after that is fast.
 */
let warmed = false
// Single-flight guard: while one warm ping is booting the runtime, further calls are no-ops.
let warmupInFlight = false

export function isPythonRuntimeWarm(): boolean {
  return warmed
}

export function markPythonRuntimeWarm(): void {
  warmed = true
}

/**
 * Fire-and-forget: boot the worker + Pyodide on workspace mount so the user's first Run isn't the
 * first boot (a multi-second WASM download at the worst possible moment). Executes no code — the
 * worker answers a `warm` ping right after the runtime loads. Safe to call repeatedly/concurrently
 * (single warm ping in flight, no-op once warm), and a real Run issued mid-warm simply queues
 * behind the ping (see runPythonInWorker) instead of failing.
 */
export function prewarmPythonRuntime(): void {
  if (warmed || warmupInFlight || typeof window === "undefined") return
  warmupInFlight = true
  void runPythonInWorker({ warm: true })
    .then((result) => {
      if (result.success) warmed = true
    })
    .catch(() => {
      // Best-effort — a failed pre-warm just means the first real Run pays the cold start.
    })
    .finally(() => {
      warmupInFlight = false
    })
}
