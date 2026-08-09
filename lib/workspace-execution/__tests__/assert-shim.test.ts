import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Covers public/workers/assert-shim.js, the `assert` module scenario test suites run
 * against inside the JS sandbox.
 *
 * The shim used to live inline in js-sandbox-worker.js, where nothing could import it. It
 * implemented `deepStrictEqual` but not `deepEqual`, so all nineteen `assert.deepEqual`
 * call sites across three debugging scenarios threw "assert.deepEqual is not a function".
 * Every test in those scenarios errored, and the console told the candidate it was a Type
 * Error in their own code.
 *
 * These tests evaluate the real file rather than a copy, so they cover the code that
 * actually ships to the worker. The load-bearing one is the last: it walks every scenario
 * in the repo and fails if any of them calls a method the shim does not implement.
 */

const SHIM_PATH = join(process.cwd(), "public/workers/assert-shim.js")
const SCENARIOS_DIR = join(process.cwd(), "lib/scenarios")

interface AssertShim {
  (value: unknown, message?: string): void
  [method: string]: unknown
}

/**
 * Evaluate the shim the way the worker does. The file is an IIFE that attaches
 * `createAssertShim` to `self`, so it is handed an object to attach to.
 */
function loadAssertShim(): AssertShim {
  const source = readFileSync(SHIM_PATH, "utf8")
  const workerScope: { createAssertShim?: () => AssertShim } = {}
  new Function("self", "module", source)(workerScope, undefined)

  if (typeof workerScope.createAssertShim !== "function") {
    throw new Error("assert-shim.js did not attach createAssertShim to the worker scope")
  }
  return workerScope.createAssertShim()
}

/** Every `assert.<method>` referenced anywhere under lib/scenarios. */
function assertMethodsUsedByScenarios(): Set<string> {
  const used = new Set<string>()

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) {
        walk(full)
        continue
      }
      if (!entry.endsWith(".ts")) continue
      const source = readFileSync(full, "utf8")
      for (const match of source.matchAll(/\bassert\.([a-zA-Z]+)/g)) {
        used.add(match[1])
      }
    }
  }

  walk(SCENARIOS_DIR)
  return used
}

