/**
 * Guard: the pack interviewer routes are UNWIRED (tracked wire-or-quarantine decision).
 *
 * No client surface (app/ or components/) may fetch /api/interview/pack/advance or
 * /api/interview/pack/phase2 until the post-launch "wire the pack interviewer" work.
 * A started pack currently degrades to the generic bugfix interviewer by design.
 *
 * If this fails: either the pack interviewer was wired (then wire it end to end, remove the
 * UNWIRED route markers + the PACK_INTERVIEWER quarantine, and update this guard), or a
 * stray caller crept in and must be removed.
 */
import { execSync } from "node:child_process"
import { describe, expect, it } from "vitest"

function clientCallers(routePath: string): string[] {
  const out = execSync(`grep -rIn --include='*.ts' --include='*.tsx' "${routePath}" app components || true`, {
    cwd: process.cwd(),
    encoding: "utf8",
  })
  return out
    .split("\n")
    .filter(Boolean)
    .filter((line) => !line.includes("/pack/advance/route.ts"))
    .filter((line) => !line.includes("/pack/phase2/route.ts"))
    .filter((line) => !line.includes(".test."))
}

describe("pack interviewer routes are unwired", () => {
  it("has no client caller for /api/interview/pack/advance", () => {
    expect(clientCallers("/api/interview/pack/advance")).toEqual([])
  })

  it("has no client caller for /api/interview/pack/phase2", () => {
    expect(clientCallers("/api/interview/pack/phase2")).toEqual([])
  })
})
