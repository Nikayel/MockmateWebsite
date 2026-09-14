// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { UserListFilters, type UserListFiltersValue } from "./UserListFilters"

const FILTERS: UserListFiltersValue = {
  tier: "pro",
  provider: "google",
  signedUpFrom: "2026-09-01",
  signedUpTo: "2026-09-14",
  sortOrder: "asc",
  limit: 50,
}

describe("UserListFilters", () => {
  it("labels every control and prevents an invalid date range in the browser", () => {
    render(<UserListFilters value={FILTERS} onChange={vi.fn()} />)

    expect(screen.getByText("Plan")).toBeTruthy()
    expect(screen.getByText("Provider")).toBeTruthy()
    expect(screen.getByText("Signup order")).toBeTruthy()
    expect(screen.getByText("Rows per page")).toBeTruthy()
    expect(screen.getByLabelText("Signed up from").getAttribute("max")).toBe("2026-09-14")
    expect(screen.getByLabelText("Signed up to").getAttribute("min")).toBe("2026-09-01")
  })

  it("reports date changes and resets all filters", () => {
    const onChange = vi.fn()
    render(<UserListFilters value={FILTERS} onChange={onChange} />)

    fireEvent.change(screen.getByLabelText("Signed up from"), {
      target: { value: "2026-09-02" },
    })
    expect(onChange).toHaveBeenCalledWith({ ...FILTERS, signedUpFrom: "2026-09-02" })

    fireEvent.click(screen.getByRole("button", { name: "Reset" }))
    expect(onChange).toHaveBeenLastCalledWith({
      tier: "all",
      provider: "all",
      signedUpFrom: "",
      signedUpTo: "",
      sortOrder: "desc",
      limit: 25,
    })
  })
})
