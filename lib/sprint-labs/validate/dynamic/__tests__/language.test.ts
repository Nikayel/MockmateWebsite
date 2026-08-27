import { describe, expect, it } from "vitest"

import type { AuthoredTicket, AuthoredWorkbook } from "../../tree"
import { resolveTicketRunnerLanguage } from "../language"

function ticket(overrides: Partial<AuthoredTicket>): AuthoredTicket {
  return {
    key: "T-1",
    dirPath: "/dev/null",
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

function workbook(language: string | undefined): AuthoredWorkbook {
  return {
    id: "wb",
    dir: "/dev/null",
    raw: language === undefined ? {} : { language },
    objectivesVocabulary: [],
    seedFiles: new Set(),
    meridianMd: null,
    sprints: [],
  }
}

describe("resolveTicketRunnerLanguage", () => {
  it("defaults to typescript when the workbook declares no language and the ticket has no sql label", () => {
    expect(resolveTicketRunnerLanguage(workbook(undefined), ticket({}))).toBe("typescript")
  })

  it("routes to typescript for a workbook explicitly declaring language: typescript", () => {
    expect(resolveTicketRunnerLanguage(workbook("typescript"), ticket({}))).toBe("typescript")
  })

  it("routes to sql when the whole workbook declares language: sql", () => {
    expect(resolveTicketRunnerLanguage(workbook("sql"), ticket({}))).toBe("sql")
  })

  it("routes to sql when a TS-workbook ticket carries a sql label (Meridian's sprint 3 shape)", () => {
    expect(
      resolveTicketRunnerLanguage(workbook("typescript"), ticket({ labels: ["tenants", "sql"] }))
    ).toBe("sql")
  })

  it("label matching is case-insensitive", () => {
    expect(resolveTicketRunnerLanguage(workbook("typescript"), ticket({ labels: ["SQL"] }))).toBe(
      "sql"
    )
  })
})
