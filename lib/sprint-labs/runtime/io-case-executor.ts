/**
 * Sprint Labs — client-side io-case executor (docs/sprint-labs/PLAN.md Task "runtime B").
 *
 * This is the client half of WORKBOOK-SPEC.md §5's IO-case design (EXECUTION-STATE.md's standing
 * note, restated because every line of this file exists to honor it): the server issues an
 * io-case's `input` (never `expected`); the CLIENT runs the learner's CURRENT workspace code
 * against that input and posts the RAW output; the SERVER (`lib/sprint-labs/grading/
 * gate-runner.ts`) is the only place that ever sees `expected`, and it never returns one. This
 * module never compares anything — it has no expected value to compare against, by design. A
 * fabricated "pass" is therefore not a thing this module can produce, even a buggy one: the worst
 * it can do is report a wrong RAW output, which the server will then correctly score as escaped.
 *
 * ## Reuses `runTsInWorker`, does not re-roll execution
 *
 * Mirrors `lib/sprint-labs/workspace/run-visible-tests.ts` (Sprint Labs' own sibling adapter onto
 * the same primitive) exactly: `runTsInWorker` (the browser-safe barrel,
 * `@/lib/workspace-execution/ts-workspace`) takes the scenario-agnostic `{files, testPaths,
 * hiddenTestPaths}` shape; this module synthesizes ONE runnable `.test.ts` file per io-case (the
 * same "authored data -> runnable file" bridge `lib/sprint-labs/validate/dynamic/hidden-tests.ts`
 * uses for the CI dynamic-validator's OWN io-case replay) and feeds it in as a hidden test path.
 *
 * The CI bridge (`hidden-tests.ts`'s `synthesizeIoCaseTestFile`) cannot be reused directly: it
 * bakes `assert.deepStrictEqual(actual, expected)` into the synthesized file, because CI has
 * `expected` (it replays against the reference solution). This module never has `expected`, so its
 * synthesized test asserts NOTHING — it exists purely to call the learner's exported function and
 * report the raw return value back out through a console.log marker, the same "protocol line in
 * stdout" idiom `executeWorkspaceScenarioTsClientSide` / `run-visible-tests.ts` /
 * `python-sandbox/pack-oracle-runner.ts`'s `decodePackStdout` all already use (EXECUTION-STATE.md:
 * "last marker, stdout-typed only"). Own marker prefix (`__SPRINT_LAB_IO_CASE_OUTPUT__:`), because
 * the existing `__WORKSPACE_TEST_RESULTS__:` marker is a pass/fail-per-test-name protocol; this one
 * carries an arbitrary JSON-safe VALUE per case instead.
 *
 * ## One `runTsInWorker` call PER io-case, deliberately
 *
 * The worker's own per-file isolation (`js-sandbox-worker.js`'s `runTsWorkspaceMode`: "A test FILE
 * that throws while loading is isolated to a single failing result row scoped to that file") would
 * likely make batching every io-case into one call safe too, but per-call isolation is simpler to
 * reason about and matches this task's own bar ("handle throw/timeout per case as a captured
 * error, not a crash") without depending on that isolation guarantee. The transpile cache is
 * per-WORKER, not per-call (`worker-runner.ts`'s header), so N sequential calls against the same
 * workspace files still only pay full transpile cost once; only the one synthesized file differs
 * between calls.
 *
 * ## Never fabricates a passing output for a case that could not run
 *
 * A learner-code throw, a timeout, a missing/never-issued `entryPoint`, a worker crash, or even an
 * unserializable return value (a circular structure, a BigInt) are all captured as
 * `{status: "error"}` — never a crash of the whole batch, and never a value smuggled into
 * `ioCaseOutputs`. `toIoCaseOutputs` OMITS an errored case's key entirely rather than inventing a
 * sentinel: `gate-runner.ts` already treats a missing key as failed (its own documented omission
 * rule), so an unexecutable case reads as escaped with zero risk of a sentinel value coincidentally
 * deep-equaling a real `expected`.
 */

