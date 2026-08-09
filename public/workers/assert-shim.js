/**
 * The `assert` module that scenario test suites run against inside the JS sandbox.
 *
 * This lives in its own file rather than inline in js-sandbox-worker.js because that is
 * exactly where the bug came from: the inline shim implemented `deepStrictEqual` but never
 * `deepEqual`, and nothing could import it to notice. Nineteen `assert.deepEqual` call sites
 * across three debugging scenarios threw "assert.deepEqual is not a function", every test in
 * those scenarios errored, and the candidate was shown a Type Error pointing at their own
 * code for a fault that was entirely ours.
 *
 * Loaded with importScripts, the same way sql-sandbox-worker.js loads /wasm/sql-wasm.js.
 * Exercised by lib/workspace-execution/__tests__/assert-shim.test.ts, which evaluates THIS
 * file so the tests cover the code that actually ships to the worker.
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

  function createAssertionError(message, actual, expected, operator) {
    const error = new Error(message)
    error.name = "AssertionError"
    error.code = "ERR_ASSERTION"
    error.actual = actual
    error.expected = expected
    error.operator = operator
    return error
  }

  /** NaN is equal to itself here, matching Node's SameValueZero comparison. */
  function sameValueZero(a, b) {
    return a === b || (a !== a && b !== b)
  }

  /**
   * `strict` selects deepStrictEqual semantics (no type coercion, prototypes must match)
   * over deepEqual semantics (primitives compared with ==, null == undefined).
   * `seen` carries the in-progress pairs so a cyclic structure terminates instead of
   * hanging the worker until its 4.5s timeout.
   */
  function isDeepEqual(a, b, strict, seen) {
    if (sameValueZero(a, b)) return true

    if (!strict && (a === null || a === undefined || b === null || b === undefined)) {
      // Loose equality treats null and undefined as interchangeable, and neither as equal
      // to anything else.
      return (a === null || a === undefined) && (b === null || b === undefined)
    }

    const aIsObject = typeof a === "object" && a !== null
    const bIsObject = typeof b === "object" && b !== null

    if (!aIsObject || !bIsObject) {
      // A primitive is never deeply equal to an object.
      if (aIsObject || bIsObject) return false
      if (strict) return false
      // eslint-disable-next-line eqeqeq
      return a == b
    }

    // An array and a plain object are never equal even when their key lists match. The
    // shim this replaces compared only Object.keys, so `[]` and `{}` came back equal and a
    // scenario returning the wrong container type passed its tests.
    if (Array.isArray(a) !== Array.isArray(b)) return false
    if (Array.isArray(a) && a.length !== b.length) return false

    if (a instanceof Date || b instanceof Date) {
      return a instanceof Date && b instanceof Date && sameValueZero(a.getTime(), b.getTime())
    }

    if (a instanceof RegExp || b instanceof RegExp) {
      return (
        a instanceof RegExp && b instanceof RegExp && a.source === b.source && a.flags === b.flags
      )
    }

    // Map and Set carry their contents outside Object.keys, which returns [] for both. A
    // key-list comparison alone would report any two Maps as equal.
    if (a instanceof Map || b instanceof Map) {
      if (!(a instanceof Map) || !(b instanceof Map) || a.size !== b.size) return false
      for (const [key, value] of a) {
        if (!b.has(key)) return false
        if (!isDeepEqual(value, b.get(key), strict, seen)) return false
      }
      return true
    }

    if (a instanceof Set || b instanceof Set) {
      if (!(a instanceof Set) || !(b instanceof Set) || a.size !== b.size) return false
      // Membership is by identity, as Set itself defines it. Deep-comparing members would
      // need an O(n^2) pairing and no scenario relies on it.
      for (const value of a) {
        if (!b.has(value)) return false
      }
      return true
    }

    if (strict && Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false

    for (let i = 0; i < seen.length; i += 1) {
      if (seen[i][0] === a && seen[i][1] === b) return true
    }
    seen.push([a, b])

    const keysA = Object.keys(a)
    const keysB = Object.keys(b)
    if (keysA.length !== keysB.length) return false
    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false
      if (!isDeepEqual(a[key], b[key], strict, seen)) return false
    }
    return true
  }

  function deepEquals(a, b, strict) {
    return isDeepEqual(a, b, strict, [])
  }

  /** Does the thrown value satisfy the expectation passed to assert.throws? */
  function matchesExpectedError(error, expected) {
    if (!expected) return true
    if (expected instanceof RegExp) return expected.test(error && error.message)
    if (typeof expected === "function") {
      // Either an Error subclass or a predicate. Constructors are tried first because an
      // Error subclass is also callable.
      try {
        if (error instanceof expected) return true
      } catch {
        // `expected` was not a constructor; fall through to the predicate call.
      }
      return expected(error) === true
    }
    if (typeof expected === "object") {
      return Object.keys(expected).every((key) => deepEquals(error[key], expected[key], false))
    }
    return true
  }

  function createAssertShim() {
    function assert(value, message) {
      if (!value) {
        throw createAssertionError(
          message || "Expected value to be truthy, got " + describeValue(value),
          value,
          true,
          "=="
        )
      }
    }

    assert.ok = assert

    assert.equal = function (actual, expected, message) {
      // eslint-disable-next-line eqeqeq
      if (actual != expected) {
        throw createAssertionError(
          message || "Expected " + describeValue(actual) + " == " + describeValue(expected),
          actual,
          expected,
          "=="
        )
      }
    }

    assert.notEqual = function (actual, expected, message) {
      // eslint-disable-next-line eqeqeq
      if (actual == expected) {
        throw createAssertionError(
          message || "Expected " + describeValue(actual) + " != " + describeValue(expected),
          actual,
          expected,
          "!="
        )
      }
    }

    assert.strictEqual = function (actual, expected, message) {
      if (!sameValueZero(actual, expected)) {
        throw createAssertionError(
          message || "Expected " + describeValue(actual) + " === " + describeValue(expected),
          actual,
          expected,
          "strictEqual"
        )
      }
    }

    assert.notStrictEqual = function (actual, expected, message) {
      if (sameValueZero(actual, expected)) {
        throw createAssertionError(
          message || "Expected " + describeValue(actual) + " !== " + describeValue(expected),
          actual,
          expected,
          "notStrictEqual"
        )
      }
    }

    assert.deepEqual = function (actual, expected, message) {
      if (!deepEquals(actual, expected, false)) {
        throw createAssertionError(
          message ||
            "Expected deep equality, got " +
              describeValue(actual) +
              " vs " +
              describeValue(expected),
          actual,
          expected,
          "deepEqual"
        )
      }
    }

    assert.notDeepEqual = function (actual, expected, message) {
      if (deepEquals(actual, expected, false)) {
        throw createAssertionError(
          message || "Expected values not to be deeply equal: " + describeValue(actual),
          actual,
          expected,
          "notDeepEqual"
        )
      }
    }

    assert.deepStrictEqual = function (actual, expected, message) {
      if (!deepEquals(actual, expected, true)) {
        throw createAssertionError(
          message ||
            "Expected deep equality, got " +
              describeValue(actual) +
              " vs " +
              describeValue(expected),
          actual,
          expected,
          "deepStrictEqual"
        )
      }
    }

    assert.notDeepStrictEqual = function (actual, expected, message) {
      if (deepEquals(actual, expected, true)) {
        throw createAssertionError(
          message || "Expected values not to be deeply equal: " + describeValue(actual),
          actual,
          expected,
          "notDeepStrictEqual"
        )
      }
    }

    assert.match = function (value, regexp, message) {
      if (!regexp.test(value)) {
        throw createAssertionError(
          message || "Expected " + describeValue(value) + " to match " + String(regexp),
          value,
          regexp,
          "match"
        )
      }
    }

    assert.doesNotMatch = function (value, regexp, message) {
      if (regexp.test(value)) {
        throw createAssertionError(
          message || "Expected " + describeValue(value) + " not to match " + String(regexp),
          value,
          regexp,
          "doesNotMatch"
        )
      }
    }

    assert.throws = function (fn, expected, message) {
      let threw = false
      let thrown
      try {
        fn()
      } catch (error) {
        threw = true
        thrown = error
      }
      if (!threw) {
        throw createAssertionError(
          message || "Expected function to throw an error",
          undefined,
          expected,
          "throws"
        )
      }
      if (!matchesExpectedError(thrown, expected)) {
        throw createAssertionError(
          message ||
            "Expected error matching " + String(expected) + ", got: " + (thrown && thrown.message),
          thrown,
          expected,
          "throws"
        )
      }
    }

    assert.doesNotThrow = function (fn, message) {
      try {
        fn()
      } catch (error) {
        throw createAssertionError(
          message || "Expected function not to throw, got: " + (error && error.message),
          error,
          undefined,
          "doesNotThrow"
        )
      }
    }

    assert.rejects = async function (fn, expected, message) {
      let threw = false
      let thrown
      try {
        await (typeof fn === "function" ? fn() : fn)
      } catch (error) {
        threw = true
        thrown = error
      }
      if (!threw) {
        throw createAssertionError(
          message || "Expected promise to reject",
          undefined,
          expected,
          "rejects"
        )
      }
      if (!matchesExpectedError(thrown, expected)) {
        throw createAssertionError(
          message ||
            "Expected rejection matching " +
              String(expected) +
              ", got: " +
              (thrown && thrown.message),
          thrown,
          expected,
          "rejects"
        )
      }
    }

    assert.doesNotReject = async function (fn, message) {
      try {
        await (typeof fn === "function" ? fn() : fn)
      } catch (error) {
        throw createAssertionError(
          message || "Expected promise not to reject, got: " + (error && error.message),
          error,
          undefined,
          "doesNotReject"
        )
      }
    }

    assert.ifError = function (value) {
      if (value !== null && value !== undefined) {
        throw createAssertionError(
          "Expected no error, got " + describeValue(value),
          value,
          null,
          "ifError"
        )
      }
    }

    assert.fail = function (message) {
      throw createAssertionError(message || "Failed", undefined, undefined, "fail")
    }

    // `assert.strict` re-points the loose helpers at their strict counterparts, so a suite
    // written against `require("node:assert").strict` behaves the way its author meant.
    const strict = function (value, message) {
      return assert(value, message)
    }
    Object.assign(strict, assert, {
      equal: assert.strictEqual,
      notEqual: assert.notStrictEqual,
      deepEqual: assert.deepStrictEqual,
      notDeepEqual: assert.notDeepStrictEqual,
    })
    strict.strict = strict
    assert.strict = strict

    return assert
  }

  globalScope.createAssertShim = createAssertShim

  // Reachable from Node/vitest, where the file is evaluated directly rather than imported
  // by a worker.
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { createAssertShim: createAssertShim }
  }
})(typeof self !== "undefined" ? self : globalThis)
