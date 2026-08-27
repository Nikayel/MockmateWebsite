#!/usr/bin/env node
/**
 * Copies the `@electric-sql/pglite` package's browser (ESM) build into public/wasm/pglite/,
 * where the pg-sandbox worker self-hosts it (pg-sandbox-worker.js dynamically
 * `import()`s "/wasm/pglite/index.js"), mirroring how sql-wasm.js/sql-wasm.wasm are self-hosted
 * under public/wasm/ for the sql.js worker, and how scripts/copy-ts-vendor.mjs vendors the
 * TypeScript compiler build for the ts-workspace worker.
 *
 * The copied files are NOT committed (see .gitignore) — they are regenerated from
 * node_modules/@electric-sql/pglite on every install so they can never drift from the pinned
 * devDependency version. Wired into the `postinstall`/`pretest` chain (package.json) alongside
 * copy-ts-vendor.mjs so a fresh clone's `pnpm install` alone makes both `pnpm dev` and `pnpm test`
 * work with zero extra steps.
 *
 * Only the files index.js actually needs at runtime are copied: its 7 code-split chunks plus the
 * 3 wasm/data assets (verified by grepping index.js's own import/URL references — see
 * task-5-report.md). This deliberately EXCLUDES dist/contrib/** (optional Postgres extensions
 * like pg_trgm/vector — unused by Sprint Labs content) and the /live, /worker, /nodefs, /template
 * export subpaths (this repo uses plain `PGlite`, not `PGliteWorker` or a custom filesystem), to
 * keep the vendored copy to only what pg-sandbox-worker.js actually loads.
 *
 * Deliberately fails SOFT, exactly like copy-ts-vendor.mjs: a missing `@electric-sql/pglite`
 * package must never break `pnpm install` for the whole repo over one Sprint Labs asset. It logs a
 * warning and still exits 0.
 *
 * Run directly: node scripts/copy-pglite-vendor.mjs
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const SOURCE_DIR = join(ROOT, "node_modules/@electric-sql/pglite/dist")
const DEST_DIR = join(ROOT, "public/wasm/pglite")

// Exactly the files dist/index.js transitively references (its own import specifiers plus the
// `new URL(..., import.meta.url)` wasm/data lookups) — nothing more.
const VENDORED_FILES = [
  "index.js",
  "chunk-2BOC2OMW.js",
  "chunk-DDJLRBDX.js",
  "chunk-F4GETNPB.js",
  "chunk-JDT7TZ73.js",
  "chunk-NNS5RQRF.js",
  "chunk-QY3QWFKW.js",
  "chunk-RYDTTX3G.js",
  "pglite.wasm",
  "pglite.data",
  "initdb.wasm",
]

function copyVendorFiles() {
  if (!existsSync(SOURCE_DIR)) {
    console.warn(
      "[copy-pglite-vendor] node_modules/@electric-sql/pglite/dist not found — skipping. " +
        "The Sprint Labs PGlite worker will 404 on /wasm/pglite/index.js until `pnpm install` " +
        "restores the @electric-sql/pglite devDependency."
    )
    return
  }

  mkdirSync(DEST_DIR, { recursive: true })

  let copied = 0
  for (const file of VENDORED_FILES) {
    const source = join(SOURCE_DIR, file)
    if (!existsSync(source)) {
      console.warn(`[copy-pglite-vendor] expected file missing, skipping: ${file}`)
      continue
    }
    copyFileSync(source, join(DEST_DIR, file))
    copied++
  }
  console.log(
    `[copy-pglite-vendor] copied ${copied}/${VENDORED_FILES.length} files -> public/wasm/pglite/`
  )
}

try {
  copyVendorFiles()
} catch (error) {
  console.warn(
    `[copy-pglite-vendor] failed, continuing anyway: ${error instanceof Error ? error.message : String(error)}`
  )
}

process.exit(0)
