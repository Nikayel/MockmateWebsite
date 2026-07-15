/**
 * Turn a captured stdout into the server-verified run event the machine keys its
 * deterministic exits off (PLAN.md Sprint 1 item 2/3). The SERVER computes the match
 * so the client cannot fake a passing FIX or PHASE2:
 *  - v1 match is diffed against the PUBLIC oracle (`expectedOutput`);
 *  - v2 match is diffed against the SEALED `expectedOutputV2`, which the client never
 *    sees — so a PHASE2 exit genuinely requires reproducing the sealed answer.
 */

import { diffStdout } from "./stdout-oracle"
import type { PackRunEvent } from "./machine"

export function computeRunEvent(
  stdout: string,
  expectedOutput: string,
  expectedOutputV2?: string
): PackRunEvent {
  const matchedOracle = diffStdout(stdout, expectedOutput).match
  const matchedOracleV2 =
    expectedOutputV2 !== undefined ? diffStdout(stdout, expectedOutputV2).match : undefined
  return { kind: "run", matchedOracle, matchedOracleV2 }
}
