/**
 * @vitest-environment jsdom
 *
 * The board screen (UX-SPEC.md §5, screen 4). Covers the task's own verification bar: "board renders
 * columns from a board fixture + policy badges + Pro-wall state."
 *
 * Assertions are plain DOM reads because this repo does not carry @testing-library/jest-dom.
 */
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useParams: () => ({ workbookId: "fixture-demo" }),
  useRouter: () => ({ replace: vi.fn() }),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND")
  },
}))

vi.mock("@/components/ThemeToggle", () => ({ ThemeToggle: () => <button>Theme</button> }))

const mockAuth = vi.hoisted(() => ({ value: { user: { uid: "u1" }, initialized: true } }))
vi.mock("@/lib/auth-context", () => ({ useAuth: () => mockAuth.value }))

const mockFetchRun = vi.hoisted(() => vi.fn())
vi.mock("@/lib/sprint-labs/runs-client", () => ({ fetchActiveSprintLabRun: mockFetchRun }))

const registry = vi.hoisted(() => ({
  getWorkbookSummary: vi.fn(),
  getSprint: vi.fn(),
  getTicket: vi.fn(),
}))
vi.mock("@/lib/sprint-labs/content/registry", () => registry)

const mockEntitlement = vi.hoisted(() => ({
  value: { isPro: null as boolean | null, entitlementFailed: false, retry: vi.fn() },
}))
vi.mock("@/components/sprint-labs/useSprintLabProEntitlement", () => ({
  useSprintLabProEntitlement: () => mockEntitlement.value,
}))

import SprintLabBoardPage from "../page"

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
  standupQuote: "quote",
  archMapDelta: { added: [], changed: [], broke: [], invariants: [] },
  objectives: [],
}

function compiledTicket(
  overrides: Partial<{ key: string; aiPolicy: string; aiPolicyReason: string }>
) {
  return {
    ticket: {
      key: overrides.key,
      title: `Title for ${overrides.key}`,
      points: 5,
      labels: ["bug"],
      aiPolicy: overrides.aiPolicy ?? "assisted",
      aiPolicyReason: overrides.aiPolicyReason,
      objectives: [],
      bodyMd: "body",
      acceptanceCriteria: [],
      adversaryPresent: false,
    },
    setupDiff: null,
    visibleTestFiles: [],
    hiddenTests: [],
  }
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
    board: overrides.board ?? {
      "MER-304": "todo",
      "MER-305": "todo",
      "MER-303": "doing",
      "MER-302": "review",
      "MER-301": "done",
    },
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

describe("Sprint Labs board page", () => {
  it("renders four columns from a board fixture, with policy badges and ai_policy_reason", async () => {
    registry.getWorkbookSummary.mockReturnValue(SUMMARY)
    registry.getSprint.mockResolvedValue(SPRINT_1)
    registry.getTicket.mockImplementation((_workbookId: string, key: string) => {
      const byKey: Record<string, unknown> = {
        "MER-304": compiledTicket({ key: "MER-304", aiPolicy: "assisted" }),
        "MER-305": compiledTicket({
          key: "MER-305",
          aiPolicy: "unassisted",
          aiPolicyReason: "we are not shipping a race fix",
        }),
        "MER-303": compiledTicket({ key: "MER-303", aiPolicy: "review-only" }),
        "MER-302": compiledTicket({ key: "MER-302", aiPolicy: "assisted" }),
        "MER-301": compiledTicket({ key: "MER-301", aiPolicy: "assisted" }),
      }
      return Promise.resolve(byKey[key])
    })
    mockFetchRun.mockResolvedValue(activeRun())

    render(<SprintLabBoardPage />)

    await waitFor(() => {
      expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
        "TODO",
        "DOING",
        "REVIEW",
        "DONE",
      ])
    })
    expect(screen.getByText("Title for MER-304")).not.toBeNull()
    expect(screen.getByText("Title for MER-301")).not.toBeNull()
    expect(screen.getAllByText("Assisted").length).toBeGreaterThan(0)
    expect(screen.getByText("No agent")).not.toBeNull()
    expect(screen.getByText(/we are not shipping a race fix/)).not.toBeNull()
  })

  it("shows the Pro wall instead of the board when the current sprint requires Pro and the learner is not Pro", async () => {
    registry.getWorkbookSummary.mockReturnValue(SUMMARY)
    registry.getSprint.mockResolvedValue({ ...SPRINT_1, number: 2, title: "Money and Time" })
    registry.getTicket.mockResolvedValue(undefined)
    mockFetchRun.mockResolvedValue(activeRun({ currentSprint: 2 }))
    mockEntitlement.value = { isPro: false, entitlementFailed: false, retry: vi.fn() }

    render(<SprintLabBoardPage />)

    await waitFor(() => {
      expect(screen.getByText(/is part of Pro/)).not.toBeNull()
    })
    expect(screen.queryByRole("heading", { level: 3, name: "TODO" })).toBeNull()
    expect(screen.getByRole("link", { name: "See Pro" }).getAttribute("href")).toBe("/pricing")
  })

  it("does not show the Pro wall for sprint 1, regardless of entitlement", async () => {
    registry.getWorkbookSummary.mockReturnValue(SUMMARY)
    registry.getSprint.mockResolvedValue(SPRINT_1)
    registry.getTicket.mockResolvedValue(compiledTicket({ key: "MER-101", aiPolicy: "assisted" }))
    mockFetchRun.mockResolvedValue(activeRun({ currentSprint: 1, board: { "MER-101": "todo" } }))

    render(<SprintLabBoardPage />)

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 3, name: "TODO" })).not.toBeNull()
    })
    expect(screen.queryByText(/is part of Pro/)).toBeNull()
  })
})
