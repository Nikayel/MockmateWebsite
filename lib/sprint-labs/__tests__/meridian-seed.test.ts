/**
 * Materializes `workbooks/meridian/repo/**` (the day-one seed codebase every Meridian learner
 * inherits — docs/sprint-labs/WORKBOOK-SPEC.md §3) into the harness's file shape and replays its
 * own starter test suite through the same Node harness `lab validate`'s red/green gate will use
 * (lib/workspace-execution/ts-workspace/node-harness.ts). This is the seed's own verifier: every
 * one of its 19 starter cases must pass on the seed exactly as authored, and the file/line counts
 * must stay within the tolerance the seed was sized against, so drift (a file quietly added,
 * removed, or renamed by a later authoring pass) fails loudly here instead of silently.
 *
 * What this file deliberately does NOT do: assert anything about the seed's LATENT defects
 * (float money, the missing tenant filter, the premature "delivered" status, the documents N+1,
 * ...). Those are exactly what the seed's own 19 cases do not cover — per WORKBOOK-SPEC §3 they
 * stay latent until each sprint's ticket introduces the test that catches them. This file only
 * proves the seed is internally consistent and runs clean on day one; see AUTHORING-RULES.md §1-2
 * for why specific paths below (queue/outbox.ts, domain/tenant.ts, ...) must already exist here.
 */
import { readFileSync, readdirSync, statSync } from "node:fs"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

import { runTsWorkspace } from "@/lib/workspace-execution/ts-workspace/node-harness"
import type { TsWorkspaceFile } from "@/lib/workspace-execution/ts-workspace/types"

const currentDir = dirname(fileURLToPath(import.meta.url))
// lib/sprint-labs/__tests__ -> repo root (three levels up, same depth node-harness.ts itself uses).
const REPO_ROOT = join(currentDir, "..", "..", "..")
const MERIDIAN_SEED_DIR = join(REPO_ROOT, "workbooks/meridian/repo")

// WORKBOOK-SPEC.md §3 / SPRINT-PLAN.md "Sizing": 61 files, ~1,708 lines, 8 test files, 19 cases.
// Kept as a tolerance band (not an exact match) so a small, deliberate future edit does not
// require touching this test, while real drift (a whole module added or deleted without anyone
// noticing) still fails loudly.
const MIN_FILES = 55
const MAX_FILES = 70
const MIN_NON_TEST_LINES = 1400
const MAX_NON_TEST_LINES = 2000
const EXPECTED_TEST_FILE_COUNT = 8
const EXPECTED_TEST_CASE_COUNT = 19

/** Paths AUTHORING-RULES.md §1-2 and SPRINT-PLAN.md's "newSourceFiles is unreliable" fix item
 * name as ALREADY in the seed (a later sprint's ticket wrongly lists them as new) — a rename or
 * deletion of any of these silently breaks a cross-sprint fact this workbook's later content
 * depends on, so it is asserted here rather than left to be discovered downstream. */
const REQUIRED_SEED_PATHS = [
  "src/db/repositories/documents.ts",
  "src/db/repositories/claims.ts",
  "src/domain/tenant.ts",
  "src/db/repositories/tenants.ts",
  "src/queue/outbox.ts",
  "src/delivery/retry.ts",
  "src/delivery/signature.ts",
  "src/extract/schema.ts",
  "src/extract/retrieval.ts",
  "test/fixtures/claims.json",
  "test/fixtures/tenants.sql",
  "migrations/0001_init.sql",
  "migrations/0002_webhooks.sql",
  "migrations/0003_indexes.sql",
]

/** AUTHORING-RULES.md §1: "one name per file, forever" — these are the specific alternate
 * spellings the rule calls out by name as never to be used. */
const FORBIDDEN_ALTERNATE_PATHS = [
  "src/db/repositories/outbox-repository.ts",
  "src/db/repositories/claim-repository.ts",
]

function listFilesRecursive(dir: string, base = dir): string[] {
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return []
  }
  const out: string[] = []
  for (const name of entries.sort()) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      out.push(...listFilesRecursive(full, base))
    } else {
      out.push(relative(base, full).split("\\").join("/"))
    }
  }
  return out.sort()
}

/** Counts lines the way an editor status bar would: a trailing newline is not one more
 * (phantom, empty) line. */
function countLines(content: string): number {
  if (content.length === 0) return 0
  const withoutTrailingNewline = content.endsWith("\n") ? content.slice(0, -1) : content
  return withoutTrailingNewline.split("\n").length
}

function loadSeedRepo(): { files: TsWorkspaceFile[]; allPaths: string[] } {
  const allPaths = listFilesRecursive(MERIDIAN_SEED_DIR)
  const files = allPaths.map((path) => ({
    path,
    content: readFileSync(join(MERIDIAN_SEED_DIR, path), "utf8"),
  }))
  return { files, allPaths }
}

describe("Meridian seed repo (workbooks/meridian/repo)", () => {
  it("stays within the seed's sized file-count and non-test-line-count tolerance", () => {
    const { files, allPaths } = loadSeedRepo()

    expect(allPaths.length).toBeGreaterThanOrEqual(MIN_FILES)
    expect(allPaths.length).toBeLessThanOrEqual(MAX_FILES)

    const testPaths = allPaths.filter((path) => path.endsWith(".test.ts"))
    expect(testPaths).toHaveLength(EXPECTED_TEST_FILE_COUNT)

    const nonTestLines = files
      .filter((file) => !file.path.endsWith(".test.ts"))
      .reduce((total, file) => total + countLines(file.content), 0)

    expect(nonTestLines).toBeGreaterThanOrEqual(MIN_NON_TEST_LINES)
    expect(nonTestLines).toBeLessThanOrEqual(MAX_NON_TEST_LINES)
  })

  it("keeps every AUTHORING-RULES-required path present, under its one permanent name", () => {
    const { allPaths } = loadSeedRepo()

    for (const requiredPath of REQUIRED_SEED_PATHS) {
      expect(allPaths).toContain(requiredPath)
    }
    for (const forbiddenPath of FORBIDDEN_ALTERNATE_PATHS) {
      expect(allPaths).not.toContain(forbiddenPath)
    }
  })

  it("runs all 19 starter cases through the Node harness and every one passes", async () => {
    const { files, allPaths } = loadSeedRepo()
    const testPaths = allPaths.filter((path) => path.endsWith(".test.ts"))

    const result = await runTsWorkspace({
      files,
      testPaths,
      hiddenTestPaths: [],
    })

    expect(result.error).toBeNull()
    expect(result.summary.total).toBe(EXPECTED_TEST_CASE_COUNT)
    expect(result.summary.passed).toBe(EXPECTED_TEST_CASE_COUNT)
    expect(result.summary.failed).toBe(0)
    expect(result.results.every((testCase) => testCase.passed)).toBe(true)
    expect(result.success).toBe(true)
  })
})