import { runTsInWorker } from "@/lib/workspace-execution/ts-workspace"
import type { WorkspaceFileLike } from "@/lib/sprint-labs/workspace-files"

/**
 * One io-case as issued by `POST /api/sprint-labs/attempts` (open). Mirrors the sealed
 * `SealedHiddenCase`'s io-case fields, minus `expected` (never issued to the client) and
 * `humanName`/`tags` (display-only, not needed to execute). `entryPoint` is OPTIONAL — an io-case
 * authored without one (see `lib/scenarios/sealed/sprint-labs/schemas.ts`'s
 * `sealedEntryPointSchema` doc comment) cannot be executed client-side at all; handled as a
 * captured error below, never a crash.
 */
export interface SprintLabIoCase {
  id: string
  input: unknown
  entryPoint?: { module: string; export: string }
}

export type IoCaseExecutionOutcome =
  | { caseId: string; status: "ok"; output: unknown }
  | { caseId: string; status: "error"; error: string }

/** Mirrors `run-visible-tests.ts`'s own `EXEC_TIMEOUT_MS`: tests run sequentially inside the
 *  worker, so the budget bounds one io-case's own execution time. Kept as a local constant (same
 *  reasoning as that sibling file) rather than a deep import of workspace-runner.ts's internals. */
const EXEC_TIMEOUT_MS = 15_000

/** Fixed, 2-segments-deep synthetic path -- matches `tests/hidden/`'s own depth (the same
 *  convention `hidden-tests.ts`'s CI synthesizer uses), so the relative-import math below is a
 *  constant `../../` prefix. Reused verbatim across every sequential call. */
const SYNTHETIC_TEST_PATH = "tests/hidden/__sprint-lab-io-case-executor__.test.ts"

const MARKER = "__SPRINT_LAB_IO_CASE_OUTPUT__:"

/**
 * Relative import specifier from `tests/hidden/` to a workspace-root-relative `entryPoint.module`
 * (e.g. `"src/http/compatibility-descriptor.ts"` -> `"../../src/http/compatibility-descriptor"`).
 * Mirrors `hidden-tests.ts`'s `computeRelativeImportPath` (same fixed-depth `posix.relative` math),
 * reimplemented with plain string ops instead of `node:path` so this module stays import-safe in a
 * browser bundle.
 */
function relativeImportPath(modulePath: string): string {
  const withoutExtension = modulePath.replace(/\.tsx?$/, "")
  const normalized = withoutExtension.startsWith("./")
    ? withoutExtension.slice(2)
    : withoutExtension
  return `../../${normalized}`
}

function synthesizeCaseTestFile(
  caseId: string,
  input: unknown,
  entryPoint: { module: string; export: string }
): WorkspaceFileLike {
  const importPath = relativeImportPath(entryPoint.module)
  const idLiteral = JSON.stringify(caseId)
  const content = [
    `import { describe, it } from "vitest"`,
    ``,
    `import { ${entryPoint.export} } from "${importPath}"`,
    ``,
    `describe("sprint-lab-io-case", () => {`,
    `  it(${idLiteral}, async () => {`,
    `    let payload`,
    `    try {`,
    `      const output = await ${entryPoint.export}(${JSON.stringify(input)})`,
    `      payload = { id: ${idLiteral}, ok: true, output }`,
    `    } catch (error) {`,
    `      payload = {`,
    `        id: ${idLiteral},`,
    `        ok: false,`,
    `        error: error && error.message ? error.message : String(error),`,
    `      }`,
    `    }`,
    `    let serialized`,
    `    try {`,
    `      serialized = JSON.stringify(payload)`,
    `    } catch (serializeError) {`,
    `      serialized = JSON.stringify({`,
    `        id: ${idLiteral},`,
    `        ok: false,`,
    `        error: "learner code's output could not be serialized",`,
    `      })`,
    `    }`,
    `    console.log(${JSON.stringify(MARKER)} + serialized)`,
    `  })`,
    `})`,
    ``,
  ].join("\n")
  return { path: SYNTHETIC_TEST_PATH, content }
}

