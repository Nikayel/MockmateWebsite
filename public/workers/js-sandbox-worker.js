// Web Worker for JavaScript Execution Sandbox

// The `assert` implementation the scenario suites run against. It lives in its own file so
// it can be unit tested, which is how it earned that file: the version that used to sit
// inline here was missing `deepEqual` entirely, and every scenario that called it reported
// a Type Error against the candidate's own code.
importScripts("/workers/assert-shim.js")

self.onmessage = async function (e) {
  const { code, files, entrypoint } = e.data

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

    if (files && entrypoint) {
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
