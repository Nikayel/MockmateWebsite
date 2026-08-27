/**
 * Sable persona prompt assembly (PLAN.md Task 14). Covers: capability
 * questions answer truthfully (SERVER_EXECUTION_MESSAGE + supported
 * languages present in every mode), calibration-never-accusation copy,
 * mode-specific sections, the author-agent's structural inability to
 * surface review/trap content, and the stable-first byte-ordering property
 * (A + B + persona are unaffected by history/message-only changes).
 */
import { describe, expect, it } from "vitest"
import { buildPartnerSystemPrompt } from "../prompt"
import type { PartnerMode } from "../modes"
import {
  SERVER_EXECUTION_MESSAGE,
  SUPPORTED_WORKBOOK_LANGUAGES,
} from "@/lib/sprint-labs/platform-capabilities"
import type { SealedAuthorBrief } from "@/lib/scenarios/sealed/sprint-labs/types"

const LAYER_A =
  "MERIDIAN.md (the team's own architecture notes...):\n\nMoney is bigint minor units."
const LAYER_B =
  "generated at abc123 · 2026-08-27T00:00:00.000Z · if the tree disagrees...\n\nEXPORTED SYMBOLS"
const LAYER_C = "SPRINT 3: Tenants\nTICKET MER-305: CX-88431 was billed twice"

describe("buildPartnerSystemPrompt — capability truthfulness (every mode)", () => {
  const modes: PartnerMode[] = [{ kind: "chat", filesContext: "" }, { kind: "tutor-blind" }]

  it.each(modes)(
    "includes SERVER_EXECUTION_MESSAGE and the supported language list for %o",
    (mode) => {
      const prompt = buildPartnerSystemPrompt(mode, LAYER_A, LAYER_B, LAYER_C)
      expect(prompt).toContain(SERVER_EXECUTION_MESSAGE)
      for (const language of SUPPORTED_WORKBOOK_LANGUAGES) {
        expect(prompt).toContain(language)
      }
    }
  )

  it("includes calibration-never-accusation guidance", () => {
    // The instruction necessarily names the word once ("never use that
    // word") in order to forbid it -- the same shape as
    // FORBIDDEN_VALIDATION_PHRASES in lib/interview/interviewer-prompts.ts.
    // What matters is that it reads as an instruction not to accuse, never
    // as the model modeling an accusation itself.
    const prompt = buildPartnerSystemPrompt(
      { kind: "chat", filesContext: "" },
      LAYER_A,
      LAYER_B,
      LAYER_C
    )
    expect(prompt.toLowerCase()).toContain("calibrat")
    expect(prompt.toLowerCase()).toContain("never use that word")
    expect(prompt.toLowerCase()).not.toContain("you cheated")
  })
})

describe("buildPartnerSystemPrompt — chat mode", () => {
  it("states full read capability and no edit/bash/test-runner", () => {
    const prompt = buildPartnerSystemPrompt(
      { kind: "chat", filesContext: "" },
      LAYER_A,
      LAYER_B,
      LAYER_C
    )
    expect(prompt).toContain("cannot edit files")
    expect(prompt).toContain("run tests")
  })

  it("includes posted file content when given", () => {
    const prompt = buildPartnerSystemPrompt(
      {
        kind: "chat",
        filesContext: "FILE: src/http/claims.ts\n```\nexport function postClaim() {}\n```",
      },
      LAYER_A,
      LAYER_B,
      LAYER_C
    )
    expect(prompt).toContain("src/http/claims.ts")
    expect(prompt).toContain("export function postClaim")
  })
})

describe("buildPartnerSystemPrompt — tutor-blind mode", () => {
  it("states the repo-blind fact as deliberate, not apologetic", () => {
    const prompt = buildPartnerSystemPrompt({ kind: "tutor-blind" }, LAYER_A, LAYER_B, LAYER_C)
    expect(prompt).toContain("I cannot see your code on this ticket, and that is deliberate")
  })

  it("never contains file content, because tutor-blind's type has none to give it", () => {
    const prompt = buildPartnerSystemPrompt({ kind: "tutor-blind" }, LAYER_A, LAYER_B, LAYER_C)
    expect(prompt).not.toContain("```")
  })
})

