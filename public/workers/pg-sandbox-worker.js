// Web Worker for real Postgres execution through PGlite (Postgres compiled to WASM). Sprint Labs'
// SQL semantics engine — sql.js (SQLite) cannot express row-level security, roles, or advisory
// locks, so this is a second, separate SQL worker alongside public/workers/sql-sandbox-worker.js,
// not a replacement for it. The existing sql.js-backed SQL curriculum keeps using that worker
// unchanged.
//
// Copies sql-sandbox-worker.js's conventions as closely as the two engines' APIs allow: self-hosted
// assets under public/ (here: /wasm/pglite/), a module-level "is the engine loaded yet" ready
// promise, a {type: "status"|"exec-start"|"result"} message protocol, and a fresh database per run
// (a new `PGlite` instance per suite, never reused across runs, so one ticket's schema/role/policy
// state can never leak into the next).
//
// ONE DELIBERATE DEVIATION FROM THE sql.js WORKER, called out here and at every call site that
// depends on it (worker-runner.ts, warm-state.ts): THIS IS A MODULE WORKER
// (`new Worker(url, { type: "module" })`), not a classic worker. PGlite's browser build
// (node_modules/@electric-sql/pglite, vendored to /wasm/pglite/ by
// scripts/copy-pglite-vendor.mjs) ships ESM only (`export` syntax) — `importScripts()`, the
// mechanism sql-sandbox-worker.js uses to self-host sql-wasm.js, can only load classic scripts and
// cannot load an ES module at all. A module worker's global scope still exposes the same
// `self.postMessage`/`self.onmessage` API classic workers do; only the script-loading mechanism
// differs (`import`/`import()` instead of `importScripts`), which is why the message protocol
// below is otherwise identical to the sql.js worker's.
//
// The suite-execution algorithm itself (migrations[] -> seed -> learner SQL -> assertions, the
// app-role/RLS posture) is NOT implemented here: it lives in the single shared
// public/workers/pg-suite-core.mjs module, imported below, so this file and
// lib/workspace-execution/pg-sandbox/node-runner.ts (the Node/CI replay path) can never drift —
// see that module's header for the full design and its documented single-connection limits.
import { runPgSuiteCore } from "/workers/pg-suite-core.mjs"

let pgliteModulePromise = null

function postStatus(message) {
  self.postMessage({ type: "status", message, timestamp: Date.now() })
}

function loadPgliteModule() {
  if (!pgliteModulePromise) {
    pgliteModulePromise = (async () => {
      postStatus("Loading Postgres engine...")
      // Self-hosted under public/wasm/pglite/ (same-origin) — no CDN fetch. A dynamic import (not
      // a static top-level one) so this cost is paid lazily, on first use or an explicit "warm"
      // ping, exactly like sql-sandbox-worker.js's lazy `importScripts` call.
      const mod = await import("/wasm/pglite/index.js")
      postStatus("Postgres engine ready")
      return mod
    })().catch((error) => {
      // Do NOT cache a failed load — a later run should be able to retry without a page reload.
      pgliteModulePromise = null
      throw error
    })
  }
  return pgliteModulePromise
}

/** Formats WorkspaceTestResult[] into the shared "__WORKSPACE_TEST_RESULTS__:" marker log line
 *  every workspace runner (Python/JS/TS/SQL) emits, so the existing main-thread parsing pipeline
 *  (parseWorkspaceMarker) is reused verbatim for this engine too. */
function resultsAsMarkerLog(results) {
  return {
    type: "log",
    message: "__WORKSPACE_TEST_RESULTS__:" + JSON.stringify(results),
    timestamp: Date.now(),
  }
}

self.onmessage = async function (event) {
  const { mode, suite } = event.data || {}

  try {
    const { PGlite } = await loadPgliteModule()

    if (mode === "warm") {
      // Boot one throwaway instance so the wasm/data fetch + compile + Postgres boot happens now,
      // not on the learner's first real Run. The browser's own HTTP cache and V8's WASM
      // compilation cache carry the benefit into every instance created after this one.
      const warmDb = await PGlite.create()
      await warmDb.close()
      self.postMessage({ type: "result", success: true, logs: [] })
      return
    }

    // Boot is (about to be) done; tell the runner to start its (short) execution timeout.
    self.postMessage({ type: "exec-start", timestamp: Date.now() })

    if (mode === "suite") {
      const pg = await PGlite.create()
      try {
        const results = await runPgSuiteCore(pg, suite)
        self.postMessage({ type: "result", success: true, logs: [resultsAsMarkerLog(results)] })
      } finally {
        await pg.close()
      }
      return
    }

    self.postMessage({ type: "result", success: false, error: `Unknown mode: ${mode}`, logs: [] })
  } catch (error) {
    self.postMessage({
      type: "result",
      success: false,
      error: error && error.message ? error.message : String(error),
      logs: [],
    })
  }
}
