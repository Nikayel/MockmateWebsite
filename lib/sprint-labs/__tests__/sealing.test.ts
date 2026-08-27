/**
 * Sealing tests for the Sprint Labs content compiler (docs/sprint-labs/
 * PLAN.md Task 2), mirroring lib/bugfix/packs/__tests__/sealing.test.ts's
 * import-graph check:
 *   1. every generated sealed module carries the runtime `typeof window`
 *      throw (the guard that fires if a leak ever reaches the browser);
 *   2. only whitelisted server routes import the sealed registry loader
 *      (empty today — no consumer route exists yet; Tasks 6/8/14 add their
 *      route path here when they start reading sealed content);
 *   3. no client component imports any sealed sprint-labs module, by alias
 *      or relative path;
 *   4. the compiled PUBLIC registry/content never imports the sealed tree
 *      at all (an extra, direction-specific check this split's shape makes
 *      possible).
 */

import { execSync } from "node:child_process"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()
const SEALED_DIR = join(ROOT, "lib/scenarios/sealed/sprint-labs")
const PUBLIC_DIR = join(ROOT, "lib/sprint-labs/content")

function grepImporters(pattern: string): string[] {
  try {
    const out = execSync(
      `grep -rlE --include=*.ts --include=*.tsx "${pattern}" app components lib hooks 2>/dev/null || true`,
      { cwd: ROOT, encoding: "utf8" }
    )
    return out
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

function listFilesRecursive(dir: string): string[] {
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return []
  }
  const out: string[] = []
  for (const name of entries) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...listFilesRecursive(full))
    else out.push(full)
  }
  return out
}

describe("Sealing test 1 — every generated sealed module has the runtime window guard", () => {
  it("every *.server.ts under lib/scenarios/sealed/sprint-labs throws if loaded in a browser", () => {
    const serverFiles = listFilesRecursive(SEALED_DIR).filter((f) => f.endsWith(".server.ts"))
    expect(serverFiles.length).toBeGreaterThan(0)
    for (const file of serverFiles) {
      const content = readFileSync(file, "utf8")
      expect(content, `${file} is missing the typeof window guard`).toContain(
        'if (typeof window !== "undefined")'
      )
      expect(content, `${file}'s window guard does not throw`).toMatch(
        /typeof window[\s\S]{0,80}throw new Error/
      )
    }
  })
})

describe("Sealing test 2 — sealed sprint-labs content is imported only by server routes", () => {
  // No consumer exists yet (Task 2 only builds the compiler + registries).
  // Tasks 6 (runs), 8 (grading/submit), and 14 (Sable partner) add their
  // route path here when they start calling loadSealedTicket/hasSealedTicket.
  const ALLOWED_IMPORTERS = new Set<string>([])

  it("only the whitelisted server routes import the sealed sprint-labs registry loader", () => {
    const importers = grepImporters("scenarios/sealed/sprint-labs/registry.server").filter(
      (path) => !path.includes("__tests__") && !path.startsWith("lib/scenarios/sealed/")
    )
    for (const importer of importers) {
      expect(
        ALLOWED_IMPORTERS.has(importer),
        `${importer} imports the sealed sprint-labs registry`
      ).toBe(true)
    }
  })

  it("no client component imports any sealed sprint-labs module (alias OR relative path)", () => {
    const importers = grepImporters("sealed/sprint-labs/[a-zA-Z0-9_/-]+\\.server").filter(
      (path) => !path.includes("__tests__") && !path.startsWith("lib/scenarios/sealed/")
    )
    for (const importer of importers) {
      const contents = readFileSync(join(ROOT, importer), "utf8")
      expect(
        contents.includes('"use client"'),
        `${importer} is a client component importing sealed content`
      ).toBe(false)
    }
  })
})

describe("Sealing test 3 — the compiled public bundle never reaches into the sealed tree", () => {
  it("no file under lib/sprint-labs/content imports anything from lib/scenarios/sealed", () => {
    const publicFiles = listFilesRecursive(PUBLIC_DIR).filter((f) => f.endsWith(".ts"))
    expect(publicFiles.length).toBeGreaterThan(0)
    for (const file of publicFiles) {
      const content = readFileSync(file, "utf8")
      expect(content, `${file} imports from the sealed tree`).not.toMatch(/scenarios\/sealed/)
    }
  })
})
