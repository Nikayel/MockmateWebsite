"use client"

import React from "react"
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PackRunView } from "@/lib/workspace-execution"

/**
 * TerminalOutput — the candidate-facing surface for a stdout-oracle pack run.
 *
 * Shows the program's REAL output, byte-for-byte, the way a terminal would. It
 * deliberately does NOT render the expected output or a diff: the oracle is
 * already public (task.md + the visible tests/expected_output.txt), and working
 * out WHICH section is wrong is the skill a pack assesses. The verdict names the
 * oracle file and stops there.
 *
 * The one concession is the end-of-output marker: trailing-newline discipline
 * decides the byte-exact verdict but is invisible in rendered text, so a learner
 * could otherwise stare at identical-looking output forever. The marker describes
 * only the candidate's own stdout and reveals nothing about the oracle.
 */

/**
 * Shared terminal type contract: preserve columns, scroll rather than wrap.
 * `whitespace-pre` (not `pre-wrap`) and never `break-all` — both destroy the
 * column alignment that makes tabular program output readable.
 */
export const TERMINAL_PRE =
  "overflow-x-auto whitespace-pre font-mono text-[11.5px] leading-[1.5] tabular-nums"

export function TerminalOutput({
  runCmd,
  ran,
  stdout,
  oraclePath,
  match,
  crashError,
}: PackRunView) {
  const endsWithNewline = stdout.endsWith("\n")

  return (
    <div className="space-y-2">
      {/* Command echo */}
      <div className={cn(TERMINAL_PRE, "text-muted-foreground flex items-start gap-2")}>
        <span className="text-accent select-none">$</span>
        <span className="text-foreground/90">{runCmd}</span>
      </div>

      {/* The program crashed: show the raw traceback verbatim. Never route this
          through formatErrorMessage — it subtracts PYTHON_WRAPPER_LINE_OFFSET from
          every "line N", but a pack traceback already points at the real file. */}
      {!ran && (
        <div className="rounded border border-red-500/30 bg-red-500/10 p-2">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-red-400">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
            <span>The program crashed before producing output</span>
          </div>
          <pre className={cn(TERMINAL_PRE, "text-red-300/90")}>{crashError ?? "Unknown error"}</pre>
        </div>
      )}

      {/* Raw stdout, exactly as the program printed it. */}
      {ran && (
        <>
          {stdout.length === 0 ? (
            <div className="text-muted-foreground py-1 font-mono text-[11.5px] italic">
              (no output)
            </div>
          ) : (
            <pre className={cn(TERMINAL_PRE, "text-foreground/90")}>{stdout}</pre>
          )}

          {stdout.length > 0 && (
            <div className="text-muted-foreground/60 font-mono text-[10px]">
              {endsWithNewline
                ? "⏎ output ends with a newline"
                : "⚠ output does not end with a newline"}
            </div>
          )}

          {/* Verdict. Names the oracle; does not diff against it. */}
          <div
            className={cn(
              "border-border/50 flex items-start gap-1.5 border-t pt-1.5 font-mono text-[11px]",
              match ? "text-green-400" : "text-red-400"
            )}
          >
            {match ? (
              <CheckCircle className="mt-0.5 h-3 w-3 flex-shrink-0" aria-hidden="true" />
            ) : (
              <XCircle className="mt-0.5 h-3 w-3 flex-shrink-0" aria-hidden="true" />
            )}
            <span>
              {match ? (
                <>output matches {oraclePath} exactly</>
              ) : (
                <>
                  output does not match {oraclePath}
                  <span className="text-muted-foreground/70 block text-[10px]">
                    diff it yourself: the expected output is in task.md
                  </span>
                </>
              )}
            </span>
          </div>
        </>
      )}
    </div>
  )
}

export default TerminalOutput
