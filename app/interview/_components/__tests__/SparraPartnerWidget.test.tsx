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
  it("leaves navigation to the rail while the problem is active", () => {
    render(<SparraPartnerWidget expanded={false} {...baseProps} />)
    expect(screen.queryByRole("region", { name: "Sparra partner" })).toBeNull()
    expect(screen.queryByRole("button", { name: /open/i })).toBeNull()
  })

  it("renders a docked conversation with a labeled input", () => {
    render(<SparraPartnerWidget expanded {...baseProps} />)
    expect(screen.getByRole("region", { name: "Sparra partner" })).toBeTruthy()
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(screen.getByText("Tell me what you inspected.")).toBeTruthy()
    expect(screen.getByRole("textbox", { name: "Message Sparra" })).toBeTruthy()
  })

  it.each([
    { input: "   ", isLoading: false },
    { input: "A question", isLoading: true },
  ])("does not submit empty or busy input: %j", (state) => {
    const onSendMessage = vi.fn()
    render(<SparraPartnerWidget expanded {...baseProps} {...state} onSendMessage={onSendMessage} />)
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
