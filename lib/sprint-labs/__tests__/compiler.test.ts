/**
 * Compiler tests (docs/sprint-labs/PLAN.md Task 2). Covers this task's four
 * explicit verification points: the compiler round-trips the fixture
 * workbook, the leak-gate has a red case, output is deterministic, and a
 * Zod validation failure surfaces the offending file path.
 *
 * The round-trip / determinism / Zod-failure suites spawn the REAL CLI via
 * tsx as a subprocess. They deliberately do NOT import compile-workbooks.mjs's
 * schema-dependent functions (`compileWorkbook`, `main`) directly into this
 * vitest process: that combination doesn't resolve (see
 * scripts/compile-workbooks.mjs's file header for the empirical reason —
 * Task 1's types.ts uses extensionless internal imports that only tsx's
 * loader, not vitest's `createRequire`-bypassing native `require`, resolves
 * correctly). The leak-gate suite imports `assertPublicSafe`/`SECRET_FIELDS`
 * directly: those two exports touch no Task 1 schema, so a plain vitest
 * import of the .mjs file is safe (confirmed: nothing at module scope in
 * compile-workbooks.mjs calls `schemas()`).
 */

import { execFileSync } from "node:child_process"
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
  mkdirSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { afterEach, describe, expect, it } from "vitest"
import { assertPublicSafe, SECRET_FIELDS } from "../../../scripts/compile-workbooks.mjs"
import {
  sprintPublicSchema,
  ticketPublicSchema,
  ticketSecretMetaSchema,
  workbookSummarySchema,
} from "../types"
import type { CompiledTicket } from "../content/types"
import type { SealedTicketContent } from "@/lib/scenarios/sealed/sprint-labs/types"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, "../../..")
const TSX_BIN = join(ROOT, "node_modules/.bin/tsx")
const COMPILER = join(ROOT, "scripts/compile-workbooks.mjs")
const FIXTURE_DIR = join(ROOT, "workbooks/_fixture-workbook")

const tmpDirsToClean: string[] = []
afterEach(() => {
  while (tmpDirsToClean.length > 0) {
    const dir = tmpDirsToClean.pop()
    if (dir) rmSync(dir, { recursive: true, force: true })
  }
})

function makeTmpDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  tmpDirsToClean.push(dir)
  return dir
}

function runCompiler(
  targetDir: string,
  publicDir: string,
  sealedDir: string
): { status: number; stdout: string; stderr: string } {
  try {
    const stdout = execFileSync(
      TSX_BIN,
      [COMPILER, targetDir, "--public-dir", publicDir, "--sealed-dir", sealedDir],
      { cwd: ROOT, encoding: "utf8" }
    )
    return { status: 0, stdout, stderr: "" }
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string }
    return { status: e.status ?? 1, stdout: e.stdout ?? "", stderr: e.stderr ?? "" }
  }
}

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

