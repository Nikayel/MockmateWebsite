/**
 * Regression guard for a CRITICAL fix (Task 9 review round 1): `scripts/lab-validate.mjs` once
 * required `lib/sprint-labs/validate/contamination.ts` UNCONDITIONALLY at module top level.
 * `contamination.ts` transitively imports `lib/ai-providers` -> `lib/usage-tracking` ->
 * `lib/firebase-admin`, which THROWS at require() time in any environment with no Firebase Admin
 * configuration -- crashing plain `lab:validate` and `--dynamic` themselves at import time, before
 * either flag branch ever ran, even though neither command has ever needed Firebase or an AI
 * provider key. The fix moved that `require` behind a lazy loader called ONLY from inside the
 * `--contamination` branch.
 *
 * A vitest-level test of this would not have caught the original bug and cannot prove the fix:
 * `vitest.setup.ts` globally mocks `firebase-admin` for every test file, so an in-process import of
 * `contamination.ts` never touches the real SDK either way. This test spawns the script as a REAL
 * subprocess -- no such mock exists there -- against the small, fast, already-committed `happy-path`
 * fixture (not `workbooks/meridian`, so this stays fast and independent of that workbook's evolving
 * content).
 */
import { spawnSync } from "node:child_process"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const ROOT = join(__dirname, "..", "..", "..", "..")
const TSX_BIN = join(ROOT, "node_modules", ".bin", "tsx")
const FIXTURE = join(__dirname, "..", "dynamic", "__tests__", "fixtures", "happy-path")

function runLabValidate(flags: string[]) {
  return spawnSync(TSX_BIN, ["scripts/lab-validate.mjs", ...flags, FIXTURE], {
    cwd: ROOT,
    encoding: "utf8",
    env: process.env,
  })
}

describe("scripts/lab-validate.mjs -- plain and --dynamic never load contamination's Firebase-dependent chain", () => {
  it("plain lab:validate runs to completion without a Firebase Admin crash", () => {
    const result = runLabValidate([])

    expect(result.stderr).not.toContain("FirebaseAppError")
    expect(result.stderr).not.toContain("firebase-admin")
    expect(result.stdout).toContain("PASS")
  }, 45_000)

  it("--dynamic runs to completion without a Firebase Admin crash", () => {
    const result = runLabValidate(["--dynamic"])

    expect(result.stderr).not.toContain("FirebaseAppError")
    expect(result.stderr).not.toContain("firebase-admin")
    expect(result.stdout).toContain("PASS")
  }, 45_000)
})
