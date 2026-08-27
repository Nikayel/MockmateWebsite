/**
 * SERVER-ONLY. Materializes the learner's INITIAL file tree for one ticket, at request time, by
 * reusing Task 7's dynamic materializer (`lib/sprint-labs/validate/dynamic/materialize.ts`) rather
 * than re-rolling `git apply` — see this file's header for why (`materializeThroughSetup` IS "the
 * workspace bundle a learner would receive when opening this ticket", by its own doc comment; Task
 * 7's provisioning scan already reuses it for the identical reason).
 *
 * RULING R27 (docs/sprint-labs/EXECUTION-STATE.md): provision at request time by reusing Task 7's
 * materializer. Compile-time materialization (baking a ticket's initial tree into the content
 * compiler's output at build time, which would sidestep this file's PRODUCTION NOTE below) is
 * explicitly deferred production hardening, not built here — this module never touches
 * `scripts/compile-workbooks.mjs` or anything under `lib/sprint-labs/content/`.
 *
 * This module imports `node:fs`/`node:child_process` (transitively, via `git-workspace.ts`) and
 * must never reach a client bundle. It has exactly one intended caller:
 * `app/api/sprint-labs/runs/provision/route.ts`, a Route Handler — inherently server-only in the
 * Next.js App Router regardless of bundler config, which is the real guarantee here (structurally:
 * grepping the whole app/components/lib tree for this module's path confirms that route is the only
 * import edge). Do not import this module from a "use client" component; call the route instead
 * (see `provisionSprintLabWorkspace` in `lib/sprint-labs/runs-client.ts`).
 *
 * `import "server-only"` below is defense in depth on top of that structural guarantee (review
 * round 1, MINOR-2): this repo's own `next.config.mjs` webpack override stubs `fs`/`child_process`
 * to `false` for the client bundle rather than leaving them unresolved, and this repo's installed
 * Next.js (16.1.1) runs `next build` on Turbopack by default (that `webpack()` callback likely
 * doesn't even govern the build path in use) — so neither bundler is guaranteed to fail loudly on
 * its own if a future stray client import ever creeps in. `server-only` is Next.js's own poison-pill
 * package for exactly this gap: importing it throws a build-time error from ANY client-reachable
 * module, regardless of bundler or of what else that module happens to import. Added as a real
 * dependency (`pnpm add server-only`, package.json), not assumed present.
 *
 * WHAT SHIPS TO THE LEARNER, and why the strip is a strip (not a "mark read-only"):
 *   - editable `src/**` (role "editable") — the materialized tree's own source files.
 *   - the workbook's hand-authored `MERIDIAN.md`, if any (role "docs") — Layer A, per
 *     docs/sprint-labs/AGENT-CONTEXT.md §3.
 *   - this ticket's `tests/visible/**` files (role "test"), read verbatim via Task 7's own
 *     `readVisibleTestFiles` (`dynamic/hidden-tests.ts`) — never re-derived from the compiled
 *     bundle, never re-parsed by hand here.
 * Everything else the materialized tree may legitimately carry today (`migrations/**`, `infra/**`,
 * root config like `package.json`/`tsconfig.json`/`.env.example`) is DROPPED, not merely tagged
 * non-editable: `lib/sprint-labs/workspace/tree.ts`'s three-group model (docs/src/tests) has no
 * fourth place to put them, and the server-side sandbox that would make them actionable for a
 * learner does not exist yet (EXECUTION-STATE.md: "no server-side sandbox yet"). If a later task
 * needs them mounted, that is a deliberate, separate decision — not an oversight of this pass.
 *
 * WHAT NEVER SHIPS: `tests/hidden/**`, `reference.diff`, `review.yaml`, `author_brief.yaml`,
 * `rubric.yaml`, `adversary/**`, any sealed artifact. These cannot appear in
 * `materializeThroughSetup`'s own output BY CONSTRUCTION — it only ever writes the seed tree plus
 * applied unified diffs, never a ticket's authoring-directory siblings (`ticket.md`, `rubric.yaml`,
 * hidden-test YAMLs, ... all live in a directory tree this function never reads). Sealed content
 * (the compiled secret bundle, `lib/scenarios/sealed/sprint-labs/`) lives in a third, entirely
 * separate module tree this function also never reads from. `isForbiddenLearnerPath` is a second,
 * independent, path-based guard applied to every category this module emits anyway — defense in
 * depth against the residual risk that some diff's own hunk text creates a path shaped like one of
 * these (e.g. `src/tests/hidden/x.ts`, which would otherwise pass the plain `src/` prefix filter).
 * See `__tests__/materialize-initial-tree.test.ts`, which additionally reuses Task 7's own
 * `scanProvisionedBundleContent`/`scanFreshWorkspaceGitObjects` against the SAME underlying
 * materialized tree this module strips, so a clean scan there is a clean scan of this module's own
 * input.
 *
 * PRODUCTION NOTE (part of R27's own "deferred hardening" bucket, flagged rather than guessed at):
 * this module resolves `workbooks/<id>/**` from `process.cwd()` and reads it with plain `node:fs`
 * calls at REQUEST time. Next.js's build-time file tracer (`@vercel/nft`) statically follows
 * `import`/`require`, not an arbitrary runtime `fs` call built from a non-literal base path — so on
 * a real Vercel deployment, `workbooks/**` may not be included in this route's traced serverless
 * bundle unless `next.config.mjs` is given an explicit `outputFileTracingIncludes` entry for this
 * route (or the compile-time approach ships later and this module is retired). This could not be
 * verified against a live Vercel deploy from this environment, so it is reported rather than
 * silently patched into a shared root config file outside this task's stated ownership. Local dev
 * and every check in task-runtimeA-report.md are unaffected — the whole repo, `workbooks/` included,
 * is on disk in both.
 */
