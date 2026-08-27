/**
 * Turns an `AuthoredWorkbook` tree-snapshot (Task 3's `load-tree.ts`) into a real materialized
 * source tree on disk, for one ticket at a time, per docs/sprint-labs/WORKBOOK-SPEC.md §6:
 * seed -> every PRIOR ticket's `reference.diff` -> this ticket's OWN `setup.diff` (the RED /
 * "learner bundle" state) -> optionally this ticket's OWN `reference.diff` on top (the GREEN
 * state). All diff application goes through `git-workspace.ts`'s real `git apply`.
 *
 * "Prior ticket" ordering — resolved wider than the brief's literal words, documented here because
 * it is load-bearing: WORKBOOK-SPEC.md §6 and PLAN.md Task 7 both say "prior-SPRINT reference
 * diffs". Taken literally, that would exclude an earlier ticket in the SAME sprint. The fixture
 * content itself falsifies that reading: DEMO-102's `setup.diff` (sprint 1) imports
 * `parseClaimPayload` from the file DEMO-101's `reference.diff` (also sprint 1, earlier ticket key)
 * creates — confirmed empirically by materializing DEMO-101 then DEMO-102 in ticket-key order
 * through a real `git apply` sequence (task-7-report.md). `allTicketsInOrder` therefore uses the
 * WHOLE workbook's total order (sprint number ascending, ticket key ascending within a sprint --
 * exactly how `load-tree.ts` already sorts `AuthoredWorkbook.sprints`/`AuthoredSprint.tickets`), and
 * "prior" means "earlier in that total order", same-sprint included. Flagged for the coordinator:
 * if a future ticket genuinely needs same-sprint tickets to NOT be cumulative, this function's
 * ordering assumption is the one place to revisit.
 *
 * A ticket with no authored `reference.diff` at all (a Task 16 stub -- true today of every Meridian
 * ticket outside sprints 1-4, and of every Meridian ticket period until Tasks 17-20 land content) is
 * NOT a materialization failure: `priorTickets` callers skip a stub's contribution to the tree
 * (nothing to apply yet), and the orchestrator (`dynamic/index.ts`) skips grading a stub outright
 * rather than reporting one error per un-authored ticket. See PLAN.md Task 7's own verification note
 * making this the expected state for `workbooks/meridian` today.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

import type { AuthoredSprint, AuthoredTicket, AuthoredWorkbook } from "../tree"
import {
  applyDiff,
  cleanupGitWorkspace,
  commitAll,
  createGitWorkspace,
  type GitWorkspace,
  toWorkspaceRelativePath,
  writeWorkspaceFiles,
  type MaterializedFile,
} from "./git-workspace"

export interface TicketLocation {
  sprint: AuthoredSprint
  ticket: AuthoredTicket
}

/** Every ticket in the workbook, sprint-then-key order (see this file's header). */
export function allTicketsInOrder(workbook: AuthoredWorkbook): TicketLocation[] {
  return workbook.sprints.flatMap((sprint) => sprint.tickets.map((ticket) => ({ sprint, ticket })))
}

export function findTicketLocation(workbook: AuthoredWorkbook, ticketKey: string): TicketLocation {
  const location = allTicketsInOrder(workbook).find((entry) => entry.ticket.key === ticketKey)
  if (!location) throw new Error(`Ticket not found in workbook "${workbook.id}": ${ticketKey}`)
  return location
}

/** Every ticket strictly before `ticketKey` in the workbook's total order. */
export function priorTickets(workbook: AuthoredWorkbook, ticketKey: string): TicketLocation[] {
  const all = allTicketsInOrder(workbook)
  const index = all.findIndex((entry) => entry.ticket.key === ticketKey)
  if (index === -1) throw new Error(`Ticket not found in workbook "${workbook.id}": ${ticketKey}`)
  return all.slice(0, index)
}

function readSeedFiles(workbook: AuthoredWorkbook): MaterializedFile[] {
  const repoDir = join(workbook.dir, "repo")
  if (!existsSync(repoDir)) return []

  const out: MaterializedFile[] = []
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full)
      } else if (entry.isFile()) {
        out.push({
          path: toWorkspaceRelativePath(repoDir, full),
          content: readFileSync(full, "utf8"),
        })
      }
    }
  }
  walk(repoDir)
  return out
}

export interface MaterializeStepFailure {
  ticketKey: string
  diffKind: "setup" | "reference"
  error: string
}

export interface MaterializeResult {
  ws: GitWorkspace
  /** Null on success. The caller MUST still `cleanupGitWorkspace(ws)` either way. */
  failure: MaterializeStepFailure | null
}

