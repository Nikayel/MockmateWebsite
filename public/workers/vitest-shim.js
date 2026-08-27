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
 *    sync or async, but they run ONE AT A TIME, in REGISTRATION order (never concurrently) — a
 *    shared-mutable-state test that would race under naive concurrent execution behaves the same
 *    way here as it does in real Vitest's default (non-`.concurrent`) mode. Each `it()` call
 *    captures its enclosing suite label, "current file", and its lifecycle-hook chain AT
 *    REGISTRATION time (not when it actually runs) — otherwise a slow test in file A could be
 *    mis-attributed to whatever file/hooks the require-graph had moved on to by the time it ran.
 *  - `isHidden` is true when the joined suite label contains the substring "hidden"
 *    (case-insensitive — the existing convention, see lib/scenarios/real-world/bugfix/*.ts) OR
 *    the current file is listed in the `hiddenTestPaths` the harness was created with. Either is
 *    sufficient; content authors do not have to embed "hidden" in every describe label.
 *  - `it.skip(name, fn)` records NOTHING (not even a passing row) and never calls `fn`.
 *    `describe.skip(name, fn)` never calls `fn` AT ALL — nothing inside (it/describe/hooks)
 *    registers, matching a whole subtree being skipped.
 *  - `beforeAll`/`afterAll`/`beforeEach`/`afterEach` are scoped to the describe they are called
 *    in (or the whole run, for top-level calls outside any describe) and run in the standard
 *    Jest/Vitest order: `beforeAll` outer-to-inner (once per describe, before its first test),
 *    `beforeEach` outer-to-inner (every test), `afterEach` inner-to-outer (every test, even after
 *    a failing test or a failing `beforeEach`), `afterAll` inner-to-outer (once per describe,
 *    after its LAST test — including nested describes' tests). A throwing `beforeAll`/`beforeEach`
 *    fails ONLY the test whose run triggered it (the test body is skipped) — it does not also fail
 *    every subsequent test in that scope. A throwing `afterEach`/`afterAll` is logged via
 *    `console.error` and does not overwrite whatever result was already recorded (documented scope
 *    limit: not itself a separate failing row).
 *  - Any access to a genuinely unsupported vitest export or sub-property (`vi`, `it.each`,
 *    `describe.each`, `expect.any`, ...) throws immediately, NAMING the API
 *    (`vitest-shim: it.each is not supported`), rather than failing later with an opaque
 *    "X is not a function" once test code tries to call it.
 *  - `toEqual`/`toStrictEqual` implement Vitest's actual semantics, not Node's `assert.deepEqual`
 *    (which coerces primitives): `toEqual` never coerces types, ignores object properties whose
 *    value is `undefined`, and does not check prototypes; `toStrictEqual` additionally checks
 *    prototypes and does NOT ignore `undefined`-valued properties.
 *  - `.resolves`/`.rejects` are implemented only for `toBe`, `toEqual`, `toThrow` (per spec), not
 *    for every matcher. `.resolves.toThrow(fn)` treats the FULFILLED value as the callable to
 *    invoke-and-expect-to-throw; `.rejects.toThrow(matcher)` matches the REJECTION REASON against
 *    the matcher directly (the common case). `.not` is not composable with `.resolves`/`.rejects`.
 *  - Calling `finalize()` runs every registered `it()` in order (they never reject — a failing
 *    test is recorded, not thrown) and returns the accumulated
 *    `{suite, name, passed, error, isHidden}[]` rows. The caller (the worker branch, or
 *    node-harness.ts) is responsible for emitting the `__WORKSPACE_TEST_RESULTS__:` marker with
 *    that array.
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

      // Checked BEFORE any branch that recurses (array elements, Map/Set contents, object keys),
      // not just before the generic object-key comparison: a self-referential array or Map/Set
      // recurses into its own contents just as much as a plain object does, so gating only the
      // object-key path left those two container kinds free to recurse forever on a cycle.
      for (let i = 0; i < seen.length; i += 1) {
        if (seen[i][0] === x && seen[i][1] === y) return true
      }
      seen.push([x, y])

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
        // `actual && actual.length` short-circuits to `""` for an empty string (falsy) instead
        // of evaluating `.length`, so `expect("").toHaveLength(0)` incorrectly failed. Only
        // null/undefined should short-circuit (to avoid throwing on `.length`); anything else
        // reads its real `.length`, whether that's falsy (0, "") or not.
        const actualLength = actual == null ? undefined : actual.length
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

  /** One node per describe (plus one implicit root for top-level/no-describe calls). */
  function createSuiteNode(name, parent) {
    return {
      name,
      parent,
      beforeAllHooks: [],
      afterAllHooks: [],
      beforeEachHooks: [],
      afterEachHooks: [],
      beforeAllHasRun: false,
      afterAllHasRun: false,
      // Index (into `pending`) of the LAST test registered anywhere in this node's subtree.
      // Computed purely from registration order — see itImpl — so `finalize()` can tell, after
      // running a given test, whether that was the last test in each of its ancestor scopes
      // (and therefore when to fire that scope's afterAll) without a second pass.
      lastTestIndex: -1,
    }
  }

  /**
   * Wraps `target` (a function or object) so that accessing any property NOT in `allowedProps`
   * throws immediately, NAMING the property (`vitest-shim: <label>.<prop> is not supported`),
   * instead of returning `undefined` and letting test code fail later with an opaque
   * "X is not a function". Symbols pass through untouched (runtime introspection, e.g. by an
   * async/await or console formatter, must not trip this). Falls back to the raw target if
   * `Proxy` is unavailable (defensive; every runtime this shim ships to has it).
   */
  function guardUnsupported(target, allowedProps, label) {
    if (typeof Proxy === "undefined") return target
    return new Proxy(target, {
      get(obj, prop) {
        if (typeof prop === "symbol") return obj[prop]
        if (allowedProps.has(prop)) return obj[prop]
        throw new Error("vitest-shim: " + label + "." + String(prop) + " is not supported")
      },
    })
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
    // Data records, NOT started promises: itImpl must not begin running a test until finalize()
    // reaches it in order (see the module header on sequential execution).
    const pending = []
    const suiteStack = []
    const rootNode = createSuiteNode("<root>", null)
    const hookStack = [rootNode]
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

    function wrapHookError(kind, error) {
      const message = error && error.message ? error.message : String(error)
      return new Error("[" + kind + "] " + message)
    }

    function describe(name, fn) {
      if (typeof fn !== "function") {
        throw new Error("describe requires a function body")
      }
      const node = createSuiteNode(String(name), hookStack[hookStack.length - 1])
      suiteStack.push(String(name))
      hookStack.push(node)
      try {
        fn()
      } finally {
        hookStack.pop()
        suiteStack.pop()
      }
    }
    // The entire subtree is skipped: `fn` is never called, so nothing inside it — no it(), no
    // nested describe(), no beforeEach/afterEach/beforeAll/afterAll — is ever registered.
    describe.skip = function describeSkip() {}

    function beforeAll(fn) {
      hookStack[hookStack.length - 1].beforeAllHooks.push(fn)
    }
    function afterAll(fn) {
      hookStack[hookStack.length - 1].afterAllHooks.push(fn)
    }
    function beforeEach(fn) {
      hookStack[hookStack.length - 1].beforeEachHooks.push(fn)
    }
    function afterEach(fn) {
      hookStack[hookStack.length - 1].afterEachHooks.push(fn)
    }

    function itImpl(name, fn) {
      // Captured NOW, not when the (possibly async) body finishes — see the module header.
      const suite = suiteStack.join(" > ")
      const file = currentFile
      const chain = hookStack.slice() // root -> ... -> immediate parent
      const testIndex = pending.length
      for (let i = 0; i < chain.length; i += 1) {
        chain[i].lastTestIndex = testIndex
      }
      pending.push({ suite, file, name, fn, chain })
    }

    function it(name, fn) {
      itImpl(name, fn)
    }
    // A skipped test contributes NO row at all (not even a passing one) and its body never runs.
    it.skip = function itSkip() {}
    // `test` is a real Vitest alias for `it`; rawApi.test below reuses the SAME guarded object
    // `it` gets, not a second one, so `shim.test === shim.it` holds by reference.

    function setCurrentFile(path) {
      currentFile = path || null
    }

    /** Runs one pending test's full lifecycle: beforeAll (once) -> beforeEach -> body ->
     *  afterEach -> afterAll (once, if this was the last test in that scope). */
    async function runOneTest(entry, index) {
      const { suite, file, name, fn, chain } = entry
      let setupError = null

      for (let i = 0; i < chain.length && !setupError; i += 1) {
        const node = chain[i]
        if (node.beforeAllHasRun) continue
        node.beforeAllHasRun = true
        for (let h = 0; h < node.beforeAllHooks.length; h += 1) {
          try {
            await node.beforeAllHooks[h]()
          } catch (error) {
            setupError = wrapHookError("beforeAll", error)
            break
          }
        }
      }

      for (let i = 0; i < chain.length && !setupError; i += 1) {
        const node = chain[i]
        for (let h = 0; h < node.beforeEachHooks.length; h += 1) {
          try {
            await node.beforeEachHooks[h]()
          } catch (error) {
            setupError = wrapHookError("beforeEach", error)
            break
          }
        }
      }

      if (setupError) {
        recordResult(suite, file, name, false, setupError)
      } else {
        try {
          if (typeof fn !== "function") {
            throw new Error("test body is not a function")
          }
          await fn()
          recordResult(suite, file, name, true, null)
        } catch (error) {
          recordResult(suite, file, name, false, error)
        }
      }

      // afterEach ALWAYS runs — even after a setup failure or a failing test — inner to outer.
      for (let i = chain.length - 1; i >= 0; i -= 1) {
        const hooks = chain[i].afterEachHooks
        for (let h = 0; h < hooks.length; h += 1) {
          try {
            await hooks[h]()
          } catch (error) {
            // Does not overwrite the test's own recorded result (documented scope limit) — at
            // least visible in captured output instead of silently vanishing.
            console.error(
              "[vitest-shim] afterEach hook threw: " +
                (error && error.message ? error.message : String(error))
            )
          }
        }
      }

      // afterAll fires, inner to outer, for any node whose LAST test anywhere in its subtree was
      // this one — computed once at registration time in itImpl, so this needs no second pass.
      for (let i = chain.length - 1; i >= 0; i -= 1) {
        const node = chain[i]
        if (node.lastTestIndex !== index || node.afterAllHasRun) continue
        node.afterAllHasRun = true
        for (let h = 0; h < node.afterAllHooks.length; h += 1) {
          try {
            await node.afterAllHooks[h]()
          } catch (error) {
            console.error(
              "[vitest-shim] afterAll hook threw: " +
                (error && error.message ? error.message : String(error))
            )
          }
        }
      }
    }

    async function finalize() {
      for (let index = 0; index < pending.length; index += 1) {
        await runOneTest(pending[index], index)
      }
      return results.slice()
    }

    const guardedDescribe = guardUnsupported(describe, new Set(["skip"]), "describe")
    const guardedIt = guardUnsupported(it, new Set(["skip"]), "it")
    const guardedExpect = guardUnsupported(createExpect(), new Set(), "expect")

    const rawApi = {
      describe: guardedDescribe,
      it: guardedIt,
      test: guardedIt,
      expect: guardedExpect,
      beforeAll,
      afterAll,
      beforeEach,
      afterEach,
      setCurrentFile,
      finalize,
    }
    const api = guardUnsupported(
      rawApi,
      new Set([
        "describe",
        "it",
        "test",
        "expect",
        "beforeAll",
        "afterAll",
        "beforeEach",
        "afterEach",
        "setCurrentFile",
        "finalize",
      ]),
      "vitest"
    )

    // Convenience globals inside a Worker only (see module header for why Node deliberately does
    // NOT get this treatment): so a test file written in the "globals: true" style (no
    // `import ... from "vitest"`) still works, matching this repo's own vitest.config.ts. `self`
    // is not a Node global, so this branch is naturally unreachable from node-harness.ts's real
    // `require()` — it only fires when THIS file itself is the one calling createVitestShim from
    // inside an actual Worker. Assigns the SAME guarded objects `api` exposes, so a bare `it.each`
    // global reference is guarded exactly like `require("vitest").it.each`.
    if (
      typeof self !== "undefined" &&
      typeof window === "undefined" &&
      typeof module === "undefined"
    ) {
      self.describe = api.describe
      self.it = api.it
      self.test = api.test
      self.expect = api.expect
      self.beforeAll = api.beforeAll
      self.afterAll = api.afterAll
      self.beforeEach = api.beforeEach
      self.afterEach = api.afterEach
    }

    return api
  }

  globalScope.createVitestShim = createVitestShim

  // Reachable from Node/vitest, where the file is required directly rather than importScripts'd.
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { createVitestShim: createVitestShim }
  }
})(typeof self !== "undefined" ? self : globalThis)
