/**
 * Bridges an authored ticket's test artifacts into the shape the Task 4 Node harness
 * (`runTsWorkspace`) actually consumes: literal `.test.ts` FILES with `describe`/`it` content.
 *
 * Two artifacts need bridging, for different reasons:
 *
 *  - **Visible tests** (`tests/visible/*.test.ts`) are already `.test.ts` files -- `load-tree.ts`
 *    (Task 3) never reads their content (its static rules don't need it), so this module is the
 *    first reader of `AuthoredTicket.dirPath/tests/visible/**` in the codebase. Read verbatim, no
 *    synthesis.
 *  - **Hidden tests** (`tests/hidden/*.yaml`) are authored as DATA, not files: `kind: "probe"` is a
 *    raw assertion-statement `body` string with no import of its own (docs/sprint-labs/
 *    EXECUTION-STATE.md's own grading design has the CLIENT execute a probe body against whatever
 *    is already in scope in the learner's live workspace -- there is no established, product-wide
 *    "what identifiers does a probe body see" convention anywhere yet, confirmed by exhaustive
 *    search of EXECUTION-STATE.md/INTEGRATION.md's grading-architecture sections, both of which
 *    describe probe execution only at the "client runs it" level of detail). This module supplies
 *    the one this task needs for CI replay, documented here since it is new design surface, not a
 *    quote from any spec: a synthesized hidden test file imports, VERBATIM, every named-import line
 *    already present in the ticket's own visible test files (the same "subject under test" a probe
 *    necessarily shares), then wraps the raw body in `describe("hidden", () => it(humanName, () =>
 *    { <body> }))`. `assert` resolves via a bare `require("assert")` (not an `import`, deliberately
 *    -- see below) to the SAME `assert-shim` the require-graph already maps `assert`/`node:assert`
 *    to (node-harness.ts's `specialModules`), matching every observed probe body's own calling
 *    convention (`assert(cond, message)`).
 *
 * `kind: "io-case"` hidden tests are bridged ONLY when authored with an explicit `entryPoint`
 * (`{module, export}` -- PLAN.md Task 7 review round 1, Critical 2). EXECUTION-STATE.md's
 * deviation D1 ("no server-side execution yet") is about the LIVE product, where the client runs
 * the learner's code and the server only ever compares, never executes (`lib/sprint-labs/grading/
 * gate-runner.ts`). This CI replay gate is a different context: it ALREADY executes probe hidden
 * tests via `runTsWorkspace` against the materialized reference solution, so calling a NAMED
 * export with `input` and comparing to `expected` is exactly the same category of thing, not a
 * new capability. What genuinely does NOT exist is an entry-point-GUESSING heuristic: without an
 * authored `entryPoint`, there is no way to know which export an io-case's opaque `input`/
 * `expected` shape is even meant to call, and guessing risks a WRONG-REASON failure (calling a
 * real export with nonsense arguments and reporting "reference doesn't go red->green" for a
 * ticket whose reference is actually correct) -- worse than an honest gap. `describeIoCaseGap`
 * reports THAT gap (no `entryPoint` authored) as a named, ticket-scoped finding -- ERROR for a
 * score-feeding policy (`unassisted`/`review-only`: a hidden tier that cannot be verified is not
 * a shippable score-feeding tier), WARN for `assisted` (formative only, per WORKBOOK-SPEC.md §5).
 *
 * An io-case WITH an entryPoint is bridged the same way a probe is: a synthesized `.test.ts` file
 * imports the named export (relative-path-computed from `tests/hidden/` to `entryPoint.module`,
 * matching how a probe reuses the visible tests' own import depth) and asserts
 * `assert.deepStrictEqual(await <export>(input), expected)`. `assert.deepStrictEqual` is the
 * SAME comparator `public/workers/assert-shim.js` already implements (loaded via the identical
 * `require("assert")` every probe uses) -- reusing it instead of duplicating
 * `lib/sprint-labs/grading/deep-equal.ts`'s logic here, which cannot be imported into this
 * sandboxed require-graph anyway (it only resolves paths inside the materialized workspace).
 */
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { join, posix } from "node:path"

import type { TsWorkspaceFile } from "@/lib/workspace-execution/ts-workspace/types"

import type { AuthoredHiddenTest, AuthoredTicket } from "../tree"
import type { ValidationFinding } from "../types"
import { toWorkspaceRelativePath } from "./git-workspace"