describe("buildPartnerSystemPrompt — author-agent (review-only) mode", () => {
  const brief: SealedAuthorBrief = {
    intent: "Deprecate v1 query params without breaking Northwind's integration.",
    decisions: [
      { decision: "Kept v1 unchanged.", justification: "Northwind still depends on it." },
      {
        decision: "Did not add a Sunset date.",
        justification: "Wrong: a deprecation without one is a suggestion.",
      },
    ],
    doNotVolunteer: ["Do not mention the missing Sunset date unless asked directly."],
    concessionTriggers: ["missing sunset date"],
  }

  it("includes the stated intent and each decision's justification", () => {
    const prompt = buildPartnerSystemPrompt(
      { kind: "author-agent", brief },
      LAYER_A,
      LAYER_B,
      LAYER_C
    )
    expect(prompt).toContain(brief.intent)
    expect(prompt).toContain("Kept v1 unchanged.")
    expect(prompt).toContain("Northwind still depends on it.")
  })

  it("instructs the persona never to volunteer doNotVolunteer topics on its own", () => {
    const prompt = buildPartnerSystemPrompt(
      { kind: "author-agent", brief },
      LAYER_A,
      LAYER_B,
      LAYER_C
    )
    expect(prompt).toContain("Do not mention the missing Sunset date unless asked directly.")
    expect(prompt.toLowerCase()).toContain("never bring")
  })

  it("states plainly it has no edit/bash/test-runner (so 'just run it' bounces back to the learner)", () => {
    const prompt = buildPartnerSystemPrompt(
      { kind: "author-agent", brief },
      LAYER_A,
      LAYER_B,
      LAYER_C
    )
    expect(prompt.toLowerCase()).toContain("can't from here")
  })

  it("NEVER mentions review.yaml or a reference diff, and never names WHICH comment is the trap -- the function signature has no field to carry either", () => {
    // buildPartnerSystemPrompt's author-agent branch reads ONLY from
    // `mode.brief` (SealedAuthorBrief: intent/decisions/doNotVolunteer/
    // concessionTriggers) -- it has no parameter through which review.yaml's
    // comments or `reference.diff` could reach it, so there is nothing to
    // "not contain" beyond confirming those literal filenames never appear.
    // The prompt DOES say the word "trap" once, in the fact that the
    // persona was never shown one -- see modes.test.ts /
    // attempts-service.ts for the structural guarantee that no comment id
    // or `correct` flag is ever passed to this mode at all.
    const prompt = buildPartnerSystemPrompt(
      { kind: "author-agent", brief },
      LAYER_A,
      LAYER_B,
      LAYER_C
    )
    expect(prompt.toLowerCase()).not.toContain("review.yaml")
    expect(prompt.toLowerCase()).not.toContain("reference.diff")
    expect(prompt).toContain("that was never shown to you")
  })
})

describe("buildPartnerSystemPrompt — none mode is a programmer error, not a real prompt", () => {
  it("throws rather than silently building a prompt for a mode with no session", () => {
    expect(() =>
      buildPartnerSystemPrompt({ kind: "none", reason: "no agent here" }, LAYER_A, LAYER_B, LAYER_C)
    ).toThrow()
  })
})

describe("stable-first byte ordering", () => {
  it("the same (mode, A, B, C) always yields byte-identical output, independent of any per-turn state", () => {
    const mode: PartnerMode = { kind: "chat", filesContext: "" }
    const first = buildPartnerSystemPrompt(mode, LAYER_A, LAYER_B, LAYER_C)
    const second = buildPartnerSystemPrompt(mode, LAYER_A, LAYER_B, LAYER_C)
    expect(first).toBe(second)
  })

  it("A appears before B, and B appears before C, in the assembled prompt", () => {
    const prompt = buildPartnerSystemPrompt(
      { kind: "chat", filesContext: "" },
      LAYER_A,
      LAYER_B,
      LAYER_C
    )
    const indexA = prompt.indexOf("Money is bigint minor units")
    const indexB = prompt.indexOf("generated at abc123")
    const indexC = prompt.indexOf("SPRINT 3: Tenants")
    expect(indexA).toBeGreaterThanOrEqual(0)
    expect(indexB).toBeGreaterThan(indexA)
    expect(indexC).toBeGreaterThan(indexB)
  })

  it("omits an empty layer section entirely rather than printing blank noise", () => {
    const prompt = buildPartnerSystemPrompt({ kind: "chat", filesContext: "" }, "", "", LAYER_C)
    expect(prompt).not.toMatch(/\n{3,}/)
  })
})
