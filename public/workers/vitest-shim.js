/**
 * A `describe`/`it`/`expect` shim for TypeScript workspace suites, modeled on Vitest's public API.
 *
 * ONE file, two runtimes: loaded with `importScripts` inside the JS sandbox worker (alongside
 * assert-shim.js, see js-sandbox-worker.js), and `require()`d directly by
 * lib/workspace-execution/ts-workspace/node-harness.ts so `lab validate`'s CI replay runs the
 * SAME shim semantics a learner's browser run does. A ticket that passes in the worker must
 * behave identically when replayed in Node.
 *
 * A test file reaches this the way it would reach real Vitest: `require("vitest")` (which
 * `ts.transpileModule` turns `import { describe, it, expect } from "vitest"` into) resolves to
 * this shim in both the worker's require-graph and the Node harness's. Inside a Worker, `describe`
 * /`it`/`test`/`expect` are ALSO exposed as bare globals on `self` for parity with this repo's own
 * `vitest.config.ts` (`globals: true`) authoring style — Node deliberately does NOT do this (see
 * below).
 *
 * Design notes and DELIBERATE scope limits:
 *  - `describe` bodies run synchronously (as real Vitest requires); `it`/`test` bodies may be
 *    sync or async. Each `it()` call captures its enclosing suite label and "current file" AT
 *    REGISTRATION time (not when the async body finishes) — otherwise a slow test in file A could
 *    be mis-attributed to whatever file the require-graph had moved on to by the time A's promise
 *    settled.
 *  - `isHidden` is true when the joined suite label contains the substring "hidden"
 *    (case-insensitive — the existing convention, see lib/scenarios/real-world/bugfix/*.ts) OR
 *    the current file is listed in the `hiddenTestPaths` the harness was created with. Either is
 *    sufficient; content authors do not have to embed "hidden" in every describe label.
 *  - `it.skip(name, fn)` records NOTHING (not even a passing row) and never calls `fn`. There is
 *    no `describe.skip`.
 *  - `toEqual`/`toStrictEqual` implement Vitest's actual semantics, not Node's `assert.deepEqual`
 *    (which coerces primitives): `toEqual` never coerces types, ignores object properties whose
 *    value is `undefined`, and does not check prototypes; `toStrictEqual` additionally checks
 *    prototypes and does NOT ignore `undefined`-valued properties.
 *  - `.resolves`/`.rejects` are implemented only for `toBe`, `toEqual`, `toThrow` (per spec), not
 *    for every matcher. `.resolves.toThrow(fn)` treats the FULFILLED value as the callable to
 *    invoke-and-expect-to-throw; `.rejects.toThrow(matcher)` matches the REJECTION REASON against
 *    the matcher directly (the common case). `.not` is not composable with `.resolves`/`.rejects`.
 *  - Calling `finalize()` awaits every registered `it()` (they never reject — a failing test is
 *    recorded, not thrown) and returns the accumulated `{suite, name, passed, error, isHidden}[]`
 *    rows. The caller (the worker branch, or node-harness.ts) is responsible for emitting the
 *    `__WORKSPACE_TEST_RESULTS__:` marker with that array.
 *  - No test isolation between files: this is one flat shim instance per RUN (a fresh instance is
 *    created per onmessage / per runTsWorkspace call), so state never leaks across separate runs,
 *    but nothing resets state BETWEEN test files within the same run (matching how the existing
 *    hand-rolled JS/Python workspace runners already behave).
 */
