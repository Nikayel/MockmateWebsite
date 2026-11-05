import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { isHarnessError } from "@/lib/workspace-execution/harness-errors"
import { realWorldBugFixScenarios } from "@/lib/scenarios-realworld"
import { bugfixRateLimiterErrorHandlingScenario } from "../real-world/bugfix/bugfix-rate-limiter-error-handling"
import { loadSealedLegacyReferenceFiles } from "../sealed/legacy-registry.server"
import { createJavaScriptTestRunner } from "../workspace-test-runner"

/**
 * Runs every JavaScript workspace scenario the way the browser does, and fails if the
 * harness breaks.
 *
 * This is the test that was missing. `assert.deepEqual` was absent from the sandbox's assert
 * shim, so all seven tests in the onboarding scenario threw "assert.deepEqual is not a
 * function" before the candidate's code was reached. Nothing anywhere executed a scenario
 * end to end, so nothing noticed. The candidate did, and was told it was a Type Error in
 * their own code.
 *
 * The module loader below is copied from public/workers/js-sandbox-worker.js, and the assert
 * shim is read off disk rather than reimplemented, so what runs here is what ships.
 */

const SHIM_PATH = join(process.cwd(), "public/workers/assert-shim.js")

interface WorkspaceFile {
  path: string
  content: string
}

interface RecordedResult {
  suite: string
  name: string
  passed: boolean
  error: string | null
}

function loadAssertShim(): unknown {
  const source = readFileSync(SHIM_PATH, "utf8")
  const workerScope: { createAssertShim?: () => unknown } = {}
  new Function("self", "module", source)(workerScope, undefined)
  if (typeof workerScope.createAssertShim !== "function") {
    throw new Error("assert-shim.js did not attach createAssertShim")
  }
  return workerScope.createAssertShim()
}

