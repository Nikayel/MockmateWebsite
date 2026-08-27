/**
 * @vitest-environment jsdom
 *
 * The standup screen (UX-SPEC.md §4, screen 3): goal, inciting quote, arch-map delta, sprint
 * objectives, and (uniquely to this screen) first-time run creation.
 *
 * Assertions are plain DOM reads because this repo does not carry @testing-library/jest-dom.
 */
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useParams: () => ({ workbookId: "fixture-demo" }),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND")
  },
}))

const mockAuth = vi.hoisted(() => ({ value: { user: { uid: "u1" }, initialized: true } }))
vi.mock("@/lib/auth-context", () => ({ useAuth: () => mockAuth.value }))

const mockFetchRun = vi.hoisted(() => vi.fn())
const mockStartRun = vi.hoisted(() => vi.fn())
vi.mock("@/lib/sprint-labs/runs-client", () => ({
  fetchActiveSprintLabRun: mockFetchRun,
  startSprintLabRun: mockStartRun,
}))

const registry = vi.hoisted(() => ({
  getWorkbookSummary: vi.fn(),
  getSprint: vi.fn(),
  loadWorkbookContent: vi.fn(),
}))
vi.mock("@/lib/sprint-labs/content/registry", () => registry)

const mockEntitlement = vi.hoisted(() => ({
  value: { isPro: null as boolean | null, entitlementFailed: false, retry: vi.fn() },
}))
vi.mock("@/components/sprint-labs/useSprintLabProEntitlement", () => ({
  useSprintLabProEntitlement: () => mockEntitlement.value,
}))

import SprintLabStandupPage from "../page"

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

const SPRINT_1 = {
  number: 1,
  title: "Foundations",
  goal: "Replace any-typed edges with validated types.",
  standupQuote: "Northwind's engineer swears the payload is valid.",
  archMapDelta: { added: ["POST /v2/claims"], changed: [], broke: [], invariants: [] },
  objectives: [{ id: "a", label: "Typed boundaries", canDo: "I can narrow an any-typed input." }],
  ticketCount: 2,
  points: 8,
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
    board: overrides.board ?? { "DEMO-101": "todo", "DEMO-102": "todo" },
    status: "in_progress" as const,
    startedAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  }
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  mockEntitlement.value = { isPro: null, entitlementFailed: false, retry: vi.fn() }
})

describe("Sprint Labs standup page", () => {
  it("renders the goal, quote, arch-map delta and objectives for an existing run", async () => {
    registry.getWorkbookSummary.mockReturnValue(SUMMARY)
    registry.getSprint.mockResolvedValue(SPRINT_1)
    mockFetchRun.mockResolvedValue(activeRun())

    render(<SprintLabStandupPage />)

    await waitFor(() => {
      expect(screen.getByText("Replace any-typed edges with validated types.")).not.toBeNull()
    })
    expect(screen.getByText(/Northwind's engineer swears the payload is valid/)).not.toBeNull()
    expect(screen.getByText("POST /v2/claims")).not.toBeNull()
    expect(screen.getByText("Typed boundaries")).not.toBeNull()
    expect(screen.getByRole("link", { name: "Open the board" })).not.toBeNull()
    expect(screen.getByText("2 tickets · 8 points")).not.toBeNull()
  })

  it("creates a run for a first-time visitor and then renders the standup", async () => {
    registry.getWorkbookSummary.mockReturnValue(SUMMARY)
    registry.getSprint.mockResolvedValue(SPRINT_1)
    registry.loadWorkbookContent.mockResolvedValue({
      sprints: [SPRINT_1],
      ticketsByKey: { "DEMO-101": {}, "DEMO-102": {} },
    })
    mockFetchRun.mockResolvedValue(null)
    mockStartRun.mockResolvedValue(activeRun())

    render(<SprintLabStandupPage />)

    await waitFor(() => {
      expect(mockStartRun).toHaveBeenCalledWith({
        workbookId: "fixture-demo",
        contentVersion: expect.any(String),
        ticketKeys: ["DEMO-101", "DEMO-102"],
      })
    })
    await waitFor(() => {
      expect(screen.getByText("Replace any-typed edges with validated types.")).not.toBeNull()
    })
  })

  it("reads 'Back to the board' once any ticket has moved off todo", async () => {
    registry.getWorkbookSummary.mockReturnValue(SUMMARY)
    registry.getSprint.mockResolvedValue(SPRINT_1)
    mockFetchRun.mockResolvedValue(
      activeRun({ board: { "DEMO-101": "doing", "DEMO-102": "todo" } })
    )

    render(<SprintLabStandupPage />)

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Back to the board" })).not.toBeNull()
    })
  })

  it("shows the Pro wall instead of the sprint content when the sprint requires Pro", async () => {
    registry.getWorkbookSummary.mockReturnValue(SUMMARY)
    registry.getSprint.mockResolvedValue({ ...SPRINT_1, number: 2, title: "Money and Time" })
    mockFetchRun.mockResolvedValue(activeRun({ currentSprint: 2 }))
    mockEntitlement.value = { isPro: false, entitlementFailed: false, retry: vi.fn() }

    render(<SprintLabStandupPage />)

    await waitFor(() => {
      expect(screen.getByText(/is part of Pro/)).not.toBeNull()
    })
    expect(screen.queryByText(/Northwind's engineer/)).toBeNull()
  })
})
