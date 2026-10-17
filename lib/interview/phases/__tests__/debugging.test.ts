import { describe, expect, it } from "vitest"
import { detectDebuggingPhase } from "../debugging"

const reading = {
  hasSubmitted: false,
  hasCodeChanges: false,
  testsAreCurrent: false,
  hasTestResults: false,
  approachExplained: false,
}

describe("debugging phase detection", () => {
  it("leaves an untouched repository in reading mode", () => {
    expect(detectDebuggingPhase(reading)).toBe("clarification")
  })

  it("treats a baseline run as investigation even without a formal hypothesis", () => {
    expect(detectDebuggingPhase({ ...reading, hasTestResults: true, testsAreCurrent: true })).toBe(
      "discussion"
    )
  })

  it("recognizes edits independently of file length or chat count", () => {
    expect(detectDebuggingPhase({ ...reading, hasCodeChanges: true })).toBe("coding")
  })

  it("only verifies a patch with a current run", () => {
    expect(detectDebuggingPhase({ ...reading, hasCodeChanges: true, hasTestResults: true })).toBe(
      "coding"
    )
    expect(
      detectDebuggingPhase({
        ...reading,
        hasCodeChanges: true,
        hasTestResults: true,
        testsAreCurrent: true,
      })
    ).toBe("testing")
  })

  it("returns to investigation after a reverted patch", () => {
    expect(detectDebuggingPhase({ ...reading, hasTestResults: true })).toBe("discussion")
  })

  it("lets informal reasoning start discussion without a test run", () => {
    expect(detectDebuggingPhase({ ...reading, approachExplained: true })).toBe("discussion")
  })

  it("submission takes precedence over all other state", () => {
    expect(detectDebuggingPhase({ ...reading, hasSubmitted: true })).toBe("post_interview")
  })
})