describe("assert shim", () => {
  const assert = loadAssertShim()

  it("is callable directly, the way node's assert module is", () => {
    expect(() => assert(true)).not.toThrow()
    expect(() => assert(false)).toThrow(/truthy/)
  })

  describe("deepEqual", () => {
    it("exists", () => {
      // The regression. Its absence broke every scenario that used it.
      expect(typeof assert.deepEqual).toBe("function")
    })

    it("compares arrays by contents", () => {
      expect(() => assert.deepEqual([0, 2], [0, 2])).not.toThrow()
      expect(() => assert.deepEqual([0, 2], [2, 0])).toThrow()
      expect(() => assert.deepEqual([], [])).not.toThrow()
    })

    it("does not treat an empty array and an empty object as equal", () => {
      // The replaced shim compared Object.keys lists only, so [] and {} matched and a
      // scenario returning the wrong container type passed.
      expect(() => assert.deepEqual([], {})).toThrow()
      expect(() => assert.deepEqual({}, [])).toThrow()
    })

    it("catches a length mismatch that shares a key prefix", () => {
      expect(() => assert.deepEqual([1, 2, 3], [1, 2])).toThrow()
    })

    it("compares nested objects", () => {
      expect(() => assert.deepEqual({ a: { b: [1] } }, { a: { b: [1] } })).not.toThrow()
      expect(() => assert.deepEqual({ a: { b: [1] } }, { a: { b: [2] } })).toThrow()
    })

    it("treats NaN as equal to itself", () => {
      expect(() => assert.deepEqual([NaN], [NaN])).not.toThrow()
    })

    it("coerces primitives, unlike deepStrictEqual", () => {
      expect(() => assert.deepEqual([1], ["1"])).not.toThrow()
      expect(() => assert.deepStrictEqual([1], ["1"])).toThrow()
    })

    it("compares Dates by time rather than by key list", () => {
      expect(() => assert.deepEqual(new Date(5), new Date(5))).not.toThrow()
      expect(() => assert.deepEqual(new Date(5), new Date(6))).toThrow()
    })

    it("compares RegExps by source and flags", () => {
      expect(() => assert.deepEqual(/a/g, /a/g)).not.toThrow()
      expect(() => assert.deepEqual(/a/g, /a/i)).toThrow()
    })

    it("compares Map and Set contents, which Object.keys cannot see", () => {
      // Both report zero own keys, so a key-list comparison called any two of them equal.
      expect(() => assert.deepEqual(new Map([["a", 1]]), new Map([["a", 1]]))).not.toThrow()
      expect(() => assert.deepEqual(new Map([["a", 1]]), new Map([["a", 2]]))).toThrow()
      expect(() => assert.deepEqual(new Set([1]), new Set([1]))).not.toThrow()
      expect(() => assert.deepEqual(new Set([1]), new Set([2]))).toThrow()
    })

    it("terminates on a cyclic structure instead of hanging the worker", () => {
      const a: Record<string, unknown> = { name: "a" }
      const b: Record<string, unknown> = { name: "a" }
      a.self = a
      b.self = b
      expect(() => assert.deepEqual(a, b)).not.toThrow()
    })
  })

  describe("strict variants", () => {
    it("deepStrictEqual rejects a type mismatch deepEqual allows", () => {
      expect(() => assert.deepEqual({ n: 1 }, { n: "1" })).not.toThrow()
      expect(() => assert.deepStrictEqual({ n: 1 }, { n: "1" })).toThrow()
    })

    it("assert.strict re-points the loose helpers at the strict ones", () => {
      const strict = assert.strict as AssertShim
      expect(() => strict.equal(1, "1")).toThrow()
      expect(() => strict.deepEqual({ n: 1 }, { n: "1" })).toThrow()
      expect(() => strict.deepEqual({ n: 1 }, { n: 1 })).not.toThrow()
    })

    it("strictEqual treats NaN as equal to itself", () => {
      expect(() => assert.strictEqual(NaN, NaN)).not.toThrow()
    })
  })

  describe("throws", () => {
    it("accepts a RegExp, an Error subclass, and a predicate", () => {
      const boom = () => {
        throw new TypeError("boom")
      }
      expect(() => assert.throws(boom, /boom/)).not.toThrow()
      expect(() => assert.throws(boom, TypeError)).not.toThrow()
      expect(() => assert.throws(boom, (e: Error) => e.message === "boom")).not.toThrow()
      expect(() => assert.throws(boom, /nope/)).toThrow()
    })

    it("fails when the function does not throw", () => {
      expect(() => assert.throws(() => undefined)).toThrow(/throw/)
    })

    it("doesNotThrow reports the error it caught", () => {
      expect(() =>
        assert.doesNotThrow(() => {
          throw new Error("leaked")
        })
      ).toThrow(/leaked/)
    })
  })

  describe("assertion errors", () => {
    it("are named AssertionError and carry actual and expected", () => {
      try {
        assert.deepEqual([1], [2])
        throw new Error("assert.deepEqual should have thrown")
      } catch (error) {
        const assertionError = error as Error & { actual: unknown; expected: unknown }
        expect(assertionError.name).toBe("AssertionError")
        expect(assertionError.actual).toEqual([1])
        expect(assertionError.expected).toEqual([2])
      }
    })

    it('say "Expected", which is how the console classifies a logic error', () => {
      // CodeConsole.getErrorType routes on this word. Without it a failed assertion is
      // reported to the candidate as an unknown error.
      try {
        assert.deepEqual([1], [2])
      } catch (error) {
        expect((error as Error).message).toMatch(/Expected/)
      }
    })
  })

  it("handles the assertion shape the onboarding scenario actually runs", () => {
    // lib/scenarios/real-world/bugfix/bugfix-onboarding.ts compares the returned index
    // pair against a literal, and separately against an empty array.
    expect(() => assert.deepEqual([0, 2], [0, 2])).not.toThrow()
    expect(() => assert.deepEqual([], [])).not.toThrow()
    expect(() => assert.deepEqual([0, 2], [])).toThrow()
  })

  it("implements every assert method the scenarios call", () => {
    // The guard. A scenario author reaching for a method the shim lacks fails here rather
    // than in a candidate's interview, where it surfaces as a Type Error in their code.
    const used = assertMethodsUsedByScenarios()
    expect(used.size).toBeGreaterThan(0)

    const missing = [...used].filter((method) => typeof assert[method] !== "function")
    expect(
      missing,
      `lib/scenarios calls assert.${missing.join(", assert.")} but public/workers/assert-shim.js ` +
        `does not implement ${missing.length === 1 ? "it" : "them"}. Every test in those ` +
        `scenarios will throw "assert.<method> is not a function" for the candidate.`
    ).toEqual([])
  })
})
