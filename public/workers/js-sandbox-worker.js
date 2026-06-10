// Web Worker for JavaScript Execution Sandbox
self.onmessage = async function (e) {
  const { code, files, entrypoint } = e.data

  // Track captured logs
  const logs = []

  // Capture console functions inside the worker
  const originalLog = console.log
  const originalWarn = console.warn
  const originalError = console.error
  const originalInfo = console.info

  console.log = function (...args) {
    logs.push({
      type: "log",
      message: args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "),
      timestamp: Date.now(),
    })
    originalLog.apply(console, args)
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

      const deepEquals = (a, b) => {
        if (a === b) return true
        if (typeof a !== typeof b) return false
        if (a === null || b === null) return a === b
        if (typeof a === "object") {
          const keysA = Object.keys(a).sort()
          const keysB = Object.keys(b).sort()
          if (keysA.length !== keysB.length) return false
          if (keysA.join(",") !== keysB.join(",")) return false
          return keysA.every((key) => deepEquals(a[key], b[key]))
        }
        return false
      }

      const assertMock = {
        ok: (val, msg) => {
          if (!val) throw new Error(msg || `Expected truthy, got ${val}`)
        },
        equal: (a, b, msg) => {
          if (a != b) throw new Error(msg || `Expected ${a} == ${b}`)
        },
        notEqual: (a, b, msg) => {
          if (a == b) throw new Error(msg || `Expected ${a} != ${b}`)
        },
        strictEqual: (a, b, msg) => {
          if (a !== b) throw new Error(msg || `Expected ${a} === ${b}`)
        },
        notStrictEqual: (a, b, msg) => {
          if (a === b) throw new Error(msg || `Expected ${a} !== ${b}`)
        },
        deepStrictEqual: (a, b, msg) => {
          if (!deepEquals(a, b)) {
            throw new Error(
              msg || `Expected deep equality, got ${JSON.stringify(a)} vs ${JSON.stringify(b)}`
            )
          }
        },
        throws: (fn, reg) => {
          try {
            fn()
          } catch (e) {
            if (reg && reg instanceof RegExp && !reg.test(e.message)) {
              throw new Error(`Expected error matching ${reg}, got: ${e.message}`)
            }
            return
          }
          throw new Error("Expected function to throw an error")
        },
        rejects: async (fn) => {
          try {
            await fn()
          } catch {
            return
          }
          throw new Error("Expected promise to reject")
        },
      }

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
