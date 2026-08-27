/**
 * Pure context-builder tests (docs/sprint-labs/AGENT-CONTEXT.md §3, PLAN.md
 * Task 14). Covers layer ordering/content in isolation; the route-level
 * "stable-first assembly" byte test lives in prompt.test.ts, where the full
 * system prompt is assembled from these layers' output.
 */
import { describe, expect, it } from "vitest"
import {
  buildConcessionNote,
  buildPerTurnNote,
  layerA,
  layerB,
  layerC,
  renderWorkspaceFiles,
  type LayerBInput,
  type LayerCInput,
} from "../context-layers"
import type { DirectiveEntry } from "@/lib/sprint-labs/types"

describe("layerA", () => {
  it("returns empty string for missing/undefined content (the documented seam: no compiled seed-file source exists yet)", () => {
    expect(layerA(undefined)).toBe("")
    expect(layerA(null)).toBe("")
    expect(layerA("   ")).toBe("")
  })

  it("wraps real MERIDIAN.md content with a framing line", () => {
    const out = layerA("Money is bigint minor units at every boundary.")
    expect(out).toContain("MERIDIAN.md")
    expect(out).toContain("Money is bigint minor units at every boundary.")
  })
})

describe("layerB", () => {
  const baseInput: LayerBInput = {
    sha: "a1b2c3d",
    generatedAt: "2026-08-27T00:00:00.000Z",
    files: [{ path: "src/http/claims.ts", exports: ["postClaim", "listClaims"] }],
    routes: ["POST /claims", "GET /claims"],
    migrations: ["0001_init.sql"],
    tests: ["claims-parser.test.ts"],
    diffStat: "3 files changed, 42 insertions(+), 10 deletions(-)",
  }

  it("prepends the mandatory first line verbatim", () => {
    const out = layerB(baseInput)
    const firstLine = out.split("\n")[0]
    expect(firstLine).toBe(
      "generated at a1b2c3d · 2026-08-27T00:00:00.000Z · if the tree disagrees with this file, the tree is right."
    )
  })

  it("renders exported symbols, routes, migrations, tests, and diff stat", () => {
    const out = layerB(baseInput)
    expect(out).toContain("src/http/claims.ts: postClaim, listClaims")
    expect(out).toContain("POST /claims")
    expect(out).toContain("0001_init.sql")
    expect(out).toContain("claims-parser.test.ts")
    expect(out).toContain("3 files changed, 42 insertions(+), 10 deletions(-)")
  })

  it("omits empty sections rather than printing an empty heading", () => {
    const out = layerB({
      ...baseInput,
      routes: [],
      migrations: [],
      tests: [],
      diffStat: "",
    })
    expect(out).not.toContain("ROUTES")
    expect(out).not.toContain("MIGRATIONS")
    expect(out).not.toContain("TESTS")
    expect(out).not.toContain("DIFF STAT")
  })

  it("is a pure function of its input (same input -> byte-identical output)", () => {
    expect(layerB(baseInput)).toBe(layerB({ ...baseInput }))
  })
})

