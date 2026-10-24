#!/usr/bin/env node
/** Post-build guard for the compressed Edge bundle, with headroom below Vercel's 1 MB limit. */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { gzipSync } from "node:zlib"

const BUDGET_BYTES = 950_000
const manifestPath = ".next/server/app/api/feedback/stream/route/middleware-manifest.json"

try {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"))
  const feedback = manifest.functions?.["/api/feedback/stream/route"]
  if (!Array.isArray(feedback?.files) || feedback.files.length === 0) {
    throw new Error("Feedback Edge function is missing from its build manifest")
  }
  const files = [...new Set(feedback.files)].map((file) => readFileSync(resolve(".next", file)))
  // Compression framing differs by packager. Check the larger estimate and keep headroom.
  const compressedBytes = Math.max(
    gzipSync(Buffer.concat(files)).length,
    files.reduce((total, file) => total + gzipSync(file).length, 0)
  )
  console.log(
    `Feedback Edge bundle: ${compressedBytes.toLocaleString()} compressed bytes (budget ${BUDGET_BYTES.toLocaleString()})`
  )
  if (compressedBytes > BUDGET_BYTES) {
    console.error(
      "Feedback exceeds its Edge bundle budget. Keep large problem catalogs and unrelated content out of this route's import graph."
    )
    process.exitCode = 1
  }
} catch (error) {
  console.error(
    "Could not check the feedback Edge bundle. Run pnpm build first.",
    error instanceof Error ? error.message : String(error)
  )
  process.exitCode = 1
}