/** The score-feeding `ai_policy` values WORKBOOK-SPEC.md §5 says are held to a higher bar: an
 *  io-case with no `entryPoint` is an ERROR for these (not a WARN) because these are exactly the
 *  attempts that feed the readiness score and escaped-defect rate -- an unverifiable hidden tier
 *  on one of them is a content defect, not a formative gap. */
const SCORE_FEEDING_AI_POLICIES = new Set(["unassisted", "review-only"])

const NAMED_IMPORT_LINE = /^import\s*\{[^}]+\}\s*from\s*["'][^"']+["']\s*;?\s*$/

function listTestFilesRecursive(dir: string): string[] {
  if (!existsSync(dir)) return []
  const out: string[] = []
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.isFile() && /\.tsx?$/.test(entry.name)) out.push(full)
    }
  }
  walk(dir)
  return out.sort()
}

/** Reads a ticket's `tests/visible/**\/*.test.ts` verbatim, path re-rooted at `tests/visible/...`
 *  (matching where they land in the materialized workspace -- see red-green.ts). */
export function readVisibleTestFiles(ticket: AuthoredTicket): TsWorkspaceFile[] {
  const visibleDir = join(ticket.dirPath, "tests", "visible")
  return listTestFilesRecursive(visibleDir).map((absPath) => ({
    path: toWorkspaceRelativePath(ticket.dirPath, absPath),
    content: readFileSync(absPath, "utf8"),
  }))
}

/** Every distinct `import { ... } from "..."` line across a set of test files, in first-seen
 *  order, verbatim (never rewritten -- rewriting a working relative import is exactly the kind of
 *  "helpful" transform that quietly breaks module resolution). A default import (`import x from
 *  "y"`) is deliberately NOT collected: `ts.transpileModule`'s CJS default-import interop is a risk
 *  this module sidesteps by only ever reusing named-import lines, which every visible test file
 *  observed in this codebase already uses exclusively. */
function collectNamedImportLines(files: TsWorkspaceFile[]): string[] {
  const seen = new Set<string>()
  const lines: string[] = []
  for (const file of files) {
    for (const line of file.content.split("\n")) {
      const trimmed = line.trim()
      if (NAMED_IMPORT_LINE.test(trimmed) && !seen.has(trimmed)) {
        seen.add(trimmed)
        lines.push(trimmed)
      }
    }
  }
  return lines
}

export interface EntryPointRef {
  module: string
  export: string
}

/** Reads and structurally validates `hidden.raw.entryPoint` -- the AUTHORED tree's copy of the
 *  same optional field `lib/scenarios/sealed/sprint-labs/schemas.ts`'s `sealedEntryPointSchema`
 *  now validates at compile time. Read directly here (not via the compiled bundle) for the same
 *  reason every other io-case field is: this module reads the authoring tree directly. Returns
 *  `null` for anything malformed (missing, wrong shape) rather than throwing -- a validation
 *  concern for `lab validate`'s STATIC rules (out of this task's owned files), not a reason to
 *  crash the dynamic gate. */
export function readEntryPoint(hidden: AuthoredHiddenTest): EntryPointRef | null {
  const raw = hidden.raw.entryPoint
  if (!raw || typeof raw !== "object") return null
  const record = raw as Record<string, unknown>
  if (typeof record.module !== "string" || typeof record.export !== "string") return null
  if (record.module.length === 0 || record.export.length === 0) return null
  return { module: record.module, export: record.export }
}

/** Every synthesized hidden test file lives at `tests/hidden/<name>.test.ts` (2 segments deep,
 *  matching `tests/visible/`'s own depth -- see the file header's note on why probe imports reuse
 *  that depth verbatim). Computes the relative specifier from there to an entryPoint's `module`
 *  path (extension stripped, since the require-graph re-keys every `.ts`/`.tsx` file to `.js`). */
function computeRelativeImportPath(modulePath: string): string {
  const withoutExt = modulePath.replace(/\.tsx?$/, "")
  const rel = posix.relative("tests/hidden", withoutExt)
  return rel.startsWith(".") ? rel : `./${rel}`
}

function synthesizeIoCaseTestFile(
  hidden: AuthoredHiddenTest,
  entryPoint: EntryPointRef
): TsWorkspaceFile {
  const humanName = hidden.humanName ?? hidden.fileName
  const importPath = computeRelativeImportPath(entryPoint.module)
  const path = `tests/hidden/${hidden.fileName}.test.ts`
  const content = [
    `import { describe, it } from "vitest"`,
    `const assert = require("assert")`,
    `import { ${entryPoint.export} } from "${importPath}"`,
    ``,
    `describe("hidden", () => {`,
    `  it(${JSON.stringify(humanName)}, async () => {`,
    `    const input = ${JSON.stringify(hidden.raw.input)}`,
    `    const expected = ${JSON.stringify(hidden.raw.expected)}`,
    `    const actual = await ${entryPoint.export}(input)`,
    `    assert.deepStrictEqual(actual, expected)`,
    `  })`,
    `})`,
    ``,
  ].join("\n")
  return { path, content }
}

