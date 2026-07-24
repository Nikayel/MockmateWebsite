/**
 * Table-driven coverage for the owned expression mini-grammar (Iteration 4 exit
 * criteria). Every calc-widget output funnels through this parser/evaluator, so the
 * tables pin both the accepted grammar and the exact rejections.
 */
import { describe, it, expect } from "vitest"
import { parseExpr, evaluateExpr } from "../expr"

function evaluate(source: string, env: Record<string, number> = {}): number {
  const parsed = parseExpr(source)
  if (!parsed.ok) throw new Error(parsed.error)
  return evaluateExpr(parsed.ast, env)
}

describe("parseExpr + evaluateExpr", () => {
  it.each([
    { expr: "1 + 2 * 3", env: {}, expected: 7 },
    { expr: "(1 + 2) * 3", env: {}, expected: 9 },
    { expr: "10 / 4", env: {}, expected: 2.5 },
    { expr: "2 ^ 10", env: {}, expected: 1024 },
    { expr: "2 ^ 3 ^ 2", env: {}, expected: 512 }, // right-assoc
    { expr: "-2 ^ 2", env: {}, expected: -4 }, // -(2^2), convention
    { expr: "6.02e2 + 0.5", env: {}, expected: 602.5 },
    {
      expr: "dau * actions / 86400",
      env: { dau: 1000000, actions: 10 },
      expected: (1000000 * 10) / 86400,
    },
    { expr: "ceil(qps / perBox)", env: { qps: 30000, perBox: 10000 }, expected: 3 },
    { expr: "floor(9.9)", env: {}, expected: 9 },
    { expr: "round(2.5)", env: {}, expected: 3 },
    { expr: "sqrt(144)", env: {}, expected: 12 },
    { expr: "log10(1000)", env: {}, expected: 3 },
    { expr: "min(3, 7)", env: {}, expected: 3 },
    { expr: "max(3, 7)", env: {}, expected: 7 },
    { expr: "pow(1 - p, n)", env: { p: 0.5, n: 2 }, expected: 0.25 },
    // The plan's marquee formulas:
    { expr: "1 - (1 - a) ^ n", env: { a: 0.99, n: 3 }, expected: 1 - Math.pow(0.01, 3) },
    {
      expr: "1 - (1 - p) ^ servers",
      env: { p: 0.01, servers: 100 },
      expected: 1 - Math.pow(0.99, 100),
    },
    { expr: "1 / (1 - rho)", env: { rho: 0.9 }, expected: 10 },
    { expr: "m / k", env: { m: 14, k: 10 }, expected: 1.4 },
  ])("$expr -> $expected", ({ expr, env, expected }) => {
    expect(evaluate(expr, env)).toBeCloseTo(expected, 10)
  })

  it.each([
    { expr: "", error: "empty" },
    { expr: "2 +", error: "unexpected end" },
    { expr: "2 + * 3", error: 'unexpected "*"' },
    { expr: "foo(1)", error: 'unknown function "foo"' },
    { expr: "ceil(1, 2)", error: "takes 1 argument" },
    { expr: "min(1)", error: "takes 2 arguments" },
    { expr: "(1 + 2", error: 'missing closing ")"' },
    { expr: "1 2", error: "trailing" },
    { expr: "a $ b", error: "unexpected character" },
    { expr: "2 ** 3", error: 'unexpected "*"' },
  ])("rejects $expr", ({ expr, error }) => {
    const parsed = parseExpr(expr)
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) expect(parsed.error).toContain(error)
  })

  it("collects referenced identifiers without function names", () => {
    const parsed = parseExpr("ceil(dau * actions / seconds) + base")
    expect(parsed.ok).toBe(true)
    if (parsed.ok) expect(parsed.identifiers.sort()).toEqual(["actions", "base", "dau", "seconds"])
  })

  it("evaluates an unknown identifier to NaN (schema prevents this upstream)", () => {
    expect(Number.isNaN(evaluate("ghost + 1", {}))).toBe(true)
  })

  it("division by zero yields Infinity for the formatter to handle", () => {
    expect(evaluate("1 / (1 - rho)", { rho: 1 })).toBe(Infinity)
  })
})
