/**
 * @vitest-environment jsdom
 *
 * The run surface's foundation layout (UX-SPEC.md §1.2): force-dynamic, noindex, and the auth guard
 * wrapping every screen underneath. This is the FOUNDATION Tasks 12-13's leaf segments sit inside.
 */
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

const mockGuard = vi.hoisted(() => vi.fn(({ children }: { children: React.ReactNode }) => children))
vi.mock("@/components/sprint-labs/ui/SprintLabAuthGuard", () => ({
  SprintLabAuthGuard: mockGuard,
}))

import SprintLabRunLayout, { dynamic, metadata } from "../layout"

describe("Sprint Labs run layout", () => {
  it("is force-dynamic and noindex, per Pattern B", () => {
    expect(dynamic).toBe("force-dynamic")
    expect(metadata.robots).toEqual({ index: false, follow: false })
  })

  it("wraps children in SprintLabAuthGuard", () => {
    render(
      <SprintLabRunLayout>
        <p>a run screen</p>
      </SprintLabRunLayout>
    )
    expect(mockGuard).toHaveBeenCalled()
    expect(screen.getByText("a run screen")).not.toBeNull()
  })
})