describe("compile-workbooks: round-trip", () => {
  it("compiles the fixture workbook and every generated public file re-validates against Task 1 schemas", async () => {
    const base = makeTmpDir("sprint-labs-roundtrip-")
    const publicDir = join(base, "public")
    const sealedDir = join(base, "sealed")

    const result = runCompiler(FIXTURE_DIR, publicDir, sealedDir)
    expect(result.stderr + result.stdout).not.toContain("FAILED")
    expect(result.status).toBe(0)

    const registryPath = join(publicDir, "registry.ts")
    const registry = await import(/* @vite-ignore */ registryPath)

    const summary = registry.getWorkbookSummary("fixture-demo")
    expect(workbookSummarySchema.safeParse(summary).success).toBe(true)
    expect(summary.id).toBe("fixture-demo")

    const sprint1 = registry.getSprint("fixture-demo", 1)
    expect(sprintPublicSchema.safeParse(sprint1).success).toBe(true)

    const demo101 = registry.getTicket("fixture-demo", "DEMO-101") as CompiledTicket
    const demo102 = registry.getTicket("fixture-demo", "DEMO-102") as CompiledTicket
    expect(ticketPublicSchema.safeParse(demo101.ticket).success).toBe(true)
    expect(ticketPublicSchema.safeParse(demo102.ticket).success).toBe(true)
    expect(demo101.ticket.aiPolicy).toBe("assisted")
    expect(demo102.ticket.aiPolicy).toBe("unassisted")
    expect(demo102.ticket.aiPolicyReason).toBeTruthy()

    // Hidden-test metadata: every entry validates as TicketSecretMeta and
    // (being .strict()) would already reject a stray expected/input/body —
    // assertPublicSafe below is the second, independent layer.
    for (const meta of [...demo101.hiddenTests, ...demo102.hiddenTests]) {
      expect(ticketSecretMetaSchema.safeParse(meta).success).toBe(true)
    }
    expect(demo101.hiddenTests[0].kind).toBe("probe")
    expect(demo102.hiddenTests.every((h) => h.kind === "io-case")).toBe(true)

    // The on-disk public artifact, reloaded fresh, still passes the leak-gate.
    expect(() => assertPublicSafe(summary, "round-trip:workbook")).not.toThrow()
    expect(() => assertPublicSafe(sprint1, "round-trip:sprint")).not.toThrow()
    expect(() => assertPublicSafe(demo101, "round-trip:DEMO-101")).not.toThrow()
    expect(() => assertPublicSafe(demo102, "round-trip:DEMO-102")).not.toThrow()

    // The sealed half actually carries the secret data (imported directly
    // here is safe: this is a Node test process, not a browser, so the
    // `typeof window` guard does not fire).
    const sealed102Path = join(sealedDir, "fixture-demo/DEMO-102.server.ts")
    const sealed102 = (await import(/* @vite-ignore */ sealed102Path)).sealed as SealedTicketContent
    expect(sealed102.review?.some((c) => c.correct === false)).toBe(true)
    const ioCase = sealed102.hiddenCases.find((c) => c.id === "v1-still-accepts-page")
    expect(ioCase?.expected).toEqual({ status: 200, deprecationHeaderPresent: true })
    expect(sealed102.referenceDiff).toContain("compatibilityDescriptor")
    expect(sealed102.authorBrief?.intent).toBeTruthy()

    const sealed101Path = join(sealedDir, "fixture-demo/DEMO-101.server.ts")
    const sealed101 = (await import(/* @vite-ignore */ sealed101Path)).sealed as SealedTicketContent
    expect(sealed101.hiddenCases[0].kind).toBe("probe")
    expect(sealed101.hiddenCases[0].body).toContain("assert(")
    expect(sealed101.adversaryFiles.length).toBeGreaterThan(0)
    expect(sealed101.rubric.weights.problemSolving).toBeCloseTo(0.35)
  })
})

describe("compile-workbooks: determinism", () => {
  it("two independent compiles of the same fixture produce byte-identical output", () => {
    const base = makeTmpDir("sprint-labs-determinism-")
    const publicA = join(base, "a-public")
    const sealedA = join(base, "a-sealed")
    const publicB = join(base, "b-public")
    const sealedB = join(base, "b-sealed")

    expect(runCompiler(FIXTURE_DIR, publicA, sealedA).status).toBe(0)
    expect(runCompiler(FIXTURE_DIR, publicB, sealedB).status).toBe(0)

    const publicFilesA = listFilesRecursive(publicA)
    const publicFilesB = listFilesRecursive(publicB)
    expect(publicFilesA).toEqual(publicFilesB)
    for (const relPath of publicFilesA) {
      expect(readFileSync(join(publicA, relPath), "utf8")).toBe(
        readFileSync(join(publicB, relPath), "utf8")
      )
    }

    const sealedFilesA = listFilesRecursive(sealedA)
    const sealedFilesB = listFilesRecursive(sealedB)
    expect(sealedFilesA).toEqual(sealedFilesB)
    for (const relPath of sealedFilesA) {
      expect(readFileSync(join(sealedA, relPath), "utf8")).toBe(
        readFileSync(join(sealedB, relPath), "utf8")
      )
    }
  })
})

