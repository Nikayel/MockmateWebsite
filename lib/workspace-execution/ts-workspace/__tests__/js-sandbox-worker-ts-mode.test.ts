import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  FIVE_FILE_HIDDEN_TEST_PATHS,
  FIVE_FILE_TEST_PATHS,
  FIVE_FILE_WORKSPACE,
} from "./fixtures/five-file-workspace"

/**
 * Simulates public/workers/js-sandbox-worker.js's TS branch in Node, WITHOUT a real Worker
 * thread: evaluates the REAL worker file (like assert-shim.test.ts does) against a fake `self`
 * whose `importScripts` loads the real sibling files from disk (assert-shim.js, vitest-shim.js,
 * ts-transpiler-loader.js, and the real vendored typescript.js) instead of fetching over the
 * network. `postMessage` resolves a captured promise instead of crossing a thread boundary.
 *
 * This is the "worker-level test" the task brief asks for: it proves the SHIPPED worker file
 * (not a copy, not a reimplementation) produces the same result shape and phase-message ordering
 * that lib/workspace-execution/ts-workspace/node-harness.ts's test proves for the Node path, using
 * the SAME fixture.
 */

const WORKER_PATH = join(process.cwd(), "public/workers/js-sandbox-worker.js")
const VENDOR_TS_PATH = join(process.cwd(), "public/vendor/typescript/typescript.js")
const nodeRequire = createRequire(import.meta.url)

interface WorkerMessage {
  type?: "transpile-start" | "exec-start"
  success?: boolean
  logs?: Array<{ type: string; message: string; timestamp: number }>
  error?: string
  workerStartFailed?: boolean
}

interface FakeWorkerScope {
  onmessage: ((event: { data: unknown }) => void | Promise<void>) | null
  postMessage: (message: WorkerMessage) => void
  createAssertShim?: () => unknown
  createVitestShim?: (options?: { hiddenTestPaths?: string[] }) => unknown
  createTsTranspileCache?: () => unknown
  ts?: unknown
}

/**
 * Loads a plain-script worker sibling file (assert-shim.js / vitest-shim.js /
 * ts-transpiler-loader.js / the vendored typescript.js) into `scope`, exactly the way a real
 * `importScripts` call would attach globals to the worker's global object.
 *
 * The vendored typescript.js is special-cased: it attaches its compiler object to a bare
 * top-level `var ts`, which only becomes a global as a side effect of running as a genuine
 * top-level script (a real `importScripts` load). Wrapping its source in `new Function(...)` (as
 * every OTHER shim file here needs, and correctly handles via its own `self`-parameter-closing
 * IIFE) would make that `var` local to the wrapper and throw the compiler away. Node's own
 * `require()` reaches the same populated object through the file's `module.exports` branch
 * instead, so that path is used here and the result is attached to `scope.ts` by hand — replicating
 * the OUTCOME a real worker's importScripts produces, not its literal mechanism.
 */
