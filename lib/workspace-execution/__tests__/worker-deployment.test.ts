import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { runInNewContext } from "node:vm"
import { describe, expect, it } from "vitest"

describe("classic worker deployment dependencies", () => {
  it.each(["", "?dpl=dpl_worker_A"])(
    "keeps boot shims and lazy TS imports consistent for %s",
    (search) => {
      const imports: string[] = []
      const scope = {
        self: { location: { search }, createTsTranspileCache: () => ({}) },
        URLSearchParams,
        importScripts: (path: string) => imports.push(path),
      }
      const source = readFileSync(resolve("public/workers/js-sandbox-worker.js"), "utf8")
      runInNewContext(source, scope)
      runInNewContext("ensureTypeScriptCompiler()", scope)
      const suffix = search ? "?dpl=dpl_worker_A" : ""
      expect(imports).toEqual(
        [
          "/workers/assert-shim.js",
          "/workers/vitest-shim.js",
          "/workers/ts-transpiler-loader.js",
          "/vendor/typescript/typescript.js",
        ].map((path) => path + suffix)
      )
    }
  )
})
