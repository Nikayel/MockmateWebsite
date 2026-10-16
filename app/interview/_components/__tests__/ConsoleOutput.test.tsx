/** @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ConsoleOutput } from "../_sub/ConsoleOutput"
import type { ConsoleOutput as Output } from "@/components/interview/CodeConsole"

const emptyOutputs: Output[] = []
const props = {
  editorConsoleOutputs: emptyOutputs,
  testResults: [],
  testSummary: { total: 0, passed: 0, failed: 0, passRate: 0 },
  isRunningTests: false,
  onClearConsole: vi.fn(),
}

describe("workspace console disclosure", () => {
  it("starts compact and lets the candidate inspect it before a run", () => {
    render(<ConsoleOutput {...props} />)
    const toggle = screen.getByRole("button", { name: "Expand console" })
    expect(toggle.getAttribute("aria-expanded")).toBe("false")
    expect(screen.queryByRole("log", { name: "Console output" })).toBeNull()
    fireEvent.click(toggle)
    expect(screen.getByRole("log", { name: "Console output" })).toBeTruthy()
  })

  it("opens new output, respects a manual collapse, and reopens the next run", () => {
    const { rerender } = render(<ConsoleOutput {...props} />)
    const outputs: Output[] = [{ type: "error", message: "First failure" }]
    rerender(<ConsoleOutput {...props} editorConsoleOutputs={outputs} />)
    expect(screen.getByRole("log").textContent).toContain("First failure")
    fireEvent.click(screen.getByRole("button", { name: "Collapse console" }))
    rerender(<ConsoleOutput {...props} editorConsoleOutputs={[...outputs]} testResults={[]} />)
    expect(screen.queryByRole("log")).toBeNull()
    rerender(<ConsoleOutput {...props} editorConsoleOutputs={outputs} isRunningTests />)
    expect(screen.getByRole("log")).toBeTruthy()
    rerender(
      <ConsoleOutput
        {...props}
        editorConsoleOutputs={[{ type: "error", message: "Next failure" }]}
      />
    )
    expect(screen.getByRole("log").textContent).toContain("Next failure")
  })

  it("opens restored results and keeps their summary available when collapsed", () => {
    render(
      <ConsoleOutput
        {...props}
        testResults={[{ description: "Expiry boundary", passed: false, input: null, error: null }]}
        testSummary={{ total: 1, passed: 0, failed: 1, passRate: 0 }}
      />
    )
    expect(screen.getByRole("log").textContent).toContain("Expiry boundary")
    fireEvent.click(screen.getByRole("button", { name: "Collapse console" }))
    expect(screen.getByText("0/1 tests")).toBeTruthy()
  })
})
