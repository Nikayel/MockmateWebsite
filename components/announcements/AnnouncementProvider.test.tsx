/** @vitest-environment jsdom */

import { act, cleanup, render, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { AnnouncementProvider } from "./AnnouncementProvider"

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ firebaseUser: null, initialized: true }),
}))

describe("AnnouncementProvider refresh policy", () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, announcements: [] }),
    })
    vi.stubGlobal("fetch", fetchMock)
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("fetches initially and refreshes when the visitor returns", async () => {
    render(
      <AnnouncementProvider>
        <main>Page</main>
      </AnnouncementProvider>
    )

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    window.dispatchEvent(new Event("focus"))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
  })

  it("does not install a background polling interval", async () => {
    const intervalSpy = vi.spyOn(window, "setInterval")

    render(
      <AnnouncementProvider>
        <main>Page</main>
      </AnnouncementProvider>
    )

    await act(async () => {})

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(intervalSpy).not.toHaveBeenCalled()
  })
})
