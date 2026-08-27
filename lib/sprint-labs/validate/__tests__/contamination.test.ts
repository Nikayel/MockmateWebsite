/**
 * Tests for the contamination gate (PLAN.md Task 9). Every replay-through-the-harness test uses a
 * STUBBED `ContaminationModelCaller` -- never a real `generateAIResponse` call, per this task's
 * brief ("the MODEL CALL must be behind a seam you can STUB ... NOT a real API call"). The
 * no-leak proof runs against the REAL, shipped `workbooks/meridian` MER-101 content (read-only) so
 * it proves something about production data, not just a synthetic fixture.
 *
 * Every test that calls `runContaminationGateForTicket` (which always writes a cache file as a
 * side effect of a successful run) does so against a TEMP COPY of a fixture directory, never the
 * original under `lib/sprint-labs/validate/dynamic/__tests__/fixtures/` -- that tree is Task 7's
 * committed, shared fixture content; writing `.validate-cache/` into it would pollute a directory
 * this task does not own. `withTempWorkbook` is the one helper that makes every such test isolated
 * and self-cleaning.
 */
import { cpSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { getProviderStatus, type AIProvider } from "@/lib/ai-providers"

import { readVisibleTestFiles } from "../dynamic/hidden-tests"
import { findTicketLocation } from "../dynamic/materialize"
import { loadWorkbookTree } from "../load-tree"
import type { AuthoredHiddenTest, AuthoredTicket, AuthoredWorkbook } from "../tree"
import {
  buildContaminationPrompt,
  parseModelSolution,
  runContaminationGateForTicket,
  validateWorkbookContamination,
  type ContaminationModelCaller,
} from "../contamination"

const REPO_ROOT = join(__dirname, "..", "..", "..", "..")
const MERIDIAN_DIR = join(REPO_ROOT, "workbooks", "meridian")
const HAPPY_PATH_FIXTURE = join(__dirname, "..", "dynamic", "__tests__", "fixtures", "happy-path")
const IO_CASE_FIXTURE = join(
  __dirname,
  "..",
  "dynamic",
  "__tests__",
  "fixtures",
  "io-case-entrypoint-green"
)

const ADD_SOLUTION_CORRECT = JSON.stringify({
  files: [
    {
      path: "src/math.ts",
      content: "export function add(a: number, b: number): number {\n  return a + b\n}\n",
    },
  ],
})

const ADD_SOLUTION_WRONG = JSON.stringify({
  files: [
    {
      path: "src/math.ts",
      content: "export function add(a: number, b: number): number {\n  return a - b\n}\n",
    },
  ],
})

function stubModel(text: string, provider: AIProvider = "gemini"): ContaminationModelCaller {
  return async () => ({ text, provider })
}

function countingStubModel(text: string, provider: AIProvider = "gemini") {
  let calls = 0
  const caller: ContaminationModelCaller = async () => {
    calls += 1
    return { text, provider }
  }
  return { caller, callCount: () => calls }
}

/** Copies `fixtureDir` into a fresh temp directory, loads it, runs `body`, and always cleans up --
 *  so a test that writes `.validate-cache/` never touches the shared, committed fixture tree. */
async function withTempWorkbook<T>(
  fixtureDir: string,
  body: (workbook: AuthoredWorkbook) => Promise<T>
): Promise<T> {
  const dir = mkdtempSync(join(tmpdir(), "contamination-gate-test-"))
  cpSync(fixtureDir, dir, { recursive: true })
  try {
    return await body(loadWorkbookTree(dir))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

describe("buildContaminationPrompt -- no-leak proof against real Meridian content", () => {
  const workbook = loadWorkbookTree(MERIDIAN_DIR)
  const { ticket } = findTicketLocation(workbook, "MER-101")

  it("includes the ticket body, acceptance criteria, and visible test source", () => {
    const { userMessage } = buildContaminationPrompt(ticket)
    expect(userMessage).toContain("Northwind's integration engineer says their payload is valid")
    expect(userMessage).toContain("A malformed claim payload is rejected with a 400")
    expect(userMessage).toContain("still accepts a well-formed claim exactly as before")
  })

  it("never contains any hidden test's humanName", () => {
    const { userMessage } = buildContaminationPrompt(ticket)
    expect(ticket.hiddenTests.length).toBeGreaterThan(0) // guard against a vacuously-true assertion
    for (const hidden of ticket.hiddenTests) {
      expect(
        hidden.humanName,
        `${ticket.key} hidden test at ${hidden.path} has no humanName`
      ).toBeTruthy()
      expect(userMessage).not.toContain(hidden.humanName as string)
    }
  })

  it("never contains any hidden test's raw input/expected io-case data", () => {
    const { userMessage } = buildContaminationPrompt(ticket)
    // rejects-null-amount.yaml's input.externalRef and expected.reason
    expect(userMessage).not.toContain("NW-9002")
    expect(userMessage).not.toContain("amount must be a finite number")
  })

  it("never contains a line of reference.diff beyond what the visible tests already legitimately show", () => {
    const { userMessage } = buildContaminationPrompt(ticket)
    expect(ticket.referenceDiff).toBeTruthy()

    // A visible test and the reference solution can coincidentally share a short, generic line
    // (MER-101: both independently write the field annotation "externalRef: string", because that
    // is the public field's own name and TypeScript's ordinary syntax for it -- not a prompt leak).
    // Excluding anything the visible tests themselves already contain keeps this test aimed at the
    // real invariant: nothing from reference.diff BEYOND what's already legitimately visible.
    const visibleText = readVisibleTestFiles(ticket)
      .map((f) => f.content)
      .join("\n")

    const addedLines = (ticket.referenceDiff ?? "")
      .split("\n")
      .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
      .map((line) => line.slice(1).trim())
      .filter((line) => line.length > 12) // skip trivial/brace-only lines that could coincidentally match
      .filter((line) => !visibleText.includes(line))

    expect(addedLines.length).toBeGreaterThan(0) // guard against a vacuously-true assertion
    for (const line of addedLines) {
      expect(userMessage).not.toContain(line)
    }
  })

  it("never reads setup.diff or author_brief either -- the function has no code path that could", () => {
    // Structural, not behavioral: buildContaminationPrompt's own source never references
    // ticket.setupDiff/ticket.authorBriefRaw/ticket.referenceDiff/ticket.hiddenTests at all (see
    // this file's header comment). This test documents that guarantee at the call site: even a
    // ticket with all four present produces a prompt built only from title/bodyMd/acceptanceCriteria
    // /visible tests.
    expect(ticket.setupDiff).toBeTruthy()
    const { userMessage } = buildContaminationPrompt(ticket)
    for (const line of (ticket.setupDiff ?? "").split("\n").filter((l) => l.trim().length > 12)) {
      expect(userMessage).not.toContain(line.trim())
    }
  })
})

describe("parseModelSolution", () => {
  it("parses plain JSON", () => {
    const files = parseModelSolution(JSON.stringify({ files: [{ path: "a.ts", content: "x" }] }))
    expect(files).toEqual([{ path: "a.ts", content: "x" }])
  })

  it("parses JSON wrapped in a ```json fence", () => {
    const json = JSON.stringify({ files: [{ path: "a.ts", content: "x" }] })
    expect(parseModelSolution(`\`\`\`json\n${json}\n\`\`\``)).toEqual([
      { path: "a.ts", content: "x" },
    ])
  })

  it("parses JSON wrapped in a bare ``` fence", () => {
    const json = JSON.stringify({ files: [{ path: "a.ts", content: "x" }] })
    expect(parseModelSolution(`\`\`\`\n${json}\n\`\`\``)).toEqual([{ path: "a.ts", content: "x" }])
  })

  it("returns [] for prose the model returned instead of JSON", () => {
    expect(parseModelSolution("I'm sorry, I don't have enough context to do that.")).toEqual([])
  })

  it("returns [] when files is missing, non-array, or has malformed entries", () => {
    expect(parseModelSolution(JSON.stringify({}))).toEqual([])
    expect(parseModelSolution(JSON.stringify({ files: "nope" }))).toEqual([])
    expect(parseModelSolution(JSON.stringify({ files: [{ path: 1, content: "x" }] }))).toEqual([])
  })
})

describe("runContaminationGateForTicket -- replay through Task 7's harness", () => {
  it("a correct proposed solution passes the hidden test: passRate 1.0, verdict FAIL-too-guessable", async () => {
    await withTempWorkbook(HAPPY_PATH_FIXTURE, async (workbook) => {
      const verdict = await runContaminationGateForTicket(workbook, "FIX-101", {
        modelCaller: stubModel(ADD_SOLUTION_CORRECT),
      })

      expect(verdict.hiddenTotal).toBe(1)
      expect(verdict.hiddenPassed).toBe(1)
      expect(verdict.passRate).toBe(1)
      expect(verdict.verdict).toBe("FAIL-too-guessable")
      expect(verdict.modelProducedParseableSolution).toBe(true)
      expect(verdict.modelId).toBe("gemini")
      expect(verdict.modelVersion).toBe(getProviderStatus().gemini.model)
    })
  }, 30_000)

  it("an unparseable model response leaves the red (setup-only) state untouched: hidden test still fails, verdict OK", async () => {
    await withTempWorkbook(HAPPY_PATH_FIXTURE, async (workbook) => {
      const verdict = await runContaminationGateForTicket(workbook, "FIX-101", {
        modelCaller: stubModel("I cannot help with that."),
      })

      expect(verdict.hiddenTotal).toBe(1)
      expect(verdict.hiddenPassed).toBe(0)
      expect(verdict.passRate).toBe(0)
      expect(verdict.verdict).toBe("OK")
      expect(verdict.modelProducedParseableSolution).toBe(false)
    })
  }, 30_000)

  it("a parseable but wrong proposed solution also fails the hidden test: verdict OK", async () => {
    await withTempWorkbook(HAPPY_PATH_FIXTURE, async (workbook) => {
      const verdict = await runContaminationGateForTicket(workbook, "FIX-101", {
        modelCaller: stubModel(ADD_SOLUTION_WRONG),
      })

      expect(verdict.hiddenPassed).toBe(0)
      expect(verdict.verdict).toBe("OK")
      expect(verdict.modelProducedParseableSolution).toBe(true)
    })
  }, 30_000)

  it("bridges an io-case hidden test (entryPoint) through the replay -- same bridging Task 7 uses, unmodified", async () => {
    await withTempWorkbook(IO_CASE_FIXTURE, async (workbook) => {
      const solution = JSON.stringify({
        files: [
          {
            path: "src/classify.ts",
            content:
              'export function classify(input: { n: number }): { label: string } {\n  return { label: input.n >= 0 ? "positive" : "negative" }\n}\n',
          },
        ],
      })

      const verdict = await runContaminationGateForTicket(workbook, "ENTRY-101", {
        modelCaller: stubModel(solution),
      })

      expect(verdict.hiddenTotal).toBe(1)
      expect(verdict.hiddenPassed).toBe(1)
      expect(verdict.verdict).toBe("FAIL-too-guessable")
    })
  }, 30_000)
})

describe("runContaminationGateForTicket -- cache", () => {
  it("a cache hit skips the model call entirely and returns the same verdict", async () => {
    await withTempWorkbook(HAPPY_PATH_FIXTURE, async (workbook) => {
      const first = countingStubModel(ADD_SOLUTION_CORRECT)
      const firstVerdict = await runContaminationGateForTicket(workbook, "FIX-101", {
        modelCaller: first.caller,
      })
      expect(first.callCount()).toBe(1)

      // A caller that would produce a DIFFERENT verdict if it were ever actually invoked --
      // proves the short-circuit, not just that the numbers happen to match.
      const second = countingStubModel(JSON.stringify({ files: [] }))
      const secondVerdict = await runContaminationGateForTicket(workbook, "FIX-101", {
        modelCaller: second.caller,
      })

      expect(second.callCount()).toBe(0)
      expect(secondVerdict).toEqual(firstVerdict)
    })
  }, 30_000)

  it("--force busts the cache and re-invokes the model even with unchanged content", async () => {
    await withTempWorkbook(HAPPY_PATH_FIXTURE, async (workbook) => {
      const first = countingStubModel(ADD_SOLUTION_CORRECT)
      await runContaminationGateForTicket(workbook, "FIX-101", { modelCaller: first.caller })
      expect(first.callCount()).toBe(1)

      const second = countingStubModel(ADD_SOLUTION_CORRECT)
      await runContaminationGateForTicket(workbook, "FIX-101", {
        modelCaller: second.caller,
        force: true,
      })
      expect(second.callCount()).toBe(1)
    })
  }, 30_000)

  it("changing the ticket's own content busts the cache even without --force", async () => {
    await withTempWorkbook(HAPPY_PATH_FIXTURE, async (workbook) => {
      const first = countingStubModel(ADD_SOLUTION_CORRECT)
      await runContaminationGateForTicket(workbook, "FIX-101", { modelCaller: first.caller })
      expect(first.callCount()).toBe(1)

      // Mutates the SAME in-memory ticket object runContaminationGateForTicket will read on its
      // next call against this workbook -- simulating a re-authored ticket.md without a second
      // disk round-trip.
      const { ticket } = findTicketLocation(workbook, "FIX-101")
      ticket.bodyMd = `${ticket.bodyMd}\n\nEdited for the cache-invalidation test.`

      const second = countingStubModel(ADD_SOLUTION_CORRECT)
      await runContaminationGateForTicket(workbook, "FIX-101", { modelCaller: second.caller })
      expect(second.callCount()).toBe(1)
    })
  }, 30_000)
})

function fakeHiddenTest(): AuthoredHiddenTest {
  return {
    fileName: "escaped",
    path: "tests/hidden/escaped.yaml",
    raw: {},
    humanName: "Escaped: x",
    kind: "probe",
    tags: [],
  }
}

function baseTicket(overrides: Partial<AuthoredTicket>): AuthoredTicket {
  return {
    key: "STUB-1",
    dirPath: join(__dirname, "does-not-need-to-exist-for-a-skipped-ticket"),
    sprintNumber: 1,
    frontmatterRaw: {},
    bodyMd: "",
    labels: [],
    objectives: [],
    acceptanceCriteria: [],
    setupDiff: null,
    referenceDiff: null,
    authorBriefRaw: null,
    hiddenTests: [],
    ...overrides,
  }
}

function workbookWith(...tickets: AuthoredTicket[]): AuthoredWorkbook {
  return {
    id: "stub-workbook",
    dir: join(__dirname, "does-not-need-to-exist-for-a-skipped-ticket"),
    raw: { language: "typescript" },
    objectivesVocabulary: [],
    seedFiles: new Set(),
    meridianMd: null,
    sprints: [
      {
        dirName: "01-only",
        dirPath: join(__dirname, "does-not-need-to-exist-for-a-skipped-ticket"),
        number: 1,
        raw: {},
        objectives: [],
        filesTouched: [],
        newSourceFiles: [],
        rewrittenFiles: [],
        tickets,
      },
    ],
  }
}

describe("validateWorkbookContamination -- eligibility filtering", () => {
  it("skips a ticket with no referenceDiff (a Task 16 stub): zero findings, zero verdicts", async () => {
    const workbook = workbookWith(
      baseTicket({ aiPolicy: "assisted", referenceDiff: null, hiddenTests: [fakeHiddenTest()] })
    )
    const result = await validateWorkbookContamination(workbook)
    expect(result.verdicts).toEqual([])
    expect(result.findings).toEqual([])
  })

  it("skips an unassisted ticket even with a shipped reference and hidden tests", async () => {
    const workbook = workbookWith(
      baseTicket({
        aiPolicy: "unassisted",
        referenceDiff: "diff --git a/x b/x\n",
        hiddenTests: [fakeHiddenTest()],
      })
    )
    const result = await validateWorkbookContamination(workbook)
    expect(result.verdicts).toEqual([])
    expect(result.findings).toEqual([])
  })

  it("skips a review-only ticket", async () => {
    const workbook = workbookWith(
      baseTicket({
        aiPolicy: "review-only",
        referenceDiff: "diff --git a/x b/x\n",
        hiddenTests: [fakeHiddenTest()],
      })
    )
    const result = await validateWorkbookContamination(workbook)
    expect(result.verdicts).toEqual([])
    expect(result.findings).toEqual([])
  })

  it("warns (does not crash) on an assisted, shipped ticket with zero authored hidden tests", async () => {
    const workbook = workbookWith(
      baseTicket({ aiPolicy: "assisted", referenceDiff: "diff --git a/x b/x\n", hiddenTests: [] })
    )
    const result = await validateWorkbookContamination(workbook)
    expect(result.verdicts).toEqual([])
    expect(result.findings).toEqual([
      expect.objectContaining({
        ruleId: "contamination-no-hidden-tests",
        severity: "warn",
        ticketKey: "STUB-1",
      }),
    ])
  })
})

describe("validateWorkbookContamination -- end to end", () => {
  it("an eligible ticket over threshold produces an error finding; one ticket's crash becomes a named finding and the loop continues", async () => {
    await withTempWorkbook(HAPPY_PATH_FIXTURE, async (workbook) => {
      const crashingTicket = baseTicket({
        key: "CRASH-1",
        aiPolicy: "assisted",
        setupDiff: "this is not a valid unified diff at all",
        referenceDiff: "diff --git a/dummy b/dummy\n@@ -0,0 +1 @@\n+dummy\n",
        hiddenTests: [fakeHiddenTest()],
      })
      workbook.sprints[0].tickets.push(crashingTicket)

      const result = await validateWorkbookContamination(workbook, {
        modelCaller: stubModel(ADD_SOLUTION_CORRECT),
      })

      expect(
        result.verdicts.some((v) => v.ticketKey === "FIX-101" && v.verdict === "FAIL-too-guessable")
      ).toBe(true)
      expect(
        result.findings.some((f) => f.ruleId === "contamination-gate" && f.ticketKey === "FIX-101")
      ).toBe(true)
      expect(
        result.findings.some(
          (f) => f.ruleId === "contamination-gate-crashed" && f.ticketKey === "CRASH-1"
        )
      ).toBe(true)
    })
  }, 30_000)
})
