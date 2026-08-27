import { describe, expect, it } from "vitest"

import { createTsTranspileCache } from "../transpile-cache"

/**
 * The Node-side sibling of ts-transpiler-loader.test.ts. Deliberately a SEPARATE implementation
 * (see transpile-cache.ts's header for why) that imports the real `typescript` package directly
 * instead of taking it as a parameter, since Node has no importScripts constraint.
 */
describe("Node createTsTranspileCache", () => {
  it("transpiles TypeScript to CommonJS-shaped JavaScript", () => {
    const cache = createTsTranspileCache()
    const result = cache.transpile(
      "math.ts",
      "export function add(a: number, b: number) { return a + b }"
    )
    expect(result.cached).toBe(false)
    expect(result.code).toContain("exports.add")
    expect(result.code).not.toMatch(/\bexport\b/)
  })

  it("caches by content hash across calls", () => {
    const cache = createTsTranspileCache()
    const source = "export const x: number = 1"
    const first = cache.transpile("a.ts", source)
    const second = cache.transpile("a.ts", source)
    expect(first.cached).toBe(false)
    expect(second.cached).toBe(true)
    expect(second.code).toBe(first.code)
  })

  it("does not reuse the cache for changed content at the same path", () => {
    const cache = createTsTranspileCache()
    const first = cache.transpile("a.ts", "export const x = 1")
    const second = cache.transpile("a.ts", "export const x = 2")
    expect(second.cached).toBe(false)
    expect(second.code).not.toBe(first.code)
  })

  it("applies the JSX transform for .tsx paths", () => {
    const cache = createTsTranspileCache()
    const result = cache.transpile("Hello.tsx", "export function Hello() { return <div>hi</div> }")
    expect(result.code).not.toContain("<div>")
  })

  it("size() counts distinct cached content hashes", () => {
    const cache = createTsTranspileCache()
    expect(cache.size()).toBe(0)
    cache.transpile("a.ts", "export const x = 1")
    expect(cache.size()).toBe(1)
    cache.transpile("a.ts", "export const x = 1")
    expect(cache.size()).toBe(1)
  })
})
