/**
 * Node-side entry point for the TypeScript workspace runner: `runTsWorkspace(input)` transpiles,
 * links, and runs a TS workspace's visible + hidden test suites IN-PROCESS (no subprocess, no
 * temp directory on disk), returning the same `WorkspaceExecutionResult` shape every other
 * workspace runner in this codebase returns.
 *
 * This exists so `lab validate`'s red/green gate (a later task) can replay a ticket's tests in CI
 * without a browser. Its semantics MUST match public/workers/js-sandbox-worker.js's TS branch:
 * same module resolution (require-graph.ts mirrors that file's resolver), same shim (both
 * `require()` the literal public/workers/assert-shim.js and public/workers/vitest-shim.js files —
 * see loadAssertShim/loadVitestShim below), same result shape. A ticket that fails in the worker
 * must fail here too, and vice versa.
 *
 * SCOPE, deliberately:
 *  - Transpile-only. NO cross-file type-checking happens anywhere in this path — a type error
 *    `tsc --noEmit` would catch is invisible here unless it also breaks at runtime. This matches
 *    the worker (which only calls `ts.transpileModule`, never creates a full Program) and is
 *    stated once here as the canonical note; see PLAN.md for why v1 stops there.
 *  - No `testRunnerPath`/hand-authored runner file. `testPaths` then `hiddenTestPaths` are
 *    `require()`d directly by this function (visible first, so a shared "current suite" ordering
 *    matches what a learner sees); each file registers its own `describe`/`it` calls against the
 *    shared vitest-shim instance for this run.
 *  - Never mutates `globalThis.describe/it/expect`. The worker's TS branch installs those as
 *    Worker-global convenience aliases (safe: a Worker's global scope is a separate realm from
 *    this Node process) — see vitest-shim.js's header. Doing the same here would be dangerous:
 *    this function runs INSIDE this repo's own real vitest process (this file is exercised by
 *    node-harness.test.ts, which is itself a describe/it suite), and stomping on
 *    `globalThis.describe` mid-run would corrupt the actual test runner. A workspace test file
 *    MUST reach the shim via `require("vitest")` (what `ts.transpileModule` turns
 *    `import { describe, it, expect } from "vitest"` into), never via bare globals, in this path.
 *  - A test FILE that throws while loading (a broken cross-file import, a `require()` for a path
 *    that does not exist) is isolated to that one file: it becomes a single failing result row
 *    scoped to that file's suite, and every OTHER file's results still come through. Only a
 *    failure in shared setup (loading the shims themselves, or an exception outside the per-file
 *    loop) surfaces as the top-level `error` field with `results: []`.
 */
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import type { WorkspaceTestResult } from "../types"
import { isValidWorkspacePath } from "../validators"
import { createRequireGraph } from "./require-graph"
import { createTsTranspileCache } from "./transpile-cache"
import type { TsWorkspaceFile, TsWorkspaceInput, TsWorkspaceRunResult } from "./types"

const MAX_OVERLAY_FILE_CHARS = 100_000

const currentDir = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(currentDir, "..", "..", "..")
const nodeRequire = createRequire(import.meta.url)

interface AssertShimApi {
  (value: unknown, message?: string): void
  [method: string]: unknown
}

interface VitestShimTestFn {
  (name: string, fn: () => unknown): void
  skip: (name: string, fn?: () => unknown) => void
}

interface VitestShimApi {
  describe: (name: string, fn: () => void) => void
  it: VitestShimTestFn
  test: VitestShimTestFn
  expect: (actual: unknown) => unknown
  setCurrentFile: (path: string | null) => void
  finalize: () => Promise<WorkspaceTestResult[]>
}

/** `require()`s the literal shared shim file (not a copy) so behavior can never drift from the worker. */
function loadAssertShim(): AssertShimApi {
  const mod = nodeRequire(join(REPO_ROOT, "public/workers/assert-shim.js")) as {
    createAssertShim: () => AssertShimApi
  }
  return mod.createAssertShim()
}

function loadVitestShim(hiddenTestPaths: string[]): VitestShimApi {
  const mod = nodeRequire(join(REPO_ROOT, "public/workers/vitest-shim.js")) as {
    createVitestShim: (options?: { hiddenTestPaths?: string[] }) => VitestShimApi
  }
  return mod.createVitestShim({ hiddenTestPaths })
}

