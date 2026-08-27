/**
 * @vitest-environment jsdom
 *
 * The submit/CI screen (UX-SPEC.md §8, screen 7). Same mocking shape as
 * `../../__tests__/page.test.tsx` (the ticket screen): assertions are plain DOM reads (no
 * @testing-library/jest-dom in this repo).
 */
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const mockParams = vi.hoisted(() => ({
  value: { workbookId: "fixture-demo", ticketKey: "MER-305" },
}))
const notFoundSpy = vi.hoisted(() => vi.fn())
vi.mock("next/navigation", () => ({
  useParams: () => mockParams.value,
  useRouter: () => ({ replace: vi.fn() }),
  notFound: () => {
    notFoundSpy()
  },
}))

vi.mock("@/components/ThemeToggle", () => ({ ThemeToggle: () => <button>Theme</button> }))

const mockAuth = vi.hoisted(() => ({ value: { user: { uid: "u1" }, initialized: true } }))
vi.mock("@/lib/auth-context", () => ({ useAuth: () => mockAuth.value }))

const mockFetchRun = vi.hoisted(() => vi.fn())
vi.mock("@/lib/sprint-labs/runs-client", () => ({
  fetchActiveSprintLabRun: mockFetchRun,
  moveSprintLabRunTicket: vi.fn(),
}))

const registry = vi.hoisted(() => ({
  getWorkbookSummary: vi.fn(),
  getTicket: vi.fn(),
}))
vi.mock("@/lib/sprint-labs/content/registry", () => registry)

const mockEntitlement = vi.hoisted(() => ({
  value: { isPro: null as boolean | null, entitlementFailed: false, retry: vi.fn() },
}))
vi.mock("@/components/sprint-labs/useSprintLabProEntitlement", () => ({
  useSprintLabProEntitlement: () => mockEntitlement.value,
}))

const mockController = vi.hoisted(() => ({
  value: {
    phase: "confirm-first" as const,
    gateResults: null,
    escapedDefects: [],
    aiPolicy: null,
    submissionsRemaining: null,
    reviewComments: null,
    errorMessage: null,
    cooldownSecondsRemaining: 0,
    start: vi.fn(),
    retry: vi.fn(),
  },
}))
vi.mock("@/components/sprint-labs/submit/useSubmitScreenController", () => ({
  useSubmitScreenController: () => mockController.value,
}))

import SprintLabSubmitPage from "../page"

const SUMMARY = {
  id: "fixture-demo",
  title: "Fixture Demo: Contracts Sprint",
  pitch: "pitch",
  track: "Systems / Backend",
  language: "typescript" as const,
  level: "Junior / Mid",
  topics: ["typescript"],
  sprintCount: 1,
  ticketCount: 2,
  estimatedHours: 2,
  requiresServerExecution: false,
  objectives: [],
}

function activeRun(
  overrides: Partial<{ currentSprint: number; board: Record<string, string> }> = {}
) {
  return {
    id: "run1",
    userId: "u1",
    workbookId: "fixture-demo",
    contentVersion: "v1",
    currentSprint: overrides.currentSprint ?? 1,
    board: overrides.board ?? { "MER-305": "doing" },
    status: "in_progress" as const,
    startedAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  }
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  mockEntitlement.value = { isPro: null, entitlementFailed: false, retry: vi.fn() }
  mockParams.value = { workbookId: "fixture-demo", ticketKey: "MER-305" }
})

describe("Sprint Labs submit page", () => {
  it("renders the pre-submit finalize notice once the run resolves", async () => {
    registry.getWorkbookSummary.mockReturnValue(SUMMARY)
    mockFetchRun.mockResolvedValue(activeRun())

    render(<SprintLabSubmitPage />)

    await waitFor(() => {
      expect(screen.getByText(/This finalizes your score for MER-305\./)).not.toBeNull()
    })
  })

  it("404s when the ticket key is not tracked on this run's board", async () => {
    registry.getWorkbookSummary.mockReturnValue(SUMMARY)
    mockFetchRun.mockResolvedValue(activeRun({ board: { "MER-304": "todo" } }))
    mockParams.value = { workbookId: "fixture-demo", ticketKey: "MER-999" }

    render(<SprintLabSubmitPage />)
    await waitFor(() => expect(notFoundSpy).toHaveBeenCalled())
  })

  it("shows the Pro wall instead of the gates when the run's sprint requires Pro", async () => {
    registry.getWorkbookSummary.mockReturnValue(SUMMARY)
    mockFetchRun.mockResolvedValue(activeRun({ currentSprint: 2, board: { "MER-305": "doing" } }))
    mockEntitlement.value = { isPro: false, entitlementFailed: false, retry: vi.fn() }

    render(<SprintLabSubmitPage />)

    await waitFor(() => {
      expect(screen.getByText(/is part of Pro/)).not.toBeNull()
    })
    expect(screen.queryByText(/This finalizes your score/)).toBeNull()
  })
})
