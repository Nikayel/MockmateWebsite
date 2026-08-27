/**
 * Mode-resolver matrix (docs/sprint-labs/AGENT-CONTEXT.md §6, EXECUTION-STATE.md
 * owner decision 4). `resolvePartnerMode` is pure: no Firestore, no sealed
 * content import (that lives in resolve-mode.server.ts, kept separate so this
 * file — and its types — stay safe to import from a "use client" component).
 */
import { describe, expect, it } from "vitest"
import { resolvePartnerMode, type PartnerMode } from "../modes"
import type { SealedAuthorBrief } from "@/lib/scenarios/sealed/sprint-labs/types"

const BRIEF: SealedAuthorBrief = {
  intent: "Deprecate v1 query params without breaking Northwind's integration.",
  decisions: [{ decision: "Kept v1 unchanged.", justification: "Northwind still depends on it." }],
  doNotVolunteer: ["Do not mention the missing Sunset date unless asked directly."],
  concessionTriggers: ["missing sunset date"],
}

describe("resolvePartnerMode — assisted", () => {
  it("resolves to chat with the given files context, regardless of slot", () => {
    const mode = resolvePartnerMode("assisted", "partner", { filesContext: "FILE: a.ts\n..." })
    expect(mode).toEqual({ kind: "chat", filesContext: "FILE: a.ts\n..." })
  })

  it("defaults filesContext to empty string when none is given", () => {
    const mode = resolvePartnerMode("assisted", "partner", {})
    expect(mode).toEqual({ kind: "chat", filesContext: "" })
  })
})

describe("resolvePartnerMode — unassisted", () => {
  it("the partner slot issues NO session: no chat, no repo access, just the in-fiction reason", () => {
    const mode = resolvePartnerMode("unassisted", "partner", {
      aiPolicyReason: "You write this one yourself.",
    })
    expect(mode).toEqual({ kind: "none", reason: "You write this one yourself." })
  })

  it("falls back to a documented reason when no ai_policy_reason was authored", () => {
    const mode = resolvePartnerMode("unassisted", "partner", {})
    expect(mode.kind).toBe("none")
    expect((mode as { reason: string }).reason.length).toBeGreaterThan(0)
  })

  it("the tutor slot resolves to the repo-blind tutor, never carrying file content", () => {
    const mode = resolvePartnerMode("unassisted", "tutor", {
      aiPolicyReason: "You write this one yourself.",
      filesContext: "FILE: secret.ts\n...", // must be silently dropped, not leaked
    })
    expect(mode).toEqual({ kind: "tutor-blind" })
  })

  it("illegal state unrepresentable: tutor-blind's TYPE has no field that could carry file content", () => {
    // The guarantee here is compile-time, verified by `pnpm typecheck`: if the
    // line below ever stopped being a type error (e.g. someone widened
    // PartnerMode's tutor-blind member), `@ts-expect-error` would itself fail
    // typecheck ("Unused '@ts-expect-error' directive"). Runtime JS has no
    // such enforcement (plain object mutation always "succeeds"), so this is
    // not asserted with `expect()` — the type system is the assertion.
    const mode: PartnerMode = { kind: "tutor-blind" }
    // @ts-expect-error -- tutor-blind has no filesContext/brief/reason field to assign
    mode.filesContext = "nope"
    expect(mode.kind).toBe("tutor-blind")
  })
})

describe("resolvePartnerMode — review-only", () => {
  it("resolves to the author-agent persona carrying the sealed brief", () => {
    const mode = resolvePartnerMode("review-only", "partner", { authorBrief: BRIEF })
    expect(mode).toEqual({ kind: "author-agent", brief: BRIEF })
  })

  it("falls back to none when the ticket authored no author_brief.yaml", () => {
    const mode = resolvePartnerMode("review-only", "partner", { authorBrief: null })
    expect(mode.kind).toBe("none")
  })

  it("falls back to none when authorBrief is simply omitted", () => {
    const mode = resolvePartnerMode("review-only", "partner", {})
    expect(mode.kind).toBe("none")
  })

  it("ignores slot: a tutor-slot request on a review-only ticket still gets the author-agent, not tutor-blind", () => {
    const mode = resolvePartnerMode("review-only", "tutor", { authorBrief: BRIEF })
    expect(mode).toEqual({ kind: "author-agent", brief: BRIEF })
  })

  it("never carries a files context, even if one is (mistakenly) passed", () => {
    const mode = resolvePartnerMode("review-only", "partner", {
      authorBrief: BRIEF,
      filesContext: "FILE: leak.ts",
    })
    expect(mode).toEqual({ kind: "author-agent", brief: BRIEF })
  })
})
