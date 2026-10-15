// @vitest-environment jsdom
import type { ReactNode } from "react"
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useRoadmapStore } from "@/lib/stores/roadmap-store"
import {
  loadPendingWizard,
  savePendingWizard,
  type PendingWizard,
} from "@/lib/roadmap/pending-wizard"

const mocks = vi.hoisted(() => ({ push: vi.fn(), fetch: vi.fn(), track: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }))
vi.mock("@/lib/analytics", () => ({ trackEvent: mocks.track }))
vi.mock("@/lib/auth-context", () => {
  const firebaseUser = { uid: "test-owner", getIdToken: async () => "test-token" }
  const user = { id: "test-owner" }
  return { useAuth: () => ({ user, firebaseUser, loading: false }) }
})
vi.mock("@/components/header", () => ({ Header: () => null }))
vi.mock("@/components/brand/Sparra", () => ({ Sparra: () => null }))
vi.mock("@/components/brand/SparraLoader", () => ({ SparraLoader: () => null }))
vi.mock("@/components/roadmap", () => ({
  CompanySelector: () => <div>Choose company</div>,
  InterviewDatePicker: () => null,
  SkillAssessment: () => null,
}))
vi.mock("framer-motion", () => ({
  motion: { div: ({ children }: { children: ReactNode }) => <div>{children}</div> },
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

import NewRoadmapPage from "./page"

const wizard: PendingWizard = {
  companyId: "google",
  interviewDate: "2026-12-01T12:00:00.000Z",
  result: {
    experienceLevel: "beginner",
    problemsSolved: 10,
    hoursPerDay: 1,
    patternFamiliarity: [],
    mixMode: "full",
  },
}

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
  localStorage.clear()
  useRoadmapStore.getState().resetWizard()
  vi.stubGlobal("fetch", mocks.fetch)
  savePendingWizard(wizard)
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("roadmap entitlement journey", () => {
  it.each(["FREE_ROADMAP_ALREADY_USED", "PRO_REQUIRED"])(
    "shows the upgrade choice for %s and saves a resumed assessment only on an upgrade click",
    async (code) => {
      mocks.fetch.mockResolvedValue({ ok: false, status: 403, json: async () => ({ code }) })
      render(<NewRoadmapPage />)
      const upgrade = await screen.findByRole("link", { name: "See Pro pricing" })
      expect(upgrade.getAttribute("href")).toBe("/upgrade?source=roadmap")
      expect(screen.queryByText(/prepared a custom study plan/)).toBeNull()
      expect(loadPendingWizard()).toBeNull()
      expect(mocks.fetch).toHaveBeenCalledTimes(1)
      fireEvent.click(upgrade)
      expect(loadPendingWizard()).toEqual(wizard)
      expect(mocks.track).toHaveBeenCalledWith("roadmap_flow", {
        step: "upgrade_clicked",
        gate_reason: code === "PRO_REQUIRED" ? "pro_required" : "free_roadmap_used",
      })
    }
  )

  it("keeps an in-progress reservation as a retryable error, not an upsell", async () => {
    mocks.fetch.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ code: "FREE_ROADMAP_IN_PROGRESS", error: "Please wait and retry." }),
    })
    render(<NewRoadmapPage />)
    await screen.findByText("Please wait and retry.")
    expect(screen.queryByRole("link", { name: "See Pro pricing" })).toBeNull()
  })

  it("leaves successful free generation on the existing roadmap path", async () => {
    const roadmap = { id: "free-test-roadmap", dailyPlans: [] }
    mocks.fetch.mockResolvedValue({ ok: true, json: async () => ({ roadmap }) })
    render(<NewRoadmapPage />)
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/roadmap"))
    expect(loadPendingWizard()).toBeNull()
    expect(screen.queryByRole("link", { name: "See Pro pricing" })).toBeNull()
  })

  it("can leave the gate without an automatic retry loop", async () => {
    mocks.fetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ code: "FREE_ROADMAP_ALREADY_USED" }),
    })
    render(<NewRoadmapPage />)
    fireEvent.click(await screen.findByRole("button", { name: "Start over" }))
    await screen.findByText("Choose company")
    await act(async () => {})
    expect(loadPendingWizard()).toBeNull()
    expect(mocks.fetch).toHaveBeenCalledTimes(1)
  })
})
