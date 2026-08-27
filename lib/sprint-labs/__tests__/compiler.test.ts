/**
 * Compiler tests (docs/sprint-labs/PLAN.md Task 2). Covers this task's
 * explicit verification points plus controller review round 1's findings
 * (I-1 secret-side validation, I-2/R14 frontmatter casing, I-3 leak-gate
 * wiring, I-5 pruning, M-1/M-2 key format, M-3 review comment ids).
 *
 * The round-trip / determinism / negative-authoring suites spawn the REAL
 * CLI via tsx as a subprocess. They deliberately do NOT import
 * compile-workbooks.mjs's schema-dependent functions (`compileWorkbook`,
 * `main`) directly into this vitest process: that combination doesn't
 * resolve (see scripts/compile-workbooks.mjs's file header for the
 * empirical reason — Task 1's types.ts uses extensionless internal imports
 * that only tsx's loader, not vitest's `createRequire`-bypassing native
 * `require`, resolves correctly). The leak-gate and casing suites import
 * `assertPublicSafe`/`SECRET_FIELDS`/`writePublicFile`/`rejectWrongCasing`
 * directly: those exports touch no Task 1 schema, so a plain vitest import
 * is safe.
 */

import { spawnSync } from "node:child_process"
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { afterEach, describe, expect, it } from "vitest"
import {
  assertPublicSafe,
  rejectWrongCasing,
  SECRET_FIELDS,
  writePublicFile,
} from "../../../scripts/compile-workbooks.mjs"
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

/**
 * `workbooksRoot` defaults to `targetDir`'s own parent directory. Pruning
 * (and no-args auto-discovery) needs SOME "workbooks/ tree" to treat as
 * authoritative; passing an explicit `--workbooks-root` here is what keeps
 * a temp-dir compile from having its own just-written output declared
 * "not authored" and deleted by pruning, which scans the real repo's
 * workbooks/ by default (see compile-workbooks.mjs's discoverAuthoredWorkbooks
 * doc comment — this was a real bug, not just a test-setup nuance).
 *
 * Uses `spawnSync`, not `execFileSync`: `execFileSync`'s return value is
 * stdout ONLY on success (stderr is piped but discarded unless the process
 * throws), which silently ate every pruning warning printed on a
 * SUCCESSFUL compile (`console.error` writes to stderr) — a real bug in
 * this helper, caught while writing the empty-root refusal test below,
 * whose whole point is asserting on stderr text after a status-0 run.
 * `spawnSync` returns {stdout, stderr, status} uniformly either way.
 */
function runCompiler(
  targetDir: string,
  publicDir: string,
  sealedDir: string,
  workbooksRoot: string = dirname(targetDir)
): { status: number; stdout: string; stderr: string } {
  const result = spawnSync(
    TSX_BIN,
    [
      COMPILER,
      targetDir,
      "--public-dir",
      publicDir,
      "--sealed-dir",
      sealedDir,
      "--workbooks-root",
      workbooksRoot,
    ],
    { cwd: ROOT, encoding: "utf8" }
  )
  return { status: result.status ?? 1, stdout: result.stdout ?? "", stderr: result.stderr ?? "" }
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

function writeFileText(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content)
}

/**
 * A complete, minimal, VALID workbook authoring tree (1 objective, 1
 * sprint, 1 ticket, every required artifact present) — the shared base for
 * every negative-authoring test below. Each test overwrites or adds
 * exactly the one file it wants to break.
 */
function scaffoldMinimalWorkbook(
  baseDir: string,
  opts: { workbookId?: string; ticketKey?: string } = {}
): { wbDir: string; ticketDir: string; sprintYamlPath: string; ticketMdPath: string } {
  const workbookId = opts.workbookId ?? "temp-wb"
  const ticketKey = opts.ticketKey ?? "TMP-1"
  const wbDir = join(baseDir, "wb")
  const ticketDir = join(wbDir, `sprints/01-x/tickets/${ticketKey}`)
  const sprintYamlPath = join(wbDir, "sprints/01-x/sprint.yaml")
  const ticketMdPath = join(ticketDir, "ticket.md")

  writeFileText(
    join(wbDir, "workbook.yaml"),
    [
      `id: ${workbookId}`,
      "title: Temp",
      "pitch: Temp",
      "track: Test",
      "language: typescript",
      "level: Test",
      "topics: [test]",
      "sprintCount: 1",
      "ticketCount: 1",
      "estimatedHours: 1",
      "requiresServerExecution: false",
      "objectives:",
      "  - id: obj-1",
      "    label: Obj",
      "    canDo: I can do the thing.",
      "",
    ].join("\n")
  )
  writeFileText(
    sprintYamlPath,
    [
      "number: 1",
      "title: X",
      "goal: X",
      "standupQuote: X",
      "archMapDelta: {}",
      "objectives: [obj-1]",
      "",
    ].join("\n")
  )
  writeFileText(
    ticketMdPath,
    [
      "---",
      "title: Temp ticket",
      "points: 1",
      "labels: []",
      "ai_policy: assisted",
      "objectives: [obj-1]",
      "---",
      "",
      "Body.",
      "",
    ].join("\n")
  )
  writeFileText(join(ticketDir, "tests/visible/x.test.ts"), "// placeholder\n")
  writeFileText(join(ticketDir, "reference.diff"), "diff --git a/x b/x\n")
  writeFileText(
    join(ticketDir, "rubric.yaml"),
    [
      "weights:",
      "  understanding: 0.2",
      "  problemSolving: 0.2",
      "  codeQuality: 0.2",
      "  communication: 0.2",
      "  verification: 0.2",
      "notes: {}",
      "",
    ].join("\n")
  )
  return { wbDir, ticketDir, sprintYamlPath, ticketMdPath }
}

function compile(wbDir: string): { status: number; stdout: string; stderr: string } {
  const outBase = makeTmpDir("sprint-labs-compile-out-")
  return runCompiler(wbDir, join(outBase, "public"), join(outBase, "sealed"))
}

