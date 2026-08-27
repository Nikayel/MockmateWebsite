/**
 * A minimal 5-file TypeScript workspace exercising the TS runner end to end: passing, failing,
 * and hidden suites; cross-file imports; and a `.ts` -> `.js` resolution case (format.ts imports
 * math.ts by its literal ".ts" specifier — ts.transpileModule leaves that extension untouched, so
 * it is the require-graph's resolver, not the compiler, that has to turn it into "math.js").
 *
 * Shared by the Node harness integration test and the worker-simulation test so both prove the
 * SAME fixture behaves identically in both runtimes.
 */
import type { TsWorkspaceFile } from "../../types"

export const FIVE_FILE_WORKSPACE: TsWorkspaceFile[] = [
  {
    path: "src/math.ts",
    content: `export function add(a: number, b: number): number {
  return a + b
}

export function divide(a: number, b: number): number {
  if (b === 0) {
    throw new Error("Cannot divide by zero")
  }
  return a / b
}
`,
  },
  {
    path: "src/format.ts",
    content: `import { add } from "./math.ts"

export function shout(base: number, addend: number): string {
  return "TOTAL: " + add(base, addend)
}
`,
  },
  {
    path: "src/greet.ts",
    content: `export function greet(name: string): string {
  return "Hello, " + name + "!"
}
`,
  },
  {
    path: "tests/visible/math.test.ts",
    content: `import { describe, expect, it } from "vitest"
import { add, divide } from "../../src/math"
import { shout } from "../../src/format"

describe("math", () => {
  it("adds two numbers", () => {
    expect(add(2, 3)).toBe(5)
  })

  it("is wrong on purpose", () => {
    expect(add(2, 2)).toBe(5)
  })

  it("divide throws on zero", () => {
    expect(() => divide(1, 0)).toThrow("Cannot divide by zero")
  })
})

describe("format", () => {
  it("shouts the total", () => {
    expect(shout(2, 3)).toBe("TOTAL: 5")
  })
})

describe("Hidden edge cases", () => {
  it("still runs from inside a visible file", () => {
    expect(add(0, 0)).toBe(0)
  })
})
`,
  },
  {
    path: "tests/hidden/secret.test.ts",
    content: `import { describe, expect, it } from "vitest"
import { greet } from "../../src/greet"

describe("PaymentProcessor greeting", () => {
  it("greets asynchronously", async () => {
    const result = await Promise.resolve(greet("Ada"))
    expect(result).toBe("Hello, Ada!")
  })
})
`,
  },
]

export const FIVE_FILE_TEST_PATHS = ["tests/visible/math.test.ts"]
export const FIVE_FILE_HIDDEN_TEST_PATHS = ["tests/hidden/secret.test.ts"]
