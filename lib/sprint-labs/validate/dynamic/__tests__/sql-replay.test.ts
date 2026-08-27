/**
 * The SQL half of the replayer. Two levels, per sql-replay.ts's own documented scope split:
 *  - `runPgSuiteAndSummarize` exercised DIRECTLY with a hand-built, synthetic `PgSuite` -- the
 *    part of the bridge that needs no ticket-authoring convention to be well defined.
 *  - `buildPgSuiteForTicket` exercised against `fixtures/sql-ticket/SQL-101`, this task's OWN
 *    minimal, documented ticket->PgSuite convention (no real Meridian SQL content exists yet to
 *    confirm this against -- see sql-replay.ts's header).
 */
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import type { PgSuite } from "@/lib/workspace-execution/pg-sandbox/types"

import { loadWorkbookTree } from "../../load-tree"
import { readAllFiles } from "../git-workspace"
import {
  findTicketLocation,
  materializeThroughReference,
  materializeThroughSetup,
} from "../materialize"
import { buildPgSuiteForTicket, runPgSuiteAndSummarize } from "../sql-replay"
import { runDynamicGateForTicket } from "../red-green"
import { cleanupGitWorkspace } from "../materialize"

const FIXTURES = join(__dirname, "fixtures")

describe("runPgSuiteAndSummarize (direct, synthetic suite -- no ticket authoring involved)", () => {
  const migrations = [`create table nums (n int not null);`]
  const assertions: PgSuite["assertions"] = [
    {
      id: "has-positive-five",
      humanName: "nums contains the value 5",
      sql: `select n from nums;`,
      expect: { rows: [[5]] },
    },
  ]

  it("RED: a buggy learnerSql (inserts -5) does not satisfy the assertion", async () => {
    const summary = await runPgSuiteAndSummarize({
      migrations,
      learnerSql: `insert into nums (n) values (-5);`,
      assertions,
    })
    expect(summary.allPassed).toBe(false)
  }, 15_000)

  it("GREEN: the fixed learnerSql (inserts 5) satisfies the assertion", async () => {
    const summary = await runPgSuiteAndSummarize({
      migrations,
      learnerSql: `insert into nums (n) values (5);`,
      assertions,
    })
    expect(summary.allPassed).toBe(true)
  }, 15_000)
})

describe("buildPgSuiteForTicket (ticket -> PgSuite bridge, this task's own fixture)", () => {
  it("builds a suite from the materialized tree's migrations/*.sql + root learner.sql + the ticket's *.pgsuite.yaml assertions", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "sql-ticket"))
    const { ticket } = findTicketLocation(workbook, "SQL-101")
    const materialized = materializeThroughSetup(workbook, "SQL-101")
    try {
      expect(materialized.failure).toBeNull()
      const built = buildPgSuiteForTicket(ticket, readAllFiles(materialized.ws))
      expect("suite" in built).toBe(true)
      if (!("suite" in built)) throw new Error("expected a suite, got a gap")
      expect(built.suite.migrations).toEqual(["create table nums (n int not null);\n"])
      expect(built.suite.learnerSql).toContain("-5")
      expect(built.suite.assertions).toHaveLength(1)
    } finally {
      cleanupGitWorkspace(materialized.ws)
    }
  })

  it("reports a named gap (not a crash) for a SQL-routed ticket with no *.pgsuite.yaml descriptor", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "sql-ticket"))
    const { ticket } = findTicketLocation(workbook, "SQL-101")
    const materialized = materializeThroughSetup(workbook, "SQL-101")
    try {
      const built = buildPgSuiteForTicket(
        { ...ticket, dirPath: join(FIXTURES, "happy-path/sprints/01-only/tickets/FIX-101") },
        readAllFiles(materialized.ws)
      )
      expect("gap" in built).toBe(true)
      if (!("gap" in built)) throw new Error("expected a gap")
      expect(built.gap).toMatchObject({
        ruleId: "dynamic-sql-suite-not-authored",
        severity: "warn",
      })
    } finally {
      cleanupGitWorkspace(materialized.ws)
    }
  })
})

describe("runDynamicGateForTicket routes a sql-labeled ticket through the SQL path end to end", () => {
  it("SQL-101 goes red->green with zero findings via the full gate orchestration", async () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "sql-ticket"))
    const { ticket } = findTicketLocation(workbook, "SQL-101")

    const findings = await runDynamicGateForTicket(workbook, ticket)

    expect(findings).toEqual([])
  }, 20_000)
})

// Sanity: materializeThroughReference genuinely produces the fixed learner.sql (guards against a
// regression to the bug this task's own SQL-path work found and fixed -- learnerSql being read
// from the ticket's static authoring dir instead of the materialized tree, which can never
// reflect setup vs reference).
describe("materialized learner.sql actually differs between setup and reference", () => {
  it("setup state has the buggy insert, reference state has the fixed one", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "sql-ticket"))
    const setupOnly = materializeThroughSetup(workbook, "SQL-101")
    const withReference = materializeThroughReference(workbook, "SQL-101")
    try {
      expect(readAllFiles(setupOnly.ws).find((f) => f.path === "learner.sql")?.content).toContain(
        "-5"
      )
      expect(
        readAllFiles(withReference.ws).find((f) => f.path === "learner.sql")?.content
      ).toContain("(5)")
    } finally {
      cleanupGitWorkspace(setupOnly.ws)
      cleanupGitWorkspace(withReference.ws)
    }
  })
})
