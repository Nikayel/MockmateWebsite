import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { loadWorkbookTree } from "../../load-tree"
import type { AuthoredWorkbook } from "../../tree"
import { readAllFiles } from "../git-workspace"
import {
  allTicketsInOrder,
  cleanupGitWorkspace,
  materializeThroughReference,
  materializeThroughSetup,
  priorTickets,
} from "../materialize"

const FIXTURES = join(__dirname, "fixtures")

describe("allTicketsInOrder / priorTickets", () => {
  it("orders sprint-then-key, and priorTickets includes an earlier ticket in the SAME sprint (not just earlier sprints)", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "happy-path"))

    const all = allTicketsInOrder(workbook)
    expect(all.map((entry) => entry.ticket.key)).toEqual(["FIX-101", "FIX-102"])

    expect(priorTickets(workbook, "FIX-102").map((entry) => entry.ticket.key)).toEqual(["FIX-101"])
    expect(priorTickets(workbook, "FIX-101")).toEqual([])
  })
})

describe("materializeThroughSetup", () => {
  it("materializes seed(empty) + this ticket's setup.diff for the first ticket -- the buggy state", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "happy-path"))
    const materialized = materializeThroughSetup(workbook, "FIX-101")
    try {
      expect(materialized.failure).toBeNull()
      expect(readAllFiles(materialized.ws)).toEqual([
        {
          path: "src/math.ts",
          content:
            "export function add(a: number, b: number): number {\n  return Math.abs(a) + Math.abs(b)\n}\n",
        },
      ])
    } finally {
      cleanupGitWorkspace(materialized.ws)
    }
  })

  it("materializes seed + FIX-101's reference.diff (prior ticket, same sprint) + FIX-102's own setup.diff", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "happy-path"))
    const materialized = materializeThroughSetup(workbook, "FIX-102")
    try {
      expect(materialized.failure).toBeNull()
      const files = readAllFiles(materialized.ws)
      const mathFile = files.find((f) => f.path === "src/math.ts")
      const multiplyFile = files.find((f) => f.path === "src/multiply.ts")

      // FIX-101's FIXED math.ts already landed (its reference, not its setup, is on this tree).
      expect(mathFile?.content).toContain("return a + b")
      // FIX-102's own BUGGY multiply.ts is present (setup applied, reference not yet).
      expect(multiplyFile?.content).toContain("return add(a, count)")
      expect(files).toHaveLength(2)
    } finally {
      cleanupGitWorkspace(materialized.ws)
    }
  })
})

describe("materializeThroughReference", () => {
  it("applies this ticket's own reference.diff on top of materializeThroughSetup's tree", () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "happy-path"))
    const materialized = materializeThroughReference(workbook, "FIX-102")
    try {
      expect(materialized.failure).toBeNull()
      const files = readAllFiles(materialized.ws)
      const multiplyFile = files.find((f) => f.path === "src/multiply.ts")
      expect(multiplyFile?.content).toContain("for (let i = 0; i < count; i++)")
    } finally {
      cleanupGitWorkspace(materialized.ws)
    }
  })

  it("returns a structured failure (never throws) when a ticket has no reference.diff authored -- a stub", () => {
    const stubWorkbook: AuthoredWorkbook = {
      id: "stub-workbook",
      dir: join(FIXTURES, "happy-path"), // reuse for its repo/ (absent -> empty seed); unused otherwise
      raw: {},
      objectivesVocabulary: [],
      seedFiles: new Set(),
      meridianMd: null,
      sprints: [
        {
          dirName: "01-only",
          dirPath: join(FIXTURES, "happy-path/sprints/01-only"),
          number: 1,
          raw: {},
          objectives: [],
          filesTouched: [],
          newSourceFiles: [],
          rewrittenFiles: [],
          tickets: [
            {
              key: "STUB-1",
              dirPath: join(FIXTURES, "happy-path/sprints/01-only/tickets/FIX-101"),
              sprintNumber: 1,
              frontmatterRaw: {},
              bodyMd: "",
              labels: [],
              objectives: [],
              acceptanceCriteria: [],
              setupDiff: null,
              referenceDiff: null, // the point of this test: not authored yet
              authorBriefRaw: null,
              hiddenTests: [],
            },
          ],
        },
      ],
    }

    const materialized = materializeThroughReference(stubWorkbook, "STUB-1")
    try {
      expect(materialized.failure).toMatchObject({
        ticketKey: "STUB-1",
        diffKind: "reference",
        error: "ticket has no reference.diff authored",
      })
    } finally {
      cleanupGitWorkspace(materialized.ws)
    }
  })
})
