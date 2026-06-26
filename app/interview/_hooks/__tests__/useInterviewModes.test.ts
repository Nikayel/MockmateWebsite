import { describe, expect, it } from "vitest"
import { interpretModeKeydown } from "../useInterviewModes"

// The hook wires DOM listeners + class side effects, which can't render in the
// node test env; the interesting logic is the keyboard chord decision, which is
// pure and fully covered here.
describe("interpretModeKeydown", () => {
  it("exits focus mode on Escape only while in focus mode", () => {
    expect(interpretModeKeydown("Escape", false, true, false)).toBe("exit-focus")
    expect(interpretModeKeydown("Escape", false, false, false)).toBe("none")
  })

  it("starts the chord on Cmd/Ctrl+K", () => {
    expect(interpretModeKeydown("k", true, false, false)).toBe("start-chord")
    // Without a modifier, plain "k" does nothing
    expect(interpretModeKeydown("k", false, false, false)).toBe("none")
  })

  it("completes the chord on Z only while waiting", () => {
    expect(interpretModeKeydown("z", false, false, true)).toBe("complete-chord")
    expect(interpretModeKeydown("z", false, false, false)).toBe("none")
  })

  it("re-arms the chord if Cmd/Ctrl+K is pressed again while waiting", () => {
    expect(interpretModeKeydown("k", true, false, true)).toBe("start-chord")
  })

  it("prioritizes Escape-exit over chord completion", () => {
    // Escape while focused + waiting still exits (matches original ordering)
    expect(interpretModeKeydown("Escape", false, true, true)).toBe("exit-focus")
  })

  it("ignores unrelated keys", () => {
    expect(interpretModeKeydown("a", false, false, false)).toBe("none")
    expect(interpretModeKeydown("z", true, true, false)).toBe("none")
  })
})
