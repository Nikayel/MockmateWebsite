/**
 * Content-hash transpile cache for the JS sandbox worker's TypeScript path.
 *
 * Loaded via `importScripts` from js-sandbox-worker.js, lazily and ONLY when a workspace contains
 * a `.ts`/`.tsx` file (the heavy part — importScripts-ing the ~9MB vendored `typescript.js` build
 * — happens separately in the worker, guarded by its own "already loaded" flag). This file owns
 * just the cache: `transpile(path, content, ts)` hashes `content`, returns the cached output on a
 * hit, and otherwise calls the given `ts.transpileModule` and remembers the result.
 *
 * The cache is created ONCE per worker (module-level in js-sandbox-worker.js) and is meant to
 * persist across multiple runs within that worker's lifetime — a learner re-running the same
 * ~60-file workspace after editing one file re-transpiles only that file; the other ~59 content
 * hashes are unchanged and come back instantly. It does NOT persist across a worker restart (a
 * fresh `createTsTranspileCache()` starts cold), and it is keyed by CONTENT, not path, so renaming
 * a file or duplicating identical content across two paths reuses the same cache entry for free.
 *
 * `hashContent` is FNV-1a, a fast non-cryptographic hash. That is a deliberate choice: this is a
 * cache key, not a security boundary, and a collision would only ever serve a stale-but-otherwise-
 * valid transpile of DIFFERENT content, at input sizes far below where FNV-1a's collision risk is
 * a practical concern for a several-dozen-file workspace.
 *
 * Compiler options are fixed: CommonJS module output (the require-graph in js-sandbox-worker.js
 * and node-harness.ts both only understand CommonJS), ES2020 target, esModuleInterop on (so
 * `import x from "./y"` against a CommonJS default export does not need `.default`). `.tsx` paths
 * additionally get the React JSX transform. This is transpile-only: NO cross-file type-checking
 * happens here or anywhere in the TS workspace path (see node-harness.ts's header for the same
 * note) — a type error in one file is invisible unless it also breaks at runtime.
 */
;(function (globalScope) {
  "use strict"

  /** FNV-1a 32-bit, returned as a hex string. See the module header for why this is not cryptographic. */
  function hashContent(content) {
    let hash = 0x811c9dc5
    for (let i = 0; i < content.length; i += 1) {
      hash ^= content.charCodeAt(i)
      hash = Math.imul(hash, 0x01000193)
    }
    return (hash >>> 0).toString(16)
  }

  function now() {
    if (typeof performance !== "undefined" && typeof performance.now === "function") {
      return performance.now()
    }
    return Date.now()
  }

  function createTsTranspileCache() {
    const cache = new Map()

    return {
      /**
       * `compiler` is the loaded `ts` module (either the vendored global in the worker, or the
       * real `typescript` package in Node) — passed in rather than imported so this file stays a
       * plain, dependency-free script loadable via importScripts.
       */
      transpile(path, content, compiler) {
        const key = hashContent(content)
        const cached = cache.get(key)
        if (cached !== undefined) {
          return { code: cached, ms: 0, cached: true }
        }

        const compilerOptions = {
          module: compiler.ModuleKind.CommonJS,
          target: compiler.ScriptTarget.ES2020,
          esModuleInterop: true,
        }
        if (path.endsWith(".tsx")) {
          compilerOptions.jsx = compiler.JsxEmit.ReactJSX
        }

        const start = now()
        const output = compiler.transpileModule(content, { compilerOptions, fileName: path })
        const ms = now() - start

        cache.set(key, output.outputText)
        return { code: output.outputText, ms: ms, cached: false }
      },

      size() {
        return cache.size
      },
    }
  }

  globalScope.createTsTranspileCache = createTsTranspileCache
  globalScope.__tsTranspileHashContent = hashContent

  // Reachable from Node/vitest, where the file is required directly rather than importScripts'd.
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { createTsTranspileCache: createTsTranspileCache, hashContent: hashContent }
  }
})(typeof self !== "undefined" ? self : globalThis)