describe("layerC", () => {
  const baseTicket: LayerCInput["ticket"] = {
    key: "MER-305",
    title: "CX-88431 was extracted and billed twice",
    aiPolicy: "assisted",
    bodyMd: "Support reopened CX-88431 this morning.",
    acceptanceCriteria: ["A repeat submission cannot create a second extraction."],
    objectives: [
      { id: "idempotency", label: "Idempotency", canDo: "I can design an idempotent write." },
    ],
  }
  const baseSprint: LayerCInput["sprint"] = {
    number: 3,
    title: "Tenants: make the database refuse",
    goal: "Move tenant isolation into Postgres itself.",
    standupQuote: "Why is there a Bekins Van Lines claim in my queue?",
  }

  function baseInput(overrides: Partial<LayerCInput> = {}): LayerCInput {
    return {
      sprint: baseSprint,
      ticket: baseTicket,
      directives: [],
      currentHiddenTopicTags: [],
      currentSprint: 3,
      ...overrides,
    }
  }

  it("renders the whitelisted sprint + ticket fields", () => {
    const out = layerC(baseInput())
    expect(out).toContain("MER-305")
    expect(out).toContain("CX-88431 was extracted and billed twice")
    expect(out).toContain("Support reopened CX-88431 this morning.")
    expect(out).toContain("A repeat submission cannot create a second extraction.")
    expect(out).toContain("Tenants: make the database refuse")
    expect(out).toContain("Move tenant isolation into Postgres itself.")
    expect(out).toContain("assisted")
  })

  it("includes a directive whose tags do not collide with the current hidden tags", () => {
    const directives: DirectiveEntry[] = [
      {
        id: "d1",
        instruction: "Narrate the invariant before editing tenant-scoped code.",
        tags: ["tenant-scoping"],
        createdSprint: 1,
        expiresAfterSprint: 4,
      },
    ]
    const out = layerC(baseInput({ directives, currentHiddenTopicTags: ["idempotency"] }))
    expect(out).toContain("Narrate the invariant before editing tenant-scoped code.")
  })

  it("drops (never paraphrases) a directive whose tags collide with the current hidden-test tags", () => {
    const directives: DirectiveEntry[] = [
      {
        id: "d1",
        instruction: "Watch for the double-submit race on claim extraction.",
        tags: ["idempotency"],
        createdSprint: 1,
        expiresAfterSprint: 4,
      },
    ]
    const out = layerC(baseInput({ directives, currentHiddenTopicTags: ["idempotency"] }))
    expect(out).not.toContain("Watch for the double-submit race on claim extraction.")
    expect(out).not.toContain("idempotency")
  })

  it("drops a directive that has decayed past its sprint window", () => {
    const directives: DirectiveEntry[] = [
      {
        id: "d1",
        instruction: "This directive should have expired.",
        tags: ["unrelated-topic"],
        createdSprint: 1,
        expiresAfterSprint: 1,
      },
    ]
    const out = layerC(baseInput({ directives, currentSprint: 3, currentHiddenTopicTags: [] }))
    expect(out).not.toContain("This directive should have expired.")
  })

  it("omits the objectives/acceptance-criteria/directives sections when empty, rather than printing empty headings", () => {
    const out = layerC(
      baseInput({
        ticket: { ...baseTicket, acceptanceCriteria: [], objectives: [] },
        directives: [],
      })
    )
    expect(out).not.toContain("ACCEPTANCE CRITERIA")
    expect(out).not.toContain("OBJECTIVES")
    expect(out).not.toContain("LEARNER DIRECTIVES")
  })
})

describe("buildPerTurnNote (Layer D — rides the outgoing message string)", () => {
  it("reports all-green when no visible tests are red", () => {
    const note = buildPerTurnNote({ redVisibleTests: [], diffStat: "", turnIndex: 1 })
    expect(note).toContain("turn 1")
    expect(note).toContain("all visible tests green")
  })

  it("names red tests and their failing assertions", () => {
    const note = buildPerTurnNote({
      redVisibleTests: [
        { name: "duplicate submit creates two rows", failingAssertion: "expected 1, got 2" },
      ],
      diffStat: "2 files changed",
      turnIndex: 7,
    })
    expect(note).toContain("turn 7")
    expect(note).toContain("1 visible test red")
    expect(note).toContain("duplicate submit creates two rows")
    expect(note).toContain("expected 1, got 2")
    expect(note).toContain("2 files changed")
  })

  it("is bracketed and prefixed with blank lines, mirroring code-change-note.ts's carrier shape", () => {
    const note = buildPerTurnNote({ redVisibleTests: [], diffStat: "", turnIndex: 2 })
    expect(note.startsWith("\n\n[TURN STATE:")).toBe(true)
    expect(note.trimEnd().endsWith("]")).toBe(true)
  })
})

describe("renderWorkspaceFiles (assisted-mode full file context; not a lettered layer)", () => {
  it("returns empty string for no files", () => {
    expect(renderWorkspaceFiles([])).toBe("")
  })

  it("renders each file's path and content", () => {
    const out = renderWorkspaceFiles([
      { path: "src/http/claims.ts", content: "export function postClaim() {}" },
    ])
    expect(out).toContain("src/http/claims.ts")
    expect(out).toContain("export function postClaim() {}")
  })
})

describe("buildConcessionNote (server-appended per-turn signal, never client-visible content)", () => {
  it("names the matched trigger and instructs an honest concession", () => {
    const note = buildConcessionNote("missing sunset date")
    expect(note).toContain("missing sunset date")
    expect(note.toLowerCase()).toContain("concede")
    expect(note.startsWith("\n\n[")).toBe(true)
  })
})
