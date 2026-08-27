import { readFileSync } from "node:fs"
import { join } from "node:path"

import ts from "typescript"
import { describe, expect, it } from "vitest"

/**
 * Covers public/workers/ts-transpiler-loader.js, the content-hash transpile cache the JS sandbox
 * worker loads via importScripts alongside the vendored TypeScript compiler. Evaluates the REAL
 * file (same technique as assert-shim.test.ts) against the REAL `typescript` package so these
 * tests exercise genuine compiler output, not a stub.
 */

const LOADER_PATH = join(process.cwd(), "public/workers/ts-transpiler-loader.js")

interface TranspileResult {
  code: string
  ms: number
  cached: boolean
}

interface TsTranspileCache {
  transpile(path: string, content: string, compiler: typeof ts): TranspileResult
  size(): number
}

function loadTranspileCache(): {
  createTsTranspileCache: () => TsTranspileCache
  hashContent: (content: string) => string
} {
  const source = readFileSync(LOADER_PATH, "utf8")
  const workerScope: {
    createTsTranspileCache?: () => TsTranspileCache
    __tsTranspileHashContent?: (content: string) => string
  } = {}
  new Function("self", "module", source)(workerScope, undefined)

  if (typeof workerScope.createTsTranspileCache !== "function") {
    throw new Error(
      "ts-transpiler-loader.js did not attach createTsTranspileCache to the worker scope"
    )
  }
  if (typeof workerScope.__tsTranspileHashContent !== "function") {
    throw new Error("ts-transpiler-loader.js did not attach a hash function to the worker scope")
  }
  return {
    createTsTranspileCache: workerScope.createTsTranspileCache,
    hashContent: workerScope.__tsTranspileHashContent,
  }
}

describe("ts transpile cache", () => {
  it("transpiles TypeScript to CommonJS-shaped JavaScript", () => {
    const { createTsTranspileCache } = loadTranspileCache()
    const cache = createTsTranspileCache()
    const result = cache.transpile(
      "math.ts",
      "export function add(a: number, b: number) { return a + b }",
      ts
    )
    expect(result.cached).toBe(false)
    expect(result.code).toContain("exports.add")
    // module: CommonJS output never leaves an ES `export` keyword behind.
    expect(result.code).not.toMatch(/\bexport\b/)
  })

  it("caches by content hash: the same content is served from cache on the second call", () => {
    const { createTsTranspileCache } = loadTranspileCache()
    const cache = createTsTranspileCache()
    const source = "export const x: number = 1"
    const first = cache.transpile("a.ts", source, ts)
    const second = cache.transpile("a.ts", source, ts)
    expect(first.cached).toBe(false)
    expect(second.cached).toBe(true)
    expect(second.code).toBe(first.code)
  })

  it("does not serve stale output for changed content, even at the same path", () => {
    const { createTsTranspileCache } = loadTranspileCache()
    const cache = createTsTranspileCache()
    const first = cache.transpile("a.ts", "export const x = 1", ts)
    const second = cache.transpile("a.ts", "export const x = 2", ts)
    expect(second.cached).toBe(false)
    expect(second.code).not.toBe(first.code)
  })

  it("size() reflects the number of distinct cached content hashes", () => {
    const { createTsTranspileCache } = loadTranspileCache()
    const cache = createTsTranspileCache()
    expect(cache.size()).toBe(0)
    cache.transpile("a.ts", "export const x = 1", ts)
    expect(cache.size()).toBe(1)
    cache.transpile("b.ts", "export const x = 1", ts) // same content, different path -> same hash
    expect(cache.size()).toBe(1)
    cache.transpile("a.ts", "export const x = 2", ts)
    expect(cache.size()).toBe(2)
  })

  it("applies the JSX transform for .tsx paths", () => {
    const { createTsTranspileCache } = loadTranspileCache()
    const cache = createTsTranspileCache()
    const result = cache.transpile(
      "Hello.tsx",
      "export function Hello() { return <div>hi</div> }",
      ts
    )
    expect(result.code).not.toContain("<div>")
  })

  it("hashContent is stable for identical content and differs for different content", () => {
    const { hashContent } = loadTranspileCache()
    expect(hashContent("same")).toBe(hashContent("same"))
    expect(hashContent("same")).not.toBe(hashContent("different"))
  })
})
