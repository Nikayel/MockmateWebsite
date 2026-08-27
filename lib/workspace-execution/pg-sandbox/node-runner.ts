/**
 * Node-side entry point for the PGlite suite engine: `runPgSuiteNode(suite)` boots a fresh PGlite
 * instance IN-PROCESS (no worker, no subprocess) and runs the shared core
 * (public/workers/pg-suite-core.mjs), returning the same `WorkspaceExecutionResult` shape every
 * other workspace runner in this codebase returns.
 *
 * This exists so `lab validate`'s red/green gate (a later task) can replay a Sprint Labs SQL
 * ticket in CI without a browser, and is this module's OWN test surface (see
 * __tests__/node-runner.test.ts) — PGlite runs natively in Node, no separate "Node build" import
 * path needed; `@electric-sql/pglite`'s package.json dual-publishes ESM (`dist/index.js`) and CJS
 * (`dist/index.cjs`) from ONE package, and a plain `import { PGlite } from "@electric-sql/pglite"`
 * resolves correctly in this repo's Node/vitest environment (verified empirically — see
 * task-5-report.md).
 *
 * Deliberately NOT re-exported from ./index.ts (the browser-safe barrel), for the same reason
 * ts-workspace/node-harness.ts isn't re-exported from ts-workspace/index.ts: this file's import of
 * "@electric-sql/pglite" pulls in the real npm package (not the self-hosted /wasm/pglite/ copy the
 * worker uses), which has no reason to ever end up in a browser bundle. Reachable only via its own
 * path: `@/lib/workspace-execution/pg-sandbox/node-runner`.
 */
import { pathToFileURL } from "node:url"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { PGlite } from "@electric-sql/pglite"

import type { WorkspaceExecutionResult, WorkspaceTestResult } from "../types"
import type { PgSuite } from "./types"

const currentDir = dirname(fileURLToPath(import.meta.url))
// lib/workspace-execution/pg-sandbox -> repo root
const REPO_ROOT = join(currentDir, "..", "..", "..")
const CORE_MODULE_URL = pathToFileURL(join(REPO_ROOT, "public/workers/pg-suite-core.mjs")).href

/** Structural shape of a PGlite `.exec()` result the shared core reads — real `PGlite` instances
 *  satisfy this (their `Results` rows/fields carry more fields than this needs). */
export interface PgConnection {
  exec(
    sql: string
  ): Promise<Array<{ rows: Array<Record<string, unknown>>; fields: Array<{ name: string }> }>>
}

interface PgSuiteCoreModule {
  runPgSuiteCore: (pg: PgConnection, suite: PgSuite) => Promise<WorkspaceTestResult[]>
  APP_ROLE_NAME: string
}

// `import()`s the literal shared file (not a copy) so behavior can never drift from the worker —
// mirrors ts-workspace/node-harness.ts's `nodeRequire(".../vitest-shim.js")` pattern, using a
// dynamic import (not createRequire) because the shared file is real ESM (see its own header).
let coreModulePromise: Promise<PgSuiteCoreModule> | null = null
function loadCore(): Promise<PgSuiteCoreModule> {
  if (!coreModulePromise) {
    coreModulePromise = import(/* @vite-ignore */ CORE_MODULE_URL) as Promise<PgSuiteCoreModule>
  }
  return coreModulePromise
}

function emptySummary(): WorkspaceExecutionResult["summary"] {
  return { total: 0, passed: 0, failed: 0, passRate: 0, serviceErrors: 0, effectiveTotal: 0 }
}

function summarize(results: WorkspaceTestResult[]): WorkspaceExecutionResult {
  const passed = results.filter((result) => result.passed).length
  const total = results.length
  return {
    success: total > 0 && passed === total,
    results,
    consoleLogs: [],
    summary: {
      total,
      passed,
      failed: total - passed,
      passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
      serviceErrors: 0,
      effectiveTotal: total,
    },
    error: null,
  }
}

/**
 * Runs a PgSuite to completion against a FRESH, in-memory PGlite instance (constructed and closed
 * within this call — no state survives between calls, matching every other workspace runner's
 * "fresh sandbox per run" guarantee) and returns the WorkspaceExecutionResult-shaped verdict.
 */
export async function runPgSuiteNode(suite: PgSuite): Promise<WorkspaceExecutionResult> {
  let pg: PGlite | null = null
  try {
    const core = await loadCore()
    pg = new PGlite()
    await pg.waitReady
    const results = await core.runPgSuiteCore(pg, suite)
    return summarize(results)
  } catch (error) {
    return {
      success: false,
      results: [],
      consoleLogs: [],
      summary: emptySummary(),
      error: error instanceof Error ? error.message : "Failed to run PG suite in Node",
    }
  } finally {
    if (pg) {
      await pg.close().catch(() => {
        // best-effort teardown — a close failure must not mask the suite's own result
      })
    }
  }
}

/**
 * Test/CI-only escape hatch: runs the shared core against a CALLER-PROVIDED connection instead of
 * a fresh one, so a test file can share ONE PGlite instance across many sub-scenarios (resetting
 * schema between them) to stay under the suite's time budget, while still exercising the real,
 * unmodified core logic. Production callers must use `runPgSuiteNode`, which always boots (and
 * closes) its own fresh instance.
 */
export async function runPgSuiteCoreForTest(
  pg: PgConnection,
  suite: PgSuite
): Promise<WorkspaceTestResult[]> {
  const core = await loadCore()
  return core.runPgSuiteCore(pg, suite)
}

/**
 * The fixed app role name suites are graded against (see pg-suite-core.mjs's module header).
 * Async because the name lives in the shared core, loaded lazily — reading it through here
 * instead of hard-coding the literal in test/content fixtures means it can never drift.
 */
export async function getAppRoleName(): Promise<string> {
  const core = await loadCore()
  return core.APP_ROLE_NAME
}
