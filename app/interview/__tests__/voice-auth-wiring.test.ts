import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Guards the wiring, because the bug was in the wiring and every unit underneath it was already
 * green.
 *
 * `useVoiceInput` needs `getAuthToken` to authenticate the Deepgram token grant. Without it
 * `DeepgramVoiceService.isConfigured()` returns false, and because the interview asks for
 * `fallbackToWebSpeech: true` the hook quietly downgrades to the browser recognizer. Nothing
 * throws, nothing logs, and the user still sees a transcript, so the failure is invisible.
 *
 * That is exactly what shipped: Nova-3, the interview keyterm list, and the Big-O transcript
 * repair were all live, tested, and unreachable, because the one call site never passed a token.
 *
 * A behavioural test would not have caught it. The service was correct in isolation and the hook
 * was correct in isolation; only their composition at this call site was wrong. So this asserts on
 * the call site itself.
 */

const INTERVIEW_PAGE = join(process.cwd(), "app/interview/page.tsx")

/** Extract the option-object source of every `useVoiceInput({ ... })` call, brace-balanced. */
function voiceInputCallOptions(source: string): string[] {
  const calls: string[] = []
  const opener = "useVoiceInput({"

  let index = source.indexOf(opener)
  while (index !== -1) {
    let depth = 1
    let cursor = index + opener.length
    while (cursor < source.length && depth > 0) {
      const char = source[cursor]
      if (char === "{") depth += 1
      else if (char === "}") depth -= 1
      cursor += 1
    }
    calls.push(source.slice(index + opener.length, cursor - 1))
    index = source.indexOf(opener, cursor)
  }

  return calls
}

describe("interview voice auth wiring", () => {
  const source = readFileSync(INTERVIEW_PAGE, "utf8")
  const calls = voiceInputCallOptions(source)

  it("finds the voice hook call sites it is meant to guard", () => {
    // If this drops to zero the guard has silently stopped guarding, which is worse than failing.
    expect(calls.length).toBeGreaterThan(0)
  })

  it("passes getAuthToken to every useVoiceInput call", () => {
    calls.forEach((options, i) => {
      expect(
        options.includes("getAuthToken"),
        `useVoiceInput call #${i + 1} in app/interview/page.tsx does not pass getAuthToken. ` +
          `Deepgram cannot authenticate its token grant without it, and fallbackToWebSpeech will ` +
          `silently downgrade the interview to the browser recognizer.`
      ).toBe(true)
    })
  })

  it("resolves the token through firebaseUser.getIdToken, not a captured string", () => {
    // getIdToken() refreshes a token close to expiry. A string captured at mount goes stale after
    // an hour, and a long interview would lose Deepgram partway through with no visible error.
    expect(source).toMatch(/getVoiceAuthToken[\s\S]{0,200}firebaseUser\.getIdToken\(\)/)
  })
})
