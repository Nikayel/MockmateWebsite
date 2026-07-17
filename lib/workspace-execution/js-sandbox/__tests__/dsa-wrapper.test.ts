/**
 * The console subtracts JAVASCRIPT_WRAPPER_LINE_OFFSET from every stack-trace line to
 * point the learner at their own editor. The constant used to live in `lib/piston.ts`
 * and describe PISTON's wrapper (110 lines); Piston is no longer wired, so every line
 * number the console printed was off by 30. Pin the offset to the template so an edit to
 * the preamble cannot silently desync it again.
 */
import { describe, expect, it } from "vitest"
import { buildJsWrapper, JAVASCRIPT_WRAPPER_LINE_OFFSET } from "../dsa-wrapper"

const MARKER = "/*###USER_CODE###*/"

function userCodeLine(input: Record<string, unknown>): number {
  const wrapped = buildJsWrapper(
    MARKER,
    { input },
    "function solution(n){ return n }",
    "dsa-example"
  )
  return wrapped.split("\n").findIndex((line) => line.includes(MARKER)) + 1
}

describe("JAVASCRIPT_WRAPPER_LINE_OFFSET", () => {
  it("names the line the learner's code actually starts on", () => {
    expect(userCodeLine({ n: 1 })).toBe(JAVASCRIPT_WRAPPER_LINE_OFFSET + 1)
  })

  it("holds across the wrapper's branches and input shapes", () => {
    // class-based dispatch, tree inputs, and multi-arg all take different paths.
    const inputs: Record<string, unknown>[] = [
      {},
      { operations: ["push"], values: [1] },
      { root: [1, null, 2] },
      { a: 1, b: 2, c: 3 },
      { s: "x".repeat(5000) },
    ]
    for (const input of inputs) {
      expect(userCodeLine(input)).toBe(JAVASCRIPT_WRAPPER_LINE_OFFSET + 1)
    }
  })
})
