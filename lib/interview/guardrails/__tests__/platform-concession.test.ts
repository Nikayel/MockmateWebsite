import { describe, expect, it } from "vitest"

import { RESPONSE_GUARDRAILS, concedesPlatformFault } from "../response-guardrails"
import type { ValidationContext } from "@/lib/interview/response-validation"
import { createEmptyTracker } from "@/lib/interview/interview-phases"

/**
 * A candidate worked out that a scenario's tests were broken. They were right: our sandbox
 * was missing assert.deepEqual, so every test threw before their code ran. The interviewer
 * replied "What makes you say that?" and argued with them.
 *
 * That was not a model failure. Agreement was un-sayable. "Good catch, you're right" trips
 * the validation-phrase gate, which is severity critical and forces regeneration with "YOUR
 * PREVIOUS RESPONSE VIOLATED INTERVIEW RULES", so pushing back was the only compliant move
 * available.
 *
 * The neutrality rule exists so candidates cannot read their score off the interviewer's
 * tone. It was never meant to stop us admitting our own bug.
 */

const validationGuardrail = RESPONSE_GUARDRAILS.find(
  (guardrail) => guardrail.name === "no-validation-phrases"
)

function contextFor(response: string): ValidationContext {
  return {
    response,
    phase: "coding",
    tracker: createEmptyTracker(),
    hasSubmitted: false,
    lastUserMessage: "seems like the test is broken too",
  }
}

describe("conceding a platform fault", () => {
  it("has a guardrail to test against", () => {
    expect(validationGuardrail).toBeDefined()
  })

  describe("is allowed to say so plainly", () => {
    const concessions = [
      "Good catch, you're right - that's on our side, not your code.",
      "That's correct, our test harness is broken there.",
      "You're right. That's a platform bug, not a bug in your code.",
      "Nice spot. The tests are broken, that's on us.",
    ]

    concessions.forEach((response) => {
      it(`does not fail regeneration for: "${response.slice(0, 40)}..."`, () => {
        expect(validationGuardrail!.check(contextFor(response))).toBeNull()
      })
    })
  })

  describe("still refuses to validate the candidate's answer", () => {
    const praise = [
      "Nice. That's the optimal approach.",
      "Perfect, you've got the right idea.",
      "That's right, a hash map is what I was looking for.",
      "Exactly. That checks out.",
    ]

    praise.forEach((response) => {
      it(`still flags: "${response.slice(0, 40)}..."`, () => {
        const result = validationGuardrail!.check(contextFor(response))
        expect(result?.violated).toBe(true)
      })
    })
  })

  describe("concedesPlatformFault", () => {
    it("recognises the platform being named", () => {
      expect(concedesPlatformFault("that's on our end")).toBe(true)
      expect(concedesPlatformFault("our test runner is throwing")).toBe(true)
      expect(concedesPlatformFault("that's not your code")).toBe(true)
    })

    it("is not reachable by praising an answer", () => {
      // The carve-out must be narrow. If ordinary praise could reach it, the neutrality
      // rule would be trivially bypassable and candidates could read their score off it.
      expect(concedesPlatformFault("Nice, that's the optimal solution.")).toBe(false)
      expect(concedesPlatformFault("Perfect. You've got the right idea.")).toBe(false)
      expect(concedesPlatformFault("That's right, well reasoned.")).toBe(false)
    })
  })
})