;(function (globalScope) {
  "use strict"

  /** Render a value for an assertion message without throwing on cycles or BigInt. */
  function describeValue(value) {
    if (value === undefined) return "undefined"
    if (typeof value === "bigint") return String(value) + "n"
    if (typeof value === "function") {
      return value.name ? "[Function: " + value.name + "]" : "[Function]"
    }
    if (typeof value === "symbol") return String(value)
    try {
      const json = JSON.stringify(value)
      return json === undefined ? String(value) : json
    } catch {
      return String(value)
    }
  }

  /** NaN is equal to itself here, matching real Vitest/Jest's `Object.is`-flavored comparisons. */
  function sameValueZero(a, b) {
    return a === b || (a !== a && b !== b)
  }

  /**
   * Structural equality. `checkPrototype` gates `toStrictEqual`'s extra prototype check;
   * `ignoreUndefinedProps` gates `toEqual`'s "an explicit undefined is the same as a missing key"
   * leniency. Deliberately never coerces primitives (unlike Node's assert.deepEqual) — `1` and
   * `"1"` are never equal here, matching real Vitest.
   */
  function deepEqual(a, b, options) {
    const checkPrototype = !!(options && options.checkPrototype)
    const ignoreUndefinedProps = !options || options.ignoreUndefinedProps !== false
    const seen = []

    function isEqual(x, y) {
      if (sameValueZero(x, y)) return true

      const xIsObject = typeof x === "object" && x !== null
      const yIsObject = typeof y === "object" && y !== null
      if (!xIsObject || !yIsObject) return false

      if (Array.isArray(x) !== Array.isArray(y)) return false
      if (Array.isArray(x)) {
        if (x.length !== y.length) return false
        for (let i = 0; i < x.length; i += 1) {
          if (!isEqual(x[i], y[i])) return false
        }
        return true
      }

      if (x instanceof Date || y instanceof Date) {
        return x instanceof Date && y instanceof Date && sameValueZero(x.getTime(), y.getTime())
      }

      if (x instanceof RegExp || y instanceof RegExp) {
        return (
          x instanceof RegExp && y instanceof RegExp && x.source === y.source && x.flags === y.flags
        )
      }

      if (x instanceof Map || y instanceof Map) {
        if (!(x instanceof Map) || !(y instanceof Map) || x.size !== y.size) return false
        for (const [key, value] of x) {
          if (!y.has(key) || !isEqual(value, y.get(key))) return false
        }
        return true
      }

      if (x instanceof Set || y instanceof Set) {
        if (!(x instanceof Set) || !(y instanceof Set) || x.size !== y.size) return false
        for (const value of x) {
          if (!y.has(value)) return false
        }
        return true
      }

      if (checkPrototype && Object.getPrototypeOf(x) !== Object.getPrototypeOf(y)) return false

      for (let i = 0; i < seen.length; i += 1) {
        if (seen[i][0] === x && seen[i][1] === y) return true
      }
      seen.push([x, y])

      let keysX = Object.keys(x)
      let keysY = Object.keys(y)
      if (ignoreUndefinedProps) {
        keysX = keysX.filter((key) => x[key] !== undefined)
        keysY = keysY.filter((key) => y[key] !== undefined)
      }
      if (keysX.length !== keysY.length) return false
      for (const key of keysX) {
        if (!Object.prototype.hasOwnProperty.call(y, key)) return false
        if (!isEqual(x[key], y[key])) return false
      }
      return true
    }

    return isEqual(a, b)
  }

  /** `toMatchObject`: `expected` describes a partial subset `actual` must contain. */
  function matchesObjectShape(actual, expected) {
    if (expected === null || typeof expected !== "object") {
      return sameValueZero(actual, expected)
    }
    if (expected instanceof Date) {
      return actual instanceof Date && sameValueZero(actual.getTime(), expected.getTime())
    }
    if (expected instanceof RegExp) {
      return (
        actual instanceof RegExp &&
        actual.source === expected.source &&
        actual.flags === expected.flags
      )
    }
    if (Array.isArray(expected)) {
      if (!Array.isArray(actual) || actual.length !== expected.length) return false
      return expected.every((item, index) => matchesObjectShape(actual[index], item))
    }
    if (actual === null || typeof actual !== "object") return false
    return Object.keys(expected).every(
      (key) =>
        Object.prototype.hasOwnProperty.call(actual, key) &&
        matchesObjectShape(actual[key], expected[key])
    )
  }

  /** `toContain`: substring for strings, SameValueZero membership for anything iterable. */
  function containsValue(actual, expected) {
    if (typeof actual === "string") return actual.includes(expected)
    if (actual && typeof actual[Symbol.iterator] === "function") {
      for (const item of actual) {
        if (sameValueZero(item, expected)) return true
      }
      return false
    }
    throw new Error(
      "toContain expects a string or an iterable (array, Set, ...), got " + describeValue(actual)
    )
  }

  /** Does the thrown/rejected value satisfy the matcher passed to toThrow? */
  function matchesThrownValue(caught, expected) {
    if (expected === undefined) return { pass: true }
    const message = caught && caught.message ? caught.message : String(caught)
    if (typeof expected === "string") {
      return {
        pass: message.includes(expected),
        message: 'error message to include "' + expected + '", got "' + message + '"',
      }
    }
    if (expected instanceof RegExp) {
      return {
        pass: expected.test(message),
        message: "error message to match " + String(expected) + ', got "' + message + '"',
      }
    }
    if (typeof expected === "function") {
      let isInstance = false
      try {
        isInstance = caught instanceof expected
      } catch {
        // `expected` was not a constructor; treat it as a non-match rather than crashing.
      }
      return {
        pass: isInstance,
        message: "error to be instance of " + (expected.name || "the given constructor"),
      }
    }
    return { pass: true }
  }

  /** `toThrow`: `fn` must be callable; calls it and matches whatever it throws. */
  function checkThrows(fn, expected) {
    if (typeof fn !== "function") {
      throw new Error("toThrow must be called on a function, got " + describeValue(fn))
    }
    let threw = false
    let caught
    try {
      fn()
    } catch (error) {
      threw = true
      caught = error
    }
    if (!threw) return { pass: false, message: "function to throw" }
    return matchesThrownValue(caught, expected)
  }

  function makeMatchers(actual, negate) {
    function finish(pass, message) {
      const finalPass = negate ? !pass : pass
      if (!finalPass) {
        throw new Error((negate ? "expected NOT " : "expected ") + message)
      }
    }

    return {
      toBe(expected) {
        finish(
          sameValueZero(actual, expected),
          describeValue(actual) + " to be " + describeValue(expected)
        )
      },
      toEqual(expected) {
        finish(
          deepEqual(actual, expected, { ignoreUndefinedProps: true }),
          describeValue(actual) + " to equal " + describeValue(expected)
        )
      },
      toStrictEqual(expected) {
        finish(
          deepEqual(actual, expected, { checkPrototype: true, ignoreUndefinedProps: false }),
          describeValue(actual) + " to strictly equal " + describeValue(expected)
        )
      },
      toBeTruthy() {
        finish(Boolean(actual), describeValue(actual) + " to be truthy")
      },
      toBeFalsy() {
        finish(!actual, describeValue(actual) + " to be falsy")
      },
      toBeNull() {
        finish(actual === null, describeValue(actual) + " to be null")
      },
      toBeUndefined() {
        finish(actual === undefined, describeValue(actual) + " to be undefined")
      },
      toBeDefined() {
        finish(actual !== undefined, describeValue(actual) + " to be defined")
      },
      toContain(expected) {
        finish(
          containsValue(actual, expected),
          describeValue(actual) + " to contain " + describeValue(expected)
        )
      },
      toHaveLength(length) {
        const actualLength = actual && actual.length
        finish(
          actualLength === length,
          describeValue(actual) +
            " to have length " +
            length +
            " (got " +
            describeValue(actualLength) +
            ")"
        )
      },
      toMatchObject(expected) {
        finish(
          matchesObjectShape(actual, expected),
          describeValue(actual) + " to match object " + describeValue(expected)
        )
      },
      toBeGreaterThan(expected) {
        finish(
          actual > expected,
          describeValue(actual) + " to be greater than " + describeValue(expected)
        )
      },
      toBeGreaterThanOrEqual(expected) {
        finish(
          actual >= expected,
          describeValue(actual) + " to be greater than or equal to " + describeValue(expected)
        )
      },
      toBeLessThan(expected) {
        finish(
          actual < expected,
          describeValue(actual) + " to be less than " + describeValue(expected)
        )
      },
      toBeLessThanOrEqual(expected) {
        finish(
          actual <= expected,
          describeValue(actual) + " to be less than or equal to " + describeValue(expected)
        )
      },
      toThrow(expected) {
        const result = checkThrows(actual, expected)
        finish(result.pass, result.message || "function to throw")
      },
    }
  }

  /** Awaits `promiseLike`, enforcing that it settled the way `mode` expects. Returns the value
   *  (the fulfillment value for "resolves", the rejection reason for "rejects"). */
  async function settle(promiseLike, mode) {
    let ok
    let value
    try {
      value = await promiseLike
      ok = true
    } catch (error) {
      value = error
      ok = false
    }
    if (mode === "resolves" && !ok) {
      const reason = value && value.message ? value.message : describeValue(value)
      throw new Error("expected promise to resolve, but it rejected with: " + reason)
    }
    if (mode === "rejects" && ok) {
      throw new Error("expected promise to reject, but it resolved with: " + describeValue(value))
    }
    return value
  }

  function makeAsyncMatchers(promiseLike, mode) {
    return {
      async toBe(expected) {
        const value = await settle(promiseLike, mode)
        makeMatchers(value, false).toBe(expected)
      },
      async toEqual(expected) {
        const value = await settle(promiseLike, mode)
        makeMatchers(value, false).toEqual(expected)
      },
      async toThrow(expected) {
        const value = await settle(promiseLike, mode)
        if (mode === "rejects") {
          const result = matchesThrownValue(value, expected)
          if (!result.pass) throw new Error("expected " + result.message)
        } else {
          const result = checkThrows(value, expected)
          if (!result.pass) throw new Error("expected " + result.message)
        }
      },
    }
  }

  function createExpect() {
    return function expect(actual) {
      const matchers = makeMatchers(actual, false)
      matchers.not = makeMatchers(actual, true)
      matchers.resolves = makeAsyncMatchers(actual, "resolves")
      matchers.rejects = makeAsyncMatchers(actual, "rejects")
      return matchers
    }
  }

  /**
   * One shim instance per run. `hiddenTestPaths` is the workspace's declared hidden-test file
   * list; `setCurrentFile` is called by the require-graph driver right before requiring each test
   * file so isHidden can fall back to path membership when a suite's own label does not say
   * "hidden".
   */
  function createVitestShim(options) {
    const hiddenPaths = new Set((options && options.hiddenTestPaths) || [])
    const results = []
    const pending = []
    const suiteStack = []
    let currentFile = null

    function isHiddenContext(suiteLabel, file) {
      if (suiteLabel.toLowerCase().includes("hidden")) return true
      return !!(file && hiddenPaths.has(file))
    }

    function recordResult(suite, file, name, passed, error) {
      results.push({
        suite,
        name,
        passed,
        error: error ? error.message || String(error) : null,
        isHidden: isHiddenContext(suite, file),
      })
    }

    function describe(name, fn) {
      if (typeof fn !== "function") {
        throw new Error("describe requires a function body")
      }
      suiteStack.push(String(name))
      try {
        fn()
      } finally {
        suiteStack.pop()
      }
    }

    function itImpl(name, fn) {
      // Captured NOW, not when the (possibly async) body finishes — see the module header.
      const suite = suiteStack.join(" > ")
      const file = currentFile
      const run = (async () => {
        try {
          if (typeof fn !== "function") {
            throw new Error("test body is not a function")
          }
          await fn()
          recordResult(suite, file, name, true, null)
        } catch (error) {
          recordResult(suite, file, name, false, error)
        }
      })()
      pending.push(run)
    }

    function it(name, fn) {
      itImpl(name, fn)
    }
    // A skipped test contributes NO row at all (not even a passing one) and its body never runs.
    it.skip = function itSkip() {}

    const test = it

    function setCurrentFile(path) {
      currentFile = path || null
    }

    async function finalize() {
      await Promise.all(pending)
      return results.slice()
    }

    const api = {
      describe,
      it,
      test,
      expect: createExpect(),
      setCurrentFile,
      finalize,
    }

    // Convenience globals inside a Worker only (see module header for why Node deliberately does
    // NOT get this treatment): so a test file written in the "globals: true" style (no
    // `import ... from "vitest"`) still works, matching this repo's own vitest.config.ts. `self`
    // is not a Node global, so this branch is naturally unreachable from node-harness.ts's real
    // `require()` — it only fires when THIS file itself is the one calling createVitestShim from
    // inside an actual Worker.
    if (
      typeof self !== "undefined" &&
      typeof window === "undefined" &&
      typeof module === "undefined"
    ) {
      self.describe = describe
      self.it = it
      self.test = test
      self.expect = api.expect
    }

    return api
  }

  globalScope.createVitestShim = createVitestShim

  // Reachable from Node/vitest, where the file is required directly rather than importScripts'd.
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { createVitestShim: createVitestShim }
  }
})(typeof self !== "undefined" ? self : globalThis)