import "server-only"

import { existsSync, readdirSync } from "node:fs"
import { join, sep } from "node:path"

import { logger } from "@/lib/logger"
import { loadWorkbookTree } from "@/lib/sprint-labs/validate/load-tree"
import type { AuthoredWorkbook } from "@/lib/sprint-labs/validate/tree"
import { cleanupGitWorkspace, readAllFiles } from "@/lib/sprint-labs/validate/dynamic/git-workspace"
import {
  findTicketLocation,
  materializeThroughSetup,
} from "@/lib/sprint-labs/validate/dynamic/materialize"
import { readVisibleTestFiles } from "@/lib/sprint-labs/validate/dynamic/hidden-tests"

/** Matches `WorkspaceScenarioFileRole` (`lib/scenarios/types.ts`) verbatim for naming consistency
 *  across the two (deliberately separate — see `lib/sprint-labs/workspace-files.ts`'s own header on
 *  why Sprint Labs' workspace types are not the DSA/bugfix scenario domain's types) workspace
 *  systems. Only three of the four values are ever produced today: "editable" (src/**),
 *  "docs" (MERIDIAN.md — matches `lib/sprint-labs/workspace/tree.ts`'s own "docs" group for the
 *  identical file), and "test" (visible tests, read-only reference — see that same file's header
 *  for why tests render locked). "readonly" is reserved for a future locked-src-file ticket shape
 *  that does not exist yet; carried in the union now so adding one later is not a breaking change. */
export type ProvisionedFileRole = "editable" | "readonly" | "test" | "docs"

export interface ProvisionedFile {
  path: string
  content: string
  role: ProvisionedFileRole
}

export const PROVISIONING_ERRORS = {
  UNKNOWN_WORKBOOK: "UNKNOWN_WORKBOOK",
  UNKNOWN_TICKET: "UNKNOWN_TICKET",
  MATERIALIZE_FAILED: "MATERIALIZE_FAILED",
} as const

/** Map a thrown error from {@link materializeInitialTree} to an HTTP status, mirroring
 *  `sprintLabRunErrorStatus`'s convention (`lib/sprint-labs/runs.ts`) so the route's catch block
 *  can compose both. `null` means "not one of ours" (the route falls back to a generic 500). */
export function provisioningErrorStatus(error: unknown): number | null {
  if (!(error instanceof Error)) return null
  switch (error.message) {
    case PROVISIONING_ERRORS.UNKNOWN_WORKBOOK:
    case PROVISIONING_ERRORS.UNKNOWN_TICKET:
      return 404
    default:
      return null
  }
}

const WORKBOOKS_ROOT = join(process.cwd(), "workbooks")

/**
 * Every path this module emits is checked against this, regardless of which of the three
 * categories it came from (see this file's header). `tests/hidden/` and `adversary/` are checked
 * as path segments anywhere in the path (not just a prefix): a diff could in principle create
 * `src/tests/hidden/x.ts`, which would otherwise pass a naive `src/`-prefix inclusion filter. The
 * four named files are checked by basename, matching how they are always authored (a bare filename
 * directly under a ticket's own directory, never nested).
 */
