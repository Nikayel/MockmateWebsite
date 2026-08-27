import { describe, expect, it } from "vitest"
import { join } from "node:path"
import { loadWorkbookTree } from "../load-tree"

const FIXTURE_DIR = join(__dirname, "fixtures/smoke/minimal-workbook")

describe("loadWorkbookTree", () => {
  it("parses workbook.yaml, sprint.yaml, ticket.md frontmatter+body, hidden tests, and the seed file set", () => {
    const workbook = loadWorkbookTree(FIXTURE_DIR)

    expect(workbook.id).toBe("fixture")
    expect(workbook.objectivesVocabulary).toEqual([
      {
        id: "typed-boundaries",
        label: "Typed boundaries",
        canDo: "I can replace an any typed parse with a validated type.",
      },
      {
        id: "contract-versioning",
        label: "Contract versioning",
        canDo: "I can decide when a breaking change needs a new API version.",
      },
    ])
    expect(workbook.seedFiles.has("src/db/repositories/claims.ts")).toBe(true)
    expect(workbook.meridianMd).toBeNull()

    expect(workbook.sprints).toHaveLength(1)
    const sprint = workbook.sprints[0]
    expect(sprint.number).toBe(1)
    expect(sprint.standupQuote).toBe("The parser just shrugged and returned any.")
    expect(sprint.filesTouched).toEqual(["src/db/repositories/claims.ts"])

    expect(sprint.tickets).toHaveLength(1)
    const ticket = sprint.tickets[0]
    expect(ticket.key).toBe("DEMO-1")
    expect(ticket.aiPolicy).toBe("assisted")
    expect(ticket.objectives).toEqual(["typed-boundaries"])
    expect(ticket.acceptanceCriteria).toEqual(["A malformed payload is rejected with a 400."])
    expect(ticket.bodyMd).toBe("Northwind says the payload is valid. It is not.")
    expect(ticket.frontmatterRaw.ai_policy).toBe("assisted")

    expect(ticket.hiddenTests).toHaveLength(1)
    expect(ticket.hiddenTests[0].fileName).toBe("rejects-boolean-amount")
    expect(ticket.hiddenTests[0].humanName).toBe(
      "Escaped: a boolean amount is still accepted as a claim amount"
    )
    expect(ticket.hiddenTests[0].kind).toBe("io-case")
    expect(ticket.hiddenTests[0].tags).toEqual(["typed-boundaries"])
  })

  it("throws a clear error when workbook.yaml is missing", () => {
    expect(() => loadWorkbookTree(join(__dirname, "fixtures/smoke/does-not-exist"))).toThrow(
      /workbook\.yaml missing/
    )
  })
})
