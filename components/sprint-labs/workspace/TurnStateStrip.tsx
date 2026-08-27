"use client"

/**
 * TurnStateStrip — Layer D as one line above the composer (UX-SPEC.md §1.8, §7):
 * "`3 visible tests red · 2 files changed · turn 7`. It is recomputed after every local test run
 * and every edit-debounce flush. On resume, before the first run of the session, it reads 'Run the
 * visible tests to refresh this' at `--wb-faint` rather than showing a restored count, because a
 * stale red count is worse than none. This strip is the highest value-per-token item in the agent
 * design; it is not decorative."
 *
 * Purely presentational and controlled: the caller (`useWorkspaceVisibleTests`) owns the actual
 * never-run/running/fresh/stale state machine and passes the rendered numbers down.
 */
import { cn } from "@/lib/utils"

export type TurnStateStripStatus = "never-run" | "running" | "fresh" | "stale"

export interface TurnStateStripProps {
  status: TurnStateStripStatus
  /** Count of currently-red visible tests. Ignored while `status === "never-run"`. */
  failingCount?: number
  /** Count of files changed since the ticket started. Ignored while `status === "never-run"`. */
  filesChanged?: number
  /** Best-effort turn count (see WorkspaceView's doc comment on why this can lag PartnerChat's own
   *  internal counter). Omitted entirely from the line when not yet known. */
  turnIndex?: number
  className?: string
}

export function TurnStateStrip({
  status,
  failingCount = 0,
  filesChanged = 0,
  turnIndex,
  className,
}: TurnStateStripProps) {
  if (status === "never-run") {
    return (
      <p className={cn("text-[11px] text-[var(--wb-faint)]", className)} role="status">
        Run the visible tests to refresh this
      </p>
    )
  }

  const testWord = failingCount === 1 ? "test" : "tests"
  const fileWord = filesChanged === 1 ? "file" : "files"
  const parts = [
    failingCount === 0 ? "All visible tests green" : `${failingCount} visible ${testWord} red`,
    `${filesChanged} ${fileWord} changed`,
  ]
  if (typeof turnIndex === "number") parts.push(`turn ${turnIndex}`)

  return (
    <p className={cn("text-[11px] text-[var(--wb-text-secondary)]", className)} role="status">
      {parts.join(" · ")}
      {status === "stale" && (
        <span className="ml-1 text-[var(--wb-faint)]" title="Edited since the last run">
          (stale)
        </span>
      )}
      {status === "running" && <span className="ml-1 text-[var(--wb-faint)]">(running…)</span>}
    </p>
  )
}
