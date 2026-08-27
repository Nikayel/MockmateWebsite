// Web Worker for JavaScript Execution Sandbox

// The `assert` implementation the scenario suites run against. It lives in its own file so
// it can be unit tested, which is how it earned that file: the version that used to sit
// inline here was missing `deepEqual` entirely, and every scenario that called it reported
// a Type Error against the candidate's own code.
importScripts("/workers/assert-shim.js")
// describe/it/expect for TypeScript (and any other) workspace suites — see that file's header
// for the full API and its deliberate scope limits. Loaded unconditionally alongside assert-shim
// (it is small); the vendored TypeScript COMPILER below is the heavy, genuinely-lazy load.
importScripts("/workers/vitest-shim.js")
// The content-hash transpile cache. Also small; the compiler it wraps is loaded lazily by
// ensureTypeScriptCompiler(), only when a workspace actually contains a .ts/.tsx file.
importScripts("/workers/ts-transpiler-loader.js")

// Created ONCE per worker and reused for every run (see ts-transpiler-loader.js's header): a
// learner re-running the same workspace after editing one file re-transpiles only that file.
const tsTranspileCache = self.createTsTranspileCache()
let typeScriptCompilerLoaded = false

/** Lazily importScripts the ~9MB vendored TypeScript compiler build, once per worker lifetime. */
function ensureTypeScriptCompiler() {
  if (!typeScriptCompilerLoaded) {
    importScripts("/vendor/typescript/typescript.js")
    typeScriptCompilerLoaded = true
  }
  return self.ts
}

/**
 * Resolves a require() target the same way js-sandbox-worker.js's CommonJS mode does below, with
 * one addition: an explicit .ts/.tsx extension on the specifier is rewritten to .js (TS source
 * files are transpiled and re-keyed that way; ts.transpileModule does not rewrite the specifier
 * itself, so this resolver has to). Mirrored in
 * lib/workspace-execution/ts-workspace/require-graph.ts for the Node harness — keep both in sync
 * by hand; both are covered by tests against the same fixture.
 */
function resolveTsWorkspacePath(currentDir, targetPath) {
  let cleanTarget = targetPath
  if (/\.tsx?$/.test(cleanTarget)) {
    cleanTarget = cleanTarget.replace(/\.tsx?$/, ".js")
  } else if (!cleanTarget.endsWith(".js") && !cleanTarget.endsWith(".json")) {
    cleanTarget += ".js"
  }
  if (!cleanTarget.startsWith(".")) {
    return cleanTarget
  }
  const parts = (currentDir ? currentDir.split("/") : []).concat(cleanTarget.split("/"))
  const stack = []
  for (const part of parts) {
    if (part === "." || part === "") continue
    if (part === "..") {
      stack.pop()
    } else {
      stack.push(part)
    }
  }
  return stack.join("/")
}

/**
 * Runs a TypeScript (or plain JS) workspace's visible + hidden test suites: transpiles every
 * .ts/.tsx file (content-hash cached), then `require()`s each path in `testPaths` then
 * `hiddenTestPaths` in turn against a fresh require-graph and a fresh vitest-shim instance for
 * THIS run (the transpile cache is the only thing that persists across runs — shim state never
 * does). No hand-authored runner file: each test file registers its own describe/it calls, and
 * `vitestShim.finalize()` awaits every one of them before the marker is emitted.
 *
 * A test FILE that throws while loading is isolated to a single failing result row scoped to that
 * file, so one broken hidden test does not erase every other file's results (see
 * node-harness.ts's header, which documents the identical choice for the Node path).
 */
