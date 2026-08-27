import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Covers public/workers/vitest-shim.js, the describe/it/expect shim TS workspace suites run
 * against. Evaluates the REAL file (the way assert-shim.test.ts covers assert-shim.js) so these
 * tests exercise the code that actually ships to the worker and gets `require()`d by
 * node-harness.ts.
 */

const SHIM_PATH = join(process.cwd(), "public/workers/vitest-shim.js")

interface ExpectMatchers {
  toBe(expected: unknown): void
  toEqual(expected: unknown): void
  toStrictEqual(expected: unknown): void
  toBeTruthy(): void
  toBeFalsy(): void
  toBeNull(): void
  toBeUndefined(): void
  toBeDefined(): void
  toContain(expected: unknown): void
  toHaveLength(length: number): void
  toMatchObject(expected: object): void
  toBeGreaterThan(expected: number): void
  toBeGreaterThanOrEqual(expected: number): void
  toBeLessThan(expected: number): void
  toBeLessThanOrEqual(expected: number): void
  toThrow(expected?: unknown): void
  not: ExpectMatchers
  resolves: {
    toBe(expected: unknown): Promise<void>
    toEqual(expected: unknown): Promise<void>
    toThrow(expected?: unknown): Promise<void>
  }
  rejects: {
    toBe(expected: unknown): Promise<void>
    toEqual(expected: unknown): Promise<void>
    toThrow(expected?: unknown): Promise<void>
  }
}

interface ShimTestFn {
  (name: string, fn: () => unknown): void
  skip(name: string, fn?: () => unknown): void
}

interface ShimDescribeFn {
  (name: string, fn: () => void): void
  skip(name: string, fn?: () => void): void
}

interface ShimResult {
  suite: string
  name: string
  passed: boolean
  error: string | null
  isHidden: boolean
}

interface VitestShimApi {
  describe: ShimDescribeFn
  it: ShimTestFn
  test: ShimTestFn
  expect(actual: unknown): ExpectMatchers
  beforeAll(fn: () => unknown): void
  afterAll(fn: () => unknown): void
  beforeEach(fn: () => unknown): void
  afterEach(fn: () => unknown): void
  setCurrentFile(path: string | null): void
  finalize(): Promise<ShimResult[]>
}

function loadVitestShim(hiddenTestPaths: string[] = []): VitestShimApi {
  const source = readFileSync(SHIM_PATH, "utf8")
  const workerScope: {
    createVitestShim?: (options?: { hiddenTestPaths?: string[] }) => VitestShimApi
  } = {}
  new Function("self", "module", source)(workerScope, undefined)

  if (typeof workerScope.createVitestShim !== "function") {
    throw new Error("vitest-shim.js did not attach createVitestShim to the worker scope")
  }
  return workerScope.createVitestShim({ hiddenTestPaths })
}

