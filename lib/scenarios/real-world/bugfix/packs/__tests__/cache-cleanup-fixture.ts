import { execFileSync } from "node:child_process"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import type { BugfixPack } from "@/lib/bugfix/packs/types"
import {
  buildPackOracleEntrypoint,
  decodePackStdout,
  parseRunCmd,
} from "@/lib/workspace-execution/python-sandbox/pack-oracle-runner"

export const FIXED_SWEEP = `def evict_expired(entries, now):
    survivors = []
    for entry in entries:
        if entry["expires_at"] > now:
            survivors.append(entry)
    return survivors

`

export const PINNED_SWEEP = FIXED_SWEEP.replace(
  'entry["expires_at"] > now',
  'entry["pinned"] or entry["expires_at"] > now'
)

export function withSweep(pack: BugfixPack, source: string): BugfixPack {
  return {
    ...pack,
    srcFiles: pack.srcFiles.map((file) => ({
      ...file,
      content: file.content.replace(
        /def evict_expired\(entries, now\):[\s\S]*?(?=\n(?:def |class )|$)/,
        source
      ),
    })),
  }
}

/** Materialize the actual authored program, not a reimplementation of its logic. */
export function runCachePack(pack: BugfixPack, fixture?: string, wrapped = false): string {
  const root = mkdtempSync(join(tmpdir(), "cache-cleanup-"))
  try {
    for (const file of [...pack.srcFiles, ...pack.fixtures]) {
      const path = join(root, file.path)
      mkdirSync(dirname(path), { recursive: true })
      writeFileSync(path, file.content)
    }
    if (fixture !== undefined) writeFileSync(join(root, pack.fixtures[0].path), fixture)
    const { argv } = parseRunCmd(pack.runCmd)
    const stdout = execFileSync(
      process.env.PYTHON || "python3",
      wrapped ? ["-c", buildPackOracleEntrypoint(pack.runCmd)] : argv,
      {
        cwd: root,
        encoding: "utf8",
        timeout: 5000,
        env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
      }
    )
    if (!wrapped) return stdout
    const decoded = decodePackStdout(stdout.split("\n"))
    if (decoded === null) throw new Error("Pack wrapper did not capture stdout")
    return decoded
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}