// ============================================================
// Round-trip (generalized per review round 1, I-3a: drive off
// registry.workbookIds() -> every sprint -> every ticket, not a hardcoded
// "fixture-demo" — so Meridian gets this coverage automatically).
// ============================================================

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

    const ids: string[] = registry.workbookIds()
    expect(ids).toContain("fixture-demo")

    for (const workbookId of ids) {
      const summary = registry.getWorkbookSummary(workbookId)
      expect(workbookSummarySchema.safeParse(summary).success).toBe(true)
      expect(() => assertPublicSafe(summary, `round-trip:${workbookId}:summary`)).not.toThrow()

      const content = await registry.loadWorkbookContent(workbookId)
      expect(content).not.toBeNull()
      for (const sprint of content.sprints) {
        expect(sprintPublicSchema.safeParse(sprint).success).toBe(true)
        expect(() =>
          assertPublicSafe(sprint, `round-trip:${workbookId}:sprint-${sprint.number}`)
        ).not.toThrow()
      }
      for (const [ticketKey, compiledTicket] of Object.entries(content.ticketsByKey) as [
        string,
        CompiledTicket,
      ][]) {
        expect(ticketPublicSchema.safeParse(compiledTicket.ticket).success).toBe(true)
        for (const meta of compiledTicket.hiddenTests) {
          expect(ticketSecretMetaSchema.safeParse(meta).success).toBe(true)
        }
        expect(() =>
          assertPublicSafe(compiledTicket, `round-trip:${workbookId}:${ticketKey}`)
        ).not.toThrow()
      }
    }

    // Fixture-specific spot checks (in addition to the generic scan above).
    const content = await registry.loadWorkbookContent("fixture-demo")
    const demo101 = content.ticketsByKey["DEMO-101"] as CompiledTicket
    const demo102 = content.ticketsByKey["DEMO-102"] as CompiledTicket
    expect(demo101.ticket.aiPolicy).toBe("assisted")
    expect(demo102.ticket.aiPolicy).toBe("unassisted")
    expect(demo102.ticket.aiPolicyReason).toBeTruthy()
    expect(demo101.hiddenTests[0].kind).toBe("probe")
    expect(demo102.hiddenTests.every((h) => h.kind === "io-case")).toBe(true)

    const sealed102Path = join(sealedDir, "fixture-demo/DEMO-102.server.ts")
    const sealed102 = (await import(/* @vite-ignore */ sealed102Path)).sealed as SealedTicketContent
    expect(sealed102.review?.some((c) => c.correct === false)).toBe(true)
    expect(sealed102.review?.map((c) => c.id)).toEqual([
      "missing-sunset-date",
      "just-remove-page-param",
    ])
    // Sprint Labs Task 7 review round 2: DEMO-102's io-cases were retargeted at a real
    // entryPoint (compatibilityDescriptor) with input/expected shapes that actually match its
    // signature -- there is no HTTP layer anywhere in this fixture to produce a status code or
    // header, so the original `{status, deprecationHeaderPresent}` shape could never have been
    // executed by any mechanism.
    const ioCase = sealed102.hiddenCases.find((c) => c.id === "v1-still-accepts-page")
    expect(ioCase?.expected).toEqual({
      parameters: { page: { status: "deprecated" }, per_page: { status: "deprecated" } },
    })
    expect(ioCase?.entryPoint).toEqual({
      module: "src/http/compatibility-descriptor.ts",
      export: "compatibilityDescriptor",
    })
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