function isForbiddenLearnerPath(path: string): boolean {
  if (/(?:^|\/)tests\/hidden\//.test(path)) return true
  if (/(?:^|\/)adversary\//.test(path)) return true
  const base = path.split("/").pop() ?? path
  return (
    base === "reference.diff" ||
    base === "review.yaml" ||
    base === "author_brief.yaml" ||
    base === "rubric.yaml"
  )
}

/**
 * workbookId -> its authored directory under `workbooks/`. Directory name usually equals the id
 * (`workbooks/meridian` declares `id: meridian`), but is not guaranteed to: the content compiler's
 * own fixture workbook lives at `workbooks/_fixture-workbook` and declares `id: fixture-demo` (its
 * `workbook.yaml`'s own header explains why — it exists only to exercise the compiler, and the
 * leading underscore keeps it out of any glob that means "real workbooks"). A fast direct-path
 * check covers the common case for zero extra I/O; the fallback scans every `workbooks/*`
 * subdirectory's own declared id, reusing `loadWorkbookTree` rather than a second, hand-rolled YAML
 * read — `workbooks/` holds a handful of entries today, so this is cheap even in the fallback case.
 *
 * The direct-path check joins the CALLER-INFLUENCEABLE `workbookId` onto `WORKBOOKS_ROOT` (review
 * round 1, MINOR-3): `path.join` normalizes `..` segments, so an unvalidated id could otherwise walk
 * the resolved path outside `workbooks/` entirely (e.g. `"../../lib/scenarios/sealed"`). Today's one
 * caller (`materializeInitialTree`, reached only via `run.workbookId` — a value the run's own
 * creation path already validated against the compiled registry, see `requireKnownWorkbookAndTickets`
 * in `runs.ts`) never passes anything attacker-shaped, but hardening the primitive itself rather than
 * trusting every future caller to re-derive that guarantee is the point of a shared resolver. The
 * fallback scan needs no equivalent check: `entry.name` there always comes from a real
 * `readdirSync(WORKBOOKS_ROOT)` listing, so `join(WORKBOOKS_ROOT, entry.name)` can only ever name an
 * actual immediate child of `WORKBOOKS_ROOT`.
 */
function resolveWorkbookDir(workbookId: string): string | null {
  if (!existsSync(WORKBOOKS_ROOT)) return null

  const direct = join(WORKBOOKS_ROOT, workbookId)
  if (!direct.startsWith(WORKBOOKS_ROOT + sep)) return null
  if (existsSync(join(direct, "workbook.yaml"))) return direct

  for (const entry of readdirSync(WORKBOOKS_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const dir = join(WORKBOOKS_ROOT, entry.name)
    if (!existsSync(join(dir, "workbook.yaml"))) continue
    try {
      if (loadWorkbookTree(dir).id === workbookId) return dir
    } catch {
      continue // a broken sibling workbook must not block resolving the one actually requested
    }
  }
  return null
}

function loadWorkbookById(workbookId: string): AuthoredWorkbook {
  const dir = resolveWorkbookDir(workbookId)
  if (!dir) throw new Error(PROVISIONING_ERRORS.UNKNOWN_WORKBOOK)
  return loadWorkbookTree(dir)
}

/**
 * The learner's initial file tree for `ticketKey` in `workbookId`. See this file's header for the
 * full shape and security reasoning. Synchronous, like every function it composes (`git-workspace.ts`
 * shells out to `git` synchronously throughout).
 *
 * Throws `Error("UNKNOWN_WORKBOOK")` / `Error("UNKNOWN_TICKET")` for a bad id/key (map via
 * {@link provisioningErrorStatus}), and `Error("MATERIALIZE_FAILED")` if a ticket's authored
 * setup/reference diff fails to apply — a content-authoring bug already caught by
 * `pnpm lab:validate --dynamic`, logged here with the full failure detail server-side (never in
 * the thrown message itself, which stays a bare code so a route can safely echo it to the client
 * the same way every other Sprint Labs error code is echoed).
 */
export function materializeInitialTree(workbookId: string, ticketKey: string): ProvisionedFile[] {
  const workbook = loadWorkbookById(workbookId)

  let ticket
  try {
    ticket = findTicketLocation(workbook, ticketKey).ticket
  } catch {
    throw new Error(PROVISIONING_ERRORS.UNKNOWN_TICKET)
  }

  const materialized = materializeThroughSetup(workbook, ticketKey)
  try {
    if (materialized.failure) {
      logger.error("Sprint Labs provisioning: materializeThroughSetup failed to apply a diff", {
        workbookId,
        ticketKey,
        failedTicketKey: materialized.failure.ticketKey,
        diffKind: materialized.failure.diffKind,
        error: materialized.failure.error,
      })
      throw new Error(PROVISIONING_ERRORS.MATERIALIZE_FAILED)
    }

    const files: ProvisionedFile[] = []

    for (const file of readAllFiles(materialized.ws)) {
      if (file.path !== "src" && !file.path.startsWith("src/")) continue
      if (isForbiddenLearnerPath(file.path)) continue
      files.push({ path: file.path, content: file.content, role: "editable" })
    }

    const meridianMd = workbook.meridianMd
    if (meridianMd && meridianMd.trim().length > 0 && !isForbiddenLearnerPath("MERIDIAN.md")) {
      files.push({ path: "MERIDIAN.md", content: meridianMd, role: "docs" })
    }

    for (const test of readVisibleTestFiles(ticket)) {
      if (isForbiddenLearnerPath(test.path)) continue
      files.push({ path: test.path, content: test.content, role: "test" })
    }

    return files
  } finally {
    cleanupGitWorkspace(materialized.ws)
  }
}