/**
 * Seed + every prior ticket's `reference.diff` + this ticket's own `setup.diff` (if authored). This
 * is BOTH the RED-state input for the red/green gate AND, independently, exactly "the workspace
 * bundle a learner would receive when opening this ticket" — the provisioning scan's own input
 * (provisioning.ts reuses this function directly rather than re-deriving the same tree).
 */
export function materializeThroughSetup(
  workbook: AuthoredWorkbook,
  ticketKey: string
): MaterializeResult {
  const location = findTicketLocation(workbook, ticketKey)
  const ws = createGitWorkspace()

  // Every step below (writeWorkspaceFiles, commitAll, applyDiff's own internal git calls) can
  // throw on a genuinely unexpected error (not the "diff didn't apply" case, which is already a
  // controlled `{failure}` return) -- a temp dir with no `ws` ever handed back to a caller would
  // otherwise leak forever, since `createGitWorkspace()` already created it on disk before any of
  // this runs. Catches, cleans up, and re-throws: the caller still sees the real error, but the
  // `mkdtemp` directory never survives it.
  try {
    return materializeThroughSetupUnguarded(workbook, ticketKey, location, ws)
  } catch (error) {
    cleanupGitWorkspace(ws)
    throw error
  }
}

function materializeThroughSetupUnguarded(
  workbook: AuthoredWorkbook,
  ticketKey: string,
  location: TicketLocation,
  ws: GitWorkspace
): MaterializeResult {
  const seed = readSeedFiles(workbook)
  if (seed.length > 0) {
    writeWorkspaceFiles(ws, seed)
    commitAll(ws, "seed: repo/")
  }

  for (const prior of priorTickets(workbook, ticketKey)) {
    if (!prior.ticket.referenceDiff) continue // stub: nothing shipped yet, contributes nothing

    // A prior ticket's reference.diff is authored to apply ON TOP OF its own setup-applied state
    // (the same red/green contract this ticket's own reference.diff follows) -- when its
    // reference.diff modifies a file setup.diff created (the common case: setup.diff creates the
    // buggy version, reference.diff patches it), applying reference.diff alone against the seed
    // fails with "No such file or directory". So a prior ticket's setup.diff (if authored) MUST
    // land first. Confirmed as a real, reproduced bug against this task's own happy-path fixture
    // (FIX-102 depending on FIX-101) before this fix -- see task-7-report.md.
    if (prior.ticket.setupDiff) {
      const setupResult = applyDiff(ws, prior.ticket.setupDiff)
      if (!setupResult.applied) {
        return {
          ws,
          failure: {
            ticketKey: prior.ticket.key,
            diffKind: "setup",
            error: setupResult.error ?? "unknown",
          },
        }
      }
      commitAll(ws, `setup: ${prior.ticket.key}`)
    }

    const result = applyDiff(ws, prior.ticket.referenceDiff)
    if (!result.applied) {
      return {
        ws,
        failure: {
          ticketKey: prior.ticket.key,
          diffKind: "reference",
          error: result.error ?? "unknown",
        },
      }
    }
    commitAll(ws, `reference: ${prior.ticket.key}`)
  }

  if (location.ticket.setupDiff) {
    const result = applyDiff(ws, location.ticket.setupDiff)
    if (!result.applied) {
      return { ws, failure: { ticketKey, diffKind: "setup", error: result.error ?? "unknown" } }
    }
    commitAll(ws, `setup: ${ticketKey}`)
  }

  return { ws, failure: null }
}

/** `materializeThroughSetup` plus this ticket's OWN `reference.diff` applied on top -- the GREEN
 *  state, and the tree regression replay runs every prior ticket's visible suite against. */
export function materializeThroughReference(
  workbook: AuthoredWorkbook,
  ticketKey: string
): MaterializeResult {
  const base = materializeThroughSetup(workbook, ticketKey)
  if (base.failure) return base

  // Same leak guard as materializeThroughSetup's own try/catch: `base.ws` already exists on disk
  // by this point, so any unexpected throw from here on must still clean it up before propagating.
  try {
    const location = findTicketLocation(workbook, ticketKey)
    if (!location.ticket.referenceDiff) {
      return {
        ws: base.ws,
        failure: {
          ticketKey,
          diffKind: "reference",
          error: "ticket has no reference.diff authored",
        },
      }
    }

    const result = applyDiff(base.ws, location.ticket.referenceDiff)
    if (!result.applied) {
      return {
        ws: base.ws,
        failure: { ticketKey, diffKind: "reference", error: result.error ?? "unknown" },
      }
    }
    commitAll(base.ws, `reference: ${ticketKey} (own)`)
    return { ws: base.ws, failure: null }
  } catch (error) {
    cleanupGitWorkspace(base.ws)
    throw error
  }
}

export { cleanupGitWorkspace }
export type { GitWorkspace, MaterializedFile }
