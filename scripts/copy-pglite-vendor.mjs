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
 * (exact, no caret — see package.json) devDependency version. Wired into the `postinstall`/
 * `pretest` chain (package.json) alongside copy-ts-vendor.mjs so a fresh clone's `pnpm install`
 * alone makes both `pnpm dev` and `pnpm test` work with zero extra steps.
 *
 * GLOB, not a hardcoded file list: every top-level file directly under dist/ matching
 * `.js`/`.wasm`/`.data` (excluding `.map` sourcemaps and the `.cjs`/`.d.ts`/`.d.cts` files this
 * worker never loads) is copied — NOT the fixed 7-chunk-file list an earlier version of this
 * script hardcoded. `dist/index.js`'s code-split chunk filenames are content-hashed by the
 * package's own build and are not a stable public contract; hardcoding them meant a future
 * @electric-sql/pglite version bump could silently rename/add/remove chunks, and this script would
 * copy nothing for the missing ones while still reporting success. This deliberately EXCLUDES
 * dist/contrib/** (optional Postgres extensions like pg_trgm/vector — unused by Sprint Labs
 * content) and the /live, /worker, /nodefs, /template export subpaths (this repo uses plain
 * `PGlite`, not `PGliteWorker` or a custom filesystem) by only reading dist/'s own top-level files,
 * never recursing into subdirectories.
 *
 * Fails SOFT (warns, exits 0) only when the package itself is not installed yet — that must never
 * break `pnpm install` for the whole repo over one Sprint Labs asset, matching copy-ts-vendor.mjs.
 * Fails LOUD (throws, non-zero exit) when `index.js` was copied but the glob matched ZERO
 * `chunk-*.js` files alongside it: `index.js` imports those chunks by relative specifier (see
 * task-5-report.md), so shipping it without them is a structurally broken worker that would 404 on
 * its own imports at runtime with no signal at install time — silently "succeeding" here would be
 * worse than a loud install failure a human notices immediately.
 *
 * Run directly: node scripts/copy-pglite-vendor.mjs
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const SOURCE_DIR = join(ROOT, "node_modules/@electric-sql/pglite/dist")
const DEST_DIR = join(ROOT, "public/wasm/pglite")

const VENDORED_EXTENSIONS = [".js", ".wasm", ".data"]
const EXCLUDED_SUFFIXES = [".map", ".d.ts", ".d.cts", ".cjs"]

function isVendoredAsset(fileName) {
  if (EXCLUDED_SUFFIXES.some((suffix) => fileName.endsWith(suffix))) return false
  return VENDORED_EXTENSIONS.some((extension) => fileName.endsWith(extension))
}

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

  const entries = readdirSync(SOURCE_DIR, { withFileTypes: true })
  const wanted = entries.filter((entry) => entry.isFile() && isVendoredAsset(entry.name))

  let hasIndex = false
  let chunkCount = 0
  for (const entry of wanted) {
    copyFileSync(join(SOURCE_DIR, entry.name), join(DEST_DIR, entry.name))
    if (entry.name === "index.js") hasIndex = true
    if (/^chunk-.*\.js$/.test(entry.name)) chunkCount++
  }

  console.log(`[copy-pglite-vendor] copied ${wanted.length} file(s) -> public/wasm/pglite/`)

  if (hasIndex && chunkCount === 0) {
    throw new Error(
      "index.js was copied but zero chunk-*.js files were found alongside it in " +
        "@electric-sql/pglite's dist/ — index.js imports those chunks by relative specifier, so " +
        "shipping it without them is a structurally broken worker that would 404 on its own " +
        "imports at runtime. This usually means the package's internal build layout changed (e.g. " +
        "a version bump) in a way this glob no longer matches — fix the glob above, do not " +
        "silently ship a broken worker."
    )
  }
}

copyVendorFiles()
process.exit(0)
