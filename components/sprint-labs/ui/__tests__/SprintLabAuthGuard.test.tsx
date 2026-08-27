/**
 * @vitest-environment jsdom
 *
 * SprintLabAuthGuard — layer two of the run surface's auth gate, mirroring `LearnAuthGuard` exactly.
 */
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const mockAuth = vi.hoisted(() => ({ value: { user: null as unknown, initialized: false } }))
vi.mock("@/lib/auth-context", () => ({ useAuth: () => mockAuth.value }))

const mockRouter = vi.hoisted(() => ({ replace: vi.fn() }))
vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  usePathname: () => "/sprint-labs/fixture-demo/run/board",
}))

import { SprintLabAuthGuard } from "../SprintLabAuthGuard"

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("SprintLabAuthGuard", () => {
  it("renders a quiet loader while auth has not initialized, without redirecting", () => {
    mockAuth.value = { user: null, initialized: false }
    render(
      <SprintLabAuthGuard>
        <p>protected content</p>
      </SprintLabAuthGuard>
    )
    expect(screen.queryByText("protected content")).toBeNull()
    expect(mockRouter.replace).not.toHaveBeenCalled()
  })

  it("redirects to login with the current path once initialized and signed out", async () => {
    mockAuth.value = { user: null, initialized: true }
    render(
      <SprintLabAuthGuard>
        <p>protected content</p>
      </SprintLabAuthGuard>
    )
    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith(
        "/login?redirect=%2Fsprint-labs%2Ffixture-demo%2Frun%2Fboard"
      )
    })
    expect(screen.queryByText("protected content")).toBeNull()
  })

  it("renders children once initialized with a signed-in user", () => {
    mockAuth.value = { user: { uid: "u1" }, initialized: true }
    render(
      <SprintLabAuthGuard>
        <p>protected content</p>
      </SprintLabAuthGuard>
    )
    expect(screen.getByText("protected content")).not.toBeNull()
    expect(mockRouter.replace).not.toHaveBeenCalled()
  })
})
