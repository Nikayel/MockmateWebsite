import { describe, expect, it } from "vitest"
import { layerB } from "@/lib/sprint-labs/partner/context-layers"
import { computeLayerBInput, extractExportedSymbols, hashWorkspaceContent } from "../layer-b"

describe("extractExportedSymbols", () => {
  it("finds named function/const/class/interface/type/enum declarations", () => {
    const content = `
      export function createClaim() {}
      export async function postClaim() {}
      export const MAX_RETRIES = 3
      export class ClaimRepository {}
      export interface Claim { id: string }
      export type ClaimId = string
      export enum ClaimStatus { Open, Closed }
    `
    expect(extractExportedSymbols(content)).toEqual(
      [
        "ClaimId",
        "ClaimRepository",
        "ClaimStatus",
        "Claim",
        "MAX_RETRIES",
        "createClaim",
        "postClaim",
      ].sort()
    )
  })

  it("finds re-export lists including 'as' renames and 'type' entries", () => {
    const content = `export { parseClaimPayload, ClaimError as ClaimErr }
export type { ClaimShape }`
    expect(extractExportedSymbols(content)).toEqual(
      ["ClaimErr", "ClaimShape", "parseClaimPayload"].sort()
    )
  })

  it("records a single 'default' entry for an anonymous default export", () => {
    expect(extractExportedSymbols("export default { hello: 1 }")).toEqual(["default"])
  })

  it("does not add 'default' when the default export is named (already caught above)", () => {
    const symbols = extractExportedSymbols("export default function createApp() {}")
    expect(symbols).toContain("createApp")
    expect(symbols).not.toContain("default")
  })

  it("returns an empty array for content with no exports", () => {
    expect(extractExportedSymbols("const internal = 1\nfunction helper() {}")).toEqual([])
  })
})

describe("hashWorkspaceContent", () => {
  it("is deterministic for the same content regardless of input order", () => {
    const a = [
      { path: "b.ts", content: "2" },
      { path: "a.ts", content: "1" },
    ]
    const b = [
      { path: "a.ts", content: "1" },
      { path: "b.ts", content: "2" },
    ]
    expect(hashWorkspaceContent(a)).toBe(hashWorkspaceContent(b))
  })

  it("changes when content changes", () => {
    const before = [{ path: "a.ts", content: "1" }]
    const after = [{ path: "a.ts", content: "2" }]
    expect(hashWorkspaceContent(before)).not.toBe(hashWorkspaceContent(after))
  })
})

describe("computeLayerBInput — fixture tree", () => {
  const fixtureTree = [
    {
      path: "src/http/claims.ts",
      content:
        'import { insertClaim } from "../db/repositories/claims"\n\nexport async function postClaim(request, reply) {\n  app.post("/claims", async () => {})\n  return insertClaim(request.body)\n}\n',
    },
    {
      path: "src/http/claims-parser.ts",
      content:
        "export interface ParsedClaim { tenantId: string; amount: number }\n\nexport function parseClaimPayload(input: unknown) {\n  return { ok: true }\n}\n",
    },
    {
      path: "migrations/0001_init.sql",
      content: "CREATE TABLE claims (id uuid primary key);\n",
    },
    {
      path: "claims-parser.test.ts",
      content:
        'import { parseClaimPayload } from "../../../src/http/claims-parser"\n\ndescribe("parseClaimPayload", () => {})\n',
    },
  ]

  it("produces the exact LayerBInput shape: files (non-test source only), routes, migrations, tests, diffStat", () => {
    const input = computeLayerBInput(fixtureTree, {
      generatedAt: "2026-08-27T00:00:00.000Z",
      diffStat: "+5 -1 across 2 files",
    })

    expect(input.generatedAt).toBe("2026-08-27T00:00:00.000Z")
    expect(input.diffStat).toBe("+5 -1 across 2 files")
    expect(typeof input.sha).toBe("string")
    expect(input.sha.length).toBeGreaterThan(0)

    // files: only non-test .ts source, each with its exported symbols
    expect(input.files).toEqual([
      { path: "src/http/claims-parser.ts", exports: ["ParsedClaim", "parseClaimPayload"] },
      { path: "src/http/claims.ts", exports: ["postClaim"] },
    ])

    // routes: detected from a light regex over source file content
    expect(input.routes).toEqual(["POST /claims"])

    // migrations: path-based detection, independent of file extension elsewhere
    expect(input.migrations).toEqual(["migrations/0001_init.sql"])

    // tests: path-based detection; the compiled ticket's visible test file shows up here, never
    // in `files` (it carries no production exports worth summarizing as "the map")
    expect(input.tests).toEqual(["claims-parser.test.ts"])
  })

  it("is a pure function: the same fixture tree always produces the same sha", () => {
    const first = computeLayerBInput(fixtureTree, { generatedAt: "t", diffStat: "" })
    const second = computeLayerBInput(fixtureTree, { generatedAt: "t", diffStat: "" })
    expect(first).toEqual(second)
  })

  it("never invents a hidden-test entry: this module only ever sees what it is given, and hidden tests are never client-side data", () => {
    const input = computeLayerBInput(fixtureTree, { generatedAt: "t", diffStat: "" })
    const allPaths = [...input.files.map((f) => f.path), ...input.tests, ...input.migrations]
    expect(allPaths.some((p) => p.includes("hidden"))).toBe(false)
  })

  it("renders through context-layers.ts's layerB() with the mandatory first line intact", () => {
    const input = computeLayerBInput(fixtureTree, {
      generatedAt: "2026-08-27T00:00:00.000Z",
      diffStat: "",
    })
    const rendered = layerB(input)
    expect(rendered.startsWith(`generated at ${input.sha} · 2026-08-27T00:00:00.000Z ·`)).toBe(true)
    expect(rendered).toContain("EXPORTED SYMBOLS")
    expect(rendered).toContain("ROUTES")
    expect(rendered).toContain("MIGRATIONS")
    expect(rendered).toContain("TESTS")
  })

  it("handles an empty tree without throwing, omitting every optional section", () => {
    const input = computeLayerBInput([], { generatedAt: "t", diffStat: "" })
    expect(input.files).toEqual([])
    expect(input.routes).toEqual([])
    expect(input.migrations).toEqual([])
    expect(input.tests).toEqual([])
  })
})