function indentBody(body: string): string {
  return body
    .replace(/\n$/, "")
    .split("\n")
    .map((line) => (line.length > 0 ? `    ${line}` : line))
    .join("\n")
}

export interface HiddenTestBridgeResult {
  /** Synthesized `.test.ts` files, one per executable ("probe") hidden test. */
  files: TsWorkspaceFile[]
  /** Path of each synthesized file, in the same order as `files` -- red-green.ts's `hiddenTestPaths`. */
  paths: string[]
  /** One finding per hidden test this module could NOT bridge into something runnable (an io-case,
   *  or a probe with a missing/non-string body). Always `severity: "warn"`: an unexecuted hidden
   *  test narrows what the gate proved, but is not itself a red/green failure. */
  findings: ValidationFinding[]
}

function describeIoCaseGap(
  ticketKey: string,
  hidden: AuthoredHiddenTest,
  aiPolicy: string | undefined
): ValidationFinding {
  const scoreFeeding = aiPolicy !== undefined && SCORE_FEEDING_AI_POLICIES.has(aiPolicy)
  return {
    ruleId: "dynamic-hidden-test-not-executable",
    severity: scoreFeeding ? "error" : "warn",
    ticketKey,
    path: hidden.path,
    message: scoreFeeding
      ? `io-case hidden test "${hidden.humanName ?? hidden.fileName}" has no entryPoint authored, so its hidden tier cannot be dynamically verified -- a score-feeding ticket (ai_policy: "${aiPolicy}") cannot ship an unverifiable hidden tier. Author entryPoint: {module, export} on this hidden test's YAML.`
      : `io-case hidden test "${hidden.humanName ?? hidden.fileName}" has no entryPoint authored; excluded from the red/green gate (formative only -- ai_policy: "${aiPolicy ?? "(none)"}").`,
  }
}

function describeMalformedProbeGap(
  ticketKey: string,
  hidden: AuthoredHiddenTest
): ValidationFinding {
  return {
    ruleId: "dynamic-hidden-test-not-executable",
    severity: "warn",
    ticketKey,
    path: hidden.path,
    message: `hidden test "${hidden.humanName ?? hidden.fileName}" declares kind "${hidden.kind ?? "(missing)"}" with no usable body; excluded from the red/green gate.`,
  }
}

/** Synthesizes one runnable `.test.ts` file per `kind: "probe"` hidden test with a string `body`,
 *  and one WARN finding for every hidden test that could not be bridged (io-case, or malformed). */
export function bridgeHiddenTests(
  ticket: AuthoredTicket,
  visibleFiles: TsWorkspaceFile[]
): HiddenTestBridgeResult {
  const importLines = collectNamedImportLines(visibleFiles)
  const files: TsWorkspaceFile[] = []
  const paths: string[] = []
  const findings: ValidationFinding[] = []

  for (const hidden of ticket.hiddenTests) {
    if (hidden.kind === "io-case") {
      const entryPoint = readEntryPoint(hidden)
      if (!entryPoint) {
        findings.push(describeIoCaseGap(ticket.key, hidden, ticket.aiPolicy))
        continue
      }
      const file = synthesizeIoCaseTestFile(hidden, entryPoint)
      files.push(file)
      paths.push(file.path)
      continue
    }

    const body = typeof hidden.raw.body === "string" ? hidden.raw.body : null
    if (hidden.kind !== "probe" || !body || body.trim().length === 0) {
      findings.push(describeMalformedProbeGap(ticket.key, hidden))
      continue
    }

    const humanName = hidden.humanName ?? hidden.fileName
    const path = `tests/hidden/${hidden.fileName}.test.ts`
    const content = [
      `import { describe, it } from "vitest"`,
      `const assert = require("assert")`,
      ...importLines,
      ``,
      `describe("hidden", () => {`,
      `  it(${JSON.stringify(humanName)}, () => {`,
      indentBody(body),
      `  })`,
      `})`,
      ``,
    ].join("\n")

    files.push({ path, content })
    paths.push(path)
  }

  return { files, paths, findings }
}
