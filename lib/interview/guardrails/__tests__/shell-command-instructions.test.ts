import { describe, expect, it } from "vitest"

import { RESPONSE_GUARDRAILS } from "../response-guardrails"
import type { ValidationContext } from "@/lib/interview/response-validation"
import { createEmptyTracker } from "@/lib/interview/interview-phases"

/**
 * A debugging-track candidate was told to "run python3 src/main.py fixtures/input.txt"
 * mid-interview. There is nowhere to run it: the platform has no terminal, and the only
 * execution affordance is the Run Tests button (the console is read-only). Pack task
 * files quote literal run commands, so the model kept repeating them as instructions.
 *
 * The prompt now explains the environment (buildEnvironmentContext); this guardrail is
 * the enforcement for the interviewer lane. It must catch instructional forms while
 * leaving descriptions of the button's behavior, and ordinary "run the tests" phrasing,
 * untouched.
 */

const guardrail = RESPONSE_GUARDRAILS.find(
  (candidate) => candidate.name === "no-shell-command-instructions"
)

function contextFor(response: string): ValidationContext {
  return {
    response,
    phase: "coding",
    tracker: createEmptyTracker(),
    hasSubmitted: false,
    lastUserMessage: "how do I check my fix?",
  }
}

describe("no-shell-command-instructions", () => {
  it("is registered", () => {
    expect(guardrail).toBeDefined()
    expect(guardrail?.severity).toBe("critical")
  })

  describe("flags instructions to run shell commands", () => {
    const violations = [
      "Before changing anything, run python3 src/main.py fixtures/input.txt and check orbit_goods.",
      "Try running pytest to confirm the failure first.",
      "You could execute node index.js to see the output.",
      "Now re-run src/main.py and diff the output against the oracle.",
      "Run `python3 src/main.py fixtures/input.txt` and compare against task.md.",
      "Once you've made the change, run npm test locally.",
    ]

    for (const response of violations) {
      it(`flags: "${response.slice(0, 50)}..."`, () => {
        expect(guardrail?.check(contextFor(response))?.violated).toBe(true)
      })
    }
  })

  describe("allows button-based phrasing and descriptions", () => {
    const allowed = [
      "Run the tests and check whether orbit_goods now prints 4500.",
      "Click Run Tests to see the current failure.",
      "The Run Tests button runs python3 src/main.py for you.",
      "Tests are passing. When you're ready, click Submit Fix.",
      "What does running the tests show for orbit_goods?",
      "Which file would you inspect first: src/main.py or src/dedupe.py?",
      "Re-run the tests after your change.",
    ]

    for (const response of allowed) {
      it(`allows: "${response.slice(0, 50)}..."`, () => {
        expect(guardrail?.check(contextFor(response))).toBeNull()
      })
    }
  })
})
