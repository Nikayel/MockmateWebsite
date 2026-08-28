import { describe, expect, it } from "vitest"
import { buildWorkspaceTree, defaultActiveFile, MAP_MD_PATH, MERIDIAN_MD_PATH } from "../tree"
import type { CompiledTicket } from "@/lib/sprint-labs/content/types"

const fixtureTicket: CompiledTicket = {
  ticket: {
    key: "DEMO-101",
    title: "Claim intake 500s on a technically-valid payload",
    points: 3,
    labels: ["contracts"],
    aiPolicy: "assisted",
    objectives: [],
    bodyMd: "body",
    acceptanceCriteria: [],
    adversaryPresent: true,
  },
  setupDiff: null,
  visibleTestFiles: [{ path: "claims-parser.test.ts", content: 'describe("x", () => {})\n' }],
  hiddenTests: [
    {
      id: "rejects-boolean-amount",
      humanName: "Escaped: hidden defect",
      tags: ["x"],
      kind: "probe",
    },
  ],
}

describe("buildWorkspaceTree", () => {
  it("orders groups docs, src, tests and never includes a hidden test", () => {
    const tree = buildWorkspaceTree({
      ticket: fixtureTicket,
      editableFiles: { "src/http/claims.ts": "export function postClaim() {}\n" },
      meridianMd: "# Meridian\n\nInvariants.",
      mapMd: "generated at abc123 · 2026-08-27T00:00:00.000Z · if the tree disagrees...",
    })

    expect(tree.map((f) => f.group)).toEqual(["docs", "docs", "src", "tests"])
    expect(tree.some((f) => f.path.includes("hidden"))).toBe(false)
    expect(tree.some((f) => f.content.includes("Escaped"))).toBe(false)
  })

  it("marks docs and tests locked, src editable", () => {
    const tree = buildWorkspaceTree({
      ticket: fixtureTicket,
      editableFiles: { "src/http/claims.ts": "code" },
      meridianMd: "docs content",
      mapMd: "map content",
    })
    const byPath = Object.fromEntries(tree.map((f) => [f.path, f]))
    expect(byPath[MERIDIAN_MD_PATH].editable).toBe(false)
    expect(byPath[MAP_MD_PATH].editable).toBe(false)
    expect(byPath["src/http/claims.ts"].editable).toBe(true)
    expect(byPath["claims-parser.test.ts"].editable).toBe(false)
  })

  it("shows provisioned test support files as locked references without duplicating a visible test", () => {
    const tree = buildWorkspaceTree({
      ticket: fixtureTicket,
      editableFiles: { "src/http/claims.ts": "code" },
      readonlyFiles: [
        { path: "test/support/build-app.ts", content: "export const buildTestApp = () => ({})" },
        { path: "claims-parser.test.ts", content: "stale duplicate" },
      ],
      meridianMd: null,
      mapMd: "map content",
    })

    const support = tree.find((file) => file.path === "test/support/build-app.ts")
    expect(support).toMatchObject({ editable: false, group: "tests" })
    expect(tree.filter((file) => file.path === "claims-parser.test.ts")).toHaveLength(1)
    expect(tree.find((file) => file.path === "claims-parser.test.ts")?.content).toContain(
      'describe("x"'
    )
  })

  it("omits MERIDIAN.md entirely when no content is given (the dormant seam), MAP.md always present", () => {
    const tree = buildWorkspaceTree({
      ticket: fixtureTicket,
      editableFiles: {},
      meridianMd: undefined,
      mapMd: "map content",
    })
    expect(tree.some((f) => f.path === MERIDIAN_MD_PATH)).toBe(false)
    expect(tree.some((f) => f.path === MAP_MD_PATH)).toBe(true)
  })

  it("also omits MERIDIAN.md for blank/whitespace-only content", () => {
    const tree = buildWorkspaceTree({
      ticket: fixtureTicket,
      editableFiles: {},
      meridianMd: "   \n  ",
      mapMd: "map content",
    })
    expect(tree.some((f) => f.path === MERIDIAN_MD_PATH)).toBe(false)
  })

  it("renders an honestly-empty src group when no editable files exist (today's content gap)", () => {
    const tree = buildWorkspaceTree({
      ticket: fixtureTicket,
      editableFiles: {},
      meridianMd: null,
      mapMd: "map content",
    })
    expect(tree.filter((f) => f.group === "src")).toEqual([])
  })

  it("sorts src and tests files by path", () => {
    const tree = buildWorkspaceTree({
      ticket: {
        ...fixtureTicket,
        visibleTestFiles: [
          { path: "z.test.ts", content: "z" },
          { path: "a.test.ts", content: "a" },
        ],
      },
      editableFiles: { "z.ts": "z", "a.ts": "a" },
      meridianMd: null,
      mapMd: "m",
    })
    expect(tree.filter((f) => f.group === "src").map((f) => f.path)).toEqual(["a.ts", "z.ts"])
    expect(tree.filter((f) => f.group === "tests").map((f) => f.path)).toEqual([
      "a.test.ts",
      "z.test.ts",
    ])
  })
})

describe("defaultActiveFile", () => {
  it("prefers MERIDIAN.md when present", () => {
    const tree = buildWorkspaceTree({
      ticket: fixtureTicket,
      editableFiles: {},
      meridianMd: "content",
      mapMd: "map",
    })
    expect(defaultActiveFile(tree)).toBe(MERIDIAN_MD_PATH)
  })

  it("falls back to the generated MAP.md when MERIDIAN.md is absent, never a source file", () => {
    const tree = buildWorkspaceTree({
      ticket: fixtureTicket,
      editableFiles: { "src/http/claims.ts": "code" },
      meridianMd: null,
      mapMd: "map",
    })
    expect(defaultActiveFile(tree)).toBe(MAP_MD_PATH)
  })

  it("returns undefined for a fully empty tree", () => {
    expect(defaultActiveFile([])).toBeUndefined()
  })
})
