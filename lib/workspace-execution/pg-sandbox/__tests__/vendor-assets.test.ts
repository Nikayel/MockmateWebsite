import { existsSync, readFileSync, readdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

/**
 * Guards the two things that make pg-sandbox-worker.js loadable in a real browser, neither of
 * which any other test in this suite exercises (everything else runs through the Node path):
 *  1. scripts/copy-pglite-vendor.mjs actually produced the files the worker's dynamic `import()`
 *     needs (wired into `pretest`, so this should always be true by the time vitest runs).
 *  2. The worker's own import specifiers are the literal paths those files are copied to — a
 *     rename on either side (the copy script's DEST_DIR, or the worker's import string) would
 *     silently 404 in the browser with no signal here otherwise.
 */
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..")
const PGLITE_VENDOR_DIR = join(REPO_ROOT, "public/wasm/pglite")
const WORKER_PATH = join(REPO_ROOT, "public/workers/pg-sandbox-worker.js")
const CORE_PATH = join(REPO_ROOT, "public/workers/pg-suite-core.mjs")

describe("pg-sandbox vendor assets exist after scripts/copy-pglite-vendor.mjs runs", () => {
  it("copied index.js, at least one chunk, and the wasm/data assets", () => {
    expect(existsSync(join(PGLITE_VENDOR_DIR, "index.js"))).toBe(true)
    expect(existsSync(join(PGLITE_VENDOR_DIR, "pglite.wasm"))).toBe(true)
    expect(existsSync(join(PGLITE_VENDOR_DIR, "pglite.data"))).toBe(true)
    expect(existsSync(join(PGLITE_VENDOR_DIR, "initdb.wasm"))).toBe(true)

    const chunkFiles = readdirSync(PGLITE_VENDOR_DIR).filter((name) => /^chunk-.*\.js$/.test(name))
    expect(chunkFiles.length).toBeGreaterThan(0)
  })
})

describe("pg-sandbox-worker.js's import specifiers resolve to real, self-hosted files", () => {
  it("imports the shared core from the literal path copy-pglite-vendor.mjs and this repo both use", () => {
    const workerSource = readFileSync(WORKER_PATH, "utf8")
    expect(workerSource).toContain('from "/workers/pg-suite-core.mjs"')
    expect(existsSync(CORE_PATH)).toBe(true)
  })

  it("dynamically imports the vendored PGlite entry from the exact path it is copied to", () => {
    const workerSource = readFileSync(WORKER_PATH, "utf8")
    expect(workerSource).toContain('import("/wasm/pglite/index.js")')
    expect(existsSync(join(PGLITE_VENDOR_DIR, "index.js"))).toBe(true)
  })
})

describe("pg-suite-core.mjs exports what both drivers depend on", () => {
  it("exports runPgSuiteCore, APP_ROLE_NAME, and summarizeResults", async () => {
    const core = (await import(CORE_PATH)) as {
      runPgSuiteCore: unknown
      APP_ROLE_NAME: unknown
      summarizeResults: unknown
    }
    expect(typeof core.runPgSuiteCore).toBe("function")
    expect(typeof core.APP_ROLE_NAME).toBe("string")
    expect(typeof core.summarizeResults).toBe("function")
  })
})
