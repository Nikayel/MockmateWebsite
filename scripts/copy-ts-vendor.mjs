#!/usr/bin/env node
/**
 * Copies the `typescript` package's standalone compiler build into public/vendor/, where the JS
 * sandbox worker self-hosts it (js-sandbox-worker.js: importScripts("/vendor/typescript/typescript.js")),
 * mirroring how sql-wasm.js is self-hosted under public/wasm/ for the SQL worker.
 *
 * The copied file is NOT committed (see .gitignore) — it is regenerated from
 * node_modules/typescript on every install so it can never drift from the pinned devDependency
 * version. Wired as the `postinstall` script (package.json) so a fresh clone's `pnpm install`
 * alone makes both `pnpm dev` and `pnpm build` work with zero extra steps.
 *
 * Deliberately fails SOFT: a missing `typescript` package must never break `pnpm install` for the
 * whole repo over one Sprint Labs asset. It logs a warning and still exits 0.
 *
 * Run directly: node scripts/copy-ts-vendor.mjs
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const SOURCE = join(ROOT, "node_modules/typescript/lib/typescript.js")
const DEST_DIR = join(ROOT, "public/vendor/typescript")
const DEST = join(DEST_DIR, "typescript.js")

function copyVendorFile() {
  if (!existsSync(SOURCE)) {
    console.warn(
      "[copy-ts-vendor] node_modules/typescript/lib/typescript.js not found — skipping. " +
        "The Sprint Labs TypeScript workspace runner will 404 on /vendor/typescript/typescript.js " +
        "until `pnpm install` restores the typescript devDependency."
    )
    return
  }

  mkdirSync(DEST_DIR, { recursive: true })
  copyFileSync(SOURCE, DEST)
  console.log("[copy-ts-vendor] copied typescript.js -> public/vendor/typescript/typescript.js")
}

try {
  copyVendorFile()
} catch (error) {
  console.warn(
    `[copy-ts-vendor] failed, continuing anyway: ${error instanceof Error ? error.message : String(error)}`
  )
}

process.exit(0)
