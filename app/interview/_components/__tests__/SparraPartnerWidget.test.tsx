/** @vitest-environment jsdom */

import { createRef } from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { SparraPartnerWidget } from "../SparraPartnerWidget"

const baseProps = {
  messages: [{ type: "ai" as const, message: "Tell me what you inspected." }],
  messagesEndRef: createRef<HTMLDivElement>(),
  input: "",
  onInputChange: vi.fn(),
  isLoading: false,
  onSendMessage: vi.fn(),
  isDebuggingScenario: true,
}

describe("SparraPartnerWidget", () => {
  it("renders as a named, minimized chat launcher", () => {
    render(<SparraPartnerWidget expanded={false} onExpandedChange={vi.fn()} {...baseProps} />)

    expect(screen.getByRole("button", { name: "Open Sparra partner" })).toBeTruthy()
    expect(screen.getByText("Ask Sparra")).toBeTruthy()
  })

  it("renders a docked conversation and returns to the problem", () => {
    const onExpandedChange = vi.fn()
    render(<SparraPartnerWidget expanded onExpandedChange={onExpandedChange} {...baseProps} />)

    expect(screen.getByRole("region", { name: "Sparra partner" })).toBeTruthy()
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(screen.getByText("Tell me what you inspected.")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Back to problem" }))
    expect(onExpandedChange).toHaveBeenCalledWith(false)
  })

  it("focuses the input but only handles Escape originating inside the partner", () => {
    const onExpandedChange = vi.fn()
    render(<SparraPartnerWidget expanded onExpandedChange={onExpandedChange} {...baseProps} />)
    const input = screen.getByRole("textbox", { name: "Message Sparra" })
    expect(document.activeElement).toBe(input)
    fireEvent.keyDown(window, { key: "Escape" })
    expect(onExpandedChange).not.toHaveBeenCalled()
    fireEvent.keyDown(input, { key: "Escape" })
    expect(onExpandedChange).toHaveBeenCalledWith(false)
  })

  it.each([
    { input: "   ", isLoading: false },
    { input: "A question", isLoading: true },
  ])("does not submit empty or busy input: %j", (state) => {
    const onSendMessage = vi.fn()
    render(
      <SparraPartnerWidget
        expanded
        onExpandedChange={vi.fn()}
        {...baseProps}
        {...state}
        onSendMessage={onSendMessage}
      />
    )
    fireEvent.submit(
      screen.getByRole("button", { name: "Send message to Sparra" }).closest("form")!
    )
    expect(onSendMessage).not.toHaveBeenCalled()
  })

  it("submits a typed message through the existing chat handler", () => {
    const onSendMessage = vi.fn()
    render(
      <SparraPartnerWidget
        expanded
        onExpandedChange={vi.fn()}
        {...baseProps}
        input="My hypothesis"
        onSendMessage={onSendMessage}
      />
    )

    fireEvent.submit(
      screen.getByRole("button", { name: "Send message to Sparra" }).closest("form")!
    )
    expect(onSendMessage).toHaveBeenCalledOnce()
  })
})
