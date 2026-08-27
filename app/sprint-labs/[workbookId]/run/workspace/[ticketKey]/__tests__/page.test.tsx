/**
 * @vitest-environment jsdom
 *
 * The workspace screen's page shell (UX-SPEC.md §7, screen 6). Mirrors
 * `run/ticket/[ticketKey]/__tests__/page.test.tsx`'s pattern (same run-state/Pro-wall/not-found
 * machinery, reused verbatim from Task 11) and covers this page's own additions: routing to
 * `WorkspaceView` with the resolved ticket, and the "what the agent knows" button opening the panel.
 *
 * `WorkspaceView` itself is mocked — its own behavior (file tree, locked files, the per-turn strip,
 * PartnerChat/AgentKnowledgePanel wiring) is covered by `WorkspaceView.test.tsx`; this file only
 * needs to prove the PAGE resolves the right data and passes it through.
 *
 * Assertions are plain DOM reads because this repo does not carry @testing-library/jest-dom.
 */
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const mockParams = vi.hoisted(() => ({
  value: { workbookId: "fixture-demo", ticketKey: "DEMO-101" },
}))
const notFoundSpy = vi.hoisted(() => vi.fn())
vi.mock("next/navigation", () => ({
  useParams: () => mockParams.value,
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
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

vi.mock("@/components/sprint-labs/workspace/WorkspaceView", () => ({
  WorkspaceView: (props: {
    ticketKey: string
    knowledgeOpen: boolean
    onKnowledgeOpenChange: (open: boolean) => void
    compiledTicket: { ticket: { title: string } }
  }) => (
    <div data-testid="workspace-view" data-knowledge-open={String(props.knowledgeOpen)}>
      {props.compiledTicket.ticket.title}
      <button type="button" onClick={() => props.onKnowledgeOpenChange(false)}>
        close knowledge from child
      </button>
    </div>
  ),
}))

import SprintLabWorkspacePage from "../page"

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

const DEMO_101 = {
  ticket: {
    key: "DEMO-101",
    title: "Claim intake 500s on a technically-valid payload",
    points: 3,
    labels: ["contracts"],
    aiPolicy: "assisted" as const,
    objectives: [],
    bodyMd: "body",
    acceptanceCriteria: [],
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
    board: overrides.board ?? { "DEMO-101": "todo" },
    status: "in_progress" as const,
    startedAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  }
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  mockEntitlement.value = { isPro: null, entitlementFailed: false, retry: vi.fn() }
  mockParams.value = { workbookId: "fixture-demo", ticketKey: "DEMO-101" }
})

describe("Sprint Labs workspace page", () => {
  it("resolves the run and ticket, then mounts WorkspaceView with them", async () => {
    registry.getWorkbookSummary.mockReturnValue(SUMMARY)
    registry.getTicket.mockResolvedValue(DEMO_101)
    mockFetchRun.mockResolvedValue(activeRun())

    render(<SprintLabWorkspacePage />)

    await waitFor(() => {
      expect(screen.getByTestId("workspace-view")).not.toBeNull()
    })
    expect(screen.getByText("Claim intake 500s on a technically-valid payload")).not.toBeNull()
  })

  it("shows the not-playable panel instead of mounting WorkspaceView for a content stub", async () => {
    registry.getWorkbookSummary.mockReturnValue(SUMMARY)
    registry.getTicket.mockResolvedValue({
      ...DEMO_101,
      ticket: { ...DEMO_101.ticket, playable: false },
    })
    mockFetchRun.mockResolvedValue(activeRun())

    render(<SprintLabWorkspacePage />)

    await waitFor(() => {
      expect(screen.getByText("This ticket isn't playable yet")).not.toBeNull()
    })
    expect(screen.queryByTestId("workspace-view")).toBeNull()
  })

  it("still mounts WorkspaceView when playable is true or unset", async () => {
    registry.getWorkbookSummary.mockReturnValue(SUMMARY)
    registry.getTicket.mockResolvedValue(DEMO_101) // DEMO_101's ticket carries no `playable` field at all
    mockFetchRun.mockResolvedValue(activeRun())

    render(<SprintLabWorkspacePage />)

    await waitFor(() => expect(screen.getByTestId("workspace-view")).not.toBeNull())
    expect(screen.queryByText("This ticket isn't playable yet")).toBeNull()
  })

  it("shows the top bar with the ticket key and a back link to the ticket screen", async () => {
    registry.getWorkbookSummary.mockReturnValue(SUMMARY)
    registry.getTicket.mockResolvedValue(DEMO_101)
    mockFetchRun.mockResolvedValue(activeRun())

    render(<SprintLabWorkspacePage />)
    await waitFor(() => expect(screen.getByTestId("workspace-view")).not.toBeNull())

    expect(screen.getAllByText("DEMO-101").length).toBeGreaterThan(0)
    const back = screen.getByRole("link", { name: "DEMO-101" })
    expect(back.getAttribute("href")).toBe("/sprint-labs/fixture-demo/run/ticket/DEMO-101")
  })

  it("the 'what the agent knows' button toggles WorkspaceView's knowledgeOpen prop", async () => {
    registry.getWorkbookSummary.mockReturnValue(SUMMARY)
    registry.getTicket.mockResolvedValue(DEMO_101)
    mockFetchRun.mockResolvedValue(activeRun())

    render(<SprintLabWorkspacePage />)
    await waitFor(() => expect(screen.getByTestId("workspace-view")).not.toBeNull())

    expect(screen.getByTestId("workspace-view").getAttribute("data-knowledge-open")).toBe("false")
    fireEvent.click(screen.getByRole("button", { name: "What the agent knows" }))
    expect(screen.getByTestId("workspace-view").getAttribute("data-knowledge-open")).toBe("true")

    fireEvent.click(screen.getByRole("button", { name: "close knowledge from child" }))
    expect(screen.getByTestId("workspace-view").getAttribute("data-knowledge-open")).toBe("false")
  })

  it("404s when the ticket key is not tracked on this run's board", async () => {
    registry.getWorkbookSummary.mockReturnValue(SUMMARY)
    registry.getTicket.mockResolvedValue(DEMO_101)
    mockFetchRun.mockResolvedValue(activeRun({ board: { "DEMO-102": "todo" } }))
    mockParams.value = { workbookId: "fixture-demo", ticketKey: "DEMO-999" }

    render(<SprintLabWorkspacePage />)
    await waitFor(() => expect(notFoundSpy).toHaveBeenCalled())
  })

  it("shows the Pro wall instead of the workspace when the run's sprint requires Pro", async () => {
    registry.getWorkbookSummary.mockReturnValue(SUMMARY)
    registry.getTicket.mockResolvedValue(DEMO_101)
    mockFetchRun.mockResolvedValue(activeRun({ currentSprint: 2, board: { "DEMO-101": "todo" } }))
    mockEntitlement.value = { isPro: false, entitlementFailed: false, retry: vi.fn() }

    render(<SprintLabWorkspacePage />)

    await waitFor(() => {
      expect(screen.getByText(/is part of Pro/)).not.toBeNull()
    })
    expect(screen.queryByTestId("workspace-view")).toBeNull()
  })

  it("shows a retry panel when the ticket fails to load", async () => {
    registry.getWorkbookSummary.mockReturnValue(SUMMARY)
    registry.getTicket.mockRejectedValue(new Error("boom"))
    mockFetchRun.mockResolvedValue(activeRun())

    render(<SprintLabWorkspacePage />)

    await waitFor(() => {
      expect(screen.getByText("Couldn't load this ticket.")).not.toBeNull()
    })
  })
})