interface MarkerPayload {
  id: string
  ok: boolean
  output?: unknown
  error?: string
}

function isMarkerPayload(value: unknown): value is MarkerPayload {
  if (!value || typeof value !== "object") return false
  const record = value as Record<string, unknown>
  return typeof record.id === "string" && typeof record.ok === "boolean"
}

/**
 * Runs ONE io-case against `files` (the learner's current workspace) and returns its outcome.
 * Never throws: every failure mode (no entryPoint issued, harness/transpile/exec failure, a
 * learner-code throw, an unparseable or malformed marker) resolves to `{status: "error"}`.
 */
async function runOneIoCase(
  files: readonly WorkspaceFileLike[],
  ioCase: SprintLabIoCase
): Promise<IoCaseExecutionOutcome> {
  if (!ioCase.entryPoint) {
    return {
      caseId: ioCase.id,
      status: "error",
      error: "No entryPoint was issued for this hidden case; it cannot run client-side.",
    }
  }

  const testFile = synthesizeCaseTestFile(ioCase.id, ioCase.input, ioCase.entryPoint)
  const workerFiles = [...files.map((f) => ({ path: f.path, content: f.content })), testFile]

  const runResult = await runTsInWorker(
    { files: workerFiles, testPaths: [], hiddenTestPaths: [testFile.path] },
    EXEC_TIMEOUT_MS
  )

  // Only "log"-typed entries are eligible, and only the LAST one counts -- same defense as
  // executeWorkspaceScenarioTsClientSide / run-visible-tests.ts / decodePackStdout: a marker
  // written via console.error/warn/info cannot forge a result, and an earlier line (e.g. from a
  // console.log the learner's own code happened to make) is superseded by this file's own final
  // marker line.
  const markerLogs = runResult.logs.filter(
    (log) => log.type === "log" && log.message.startsWith(MARKER)
  )
  const lastMarker = markerLogs.length > 0 ? markerLogs[markerLogs.length - 1] : null

  if (!lastMarker) {
    return {
      caseId: ioCase.id,
      status: "error",
      error: runResult.error ?? "The learner's code did not run to completion for this case.",
    }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(lastMarker.message.slice(MARKER.length))
  } catch {
    return { caseId: ioCase.id, status: "error", error: "Malformed execution result." }
  }
  if (!isMarkerPayload(parsed)) {
    return { caseId: ioCase.id, status: "error", error: "Malformed execution result." }
  }
  if (parsed.ok) {
    return { caseId: ioCase.id, status: "ok", output: parsed.output }
  }
  return { caseId: ioCase.id, status: "error", error: parsed.error ?? "Execution failed." }
}

/**
 * Executes every issued io-case against `files`, one at a time (see file header for why not
 * batched into one worker call). This runs the LEARNER's current workspace code, never the
 * reference solution, and never compares to an expected value -- the client has none.
 */
export async function runIoCases(
  files: readonly WorkspaceFileLike[],
  ioCases: readonly SprintLabIoCase[]
): Promise<IoCaseExecutionOutcome[]> {
  const outcomes: IoCaseExecutionOutcome[] = []
  for (const ioCase of ioCases) {
    outcomes.push(await runOneIoCase(files, ioCase))
  }
  return outcomes
}

/**
 * Projects execution outcomes into the `ioCaseOutputs` shape `POST /attempts/complete` accepts
 * (`Record<caseId, unknown>`). A case that could not execute is OMITTED, never given a sentinel
 * value -- see file header on why an omitted key is the only safe way to represent "this case
 * escaped" without risking a coincidental match against a real `expected`.
 */
export function toIoCaseOutputs(
  outcomes: readonly IoCaseExecutionOutcome[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const outcome of outcomes) {
    if (outcome.status === "ok") result[outcome.caseId] = outcome.output
  }
  return result
}
