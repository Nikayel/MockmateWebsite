import { describe, expect, it } from "vitest"

import { createRequireGraph, resolveTsModulePath } from "../require-graph"

describe("resolveTsModulePath", () => {
  it("appends .js to an extensionless relative specifier", () => {
    expect(resolveTsModulePath("src", "./math")).toBe("src/math.js")
  })

  it("rewrites an explicit .ts extension to .js (the .ts -> .js resolution case)", () => {
    expect(resolveTsModulePath("src", "./math.ts")).toBe("src/math.js")
  })

  it("rewrites an explicit .tsx extension to .js", () => {
    expect(resolveTsModulePath("src", "./Widget.tsx")).toBe("src/Widget.js")
  })

  it("leaves an explicit .js specifier untouched", () => {
    expect(resolveTsModulePath("src", "./math.js")).toBe("src/math.js")
  })

  it("resolves parent-directory traversal", () => {
    expect(resolveTsModulePath("tests/visible", "../../src/math")).toBe("src/math.js")
  })

  // A bare specifier like "vitest" or "node:assert" is intercepted by createRequireGraph's
  // specialModules check BEFORE resolveTsModulePath is ever called (see requireModule below), so
  // this function's own behavior on that input is unreachable in practice — the real, reachable
  // behavior is covered by "resolves a special module ... without appending .js" below.
})

describe("createRequireGraph", () => {
  it("evaluates a module and returns its exports", () => {
    const requireModule = createRequireGraph({
      modules: { "math.js": "exports.add = function(a, b) { return a + b }" },
      specialModules: {},
    })
    const math = requireModule("math.js") as { add: (a: number, b: number) => number }
    expect(math.add(2, 3)).toBe(5)
  })

  it("resolves a cross-file require relative to the requiring module's directory", () => {
    const requireModule = createRequireGraph({
      modules: {
        "src/math.js": "exports.add = function(a, b) { return a + b }",
        "src/format.js":
          'const math = require("./math.js"); exports.shout = function(a, b) { return "TOTAL: " + math.add(a, b) }',
      },
      specialModules: {},
    })
    const format = requireModule("src/format.js") as { shout: (a: number, b: number) => string }
    expect(format.shout(2, 3)).toBe("TOTAL: 5")
  })

  it("returns the SAME exports object on a second require of the same path (singleton modules)", () => {
    const requireModule = createRequireGraph({
      modules: { "counter.js": "exports.value = 1" },
      specialModules: {},
    })
    const first = requireModule("counter.js") as { value: number }
    first.value = 42
    const second = requireModule("counter.js") as { value: number }
    expect(second.value).toBe(42)
  })

  it("resolves a special module (e.g. vitest) by bare specifier without appending .js", () => {
    const marker = { describe: () => undefined }
    const requireModule = createRequireGraph({
      modules: {},
      specialModules: { vitest: marker },
    })
    expect(requireModule("vitest")).toBe(marker)
  })

  it("throws a descriptive error for a module that does not exist", () => {
    const requireModule = createRequireGraph({ modules: {}, specialModules: {} })
    expect(() => requireModule("./nope")).toThrow(/Module not found/)
  })

  it("exposes __filename/__dirname to the module body, matching Node's module wrapper", () => {
    const requireModule = createRequireGraph({
      modules: { "src/info.js": "exports.here = __filename + '|' + __dirname" },
      specialModules: {},
    })
    const info = requireModule("src/info.js") as { here: string }
    expect(info.here).toBe("src/info.js|src")
  })

  describe("hiddenModulePaths (security)", () => {
    it("the driver can require a hidden path directly (asDriver: true)", () => {
      const requireModule = createRequireGraph({
        modules: { "tests/hidden/secret.js": "exports.ran = true" },
        specialModules: {},
        hiddenModulePaths: new Set(["tests/hidden/secret.js"]),
      })
      const secret = requireModule("tests/hidden/secret.js", "", true) as { ran: boolean }
      expect(secret.ran).toBe(true)
    })

    it("refuses a non-driver require of a hidden path with the standard module-not-found text", () => {
      const requireModule = createRequireGraph({
        modules: {
          "tests/hidden/secret.js": "exports.ran = true",
          "src/foo.js": 'exports.peek = function() { return require("../tests/hidden/secret") }',
        },
        specialModules: {},
        hiddenModulePaths: new Set(["tests/hidden/secret.js"]),
      })
      const foo = requireModule("src/foo.js") as { peek: () => unknown }
      expect(() => foo.peek()).toThrow(/Module not found/)
    })

    it("still refuses a hidden path even after the driver already loaded it (no cache-hit bypass)", () => {
      const requireModule = createRequireGraph({
        modules: {
          "tests/hidden/secret.js": "exports.ran = true",
          "src/foo.js": 'exports.peek = function() { return require("../tests/hidden/secret") }',
        },
        specialModules: {},
        hiddenModulePaths: new Set(["tests/hidden/secret.js"]),
      })
      // Driver loads it first, legitimately.
      requireModule("tests/hidden/secret.js", "", true)
      // A later non-driver require of the SAME (now-cached) path is still refused.
      const foo = requireModule("src/foo.js") as { peek: () => unknown }
      expect(() => foo.peek()).toThrow(/Module not found/)
    })

    it("does not restrict a non-hidden path", () => {
      const requireModule = createRequireGraph({
        modules: {
          "src/math.js": "exports.add = function(a, b) { return a + b }",
          "src/foo.js": 'exports.peek = function() { return require("./math").add(1, 2) }',
        },
        specialModules: {},
        hiddenModulePaths: new Set(["tests/hidden/secret.js"]),
      })
      const foo = requireModule("src/foo.js") as { peek: () => number }
      expect(foo.peek()).toBe(3)
    })
  })
})