function cleanPath(path: string): string {
  return path.replace(/^\.\//, "")
}

/**
 * Applies learner edits over matching paths in `files`. Simpler than the browser's
 * `overlayWorkspaceFiles` (no `editableFilePaths` allowlist): this harness is an internal CI/test
 * replay tool, not a live-learner-submission boundary, so the only hygiene kept is path validity
 * and the same size cap the browser path enforces.
 */
function applyOverlay(
  files: TsWorkspaceFile[],
  overlay: TsWorkspaceFile[] | undefined
): TsWorkspaceFile[] {
  if (!overlay || overlay.length === 0) return files

  const overlayByPath = new Map<string, string>()
  for (const edit of overlay) {
    if (!isValidWorkspacePath(edit.path)) continue
    if (edit.content.length > MAX_OVERLAY_FILE_CHARS) continue
    overlayByPath.set(edit.path, edit.content)
  }

  return files.map((file) => ({
    path: file.path,
    content: overlayByPath.get(file.path) ?? file.content,
  }))
}

type ConsoleLogEntry = TsWorkspaceRunResult["consoleLogs"][number]

/**
 * Captures console output emitted by candidate code during the run, restoring on exit.
 * Reassigning `console.*` is exactly what this function is for (mirroring
 * js-sandbox-worker.js's own console interception), so the repo's no-console rule is disabled for
 * this block rather than worked around.
 */
/* eslint-disable no-console */
function captureConsole(): { logs: ConsoleLogEntry[]; restore: () => void } {
  const logs: ConsoleLogEntry[] = []
  const original = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
  }

  function render(args: unknown[]): string {
    return args
      .map((value) => (typeof value === "object" ? JSON.stringify(value) : String(value)))
      .join(" ")
  }

  console.log = (...args: unknown[]) => {
    logs.push({ type: "log", message: render(args), timestamp: Date.now() })
  }
  console.warn = (...args: unknown[]) => {
    logs.push({ type: "warn", message: render(args), timestamp: Date.now() })
    original.warn(...args)
  }
  console.error = (...args: unknown[]) => {
    logs.push({ type: "error", message: render(args), timestamp: Date.now() })
    original.error(...args)
  }
  console.info = (...args: unknown[]) => {
    logs.push({ type: "info", message: render(args), timestamp: Date.now() })
  }

  return {
    logs,
    restore() {
      console.log = original.log
      console.warn = original.warn
      console.error = original.error
      console.info = original.info
    },
  }
}
/* eslint-enable no-console */

function emptySummary(): TsWorkspaceRunResult["summary"] {
  return { total: 0, passed: 0, failed: 0, passRate: 0, serviceErrors: 0, effectiveTotal: 0 }
}

export async function runTsWorkspace(input: TsWorkspaceInput): Promise<TsWorkspaceRunResult> {
  const { logs, restore } = captureConsole()

  try {
    const files = applyOverlay(input.files, input.editableOverlay)
    const transpileCache = createTsTranspileCache()
    const transpileTimingsMs: Record<string, number> = {}

    const modules: Record<string, string> = {}
    for (const file of files) {
      const path = cleanPath(file.path)
      if (/\.tsx?$/.test(path)) {
        const { code, ms } = transpileCache.transpile(path, file.content)
        transpileTimingsMs[file.path] = ms
        modules[path.replace(/\.tsx?$/, ".js")] = code
      } else {
        modules[path] = file.content
      }
    }

    const assertShim = loadAssertShim()
    const hiddenTestPaths = input.hiddenTestPaths.map(cleanPath)
    const vitestShim = loadVitestShim(hiddenTestPaths)

    const requireModule = createRequireGraph({
      modules,
      specialModules: {
        assert: assertShim,
        "node:assert": assertShim,
        "node:assert/strict": assertShim,
        vitest: vitestShim,
      },
    })

    // Visible before hidden, matching what a learner's own "run tests" click orders first.
    const setupFailures: WorkspaceTestResult[] = []
    for (const testPath of [...input.testPaths, ...input.hiddenTestPaths]) {
      const normalized = cleanPath(testPath)
      vitestShim.setCurrentFile(normalized)
      try {
        requireModule(normalized.replace(/\.tsx?$/, ".js"))
      } catch (error) {
        setupFailures.push({
          suite: normalized,
          name: "Test file failed to load",
          passed: false,
          error: error instanceof Error ? error.message : String(error),
          isHidden: hiddenTestPaths.includes(normalized),
        })
      }
    }
    vitestShim.setCurrentFile(null)

    const finalized = await vitestShim.finalize()
    const results =
      setupFailures.length > 0 || finalized.length > 0
        ? [...setupFailures, ...finalized]
        : [
            {
              suite: "workspace",
              name: "Workspace test runner",
              passed: false,
              error: "Test runner did not report any test results.",
            },
          ]

    const passed = results.filter((result) => result.passed).length
    const total = results.length

    return {
      success: passed === total,
      results,
      consoleLogs: logs,
      summary: {
        total,
        passed,
        failed: total - passed,
        passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
        serviceErrors: 0,
        effectiveTotal: total,
      },
      error: null,
      transpileTimingsMs,
    }
  } catch (error) {
    return {
      success: false,
      results: [],
      consoleLogs: logs,
      summary: emptySummary(),
      error: error instanceof Error ? error.message : "Failed to run TS workspace",
      transpileTimingsMs: {},
    }
  } finally {
    restore()
  }
}