async function runTsWorkspaceMode(files, testPaths, hiddenTestPaths) {
  const needsTranspile = files.some((file) => /\.tsx?$/.test(file.path))
  if (needsTranspile) {
    self.postMessage({ type: "transpile-start", timestamp: Date.now() })
  }

  const modules = {}
  const transpileTimingsMs = {}
  for (const file of files) {
    const cleanFilePath = file.path.replace(/^\.\//, "")
    if (/\.tsx?$/.test(cleanFilePath)) {
      const compiler = ensureTypeScriptCompiler()
      const { code, ms } = tsTranspileCache.transpile(cleanFilePath, file.content, compiler)
      transpileTimingsMs[file.path] = ms
      modules[cleanFilePath.replace(/\.tsx?$/, ".js")] = code
    } else {
      modules[cleanFilePath] = file.content
    }
  }

  self.postMessage({ type: "exec-start", timestamp: Date.now() })

  const assertMock = self.createAssertShim()
  const normalizedHidden = hiddenTestPaths.map((path) => path.replace(/^\.\//, ""))
  const vitestShim = self.createVitestShim({ hiddenTestPaths: normalizedHidden })

  const moduleCache = {}
  function requireTsModule(path, currentDir) {
    if (path === "node:assert/strict" || path === "node:assert" || path === "assert") {
      return assertMock
    }
    if (path === "vitest") {
      return vitestShim
    }

    const resolved = resolveTsWorkspacePath(currentDir || "", path)
    if (moduleCache[resolved]) {
      return moduleCache[resolved].exports
    }

    const moduleCode = modules[resolved]
    if (moduleCode === undefined) {
      throw new Error(`Module not found: ${path} (resolved as: ${resolved})`)
    }

    // eslint-disable-next-line @next/next/no-assign-module-variable
    const module = { exports: {} }
    moduleCache[resolved] = module

    const nextDir = resolved.includes("/") ? resolved.substring(0, resolved.lastIndexOf("/")) : ""
    const wrapper = new Function(
      "exports",
      "require",
      "module",
      "__filename",
      "__dirname",
      moduleCode
    )
    const localRequire = (targetPath) => requireTsModule(targetPath, nextDir)
    wrapper(module.exports, localRequire, module, resolved, nextDir)
    return module.exports
  }

  const setupFailures = []
  const orderedTestPaths = testPaths
    .concat(hiddenTestPaths)
    .map((path) => path.replace(/^\.\//, ""))
  for (const testPath of orderedTestPaths) {
    vitestShim.setCurrentFile(testPath)
    try {
      requireTsModule(testPath.replace(/\.tsx?$/, ".js"))
    } catch (error) {
      setupFailures.push({
        suite: testPath,
        name: "Test file failed to load",
        passed: false,
        error: error && error.message ? error.message : String(error),
        isHidden: normalizedHidden.indexOf(testPath) !== -1,
      })
    }
  }
  vitestShim.setCurrentFile(null)

  const finalized = await vitestShim.finalize()
  const results =
    setupFailures.length > 0 || finalized.length > 0
      ? setupFailures.concat(finalized)
      : [
          {
            suite: "workspace",
            name: "Workspace test runner",
            passed: false,
            error: "Test runner did not report any test results.",
          },
        ]

  // The existing __WORKSPACE_TEST_RESULTS__: marker protocol every workspace runner (JS/Python/
  // SQL) reports through; the ALREADY-patched console.log below (see onmessage) captures this
  // into `logs` for the client to parse.
  // eslint-disable-next-line no-console
  console.log("__WORKSPACE_TEST_RESULTS__:" + JSON.stringify(results))

  // Riding the existing generic `result` field (see onmessage's final postMessage below): the
  // entrypoint-mode branch never reads it, so reusing it here to carry per-file transpile timing
  // back to the client (ts-workspace/worker-runner.ts) needs no new message-shape field.
  return { transpileTimingsMs: transpileTimingsMs }
}

self.onmessage = async function (e) {
  const { code, files, entrypoint, testPaths, hiddenTestPaths } = e.data

  // Track captured logs
  const logs = []

  let resolveResults
  const resultsPromise = new Promise((resolve) => {
    resolveResults = resolve
  })

  // Capture console functions inside the worker
  const originalLog = console.log
  const originalWarn = console.warn
  const originalError = console.error
  const originalInfo = console.info

  console.log = function (...args) {
    const message = args
      .map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a)))
      .join(" ")
    logs.push({
      type: "log",
      message: message,
      timestamp: Date.now(),
    })
    originalLog.apply(console, args)
    if (resolveResults && message.startsWith("__WORKSPACE_TEST_RESULTS__:")) {
      resolveResults()
    }
  }
  console.warn = function (...args) {
    logs.push({
      type: "warn",
      message: args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "),
      timestamp: Date.now(),
    })
    originalWarn.apply(console, args)
  }
  console.error = function (...args) {
    logs.push({
      type: "error",
      message: args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "),
      timestamp: Date.now(),
    })
    originalError.apply(console, args)
  }
  console.info = function (...args) {
    logs.push({
      type: "info",
      message: args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "),
      timestamp: Date.now(),
    })
    originalInfo.apply(console, args)
  }

  try {
    let result

    if (files && Array.isArray(testPaths) && Array.isArray(hiddenTestPaths)) {
      // TypeScript / vitest-style workspace mode (see runTsWorkspaceMode above). No entrypoint:
      // it auto-requires testPaths then hiddenTestPaths itself and reports through the SAME
      // console.log marker the branch below relies on, so the result-parsing code after this
      // try/catch needs no changes for either mode.
      result = await runTsWorkspaceMode(files, testPaths, hiddenTestPaths)
    } else if (files && entrypoint) {
      // Workspace CommonJS Mode
      const modules = {}
      const cache = {}

      const assertMock = self.createAssertShim()

      // Populate module code map
      for (const file of files) {
        const cleanPath = file.path.replace(/^\.\//, "")
        modules[cleanPath] = file.content
      }

      // Inject assert mock cache entries
      cache["node:assert/strict"] = { exports: assertMock }
      cache["node:assert"] = { exports: assertMock }
      cache["assert"] = { exports: assertMock }

      function resolvePath(currentDir, targetPath) {
        let cleanTarget = targetPath
        if (!cleanTarget.endsWith(".js") && !cleanTarget.endsWith(".json")) {
          cleanTarget += ".js"
        }
        if (!cleanTarget.startsWith(".")) {
          return cleanTarget // e.g. "assert"
        }
        const parts = (currentDir ? currentDir.split("/") : []).concat(cleanTarget.split("/"))
        const stack = []
        for (const part of parts) {
          if (part === "." || part === "") continue
          if (part === "..") {
            stack.pop()
          } else {
            stack.push(part)
          }
        }
        return stack.join("/")
      }

      function requireModule(path, currentDir = "") {
        if (path === "node:assert/strict" || path === "node:assert" || path === "assert") {
          return assertMock
        }

        const resolved = resolvePath(currentDir, path)
        if (cache[resolved]) {
          return cache[resolved].exports
        }

        const moduleCode = modules[resolved]
        if (moduleCode === undefined) {
          throw new Error(`Module not found: ${path} (resolved as: ${resolved})`)
        }

        // eslint-disable-next-line @next/next/no-assign-module-variable
        const module = { exports: {} }
        cache[resolved] = module

        const nextDir = resolved.includes("/")
          ? resolved.substring(0, resolved.lastIndexOf("/"))
          : ""
        const wrapper = new Function(
          "exports",
          "require",
          "module",
          "__filename",
          "__dirname",
          moduleCode
        )

        const localRequire = (targetPath) => requireModule(targetPath, nextDir)
        wrapper(module.exports, localRequire, module, resolved, nextDir)
        return module.exports
      }

      const resolvedEntry = entrypoint.replace(/^\.\//, "")
      result = requireModule(resolvedEntry)

      // Wait for the test runner to finish and log results
      // Set a fallback timeout of 4.5s so we don't hang forever if the runner crashes
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Test execution timed out")), 4500)
      )
      await Promise.race([resultsPromise, timeoutPromise])
    } else {
      // Single-file Mode
      const executionFn = new Function(code)
      result = executionFn()
    }

    // Restore original console methods
    console.log = originalLog
    console.warn = originalWarn
    console.error = originalError
    console.info = originalInfo

    self.postMessage({
      success: true,
      result: result,
      logs: logs,
    })
  } catch (error) {
    // Restore original console methods
    console.log = originalLog
    console.warn = originalWarn
    console.error = originalError
    console.info = originalInfo

    self.postMessage({
      success: false,
      error: error.message || String(error),
      stack: error.stack,
      logs: logs,
    })
  }
}
