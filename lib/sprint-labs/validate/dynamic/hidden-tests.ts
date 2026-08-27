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
 * `kind: "io-case"` hidden tests are NOT bridged here. An io-case's `input`/`expected` (WORKBOOK-
 * SPEC.md §6) are opaque, per-ticket data with no declared callable to invoke them against --
 * EXECUTION-STATE.md's deviation D1 states plainly that no server-side io-case execution exists
 * ANYWHERE in this product yet (the client runs the learner's code and posts raw output; the server
 * only ever COMPARES, never executes -- see `lib/sprint-labs/grading/gate-runner.ts`). Inventing an
 * entry-point-guessing heuristic here would risk a WRONG-REASON failure (calling a real export with
 * nonsense arguments and reporting "reference doesn't go red->green" for a ticket whose reference is
 * actually correct) -- worse than an honest gap. `describeIoCaseGap` reports the gap as a named,
 * ticket-scoped finding instead of silently skipping or crashing; `red-green.ts` excludes these
 * cases from the pass/fail computation and surfaces the finding alongside the verdict.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

import type { TsWorkspaceFile } from "@/lib/workspace-execution/ts-workspace/types"

import type { AuthoredHiddenTest, AuthoredTicket } from "../tree"
import type { ValidationFinding } from "../types"
import { toWorkspaceRelativePath } from "./git-workspace"

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

function describeIoCaseGap(ticketKey: string, hidden: AuthoredHiddenTest): ValidationFinding {
  return {
    ruleId: "dynamic-hidden-test-not-executable",
    severity: "warn",
    ticketKey,
    path: hidden.path,
    message: `io-case hidden test "${hidden.humanName ?? hidden.fileName}" has no dynamic-execution entry point convention yet (no server-side io-case execution exists anywhere in this product today -- EXECUTION-STATE.md deviation D1); excluded from the red/green gate.`,
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
      findings.push(describeIoCaseGap(ticket.key, hidden))
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
