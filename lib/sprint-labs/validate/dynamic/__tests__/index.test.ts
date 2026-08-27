import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { loadWorkbookTree } from "../../load-tree"
import type { AuthoredWorkbook } from "../../tree"
import { validateWorkbookDynamic } from "../index"

const FIXTURES = join(__dirname, "fixtures")

function stubTicketWorkbook(): AuthoredWorkbook {
  return {
    id: "stub-workbook",
    dir: join(FIXTURES, "happy-path"),
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
            referenceDiff: null, // a Task 16 stub -- nothing authored yet
            authorBriefRaw: null,
            hiddenTests: [],
          },
        ],
      },
    ],
  }
}

describe("validateWorkbookDynamic", () => {
  it("a ticket with no reference.diff (a stub) contributes ZERO findings -- 'nothing to check yet' is not 'checked and clean'", async () => {
    const findings = await validateWorkbookDynamic(stubTicketWorkbook())
    expect(findings).toEqual([])
  })

  it("runs the whole happy-path fixture workbook end to end: both tickets clean", async () => {
    const workbook = loadWorkbookTree(join(FIXTURES, "happy-path"))
    const findings = await validateWorkbookDynamic(workbook)
    expect(findings).toEqual([])
  }, 30_000)

  it("flags a ticket that authors a reference.diff but zero tests/visible files", async () => {
    const workbook: AuthoredWorkbook = {
      id: "no-visible-tests-workbook",
      dir: join(FIXTURES, "happy-path"),
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
              key: "NOVIS-1",
              // A real directory with NO tests/visible subdirectory at all.
              dirPath: join(FIXTURES, "happy-path"),
              sprintNumber: 1,
              frontmatterRaw: {},
              bodyMd: "",
              labels: [],
              objectives: [],
              acceptanceCriteria: [],
              setupDiff: null,
              referenceDiff: "diff --git a/dummy b/dummy\n", // authored, even if not appliable
              authorBriefRaw: null,
              hiddenTests: [],
            },
          ],
        },
      ],
    }

    const findings = await validateWorkbookDynamic(workbook)

    expect(
      findings.some((f) => f.ruleId === "dynamic-no-visible-tests" && f.ticketKey === "NOVIS-1")
    ).toBe(true)
  }, 20_000)
})
