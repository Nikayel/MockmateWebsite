/**
 * Pyodide boots once per browser session (the first run downloads + starts the WASM runtime, which
 * is multi-second). Module-level so every Python surface — graded lesson exercises and the free
 * Python Executor alike — shares one "has it warmed yet" signal: whichever runs first shows the
 * cold-start state, and every surface after that is fast.
 */
let warmed = false

export function isPythonRuntimeWarm(): boolean {
  return warmed
}

export function markPythonRuntimeWarm(): void {
  warmed = true
}