// ============================================================
// Leak-gate: the pure classification/scan functions, PLUS (I-3/M-7) a
// direct test of the write-site chokepoint, since deleting an ad hoc
// assertPublicSafe call elsewhere would leave those older tests green.
// ============================================================

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
      // The sealed SQL-hidden-test subsystem (S3 review Critical finding):
      // a SQL hidden assertion's own SQL and its expected outcome.
      "sql",
      "expect",
      "sqlHiddenAssertions",
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

  it("RED CASE: throws when a SQL hidden assertion's sql leaks into a public-shaped payload (the S3 review's leak class)", () => {
    // Nested under "hiddenTests" (a legitimate PUBLIC wrapper key, not itself
    // secret-classified -- see the "correct"/"body" RED CASEs above for the
    // same pattern), so the walk reaches "sql" itself rather than stopping
    // one level up at a wrapper key.
    const poisoned = {
      hiddenTests: [{ id: "1", humanName: "h", tags: [], sql: "SELECT secret FROM answers;" }],
    }
    expect(() => assertPublicSafe(poisoned, "poisoned-sql")).toThrow(
      /secret-classified field "sql"/
    )
  })

  it("RED CASE: throws when a SQL hidden assertion's expect leaks into a public-shaped payload, even without the sqlHiddenAssertions wrapper key", () => {
    // Nested under a non-secret key, mirroring the "correct" RED CASE below --
    // proves the scan catches `expect` on its own, not only alongside `sql`.
    const poisoned = { hiddenTests: [{ id: "1", expect: { raises: "row-level security" } }] }
    expect(() => assertPublicSafe(poisoned, "poisoned-sql-expect")).toThrow(
      /secret-classified field "expect"/
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

describe("compile-workbooks: writePublicFile is the leak-gate chokepoint (I-3/M-7)", () => {
  it("throws and writes NOTHING when the payload carries a secret-classified field", async () => {
    // assertPublicSafe throws SYNCHRONOUSLY, but writePublicFile is now an
    // async function (it awaits prettier formatting) — any synchronous
    // throw inside an async function surfaces as a REJECTED PROMISE to the
    // caller, never a synchronous throw, so this must assert on the
    // rejection, not wrap the call in `() => ...`.
    const base = makeTmpDir("sprint-labs-writepublicfile-poisoned-")
    const target = join(base, "poisoned.ts")
    await expect(
      writePublicFile(
        target,
        { hiddenTests: [{ expected: "LEAKED" }] },
        "// should never be written\n",
        "test"
      )
    ).rejects.toThrow(/secret-classified field "expected"/)
    expect(existsSync(target)).toBe(false)
  })

  it("writes the file when the payload is clean (the only path any renderer uses to reach disk)", async () => {
    const base = makeTmpDir("sprint-labs-writepublicfile-clean-")
    const target = join(base, "nested/clean.ts")
    await writePublicFile(target, { title: "fine" }, "export const x = 1\n", "test")
    expect(existsSync(target)).toBe(true)
    expect(readFileSync(target, "utf8")).toBe("export const x = 1\n")
  })
})

// ============================================================
// Frontmatter/YAML casing (review round 1, I-2 / ruling R14): the spec
// wins per-field. A cheap unit test of the shared helper covers every
// guarded pair; a handful of full-pipeline tests confirm each real
// authoring path (ticket.md, sprint.yaml, a hidden test, author_brief.yaml)
// actually calls it before the field can be silently dropped.
// ============================================================

describe("compile-workbooks: rejectWrongCasing (unit)", () => {
  const PAIRS: [string, string][] = [
    ["aiPolicy", "ai_policy"],
    ["aiPolicyReason", "ai_policy_reason"],
    ["payoff_for", "payoffFor"],
    ["acceptance_criteria", "acceptanceCriteria"],
    ["human_name", "humanName"],
    ["standup_quote", "standupQuote"],
    ["arch_map_delta", "archMapDelta"],
    ["sizing_notes", "sizingNotes"],
    ["concessionTriggers", "concession_triggers"],
    ["do_not_volunteer", "doNotVolunteer"],
    ["problem_solving", "problemSolving"],
    ["code_quality", "codeQuality"],
  ]

  it.each(PAIRS)("rejects %s in favor of %s", (wrongKey, rightKey) => {
    expect(() =>
      rejectWrongCasing({ [wrongKey]: "x" }, "some/file.yaml", wrongKey, rightKey)
    ).toThrow(new RegExp(`use "${rightKey}", not "${wrongKey}"`))
  })

  it("does not throw when only the right-cased key is present, or when data is null/undefined", () => {
    expect(() =>
      rejectWrongCasing({ ai_policy: "assisted" }, "f", "aiPolicy", "ai_policy")
    ).not.toThrow()
    expect(() => rejectWrongCasing(null, "f", "aiPolicy", "ai_policy")).not.toThrow()
    expect(() => rejectWrongCasing(undefined, "f", "aiPolicy", "ai_policy")).not.toThrow()
  })
})

describe("compile-workbooks: casing enforced end to end", () => {
  it("ticket.md: camelCase aiPolicy is rejected, naming ai_policy", () => {
    const base = makeTmpDir("sprint-labs-casing-ticket-")
    const { wbDir, ticketMdPath } = scaffoldMinimalWorkbook(base)
    writeFileText(
      ticketMdPath,
      [
        "---",
        "title: T",
        "points: 1",
        "labels: []",
        "aiPolicy: assisted",
        "objectives: [obj-1]",
        "---",
        "",
        "Body.",
      ].join("\n")
    )
    const result = compile(wbDir)
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('use "ai_policy", not "aiPolicy"')
  })

  it("ticket.md: snake_case payoff_for is rejected, naming payoffFor", () => {
    const base = makeTmpDir("sprint-labs-casing-payoff-")
    const { wbDir, ticketMdPath } = scaffoldMinimalWorkbook(base)
    writeFileText(
      ticketMdPath,
      [
        "---",
        "title: T",
        "points: 1",
        "labels: []",
        "ai_policy: assisted",
        "objectives: [obj-1]",
        "payoff_for: TMP-2",
        "---",
        "",
        "Body.",
      ].join("\n")
    )
    const result = compile(wbDir)
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('use "payoffFor", not "payoff_for"')
  })

  it("sprint.yaml: snake_case arch_map_delta is rejected, naming archMapDelta", () => {
    const base = makeTmpDir("sprint-labs-casing-sprint-")
    const { wbDir, sprintYamlPath } = scaffoldMinimalWorkbook(base)
    writeFileText(
      sprintYamlPath,
      [
        "number: 1",
        "title: X",
        "goal: X",
        "standupQuote: X",
        "arch_map_delta: {}",
        "objectives: [obj-1]",
        "",
      ].join("\n")
    )
    const result = compile(wbDir)
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('use "archMapDelta", not "arch_map_delta"')
  })

  it("hidden test yaml: snake_case human_name is rejected, naming humanName", () => {
    const base = makeTmpDir("sprint-labs-casing-hidden-")
    const { wbDir, ticketDir } = scaffoldMinimalWorkbook(base)
    writeFileText(
      join(ticketDir, "tests/hidden/case-1.yaml"),
      [
        'human_name: "Escaped: something"',
        "tags: []",
        "kind: probe",
        "body: assert(true)",
        "",
      ].join("\n")
    )
    const result = compile(wbDir)
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('use "humanName", not "human_name"')
  })

  it("author_brief.yaml: camelCase concessionTriggers is rejected, naming concession_triggers", () => {
    const base = makeTmpDir("sprint-labs-casing-brief-")
    const { wbDir, ticketDir } = scaffoldMinimalWorkbook(base)
    writeFileText(
      join(ticketDir, "author_brief.yaml"),
      [
        "intent: x",
        "decisions:",
        "  - decision: d",
        "    justification: j",
        "doNotVolunteer: []",
        "concessionTriggers: []",
        "",
      ].join("\n")
    )
    const result = compile(wbDir)
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('use "concession_triggers", not "concessionTriggers"')
  })
})

// ============================================================
// Secret-side validation (review round 1, I-1): rubric.yaml,
// author_brief.yaml, review.yaml, and hidden-test payload halves are now
// schema-checked, not just read and trusted.
// ============================================================

describe("compile-workbooks: review.yaml is validated, not just read (I-1/M-3)", () => {
  it("a bare top-level list (no `comments:` wrapper) is a CompileError, not a silently-empty round", () => {
    const base = makeTmpDir("sprint-labs-review-barelist-")
    const { wbDir, ticketDir } = scaffoldMinimalWorkbook(base)
    writeFileText(
      join(ticketDir, "review.yaml"),
      ["- id: c1", "  body: hi", "  correct: true", ""].join("\n")
    )
    const result = compile(wbDir)
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain("review.yaml")
  })

  it("zero comments is a CompileError", () => {
    const base = makeTmpDir("sprint-labs-review-empty-")
    const { wbDir, ticketDir } = scaffoldMinimalWorkbook(base)
    writeFileText(join(ticketDir, "review.yaml"), "comments: []\n")
    const result = compile(wbDir)
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain("at least one comment")
  })

  it("a comment missing its id is a CompileError", () => {
    const base = makeTmpDir("sprint-labs-review-noid-")
    const { wbDir, ticketDir } = scaffoldMinimalWorkbook(base)
    writeFileText(
      join(ticketDir, "review.yaml"),
      ["comments:", "  - body: hi", "    correct: true", ""].join("\n")
    )
    const result = compile(wbDir)
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain("review.yaml")
  })

  it("duplicate comment ids are a CompileError (M-3: ids key server-side release)", () => {
    const base = makeTmpDir("sprint-labs-review-dupeid-")
    const { wbDir, ticketDir } = scaffoldMinimalWorkbook(base)
    writeFileText(
      join(ticketDir, "review.yaml"),
      [
        "comments:",
        "  - id: c1",
        "    body: hi",
        "    correct: true",
        "  - id: c1",
        "    body: bye",
        "    correct: false",
        "",
      ].join("\n")
    )
    const result = compile(wbDir)
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('duplicate review comment id "c1"')
  })
})

describe("compile-workbooks: rubric.yaml / author_brief.yaml / hidden payloads are validated (I-1)", () => {
  it("rubric.yaml with a non-numeric weight is a CompileError", () => {
    const base = makeTmpDir("sprint-labs-rubric-bad-")
    const { wbDir, ticketDir } = scaffoldMinimalWorkbook(base)
    writeFileText(
      join(ticketDir, "rubric.yaml"),
      [
        "weights:",
        '  understanding: "not-a-number"',
        "  problemSolving: 0.2",
        "  codeQuality: 0.2",
        "  communication: 0.2",
        "  verification: 0.2",
        "notes: {}",
        "",
      ].join("\n")
    )
    const result = compile(wbDir)
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain("rubric.yaml")
  })

  it("author_brief.yaml with zero decisions is a CompileError", () => {
    const base = makeTmpDir("sprint-labs-brief-nodecisions-")
    const { wbDir, ticketDir } = scaffoldMinimalWorkbook(base)
    writeFileText(
      join(ticketDir, "author_brief.yaml"),
      ["intent: x", "decisions: []", "doNotVolunteer: []", "concession_triggers: []", ""].join("\n")
    )
    const result = compile(wbDir)
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain("author_brief.yaml")
  })

  it("an io-case hidden test missing `expected` is a CompileError", () => {
    const base = makeTmpDir("sprint-labs-iocase-noexpected-")
    const { wbDir, ticketDir } = scaffoldMinimalWorkbook(base)
    writeFileText(
      join(ticketDir, "tests/hidden/case-1.yaml"),
      ["humanName: Escaped case", "tags: []", "kind: io-case", "input: { a: 1 }", ""].join("\n")
    )
    const result = compile(wbDir)
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain("case-1.yaml")
  })

  it("a probe hidden test with an empty body is a CompileError", () => {
    const base = makeTmpDir("sprint-labs-probe-emptybody-")
    const { wbDir, ticketDir } = scaffoldMinimalWorkbook(base)
    writeFileText(
      join(ticketDir, "tests/hidden/case-1.yaml"),
      ["humanName: Escaped case", "tags: []", "kind: probe", 'body: ""', ""].join("\n")
    )
    const result = compile(wbDir)
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain("case-1.yaml")
  })

  it("a sql-assertion hidden test missing `sql` is a CompileError", () => {
    const base = makeTmpDir("sprint-labs-sqlassertion-nosql-")
    const { wbDir, ticketDir } = scaffoldMinimalWorkbook(base)
    writeFileText(
      join(ticketDir, "tests/hidden/case-1.yaml"),
      ["humanName: Escaped case", "tags: []", "kind: sql-assertion", "expect: zero-rows", ""].join(
        "\n"
      )
    )
    const result = compile(wbDir)
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain("case-1.yaml")
  })

  it("a sql-assertion hidden test with an unrecognized `expect` shape is a CompileError", () => {
    const base = makeTmpDir("sprint-labs-sqlassertion-badexpect-")
    const { wbDir, ticketDir } = scaffoldMinimalWorkbook(base)
    writeFileText(
      join(ticketDir, "tests/hidden/case-1.yaml"),
      [
        "humanName: Escaped case",
        "tags: []",
        "kind: sql-assertion",
        "sql: select 1;",
        "expect: not-a-real-shape",
        "",
      ].join("\n")
    )
    const result = compile(wbDir)
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain("case-1.yaml")
  })
})

// ============================================================
// M-1: duplicate / case-colliding ticket keys. M-2: id/key format.
// ============================================================

describe("compile-workbooks: ticket key uniqueness and format (M-1/M-2)", () => {
  it("a duplicate ticket key across two sprints is a CompileError", () => {
    const base = makeTmpDir("sprint-labs-dupe-ticket-")
    const { wbDir } = scaffoldMinimalWorkbook(base, { ticketKey: "TMP-1" })
    // A second sprint reusing the same ticket key.
    writeFileText(
      join(wbDir, "sprints/02-y/sprint.yaml"),
      [
        "number: 2",
        "title: Y",
        "goal: Y",
        "standupQuote: Y",
        "archMapDelta: {}",
        "objectives: [obj-1]",
        "",
      ].join("\n")
    )
    writeFileText(
      join(wbDir, "sprints/02-y/tickets/TMP-1/ticket.md"),
      [
        "---",
        "title: Dup",
        "points: 1",
        "labels: []",
        "ai_policy: assisted",
        "objectives: [obj-1]",
        "---",
        "",
        "Body.",
      ].join("\n")
    )
    const result = compile(wbDir)
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('duplicate ticket key "TMP-1"')
  })

  it("ticket keys colliding only via camel()'s hyphen-stripping (TMP-1 vs TMP1) are a CompileError", () => {
    // Not a same-case-differs-by-case pair (TMP-1 vs tmp-1): on a
    // case-insensitive-but-preserving filesystem (APFS, the default on
    // macOS — see repo-relocated-off-t7 memory note) creating "tmp-1" when
    // "TMP-1" already exists silently overwrites the SAME directory rather
    // than creating a second one, which would make this test pass for the
    // wrong reason (there would only ever be one ticket on disk). A
    // hyphen-vs-no-hyphen pair is genuinely two directories on every
    // filesystem and exercises the identical seenExportNames collision
    // check in compileWorkbook (camel("tmp-1") === camel("tmp1") === "tmp1").
    const base = makeTmpDir("sprint-labs-case-collide-")
    const { wbDir } = scaffoldMinimalWorkbook(base, { ticketKey: "TMP-1" })
    const secondTicketDir = join(wbDir, "sprints/01-x/tickets/TMP1")
    writeFileText(
      join(secondTicketDir, "ticket.md"),
      [
        "---",
        "title: Dup",
        "points: 1",
        "labels: []",
        "ai_policy: assisted",
        "objectives: [obj-1]",
        "---",
        "",
        "Body.",
      ].join("\n")
    )
    writeFileText(join(secondTicketDir, "reference.diff"), "diff\n")
    writeFileText(
      join(secondTicketDir, "rubric.yaml"),
      "weights: { understanding: 0.2, problemSolving: 0.2, codeQuality: 0.2, communication: 0.2, verification: 0.2 }\nnotes: {}\n"
    )
    const result = compile(wbDir)
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain("collides with")
  })

  it("a workbook id that is not a lowercase slug is a CompileError", () => {
    const base = makeTmpDir("sprint-labs-bad-workbook-id-")
    const { wbDir } = scaffoldMinimalWorkbook(base, { workbookId: "Not_A_Slug" })
    const result = compile(wbDir)
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain("lowercase slug")
  })

  it("a ticket key starting with a digit is a CompileError", () => {
    const base = makeTmpDir("sprint-labs-bad-ticket-key-")
    const { wbDir } = scaffoldMinimalWorkbook(base, { ticketKey: "1-BAD" })
    const result = compile(wbDir)
    expect(result.status).not.toBe(0)
    expect(result.stderr).toContain('ticket key "1-BAD"')
  })
})

// ============================================================
// I-5: pruning removes compiled output with no authored source.
// ============================================================

describe("compile-workbooks: pruning stale output (I-5)", () => {
  it("removes a ticket's compiled output once its authored directory is deleted", () => {
    const base = makeTmpDir("sprint-labs-prune-")
    const { wbDir, ticketDir: firstTicketDir } = scaffoldMinimalWorkbook(base, {
      ticketKey: "TMP-1",
    })
    // A second, sibling ticket in the same sprint.
    const secondTicketDir = join(wbDir, "sprints/01-x/tickets/TMP-2")
    writeFileText(
      join(secondTicketDir, "ticket.md"),
      [
        "---",
        "title: Second",
        "points: 1",
        "labels: []",
        "ai_policy: assisted",
        "objectives: [obj-1]",
        "---",
        "",
        "Body.",
      ].join("\n")
    )
    writeFileText(join(secondTicketDir, "reference.diff"), "diff\n")
    writeFileText(
      join(secondTicketDir, "rubric.yaml"),
      "weights: { understanding: 0.2, problemSolving: 0.2, codeQuality: 0.2, communication: 0.2, verification: 0.2 }\nnotes: {}\n"
    )

    const outBase = makeTmpDir("sprint-labs-prune-out-")
    const publicDir = join(outBase, "public")
    const sealedDir = join(outBase, "sealed")

    const first = runCompiler(wbDir, publicDir, sealedDir)
    expect(first.status).toBe(0)
    expect(existsSync(join(publicDir, "temp-wb/tickets/TMP-1.ts"))).toBe(true)
    expect(existsSync(join(publicDir, "temp-wb/tickets/TMP-2.ts"))).toBe(true)
    expect(existsSync(join(sealedDir, "temp-wb/TMP-2.server.ts"))).toBe(true)

    // TMP-2 is pulled from authoring.
    rmSync(secondTicketDir, { recursive: true, force: true })
    void firstTicketDir

    const second = runCompiler(wbDir, publicDir, sealedDir)
    expect(second.status).toBe(0)
    expect(existsSync(join(publicDir, "temp-wb/tickets/TMP-1.ts"))).toBe(true)
    expect(existsSync(join(publicDir, "temp-wb/tickets/TMP-2.ts"))).toBe(false)
    expect(existsSync(join(sealedDir, "temp-wb/TMP-2.server.ts"))).toBe(false)
  })
})

// ============================================================
// I-5 residual (review round 2, reproduced by the reviewer): a wrong,
// empty, or subset --workbooks-root used to prune EVERYTHING, including
// the workbook this same invocation had just compiled. Three layers now
// guard against that (see pruneStaleOutput's doc comment): self-protection
// of just-compiled ids, refuse-on-empty-scan, and --no-prune.
// ============================================================

describe("compile-workbooks: pruning safety against a wrong --workbooks-root (I-5 residual)", () => {
  it("refuses to prune (and deletes nothing) when --workbooks-root scans to zero workbooks", () => {
    const base = makeTmpDir("sprint-labs-prune-emptyroot-")
    const { wbDir } = scaffoldMinimalWorkbook(base, { ticketKey: "TMP-1" })
    const publicDir = join(base, "public")
    const sealedDir = join(base, "sealed")
    const emptyRoot = makeTmpDir("sprint-labs-prune-emptyroot-scan-")

    const result = runCompiler(wbDir, publicDir, sealedDir, emptyRoot)
    expect(result.status).toBe(0)
    expect(result.stderr).toContain("refusing to prune")
    expect(existsSync(join(publicDir, "temp-wb/tickets/TMP-1.ts"))).toBe(true)
    expect(existsSync(join(publicDir, "temp-wb/workbook.ts"))).toBe(true)
  })

  it("a subset --workbooks-root (that doesn't know about the just-compiled workbook) self-protects it", () => {
    const base = makeTmpDir("sprint-labs-prune-subsetroot-")
    const { wbDir } = scaffoldMinimalWorkbook(base, { ticketKey: "TMP-1", workbookId: "temp-wb" })
    const publicDir = join(base, "public")
    const sealedDir = join(base, "sealed")

    // A workbooks root that knows about a DIFFERENT workbook only — not
    // empty (so the refuse-on-empty-scan guard doesn't fire), but a subset
    // that never scans temp-wb's own authoring directory.
    const subsetRootBase = makeTmpDir("sprint-labs-prune-subsetroot-scan-")
    scaffoldMinimalWorkbook(subsetRootBase, { workbookId: "decoy-wb", ticketKey: "DECOY-1" })

    const result = runCompiler(wbDir, publicDir, sealedDir, subsetRootBase)
    expect(result.status).toBe(0)
    expect(result.stderr).not.toContain("refusing to prune")
    expect(existsSync(join(publicDir, "temp-wb/tickets/TMP-1.ts"))).toBe(true)
    expect(existsSync(join(publicDir, "temp-wb/workbook.ts"))).toBe(true)
    expect(existsSync(join(sealedDir, "temp-wb/TMP-1.server.ts"))).toBe(true)
  })
})

// ============================================================
// I-3 residual (review round 2): regenerateRegistries's public write used
// to bypass writePublicFile via a bare writeFileSync — the "every public
// emit goes through the one chokepoint" invariant was false for exactly
// that path. Structural checks below (source-scan, not behavioral: the
// registry payload is filenames/ids and would pass assertPublicSafe
// trivially either way, so the only thing worth proving is that the
// invariant holds structurally).
// ============================================================

describe("compile-workbooks: writePublicFile is the ONLY public write path (I-3 residual)", () => {
  const source = readFileSync(COMPILER, "utf8")

  it("regenerateRegistries writes registry.ts through writePublicFile, not a bare writeFileSync", () => {
    const fnStart = source.indexOf("async function regenerateRegistries(")
    expect(fnStart).toBeGreaterThan(-1)
    const fnEnd = source.indexOf("\n}\n", fnStart)
    expect(fnEnd).toBeGreaterThan(fnStart)
    const fnBody = source.slice(fnStart, fnEnd)
    expect(fnBody).toMatch(/writePublicFile\(\s*join\(publicDir,\s*"registry\.ts"\)/)
    expect(fnBody).not.toMatch(/writeFileSync\(\s*join\(publicDir/)
  })

  it("exactly the two known bare writeFileSync call sites exist in the source", () => {
    // 1: writePublicFile's own chokepoint call (every public emit).
    // 2: writeSealedFile's chokepoint call (every sealed emit — a per-ticket
    // sealed module or the sealed registry; NOT a public emit, so correctly
    // exempt from writePublicFile's assertPublicSafe gate, but still routed
    // through one shared, named function rather than scattered ad hoc). If
    // this count ever changes, a human must look at the new call site and
    // decide whether it needs to route through writePublicFile instead.
    const matches = source.match(/\bwriteFileSync\(/g) ?? []
    expect(matches.length).toBe(2)
  })
})

// ============================================================
// Zod validation failures surface the offending file path.
// ============================================================

describe("compile-workbooks: fails loudly on an invalid workbook", () => {
  it("a ticket.md missing a required field surfaces the file path and never writes output", () => {
    const authoringDir = makeTmpDir("sprint-labs-invalid-authoring-")
    const workbookDir = join(authoringDir, "broken-workbook")
    mkdirSync(join(workbookDir, "sprints/01-x/tickets/BAD-1/tests/visible"), { recursive: true })
    mkdirSync(join(workbookDir, "sprints/01-x/tickets/BAD-1/tests/hidden"), { recursive: true })

    writeFileText(
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
    writeFileText(
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
    writeFileText(
      join(workbookDir, "sprints/01-x/tickets/BAD-1/ticket.md"),
      [
        "---",
        "points: 1",
        "labels: []",
        "ai_policy: assisted",
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

// ============================================================
// ticketCount/points/topic and workbook-level seedStats/inheritedDefects
// (PLAN.md Task 16: `SprintPublic` gains optional ticketCount/points/topic;
// `WorkbookSummary` gains optional seedStats/inheritedDefects). Both are
// additive, optional fields, so the negative-authoring suites above (which
// never author any of them) are an implicit regression check that omitting
// them still compiles -- these two suites cover the field-computation and
// pass-through behavior itself.
// ============================================================

describe("compile-workbooks: sprint ticketCount/points are derived, topic passes through (Task 16)", () => {
  it("computes ticketCount/points as the count and point-sum of the sprint's own compiled tickets, never authored", async () => {
    const authoringDir = makeTmpDir("sprint-labs-sprint-derived-")
    const { wbDir, sprintYamlPath } = scaffoldMinimalWorkbook(authoringDir, {
      workbookId: "derived-wb",
    })

    // The scaffold's own ticket (TMP-1) is worth 1 point. Add a second,
    // 5-point ticket to the same sprint so ticketCount/points can only be
    // right if BOTH tickets are counted and summed, not just one echoed back.
    const secondTicketDir = join(wbDir, "sprints/01-x/tickets/TMP-2")
    writeFileText(
      join(secondTicketDir, "ticket.md"),
      [
        "---",
        "title: Second ticket",
        "points: 5",
        "labels: []",
        "ai_policy: assisted",
        "objectives: [obj-1]",
        "---",
        "",
        "Body.",
        "",
      ].join("\n")
    )
    writeFileText(join(secondTicketDir, "tests/visible/y.test.ts"), "// placeholder\n")
    writeFileText(join(secondTicketDir, "reference.diff"), "diff --git a/y b/y\n")
    writeFileText(
      join(secondTicketDir, "rubric.yaml"),
      [
        "weights:",
        "  understanding: 0.2",
        "  problemSolving: 0.2",
        "  codeQuality: 0.2",
        "  communication: 0.2",
        "  verification: 0.2",
        "notes: {}",
        "",
      ].join("\n")
    )
    // sprint.yaml gains a `topic` -- purely passed through, no computation
    // involved, unlike ticketCount/points.
    writeFileText(
      sprintYamlPath,
      [
        "number: 1",
        "title: X",
        "goal: X",
        "standupQuote: X",
        "topic: Derived fields exercise",
        "archMapDelta: {}",
        "objectives: [obj-1]",
        "",
      ].join("\n")
    )

    const base = makeTmpDir("sprint-labs-sprint-derived-out-")
    const publicDir = join(base, "public")
    const sealedDir = join(base, "sealed")
    const result = runCompiler(wbDir, publicDir, sealedDir)
    expect(result.stderr + result.stdout).not.toContain("FAILED")
    expect(result.status).toBe(0)

    const registry = await import(/* @vite-ignore */ join(publicDir, "registry.ts"))
    const content = await registry.loadWorkbookContent("derived-wb")
    const sprint = content.sprints.find((s: { number: number }) => s.number === 1)
    expect(sprintPublicSchema.safeParse(sprint).success).toBe(true)
    expect(sprint.ticketCount).toBe(2)
    expect(sprint.points).toBe(6)
    expect(sprint.topic).toBe("Derived fields exercise")
  })

  it("leaves ticketCount and points undefined on a stub sprint with zero tickets yet", async () => {
    const authoringDir = makeTmpDir("sprint-labs-sprint-stub-")
    const wbDir = join(authoringDir, "wb")
    writeFileText(
      join(wbDir, "workbook.yaml"),
      [
        "id: stub-wb",
        "title: Stub",
        "pitch: Stub",
        "track: Test",
        "language: typescript",
        "level: Test",
        "topics: [test]",
        "sprintCount: 1",
        // The workbook-level ticketCount is an authored, aspirational total
        // (workbookSummarySchema requires it positive) -- unrelated to the
        // per-sprint, compiler-derived ticketCount this test is actually
        // about. It stays a plausible future total even while this sprint's
        // own tickets/ directory is still empty.
        "ticketCount: 5",
        "estimatedHours: 1",
        "requiresServerExecution: false",
        "objectives: []",
        "",
      ].join("\n")
    )
    // A sprint.yaml with no tickets/ directory at all yet -- the shape a
    // Task 16 stub sprint has before any tickets are authored under it.
    writeFileText(
      join(wbDir, "sprints/01-x/sprint.yaml"),
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

    const base = makeTmpDir("sprint-labs-sprint-stub-out-")
    const publicDir = join(base, "public")
    const sealedDir = join(base, "sealed")
    const result = runCompiler(wbDir, publicDir, sealedDir)
    expect(result.status).toBe(0)

    const registry = await import(/* @vite-ignore */ join(publicDir, "registry.ts"))
    const content = await registry.loadWorkbookContent("stub-wb")
    const sprint = content.sprints.find((s: { number: number }) => s.number === 1)
    expect(sprintPublicSchema.safeParse(sprint).success).toBe(true)
    expect(sprint.ticketCount).toBeUndefined()
    expect(sprint.points).toBeUndefined()
  })
})

describe("compile-workbooks: workbook-level seedStats/inheritedDefects pass through when authored (Task 16)", () => {
  it("compiles seedStats and inheritedDefects unchanged into the public WorkbookSummary", async () => {
    const authoringDir = makeTmpDir("sprint-labs-seed-stats-")
    const { wbDir } = scaffoldMinimalWorkbook(authoringDir, { workbookId: "seed-stats-wb" })
    writeFileText(
      join(wbDir, "workbook.yaml"),
      [
        "id: seed-stats-wb",
        "title: Temp",
        "pitch: Temp",
        "track: Test",
        "language: typescript",
        "level: Test",
        "topics: [test]",
        "sprintCount: 1",
        "ticketCount: 1",
        "estimatedHours: 1",
        "requiresServerExecution: false",
        "seedStats:",
        "  files: 59",
        "  nonTestLines: 1449",
        "  testCases: 19",
        "inheritedDefects:",
        "  - money handled as floating point",
        "  - tenant scoping written by hand in each query",
        "objectives:",
        "  - id: obj-1",
        "    label: Obj",
        "    canDo: I can do the thing.",
        "",
      ].join("\n")
    )

    const base = makeTmpDir("sprint-labs-seed-stats-out-")
    const publicDir = join(base, "public")
    const sealedDir = join(base, "sealed")
    const result = runCompiler(wbDir, publicDir, sealedDir)
    expect(result.stderr + result.stdout).not.toContain("FAILED")
    expect(result.status).toBe(0)

    const registry = await import(/* @vite-ignore */ join(publicDir, "registry.ts"))
    const summary = registry.getWorkbookSummary("seed-stats-wb")
    expect(workbookSummarySchema.safeParse(summary).success).toBe(true)
    expect(summary.seedStats).toEqual({ files: 59, nonTestLines: 1449, testCases: 19 })
    expect(summary.inheritedDefects).toEqual([
      "money handled as floating point",
      "tenant scoping written by hand in each query",
    ])
    expect(() => assertPublicSafe(summary, "seed-stats-wb:summary")).not.toThrow()
  })

  it("omits seedStats and inheritedDefects when the workbook never authors them (existing fixture-demo behavior is unchanged)", async () => {
    const base = makeTmpDir("sprint-labs-seed-stats-absent-")
    const publicDir = join(base, "public")
    const sealedDir = join(base, "sealed")
    expect(runCompiler(FIXTURE_DIR, publicDir, sealedDir).status).toBe(0)

    const registry = await import(/* @vite-ignore */ join(publicDir, "registry.ts"))
    const summary = registry.getWorkbookSummary("fixture-demo")
    expect(workbookSummarySchema.safeParse(summary).success).toBe(true)
    expect(summary.seedStats).toBeUndefined()
    expect(summary.inheritedDefects).toBeUndefined()
  })
})

// ============================================================
// Stub vs full tickets (Meridian content compiler task): reference.diff/
// rubric.yaml/tests are now OPTIONAL per ticket. A ticket missing either
// reference.diff or rubric.yaml compiles PUBLIC-ONLY (playable: false, no
// sealed emit at all); a ticket carrying both still compiles exactly as
// before this task (playable: true, full sealed bundle). This also covers
// the registry-generation bug this split would otherwise reintroduce: the
// sealed registry's loader table must be built from what actually exists on
// disk in the SEALED dir, never from the public tickets/ list, or it would
// emit a dynamic import() whose target does not exist for every stub.
// ============================================================

describe("compile-workbooks: stub vs full tickets (reference.diff/rubric.yaml optional per ticket)", () => {
  it("a ticket with no reference.diff/rubric.yaml compiles PUBLIC-ONLY: playable false, no sealed emit, and the sealed registry never references it", async () => {
    const base = makeTmpDir("sprint-labs-stub-ticket-")
    const wbDir = join(base, "wb")
    const workbookId = "stub-ticket-wb"
    const ticketKey = "STUB-1"

    writeFileText(
      join(wbDir, "workbook.yaml"),
      [
        `id: ${workbookId}`,
        "title: Stub Ticket Workbook",
        "pitch: Stub",
        "track: Test",
        "language: typescript",
        "level: Test",
        "topics: [test]",
        "sprintCount: 1",
        "ticketCount: 1",
        "estimatedHours: 1",
        "requiresServerExecution: false",
        "objectives:",
        "  - id: obj-1",
        "    label: Obj",
        "    canDo: I can do the thing.",
        "",
      ].join("\n")
    )
    writeFileText(
      join(wbDir, "sprints/01-x/sprint.yaml"),
      [
        "number: 1",
        "title: X",
        "goal: X",
        "standupQuote: X",
        "archMapDelta: {}",
        "objectives: [obj-1]",
        "",
      ].join("\n")
    )
    // A STUB: ticket.md only -- exactly the shape of a real Meridian
    // sprint 3-10 ticket today. No setup.diff, no tests/, no
    // reference.diff, no rubric.yaml, no review.yaml, no author_brief.yaml.
    writeFileText(
      join(wbDir, `sprints/01-x/tickets/${ticketKey}/ticket.md`),
      [
        "---",
        "title: Content coming",
        "points: 3",
        "labels: [placeholder]",
        "ai_policy: assisted",
        "objectives: [obj-1]",
        "acceptanceCriteria:",
        "  - A stub still renders acceptance criteria.",
        "---",
        "",
        "Body text for a not-yet-authored ticket.",
        "",
      ].join("\n")
    )

    const outBase = makeTmpDir("sprint-labs-stub-ticket-out-")
    const publicDir = join(outBase, "public")
    const sealedDir = join(outBase, "sealed")
    const result = runCompiler(wbDir, publicDir, sealedDir)
    expect(result.stderr + result.stdout).not.toContain("FAILED")
    expect(result.status).toBe(0)

    // Public: the ticket compiles, playable is false, and everything the
    // board card and ticket screen render is present.
    const registry = await import(/* @vite-ignore */ join(publicDir, "registry.ts"))
    const content = await registry.loadWorkbookContent(workbookId)
    const compiledTicket = content.ticketsByKey[ticketKey] as CompiledTicket
    expect(ticketPublicSchema.safeParse(compiledTicket.ticket).success).toBe(true)
    expect(compiledTicket.ticket.playable).toBe(false)
    expect(compiledTicket.ticket.title).toBe("Content coming")
    expect(compiledTicket.ticket.acceptanceCriteria).toEqual([
      "A stub still renders acceptance criteria.",
    ])
    expect(compiledTicket.hiddenTests).toEqual([])

    // Sealed: no file on disk for this ticket, and the sealed registry
    // never learned about it -- not merely "wasn't asked for," genuinely
    // absent from the loader table renderSealedRegistry generated.
    expect(existsSync(join(sealedDir, `${workbookId}/${ticketKey}.server.ts`))).toBe(false)
    const sealedRegistry = await import(/* @vite-ignore */ join(sealedDir, "registry.server.ts"))
    expect(sealedRegistry.hasSealedTicket(workbookId, ticketKey)).toBe(false)
    expect(sealedRegistry.sealedTicketRegistryKeys()).not.toContain(`${workbookId}:${ticketKey}`)
  })

  it("a ticket with both reference.diff and rubric.yaml still compiles playable:true with a full sealed bundle, and the leak gate still catches a secret in it", async () => {
    const base = makeTmpDir("sprint-labs-full-ticket-")
    const { wbDir } = scaffoldMinimalWorkbook(base, {
      workbookId: "full-ticket-wb",
      ticketKey: "FULL-1",
    })

    const outBase = makeTmpDir("sprint-labs-full-ticket-out-")
    const publicDir = join(outBase, "public")
    const sealedDir = join(outBase, "sealed")
    const result = runCompiler(wbDir, publicDir, sealedDir)
    expect(result.stderr + result.stdout).not.toContain("FAILED")
    expect(result.status).toBe(0)

    const registry = await import(/* @vite-ignore */ join(publicDir, "registry.ts"))
    const content = await registry.loadWorkbookContent("full-ticket-wb")
    const compiledTicket = content.ticketsByKey["FULL-1"] as CompiledTicket
    expect(compiledTicket.ticket.playable).toBe(true)

    expect(existsSync(join(sealedDir, "full-ticket-wb/FULL-1.server.ts"))).toBe(true)
    const sealedRegistry = await import(/* @vite-ignore */ join(sealedDir, "registry.server.ts"))
    expect(sealedRegistry.hasSealedTicket("full-ticket-wb", "FULL-1")).toBe(true)
    const sealed = (await sealedRegistry.loadSealedTicket(
      "full-ticket-wb",
      "FULL-1"
    )) as SealedTicketContent
    expect(sealed.referenceDiff).toContain("diff --git")
    expect(sealed.rubric.weights.understanding).toBeCloseTo(0.2)

    // The leak gate still catches a secret in a FULL ticket: assertPublicSafe
    // passes cleanly on the real compiled PUBLIC ticket (nothing secret got
    // merged in), while the SAME ticket's real SEALED bundle -- genuinely
    // secret content produced by this identical compile -- is exactly what
    // the gate is supposed to catch if it ever reached a public file. This
    // isn't a synthetic payload: it's the actual object this task's modified
    // `compileTicket` produced for a full ticket.
    expect(() => assertPublicSafe(compiledTicket, "full-ticket:public")).not.toThrow()
    expect(() => assertPublicSafe(sealed, "full-ticket:sealed")).toThrow(/secret-classified field/)
  })

  // ============================================================
  // The sealed SQL-hidden-test subsystem (S3 review Critical finding): a
  // `tests/hidden/*.yaml` file authored with `kind: sql-assertion` must
  // compile into the SEALED bundle only -- never the public one, and never
  // even as a public `hiddenTests` metadata entry (unlike io-case/probe).
  // ============================================================

  it("a sql-assertion hidden test compiles into the SEALED bundle only -- absent from the public ticket, its hiddenTests array, AND its raw text", async () => {
    const base = makeTmpDir("sprint-labs-sql-hidden-")
    const { wbDir, ticketDir } = scaffoldMinimalWorkbook(base, {
      workbookId: "sql-hidden-wb",
      ticketKey: "SQLH-1",
    })
    const distinctiveSql = "SELECT 'leak-marker-9f3c2a' AS probe;"
    writeFileText(
      join(ticketDir, "tests/hidden/hidden-leak-marker-check.yaml"),
      [
        'humanName: "Escaped: the leak-marker check"',
        "tags: []",
        "kind: sql-assertion",
        `sql: "${distinctiveSql}"`,
        "expect:",
        "  rows:",
        '    - ["leak-marker-9f3c2a"]',
        "",
      ].join("\n")
    )

    const outBase = makeTmpDir("sprint-labs-sql-hidden-out-")
    const publicDir = join(outBase, "public")
    const sealedDir = join(outBase, "sealed")
    const result = runCompiler(wbDir, publicDir, sealedDir)
    expect(result.stderr + result.stdout).not.toContain("FAILED")
    expect(result.status).toBe(0)

    // Public: the ticket compiles, but carries NOTHING about this hidden
    // test -- not its id, humanName, count, or (above all) its sql/expect
    // text, anywhere in the emitted file.
    const registry = await import(/* @vite-ignore */ join(publicDir, "registry.ts"))
    const content = await registry.loadWorkbookContent("sql-hidden-wb")
    const compiledTicket = content.ticketsByKey["SQLH-1"] as CompiledTicket
    expect(compiledTicket.hiddenTests).toEqual([])
    const publicFileText = readFileSync(join(publicDir, "sql-hidden-wb/tickets/SQLH-1.ts"), "utf8")
    expect(publicFileText).not.toContain(distinctiveSql)
    expect(publicFileText).not.toContain("leak-marker-9f3c2a")
    expect(() => assertPublicSafe(compiledTicket, "sql-hidden:public")).not.toThrow()

    // Sealed: the real sql/expect, reachable ONLY through the sealed loader.
    const sealedRegistry = await import(/* @vite-ignore */ join(sealedDir, "registry.server.ts"))
    const sealed = (await sealedRegistry.loadSealedTicket(
      "sql-hidden-wb",
      "SQLH-1"
    )) as SealedTicketContent
    expect(sealed.sqlHiddenAssertions).toHaveLength(1)
    expect(sealed.sqlHiddenAssertions?.[0]).toMatchObject({
      id: "hidden-leak-marker-check",
      humanName: "Escaped: the leak-marker check",
      sql: distinctiveSql,
      expect: { rows: [["leak-marker-9f3c2a"]] },
    })
    // The real sealed bundle trips the leak gate if it ever reached public
    // (matches the existing FULL-ticket precedent above) -- the dedicated RED
    // CASE tests in the "leak-gate" describe block above prove `sql`/`expect`
    // specifically, independent of whichever secret key the walk meets first.
    expect(() => assertPublicSafe(sealed, "sql-hidden:sealed")).toThrow(/secret-classified field/)
  })

  it("a ticket demoted from full back to stub (reference.diff/rubric.yaml removed) loses its stale sealed bundle on the next compile", async () => {
    const base = makeTmpDir("sprint-labs-demote-")
    const { wbDir, ticketDir } = scaffoldMinimalWorkbook(base, {
      workbookId: "demote-wb",
      ticketKey: "DEMO-1",
    })

    const outBase = makeTmpDir("sprint-labs-demote-out-")
    const publicDir = join(outBase, "public")
    const sealedDir = join(outBase, "sealed")

    const first = runCompiler(wbDir, publicDir, sealedDir)
    expect(first.status).toBe(0)
    expect(existsSync(join(sealedDir, "demote-wb/DEMO-1.server.ts"))).toBe(true)

    // The ticket regresses to a stub: reference.diff and rubric.yaml are
    // removed (an author reverting incomplete or wrong content, say);
    // ticket.md itself is untouched.
    rmSync(join(ticketDir, "reference.diff"), { force: true })
    rmSync(join(ticketDir, "rubric.yaml"), { force: true })

    const second = runCompiler(wbDir, publicDir, sealedDir)
    expect(second.status).toBe(0)
    expect(existsSync(join(publicDir, "demote-wb/tickets/DEMO-1.ts"))).toBe(true)
    // The stale sealed bundle from the FIRST compile must be gone, not just
    // absent from this run's writes -- writeCompiledWorkbook actively
    // deletes it.
    expect(existsSync(join(sealedDir, "demote-wb/DEMO-1.server.ts"))).toBe(false)

    const registry = await import(/* @vite-ignore */ join(publicDir, "registry.ts"))
    const content = await registry.loadWorkbookContent("demote-wb")
    expect((content.ticketsByKey["DEMO-1"] as CompiledTicket).ticket.playable).toBe(false)

    const sealedRegistry = await import(/* @vite-ignore */ join(sealedDir, "registry.server.ts"))
    expect(sealedRegistry.hasSealedTicket("demote-wb", "DEMO-1")).toBe(false)
  })
})
