/**
 * @vitest-environment jsdom
 *
 * The ticket screen (UX-SPEC.md §6, screen 5). Covers the task's own verification bar: "ticket
 * renders body/criteria/banner + never leaks file paths", plus the not-found and Pro-wall states.
 *
 * Assertions are plain DOM reads because this repo does not carry @testing-library/jest-dom.
 */
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const mockParams = vi.hoisted(() => ({
  value: { workbookId: "fixture-demo", ticketKey: "MER-305" },
}))
const notFoundSpy = vi.hoisted(() => vi.fn())
// Deliberately non-throwing: the real `notFound()` throws during whichever render pass calls it,
// which for these client pages is an effect-driven re-render (the run resolves asynchronously), not
// the initial synchronous render `render()` returns from. A throwing mock here would only surface as
// an unhandled error on a later microtask rather than something a synchronous `toThrow()` can catch;
// asserting the spy was invoked is the robust, timing-independent way to pin "this page 404s here."
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
vi.mock("@/lib/sprint-labs/runs-client", () => ({ fetchActiveSprintLabRun: mockFetchRun }))

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

import SprintLabTicketPage from "../page"

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

const MER_305 = {
  ticket: {
    key: "MER-305",
    title: "CX-88431 was extracted and billed twice",
    points: 5,
    labels: ["bug", "P1"],
    aiPolicy: "unassisted" as const,
    aiPolicyReason: "we are not shipping a race fix nobody on the team can defend",
    objectives: [],
    bodyMd: "Support reopened CX-88431 this morning.",
    acceptanceCriteria: ["A repeat submission cannot create a second extraction."],
    adversaryPresent: true,
  },
  setupDiff: null,
  visibleTestFiles: [],
  hiddenTests: [],
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
    board: overrides.board ?? { "MER-305": "todo" },
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

describe("Sprint Labs ticket page", () => {
  it("renders the ticket's body, criteria and banner, with no leaked file paths", async () => {
    registry.getWorkbookSummary.mockReturnValue(SUMMARY)
    registry.getTicket.mockResolvedValue(MER_305)
    mockFetchRun.mockResolvedValue(activeRun())

    render(<SprintLabTicketPage />)

    await waitFor(() => {
      expect(screen.getByText(/Support reopened CX-88431 this morning/)).not.toBeNull()
    })
    expect(screen.getByText(/A repeat submission cannot create a second extraction/)).not.toBeNull()
    expect(screen.getByRole("note").textContent).toContain(
      "we are not shipping a race fix nobody on the team can defend"
    )
    expect(document.body.innerHTML).not.toMatch(/src\//)
  })

  it("404s when the ticket key is not tracked on this run's board", async () => {
    registry.getWorkbookSummary.mockReturnValue(SUMMARY)
    registry.getTicket.mockResolvedValue(MER_305)
    mockFetchRun.mockResolvedValue(activeRun({ board: { "MER-304": "todo" } }))
    mockParams.value = { workbookId: "fixture-demo", ticketKey: "MER-999" }

    render(<SprintLabTicketPage />)
    await waitFor(() => expect(notFoundSpy).toHaveBeenCalled())
  })

  it("shows the Pro wall instead of the ticket when the run's sprint requires Pro", async () => {
    registry.getWorkbookSummary.mockReturnValue(SUMMARY)
    registry.getTicket.mockResolvedValue(MER_305)
    mockFetchRun.mockResolvedValue(activeRun({ currentSprint: 2, board: { "MER-305": "todo" } }))
    mockEntitlement.value = { isPro: false, entitlementFailed: false, retry: vi.fn() }

    render(<SprintLabTicketPage />)

    await waitFor(() => {
      expect(screen.getByText(/is part of Pro/)).not.toBeNull()
    })
    expect(screen.queryByText(/Support reopened CX-88431/)).toBeNull()
  })
})