function fakeImportScripts(scope: FakeWorkerScope, failPaths: Set<string>, ...paths: string[]) {
  for (const requested of paths) {
    if (failPaths.has(requested)) {
      // Reproduces a real Worker's importScripts failure (e.g. a NetworkError fetching the file).
      throw new Error(`NetworkError fetching ${requested}`)
    }
    if (requested === "/vendor/typescript/typescript.js") {
      scope.ts = nodeRequire(VENDOR_TS_PATH)
      continue
    }
    const absolute = join(process.cwd(), "public", requested.replace(/^\//, ""))
    const source = readFileSync(absolute, "utf8")
    new Function("self", "module", source)(scope, undefined)
  }
}

/**
 * Loads the real js-sandbox-worker.js and runs one message through it, resolving with the final
 * postMessage payload and every phase message observed along the way.
 *
 * `importScripts` is called as a BARE global inside the worker file (real Workers expose it as a
 * WorkerGlobalScope global, not solely via `self.importScripts`), so a temporary global is
 * installed for the duration of evaluation and torn down in `finally` — this never leaks into
 * other tests.
 */
async function runWorkerMessage(
  data: unknown,
  options: { failImportScripts?: string[] } = {}
): Promise<{ final: WorkerMessage; phases: string[] }> {
  const phases: string[] = []
  let resolveFinal!: (message: WorkerMessage) => void
  const finalPromise = new Promise<WorkerMessage>((resolve) => {
    resolveFinal = resolve
  })

  const scope: FakeWorkerScope = {
    onmessage: null,
    postMessage: (message: WorkerMessage) => {
      if (message.type === "transpile-start" || message.type === "exec-start") {
        phases.push(message.type)
        return
      }
      resolveFinal(message)
    },
  }

  const failPaths = new Set(options.failImportScripts ?? [])
  const globalScope = globalThis as unknown as { importScripts?: (...paths: string[]) => void }
  const previousImportScripts = globalScope.importScripts
  globalScope.importScripts = (...paths: string[]) => fakeImportScripts(scope, failPaths, ...paths)

  try {
    const source = readFileSync(WORKER_PATH, "utf8")
    // The worker file is a classic script (uses `self.onmessage = ...`), so evaluating it with
    // `self` bound to our fake scope attaches everything to `scope`.
    new Function("self", "module", source)(scope, undefined)

    if (typeof scope.onmessage !== "function") {
      throw new Error("js-sandbox-worker.js did not attach onmessage to the worker scope")
    }

    void scope.onmessage({ data })
    const final = await finalPromise
    return { final, phases }
  } finally {
    globalScope.importScripts = previousImportScripts
  }
}

describe("js-sandbox-worker.js TS branch (simulated)", () => {
  it("runs the 5-file TS fixture and reports transpile-start before exec-start", async () => {
    const { final, phases } = await runWorkerMessage({
      files: FIVE_FILE_WORKSPACE,
      testPaths: FIVE_FILE_TEST_PATHS,
      hiddenTestPaths: FIVE_FILE_HIDDEN_TEST_PATHS,
    })

    expect(phases).toEqual(["transpile-start", "exec-start"])
    expect(final.success).toBe(true) // the worker protocol's own success; test pass/fail lives in the marker

    const markerLog = (final.logs || []).find((log) =>
      log.message.startsWith("__WORKSPACE_TEST_RESULTS__:")
    )
    expect(markerLog).toBeTruthy()
    const results = JSON.parse(
      markerLog!.message.slice("__WORKSPACE_TEST_RESULTS__:".length)
    ) as Array<{
      suite: string
      name: string
      passed: boolean
      isHidden?: boolean
    }>

    expect(results).toHaveLength(6)
    const byName = new Map(results.map((r) => [r.name, r]))
    expect(byName.get("adds two numbers")).toMatchObject({ passed: true, isHidden: false })
    expect(byName.get("is wrong on purpose")).toMatchObject({ passed: false, isHidden: false })
    expect(byName.get("still runs from inside a visible file")).toMatchObject({ isHidden: true })
    expect(byName.get("greets asynchronously")).toMatchObject({ passed: true, isHidden: true })
  })

  it("refuses to leak a hidden test's content through a non-driver require (security regression)", async () => {
    const { final } = await runWorkerMessage({
      files: [
        { path: "src/leak.ts", content: 'import "../tests/hidden/secret.test"\nexport {}\n' },
        {
          path: "tests/visible/uses-leak.test.ts",
          content: `import { describe, expect, it } from "vitest"
import "../../src/leak"

describe("visible", () => {
  it("passes", () => {
    expect(1).toBe(1)
  })
})
`,
        },
        {
          path: "tests/hidden/secret.test.ts",
          content: `import { describe, expect, it } from "vitest"

describe("Secret Probe", () => {
  it("should never leak", () => {
    expect(true).toBe(true)
  })
})
`,
        },
      ],
      testPaths: ["tests/visible/uses-leak.test.ts"],
      hiddenTestPaths: ["tests/hidden/secret.test.ts"],
    })

    const markerLog = (final.logs || []).find((log) =>
      log.message.startsWith("__WORKSPACE_TEST_RESULTS__:")
    )
    expect(markerLog).toBeTruthy()
    const results = JSON.parse(
      markerLog!.message.slice("__WORKSPACE_TEST_RESULTS__:".length)
    ) as Array<{
      suite: string
      name: string
      passed: boolean
      error: string | null
      isHidden?: boolean
    }>

    const visibleFileFailure = results.find((r) => r.suite === "tests/visible/uses-leak.test.ts")
    expect(visibleFileFailure).toMatchObject({ passed: false })
    expect(visibleFileFailure?.error).toMatch(/Module not found/)

    const secretResult = results.find((r) => r.name === "should never leak")
    expect(secretResult).toMatchObject({ suite: "Secret Probe", passed: true, isHidden: true })

    expect(results.some((r) => r.suite === "Secret Probe" && r.isHidden !== true)).toBe(false)
  })

  it("runs beforeEach/afterEach hooks and skips a describe.skip suite through the FULL pipeline (R13, both-runtimes check)", async () => {
    const { final } = await runWorkerMessage({
      files: [
        {
          path: "tests/visible/hooks.test.ts",
          content: `import { afterEach, beforeEach, describe, expect, it } from "vitest"

const log: string[] = []

describe("Suite", () => {
  beforeEach(() => log.push("beforeEach"))
  afterEach(() => log.push("afterEach"))

  it("first", () => {
    log.push("first")
    expect(log).toEqual(["beforeEach", "first"])
  })

  it("second checks the previous test's afterEach already ran", () => {
    expect(log).toEqual(["beforeEach", "first", "afterEach", "beforeEach"])
  })
})

describe.skip("Skipped", () => {
  it("never runs", () => {
    throw new Error("should never execute")
  })
})
`,
        },
      ],
      testPaths: ["tests/visible/hooks.test.ts"],
      hiddenTestPaths: [],
    })

    const markerLog = (final.logs || []).find((log) =>
      log.message.startsWith("__WORKSPACE_TEST_RESULTS__:")
    )
    expect(markerLog).toBeTruthy()
    const results = JSON.parse(
      markerLog!.message.slice("__WORKSPACE_TEST_RESULTS__:".length)
    ) as Array<{ name: string; passed: boolean }>

    expect(results).toHaveLength(2)
    expect(results.every((r) => r.passed)).toBe(true)
    expect(results.some((r) => r.name === "never runs")).toBe(false)
  })

  it("does not emit transpile-start for a workspace with no .ts/.tsx files (plain-JS content unaffected)", async () => {
    const { phases, final } = await runWorkerMessage({
      files: [
        { path: "src/math.js", content: "exports.add = function(a, b) { return a + b }" },
        {
          path: "tests/visible/math.test.js",
          content:
            'const { describe, it, expect } = require("vitest"); const { add } = require("../../src/math"); describe("math", () => { it("adds", () => { expect(add(1, 2)).toBe(3) }) })',
        },
      ],
      testPaths: ["tests/visible/math.test.js"],
      hiddenTestPaths: [],
    })

    expect(phases).toEqual(["exec-start"])
    const markerLog = (final.logs || []).find((log) =>
      log.message.startsWith("__WORKSPACE_TEST_RESULTS__:")
    )
    const results = JSON.parse(
      markerLog!.message.slice("__WORKSPACE_TEST_RESULTS__:".length)
    ) as Array<{
      passed: boolean
    }>
    expect(results).toEqual([expect.objectContaining({ passed: true })])
  })

  it("still runs the pre-existing entrypoint-mode branch unchanged (regression guard)", async () => {
    const { final } = await runWorkerMessage({
      files: [
        { path: "src/index.js", content: "module.exports = function() { return 42 }" },
        {
          path: "tests/runner.js",
          content:
            'const run = require("../src/index"); console.log("__WORKSPACE_TEST_RESULTS__:" + JSON.stringify([{ suite: "workspace", name: "returns 42", passed: run() === 42, error: null }]))',
        },
      ],
      entrypoint: "tests/runner.js",
    })

    expect(final.success).toBe(true)
    const markerLog = (final.logs || []).find((log) =>
      log.message.startsWith("__WORKSPACE_TEST_RESULTS__:")
    )
    expect(markerLog).toBeTruthy()
    const results = JSON.parse(
      markerLog!.message.slice("__WORKSPACE_TEST_RESULTS__:".length)
    ) as Array<{
      passed: boolean
    }>
    expect(results[0].passed).toBe(true)
  })

  it("runs a plain-JS workspace even when the TypeScript loader and compiler cannot be fetched (blast radius shrinks to TS only)", async () => {
    const { phases, final } = await runWorkerMessage(
      {
        files: [
          { path: "src/math.js", content: "exports.add = function(a, b) { return a + b }" },
          {
            path: "tests/visible/math.test.js",
            content:
              'const { describe, it, expect } = require("vitest"); const { add } = require("../../src/math"); describe("math", () => { it("adds", () => { expect(add(1, 2)).toBe(3) }) })',
          },
        ],
        testPaths: ["tests/visible/math.test.js"],
        hiddenTestPaths: [],
      },
      {
        failImportScripts: ["/workers/ts-transpiler-loader.js", "/vendor/typescript/typescript.js"],
      }
    )

    // No .ts/.tsx file, so ensureTypeScriptCompiler() is never reached: the failing TypeScript
    // loader and compiler are irrelevant to a plain-JS run.
    expect(phases).toEqual(["exec-start"])
    expect(final.success).toBe(true)
    const markerLog = (final.logs || []).find((log) =>
      log.message.startsWith("__WORKSPACE_TEST_RESULTS__:")
    )
    const results = JSON.parse(
      markerLog!.message.slice("__WORKSPACE_TEST_RESULTS__:".length)
    ) as Array<{ passed: boolean }>
    expect(results).toEqual([expect.objectContaining({ passed: true })])
  })

  it("tags a failed TypeScript-support load as a retriable worker-start failure (not a raw throw)", async () => {
    const { final } = await runWorkerMessage(
      {
        files: FIVE_FILE_WORKSPACE,
        testPaths: FIVE_FILE_TEST_PATHS,
        hiddenTestPaths: FIVE_FILE_HIDDEN_TEST_PATHS,
      },
      { failImportScripts: ["/workers/ts-transpiler-loader.js"] }
    )

    expect(final.success).toBe(false)
    expect(final.workerStartFailed).toBe(true)
    expect(final.error).toMatch(/TypeScript support/i)
  })

  it("keeps single-file JS working when a shim fails to load, but tags a shim-dependent run as retriable", async () => {
    const singleFile = await runWorkerMessage(
      { code: "return 1 + 1" },
      { failImportScripts: ["/workers/assert-shim.js"] }
    )
    // Single-file mode needs neither shim, so a failed shim load does not affect it.
    expect(singleFile.final.success).toBe(true)

    const workspace = await runWorkerMessage(
      {
        files: [
          { path: "src/index.js", content: "module.exports = function() { return 42 }" },
          {
            path: "tests/runner.js",
            content: 'const run = require("../src/index"); run()',
          },
        ],
        entrypoint: "tests/runner.js",
      },
      { failImportScripts: ["/workers/assert-shim.js"] }
    )
    // A workspace run needs the shims: the boot failure is reported as retriable, not thrown raw.
    expect(workspace.final.success).toBe(false)
    expect(workspace.final.workerStartFailed).toBe(true)
  })
})