describe("compile-workbooks: leak-gate (secret-classification allowlist)", () => {
  it("SECRET_FIELDS names the fields this compiler must never emit publicly", () => {
    for (const field of [
      "expected",
      "input",
      "body",
      "referenceDiff",
      "review",
      "correct",
      "rubric",
      "authorBrief",
    ]) {
      expect(SECRET_FIELDS.has(field)).toBe(true)
    }
  })

  it("does not throw on a clean public-shaped payload", () => {
    expect(() =>
      assertPublicSafe(
        {
          key: "DEMO-101",
          title: "x",
          hiddenTests: [{ id: "1", humanName: "h", tags: [], kind: "io-case" }],
        },
        "clean-fixture"
      )
    ).not.toThrow()
  })

  it("RED CASE: throws when a secret-classified field (io-case expected) leaks into a public-shaped payload", () => {
    const poisoned = {
      key: "DEMO-101",
      hiddenTests: [
        { id: "1", humanName: "h", tags: [], kind: "io-case", expected: "LEAKED_ANSWER" },
      ],
    }
    expect(() => assertPublicSafe(poisoned, "poisoned-fixture")).toThrow(
      /secret-classified field "expected"/
    )
  })

  it("RED CASE: throws when a probe body leaks into a public-shaped payload, nested inside an array", () => {
    const poisoned = { hiddenTests: [{ id: "1" }, { id: "2", body: "assert(true)" }] }
    expect(() => assertPublicSafe(poisoned, "poisoned-array")).toThrow(
      /secret-classified field "body"/
    )
  })

  it("RED CASE: throws when a review comment's correct verdict leaks into a public-shaped payload", () => {
    // Nested under a non-secret key ("comments", not "review") so the walk
    // reaches the "correct" field itself rather than stopping one level up.
    expect(() => assertPublicSafe({ comments: [{ correct: false }] }, "poisoned-review")).toThrow(
      /secret-classified field "correct"/
    )
  })
})

describe("compile-workbooks: fails loudly on an invalid workbook", () => {
  it("a ticket.md missing a required field surfaces the file path and never writes output", () => {
    const authoringDir = makeTmpDir("sprint-labs-invalid-authoring-")
    const workbookDir = join(authoringDir, "broken-workbook")
    mkdirSync(join(workbookDir, "sprints/01-x/tickets/BAD-1/tests/visible"), { recursive: true })
    mkdirSync(join(workbookDir, "sprints/01-x/tickets/BAD-1/tests/hidden"), { recursive: true })

    writeFileSync(
      join(workbookDir, "workbook.yaml"),
      [
        "id: broken-workbook",
        "title: Broken",
        "pitch: Broken on purpose",
        "track: Test",
        "language: typescript",
        "level: Test",
        "topics: [test]",
        "sprintCount: 1",
        "ticketCount: 1",
        "estimatedHours: 1",
        "requiresServerExecution: false",
        "objectives: []",
        "",
      ].join("\n")
    )
    writeFileSync(
      join(workbookDir, "sprints/01-x/sprint.yaml"),
      [
        "number: 1",
        "title: X",
        "goal: X",
        "standupQuote: X",
        "archMapDelta: {}",
        "objectives: []",
        "",
      ].join("\n")
    )
    // Missing `title` (required by ticketPublicSchema) on purpose.
    writeFileSync(
      join(workbookDir, "sprints/01-x/tickets/BAD-1/ticket.md"),
      [
        "---",
        "points: 1",
        "labels: []",
        "aiPolicy: assisted",
        "objectives: []",
        "---",
        "",
        "Body text.",
      ].join("\n")
    )

    const base = makeTmpDir("sprint-labs-invalid-output-")
    const publicDir = join(base, "public")
    const sealedDir = join(base, "sealed")
    const result = runCompiler(workbookDir, publicDir, sealedDir)

    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain(join(workbookDir, "sprints/01-x/tickets/BAD-1/ticket.md"))
    expect(result.stderr.toLowerCase()).toContain("title")
    expect(listFilesRecursive(publicDir)).toEqual([])
    expect(listFilesRecursive(sealedDir)).toEqual([])
  })
})
