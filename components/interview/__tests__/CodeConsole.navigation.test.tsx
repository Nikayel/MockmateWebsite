/** @vitest-environment jsdom */
import React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { CodeConsole, type TestResult } from "../CodeConsole"

const failure: TestResult = {
  description: "visible reconciliation lookup: rejects settled rows",
  passed: false,
  input: "visible reconciliation lookup",
  error: "Expected: []\nReceived: [0,1]",
}
const path = "tests/reconciliation.test.js"

describe("visible test source navigation", () => {
  it("opens the mapped public test file through one labeled action", () => {
    const onOpenTestSource = vi.fn()
    render(
      <CodeConsole
        testResults={[failure]}
        testSources={new Map([[failure, path]])}
        onOpenTestSource={onOpenTestSource}
      />
    )
    const button = screen.getByRole("button", {
      name: `Open test file ${path}: ${failure.description}`,
    })
    expect(button.textContent).toContain(path)
    fireEvent.click(button)
    expect(onOpenTestSource).toHaveBeenCalledTimes(1)
    expect(onOpenTestSource).toHaveBeenCalledWith(path)
  })

  it.each([
    { ...failure, isHidden: true },
    { ...failure, passed: true },
  ])("keeps hidden and passing results unlinked", (result) => {
    render(
      <CodeConsole
        testResults={[result]}
        testSources={new Map([[result, path]])}
        onOpenTestSource={vi.fn()}
      />
    )
    expect(screen.queryByRole("button", { name: /Open test file/ })).toBeNull()
  })

  it("keeps unmapped failures readable without a dead control", () => {
    render(<CodeConsole testResults={[failure]} onOpenTestSource={vi.fn()} />)
    expect(screen.queryByRole("button", { name: /Open test file/ })).toBeNull()
    expect(screen.getByText(failure.description)).toBeTruthy()
  })
})
