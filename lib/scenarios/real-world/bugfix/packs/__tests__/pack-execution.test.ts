// @vitest-environment node
/**
 * Executes EVERY registered pack for real, with python3, the way the candidate's
 * browser will.
 *
 * pack-suite.test.ts checks that authored strings agree with each other — it
 * compares `sealed.buggyOutput` against `pack.expectedOutput`, both hand-written.
 * Nothing there runs the source, so a pack whose `runCmd` or fixture paths do not
 * resolve, or whose starter code no longer produces the authored buggy output,
 * still passes. That blind spot is exactly how the runtime shipped broken: the
 * scenario was structurally valid, and no test ever ran it.
 *
 * This suite closes it: materialize the workspace, run `runCmd`, compare bytes.
 */
import { execFileSync } from "node:child_process"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { describe, expect, it } from "vitest"

import { packToScenario } from "@/lib/bugfix/packs/scenario"
import { diffStdout } from "@/lib/bugfix/packs/stdout-oracle"
import { parseRunCmd } from "@/lib/workspace-execution"
import { loadSealedPack } from "@/lib/scenarios/sealed/registry.server"
import type { BugfixPack } from "@/lib/bugfix/packs/types"
import { bugfixPacks } from "../index"

const PYTHON_BIN = process.env.PYTHON || "python3"

/** Run the pack's real `runCmd` in a materialized workspace, returning exact stdout. */
function runPack(pack: BugfixPack): string {
  const scenario = packToScenario(pack)
  const root = mkdtempSync(join(tmpdir(), `pack-exec-${pack.id}-`))

  try {
    for (const file of scenario.workspace.files) {
      const filePath = join(root, file.path)
      mkdirSync(dirname(filePath), { recursive: true })
      writeFileSync(filePath, file.content)
    }

    const { argv } = parseRunCmd(pack.runCmd)
    return execFileSync(PYTHON_BIN, argv, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    })
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

describe("bugfix pack execution", () => {
  for (const pack of bugfixPacks) {
    describe(`pack: ${pack.id}`, () => {
      it("runs its runCmd against its fixtures without crashing", () => {
        expect(() => runPack(pack)).not.toThrow()
      })

      it("produces the exact buggy output the sealed module claims", async () => {
        const sealed = await loadSealedPack(pack.id)
        expect(runPack(pack)).toBe(sealed!.buggyOutput)
      })

      it("starter output is genuinely wrong against the oracle", () => {
        expect(diffStdout(runPack(pack), pack.expectedOutput).match).toBe(false)
      })
    })
  }
})
