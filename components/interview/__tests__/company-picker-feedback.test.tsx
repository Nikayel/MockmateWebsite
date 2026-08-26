/**
 * @vitest-environment jsdom
 *
 * Today's only guest trial spent twenty seconds at this dialog: the Start
 * Interview button ships disabled (nothing pre-selected) with
 * pointer-events-none, so their clicks landed on the footer div as
 * PostHog $dead_clicks with zero feedback. And a rageclick on the Info icon
 * showed the second trap: the tooltip trigger sits INSIDE the label, so
 * every tap silently flipped the Real Interview Mode checkbox while the
 * tooltip (hover-only) never opened.
 */

import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { CompanyPicker } from "../CompanyPicker"

function renderPicker(overrides: Record<string, unknown> = {}) {
  const onSelect = vi.fn()
  const onClose = vi.fn()
  render(
    <CompanyPicker
      open
      onClose={onClose}
      onSelect={onSelect}
      scenarioCompanies={[]}
      hasFuzzyMode
      {...overrides}
    />
  )
  return { onSelect, onClose }
}

describe("CompanyPicker start button", () => {
  it("explains what is missing instead of silently swallowing the click", () => {
    const { onSelect } = renderPicker()

    fireEvent.click(screen.getByRole("button", { name: /start interview/i }))

    expect(onSelect).not.toHaveBeenCalled()
    expect(screen.getByText(/pick a company or general practice/i)).toBeTruthy()
  })
})

describe("CompanyPicker info icon", () => {
  it("does not flip the Real Interview Mode toggle when tapped", () => {
    renderPicker()

    const checkbox = screen.getByRole("checkbox")
    expect(checkbox.getAttribute("aria-checked")).toBe("false")

    fireEvent.click(screen.getByLabelText(/about real interview mode/i))

    expect(checkbox.getAttribute("aria-checked")).toBe("false")
  })
})
