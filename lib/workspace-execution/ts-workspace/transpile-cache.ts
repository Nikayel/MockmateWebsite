/**
 * Node-side content-hash transpile cache — the sibling of public/workers/ts-transpiler-loader.js.
 *
 * Deliberately a SEPARATE implementation, not a shared module: the worker's version cannot use a
 * static `import` (it is a plain script loaded via `importScripts`, and the TypeScript compiler
 * itself is lazily importScripts'd as a vendored global — see that file's header), so it takes the
 * compiler as a parameter. Node has no such constraint, so this version imports the real
 * `typescript` package (already a devDependency) directly. Both apply the SAME fixed compiler
 * options (CommonJS module output, ES2020 target, esModuleInterop, JSX for `.tsx`) and the SAME
 * FNV-1a content-hash cache-key scheme; keep them in sync by hand if either changes.
 *
 * Transpile-only: no cross-file type-checking, matching node-harness.ts's documented scope.
 */
import { performance } from "node:perf_hooks"

import ts from "typescript"

export interface TsTranspileResult {
  code: string
  ms: number
  cached: boolean
}

export interface TsTranspileCache {
  transpile(path: string, content: string): TsTranspileResult
  size(): number
}

/** FNV-1a 32-bit, as a hex string. A cache key, not a security boundary — see the worker sibling's header. */
export function hashContent(content: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < content.length; i += 1) {
    hash ^= content.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16)
}

export function createTsTranspileCache(): TsTranspileCache {
  const cache = new Map<string, string>()

  return {
    transpile(path, content) {
      const key = hashContent(content)
      const cached = cache.get(key)
      if (cached !== undefined) {
        return { code: cached, ms: 0, cached: true }
      }

      const compilerOptions: ts.CompilerOptions = {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      }
      if (path.endsWith(".tsx")) {
        compilerOptions.jsx = ts.JsxEmit.ReactJSX
      }

      const start = performance.now()
      const output = ts.transpileModule(content, { compilerOptions, fileName: path })
      const ms = performance.now() - start

      cache.set(key, output.outputText)
      return { code: output.outputText, ms, cached: false }
    },

    size() {
      return cache.size
    },
  }
}
