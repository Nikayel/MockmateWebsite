/**
 * Server-only orchestration around `resolvePartnerMode`: loads the sealed
 * author_brief for a review-only ticket. `loadSealedAuthorBrief` is mocked
 * (this is a unit test, not an integration test against the real sealed
 * registry).
 *
 * Review fix M1: this calls the NARROW accessor (`loadSealedAuthorBrief`,
 * returning only `authorBrief`), not `loadSealedTicket` (the full
 * `SealedTicketContent`) -- these tests assert the narrow function is what's
 * actually called, so a regression back to the wide one would fail here.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { SealedAuthorBrief } from "@/lib/scenarios/sealed/sprint-labs/types"

const mocks = vi.hoisted(() => ({ loadSealedAuthorBrief: vi.fn() }))

vi.mock("@/lib/scenarios/sealed/sprint-labs/registry.server", () => ({
  loadSealedAuthorBrief: mocks.loadSealedAuthorBrief,
}))

const BRIEF: SealedAuthorBrief = {
  intent: "Deprecate v1 without breaking Northwind.",
  decisions: [],
  doNotVolunteer: [],
  concessionTriggers: ["missing sunset date"],
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("resolvePartnerModeForTicket", () => {
  it("loads the sealed author_brief for a review-only ticket and resolves to author-agent", async () => {
    mocks.loadSealedAuthorBrief.mockResolvedValue(BRIEF)
    const { resolvePartnerModeForTicket } = await import("../resolve-mode.server")

    const mode = await resolvePartnerModeForTicket(
      "fixture-demo",
      { aiPolicy: "review-only" },
      "partner",
      undefined,
      "DEMO-102"
    )

    expect(mocks.loadSealedAuthorBrief).toHaveBeenCalledWith("fixture-demo", "DEMO-102")
    expect(mode).toEqual({ kind: "author-agent", brief: BRIEF })
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

    expect(mocks.loadSealedAuthorBrief).not.toHaveBeenCalled()
  })

  it("falls back to none when the ticket has no sealed content at all", async () => {
    mocks.loadSealedAuthorBrief.mockResolvedValue(null)
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

  it("falls back to none when the sealed ticket exists but authorBrief is null", async () => {
    mocks.loadSealedAuthorBrief.mockResolvedValue(null)
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
