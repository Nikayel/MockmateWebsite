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

    expect(screen.getByRole("button", { name: "Open Sparra AI partner" })).toBeTruthy()
    expect(screen.getByText("Ask Sparra")).toBeTruthy()
  })

  it("renders the popup conversation and can be minimized", () => {
    const onExpandedChange = vi.fn()
    render(<SparraPartnerWidget expanded onExpandedChange={onExpandedChange} {...baseProps} />)

    expect(screen.getByRole("dialog", { name: "Sparra AI partner" })).toBeTruthy()
    expect(screen.getByText("AI debugging partner")).toBeTruthy()
    expect(screen.getByText("Tell me what you inspected.")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Minimize Sparra" }))
    expect(onExpandedChange).toHaveBeenCalledWith(false)
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
