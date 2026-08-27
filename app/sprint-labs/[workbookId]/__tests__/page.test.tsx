/**
 * @vitest-environment jsdom
 *
 * The workbook overview screen (UX-SPEC.md §3). jsdom because the nested client
 * `WorkbookOverviewCta` calls `useAuth()`/`useEffect`, which need a real DOM render to resolve
 * without throwing (a bare `renderToStaticMarkup` never runs effects, but `useAuth()` still needs
 * its context provider, which this test mocks instead of rendering the real `AuthProvider`).
 *
 * Assertions are plain DOM reads because this repo does not carry @testing-library/jest-dom.
 */
import { render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({ usePathname: () => "/sprint-labs/fixture-demo" }))

const mockAuth = vi.hoisted(() => ({ value: { user: null as unknown, initialized: true } }))
vi.mock("@/lib/auth-context", () => ({ useAuth: () => mockAuth.value }))
vi.mock("@/lib/sprint-labs/runs-client", () => ({
  fetchActiveSprintLabRun: vi.fn().mockResolvedValue(null),
}))

const registry = vi.hoisted(() => ({
  getWorkbookSummary: vi.fn(),
  getWorkbookSprints: vi.fn(),
}))
vi.mock("@/lib/sprint-labs/content/registry", () => registry)

import SprintLabWorkbookOverviewPage from "../page"

const RUNNABLE_SUMMARY = {
  id: "fixture-demo",
  title: "Fixture Demo: Contracts Sprint",
  pitch: "A tiny two-ticket workbook that exercises the compiler end to end.",
  track: "Systems / Backend",
  language: "typescript",
  level: "Junior / Mid",
  topics: ["typescript"],
  sprintCount: 1,
  ticketCount: 2,
  estimatedHours: 2,
  requiresServerExecution: false,
  objectives: [{ id: "a", label: "Typed boundaries", canDo: "I can narrow an any-typed input." }],
}

const ONE_SPRINT = [
  {
    number: 1,
    title: "Foundations",
    goal: "Replace any-typed edges with validated types.",
    standupQuote: "quote",
    archMapDelta: { added: [], changed: [], broke: [], invariants: [] },
    objectives: [{ id: "a", label: "Typed boundaries", canDo: "I can narrow an any-typed input." }],
  },
]

describe("Sprint Labs workbook overview page", () => {
  it("renders the title, grading panel, objectives-by-sprint and the arc for a runnable workbook", async () => {
    registry.getWorkbookSummary.mockReturnValue(RUNNABLE_SUMMARY)
    registry.getWorkbookSprints.mockResolvedValue(ONE_SPRINT)
    mockAuth.value = { user: null, initialized: true }

    const element = await SprintLabWorkbookOverviewPage({
      params: Promise.resolve({ workbookId: "fixture-demo" }),
    })
    render(element)

    expect(
      screen.getByRole("heading", { level: 1, name: "Fixture Demo: Contracts Sprint" })
    ).not.toBeNull()
    expect(screen.getByText("How it is graded")).not.toBeNull()
    expect(screen.getByText("Sprint 1: Foundations")).not.toBeNull()
    // The CTA repeats at the top and after the arc (UX-SPEC.md §3's "repeat CTA"), so both copies
    // are expected here rather than exactly one.
    await waitFor(() => {
      expect(screen.queryAllByRole("link", { name: "Sign in to start" }).length).toBe(2)
    })
  })

  it("renders the sandbox notice instead of a CTA when the capability check locks the workbook", async () => {
    registry.getWorkbookSummary.mockReturnValue({
      ...RUNNABLE_SUMMARY,
      requiresServerExecution: true,
    })
    registry.getWorkbookSprints.mockResolvedValue(ONE_SPRINT)
    mockAuth.value = { user: null, initialized: true }

    const element = await SprintLabWorkbookOverviewPage({
      params: Promise.resolve({ workbookId: "fixture-demo" }),
    })
    render(element)

    expect(screen.queryByRole("link", { name: "Sign in to start" })).toBeNull()
    expect(
      screen.getByText(/Server-side isolated grading and additional languages land/)
    ).not.toBeNull()
  })
})