/** The worker's CommonJS loader, reproduced so the scenario runs exactly as it ships. */
async function runWorkspaceScenario(
  files: WorkspaceFile[],
  entrypoint: string
): Promise<RecordedResult[] | null> {
  const modules: Record<string, string> = {}
  const cache: Record<string, { exports: unknown }> = {}
  const assertMock = loadAssertShim()

  for (const file of files) {
    modules[file.path.replace(/^\.\//, "")] = file.content
  }

  cache["node:assert/strict"] = { exports: assertMock }
  cache["node:assert"] = { exports: assertMock }
  cache["assert"] = { exports: assertMock }

  function resolvePath(currentDir: string, targetPath: string): string {
    let cleanTarget = targetPath
    if (!cleanTarget.endsWith(".js") && !cleanTarget.endsWith(".json")) cleanTarget += ".js"
    if (!cleanTarget.startsWith(".")) return cleanTarget
    const parts = (currentDir ? currentDir.split("/") : []).concat(cleanTarget.split("/"))
    const stack: string[] = []
    for (const part of parts) {
      if (part === "." || part === "") continue
      if (part === "..") stack.pop()
      else stack.push(part)
    }
    return stack.join("/")
  }

  function requireModule(path: string, currentDir = ""): unknown {
    if (path === "node:assert/strict" || path === "node:assert" || path === "assert") {
      return assertMock
    }
    const resolved = resolvePath(currentDir, path)
    if (cache[resolved]) return cache[resolved].exports
    const moduleCode = modules[resolved]
    if (moduleCode === undefined) {
      throw new Error(`Module not found: ${path} (resolved as: ${resolved})`)
    }
    // Named `loaded` rather than `module`: the worker calls it `module` and carries an eslint
    // disable for it, but there is no reason to reproduce that here.
    const loaded = { exports: {} }
    cache[resolved] = loaded
    const nextDir = resolved.includes("/") ? resolved.substring(0, resolved.lastIndexOf("/")) : ""
    const wrapper = new Function(
      "exports",
      "require",
      "module",
      "__filename",
      "__dirname",
      moduleCode
    )
    wrapper(
      loaded.exports,
      (target: string) => requireModule(target, nextDir),
      loaded,
      resolved,
      nextDir
    )
    return loaded.exports
  }

  // The runner reports its results by logging a prefixed line, exactly as it does in the
  // worker, so capturing them means intercepting console.log.
  /* eslint-disable no-console */
  const RESULTS_PREFIX = "__WORKSPACE_TEST_RESULTS__:"
  let captured: RecordedResult[] | null = null
  const originalLog = console.log
  console.log = (...args: unknown[]) => {
    const message = args
      .map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a)))
      .join(" ")
    if (message.startsWith(RESULTS_PREFIX)) {
      captured = JSON.parse(message.slice(RESULTS_PREFIX.length))
    }
  }

  try {
    requireModule(entrypoint.replace(/^\.\//, ""))
    // The runner reports from an async IIFE, so yield until its microtasks drain.
    await new Promise((resolve) => setTimeout(resolve, 50))
  } finally {
    console.log = originalLog
  }
  /* eslint-enable no-console */

  return captured
}

describe("shared JavaScript workspace runner", () => {
  it.each([
    ["missing module", [{ name: "visible", path: "./missing" }], undefined],
    ["empty suite", [{ name: "visible", path: "./suite" }], "module.exports = { runTests() {} }"],
    [
      "non-Error exception",
      [{ name: "visible", path: "./suite" }],
      "module.exports = { runTests() { throw null } }",
    ],
    ["no suites", [], undefined],
  ])("reports %s instead of an empty passing run", async (_name, suites, source) => {
    const results = await runWorkspaceScenario(
      [
        { path: "runner.js", content: createJavaScriptTestRunner(suites) },
        ...(source ? [{ path: "suite.js", content: source }] : []),
      ],
      "runner.js"
    )
    expect(results).toHaveLength(1)
    expect(results![0].passed).toBe(false)
    expect(results![0].error).toBeTruthy()
  })
})

describe("rate limiter exception-handling regression guards", () => {
  const scenario = bugfixRateLimiterErrorHandlingScenario

  async function runPatch(transform: (reference: string) => string) {
    const reference = (await loadSealedLegacyReferenceFiles(scenario.id))![0]
    const files = scenario.workspace!.files.map((file) => ({
      ...file,
      content: file.path === reference.path ? transform(reference.content) : file.content,
    }))
    return (await runWorkspaceScenario(files, scenario.workspace!.testRunnerPath!))!
  }

  it("runs every reference case through the actual browser assertion shim", async () => {
    const results = await runPatch((reference) => reference)
    expect(results).toHaveLength(12)
    expect(results.filter((result) => !result.passed)).toEqual([])
  })

  it("rejects denying every exception because it hides unexpected failures", async () => {
    const results = await runPatch((reference) =>
      reference.replace(
        "if (error instanceof StoreUnavailableError) return false\n    throw error",
        "return false"
      )
    )
    expect(
      results.find((result) => result.name === "an unexpected error remains visible to the caller")
        ?.passed
    ).toBe(false)
    expect(
      results.find((result) => result.name === "non-Error thrown values also propagate unchanged")
        ?.passed
    ).toBe(false)
  })

  it("rejects replaying a reservation after its acknowledgment is lost", async () => {
    const results = await runPatch((reference) =>
      reference.replace(
        "if (error instanceof StoreUnavailableError) return false",
        `if (error instanceof StoreUnavailableError) {
      try { store.add(key, now) } catch { return false }
      return false
    }`
      )
    )
    expect(
      results.find(
        (result) =>
          result.name === "a lost write acknowledgment neither retries nor rolls back usage"
      )?.passed
    ).toBe(false)
  })
})

describe("JavaScript workspace scenarios actually run", () => {
  // Python workspaces run under Pyodide, which this loader cannot stand in for. Stdout-oracle
  // packs have no testRunnerPath and are graded by byte-diffing stdout instead.
  const jsScenarios = realWorldBugFixScenarios.filter(
    (scenario) =>
      scenario.executionMode === "workspace" &&
      scenario.workspace?.language === "javascript" &&
      Boolean(scenario.workspace?.testRunnerPath)
  )

  it("found scenarios to run", () => {
    expect(jsScenarios.length).toBeGreaterThan(0)
  })

  jsScenarios.forEach((scenario) => {
    describe(scenario.id, () => {
      it("reports test results instead of dying in the harness", async () => {
        const results = await runWorkspaceScenario(
          scenario.workspace!.files.map((file) => ({ path: file.path, content: file.content })),
          scenario.workspace!.testRunnerPath!
        )

        expect(
          results,
          `${scenario.id} produced no test results at all. The runner threw before it could ` +
            `report, which reaches the candidate as a console full of errors they did not cause.`
        ).not.toBeNull()
        expect(results!.length).toBeGreaterThan(0)
      })

      it("fails no test for a reason that is our fault", async () => {
        const results = await runWorkspaceScenario(
          scenario.workspace!.files.map((file) => ({ path: file.path, content: file.content })),
          scenario.workspace!.testRunnerPath!
        )

        // The regression. Every test in this scenario used to fail with "assert.deepEqual is
        // not a function", and the candidate was told to check their own variable types.
        const harnessFailures = (results ?? []).filter((r) => !r.passed && isHarnessError(r.error))

        expect(
          harnessFailures.map((r) => `${r.name}: ${r.error}`),
          `${scenario.id} fails inside the test harness rather than in the candidate's code. ` +
            `Nothing they write can pass these.`
        ).toEqual([])
      })

      it("leaves the planted bug failing, so there is something to fix", async () => {
        // A bugfix scenario whose starter already passes everything has no exercise in it.
        // This also catches the opposite of the harness bug: a shim so permissive that
        // wrong answers compare equal, which is how [] and {} used to match.
        const results = await runWorkspaceScenario(
          scenario.workspace!.files.map((file) => ({ path: file.path, content: file.content })),
          scenario.workspace!.testRunnerPath!
        )
        const failed = (results ?? []).filter((r) => !r.passed)

        expect(
          failed.length,
          `${scenario.id} passes all ${results?.length} of its tests with the starter code ` +
            `unmodified, so the candidate has nothing to find.`
        ).toBeGreaterThan(0)
      })
    })
  })
})

describe.each(["bugfix-maze-navigation", "bugfix-http-client-library"])(
  "%s complete and incomplete repairs",
  (id) => {
    const scenario = realWorldBugFixScenarios.find((s) => s.id === id)!

    async function runReference(selectedPaths?: string[]) {
      const references = (await loadSealedLegacyReferenceFiles(id))!
      const replacements = new Map(
        references
          .filter((file) => !selectedPaths || selectedPaths.includes(file.path))
          .map((file) => [file.path, file.content])
      )
      const files = scenario.workspace!.files.map((file) => ({
        path: file.path,
        content: replacements.get(file.path) ?? file.content,
      }))
      return (await runWorkspaceScenario(files, scenario.workspace!.testRunnerPath!))!
    }

    it("passes all visible and hidden cases with the sealed reference", async () => {
      const results = await runReference()
      expect(results.length).toBeGreaterThan(5)
      expect(results.filter((result) => !result.passed)).toEqual([])
    })

    it.each(scenario.workspace!.editableFilePaths)("rejects repairing only %s", async (path) => {
      const results = await runReference([path])
      expect(results.some((result) => !result.passed)).toBe(true)
      expect(results.filter((result) => !result.passed && isHarnessError(result.error))).toEqual([])
    })
  }
)
