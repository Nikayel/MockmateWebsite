/**
 * The SQL half of "a replayer that picks the harness by the ticket's test language" (PLAN.md
 * Task 7). Composes the Task 5 PGlite harness (`runPgSuiteNode`, imported and never modified).
 *
 * SCOPE, stated plainly: no real SQL-shaped Sprint Labs ticket exists anywhere yet to design this
 * bridge against -- Meridian's sprint 3 ("Tenants", the RLS/Postgres sprint) is a content stub
 * (Task 16) with no `setup.diff`/`reference.diff`/tests until Tasks 17-20, and `_fixture-workbook`
 * (Task 2's compiler fixture) has no SQL ticket at all. Rather than inventing a whole authoring
 * file-tree convention and presenting it as settled, this module does the one thing that IS well
 * defined regardless of how that convention eventually looks -- run a `PgSuite` through
 * `runPgSuiteNode` and summarize red/green -- and defines the NARROWEST possible bridge from an
 * authored ticket to a `PgSuite`, documented as a proposal, not a spec quote:
 *
 *  - `migrations[]` = every `migrations/*.sql` file in the materialized workspace, filename order
 *    (matches how Meridian's seed already names its 3 migrations, per docs/sprint-labs/
 *    WORKBOOK-SPEC.md §3's file table).
 *  - `learnerSql` = the MATERIALIZED tree's root-level `learner.sql`, if setup.diff/reference.diff
 *    created one; empty string otherwise (a migration-only ticket's "learner SQL" IS the migration
 *    itself, already in `migrations[]`). Deliberately NOT read from the ticket's static authoring
 *    directory: red/green requires this content to differ between the setup and reference states,
 *    which only the materialized (diff-applied) tree can represent.
 *  - `assertions[]`/`seedSql`/`options` = parsed from the ticket's OWN `tests/visible/*.pgsuite.yaml`
 *    (or `.yml`/`.json`) descriptor -- a new, minimal shape this task introduces (`{seedSql?,
 *    assertions[], options?}`), not an authored convention that predates this task.
 *
 * A SQL-routed ticket (`language.ts`) with no recognized descriptor is a `{gap}` result, not a
 * crash or a silent skip -- red-green.ts surfaces it as a named finding, the same honesty pattern
 * `hidden-tests.ts` uses for an io-case hidden test it cannot execute either.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import matter from "gray-matter"

import { runPgSuiteNode } from "@/lib/workspace-execution/pg-sandbox/node-runner"
import type { PgSuite, PgSuiteAssertion } from "@/lib/workspace-execution/pg-sandbox/types"
import type { WorkspaceExecutionResult } from "@/lib/workspace-execution/types"

import type { AuthoredTicket } from "../tree"
import type { ValidationFinding } from "../types"
import type { MaterializedFile } from "./git-workspace"

interface GrayMatterYamlEngine {
  engines: { yaml: { parse(input: string): unknown } }
}
const matterWithEngines = matter as unknown as typeof matter & GrayMatterYamlEngine

function parseYaml(raw: string): Record<string, unknown> {
  const parsed: unknown = matterWithEngines.engines.yaml.parse(raw)
  return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {}
}

function toAssertions(value: unknown): PgSuiteAssertion[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (entry): entry is PgSuiteAssertion =>
      Boolean(entry) &&
      typeof entry === "object" &&
      typeof (entry as PgSuiteAssertion).id === "string" &&
      typeof (entry as PgSuiteAssertion).sql === "string" &&
      "expect" in (entry as object)
  )
}

function findPgSuiteDescriptor(ticket: AuthoredTicket): Record<string, unknown> | null {
  const visibleDir = join(ticket.dirPath, "tests", "visible")
  if (!existsSync(visibleDir)) return null

  const descriptorName = readdirSync(visibleDir).find((name) => /\.pgsuite\.ya?ml$/.test(name))
  if (!descriptorName) return null

  return parseYaml(readFileSync(join(visibleDir, descriptorName), "utf8"))
}

function migrationsFromMaterializedTree(files: MaterializedFile[]): string[] {
  return files
    .filter((file) => /^migrations\/.*\.sql$/.test(file.path))
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((file) => file.content)
}

export interface BuildPgSuiteGap {
  gap: ValidationFinding
}

export interface BuildPgSuiteOk {
  suite: PgSuite
}

/** Builds this ticket's `PgSuite` from its `tests/visible/*.pgsuite.yaml` descriptor plus the
 *  materialized tree's `migrations/*.sql` files. Returns a `{gap}` (never throws) when no
 *  descriptor is authored -- see this file's header for why that is an honest gap, not a crash. */
export function buildPgSuiteForTicket(
  ticket: AuthoredTicket,
  materializedFiles: MaterializedFile[]
): BuildPgSuiteOk | BuildPgSuiteGap {
  const descriptor = findPgSuiteDescriptor(ticket)
  if (!descriptor) {
    return {
      gap: {
        ruleId: "dynamic-sql-suite-not-authored",
        severity: "warn",
        ticketKey: ticket.key,
        message:
          "ticket is SQL-routed but authors no tests/visible/*.pgsuite.yaml descriptor; excluded from the dynamic red/green gate.",
      },
    }
  }

  const assertions = toAssertions(descriptor.assertions)
  if (assertions.length === 0) {
    return {
      gap: {
        ruleId: "dynamic-sql-suite-not-authored",
        severity: "warn",
        ticketKey: ticket.key,
        message:
          "ticket's *.pgsuite.yaml descriptor has zero valid assertions; excluded from the dynamic red/green gate.",
      },
    }
  }

  // `learner.sql` is read from the MATERIALIZED tree (a fixed root-level path setup.diff/
  // reference.diff create and modify like any other file), not from the ticket's static authoring
  // directory: red/green requires this content to differ between the two states, which a file
  // outside the diff-applied tree structurally cannot do. (An earlier version of this function
  // read it from `ticket.dirPath` -- a real bug, caught and fixed while writing this task's own
  // SQL-path tests; see task-7-report.md.)
  const learnerSql = materializedFiles.find((file) => file.path === "learner.sql")?.content ?? ""

  const suite: PgSuite = {
    migrations: migrationsFromMaterializedTree(materializedFiles),
    seedSql: typeof descriptor.seedSql === "string" ? descriptor.seedSql : undefined,
    learnerSql,
    assertions,
  }

  return { suite }
}

export interface PgSuiteRunSummary {
  result: WorkspaceExecutionResult
  allPassed: boolean
}

/** Thin, direct composition of the Task 5 harness -- the part of this bridge that needs no
 *  ticket-authoring convention to be well-defined, and the part exercised directly by a synthetic
 *  suite in this module's own tests (see dynamic/__tests__/sql-replay.test.ts). */
export async function runPgSuiteAndSummarize(suite: PgSuite): Promise<PgSuiteRunSummary> {
  const result = await runPgSuiteNode(suite)
  return { result, allPassed: result.success }
}
