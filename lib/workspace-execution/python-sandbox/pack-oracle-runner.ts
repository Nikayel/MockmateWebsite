/**
 * Stdout-oracle runner for bugfix PACKS (PLAN.md Sprint 1 item 2).
 *
 * Unlike the assert-based workspace runner, this executes the pack's `run_cmd` under
 * Pyodide, captures RAW stdout byte-for-byte, and diffs it against the PUBLIC
 * expected-output oracle. Byte-exactness is the whole verification model
 * (PACK_REALISM_GUIDE.md §7), so stdout is captured inside Python and base64-encoded
 * onto a single marker line — the worker's line-batched stdout capture cannot preserve
 * exact newlines on its own.
 *
 * The pure helpers (`parseRunCmd`, `buildPackOracleEntrypoint`, `decodePackStdout`) are
 * unit-tested; `executePackOracleClientSide` runs only in the browser worker.
 */

import type { BugFixScenario } from "@/lib/scenarios/types"
import type { WorkspaceFileEdit, WorkspaceScenario } from "../types"
import type { StdoutDiffResult } from "@/lib/bugfix/packs/stdout-oracle"
import { diffStdout } from "@/lib/bugfix/packs/stdout-oracle"
import { overlayWorkspaceFiles } from "../files"
import { runPythonInWorker } from "./worker-runner"

const PACK_STDOUT_MARKER = "__PACK_STDOUT__:"
const PACK_ORACLE_ENTRYPOINT = "__pack_oracle__.py"

export interface PackOracleRunResult {
  /** True when the program ran to completion without an uncaught exception. */
  ran: boolean
  /** Exact captured stdout (empty string on a crash). */
  stdout: string
  /** Byte-diff of `stdout` against the pack's expected-output oracle. */
  diff: StdoutDiffResult | null
  /** True only on a byte-for-byte oracle match. */
  match: boolean
  /** Runtime/crash error message, or null. */
  error: string | null
  consoleLogs: Array<{
    type: "log" | "error" | "warn" | "info"
    message: string
    timestamp: number
  }>
}

/**
 * Parse a `run_cmd` into the script path and the argv list the script should see.
 * "python3 src/main.py fixtures/input.txt" -> { script: "src/main.py",
 * argv: ["src/main.py", "fixtures/input.txt"] }.
 */
export function parseRunCmd(runCmd: string): { script: string; argv: string[] } {
  const tokens = runCmd.trim().split(/\s+/)
  // Drop leading interpreter tokens (python, python3, -u flags, etc.).
  let index = 0
  while (index < tokens.length && /^(python3?|-[A-Za-z]+)$/.test(tokens[index])) {
    index++
  }
  const script = tokens[index] ?? ""
  const args = tokens.slice(index + 1)
  return { script, argv: [script, ...args] }
}

/**
 * Build the synthetic Python entrypoint that runs the script with the right argv,
 * captures its stdout exactly, and emits it base64-encoded on one marker line.
 */
export function buildPackOracleEntrypoint(runCmd: string): string {
  const { script, argv } = parseRunCmd(runCmd)
  return [
    "import sys, io, base64, contextlib, runpy",
    `__pack_script = ${JSON.stringify(script)}`,
    `__pack_argv = ${JSON.stringify(argv)}`,
    "__pack_buf = io.StringIO()",
    "sys.argv = list(__pack_argv)",
    "with contextlib.redirect_stdout(__pack_buf):",
    "    try:",
    "        runpy.run_path(__pack_script, run_name='__main__')",
    "    except SystemExit:",
    "        pass",
    "__pack_out = __pack_buf.getvalue()",
    "__pack_enc = base64.b64encode(__pack_out.encode('utf-8')).decode('ascii')",
    `print(${JSON.stringify(PACK_STDOUT_MARKER)} + __pack_enc)`,
    "",
  ].join("\n")
}

/**
 * Extract and decode the exact stdout from the worker's log messages. Returns null if
 * the marker was never emitted (the program crashed before the wrapper printed).
 */
export function decodePackStdout(logMessages: string[]): string | null {
  const joined = logMessages.join("\n")
  // `*` (not `+`) so an intentionally-empty stdout marker decodes to "" not null.
  const match = joined.match(/__PACK_STDOUT__:([A-Za-z0-9+/=]*)/)
  if (!match) return null
  const bytes = Uint8Array.from(atob(match[1]), (char) => char.charCodeAt(0))
  return new TextDecoder("utf-8").decode(bytes)
}

export async function executePackOracleClientSide(
  scenario: WorkspaceScenario,
  edits: WorkspaceFileEdit[]
): Promise<PackOracleRunResult> {
  // The `pack` marker lives only on the bugfix variant; this runner is only invoked
  // for packs, so read it through the bugfix shape.
  const packInfo = (scenario as BugFixScenario).pack
  const expectedOutput = packInfo?.expectedOutput
  const runCmd = packInfo?.runCmd
  if (!expectedOutput || !runCmd) {
    return {
      ran: false,
      stdout: "",
      diff: null,
      match: false,
      error: "Scenario is not a stdout-oracle pack (missing pack.runCmd/expectedOutput).",
      consoleLogs: [],
    }
  }

  try {
    const files = overlayWorkspaceFiles(scenario, edits).map((file) => ({
      path: file.path,
      content: file.content,
    }))
    files.push({ path: PACK_ORACLE_ENTRYPOINT, content: buildPackOracleEntrypoint(runCmd) })

    const runResult = await runPythonInWorker({ entrypoint: PACK_ORACLE_ENTRYPOINT, files })

    const consoleLogs = runResult.logs.filter((log) => !log.message.startsWith(PACK_STDOUT_MARKER))

    if (!runResult.success || runResult.error) {
      return {
        ran: false,
        stdout: "",
        diff: null,
        match: false,
        error: runResult.error || "Execution failed",
        consoleLogs,
      }
    }

    const stdout = decodePackStdout(runResult.logs.map((log) => log.message))
    if (stdout === null) {
      return {
        ran: false,
        stdout: "",
        diff: null,
        match: false,
        error: "Program produced no capturable stdout.",
        consoleLogs,
      }
    }

    const diff = diffStdout(stdout, expectedOutput)
    return { ran: true, stdout, diff, match: diff.match, error: null, consoleLogs }
  } catch (error) {
    return {
      ran: false,
      stdout: "",
      diff: null,
      match: false,
      error: error instanceof Error ? error.message : "Failed to run pack oracle client-side",
      consoleLogs: [],
    }
  }
}
