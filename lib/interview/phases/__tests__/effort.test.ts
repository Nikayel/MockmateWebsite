import { describe, expect, it } from "vitest"
import { PHASE_PROVIDER, providerForPhase } from "../effort"
import type { InterviewPhase } from "../types"

/**
 * Phase-to-effort routing.
 *
 * The invariant that matters most is the one that is easiest to break by
 * accident: this table may change the reasoning EFFORT and must never change
 * the VENDOR. Effort is a quality dial; vendor is a scoring decision, and
 * silently moving the interviewer onto a different model mid-session would
 * change what the transcript is worth without anything announcing it.
 */

const EFFORT_RANK = ["none", "low", "medium", "high", "xhigh", "max"]
const effortOf = (provider: string) => provider.replace("openai-", "")
const rank = (provider: string) => EFFORT_RANK.indexOf(effortOf(provider))

/** Every phase in the union, so a new one cannot slip through untested. */
const ALL_PHASES: InterviewPhase[] = [
  "intro",
  "clarification",
  "discussion",
  "coding",
  "testing",
  "post_interview",
  "complete",
]

describe("phase reasoning effort", () => {
  it("covers every phase in the union", () => {
    // Object.keys rather than a hand-listed set: adding a phase to the type
    // without adding it here should fail, not silently fall back.
    expect(Object.keys(PHASE_PROVIDER).sort()).toEqual([...ALL_PHASES].sort())
  })

  it("only ever changes the effort, never the vendor", () => {
    for (const phase of ALL_PHASES) {
      expect(PHASE_PROVIDER[phase], phase).toMatch(/^openai-/)
    }
  })

  it("names an effort that exists", () => {
    for (const phase of ALL_PHASES) {
      expect(EFFORT_RANK, phase).toContain(effortOf(PHASE_PROVIDER[phase]))
    }
  })

  it("caps the phases where the candidate is mid-flow", () => {
    // Measured 2026-08-06: on bounded interview turns `high` costs ~300ms over
    // `low`, but the same effort on an OPEN-ENDED prompt ran to 16.6s. A
    // candidate can ask an open-ended question at any point while coding, so
    // the tail risk is real and `xhigh` stays out of the phases where someone
    // is waiting to keep typing.
    for (const phase of ["intro", "clarification", "discussion", "coding", "testing"] as const) {
      expect(
        rank(PHASE_PROVIDER[phase]),
        `${phase} must stay at or below high`
      ).toBeLessThanOrEqual(EFFORT_RANK.indexOf("high"))
    }
  })

  it("spends the most thinking only after the candidate has submitted", () => {
    for (const phase of ["post_interview", "complete"] as const) {
      expect(PHASE_PROVIDER[phase], phase).toBe("openai-xhigh")
    }
  })

  it("raises effort for the phases that require judgement", () => {
    // discussion, coding and testing all ask the interviewer to decide whether
    // something is CORRECT. intro and clarification do not.
    const judgement = ["discussion", "coding", "testing"] as const
    const conversational = ["intro", "clarification"] as const
    for (const j of judgement) {
      for (const c of conversational) {
        expect(rank(PHASE_PROVIDER[j]), `${j} should out-think ${c}`).toBeGreaterThan(
          rank(PHASE_PROVIDER[c])
        )
      }
    }
  })

  it("spends nothing on the scripted opening", () => {
    expect(PHASE_PROVIDER.intro).toBe("openai-none")
  })

  it("degrades to the capability chain for an unknown phase instead of throwing", () => {
    // A phase added to the union but not to the table must fall back to the old
    // flat behaviour. Taking the interview down is a far worse outcome than
    // running one turn at the capability's default effort.
    expect(providerForPhase(undefined)).toBeUndefined()
    expect(providerForPhase("not_a_phase" as InterviewPhase)).toBeUndefined()
  })

  it("resolves each known phase to its table entry", () => {
    for (const phase of ALL_PHASES) {
      expect(providerForPhase(phase), phase).toBe(PHASE_PROVIDER[phase])
    }
  })
})
