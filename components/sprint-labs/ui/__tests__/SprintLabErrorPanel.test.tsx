/**
 * @vitest-environment jsdom
 *
 * SprintLabErrorPanel — the run surface's one error shape (UX-SPEC.md §13): one panel, one message,
 * exactly one retry action.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { SprintLabErrorPanel } from "../SprintLabErrorPanel"

afterEach(cleanup)

describe("SprintLabErrorPanel", () => {
  it("renders the message and calls onRetry when the retry button is clicked", () => {
    const onRetry = vi.fn()
    render(<SprintLabErrorPanel message="Couldn't load the board." onRetry={onRetry} />)
    expect(screen.getByText("Couldn't load the board.")).not.toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Retry" }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it("exposes exactly one action", () => {
    render(<SprintLabErrorPanel message="failed" onRetry={() => {}} />)
    expect(screen.getAllByRole("button")).toHaveLength(1)
  })

  it("supports a custom retry label", () => {
    render(<SprintLabErrorPanel message="failed" onRetry={() => {}} retryLabel="Check again" />)
    expect(screen.getByRole("button", { name: "Check again" })).not.toBeNull()
  })
})