describe("vitest shim", () => {
  it("records a passing test under its describe suite", async () => {
    const shim = loadVitestShim()
    shim.describe("Math", () => {
      shim.it("adds", () => {
        shim.expect(1 + 1).toBe(2)
      })
    })
    const results = await shim.finalize()
    expect(results).toEqual([
      { suite: "Math", name: "adds", passed: true, error: null, isHidden: false },
    ])
  })

  it("records a failing test with a readable error message", async () => {
    const shim = loadVitestShim()
    shim.describe("Math", () => {
      shim.it("is wrong on purpose", () => {
        shim.expect(1 + 1).toBe(3)
      })
    })
    const results = await shim.finalize()
    expect(results).toHaveLength(1)
    expect(results[0].passed).toBe(false)
    expect(results[0].error).toMatch(/to be/)
  })

  it("joins nested describe blocks with ' > '", async () => {
    const shim = loadVitestShim()
    shim.describe("Outer", () => {
      shim.describe("Inner", () => {
        shim.it("nested", () => {
          shim.expect(true).toBeTruthy()
        })
      })
    })
    const results = await shim.finalize()
    expect(results[0].suite).toBe("Outer > Inner")
  })

  it("allows a bare it() with no enclosing describe", async () => {
    const shim = loadVitestShim()
    shim.it("top level", () => {
      shim.expect(1).toBe(1)
    })
    const results = await shim.finalize()
    expect(results[0].suite).toBe("")
  })

  it("marks isHidden true when the suite label contains 'hidden' (case-insensitive)", async () => {
    const shim = loadVitestShim()
    shim.describe("Hidden Edge Cases", () => {
      shim.it("still works", () => {
        shim.expect(1).toBe(1)
      })
    })
    const results = await shim.finalize()
    expect(results[0].isHidden).toBe(true)
  })

  it("marks isHidden true when the current file is in hiddenTestPaths, even with a plain label", async () => {
    const shim = loadVitestShim(["tests/hidden/secret.test.ts"])
    shim.setCurrentFile("tests/hidden/secret.test.ts")
    shim.describe("PaymentProcessor", () => {
      shim.it("rejects negative amounts", () => {
        shim.expect(true).toBeTruthy()
      })
    })
    const results = await shim.finalize()
    expect(results[0].isHidden).toBe(true)
  })

  it("does not mark a visible file's plain-label suite as hidden", async () => {
    const shim = loadVitestShim(["tests/hidden/secret.test.ts"])
    shim.setCurrentFile("tests/visible/math.test.ts")
    shim.describe("PlainSuite", () => {
      shim.it("passes", () => {
        shim.expect(true).toBeTruthy()
      })
    })
    const results = await shim.finalize()
    expect(results[0].isHidden).toBe(false)
  })

  it("captures the suite/file context at it() registration time, not at completion time", async () => {
    // A slow async test in file A must not be mis-attributed to file B just because file B was
    // required (and changed "current file") before A's promise settles.
    const shim = loadVitestShim(["hidden.test.ts"])
    shim.setCurrentFile("visible.test.ts")
    shim.it("slow visible test", async () => {
      await new Promise((resolve) => setTimeout(resolve, 5))
      shim.expect(true).toBe(true)
    })
    shim.setCurrentFile("hidden.test.ts")
    shim.it("fast hidden test", () => {
      shim.expect(true).toBe(true)
    })
    const results = await shim.finalize()
    const visible = results.find((r) => r.name === "slow visible test")
    const hidden = results.find((r) => r.name === "fast hidden test")
    expect(visible?.isHidden).toBe(false)
    expect(hidden?.isHidden).toBe(true)
  })

  it("awaits async test bodies before finalize() resolves", async () => {
    const shim = loadVitestShim()
    let resolved = false
    shim.it("async test", async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
      resolved = true
      shim.expect(resolved).toBe(true)
    })
    const results = await shim.finalize()
    expect(resolved).toBe(true)
    expect(results[0].passed).toBe(true)
  })

  it("test is an alias for it, including .skip", () => {
    const shim = loadVitestShim()
    expect(shim.test).toBe(shim.it)
    expect(typeof shim.test.skip).toBe("function")
  })

  it("it.skip records nothing and never calls its body", async () => {
    const shim = loadVitestShim()
    shim.it.skip("skipped", () => {
      throw new Error("should never run")
    })
    const results = await shim.finalize()
    expect(results).toEqual([])
  })

  describe("matchers", () => {
    it("toEqual does deep structural comparison without primitive coercion", async () => {
      const shim = loadVitestShim()
      shim.it("deep equal arrays/objects", () => shim.expect({ a: [1, 2] }).toEqual({ a: [1, 2] }))
      shim.it("no primitive coercion", () => shim.expect(1).not.toEqual("1" as unknown as number))
      const results = await shim.finalize()
      expect(results.every((r) => r.passed)).toBe(true)
    })

    it("toEqual terminates on a cyclic array instead of a stack overflow (regression)", async () => {
      const shim = loadVitestShim()
      const a: unknown[] = ["a"]
      const b: unknown[] = ["a"]
      a.push(a)
      b.push(b)
      shim.it("t", () => shim.expect(a).toEqual(b))
      const results = await shim.finalize()
      expect(results[0].passed).toBe(true)
    })

    it("toEqual terminates on a cyclic Map instead of a stack overflow (regression)", async () => {
      const shim = loadVitestShim()
      const a = new Map<string, unknown>([["k", "v"]])
      const b = new Map<string, unknown>([["k", "v"]])
      a.set("self", a)
      b.set("self", b)
      shim.it("t", () => shim.expect(a).toEqual(b))
      const results = await shim.finalize()
      expect(results[0].passed).toBe(true)
    })

    it("toStrictEqual distinguishes an explicit undefined from a missing key", async () => {
      const shim = loadVitestShim()
      shim.it("toEqual ignores undefined props", () =>
        shim.expect({ a: 1, b: undefined }).toEqual({ a: 1 })
      )
      shim.it("toStrictEqual does not", () =>
        shim.expect({ a: 1, b: undefined }).not.toStrictEqual({ a: 1 })
      )
      const results = await shim.finalize()
      expect(results.every((r) => r.passed)).toBe(true)
    })

    it("toContain works on arrays and strings", async () => {
      const shim = loadVitestShim()
      shim.it("array", () => shim.expect([1, 2, 3]).toContain(2))
      shim.it("string", () => shim.expect("hello world").toContain("world"))
      const results = await shim.finalize()
      expect(results.every((r) => r.passed)).toBe(true)
    })

    it("toHaveLength checks .length", async () => {
      const shim = loadVitestShim()
      shim.it("array length", () => shim.expect([1, 2, 3]).toHaveLength(3))
      shim.it("string length", () => shim.expect("abc").toHaveLength(3))
      const results = await shim.finalize()
      expect(results.every((r) => r.passed)).toBe(true)
    })

    it("toHaveLength(0) passes for an empty string (regression: falsy short-circuit)", async () => {
      const shim = loadVitestShim()
      shim.it("t", () => shim.expect("").toHaveLength(0))
      const results = await shim.finalize()
      expect(results[0].passed).toBe(true)
    })

    it("toHaveLength(0) passes for an empty array (regression: falsy short-circuit)", async () => {
      const shim = loadVitestShim()
      shim.it("t", () => shim.expect([]).toHaveLength(0))
      const results = await shim.finalize()
      expect(results[0].passed).toBe(true)
    })

    it("toMatchObject checks a partial subset", async () => {
      const shim = loadVitestShim()
      shim.it("subset matches", () =>
        shim.expect({ a: 1, b: 2, c: 3 }).toMatchObject({ a: 1, c: 3 })
      )
      shim.it("missing key fails", () =>
        shim.expect({ a: 1 }).not.toMatchObject({ a: 1, missing: 2 })
      )
      const results = await shim.finalize()
      expect(results.every((r) => r.passed)).toBe(true)
    })

    it("ordering matchers compare numbers", async () => {
      const shim = loadVitestShim()
      shim.it("gt", () => shim.expect(5).toBeGreaterThan(4))
      shim.it("gte", () => shim.expect(5).toBeGreaterThanOrEqual(5))
      shim.it("lt", () => shim.expect(4).toBeLessThan(5))
      shim.it("lte", () => shim.expect(5).toBeLessThanOrEqual(5))
      const results = await shim.finalize()
      expect(results.every((r) => r.passed)).toBe(true)
    })

    it("toThrow matches by substring, RegExp, and constructor", async () => {
      const shim = loadVitestShim()
      const boom = () => {
        throw new TypeError("boom")
      }
      shim.it("substring", () => shim.expect(boom).toThrow("boom"))
      shim.it("regexp", () => shim.expect(boom).toThrow(/boom/))
      shim.it("constructor", () => shim.expect(boom).toThrow(TypeError))
      shim.it("bare toThrow with no matcher", () => shim.expect(boom).toThrow())
      shim.it("fails when the function does not throw", () =>
        shim.expect(() => undefined).not.toThrow()
      )
      const results = await shim.finalize()
      expect(results.every((r) => r.passed)).toBe(true)
    })

    it(".not inverts every direct matcher", async () => {
      const shim = loadVitestShim()
      shim.it("not.toBe", () => shim.expect(1).not.toBe(2))
      shim.it("not.toBeNull", () => shim.expect(1).not.toBeNull())
      shim.it("not.toBeTruthy", () => shim.expect(0).not.toBeTruthy())
      const results = await shim.finalize()
      expect(results.every((r) => r.passed)).toBe(true)
    })
  })

  describe("resolves/rejects", () => {
    it("resolves.toBe awaits fulfillment then compares", async () => {
      const shim = loadVitestShim()
      shim.it("t", async () => {
        await shim.expect(Promise.resolve(42)).resolves.toBe(42)
      })
      const results = await shim.finalize()
      expect(results[0].passed).toBe(true)
    })

    it("resolves.toEqual awaits fulfillment then deep-compares", async () => {
      const shim = loadVitestShim()
      shim.it("t", async () => {
        await shim.expect(Promise.resolve({ a: 1 })).resolves.toEqual({ a: 1 })
      })
      const results = await shim.finalize()
      expect(results[0].passed).toBe(true)
    })

    it("rejects.toThrow awaits rejection then matches the reason", async () => {
      const shim = loadVitestShim()
      shim.it("t", async () => {
        await shim.expect(Promise.reject(new Error("nope"))).rejects.toThrow("nope")
      })
      const results = await shim.finalize()
      expect(results[0].passed).toBe(true)
    })

    it("rejects.toEqual compares the rejection reason", async () => {
      const shim = loadVitestShim()
      shim.it("t", async () => {
        await shim.expect(Promise.reject("boom")).rejects.toEqual("boom")
      })
      const results = await shim.finalize()
      expect(results[0].passed).toBe(true)
    })

    it("fails when .resolves is used on a promise that rejects", async () => {
      const shim = loadVitestShim()
      shim.it("t", async () => {
        await shim.expect(Promise.reject(new Error("boom"))).resolves.toBe(1)
      })
      const results = await shim.finalize()
      expect(results[0].passed).toBe(false)
    })

    it("fails when .rejects is used on a promise that resolves", async () => {
      const shim = loadVitestShim()
      shim.it("t", async () => {
        await shim.expect(Promise.resolve(1)).rejects.toBe(1)
      })
      const results = await shim.finalize()
      expect(results[0].passed).toBe(false)
    })
  })

  describe("sequential execution (I2 regression)", () => {
    it("runs async tests in registration order, not completion order, even with inverted timings", async () => {
      const shim = loadVitestShim()
      const log: string[] = []

      shim.it("first (slow)", async () => {
        log.push("first-start")
        await new Promise((resolve) => setTimeout(resolve, 20))
        log.push("first-end")
      })
      shim.it("second (fast)", async () => {
        log.push("second-start")
        await new Promise((resolve) => setTimeout(resolve, 1))
        log.push("second-end")
      })

      const results = await shim.finalize()

      // If tests ran concurrently, "second" (the shorter timeout) would resolve while "first" is
      // still awaiting, interleaving the log and reordering the results.
      expect(log).toEqual(["first-start", "first-end", "second-start", "second-end"])
      expect(results.map((r) => r.name)).toEqual(["first (slow)", "second (fast)"])
    })

    it("a shared mutable counter is never read/written concurrently by two async tests", async () => {
      const shim = loadVitestShim()
      let counter = 0

      shim.it("increments after a delay", async () => {
        const before = counter
        await new Promise((resolve) => setTimeout(resolve, 10))
        counter = before + 1
      })
      shim.it("reads immediately", () => {
        // If the first test's body were still in flight (concurrent execution), this would see
        // the STALE value (0) instead of waiting for the first test to actually finish.
        shim.expect(counter).toBe(1)
      })

      const results = await shim.finalize()
      expect(results.every((r) => r.passed)).toBe(true)
    })
  })

  describe("lifecycle hooks (R13)", () => {
    it("runs beforeAll/beforeEach/afterEach/afterAll in the correct nested order", async () => {
      const shim = loadVitestShim()
      const log: string[] = []

      shim.describe("Outer", () => {
        shim.beforeAll(() => log.push("outer beforeAll"))
        shim.afterAll(() => log.push("outer afterAll"))
        shim.beforeEach(() => log.push("outer beforeEach"))
        shim.afterEach(() => log.push("outer afterEach"))

        shim.describe("Inner", () => {
          shim.beforeAll(() => log.push("inner beforeAll"))
          shim.afterAll(() => log.push("inner afterAll"))
          shim.beforeEach(() => log.push("inner beforeEach"))
          shim.afterEach(() => log.push("inner afterEach"))

          shim.it("test1", () => log.push("test1"))
          shim.it("test2", () => log.push("test2"))
        })
      })

      await shim.finalize()

      expect(log).toEqual([
        "outer beforeAll",
        "inner beforeAll",
        "outer beforeEach",
        "inner beforeEach",
        "test1",
        "inner afterEach",
        "outer afterEach",
        "outer beforeEach",
        "inner beforeEach",
        "test2",
        "inner afterEach",
        "outer afterEach",
        "inner afterAll",
        "outer afterAll",
      ])
    })

    it("beforeAll and afterAll each run exactly once per describe, not once per test", async () => {
      const shim = loadVitestShim()
      let beforeAllCalls = 0
      let afterAllCalls = 0

      shim.describe("Suite", () => {
        shim.beforeAll(() => {
          beforeAllCalls += 1
        })
        shim.afterAll(() => {
          afterAllCalls += 1
        })
        shim.it("a", () => undefined)
        shim.it("b", () => undefined)
        shim.it("c", () => undefined)
      })

      await shim.finalize()
      expect(beforeAllCalls).toBe(1)
      expect(afterAllCalls).toBe(1)
    })

    it("top-level hooks (no enclosing describe) apply to bare it() calls", async () => {
      const shim = loadVitestShim()
      const log: string[] = []
      shim.beforeEach(() => log.push("root beforeEach"))
      shim.afterEach(() => log.push("root afterEach"))
      shim.it("bare test", () => log.push("bare test"))

      await shim.finalize()
      expect(log).toEqual(["root beforeEach", "bare test", "root afterEach"])
    })

    it("a failing beforeEach fails the test without running its body", async () => {
      const shim = loadVitestShim()
      let bodyRan = false
      shim.describe("Suite", () => {
        shim.beforeEach(() => {
          throw new Error("setup broke")
        })
        shim.it("t", () => {
          bodyRan = true
        })
      })

      const results = await shim.finalize()
      expect(results[0].passed).toBe(false)
      expect(results[0].error).toMatch(/setup broke/)
      expect(bodyRan).toBe(false)
    })

    it("afterEach still runs after a failing test", async () => {
      const shim = loadVitestShim()
      let afterEachRan = false
      shim.describe("Suite", () => {
        shim.afterEach(() => {
          afterEachRan = true
        })
        shim.it("t", () => {
          throw new Error("test failed")
        })
      })

      await shim.finalize()
      expect(afterEachRan).toBe(true)
    })

    describe("describe.skip", () => {
      it("never calls its body: no it(), no nested describe(), no hooks run, no rows recorded", async () => {
        const shim = loadVitestShim()
        let anythingRan = false

        shim.describe.skip("Skipped suite", () => {
          anythingRan = true
          shim.beforeEach(() => {
            anythingRan = true
          })
          shim.it("should never run", () => {
            anythingRan = true
          })
        })

        const results = await shim.finalize()
        expect(results).toEqual([])
        expect(anythingRan).toBe(false)
      })

      it("a sibling suite after a skipped one still runs normally", async () => {
        const shim = loadVitestShim()
        shim.describe.skip("Skipped", () => {
          shim.it("never", () => {
            throw new Error("should not run")
          })
        })
        shim.describe("Not skipped", () => {
          shim.it("runs", () => {
            shim.expect(true).toBe(true)
          })
        })

        const results = await shim.finalize()
        expect(results).toEqual([
          { suite: "Not skipped", name: "runs", passed: true, error: null, isHidden: false },
        ])
      })
    })
  })

  describe("unsupported vitest API guard (R13)", () => {
    it("names the API when an unsupported it.each/describe.each is accessed", () => {
      const shim = loadVitestShim()
      expect(() => (shim.it as unknown as { each: unknown }).each).toThrow(
        /vitest-shim: it\.each is not supported/
      )
      expect(() => (shim.describe as unknown as { each: unknown }).each).toThrow(
        /vitest-shim: describe\.each is not supported/
      )
      expect(() => (shim.test as unknown as { concurrent: unknown }).concurrent).toThrow(
        /vitest-shim: (it|test)\.concurrent is not supported/
      )
    })

    it("names the API when an unsupported top-level export (e.g. vi) is accessed", () => {
      const shim = loadVitestShim()
      expect(() => (shim as unknown as { vi: unknown }).vi).toThrow(
        /vitest-shim: vitest\.vi is not supported/
      )
    })

    it("names the API when an unsupported static expect helper (e.g. expect.any) is accessed", () => {
      const shim = loadVitestShim()
      expect(() => (shim.expect as unknown as { any: unknown }).any).toThrow(
        /vitest-shim: expect\.any is not supported/
      )
    })

    it("does not affect any supported export or matcher", async () => {
      const shim = loadVitestShim()
      expect(shim.test).toBe(shim.it)
      expect(typeof shim.it.skip).toBe("function")
      expect(typeof shim.describe.skip).toBe("function")
      shim.it("t", () => shim.expect(1).toBe(1))
      const results = await shim.finalize()
      expect(results[0].passed).toBe(true)
    })
  })
})
