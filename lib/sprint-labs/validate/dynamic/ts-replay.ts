/**
 * Assembles a materialized workspace + one ticket's tests into a `TsWorkspaceInput` and replays it
 * through the Task 4 Node harness (`runTsWorkspace`, imported and never modified per this task's
 * brief). This is the TypeScript half of the "replayer that picks the harness by the ticket's test
 * language" (`language.ts` makes that pick; `sql-replay.ts` is the SQL half).
 */
import { runTsWorkspace } from "@/lib/workspace-execution/ts-workspace/node-harness"
import type { TsWorkspaceRunResult } from "@/lib/workspace-execution/ts-workspace/types"

import type { AuthoredTicket } from "../tree"
import type { ValidationFinding } from "../types"
import { bridgeHiddenTests, readVisibleTestFiles } from "./hidden-tests"
import { readAllFiles, type GitWorkspace } from "./git-workspace"

export interface TsTicketRunResult {
  result: TsWorkspaceRunResult
  /** WARN findings for any hidden test this ticket authors that could not be bridged into
   *  something runnable (see hidden-tests.ts). Empty for a run that only asked for visible tests. */
  hiddenFindings: ValidationFinding[]
}

/** Runs `ticket`'s visible tests AND its executable ("probe") hidden tests against the current
 *  contents of `ws` -- the red/green gate's own per-ticket check. */
export async function runTicketFullSuite(
  ws: GitWorkspace,
  ticket: AuthoredTicket
): Promise<TsTicketRunResult> {
  const sourceFiles = readAllFiles(ws)
  const visibleFiles = readVisibleTestFiles(ticket)
  const {
    files: hiddenFiles,
    paths: hiddenTestPaths,
    findings: hiddenFindings,
  } = bridgeHiddenTests(ticket, visibleFiles)

  const result = await runTsWorkspace({
    files: [...sourceFiles, ...visibleFiles, ...hiddenFiles],
    testPaths: visibleFiles.map((file) => file.path),
    hiddenTestPaths,
  })

  return { result, hiddenFindings }
}

/** Runs ONLY `ticket`'s visible tests against the current contents of `ws` -- the regression
 *  gate's per-prior-ticket check (WORKBOOK-SPEC.md §6: "every previous sprint's suite", visible
 *  tier only, never hidden). */
export async function runTicketVisibleSuite(
  ws: GitWorkspace,
  ticket: AuthoredTicket
): Promise<TsWorkspaceRunResult> {
  const sourceFiles = readAllFiles(ws)
  const visibleFiles = readVisibleTestFiles(ticket)

  return runTsWorkspace({
    files: [...sourceFiles, ...visibleFiles],
    testPaths: visibleFiles.map((file) => file.path),
    hiddenTestPaths: [],
  })
}
