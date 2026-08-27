/**
 * Server-only orchestration around `resolvePartnerMode`: loads the sealed
 * author_brief for a review-only ticket. `loadSealedTicket` is mocked (this
 * is a unit test, not an integration test against the real sealed registry).
 */
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { SealedTicketContent } from "@/lib/scenarios/sealed/sprint-labs/types"

const mocks = vi.hoisted(() => ({ loadSealedTicket: vi.fn() }))

vi.mock("@/lib/scenarios/sealed/sprint-labs/registry.server", () => ({
  loadSealedTicket: mocks.loadSealedTicket,
}))

const SEALED: SealedTicketContent = {
  workbookId: "fixture-demo",
  ticketKey: "DEMO-102",
  hiddenCases: [],
  adversaryFiles: [],
  review: [{ id: "c1", body: "trap comment", correct: false }],
  authorBrief: {
    intent: "Deprecate v1 without breaking Northwind.",
    decisions: [],
    doNotVolunteer: [],
    concessionTriggers: ["missing sunset date"],
  },
  referenceDiff: "diff --git a/x b/x",
  rubric: {
    weights: {
      understanding: 0.2,
      problemSolving: 0.2,
      codeQuality: 0.2,
      communication: 0.2,
      verification: 0.2,
    },
    notes: {},
  },
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("resolvePartnerModeForTicket", () => {
  it("loads the sealed author_brief for a review-only ticket and resolves to author-agent", async () => {
    mocks.loadSealedTicket.mockResolvedValue(SEALED)
    const { resolvePartnerModeForTicket } = await import("../resolve-mode.server")

    const mode = await resolvePartnerModeForTicket(
      "fixture-demo",
      { aiPolicy: "review-only" },
      "partner",
      undefined,
      "DEMO-102"
    )

    expect(mocks.loadSealedTicket).toHaveBeenCalledWith("fixture-demo", "DEMO-102")
    expect(mode).toEqual({ kind: "author-agent", brief: SEALED.authorBrief })
  })

  it("never touches the sealed loader for assisted/unassisted tickets", async () => {
    const { resolvePartnerModeForTicket } = await import("../resolve-mode.server")

    await resolvePartnerModeForTicket(
      "fixture-demo",
      { aiPolicy: "assisted" },
      "partner",
      "FILE: a.ts",
      "DEMO-101"
    )
    await resolvePartnerModeForTicket(
      "fixture-demo",
      { aiPolicy: "unassisted", aiPolicyReason: "write it yourself" },
      "tutor",
      undefined,
      "DEMO-102"
    )

    expect(mocks.loadSealedTicket).not.toHaveBeenCalled()
  })

  it("falls back to none when the ticket has no sealed content at all", async () => {
    mocks.loadSealedTicket.mockResolvedValue(null)
    const { resolvePartnerModeForTicket } = await import("../resolve-mode.server")

    const mode = await resolvePartnerModeForTicket(
      "fixture-demo",
      { aiPolicy: "review-only" },
      "partner",
      undefined,
      "DEMO-999"
    )

    expect(mode.kind).toBe("none")
  })

  it("falls back to none when sealed content exists but authorBrief is null", async () => {
    mocks.loadSealedTicket.mockResolvedValue({ ...SEALED, authorBrief: null })
    const { resolvePartnerModeForTicket } = await import("../resolve-mode.server")

    const mode = await resolvePartnerModeForTicket(
      "fixture-demo",
      { aiPolicy: "review-only" },
      "partner",
      undefined,
      "DEMO-101"
    )

    expect(mode.kind).toBe("none")
  })

  it("plumbs assisted's filesContext straight through to a chat mode", async () => {
    const { resolvePartnerModeForTicket } = await import("../resolve-mode.server")

    const mode = await resolvePartnerModeForTicket(
      "fixture-demo",
      { aiPolicy: "assisted" },
      "partner",
      "FILE: a.ts\n```\nx\n```",
      "DEMO-101"
    )

    expect(mode).toEqual({ kind: "chat", filesContext: "FILE: a.ts\n```\nx\n```" })
  })
})
